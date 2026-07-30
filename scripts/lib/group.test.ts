import { describe, expect, test } from "bun:test";
import { groupByUrl } from "./group.ts";

describe("groupByUrl", () => {
	test("groups entry names by url preserving first-seen order", () => {
		const groups = groupByUrl({
			a: { url: "https://example.com/1" },
			b: { url: "https://example.com/2" },
			c: { url: "https://example.com/1" },
		});

		expect(groups).toEqual([
			{ url: "https://example.com/1", names: ["a", "c"] },
			{ url: "https://example.com/2", names: ["b"] },
		]);
	});

	test("returns an empty array for an empty record", () => {
		expect(groupByUrl({})).toEqual([]);
	});
});
