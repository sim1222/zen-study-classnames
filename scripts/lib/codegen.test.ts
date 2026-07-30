import { describe, expect, test } from "bun:test";
import { renderModule } from "./codegen.ts";

describe("renderModule", () => {
	test("renders collected classes into a typed module", () => {
		const code = renderModule({
			playButton: ["Button_primary__x3f2a", "mt-2"],
		});

		expect(code).toContain('"playButton": ["Button_primary__x3f2a", "mt-2"]');
		expect(code).toContain('"playButton": ".Button_primary__x3f2a.mt-2"');
		expect(code).toContain(
			'"playButton": "[class*=\\"Button_primary__\\"].mt-2"',
		);
		expect(code).toContain("export const classNames = {");
		expect(code).toContain("export const selectors = {");
		expect(code).toContain("export const stableSelectors = {");
		expect(code).toContain(
			"export type ElementName = keyof typeof classNames;",
		);
	});

	test("sorts element names lexicographically", () => {
		const code = renderModule({
			zebra: ["z__a1b2c"],
			apple: ["a__d4e5f"],
		});
		expect(code.indexOf('"apple"')).toBeLessThan(code.indexOf('"zebra"'));
	});

	test("is deterministic (byte-for-byte, no timestamps)", () => {
		const input = { a: ["X_y__z9q8w"], b: ["plain"] };
		const first = renderModule(input);
		const second = renderModule({ b: ["plain"], a: ["X_y__z9q8w"] });
		expect(first).toBe(second);
		expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}/);
	});

	test("renders an empty spec into a valid empty module", () => {
		const code = renderModule({});
		expect(code).toContain("export const classNames = {} as const;");
		expect(code).toContain("export const selectors = {} as const;");
		expect(code).toContain("export const stableSelectors = {} as const;");
	});

	test("ends with exactly one trailing newline and uses LF", () => {
		const code = renderModule({ a: ["b"] });
		expect(code.endsWith("\n")).toBe(true);
		expect(code.endsWith("\n\n")).toBe(false);
		expect(code).not.toContain("\r");
	});

	test("marks the file as auto-generated", () => {
		expect(renderModule({})).toMatch(/^\/\/ auto-generated/);
	});
});
