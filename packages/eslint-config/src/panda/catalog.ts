/**
 * Catalog reader for Panda's generated `.d.ts` files.
 *
 * Panda emits a small set of type files under `styled-system/dist/` after
 * running `panda codegen`. We parse them with regex — no TS compiler needed —
 * because:
 *
 * 1. Lint-time must stay fast and dependency-free.
 * 2. The shape is stable and small (~10s of KB).
 * 3. Consumers may not have `typescript` available at lint time.
 *
 * If Panda changes its emission shape, only this module needs to change.
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { PandaPaths } from "../types.js";

/**
 * The parsed catalog of Panda-generated tokens / utility props.
 *
 * `utility` maps every entry in `UtilityValues` (e.g. `background`,
 * `paddingX`, …) to the token categories it accepts.
 *
 * `aliases` maps prop aliases (e.g. `mx` → `marginX`) to the same token list
 * as their target.
 *
 * `tokenCategories` is the union of `TokenCategory` members
 * (`"colors"`, `"spacing"`, `"radii"`, …).
 */
export interface PandaCatalog {
  readonly utility: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly aliases: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly tokenCategories: ReadonlyArray<string>;
}

const PROP_TYPE = "prop-type.d.ts";
const STYLE_PROPS = "style-props.d.ts";
const TOKENS = "tokens.d.ts";

/**
 * Parse the catalog from the given resolved Panda paths.
 *
 * @throws if any of the expected `.d.ts` files is missing. Panda should always
 * produce these after `panda codegen`; if they vanish, surface the error
 * loudly rather than silently disabling policy enforcement.
 */
export function loadCatalog(paths: PandaPaths): PandaCatalog {
  const propType = readFileSync(path.join(paths.typesRoot, PROP_TYPE), "utf8");
  const styleProps = readFileSync(path.join(paths.typesRoot, STYLE_PROPS), "utf8");
  const tokensSource = readFileSync(path.join(paths.tokensRoot, TOKENS), "utf8");

  const utility = parseUtilityValues(propType);
  const aliases = parseStylePropAliases(styleProps, utility);
  const tokenCategories = parseTokenCategories(tokensSource);

  return { utility, aliases, tokenCategories };
}

/**
 * Extract `UtilityValues` entries from `prop-type.d.ts`.
 *
 * Matches:
 * ```ts
 * export interface UtilityValues {
 *   background: Tokens["colors"];
 *   paddingX: Tokens["spacing"] | Tokens["sizes"];
 *   …
 * }
 * ```
 */
function parseUtilityValues(propTypeSource: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const block = propTypeSource.match(/export interface UtilityValues \{([\s\S]*?)\n\}/);
  if (!block) return out;

  const rows = block[1]!.matchAll(/^\t(\w+): (.+);$/gm);
  for (const match of rows) {
    const name = match[1]!;
    const tokens: string[] = Array.from(
      match[2]!.matchAll(/Tokens\["(\w+)"\]/g),
      (m) => m[1]!,
    );
    out.set(name, [...new Set(tokens)]);
  }
  return out;
}

/**
 * Extract prop aliases from `style-props.d.ts`.
 *
 * Matches the per-prop conditional type:
 * ```ts
 *   mx?: ConditionalValue<WithEscapeHatch<UtilityValues["marginX"]>>;
 * ```
 * and stores `mx → tokenList` where `tokenList` is the target's tokens.
 *
 * Self-aliases (where `alias === target`) are dropped.
 */
function parseStylePropAliases(
  stylePropsSource: string,
  utility: ReadonlyMap<string, ReadonlyArray<string>>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const aliasRows = stylePropsSource.matchAll(
    /^(\w+)\?: ConditionalValue<(?:WithEscapeHatch<)?UtilityValues\["(\w+)"\]/gm,
  );
  for (const match of aliasRows) {
    const alias = match[1]!;
    const target = match[2]!;
    if (alias === target || !utility.has(target)) continue;
    out.set(alias, [...utility.get(target)!]);
  }
  return out;
}

/**
 * Extract `TokenCategory` members from `tokens.d.ts`.
 *
 * Matches:
 * ```ts
 * export type TokenCategory = "colors" | "spacing" | "sizes" | …;
 * ```
 */
function parseTokenCategories(tokensSource: string): string[] {
  const raw = tokensSource.match(/export type TokenCategory = ([^;]+)/)?.[1] ?? "";
  return Iterator.from(raw.matchAll(/"(\w+)"/g))
    .map((m) => m[1]!)
    .toArray();
}
