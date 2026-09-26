# Usage

Every option `createConfig` accepts, with examples.

## `createConfig(options?)`

```ts
function createConfig(options?: CreateConfigOptions): Promise<EslintConfig[]>
```

Returns a flat-config array. Spread it into your `eslint.config.mjs`'s
default export.

### Default export pattern

ESLint supports both sync and async config defaults. This package's factory
is async (the Astro preset dynamically loads its plugin), so:

```js
// eslint.config.mjs
import { createConfig } from "@fullsnacklab/eslint-config";

export default await createConfig();
```

If your tooling requires a sync export, pre-await:

```js
import { createConfig } from "@fullsnacklab/eslint-config";

const config = await createConfig();
export default config;
```

---

## `CreateConfigOptions`

```ts
interface CreateConfigOptions {
  ignores?: ReadonlyArray<string>;
  panda?: PandaConfigOptions;
  astro?: boolean;
}
```

### `ignores`

Extra globs to add to the default ignore list. Defaults already cover:

- `dist/`
- `node_modules/`
- `.astro/`
- `.next/`, `.turbo/`, `.vercel/`, `.output/`
- `build/`, `coverage/`
- `styled-system/`, `styled-system-studio/`
- `**/*.generated.ts`

Add anything project-local — legacy folders, codegen output, etc.

```js
export default await createConfig({
  ignores: ["**/legacy/**", "scripts/codegen/**", "tmp/**"],
});
```

### `panda`

Panda-specific configuration. When the `@pandacss/eslint-plugin` peer dep is
not installed, the entire `panda` block is a no-op.

```ts
interface PandaConfigOptions {
  paths?: Partial<PandaPaths>;
  jsxUtilityControls?: JsxUtilityControlsOverride;
}
```

#### `panda.paths`

Override where the generated Panda artefacts live. All keys default to
`./styled-system/dist/...` (relative to `process.cwd()`). Absolute paths
are also accepted.

```ts
interface PandaPaths {
  typesRoot: string;        // prop-type.d.ts, style-props.d.ts, composition.d.ts
  tokensRoot: string;       // tokens.d.ts
  patternsRoot: string;     // stack.d.ts, flex.d.ts, …
  compositionRoot: string;  // defaults to typesRoot
}
```

```js
export default await createConfig({
  panda: {
    paths: {
      typesRoot: "./build/styled-system/types",
      patternsRoot: "./build/styled-system/patterns",
    },
  },
});
```

#### `panda.jsxUtilityControls`

Override the JSX utility whitelist. The default only allows the composition
levers (`textStyle`, `layerStyle`, `colorPalette`); everything else must
live in a recipe, layerStyle, or textStyle.

```ts
interface JsxUtilityControlsOverride {
  default?: boolean;
  tokens?: Record<string, boolean>;
  props?: Record<string, boolean>;
  composition?: {
    textStyleProperties?: boolean;
    layerStylePaint?: boolean;
  };
}
```

##### Whitelist an entire prop

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      props: {
        background: true,          // allow `background="red.500"`
        paddingX: true,            // allow `paddingX="md"`
      },
    },
  },
});
```

##### Whitelist a token category

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      tokens: {
        colors: true,              // allow any color utility: `bg="red.500"`, `color="blue.300"`
        spacing: true,             // allow any spacing utility: `p="md"`, `gap="lg"`
      },
    },
  },
});
```

##### Toggle composition levers

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      composition: {
        textStyleProperties: true, // ban text-style property leaks (`color`, `fontSize`, …)
        layerStylePaint: true,     // ban layer-style paint leaks (`background`, `color`, …)
      },
    },
  },
});
```

##### Allow everything (escape hatch)

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      default: true, // fall-through: any prop not explicitly banned is allowed
    },
  },
});
```

> Use sparingly — the whole point of the package is to enforce recipe-driven
> styling. `default: true` re-opens the entire surface.

### `astro`

Set to `false` to skip the Astro preset entirely (e.g. Node libs, React
SPAs). Default: `true`. When `eslint-plugin-astro` is not installed, the
preset is a no-op regardless of this setting.

```js
export default await createConfig({ astro: false });
```

---

## Composing without `createConfig`

Every preset is exported individually. For projects that need bespoke
composition, skip the factory and build your own:

```js
// eslint.config.mjs
import {
  createBase,
  createJavaScript,
  createTypeScript,
  createTheme,
  createPanda,
} from "@fullsnacklab/eslint-config/presets";
import pandaPlugin from "@pandacss/eslint-plugin";

export default [
  ...createBase({ ignores: ["**/legacy/**"] }),
  ...createJavaScript({ panda: pandaPlugin }),
  ...createTypeScript({ panda: pandaPlugin }),
  ...createTheme({ additionalFiles: ["studio/theme/**"] }),
  ...createPanda({
    jsxUtilityControls: { props: { background: true } },
  }),
];
```

### Using `panda/` subpath directly

For the lowest-level composition (e.g. embedding these policies in an
existing config without re-deriving the catalog):

```js
import {
  resolvePandaPaths,
  loadCatalog,
  buildControls,
  DEFAULT_CONTROLS,
  buildJsxUtilityPropPolicy,
  noRawCssPolicy,
  noDottedStyleNamePolicy,
} from "@fullsnacklab/eslint-config/panda";

const paths = resolvePandaPaths();
const catalog = loadCatalog(paths);
const controls = buildControls(catalog, {
  ...DEFAULT_CONTROLS,
  props: { background: true },
});

const jsxPolicy = buildJsxUtilityPropPolicy(catalog, controls, paths);

export default [
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...jsxPolicy, ...noRawCssPolicy],
    },
  },
  {
    files: ["theme/**"],
    rules: {
      "no-restricted-syntax": ["error", ...noDottedStyleNamePolicy],
    },
  },
];
```

---

## Adding project-local rules

The factory returns a flat-config array — spread it and append:

```js
import { createConfig } from "@fullsnacklab/eslint-config";

export default [
  ...(await createConfig()),
  {
    // Project-local rules. These override the factory's defaults for the
    // matching files.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unsafe-assignment": "error",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
```

---

## Common pitfalls

### `panda codegen` hasn't been run

```
Error: [@fullsnacklab/eslint-config] Panda preset failed to initialise.
Run `panda codegen` and ensure `styled-system/dist` exists.
```

Run `bun run panda:codegen` (or whatever your Panda script is) once, and
re-run after every `panda.config.ts` change.

### Styled-system in a non-standard location

If your build emits to `build/styled-system/dist` instead of
`./styled-system/dist`, override `panda.paths`:

```js
panda: {
  paths: {
    typesRoot: "./build/styled-system/dist/types",
    tokensRoot: "./build/styled-system/dist/tokens",
    patternsRoot: "./build/styled-system/dist/patterns",
  },
},
```

### Adding new tokens doesn't update the ban list

The ban list is **derived from the catalog at lint time**, not cached. Run
`bun run lint` after `panda codegen` and the new tokens appear automatically.
No config change needed.

### Project uses a mix of `styled-system` and `css`

The `noRawCssPolicy` covers all common routes. If you have an unusual one
(e.g. a homegrown CSS-in-JS), add a selector:

```js
import {
  noRawCssPolicy,
} from "@fullsnacklab/eslint-config/panda";

export default [
  ...(await createConfig()),
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...noRawCssPolicy,
        {
          selector: "ImportDeclaration[source.value=/my-css-lib/]",
          message: "Use Panda style props instead.",
        },
      ],
    },
  },
];
```

Or open a PR adding the selector to `style-policy.ts` for everyone.
