# Changelog

All notable changes to `@fullsnacklab/eslint-config` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-09-21

### Fixed

- Removed leftover legacy consumer files (`eslint.panda-*.js`,
  `tests/eslint.config.js`) that duplicated `src/` and broke
  `bun run lint`.
- Dogfood `eslint.config.mjs` via `createConfig` from `dist/`.
- Corrected peer dependency surface: `eslint >=10.4` (unicorn 76),
  optional Astro / Panda peers; dropped `"private": true` so the
  scoped package can publish with `publishConfig.access=public`.
- Typed `EslintConfig` against `Linter.Config` instead of
  `@eslint/config-helpers`.

### Added

- **One-call factory** — `createConfig(options?)` returns a typed ESLint
  flat-config array covering JavaScript, TypeScript, Astro, theme, and
  Panda CSS in a single call.
- **JavaScript preset** — `eslint-plugin-unicorn` (recommended +
  package-specific overrides for `no-null`, `name-replacements`,
  `consistent-boolean-name`, `filename-case`, `max-nested-calls`,
  `prefer-ternary`) plus `@pandacss/eslint-plugin` recommended when
  installed.
- **TypeScript preset** — same, with `@typescript-eslint/parser` and JSX
  support for `.ts` / `.tsx`.
- **Astro preset** — `eslint-plugin-astro` recommended + Panda
  policies (raw-css, pattern-fn, JSX utility ban, Box ban) merged into a
  single `.astro` block. Auto-disabled when the plugin is not installed.
- **Theme preset** — `noDottedStyleNamePolicy` on `panda.config.ts` and
  any `theme/` directory.
- **Panda module** (`/panda` subpath):
  - `resolvePandaPaths()` — configurable styled-system location.
  - `loadCatalog()` — parses generated `.d.ts` files via regex (no
    `tsc` dependency at lint time).
  - `buildControls()` — whitelist surface (`props`, `tokens`,
    `composition`, `default`).
  - `resolveJsxUtilityBans()` — derives the ban list with precedence
    rules.
  - `buildJsxUtilityPropPolicy()` — emits esquery selectors (JSX
    attributes, object-expression props, `cva`/`sva` recipe props) with
    SVG exception.
  - `noRawCssPolicy` — 30+ selectors covering every common raw-CSS
    authoring surface.
  - `buildNoPatternFnPolicy()` — loads pattern names from
    `styled-system/dist/patterns/`.
  - `buildPandaStylePolicy()` — Box ban + JSX utility ban.
- **Smoke tests** (`bun test`) — verify catalog parsing, default
  controls, and policy emission against a checked-in Panda-shaped
  fixture.
- **Documentation**:
  - `README.md` — overview, install, quick start, common customisations.
  - `docs/ARCHITECTURE.md` — wiring diagram, data flow, per-preset
    responsibilities.
  - `docs/USAGE.md` — every option with examples.
  - `docs/PANDAS-POLICY.md` — how the dynamic ban list is derived and
    extended.
  - `docs/MIGRATION.md` — drop-in for a legacy inline flat config +
    sibling Panda policy files.

### Notes

- UNLICENSED — internal use within `@fullsnacklab`; published as a
  public scoped package for org install convenience.
- Requires Node ≥ 22.12 (develop against Node 24).
- Requires ESLint ≥ 10.4 (peer of `eslint-plugin-unicorn@76`).
- TypeScript ≥ 5.0 is supported; TS 6 is the version this package is
  authored against.
