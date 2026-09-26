/**
 * JavaScript preset — applies unicorn + Panda's recommended rules to all
 * `.js` / `.mjs` / `.cjs` files.
 *
 * JS files can't carry JSX-style utility props, but they still benefit from
 * Panda's recommended rule set (`@pandacss/eslint-plugin`) for things like
 * detecting escaped values in non-JSX positions.
 *
 * @packageDocumentation
 */

import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import type { ESLint, Linter } from "eslint";
import type { EslintConfig } from "../types.js";

/**
 * Unicorn rules we deliberately relax across the codebase. Centralised here
 * so the JS / TS / Astro presets stay in lockstep.
 *
 * | Rule                                | Why it's off                                                                              |
 * | ----------------------------------- | ----------------------------------------------------------------------------------------- |
 * | `unicorn/no-null`                   | OpenAPI / JSON wire formats use `null` deliberately.                                      |
 * | `unicorn/name-replacements`         | React / component APIs (`Props`, `open`, `live`) are common.                              |
 * | `unicorn/consistent-boolean-name`   | Same — React props break the heuristic.                                                   |
 * | `unicorn/filename-case`             | PascalCase Astro components (`BaseLayout`, `SessionPanel`).                               |
 * | `unicorn/max-nested-calls`          | Zod / fluent builders chain deeply.                                                       |
 * | `unicorn/prefer-ternary`            | Early returns read better than ternaries for non-trivial branches.                        |
 */
export const UNICORN_OVERRIDES = {
  "unicorn/no-null": "off",
  "unicorn/name-replacements": "off",
  "unicorn/consistent-boolean-name": "off",
  "unicorn/filename-case": "off",
  "unicorn/max-nested-calls": "off",
  "unicorn/prefer-ternary": "off",
} as const;

/**
 * Minimal structural type for `@pandacss/eslint-plugin` — we only touch its
 * `configs.recommended.rules` map. Declared locally so we don't need to
 * depend on the plugin's own types.
 */
export interface PandaPluginLike {
  readonly configs: {
    readonly recommended: {
      readonly rules: Record<string, unknown>;
    };
  };
}

/**
 * Build the JS flat-config entry.
 *
 * @param options.panda — pass the imported `@pandacss/eslint-plugin` default
 *   export to enable Panda's recommended rules on JS files. Leave undefined on
 *   non-Panda projects.
 */
export function createJavaScript(
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

  return [
    {
      ...unicorn.configs.recommended,
      files: ["**/*.{js,mjs,cjs}"],
      languageOptions: {
        ...unicorn.configs.recommended.languageOptions,
        globals: {
          ...globals.builtin,
          ...globals.node,
        },
        sourceType: "module",
      },
      // Cast at the boundary — ESLint's plugin namespace type isn't
      // reachable through `verbatimModuleSyntax`. Runtime semantics unaffected.
      plugins: plugins as unknown as Record<string, ESLint.Plugin>,
      rules: {
        ...unicorn.configs.recommended.rules,
        ...UNICORN_OVERRIDES,
        ...styleRules,
      },
    },
  ];
}
