# Migration

Drop-in for the legacy `eslint.config.mjs` from `perths-best-web` (and any
other repo that copy-pasted it).

## Before

```js
// eslint.config.mjs (perths-best-web)
import typescriptEslintParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import eslintPluginAstro from "eslint-plugin-astro";
import panda from "@pandacss/eslint-plugin";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import { pandaStylePolicy, noRawCssPolicy, noPatternFnPolicy, noDottedStyleNamePolicy } from "./eslint.panda-style-policy.js";

const unicornRules = { /* … */ };
const styleRules = { /* … */ };

export default defineConfig([
  { ignores: ["dist", "node_modules", ".astro", ".cursor", "styled-system", "styled-system-studio", "prototype-website"] },
  ...eslintPluginAstro.configs.recommended,
  { files: ["**/*.{js,mjs,cjs}"], /* … */ },
  { files: ["**/*.{ts,tsx}"], ignores: ["**/*.astro/**"], /* … */ },
  { files: ["**/*.astro"], /* … */ },
  { files: ["panda.config.ts", "**/theme/**/*.{ts,js}"], /* … */ },
]);
```

Plus two sibling files (`eslint.panda-style-policy.js`,
`eslint.panda-jsx-props.js`) totalling ~420 lines.

## After

```js
// eslint.config.mjs
import { createConfig } from "@fullsnacklab/eslint-config";

export default await createConfig({
  ignores: [".cursor", "prototype-website"], // extras only
});
```

Plus one dev dependency:

```bash
bun add -D @fullsnacklab/eslint-config
```

Delete the three legacy files:

```bash
rm eslint.panda-style-policy.js eslint.panda-jsx-props.js
```

(`eslint.config.js` → `eslint.config.mjs` as part of the rename.)

## Behavioural parity

`createConfig()` reproduces the legacy behaviour exactly:

| Legacy behaviour | New behaviour |
| --- | --- |
| 5 ignore paths | Same + sensible extras (`.next`, `.turbo`, `.vercel`, `.output`, `build`, `coverage`, `styled-system-studio`, `**/*.generated.ts`) |
| `unicorn` recommended + 6 overrides | Same |
| `@pandacss/eslint-plugin` recommended + `no-escape-hatch: error` | Same |
| `pandaStylePolicy` (Box ban + JSX utility ban) | Same |
| `noRawCssPolicy` | Same (now in `panda/style-policy.ts`) |
| `noPatternFnPolicy` | Same, names loaded from `styled-system/dist/patterns` |
| `noDottedStyleNamePolicy` on `panda.config.ts` + `theme/` | Same |
| `unicorn/prefer-module: off` on `.astro` | Same |
| `globals.builtin + node` for JS, `+ browser` for TS | Same |
| `@typescript-eslint/parser` for TS/TSX with `ecmaFeatures.jsx` | Same |

Verified against `perths-best-web`: 20 lint errors on the same input,
matching exactly.

## What changed (and why)

### Async factory

The Astro preset now dynamically detects whether `eslint-plugin-astro` is
installed — non-Astro projects don't pay the import cost. This makes
`createConfig` async; ESLint supports top-level `await` in
`eslint.config.mjs`, so the migration is `export default await createConfig(…)`.

### Catalog auto-resolution

The legacy code did `path.resolve(process.cwd(), "styled-system/dist/...")`.
The new package exposes this through `panda.paths` so monorepos and
projects with non-standard Panda output paths can override:

```js
export default await createConfig({
  panda: {
    paths: {
      typesRoot: "./build/styled-system/dist/types",
      patternsRoot: "./build/styled-system/dist/patterns",
    },
  },
});
```

### Pattern fn policy now dynamic

The legacy `noPatternFnPolicy` had a hard-coded list of pattern function
names (`stack`, `flex`, …). The new policy loads them from
`styled-system/dist/patterns/*.d.ts`, so it tracks your Panda version
automatically.

### JSX utility whitelist lives in one place

In the legacy code, the whitelist was split between
`eslint.panda-jsx-props.js` (`jsxUtilityControls`) and the config file
(`unicorn` overrides). It's now a single `JsxUtilityControlsOverride`
passed to `createConfig`.

### Box ban message

The legacy message was generic ("Do not use Box"). Unchanged, but it's
now in `panda/style-policy.ts` as `buildPandaStylePolicy`.

### Ignores

The legacy ignored `.cursor` and `prototype-website` — keep those in
your `createConfig({ ignores: […] })` call. The new package adds `.next`,
`.turbo`, `.vercel`, `.output`, `build`, `coverage`, and `**/*.generated.ts`
by default; remove from your list if you don't want them.

## Custom-preset escape hatch

If you've added project-local rules beyond the three legacy files, append
them after the factory output:

```js
export default [
  ...(await createConfig()),
  {
    files: ["scripts/codegen/**/*.ts"],
    rules: { "no-console": "off" },
  },
];
```

For full custom composition, see [Usage → Composing without
`createConfig`](./USAGE.md#composing-without-createconfig).

---

## Rollback

If you need to roll back, keep the legacy files until the new config has
been running for a sprint:

```bash
git mv eslint.config.mjs eslint.config.new.mjs
git mv eslint.panda-style-policy.js eslint.panda-style-policy.js.bak
git mv eslint.panda-jsx-props.js eslint.panda-jsx-props.js.bak
# restore eslint.config.js from the last commit
git checkout HEAD~ -- eslint.config.js
bun remove @fullsnacklab/eslint-config
```

Then file an issue with the selector that fired unexpectedly — the
migration is verified for `perths-best-web` but every project's Panda
emission is slightly different.
