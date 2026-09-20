/**
 * Base preset — global ignores, optional plugins.
 *
 * This preset is intentionally tiny. It runs on every file in the project and
 * provides only the ignore list. Per-file-type configuration lives in the
 * sibling presets (`javascript`, `typescript`, `astro`, …).
 *
 * @packageDocumentation
 */

import type { EslintConfig } from "../types.js";

const DEFAULT_IGNORES: ReadonlyArray<string> = [
  "dist/**",
  "node_modules/**",
  ".astro/**",
  ".next/**",
  ".turbo/**",
  ".vercel/**",
  ".output/**",
  "build/**",
  "coverage/**",
  "styled-system/**",
  "styled-system-studio/**",
  "**/*.generated.ts",
];

/**
 * Build the base flat-config entry.
 *
 * @param options.ignores — extra globs to add to the ignore list.
 */
export function createBase(options: { ignores?: ReadonlyArray<string> } = {}): EslintConfig[] {
  const ignores = [...DEFAULT_IGNORES, ...(options.ignores ?? [])];
  return [
    {
      ignores: [...new Set(ignores)],
    },
  ];
}

/**
 * The default ignore list — exposed for tests / inspection.
 */
export const baseIgnores = DEFAULT_IGNORES;
