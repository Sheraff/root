/** This is a fake query builder for syntax-highlighting purposes, it does not support template strings with dynamic values */
export function sql(strings: TemplateStringsArray): string {
	return strings[0]!
}
