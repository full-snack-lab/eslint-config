/**
 * Smoke tests for the public surface.
 *
 * Uses Bun's built-in test runner. These aren't exhaustive — they guard
 * against the most embarrassing regressions (catalog parser drift, missing
 * exports, broken selector emission).
 *
 * Run with `bun test`.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createConfig } from "../src/create-config.ts";
import { loadCatalog } from "../src/panda/catalog.ts";
import { resolvePandaPaths } from "../src/panda/paths.ts";
import {
  buildControls,
  DEFAULT_CONTROLS,
} from "../src/panda/controls.ts";
import { buildJsxUtilityPropPolicy } from "../src/panda/jsx-props.ts";
import { escapeForSelectorRegex } from "../src/lib/regex.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Checked-in Panda-shaped fixture — no sibling app required. */
const FIXTURE_ROOT = path.resolve(HERE, "fixtures");

describe("regex helpers", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeForSelectorRegex("foo.bar")).toBe("foo\\.bar");
    expect(escapeForSelectorRegex("a+b")).toBe("a\\+b");
    expect(escapeForSelectorRegex("safe_name")).toBe("safe_name");
  });
});

describe("createConfig", () => {
  it("returns a flat-config array without a Panda catalog", async () => {
    const config = await createConfig({ astro: false });
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
    expect(config[0]).toHaveProperty("ignores");
  });

  it("includes Astro recommended when the peer plugin is installed", async () => {
    const config = await createConfig();
    const files = config.flatMap((entry) => {
      const value = entry.files;
      if (typeof value === "string") return [value];
      if (Array.isArray(value)) return value.map(String);
      return [];
    });
    expect(files.some((pattern) => pattern.includes("astro"))).toBe(true);
  });
});

describe("catalog", () => {
  it("loads the catalog from the fixture styled-system", () => {
    const paths = resolvePandaPaths({}, FIXTURE_ROOT);
    const catalog = loadCatalog(paths);
    expect(catalog.utility.size).toBeGreaterThan(10);
    expect(catalog.tokenCategories).toContain("colors");
    expect(catalog.tokenCategories).toContain("spacing");
  });
});

describe("controls", () => {
  it("defaults everything to false", () => {
    const paths = resolvePandaPaths({}, FIXTURE_ROOT);
    const catalog = loadCatalog(paths);
    const controls = buildControls(catalog, DEFAULT_CONTROLS);
    expect(controls.props.textStyle).toBe(true);
    expect(controls.props.layerStyle).toBe(true);
    expect(controls.props.colorPalette).toBe(true);
    expect(controls.props.background).toBe(false);
    expect(controls.tokens.colors).toBe(false);
  });
});

describe("jsx-prop policy", () => {
  it("emits at least one selector for non-whitelisted utility props", () => {
    const paths = resolvePandaPaths({}, FIXTURE_ROOT);
    const catalog = loadCatalog(paths);
    const controls = buildControls(catalog, DEFAULT_CONTROLS);
    const policy = buildJsxUtilityPropPolicy(catalog, controls, paths);
    expect(policy.length).toBeGreaterThan(0);
    expect(policy[0]).toHaveProperty("selector");
    expect(policy[0]).toHaveProperty("message");
  });

  it("respects whitelist overrides", () => {
    const paths = resolvePandaPaths({}, FIXTURE_ROOT);
    const catalog = loadCatalog(paths);
    const controls = buildControls(catalog, {
      props: { background: true },
    });
    const policy = buildJsxUtilityPropPolicy(catalog, controls, paths);
    const re = policy[0]?.selector.match(/\^\(([^)]+)\)/)?.[1] ?? "";
    const names = re.split("|");
    expect(names).not.toContain("background");
  });
});
