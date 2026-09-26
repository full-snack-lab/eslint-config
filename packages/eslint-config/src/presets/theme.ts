/**
 * Theme preset — applies the dotted-key ban to `panda.config.ts` and any
 * `theme/` directory.
 *
 * This is where `textStyles` / `layerStyles` live. Keeping dotted flat keys
 * out of those definitions forces a proper nested shape, which is what the
 * generated types assume.
 *
 * @packageDocumentation
 */

import type { EslintConfig } from "../types.js";
import { noDottedStyleNamePolicy } from "../panda/style-policy.js";

/**
 * Build the theme flat-config entry.
 *
 * Apply directly to:
 *
 * - `panda.config.ts`
 * - any `theme/` directory (matched via the recursive glob)
 *
 * Consumers can extend the matcher via the `additionalFiles` option.
 */
export function createTheme(
  options: { additionalFiles?: ReadonlyArray<string> | undefined } = {},
): EslintConfig[] {
  const files = ["panda.config.ts", "**/theme/**/*.{ts,js,mjs}", ...(options.additionalFiles ?? [])];
  return [
    {
      files,
      rules: {
        "no-restricted-syntax": ["error", ...noDottedStyleNamePolicy],
      },
    },
  ];
}
