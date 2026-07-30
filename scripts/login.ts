/**
 * Opens a headful browser for manual login (SSO included) and saves the
 * authenticated storage state to auth.json for later use by extract.ts.
 *
 * Only state belonging to the app origin is saved: cookies/storage from
 * SSO/IdP origins visited during login are dropped so secrets we don't
 * need never land in auth.json (or a CI secret).
 */
import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import { exit, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright";

const BASE_URL = "https://www.nnn.ed.nico/";
const AUTH_PATH = "auth.json";

const appUrl = new URL(BASE_URL);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(BASE_URL);

console.log("ブラウザで ZEN Study にログインしてください(SSO 含む)。");
const readline = createInterface({ input: stdin, output: stdout });
await readline.question(
	"ログイン完了後、Enter キーを押すと認証状態を保存します...",
);
readline.close();

if (new URL(page.url()).origin !== appUrl.origin) {
	console.error(
		`現在のページ (${page.url()}) が ${appUrl.origin} ではありません。` +
			"ZEN Study のページに戻ってから再実行してください。",
	);
	await browser.close();
	exit(1);
}

const state = await context.storageState({ indexedDB: true });
await browser.close();

// Keep only cookies that would be sent to the app hostname, and only the
// app origin's local/session/indexedDB storage.
const filtered = {
	cookies: state.cookies.filter(({ domain }) => {
		const cookieDomain = domain.replace(/^\./, "");
		return (
			appUrl.hostname === cookieDomain ||
			appUrl.hostname.endsWith(`.${cookieDomain}`)
		);
	}),
	origins: state.origins.filter(
		({ origin }) => new URL(origin).origin === appUrl.origin,
	),
};

const tmpPath = `.${AUTH_PATH}.${process.pid}.${randomUUID()}.tmp`;
try {
	await writeFile(tmpPath, `${JSON.stringify(filtered)}\n`, {
		encoding: "utf8",
		mode: 0o600,
		flag: "wx",
	});
	await rename(tmpPath, AUTH_PATH);
} finally {
	await rm(tmpPath, { force: true });
}

console.log(
	`認証状態を ${AUTH_PATH} に保存しました(コミット禁止・.gitignore 済み)。`,
);
