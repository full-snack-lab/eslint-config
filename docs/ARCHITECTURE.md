# Architecture

How `@fullsnacklab/eslint-config` is wired together — and why each piece
exists.

## Mental model

ESLint flat configs are **arrays** of objects. Each object is either a global
entry (no `files` matcher) or a file-scoped entry. `createConfig` produces
one such array, in the right order, with the right policies for each file
shape.

The package is organised in three layers:

```
┌──────────────────────────────────────────────────────────────┐
│                       createConfig()                         │  ← entry
│         dynamic plugin loading + composition                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐       ┌──────────────────┐
│   presets/   │       │     panda/       │
│              │       │                  │
│ base         │       │ catalog          │
│ javascript   │       │ controls         │
│ typescript   │◄──────┤ jsx-props        │
│ astro        │       │ style-policy     │
│ theme        │       │ paths            │
│ panda        │       └──────────────────┘
└──────────────┘
                   ▲
                   │
           ┌───────┴────────┐
           │   lib/regex    │  shared esquery helpers
           └────────────────┘
```

`presets/` produces ESLint config entries. `panda/` produces **policy
selectors** (data, not config). `presets/panda.ts` is where the two meet.

---

## Data flow

```
styled-system/dist/
  ├── types/
  │    ├── prop-type.d.ts
  │    ├── style-props.d.ts
  │    └── composition.d.ts
  ├── tokens/tokens.d.ts
  └── patterns/
       ├── stack.d.ts
       ├── flex.d.ts
       └── …
            │
            │  loadCatalog() — pure regex parsing
            ▼
       PandaCatalog
            │
            │  buildControls(catalog, overrides)
            ▼
       JsxUtilityControls
            │
            │  resolveJsxUtilityBans(catalog, controls)
            ▼
       Map<name, { tokens }>
            │
            │  buildJsxUtilityPropPolicy(catalog, controls, paths)
            ▼
       NoRestrictedSyntaxEntry[]        ←  ★ consumed by presets
            │
            │  buildPandaStylePolicy(jsxUtilityPropPolicy)
            ▼
       NoRestrictedSyntaxEntry[]        ←  + Box ban
            │
            │  buildCombinedNoCssOrPatternFnPolicy(paths)
            ▼
       NoRestrictedSyntaxEntry[]        ←  + raw CSS + pattern fn
            │
            ▼
    no-restricted-syntax: ["error", …]   ←  emitted by createPanda
```

---

## Per-preset responsibility

### `base.ts` — global ignores

Single flat-config entry, no `files` matcher, just an `ignores` array. Adds
the defaults (`dist`, `node_modules`, `.astro`, `styled-system`, etc.) and
merges in any consumer-provided extras.

Ignores are intentionally **not** file-type-specific — they apply project-wide.

### `javascript.ts` — JS files

One entry, `files: ["**/*.{js,mjs,cjs}"]`. Sets Node globals, loads `unicorn`
as a plugin, spreads `unicorn.configs.recommended` (the flat-config form —
**not** `extends`), and adds the `UNICORN_OVERRIDES` relaxations.

When Panda is present, also adds the plugin + `recommended.rules` + the
`@pandacss/no-escape-hatch: "error"` lock-down.

### `typescript.ts` — TS files

Same shape as `javascript.ts` but with `@typescript-eslint/parser` and
`ecmaFeatures: { jsx: true }`. Ignores `**/*.astro/**` (the compiled
frontmatter — handled by the Astro preset).

### `astro.ts` — `.astro` files

Emits `eslint-plugin-astro`'s recommended configs (typically three entries
covering the frontmatter JS, TS, and the `.astro` file itself), plus a
**single** consolidated `**/*.astro` block with:

- `unicorn` (relaxed, `prefer-module: off` because frontmatter uses top-level return)
- `no-restricted-syntax` with the full Panda policy (JSX utility ban + raw CSS + pattern fn)

The merger happens in `create-config.ts`: it resolves Panda's
raw-CSS+pattern-fn policies once, then re-builds the Astro block with those
policies spliced in — so we don't end up with two `.astro` entries
competing.

### `theme.ts` — `panda.config.ts` + `theme/`

One entry matching the panda config and any `theme/**` directory. Only
applies the `noDottedStyleNamePolicy` ban. Everything else inherits from the
TS preset.

### `panda.ts` — the dynamic JS/TS ban

Single entry on `**/*.{js,mjs,cjs,ts,tsx}`. Only contains the
`no-restricted-syntax` rule — everything else is handled by the JS/TS
preset.

The selectors are **derived from the catalog at lint time**, not hard-coded.
See the next section.

---

## The Panda module

`panda/` is split into five small files instead of one big one. Each has a
single, testable responsibility:

