/**
 * Panda preset — stitches together the raw-CSS ban, the pattern-function ban,
 * the Box ban, and the catalog-driven JSX utility ban.
 *
 * Reads the generated `.d.ts` files from Panda's `styled-system/dist` output.
 * Skipped automatically when those files are absent (e.g. consumer hasn't run
 * `panda codegen` yet — the rest of the config still works).
 *
 * @packageDocumentation
 */

import type {
  EslintConfig,
  NoRestrictedSyntaxEntry,
  PandaConfigOptions,
  PandaPaths,
} from "../types.js";
import { resolvePandaPaths } from "../panda/paths.js";
import { loadCatalog } from "../panda/catalog.js";
import {
  buildControls,
  DEFAULT_CONTROLS,
  type JsxUtilityControls,
} from "../panda/controls.js";
import { buildJsxUtilityPropPolicy } from "../panda/jsx-props.js";
import {
  buildCombinedNoCssOrPatternFnPolicy,
  buildPandaStylePolicy,
} from "../panda/style-policy.js";
export type { PandaPluginLike } from "./javascript.js";

/**
 * Internal: load catalog, resolve paths, build controls. Throws if the
 * generated `.d.ts` files are missing — better to fail loud than to silently
 * drop the entire Panda policy.
 */
function resolvePandaState(options: PandaConfigOptions | undefined): {
  readonly paths: PandaPaths;
  readonly controls: JsxUtilityControls;
} {
  const paths = resolvePandaPaths(options?.paths);
  const catalog = loadCatalog(paths);
  const controls = buildControls(catalog, {
    ...DEFAULT_CONTROLS,
    ...options?.jsxUtilityControls,
    composition: {
      textStyleProperties:
        options?.jsxUtilityControls?.composition?.textStyleProperties ??
        DEFAULT_CONTROLS.composition?.textStyleProperties ??
        true,
      layerStylePaint:
        options?.jsxUtilityControls?.composition?.layerStylePaint ??
        DEFAULT_CONTROLS.composition?.layerStylePaint ??
        true,
    },
  });
  return { paths, controls };
}

/**
 * Compute the full set of Panda policies for the JS / TS preset.
 *
 * Returns the combined `no-restricted-syntax` payload:
 *
 * 1. JSX utility ban (catalog-driven, optional whitelist overrides)
 * 2. Box ban
 * 3. Raw-CSS ban
 * 4. Pattern-function ban
 *
 * Pass the result straight into the preset's `no-restricted-syntax` rule.
 */
export function buildPandaJsTsPolicy(
  options: PandaConfigOptions | undefined = {},
): NoRestrictedSyntaxEntry[] {
  const { paths, controls } = resolvePandaState(options);
  const catalog = loadCatalog(paths);
  const jsxUtilityPropPolicy = buildJsxUtilityPropPolicy(catalog, controls, paths);
  const pandaStylePolicy = buildPandaStylePolicy(jsxUtilityPropPolicy);
  const noCssOrPatternFn = buildCombinedNoCssOrPatternFnPolicy(paths);
  return [...pandaStylePolicy, ...noCssOrPatternFn];
}

/**
 * Build the Panda preset entries for JS / TS files.
 *
 * The dynamic entries (`no-restricted-syntax`) get their selectors from the
 * catalog, so they auto-track the consumer's Panda version.
 */
export function createPanda(
  options: PandaConfigOptions | undefined = {},
): EslintConfig[] {
  const noRestrictedSyntax = buildPandaJsTsPolicy(options);
  return [
    {
      files: ["**/*.{js,mjs,cjs,ts,tsx}"],
      ignores: ["**/*.astro/**"],
      rules: {
        "no-restricted-syntax": ["error", ...noRestrictedSyntax],
      },
    },
  ];
}

/**
 * Compute the full Panda policy for `.astro` files.
 *
 * Same as the JS/TS policy but with the JSX utility ban included — Astro
 * frontmatter compiles to JSX-ish nodes and Panda prop policing should
 * apply to those too.
 */
export function buildPandaAstroPolicy(
  options: PandaConfigOptions | undefined = {},
): NoRestrictedSyntaxEntry[] {
  const { paths, controls } = resolvePandaState(options);
  const catalog = loadCatalog(paths);
  const jsxUtilityPropPolicy = buildJsxUtilityPropPolicy(catalog, controls, paths);
  const pandaStylePolicy = buildPandaStylePolicy(jsxUtilityPropPolicy);
  const noCssOrPatternFn = buildCombinedNoCssOrPatternFnPolicy(paths);
  return [...pandaStylePolicy, ...noCssOrPatternFn];
}

/**
 * Re-export the Panda plugin factory so `createConfig` can wire it into the
 * JS / TS presets without re-importing the plugin.
 */
