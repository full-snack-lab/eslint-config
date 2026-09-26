/**
 * Small, dependency-free regex + string helpers used across the package.
 *
 * Kept private — these exist purely to keep the policy builders readable.
 *
 * @internal
 */

/**
 * Escape a string so it can be safely interpolated into an `esquery` selector
 * regex literal (the `/.../i` form).
 *
 * Esquery treats `/.../` inside a selector as a regex, so any of these
 * characters would otherwise terminate or alter the pattern:
 * `.` `*` `+` `?` `^` `$` `{` `}` `(` `)` `|` `[` `]` `\` `/`
 *
 * @example
 * ```ts
 * escapeForSelectorRegex("foo.bar"); // "foo\\.bar"
 * ```
 */
export function escapeForSelectorRegex(input: string): string {
  return input.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Build an `esquery` regex source from a list of literal names.
 *
 * Output is wrapped with `(?:…)` by the caller when alternation is needed.
 */
export function alternationRegex(...names: ReadonlyArray<string>): string {
  return names.map((name) => escapeForSelectorRegex(name)).join("|");
}

/**
 * Predicate: does the given prop name look like a paint slot?
 *
 * Used by the layerStyle composition logic to decide which composition-derived
 * properties should be banned at the JSX layer.
 */
export function isPaintProp(prop: string): boolean {
  return (
    /^(background|color|fill|stroke)/i.test(prop) ||
    /Color$/i.test(prop) ||
    /Shadow$/i.test(prop)
  );
}
