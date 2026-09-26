/**
 * Public re-exports for `@fullsnacklab/eslint-config/presets`.
 *
 * Lets advanced consumers compose individual presets without going through
 * `createConfig`:
 *
 * ```ts
 * import { createBase, createTypeScript } from "@fullsnacklab/eslint-config/presets";
 *
 * export default [
 *   ...createBase({ ignores: ["alpha.gen.ts"] }),
 *   ...createTypeScript(),
 * ];
 * ```
 *
 * @packageDocumentation
 */

export { createBase, baseIgnores } from "./base.js";

export {
  createJavaScript,
  UNICORN_OVERRIDES,
  type PandaPluginLike,
} from "./javascript.js";

export { createTypeScript } from "./typescript.js";

export { createAstro } from "./astro.js";

export { createTheme } from "./theme.js";

export {
  createPanda,
  buildPandaJsTsPolicy,
  buildPandaAstroPolicy,
} from "./panda.js";
