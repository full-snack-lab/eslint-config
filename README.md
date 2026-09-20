# `@fullsnacklab/eslint-config`

> Opinionated, modular ESLint flat config —
> Panda CSS aware, Astro ready, TS 6 first.

[![npm](https://img.shields.io/npm/v/@fullsnacklab/eslint-config?color=cb3837)](https://www.npmjs.com/package/@fullsnacklab/eslint-config)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.12-339933)](https://nodejs.org)
[![ESLint](https://img.shields.io/badge/eslint-%E2%89%A510.4-4b32c3)](https://eslint.org)

---

## At a glance

```js
// eslint.config.mjs
import { createConfig } from "@fullsnacklab/eslint-config";

export default await createConfig({
  panda: {
    // Defaults are fine for a stock Panda install:
    paths: { typesRoot: "./styled-system/dist/types" },
  },
});
```

That's it. The factory wires up:

- **Base ignores** — `dist`, `node_modules`, `.astro`, `.next`, `.turbo`,
  `styled-system`, generated artefacts.
- **JavaScript** — `eslint-plugin-unicorn` (relaxed where it fights React /
  Astro / Zod) + Panda's recommended rules when `@pandacss/eslint-plugin` is
  installed.
- **TypeScript** — same, plus `@typescript-eslint/parser` for JSX in `.ts` /
  `.tsx`.
- **Astro** — `eslint-plugin-astro`'s recommended config, with Panda's
  raw-css + pattern-fn + JSX-utility policies merged into the same block.
- **Theme** — the dotted-key ban on `panda.config.ts` and `theme/**`.
- **Panda CSS** — conversation with `styled-system/dist` to derive a
  per-project JSX utility whitelist.

Everything is composed from typed presets — see [Architecture](./docs/ARCHITECTURE.md)
for the wiring diagram and [Usage](./docs/USAGE.md) for advanced composition.

---

## Why this exists

Copy-pasting the same flat config across apps and Astro experiments leads to
drift. This package is the source of truth: one place to add a rule, fix a
selector, or upgrade a peer dependency, and every consumer picks it up on
their next `bun install`.

### What it solves today

- **Panda discipline.** Every `UtilityValues` prop defaults to **banned** on
  JSX; you whitelist the composition levers (`textStyle`, `layerStyle`,
  `colorPalette`) and everything else has to live in a recipe. The ban list
  is **derived from your project's generated Panda types** — it auto-tracks
  your Panda version, no manual maintenance.
- **No raw CSS.** `css()` calls, inline `style` props, popular CSS-in-JS
  imports (`@emotion/*`, `styled-components`, `goober`, …), `setAttribute("style", …)`,
  `insertRule`, adopted stylesheets — all banned with a single error message.
- **Pattern functions banned, pattern components allowed.** `<Stack />` from
  `/styled-system/jsx` is fine; `stack({ … })` from `/styled-system/patterns`
  isn't.
- **Box banned.** Use layout patterns or semantic components.
- **Dotted-key ban** in `textStyles` / `layerStyles` definitions — forces a
  proper nested shape that the generated types assume.
- **Astro frontmatter passes unicorn.** With `prefer-module` disabled (frontmatter
  uses top-level return).

---

## Installation

```bash
bun add -D @fullsnacklab/eslint-config
```

Required peer:

```bash
bun add -D eslint@>=10.4
```

Bundled with this package (no need to install separately):
`eslint-plugin-unicorn`, `globals`, `@typescript-eslint/parser`.

Optional peers — detected at runtime; omitted presets when missing:

```bash
bun add -D eslint-plugin-astro                    # Astro projects
bun add -D @pandacss/eslint-plugin @pandacss/dev  # Panda projects
```

---

## Quick start

### 1. Generate Panda types (one time, and after every Panda config change)

```bash
bun run panda:codegen
```

This produces `styled-system/dist/types/prop-type.d.ts`,
`style-props.d.ts`, `composition.d.ts`, `tokens/tokens.d.ts`, and
`patterns/*.d.ts`. The config reads these at lint time.

### 2. Create `eslint.config.mjs`

```js
import { createConfig } from "@fullsnacklab/eslint-config";

export default await createConfig();
```

That's the whole config file. Add to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### 3. Run it

```bash
bun run lint
```

---

## Common customisations

### Override ignore list

```js
export default await createConfig({
  ignores: ["**/legacy/**", "scripts/codegen/**"],
});
```

### Whitelist an additional JSX utility prop

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      props: {
        background: true, // allow `background="red.500"` on JSX
      },
    },
  },
});
```

### Custom Panda path layout

```js
export default await createConfig({
  panda: {
    paths: {
      typesRoot: "./build/styled-system/types",
      tokensRoot: "./build/styled-system/tokens",
      patternsRoot: "./build/styled-system/patterns",
    },
  },
});
```

### Disable Astro (e.g. Node lib)

```js
export default await createConfig({ astro: false });
```

### Compose with project-local rules

The factory returns a flat-config array — spread it and add your own:

```js
import { createConfig } from "@fullsnacklab/eslint-config";

export default [
  ...(await createConfig()),
  {
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
];
```

---

## Architecture in 30 seconds

```
src/
├── create-config.ts       # one-call factory
├── types.ts               # public types
├── lib/regex.ts           # tiny shared helpers
├── panda/
│   ├── paths.ts           # resolves ./styled-system/dist → absolute
│   ├── catalog.ts         # parses prop-type.d.ts, style-props.d.ts, tokens.d.ts
│   ├── controls.ts        # whitelist surface (props × tokens × composition)
│   ├── jsx-props.ts       # resolves the ban list → esquery selectors
│   ├── style-policy.ts    # raw-css / pattern-fn / box / dotted-key
│   └── index.ts           # public re-exports
└── presets/
    ├── base.ts            # ignore list
    ├── javascript.ts      # unicorn + Panda recommended on .js
    ├── typescript.ts      # + @typescript-eslint/parser for .ts/.tsx
    ├── astro.ts           # eslint-plugin-astro recommended + Panda
    ├── theme.ts           # dotted-key ban for panda.config.ts + theme/
    └── panda.ts           # full JSX utility ban + raw-css on JS/TS
```

Full wiring diagram and data-flow in [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Documentation

| File | What's in it |
| --- | --- |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Wiring diagram, data flow, why each preset exists |
| [docs/USAGE.md](./docs/USAGE.md) | Every option, with examples |
| [docs/PANDAS-POLICY.md](./docs/PANDAS-POLICY.md) | How the dynamic JSX utility ban is derived, and how to extend it |
| [docs/MIGRATION.md](./docs/MIGRATION.md) | Drop-in for a legacy inline `eslint.config.{js,mjs}` + sibling Panda policy files |

---

## Scripts

```bash
bun run build       # compile TS → dist/
bun run typecheck   # tsc --noEmit
bun run test        # bun test (smoke tests against a checked-in Panda fixture)
bun run lint        # eslint on this package's own sources
bun run clean       # remove dist/ and .tsbuildinfo
```

---

## License

UNLICENSED — private internal use only within `@fullsnacklab`. See [LICENSE](./LICENSE).
