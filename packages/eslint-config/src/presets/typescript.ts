/**
 * TypeScript preset — applies unicorn + Panda's recommended rules to all
 * `.ts` / `.tsx` files, with `@typescript-eslint/parser` providing JSX
 * support.
 *
 * File-level overrides (e.g. `styled-system/**`) are handled by the Panda
 * preset; this preset is concerned only with parsing and language options.
 *
 * @packageDocumentation
 */

import typescriptEslintParser from "@typescript-eslint/parser";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import type { ESLint, Linter } from "eslint";
import type { EslintConfig } from "../types.js";
import { UNICORN_OVERRIDES, type PandaPluginLike } from "./javascript.js";

/**
 * Build the TS flat-config entry.
 *
 * Importing `@typescript-eslint/parser` is required; the function will throw
 * at lint time if it's missing.
 *
 * @param options.panda — optional Panda plugin (same as the JS preset).
 */
export function createTypeScript(
  options: { panda?: PandaPluginLike | undefined } = {},
): EslintConfig[] {
  // ESLint's plugin type is intentionally widened to `unknown` here — the
  // official `ESLint.Plugin` type lives in the namespace and isn't easy to
  // carry through every preset entry.
  const plugins: Record<string, unknown> = { unicorn };
  const styleRules: Record<string, Linter.RuleEntry> = {};

  if (options.panda) {
    plugins["@pandacss"] = options.panda;
    Object.assign(styleRules, options.panda.configs.recommended.rules, {
      "@pandacss/no-escape-hatch": "error",
    });
  }

  // .astro subpath contains the compiled TS of an Astro component — not the
  // component itself, so we skip it (the Astro preset handles `.astro` files).
  return [
    {
      ...unicorn.configs.recommended,
      files: ["**/*.{ts,tsx}"],
      ignores: ["**/*.astro/**"],
      languageOptions: {
        ...unicorn.configs.recommended.languageOptions,
        parser: typescriptEslintParser,
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
        globals: {
          ...globals.builtin,
          ...globals.browser,
          ...globals.node,
        },
        sourceType: "module",
      },
      // See note in `createJavaScript` for why this is cast.
      plugins: plugins as unknown as Record<string, ESLint.Plugin>,
      rules: {
        ...unicorn.configs.recommended.rules,
        ...UNICORN_OVERRIDES,
        ...styleRules,
      },
    },
  ];
}
