/**
 * Visits the pages defined in spec.ts with the saved auth state, collects
 * the hashed class names of each element, and regenerates src/index.ts.
 *
 * Exit codes: 0 success / 1 extraction failure / 2 authentication required.
 * The generated file is only replaced when every element succeeds, unless
 * --allow-partial is passed. An empty spec only overwrites an existing
 * generated file when --allow-empty is passed.
 */
import { randomUUID } from "node:crypto";
import {
	access,
	mkdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { argv, exit } from "node:process";
import { type BrowserContextOptions, chromium, type Page } from "playwright";
import { parseClassAttr } from "./lib/classnames.ts";
import { renderModule } from "./lib/codegen.ts";
import { groupByUrl } from "./lib/group.ts";
import { loginCheck, spec } from "./spec.ts";

const APP_ORIGIN = "https://www.nnn.ed.nico";
const AUTH_PATH = "auth.json";
const OUT_PATH = "src/index.ts";
const ELEMENT_TIMEOUT_MS = 10_000;
const DELAY_MS = Number(process.env.EXTRACT_DELAY_MS ?? "750");

const allowPartial = argv.includes("--allow-partial");
const allowEmpty = argv.includes("--allow-empty");
// Debug: watch the crawl in a visible browser window
const headed = argv.includes("--headed");

interface Failure {
	name: string;
	url: string;
	reason: string;
}

function isLoggedOut(pageUrl: string): boolean {
	const url = new URL(pageUrl);
	return (
		url.origin !== APP_ORIGIN ||
		url.pathname === "/login" ||
		url.pathname.startsWith("/login/")
	);
}

function fileExists(path: string): Promise<boolean> {
	return access(path).then(
		() => true,
		() => false,
	);
}

type StorageState = Exclude<
	BrowserContextOptions["storageState"],
	string | undefined
>;

/** Read and validate auth.json; any problem is an authentication error (exit 2). */
async function loadStorageState(): Promise<StorageState> {
	if (!(await fileExists(AUTH_PATH))) {
		console.error(
			`${AUTH_PATH} がありません。先に \`bun run login\` を実行してください。`,
		);
		exit(2);
	}
	try {
		const value: unknown = JSON.parse(await readFile(AUTH_PATH, "utf8"));
		if (
			typeof value !== "object" ||
			value === null ||
			!Array.isArray((value as { cookies?: unknown }).cookies) ||
			!Array.isArray((value as { origins?: unknown }).origins)
		) {
			throw new Error("storageState の形式が不正です");
		}
		return value as StorageState;
	} catch (error) {
		console.error(
			`${AUTH_PATH} を読み込めません: ${String(error)}\n\`bun run login\` で再生成してください。`,
		);
		exit(2);
	}
}

async function writeGenerated(
	collected: Record<string, string[]>,
): Promise<void> {
	await mkdir(dirname(OUT_PATH), { recursive: true });
	const tmpPath = join(
		dirname(OUT_PATH),
		`.${basename(OUT_PATH)}.${process.pid}.${randomUUID()}.tmp`,
	);
	try {
		await writeFile(tmpPath, renderModule(collected), {
			encoding: "utf8",
			flag: "wx",
		});
		await rename(tmpPath, OUT_PATH);
	} finally {
		await rm(tmpPath, { force: true });
	}
}

const groups = groupByUrl(spec);
if (groups.length === 0) {
	const existing = await readFile(OUT_PATH, "utf8").catch(() => null);
	if (existing !== null && existing !== renderModule({}) && !allowEmpty) {
		console.error(
			"spec.ts に要素定義がありません。既存の生成物を保護するため更新しません(--allow-empty で空生成可)。",
		);
		exit(1);
	}
	console.warn("spec.ts に要素定義がありません。空のモジュールを生成します。");
	await writeGenerated({});
	exit(0);
}

const storageState = await loadStorageState();
const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({
	storageState,
	viewport: { width: 1280, height: 900 },
	locale: "ja-JP",
	timezoneId: "Asia/Tokyo",
	reducedMotion: "reduce",
});
const page = await context.newPage();

const collected: Record<string, string[]> = {};
const failures: Failure[] = [];

async function bailIfLoggedOut(currentPage: Page): Promise<void> {
	if (isLoggedOut(currentPage.url())) {
		console.error(
			`ログインページへリダイレクトされました (${currentPage.url()})。` +
				"認証が失効しています。`bun run login` で再ログインしてください。",
		);
		await browser.close();
		exit(2);
	}
}

// Positive auth probe: a login redirect is not the only logged-out state —
// the site can serve a logged-out page at the same URL, so require an
// element that only renders when authenticated.
console.log(`→ ${loginCheck.url} (ログイン確認)`);
await page.goto(loginCheck.url, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("load").catch(() => {});
await bailIfLoggedOut(page);
try {
	await loginCheck
		.find(page)
		.waitFor({ state: "attached", timeout: ELEMENT_TIMEOUT_MS });
} catch {
	console.error(
		"ログイン確認要素が見つかりませんでした。認証が失効しているか、" +
			"spec.ts の loginCheck が実ページと合っていません。`bun run login` で再ログインしてください。",
	);
	await browser.close();
	exit(2);
}
console.log("  ✓ ログイン済みを確認しました");

let currentUrl = loginCheck.url;
for (const group of groups) {
	if (group.url !== currentUrl) {
		await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
		console.log(`→ ${group.url}`);
		await page.goto(group.url, { waitUntil: "domcontentloaded" });
		await page.waitForLoadState("load").catch(() => {});
		await bailIfLoggedOut(page);
		currentUrl = group.url;
	} else {
		console.log(`→ ${group.url} (遷移済み)`);
	}

	for (const name of group.names) {
		const entry = spec[name]!;
		try {
			await entry.prepare?.(page);
			await bailIfLoggedOut(page);
			const locator = entry.find(page);
			await locator.waitFor({ state: "attached", timeout: ELEMENT_TIMEOUT_MS });
			await bailIfLoggedOut(page);
			const tokens = parseClassAttr(await locator.getAttribute("class"));
			if (tokens.length === 0) {
				failures.push({ name, url: group.url, reason: "class 属性が空です" });
				continue;
			}
			collected[name] = tokens;
			console.log(`  ✓ ${name}: ${tokens.join(" ")}`);
		} catch (error) {
			await bailIfLoggedOut(page);
			const reason =
				error instanceof Error ? error.message.split("\n")[0]! : String(error);
			failures.push({ name, url: group.url, reason });
		}
	}
}

await browser.close();

if (failures.length > 0) {
	console.warn(`\n⚠ ${failures.length} 件の要素が見つかりませんでした:`);
	for (const failure of failures) {
		console.warn(`  ✗ ${failure.name} (${failure.url}): ${failure.reason}`);
	}
	if (allowPartial) {
		await writeGenerated(collected);
		console.warn(
			`--allow-partial 指定のため、成功した ${Object.keys(collected).length} 件で ${OUT_PATH} を更新しました。`,
		);
	} else {
		console.warn(
			`${OUT_PATH} は更新していません(--allow-partial で部分更新可)。`,
		);
	}
	exit(1);
}

await writeGenerated(collected);
console.log(
	`\n${Object.keys(collected).length} 件の要素を抽出し ${OUT_PATH} を更新しました。`,
);
