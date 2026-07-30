/**
 * Parsing of `class` attributes and generation of CSS selectors,
 * including hash-tolerant selectors for CSS Modules style tokens.
 */

/** Matches CSS Modules style tokens like `Button_primary__x3f2a`; group 1 is the stable prefix. */
export const HASHED_CLASS_PATTERN = /^(.+__)[A-Za-z0-9-]+$/;

/** Matches styled-components component ids like `sc-11in5kn-0` or `sc-aXZVg`. */
export const STYLED_COMPONENT_ID_PATTERN = /^sc-[A-Za-z0-9-]+$/;

/** Whether a token is a styled-components component id (`sc-*`). */
export function isStyledComponentId(token: string): boolean {
	return STYLED_COMPONENT_ID_PATTERN.test(token);
}

/** Split a `class` attribute value into unique tokens, preserving order. */
export function parseClassAttr(value: string | null): string[] {
	if (value === null) return [];
	return [...new Set(value.split(/\s+/).filter((token) => token !== ""))];
}

/**
 * Return the stable prefix (e.g. `Button_primary__`) of a hashed class
 * token, or null if the token does not look hashed.
 */
export function hashedPrefix(
	token: string,
	pattern: RegExp = HASHED_CLASS_PATTERN,
): string | null {
	// Clone so a caller-supplied g/y flagged RegExp's lastIndex can't leak state
	const match = new RegExp(pattern).exec(token);
	return match?.[1] ?? null;
}

/** Escape a string for use as a CSS identifier (CSS.escape algorithm). */
export function cssEscapeIdent(ident: string): string {
	let result = "";
	const chars = [...ident];
	for (let i = 0; i < chars.length; i++) {
		const char = chars[i]!;
		const code = char.codePointAt(0)!;
		if (code === 0) {
			result += "�";
		} else if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) {
			result += `\\${code.toString(16)} `;
		} else if (i === 0 && code >= 0x30 && code <= 0x39) {
			result += `\\${code.toString(16)} `;
		} else if (i === 1 && code >= 0x30 && code <= 0x39 && chars[0] === "-") {
			result += `\\${code.toString(16)} `;
		} else if (i === 0 && char === "-" && chars.length === 1) {
			result += "\\-";
		} else if (
			code >= 0x80 ||
			char === "-" ||
			char === "_" ||
			(code >= 0x30 && code <= 0x39) ||
			(code >= 0x41 && code <= 0x5a) ||
			(code >= 0x61 && code <= 0x7a)
		) {
			result += char;
		} else {
			result += `\\${char}`;
		}
	}
	return result;
}

function escapeAttrValue(value: string): string {
	return value.replace(/[\\"]/g, (char) => `\\${char}`);
}

/** Build an exact selector matching all tokens: `.a.b.c`. */
export function classSelector(tokens: readonly string[]): string {
	return tokens.map((token) => `.${cssEscapeIdent(token)}`).join("");
}

/**
 * Build a hash-tolerant selector.
 *
 * If any styled-components component id (`sc-*`) is present, only those
 * ids are used — the accompanying generated style hashes (`jTMKEj` etc.)
 * change every build and have no stable prefix, so they are dropped.
 *
 * Otherwise, CSS Modules style hashed tokens become `[class*="Prefix__"]`
 * prefix matches and plain tokens stay `.token`.
 */
export function stableSelector(
	tokens: readonly string[],
	pattern: RegExp = HASHED_CLASS_PATTERN,
): string {
	const componentIds = tokens.filter(isStyledComponentId);
	if (componentIds.length > 0) {
		return classSelector(componentIds);
	}
	return tokens
		.map((token) => {
			const prefix = hashedPrefix(token, pattern);
			return prefix === null
				? `.${cssEscapeIdent(token)}`
				: `[class*="${escapeAttrValue(prefix)}"]`;
		})
		.join("");
}
