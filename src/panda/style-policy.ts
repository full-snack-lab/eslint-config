/**
 * Static Panda policies: ban raw CSS, pattern function calls, `<Box>`, and
 * dotted flat keys in `textStyles` / `layerStyles` definitions.
 *
 * These policies are **catalog-free** — they don't depend on the generated
 * type files and can be composed into any flat config.
 *
 * @packageDocumentation
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { NoRestrictedSyntaxEntry, PandaPaths } from "../types.js";

const NO_RAW_CSS =
  "Raw CSS is banned. Use Panda style props / textStyle / layerStyle / colorPalette / recipes — not css(), inline styles, or <style>.";

const NO_PATTERN_FN =
  "Pattern functions are banned. Use the JSX pattern component (e.g. <Stack>) from /styled-system/jsx — not stack().";

/**
 * Discover the names of Panda pattern functions from the generated
 * `styled-system/dist/patterns/*.d.ts` files.
 *
 * Each file declares:
 * ```ts
 * export declare const stack: …;
 * ```
 *
 * and we lift the identifier out.
 */
function loadPatternFnNames(patternsRoot: string): string[] {
  const names: string[] = [];
  for (const file of readdirSync(patternsRoot)) {
    if (file === "index.d.ts" || !file.endsWith(".d.ts")) continue;
    const source = readFileSync(path.resolve(patternsRoot, file), "utf8");
    const match = source.match(/export declare const (\w+):/);
    if (match) names.push(match[1]!);
  }
  return names;
}

/**
 * Build the `noPatternFnPolicy` selectors. Pattern function names are loaded
 * from the generated pattern `.d.ts` files so the policy stays in sync with
 * the consumer's Panda version.
 */
export function buildNoPatternFnPolicy(patternsRoot: string): NoRestrictedSyntaxEntry[] {
  const PATTERN_FN_CALLS = loadPatternFnNames(patternsRoot).join("|");
  if (PATTERN_FN_CALLS.length === 0) return [];

  return [
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
}

/**
 * Policy: ban all known raw-CSS authoring surfaces.
 *
 * Covers every common route (template literals, style attributes, popular CSS-in-JS
 * libraries, shadow-DOM painting APIs).
 *
 * Static — does not depend on the catalog.
 */
export const noRawCssPolicy: NoRestrictedSyntaxEntry[] = [
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
    selector:
      "CallExpression[callee.property.name='createElement'][arguments.0.value='style']",
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
    selector:
      "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
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
 * Combined "no raw CSS + no pattern functions" policy list.
 *
 * Most consumers want both; expose a one-call helper so they don't have to
 * remember to spread both arrays.
 */
export function buildCombinedNoCssOrPatternFnPolicy(
  paths: PandaPaths,
): NoRestrictedSyntaxEntry[] {
  return [...noRawCssPolicy, ...buildNoPatternFnPolicy(paths.patternsRoot)];
}

/**
 * Box ban + JSX utility ban (the dynamic policy).
 *
 * Pass `jsxUtilityPropPolicy` (from {@link buildJsxUtilityPropPolicy}) to
 * splice in the catalog-driven bans.
 */
export function buildPandaStylePolicy(
  jsxUtilityPropPolicy: NoRestrictedSyntaxEntry[],
): NoRestrictedSyntaxEntry[] {
  return [
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
}

/**
 * Ban dotted flat keys inside `textStyles` / `layerStyles` definitions.
 *
 * Bad:
 * ```ts
 * textStyles: {
 *   "display.card.photo": { value: { … } }
 * }
 * ```
 *
 * Good:
 * ```ts
 * textStyles: {
 *   display: { card: { photo: { value: { … } } } }
 * }
 * ```
 */
export const noDottedStyleNamePolicy: NoRestrictedSyntaxEntry[] = [
  {
    selector: String.raw`Property[key.type=Literal][key.value=/\./]`,
    message:
      "No dots in textStyle/layerStyle keys. Nest the path instead (display: { card: { photo: { value: … } } }).",
  },
];

/**
 * @deprecated Use `noRawCssPolicy` directly. Retained for backwards
 * compatibility with earlier inline configs during migration.
 */
export const astroNoCssPolicy: NoRestrictedSyntaxEntry[] = noRawCssPolicy;
