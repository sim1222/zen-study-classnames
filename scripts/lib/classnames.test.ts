import { describe, expect, test } from "bun:test";
import {
	classSelector,
	cssEscapeIdent,
	hashedPrefix,
	isStyledComponentId,
	parseClassAttr,
	stableSelector,
} from "./classnames.ts";

describe("parseClassAttr", () => {
	test("splits on whitespace", () => {
		expect(parseClassAttr("a b c")).toEqual(["a", "b", "c"]);
	});

	test("handles null, empty and extra whitespace", () => {
		expect(parseClassAttr(null)).toEqual([]);
		expect(parseClassAttr("")).toEqual([]);
		expect(parseClassAttr("  a \t b\n c  ")).toEqual(["a", "b", "c"]);
	});

	test("dedupes tokens preserving first occurrence order", () => {
		expect(parseClassAttr("b a b c a")).toEqual(["b", "a", "c"]);
	});
});

describe("hashedPrefix", () => {
	test("returns prefix for CSS Modules style tokens", () => {
		expect(hashedPrefix("Button_primary__x3f2a")).toBe("Button_primary__");
		expect(hashedPrefix("VideoPlayer_controls__Ab-9Z")).toBe(
			"VideoPlayer_controls__",
		);
	});

	test("returns null for plain tokens", () => {
		expect(hashedPrefix("mt-2")).toBeNull();
		expect(hashedPrefix("is-active")).toBeNull();
		expect(hashedPrefix("Button_primary")).toBeNull();
	});

	test("returns null for tokens with invalid hash characters", () => {
		expect(hashedPrefix("a__b__c!")).toBeNull();
	});

	test("accepts a custom pattern", () => {
		const pattern = /^(.+--)[0-9]+$/;
		expect(hashedPrefix("card--123", pattern)).toBe("card--");
		expect(hashedPrefix("Button_primary__x3f2a", pattern)).toBeNull();
	});

	test("is stateless even with a global pattern", () => {
		const pattern = /^(.+__)[A-Za-z0-9-]+$/g;
		expect(hashedPrefix("a__x", pattern)).toBe("a__");
		expect(hashedPrefix("b__y", pattern)).toBe("b__");
		expect(hashedPrefix("a__x", pattern)).toBe("a__");
	});
});

describe("cssEscapeIdent", () => {
	test("keeps safe identifiers as-is", () => {
		expect(cssEscapeIdent("Button_primary__x3f2a")).toBe(
			"Button_primary__x3f2a",
		);
		expect(cssEscapeIdent("mt-2")).toBe("mt-2");
	});

	test("escapes special characters", () => {
		expect(cssEscapeIdent("a:b")).toBe("a\\:b");
		expect(cssEscapeIdent("a/b")).toBe("a\\/b");
	});

	test("escapes a leading digit numerically", () => {
		expect(cssEscapeIdent("1abc")).toBe("\\31 abc");
	});

	test("escapes a leading hyphen followed by digit", () => {
		expect(cssEscapeIdent("-1a")).toBe("-\\31 a");
	});
});

describe("classSelector", () => {
	test("joins all tokens as class selectors", () => {
		expect(classSelector(["Button_primary__x3f2a", "mt-2"])).toBe(
			".Button_primary__x3f2a.mt-2",
		);
	});

	test("escapes tokens", () => {
		expect(classSelector(["a:b"])).toBe(".a\\:b");
	});
});

describe("isStyledComponentId", () => {
	test("matches styled-components component ids", () => {
		expect(isStyledComponentId("sc-11in5kn-0")).toBe(true);
		expect(isStyledComponentId("sc-aXZVg")).toBe(true);
		expect(isStyledComponentId("sc-gEvEer")).toBe(true);
	});

	test("rejects generated style hashes and plain classes", () => {
		expect(isStyledComponentId("jTMKEj")).toBe(false);
		expect(isStyledComponentId("huaUmY")).toBe(false);
		expect(isStyledComponentId("mt-2")).toBe(false);
		expect(isStyledComponentId("sc-")).toBe(false);
		expect(isStyledComponentId("Button_primary__x3f2a")).toBe(false);
	});
});

describe("stableSelector", () => {
	test("keeps only sc-* component ids when present (styled-components)", () => {
		expect(stableSelector(["sc-11in5kn-0", "jTMKEj"])).toBe(".sc-11in5kn-0");
		expect(stableSelector(["sc-aXZVg", "sc-gEvEer", "huaUmY", "fteAEG"])).toBe(
			".sc-aXZVg.sc-gEvEer",
		);
	});

	test("uses attribute prefix match for hashed tokens", () => {
		expect(stableSelector(["Button_primary__x3f2a"])).toBe(
			'[class*="Button_primary__"]',
		);
	});

	test("keeps plain tokens as class selectors", () => {
		expect(stableSelector(["Button_primary__x3f2a", "mt-2"])).toBe(
			'[class*="Button_primary__"].mt-2',
		);
	});

	test("escapes quotes and backslashes in attribute values", () => {
		expect(stableSelector(['a"b__x1y2z'])).toBe('[class*="a\\"b__"]');
	});

	test("accepts a custom pattern", () => {
		const pattern = /^(.+--)[0-9]+$/;
		expect(stableSelector(["card--123"], pattern)).toBe('[class*="card--"]');
	});
});
