/**
 * Astro preset — applies `eslint-plugin-astro`'s recommended config + unicorn
 * to `.astro` files, with the Panda policies wired in.
 *
 * The Astro parser already handles `.astro` so we don't re-parse with
 * `@typescript-eslint/parser`. We do opt out of `unicorn/prefer-module`
 * because Astro frontmatter uses top-level `return` for early exit.
 *
 * This preset is only emitted when:
 *
 * 1. The consumer opted in via `createConfig({ astro: true })`, AND
 * 2. `eslint-plugin-astro` is importable at lint time.
 *
 * The second condition is checked dynamically so a missing peer dependency
 * doesn't crash non-Astro projects.
 *
 * @packageDocumentation
 */

import unicorn from "eslint-plugin-unicorn";
import type { ESLint } from "eslint";
import type { EslintConfig } from "../types.js";
import { UNICORN_OVERRIDES } from "./javascript.js";
import type { NoRestrictedSyntaxEntry } from "../types.js";

/**
 * Optional dynamic import — returns the Astro plugin if installed, else `null`.
 *
 * Kept lazy so non-Astro projects never pay the import cost.
 */
async function tryLoadAstroPlugin(): Promise<unknown | null> {
  try {
    const mod = await import("eslint-plugin-astro");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * Build the Astro preset.
 *
 * Returns a Promise — ESLint's flat config supports top-level Promises, so
 * consumers can `export default await createConfig(...)` if they prefer, or
 * rely on the synchronous `createConfig` wrapper which awaits internally.
 *
 * @param options.panda — combined Panda `no-restricted-syntax` entries
 *   (typically the output of {@link buildCombinedNoCssOrPatternFnPolicy}).
 *   These are merged into the unified `*.astro` block so consumers don't
 *   end up with two competing blocks for the same file pattern.
 */
export async function createAstro(
  options: { panda?: NoRestrictedSyntaxEntry[] | undefined } = {},
): Promise<EslintConfig[]> {
  const astroPlugin = await tryLoadAstroPlugin();
  if (!astroPlugin) {
    // Plugin not installed — emit a no-op so downstream code keeps working.
    return [];
  }

  const recommendedConfigs =
    (astroPlugin as { configs: { recommended: EslintConfig[] } }).configs.recommended ?? [];

  return [
    ...recommendedConfigs,
    {
      ...unicorn.configs.recommended,
      files: ["**/*.astro"],
      // Plugins cast for the same reason as the JS / TS presets.
      plugins: { unicorn } as unknown as Record<string, ESLint.Plugin>,
      rules: {
        ...unicorn.configs.recommended.rules,
        ...UNICORN_OVERRIDES,
        // Astro frontmatter uses top-level return for early exit.
        "unicorn/prefer-module": "off",
        "no-restricted-syntax": ["error", ...(options.panda ?? [])],
      },
    },
  ];
}
