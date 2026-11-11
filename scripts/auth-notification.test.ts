import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const workflow = Bun.YAML.parse(
	readFileSync(
		new URL("../.github/workflows/update.yml", import.meta.url),
		"utf8",
	),
) as { jobs: { update: { steps: { name?: string; run?: string }[] } } };
const script = workflow.jobs.update.steps.find(
	(step) => step.name === "Notify auth expiry",
)?.run;
if (!script) throw new Error("Missing auth notification step");
const command = script.replace(/\$\{\{.*?\}\}/g, "test");

function notify(issues: object[], lookupFails = false) {
	return spawnSync(
		"bash",
		[
			"-e",
			"-c",
			`
gh() {
  if [ "$1" = api ]; then
    [ "$LOOKUP_FAILS" = false ] || return 1
    shift
    local paginate=false endpoint=false
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --paginate) paginate=true ;;
        'repos/{owner}/{repo}/issues?state=open&per_page=100') endpoint=true ;;
        --jq) shift; local query="$1" ;;
      esac
      shift
    done
    [ "$paginate" = true ] && [ "$endpoint" = true ] || return 1
    printf '%s' "$ISSUES" | jq -r "$query"
  elif [ "$1" = issue ] && [ "$2" = create ]; then
    echo CREATED
  else
    return 1
  fi
}
${command}`,
		],
		{
			encoding: "utf8",
			env: {
				...process.env,
				ISSUES: JSON.stringify(issues),
				LOOKUP_FAILS: String(lookupFails),
			},
		},
	);
}

test("skips creation when an open issue has the exact title", () => {
	const result = notify([
		{ number: 12, title: "extract: 認証が失効しています" },
	]);
	expect(result.status).toBe(0);
	expect(result.stdout).not.toContain("CREATED");
});

test("creates when there are no open issues", () => {
	const result = notify([]);
	expect(result.status).toBe(0);
	expect(result.stdout).toContain("CREATED");
});

test("ignores similar titles and pull requests", () => {
	const result = notify([
		{ number: 1, title: "extract: 認証が失効しています (old)" },
		{ number: 2, title: "extract: 認証が失効しています", pull_request: {} },
	]);
	expect(result.status).toBe(0);
	expect(result.stdout).toContain("CREATED");
});

test("fails without creating an issue when lookup fails", () => {
	const result = notify([], true);
	expect(result.status).not.toBe(0);
	expect(result.stdout).not.toContain("CREATED");
});
