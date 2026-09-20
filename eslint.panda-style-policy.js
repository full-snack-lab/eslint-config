import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { jsxUtilityPropPolicy } from "./eslint.panda-jsx-props.js";

const PATTERNS_DIR = path.resolve(process.cwd(), "styled-system/dist/patterns");

/**
 * Pattern function names from generated `export declare const stack: …`.
 */
function loadPatternFnNames() {
  const names = [];
  for (const file of readdirSync(PATTERNS_DIR)) {
    if (file === "index.d.ts" || !file.endsWith(".d.ts")) continue;
    const source = readFileSync(path.resolve(PATTERNS_DIR, file), "utf8");
    const match = source.match(/export declare const (\w+):/);
    if (match) names.push(match[1]);
  }
  return names;
}

const PATTERN_FN_CALLS = loadPatternFnNames().join("|");

const NO_RAW_CSS =
  "Raw CSS is banned. Use Panda style props / textStyle / layerStyle / colorPalette / recipes — not css(), inline styles, or <style>.";

const NO_PATTERN_FN =
  "Pattern functions are banned. Use the JSX pattern component (e.g. <Stack>) from @design-system/styled-system/jsx — not stack().";

/**
 * Close escape hatches around raw CSS authoring.
 * Applied on js/ts/tsx/astro.
 */
export const noRawCssPolicy = [
  {
    selector: "ImportSpecifier[imported.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "ImportDefaultSpecifier[local.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "ImportNamespaceSpecifier[local.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.object.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "TaggedTemplateExpression[tag.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: "TaggedTemplateExpression[tag.object.name='css']",
    message: NO_RAW_CSS,
  },
  {
    selector: String.raw`ImportDeclaration[source.value=/styled-system\/css$|\/css$|@emotion\/|styled-components|goober|linaria|@vanilla-extract\/|stitches|@stitches\/|aphrodite|jss|@mui\/styled|styled-jsx/]`,
    message: NO_RAW_CSS,
  },
  {
    selector: "JSXAttribute[name.name='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "Property[key.name='style'][value.type='ObjectExpression']",
    message: NO_RAW_CSS,
  },
  {
    selector: "Property[key.value='style'][value.type='ObjectExpression']",
    message: NO_RAW_CSS,
  },
  {
    selector: "JSXOpeningElement[name.name=/^style$/i]",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.value='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.name='createElement'][arguments.0.value='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "VariableDeclarator[id.name='styles'][init.type='TemplateLiteral']",
    message: NO_RAW_CSS,
  },
  {
    selector: "VariableDeclarator[id.name='styles'][init.type='Literal']",
    message: NO_RAW_CSS,
  },
  {
    selector: "AssignmentExpression[left.name='styles'][right.type='TemplateLiteral']",
    message: NO_RAW_CSS,
  },
  {
    selector: "AssignmentExpression[left.name='styles'][right.type='Literal']",
    message: NO_RAW_CSS,
  },
  {
    selector: "Property[key.name='styles'][value.type='TemplateLiteral']",
    message: NO_RAW_CSS,
  },
  {
    selector: "Property[key.name='styles'][value.type='Literal']",
    message: NO_RAW_CSS,
  },
  {
    selector: "Property[key.value='styles'][value.type='TemplateLiteral']",
    message: NO_RAW_CSS,
  },
  {
    selector: "AssignmentExpression[left.property.name='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "AssignmentExpression[left.object.property.name='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.property.name='setProperty']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.property.name='insertRule']",
    message: NO_RAW_CSS,
  },
  {
    selector: "CallExpression[callee.property.name='addRule']",
    message: NO_RAW_CSS,
  },
  {
    selector: "NewExpression[callee.name='CSSStyleSheet']",
    message: NO_RAW_CSS,
  },
  {
    selector: "MemberExpression[object.name='document'][property.name='adoptedStyleSheets']",
    message: NO_RAW_CSS,
  },
];

/**
 * Ban Panda pattern *functions* (stack(), flex(), …).
 * JSX from `/jsx` remains allowed (<Stack />, <Flex />, …).
 */
export const noPatternFnPolicy = [
  {
    selector: String.raw`ImportDeclaration[source.value=/styled-system\/patterns(\/|$)/]`,
    message: NO_PATTERN_FN,
  },
  {
    selector: `CallExpression[callee.name=/${PATTERN_FN_CALLS}/]`,
    message: NO_PATTERN_FN,
  },
  {
    selector: `CallExpression[callee.object.name=/${PATTERN_FN_CALLS}/]`,
    message: NO_PATTERN_FN,
  },
];

/**
 * Box ban + UtilityValues JSX prop controls (see eslint.panda-jsx-props.js).
 */
export const pandaStylePolicy = [
  {
    selector: `ImportSpecifier[imported.name='Box']`,
    message: "Do not import Box. Use layout patterns (Stack, Flex, …) or a semantic component.",
  },
  {
    selector: `JSXOpeningElement[name.name='Box']`,
    message: "Do not use <Box>. Use layout patterns (Stack, Flex, …) or a semantic component.",
  },
  ...jsxUtilityPropPolicy,
];

/**
 * Ban dotted flat keys in textStyles / layerStyles / tokens / semanticTokens definitions.
 * Bad:  "display.card.photo": { value: … }
 * Good: display: { card: { photo: { value: … } } }
 */
export const noDottedStyleNamePolicy = [
  {
    selector: String.raw`Property[key.type=Literal][key.value=/\./]`,
    message:
      "No dots in textStyle/layerStyle/tokens/semanticTokens keys. Nest the path instead (display: { card: { photo: { value: … } } }).",
  },
];

/**
 * @deprecated Use noRawCssPolicy — kept so old imports don't break mid-edit.
 */
export const astroNoCssPolicy = noRawCssPolicy;

export {
  jsxUtilityControls,
  jsxUtilityPropPolicy,
  buildJsxUtilityPropPolicy,
  resolveJsxUtilityBans,
} from "./eslint.panda-jsx-props.js";
