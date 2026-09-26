import { defineConfig } from "@alint-js/cli";
import fullSnackLab from "@fullsnacklab/alint-config";

export default defineConfig([
  {
    extends: ["fullsnacklab/recommended"],
    plugins: {
      fullsnacklab: fullSnackLab,
    },
  },
]);
