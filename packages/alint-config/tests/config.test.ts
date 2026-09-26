import { describe, expect, it } from "bun:test";

import fullSnackLab, { javascriptFiles, recommended } from "../src/index.ts";

describe("recommended", () => {
  it("is exposed as a shareable plugin preset", () => {
    expect(fullSnackLab.configs?.recommended).toBe(recommended);
  });

  it("enables alint's JavaScript preset for source files", () => {
    const javascript = recommended.find(
      (entry) => !Array.isArray(entry) && entry.name?.endsWith("/javascript"),
    );

    expect(javascript).toBeDefined();
    expect(javascript?.files).toEqual(javascriptFiles);
    expect(javascript?.extends).toContain("js/recommended");
    expect(javascript?.plugins).toHaveProperty("js");
  });

  it("uses Git ignores and excludes generated or high-noise inputs", () => {
    const ignores = recommended.find(
      (entry) => !Array.isArray(entry) && entry.name?.endsWith("/ignores"),
    );
    const gitignore = recommended.find(
      (entry) => !Array.isArray(entry) && entry.name?.endsWith("/gitignore"),
    );

    expect(ignores?.ignores).toContain("**/node_modules/**");
    expect(ignores?.ignores).toContain("**/tests/fixtures/**");
    expect(ignores?.ignores).toContain("**/*.d.ts");
    expect(gitignore?.ignore?.gitignore).toBe(true);
  });
});
