/**
 * Dogfood the workspace's ESLint package against every package source.
 *
 * Requires `dist/` (run `bun run build` / `prelint` first).
 */
import { createConfig } from "@fullsnacklab/eslint-config";

export default [
  ...(await createConfig({
    // This package is not a Panda CSS consumer — catalog probing will skip
    // the Panda preset. Astro is available as a peer for dogfooding.
    ignores: [
      "packages/*/tests/**",
      "packages/*/dist/**",
      ".tsbuildinfo",
      "eslint.config.mjs",
      "bun.lock",
      "**/CHANGELOG.md",
    ],
  })),
  // Package sources lean on JSDoc; single-line block comments are clearer
  // in editor tooltips than `//` lines.
  {
    files: ["packages/eslint-config/src/**/*.ts"],
    rules: {
      "unicorn/single-line-block-comment-style": "off",
    },
  },
];
