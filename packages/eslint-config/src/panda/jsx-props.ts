/**
 * Resolve the JSX utility ban list and emit `no-restricted-syntax` entries.
 *
 * This is where the dynamic policy becomes concrete selectors. The function
 * walks the Panda catalog, applies the {@link JsxUtilityControls} whitelist,
 * and produces:
 *
 * 1. A `Map<name, { tokens }>` of every prop that should be banned on JSX.
 * 2. A flat array of `{ selector, message }` entries suitable for
 *    `no-restricted-syntax`.
 *
 * Selectors cover three shapes so the ban applies wherever a JSX prop might
 * legitimately land:
 *
 * - `<Box padding="md" />` — `JSXOpeningElement > JSXAttribute`
 * - `<Box {...{ padding: "md" }} />` — `JSXAttribute ObjectExpression > Property`
 * - `cva({ … padding: "md" })` / `sva(…)` — `CallExpression > Property`
 *
 * SVG elements are exempted at the selector layer so SVG authoring isn't
 * broken (raw SVG attributes carry paint data too).
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { PandaCatalog } from "./catalog.js";
import {
  buildControls,
  DEFAULT_CONTROLS,
  isAllowed,
  type JsxUtilityControls,
} from "./controls.js";
import { alternationRegex, isPaintProp } from "../lib/regex.js";
import type { PandaPaths } from "../types.js";
import type { NoRestrictedSyntaxEntry } from "../types.js";

/**
 * Element names we never lint as Panda JSX props — they're either real SVG
 * primitives or host-only nodes. Lower-case regex.
 */
const SVG_TAGS =
  "svg|path|circle|line|polyline|polygon|g|rect|defs|clipPath|use|text|tspan";

const COMPOSITION = "composition.d.ts";

/**
 * Result of {@link resolveJsxUtilityBans}.
 */
export interface JsxUtilityBanResolution {
  /** Banned prop names → the token categories they would consume. */
  readonly banned: ReadonlyMap<string, { readonly tokens: ReadonlyArray<string> }>;
  /** Convenience list of all known utility keys (for diagnostics / tests). */
  readonly utilityKeys: ReadonlyArray<string>;
  /** Token categories (mirrors the catalog). */
  readonly tokenCategories: ReadonlyArray<string>;
  /** The resolved controls (handy for error messages). */
  readonly controls: JsxUtilityControls;
}

/**
 * Walk the catalog + controls to produce the concrete ban list.
 *
 * Pure function — given the same inputs (catalog, controls) it returns the
 * same output. Safe to call once at module load.
 */
export function resolveJsxUtilityBans(
  catalog: PandaCatalog,
  controls: JsxUtilityControls,
): JsxUtilityBanResolution {
  const banned = new Map<string, { tokens: ReadonlyArray<string> }>();

  const entries: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
    ...catalog.utility.entries(),
    ...catalog.aliases.entries(),
  ];

  for (const [name, tokenList] of entries) {
    if (isAllowed(name, tokenList, controls)) continue;
    banned.set(name, { tokens: tokenList });
  }

  // Synthetic gradient aliases — exposed on JSX but not in `UtilityValues`.
  for (const [alias, target] of [
    ["bgGradient", "backgroundGradient"],
    ["bgLinear", "backgroundLinear"],
  ] as const) {
    if (banned.has(alias) || !catalog.utility.has(target)) continue;
    const tokenList = catalog.utility.get(target)!;
    if (
      isAllowed(alias, tokenList, controls) ||
      isAllowed(target, tokenList, controls)
    ) {
      continue;
    }
    banned.set(alias, { tokens: tokenList });
  }

  return {
    banned,
    // eslint-disable-next-line unicorn/prefer-iterator-to-array
    utilityKeys: [...catalog.utility.keys()],
    tokenCategories: catalog.tokenCategories,
    controls,
  };
}

/**
 * Resolve union literal members from a `composition.d.ts` type alias.
 *
 * Matches:
 * ```ts
 * type TextStyleProperty = 'color' | 'fontSize' | 'fontWeight' | …;
 * ```
 */
function parseUnionLiterals(source: string, typeName: string): string[] {
  const re = new RegExp(
    String.raw`type ${typeName}\s*=([\s\S]*?)(?:\nexport type |\ntype [A-Z]|\n\/\*$)`,
  );
  const match = source.match(re);
  if (!match) return [];
  return Iterator.from(match[1]!.matchAll(/\| '([^']+)'/g))
    .map((m) => m[1]!)
    .toArray();
}

/**
 * Build `no-restricted-syntax` entries for every banned JSX utility prop.
 *
 * Returns an empty array when nothing is banned (e.g. caller opted everything
 * in via overrides).
 */
export function buildJsxUtilityPropPolicy(
  catalog: PandaCatalog,
  controls: JsxUtilityControls = buildControls(catalog, DEFAULT_CONTROLS),
  paths?: PandaPaths,
): NoRestrictedSyntaxEntry[] {
  // Mutable working map — composition-derived bans get merged in below.
  const banned = new Map<string, { tokens: ReadonlyArray<string> }>(
    resolveJsxUtilityBans(catalog, controls).banned,
  );
  if (banned.size === 0) return [];

  // Optionally layer composition-derived bans on top.
  if (paths && (controls.composition.textStyleProperties || controls.composition.layerStylePaint)) {
    const composition = readFileSync(path.join(paths.compositionRoot, COMPOSITION), "utf8");

    if (controls.composition.textStyleProperties) {
      for (const prop of parseUnionLiterals(composition, "TextStyleProperty")) {
        if (banned.has(prop) || controls.props[prop] === true) continue;
        banned.set(prop, { tokens: [] });
      }
    }

    if (controls.composition.layerStylePaint) {
      const paintProps = parseUnionLiterals(composition, "LayerStyleProperty").filter(
        isPaintProp,
      );
      for (const prop of paintProps) {
        if (banned.has(prop) || controls.props[prop] === true) continue;
        banned.set(prop, { tokens: ["colors"] });
      }
    }
  }

  // eslint-disable-next-line unicorn/prefer-iterator-to-array
  const names = [...banned.keys()];
  const re = alternationRegex(...names);

  const message =
    "JSX utility prop not whitelisted. Use textStyle / layerStyle / colorPalette, or move styles into a recipe.";

  return [
    {
      selector: `JSXOpeningElement:not([name.name=/${SVG_TAGS}/]) > JSXAttribute[name.name=/^(${re})$/]`,
      message,
    },
    {
      selector: `JSXAttribute ObjectExpression > Property[key.name=/^(${re})$/]`,
      message,
    },
    {
      selector: `CallExpression[callee.name=/^(cva|sva)$/] Property[key.name=/^(${re})$/]`,
      message,
    },
  ];
}

/**
 * Convenience: also expose the regex escaper for external policy composers.
 */
export { escapeForSelectorRegex } from "../lib/regex.js";
