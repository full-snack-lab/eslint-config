/**
 * Ambient type declarations for modules that ship without their own `.d.ts`.
 *
 * Kept minimal — we only declare the surface we actually consume.
 */

declare module "@pandacss/eslint-plugin" {
  import type { Linter } from "eslint";
  interface PandaRules {
    [ruleName: string]: Linter.RuleEntry;
  }
  const plugin: {
    configs: {
      recommended: { rules: PandaRules };
      unopinionated: { rules: PandaRules };
      all: { rules: PandaRules };
      "flat/recommended": Linter.Config[];
      "flat/all": Linter.Config[];
    };
    rules: PandaRules;
  };
  export default plugin;
}
