# `@fullsnacklab/alint-config`

> Shared, model-backed JavaScript and TypeScript design review for Full Snack
> Lab projects.

The preset wraps alint's maintained `js/recommended` rules and reports them as
warnings. It reads applicable `.gitignore` files and skips dependencies, build
output, generated declarations, agent metadata, and test fixtures.

## Installation

```bash
bun add -D @fullsnacklab/alint-config @alint-js/cli
```

Model providers are machine-level setup, not package policy. Configure one once
with `alint setup`, then confirm the default model is available:

```bash
alint config models list
```

Do not put API keys in `alint.config.ts`.

## Usage

```ts
// alint.config.ts
import { defineConfig } from "@alint-js/cli";
import fullSnackLab from "@fullsnacklab/alint-config";

export default defineConfig([
  {
    extends: ["fullsnacklab/recommended"],
    plugins: {
      fullsnacklab: fullSnackLab,
    },
  },
]);
```

Run a complete review or only review Git changes:

```bash
alint .
alint --dirty
```

The preset enables alint's warning-level checks for miniature normalizers,
mixed responsibility layers, private schema toolkits, redundant bindings,
redundant JSDoc, trivial wrapper stacks, and vacuous functions.

Append another flat-config item in a project when it needs different files or
rule severities:

```ts
import { defineConfig } from "@alint-js/cli";
import fullSnackLab from "@fullsnacklab/alint-config";

export default defineConfig([
  {
    extends: ["fullsnacklab/recommended"],
    plugins: {
      fullsnacklab: fullSnackLab,
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "js/no-redundant-jsdoc": "off",
    },
  },
]);
```

## License

UNLICENSED — private internal use within `@fullsnacklab`.
