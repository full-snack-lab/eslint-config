/**
 * Public re-exports for the `@fullsnacklab/eslint-config/panda` subpath.
 *
 * Most consumers will use {@link createConfig} and never touch this module
 * directly. Preset authors or projects that want to compose custom Panda
 * policies will reach for the lower-level builders here.
 *
 * @packageDocumentation
 */

export { resolvePandaPaths } from "./paths.js";
export type { PandaPaths } from "../types.js";

export { loadCatalog } from "./catalog.js";
export type { PandaCatalog } from "./catalog.js";

export {
  buildControls,
  isAllowed,
  DEFAULT_CONTROLS,
  type JsxUtilityControls,
} from "./controls.js";

export {
  buildJsxUtilityPropPolicy,
  resolveJsxUtilityBans,
  type JsxUtilityBanResolution,
} from "./jsx-props.js";

export {
  noRawCssPolicy,
  noDottedStyleNamePolicy,
  astroNoCssPolicy,
  buildNoPatternFnPolicy,
  buildCombinedNoCssOrPatternFnPolicy,
  buildPandaStylePolicy,
} from "./style-policy.js";
