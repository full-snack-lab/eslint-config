import jsPlugin from "@alint-js/plugin-js";
import {
  defineConfig,
  ignorePatternsAIAgents,
  ignorePatternsCommon,
} from "@alint-js/cli";
import { definePlugin } from "@alint-js/plugin";

export const javascriptFiles = [
  "**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
] as const;

/**
 * Full Snack Lab's baseline model-backed review policy.
 *
 * Rules are warnings while the tool and prompts mature. Provider selection is
 * deliberately absent: each developer or CI environment owns its model setup.
 */
export const recommended = defineConfig([
  {
    name: "@fullsnacklab/alint-config/ignores",
    ignores: [
      ...ignorePatternsCommon,
      ...ignorePatternsAIAgents,
      "**/.firecrawl/**",
      "**/tests/fixtures/**",
      "**/*.d.ts",
    ],
  },
  {
    name: "@fullsnacklab/alint-config/gitignore",
    ignore: {
      gitignore: true,
    },
  },
  {
    name: "@fullsnacklab/alint-config/javascript",
    extends: ["js/recommended"],
    files: javascriptFiles,
    plugins: {
      js: jsPlugin,
    },
  },
]);

export default definePlugin({
  configs: {
    recommended,
  },
});
