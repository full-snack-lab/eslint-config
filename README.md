# `lint-rules`

> Full Snack Lab's shared home for deterministic and model-backed lint policy.

This uses a private, non-publishable Bun workspace root. Each linter lives in
its own publishable package so consumers can adopt one policy without
installing the others.

| Package | Purpose |
| --- | --- |
| [`@fullsnacklab/eslint-config`](./packages/eslint-config) | ESLint flat config for JavaScript, TypeScript, Astro, and Panda CSS |
| [`@fullsnacklab/alint-config`](./packages/alint-config) | Warning-level, model-backed design review for JavaScript and TypeScript |

## Development

```bash
bun install
bun run check
```

Run alint across the workspace, or only against files changed from `HEAD`:

```bash
bun run lint:alint
bun run lint:alint:dirty
```

The checked-in [`alint.config.ts`](./alint.config.ts) contains lint policy
only. Provider and model credentials stay in alint's user-level setup. If a
project-local provider is ever needed, `.alint/config.toml` is ignored so it
cannot be committed accidentally.

AI lint is intentionally separate from `bun run check`: it calls a model, has
a cost, and can vary slightly between runs. The initial preset reports
warnings, while ESLint remains the deterministic gate.

## Layout

```text
packages/
├── eslint-config/  # @fullsnacklab/eslint-config
└── alint-config/   # @fullsnacklab/alint-config
```

Add future linter integrations as sibling packages under `packages/`.

## License

UNLICENSED — private internal use within `@fullsnacklab`.
