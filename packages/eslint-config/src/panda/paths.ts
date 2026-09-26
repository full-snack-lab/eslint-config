/**
 * Resolve the filesystem paths to Panda's generated `.d.ts` artefacts.
 *
 * Earlier inline configs often hard-coded paths relative to `process.cwd()`.
 * This module lifts that into a typed, overridable surface so the same
 * package can be consumed by monorepos, multi-app workspaces, and projects
 * that colocate `styled-system` somewhere unusual.
 *
 * @packageDocumentation
 */

import path from "node:path";
import type { PandaPaths } from "../types.js";

/**
 * Default locations — relative to `process.cwd()` to match Panda's stock
 * output convention (`styled-system/dist/...`).
 */
const DEFAULTS = {
  typesRoot: "./styled-system/dist/types",
  tokensRoot: "./styled-system/dist/tokens",
  patternsRoot: "./styled-system/dist/patterns",
  compositionRoot: "./styled-system/dist/types",
} as const satisfies Record<keyof PandaPaths, string>;

/**
 * Resolve all Panda artefact paths to absolute paths.
 *
 * Accepts either relative (resolved against `process.cwd()`) or absolute paths.
 * Unspecified keys fall back to the defaults.
 *
 * @example
 * ```ts
 * const paths = resolvePandaPaths({ typesRoot: "./build/styled-system/types" });
 * // → { typesRoot: "/abs/.../build/styled-system/types", … }
 * ```
 */
export function resolvePandaPaths(
  overrides: Partial<PandaPaths> = {},
  cwd: string = process.cwd(),
): PandaPaths {
  const merge = (key: keyof PandaPaths): string => {
    const value = overrides[key] ?? DEFAULTS[key];
    return path.isAbsolute(value) ? value : path.resolve(cwd, value);
  };

  return {
    typesRoot: merge("typesRoot"),
    tokensRoot: merge("tokensRoot"),
    patternsRoot: merge("patternsRoot"),
    compositionRoot: merge("compositionRoot"),
  };
}
