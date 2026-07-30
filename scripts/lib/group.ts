/** Grouping of spec entries by page URL so navigations are reused. */

export interface UrlGroup {
	url: string;
	names: string[];
}

/** Group entry names by their `url`, preserving first-seen order. */
export function groupByUrl(
	entries: Record<string, { url: string }>,
): UrlGroup[] {
	const groups = new Map<string, string[]>();
	for (const [name, entry] of Object.entries(entries)) {
		const names = groups.get(entry.url);
		if (names === undefined) {
			groups.set(entry.url, [name]);
		} else {
			names.push(name);
		}
	}
	return [...groups.entries()].map(([url, names]) => ({ url, names }));
}
