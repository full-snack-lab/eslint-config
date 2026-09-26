/**
 * Public type surface for `@fullsnacklab/eslint-config`.
 *
 * Kept intentionally narrow: most consumers only need {@link CreateConfigOptions}.
 * Preset authors can reach for the lower-level types in `./panda`.
 *
 * @packageDocumentation
 */

import type { Linter } from "eslint";

/**
 * A single entry accepted by `no-restricted-syntax`.
 *
 * ESLint accepts either a string selector (legacy) or an object form with
 * `selector` + `message`. All policies in this package emit the object form so
 * the consumer gets actionable messages.
 */
export interface NoRestrictedSyntaxEntry {
  readonly selector: string;
  readonly message: string;
}

/**
 * The union shape we use for any policy list that ends up in
 * `no-restricted-syntax`.
 */
export type Policy = NoRestrictedSyntaxEntry;

/**
 * Optional knobs accepted by {@link import("./create-config.js").createConfig}.
 */
export interface CreateConfigOptions {
  /**
   * Extra globs to add to the global ignore list.
   *
   * The defaults already cover `dist`, `node_modules`, `.astro`, `styled-system`,
   * and similar. Add monorepo build artefacts, `.turbo`, etc. here.
   */
  readonly ignores?: ReadonlyArray<string>;

  /**
   * Panda-specific configuration. Leave undefined on non-Panda projects —
   * the Panda preset will simply be skipped.
   */
  readonly panda?: PandaConfigOptions;

  /**
   * Set to `false` to omit the Astro preset (e.g. pure Node libs, React SPAs).
   * Auto-disabled when `eslint-plugin-astro` is not installed.
   *
   * @default true
   */
  readonly astro?: boolean;
}

/**
 * Options for the Panda CSS preset.
 */
export interface PandaConfigOptions {
  /**
   * Override where the generated Panda artefacts live.
   *
   * All keys are resolved relative to `process.cwd()` unless absolute.
   *
   * @default
   * ```ts
   * { typesRoot: "./styled-system/dist/types",
   *   tokensRoot: "./styled-system/dist/tokens",
   *   patternsRoot: "./styled-system/dist/patterns",
   *   compositionRoot: "./styled-system/dist/types" }
   * ```
   */
  readonly paths?: Partial<PandaPaths>;

  /**
   * Override the JSX utility whitelist. The default only allows the composition
   * levers (`textStyle`, `layerStyle`, `colorPalette`) — everything else must
   * live in a recipe.
   *
   * Passed straight through to {@link import("./panda/controls.js").buildControls}.
   */
  readonly jsxUtilityControls?: JsxUtilityControlsOverride;
}

/**
 * Resolved absolute paths to the generated Panda artefacts.
 */
export interface PandaPaths {
  /** Directory containing `prop-type.d.ts`, `style-props.d.ts`, `composition.d.ts`. */
  readonly typesRoot: string;
  /** Directory containing `tokens.d.ts`. */
  readonly tokensRoot: string;
  /** Directory containing per-pattern `.d.ts` files. */
  readonly patternsRoot: string;
  /** Convenience alias to `typesRoot`. Kept separate so consumers can split later. */
  readonly compositionRoot: string;
}

/**
 * Shape passed to {@link import("./panda/controls.js").buildControls} to
 * tweak the JSX utility whitelist.
 */
export interface JsxUtilityControlsOverride {
  readonly default?: boolean;
  readonly tokens?: Readonly<Record<string, boolean>>;
  readonly props?: Readonly<Record<string, boolean>>;
  readonly composition?: {
    readonly textStyleProperties?: boolean;
    readonly layerStylePaint?: boolean;
  };
}

/**
 * Single flat-config entry.
 *
 * Typed against ESLint's own `Linter.Config` so consumers only need the
 * `eslint` peer dependency — no extra `@eslint/config-helpers` import.
 */
export type EslintConfig = Linter.Config;
