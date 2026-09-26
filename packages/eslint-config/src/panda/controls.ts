/**
 * JSX utility whitelist surface.
 *
 * Every prop in the Panda catalog defaults to **banned** on JSX. Whitelisting
 * is explicit and additive — this is what gives the policy its teeth.
 *
 * Resolution precedence (when deciding if a prop is allowed on JSX):
 *
 * 1. `props[name] === true` → allow
 * 2. any `tokens[T] === true` for that prop's token list → allow
 * 3. else `default ?? false` → deny
 *
 * The default configuration only allows composition levers
 * (`textStyle`, `layerStyle`, `colorPalette`). Everything else must live in a
 * recipe, layerStyle, or textStyle.
 *
 * @packageDocumentation
 */

import type { JsxUtilityControlsOverride } from "../types.js";
import type { PandaCatalog } from "./catalog.js";

/**
 * Resolved controls used at lint time.
 *
 * All keys are populated (the catalog drives the union). The `composition`
 * sub-object decides whether composition-derived props (e.g. paint slots
 * exposed via `layerStyle`) leak through to JSX.
 */
export interface JsxUtilityControls {
  readonly default: boolean;
  readonly tokens: Readonly<Record<string, boolean>>;
  readonly props: Readonly<Record<string, boolean>>;
  readonly composition: {
    readonly textStyleProperties: boolean;
    readonly layerStylePaint: boolean;
  };
}

/**
 * Build a controls object from a catalog + caller overrides.
 *
 * Every token category and every catalog key starts `false`. The caller can
 * then flip individual entries to `true`.
 */
export function buildControls(
  catalog: PandaCatalog,
  overrides: JsxUtilityControlsOverride = {},
): JsxUtilityControls {
  const tokens: Record<string, boolean> = Object.fromEntries(
    catalog.tokenCategories.map((t) => [t, false]),
  );
  const props: Record<string, boolean> = Object.fromEntries(
    [...catalog.utility.keys(), ...catalog.aliases.keys()].map((k) => [k, false]),
  );

  if (overrides.tokens) Object.assign(tokens, overrides.tokens);
  if (overrides.props) Object.assign(props, overrides.props);

  return {
    default: overrides.default ?? false,
    tokens,
    props,
    composition: {
      textStyleProperties: overrides.composition?.textStyleProperties ?? true,
      layerStylePaint: overrides.composition?.layerStylePaint ?? true,
    },
  };
}

/**
 * Default controls: composition levers only.
 *
 * Style in recipes / textStyles / layerStyles — not raw JSX utility props.
 */
export const DEFAULT_CONTROLS: JsxUtilityControlsOverride = {
  props: {
    textStyle: true,
    layerStyle: true,
    colorPalette: true,
  },
};

/**
 * Predicate: is this prop allowed given the resolved controls + its token list?
 */
export function isAllowed(
  name: string,
  tokenList: ReadonlyArray<string>,
  controls: JsxUtilityControls,
): boolean {
  if (controls.props[name] === true) return true;
  return tokenList.some((t) => controls.tokens[t] === true) || controls.default === true;
}
