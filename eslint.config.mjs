import typescriptEslintParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import panda from "@pandacss/eslint-plugin";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import { pandaStylePolicy, noRawCssPolicy, noPatternFnPolicy, noDottedStyleNamePolicy } from "./eslint.panda-style-policy.js";

const unicornRules = {
  // OpenAPI payloads use null; don't fight the wire format.
  "unicorn/no-null": "off",
  // React / component APIs: Props, open, live.
  "unicorn/name-replacements": "off",
  "unicorn/consistent-boolean-name": "off",
  // PascalCase Astro components (BaseLayout, SessionPanel, …).
  "unicorn/filename-case": "off",
  // Zod / fluent builders.
  "unicorn/max-nested-calls": "off",
  // Prefer early returns over forced ternaries.
  "unicorn/prefer-ternary": "off",
};

export default defineConfig ([

  ...(await createConfig({
    ignores: ["dis/**", "tests", ".tsbuildinfo", "node_modules/**", "styled-system/**", "eslint.config.mjs"],
  })),
  // The package's own source uses JSDoc heavily; single-line block comments are
  // more readable in editor tooltips than `//` lines. Per-project override.
  {
    files: ["src/**/*.ts"],
    rules: {
      "unicorn/single-line-block-comment-style": "off",
    },
 },
 ...eslintPluginAstro.configs.recommended,
 {
  files: ["**/*.{js,mjs,cjs}"],
  languageOptions: {
    globals: {
      ...globals.builtin,
      ...globals.node,
    },
  },
  plugins: {
    unicorn,
    "@pandacss": panda,
  },
  extends: ["unicorn/recommended"],
  rules: {
    ...unicornRules,
    ...styleRules,
  },
},
{
  files: ["**/*.{ts,tsx}"],
  ignores: ["**/*.astro/**"],
  languageOptions: {
    parser: typescriptEslintParser,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    globals: {
      ...globals.builtin,
      ...globals.browser,
      ...globals.node,
    },
  },
  plugins: {
    unicorn,
    "@pandacss": panda,
  },
  extends: ["unicorn/recommended"],
  rules: {
    ...unicornRules,
    ...styleRules,
  },
},
{
  files: ["**/*.astro"],
  plugins: {
    unicorn,
  },
  extends: ["unicorn/recommended"],
  rules: {
    ...unicornRules,
    // Astro frontmatter uses top-level return for early exit.
    "unicorn/prefer-module": "off",
    "no-restricted-syntax": ["error", ...pandaStylePolicy, ...noRawCssPolicy, ...noPatternFnPolicy],
  },
},
{
  files: ["panda.config.ts", "**/theme/**/*.{ts,js}"],
  rules: {
    "no-restricted-syntax": ["error", ...noDottedStyleNamePolicy],
  },
},
])