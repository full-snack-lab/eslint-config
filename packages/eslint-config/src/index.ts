/**
 * `@fullsnacklab/eslint-config` — public entry.
 *
 * One-call factory + granular preset re-exports for advanced composition.
 *
 * @packageDocumentation
 */

export { createConfig } from "./create-config.js";

export type {
  CreateConfigOptions,
  EslintConfig,
  JsxUtilityControlsOverride,
  PandaConfigOptions,
  PandaPaths,
  Policy,
  NoRestrictedSyntaxEntry,
} from "./types.js";