| File | Responsibility |
| --- | --- |
| `paths.ts` | Resolve `./styled-system/dist/*` (or override) to absolute paths |
| `catalog.ts` | Parse `prop-type.d.ts`, `style-props.d.ts`, `tokens.d.ts` into a typed catalog |
| `controls.ts` | Build the whitelist surface (`props`, `tokens`, `composition`, `default`) |
| `jsx-props.ts` | Resolve the ban list; emit esquery selectors |
| `style-policy.ts` | Static policies (raw CSS, pattern fn, Box, dotted keys) |

### Why parse the generated types with regex?

We considered using the TypeScript compiler API to read the generated
`.d.ts` files. We chose regex instead because:

1. **No compile cost at lint time.** `tsc` adds hundreds of ms; regex adds
   microseconds.
2. **No extra dep.** `typescript` is already a peer dep but we don't want to
   `import` it from this package.
3. **The shape is tiny and stable.** A few hundred lines of `.d.ts` that
   only grow by a few entries per Panda minor.

The trade-off is that if Panda changes its emission shape in a breaking
way, `catalog.ts` needs an update. The fix is localised to one file, and
the smoke test (`bun test`) catches the drift.

### Resolution precedence

When deciding whether a prop is allowed on JSX:

```
1. controls.props[name] === true                       → allow
2. ∃ t ∈ prop.tokens | controls.tokens[t] === true     → allow
3. controls.default === true                           → allow
4. else                                                → ban
```

Composition-derived props (paint slots exposed by `layerStyle`, text-style
property aliases) are layered on top:

```
5. controls.composition.textStyleProperties = true     → ban TextStyleProperty members
6. controls.composition.layerStylePaint = true         → ban LayerStyleProperty paint members
```

The defaults keep the door shut: only `textStyle`, `layerStyle`, and
`colorPalette` are allowed, and the composition levers are enabled.

### Selectors emitted

`buildJsxUtilityPropPolicy` returns up to three `no-restricted-syntax`
entries (one per JSX surface):

```js
JSXOpeningElement:not([name.name=/svg|path|circle|…/]) > JSXAttribute[name.name=/^(…)$/]
JSXAttribute ObjectExpression > Property[key.name=/^(…)$/]
CallExpression[callee.name=/^(cva|sva)$/] Property[key.name=/^(…)$/]
```

The SVG exception matters: `<svg viewBox="…">` and `<path fill="…">` carry
paint attributes that the policy would otherwise mis-classify.

---

## `create-config.ts` — the wiring

```ts
async function createConfig(options) {
  // 1. Dynamic plugin loading (optional peer deps).
  const panda = await tryLoadPandaPlugin();

  // 2. Resolve Panda policies ONCE.
  const pandaAstroPolicy = panda ? buildPandaAstroPolicy(options.panda) : null;

  // 3. Build Astro preset (with Panda policies spliced into one block).
  const astro = wantsAstro ? await createAstro({ panda: pandaAstroPolicy ?? [] }) : [];

  // 4. Build per-language presets.
  const js  = createJavaScript({ panda });
  const ts  = createTypeScript({ panda });
  const theme = createTheme();
  const pandaJs = panda ? createPanda(options.panda) : [];

  // 5. Concatenate. Order matters — broader entries first.
  return [...createBase({ ignores }), ...astro, ...js, ...ts, ...theme, ...pandaJs];
}
```

Why this order? `createBase` returns the ignore entry, which ESLint applies
to every subsequent entry. After that, the per-language entries can safely
use `files` matchers without re-listing the ignores.

---

## Extension points

The package is designed to grow. Adding a new policy rarely requires more
than one new file:

| You want to… | Add… |
| --- | --- |
| Ban a new raw-CSS surface | An entry in `noRawCssPolicy` (`panda/style-policy.ts`) |
| Whitelist a JSX utility by default | An entry in `DEFAULT_CONTROLS` (`panda/controls.ts`) |
| Ban a pattern function call automatically | No code — Panda generates the list from `patterns/*.d.ts` |
| Add a per-file-type rule (e.g. for `.vue`) | A new `presets/vue.ts` + entry in `createConfig` |
| Add a new panda-style policy (e.g. for tests) | A new `presets/tests.ts` |
| Change the Panda type emission shape | An update to `catalog.ts` regex parsers |

Every public function is independently importable from
`@fullsnacklab/eslint-config/panda` or `/presets` — no `createConfig`
required.

---

## Testing

`bun test` runs the smoke tests in `tests/`. They:

1. Load the catalog from a checked-in Panda-shaped fixture under
   `tests/fixtures/`.
2. Verify default controls (composition levers allowed, raw props banned).
3. Verify the JSX prop policy emits at least one selector.
4. Verify whitelist overrides take effect (e.g. `background: true` removes
   `background` from the ban list).

The smoke tests run against fixture `styled-system/dist` artefacts so
catalog-parser drift surfaces immediately, without needing a sibling app.
CI-friendly because they don't need a network.
