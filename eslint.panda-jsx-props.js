import { readFileSync } from "node:fs";
import { type Preset } from '@pandacss/dev'
import path from "node:path";

const PROP_TYPE = path.resolve(
  process.cwd(),
  "node_modules/@pandacss/types/dist/prop-type.d.ts",
);
const STYLE_PROPS = path.resolve(
  process.cwd(),
  "styled-system/dist/types/style-props.d.ts",
);
const COMPOSITION = path.resolve(
  process.cwd(),
  "node_modules/@pandacss/types/dist/composition.d.ts",
);
const TOKENS = path.resolve(
  process.cwd(),
  "styled-system/dist/tokens/tokens.d.ts",
);

/**
 * Catalog from generated `UtilityValues` + `TokenCategory` + style-prop aliases.
 */
function loadCatalog() {
  const propType = readFileSync(PROP_TYPE, "utf8");
  const block = propType.match(
    /export interface UtilityValues \{([\s\S]*?)\n\}/,
  );
  const utility = new Map();
  if (block) {
    const rows = block[1].matchAll(/^\t(\w+): (.+);$/gm);
    for (const match of rows) {
      const tokens = Iterator.from(match[2].matchAll(/Tokens\["(\w+)"\]/g))
        .map((m) => m[1])
        .toArray();
      utility.set(match[1], [...new Set(tokens)]);
    }
  }

  const styleProps = readFileSync(STYLE_PROPS, "utf8");
  const aliases = new Map();
  const aliasRows = styleProps.matchAll(
    /^(\w+)\?: ConditionalValue<(?:WithEscapeHatch<)?UtilityValues\["(\w+)"\]/gm,
  );
  for (const match of aliasRows) {
    const [alias, target] = [match[1], match[2]];
    if (alias === target || !utility.has(target)) continue;
    aliases.set(alias, utility.get(target));
  }

  const tokensSource = readFileSync(TOKENS, "utf8");
  const tokenCategories = Iterator.from(
    (
      tokensSource.match(/export type TokenCategory = ([^;]+)/)?.[1] ?? ""
    ).matchAll(/"(\w+)"/g),
  )
    .map((m) => m[1])
    .toArray();

  return { utility, aliases, tokenCategories };
}

const catalog = loadCatalog();

/**
 * Whitelist control surface.
 *
 * Every UtilityValues key + TokenCategory starts `false` (banned on JSX).
 * Set a key to `true` to allow it on JSX.
 *
 * Precedence: props[name] === true → allow;
 * else any tokens[T] === true for that prop → allow;
 * else default (false).
 *
 * Style in recipes / textStyles / layerStyles — not raw JSX utility props.
 * Allowed on JSX: textStyle, layerStyle, colorPalette.
 */
function buildControls(overrides = {}) {
  const tokens = Object.fromEntries(
    catalog.tokenCategories.map((t) => [t, false]),
  );
  const props = Object.fromEntries(
    [...catalog.utility.keys(), ...catalog.aliases.keys()].map((k) => [
      k,
      false,
    ]),
  );

  Object.assign(tokens, overrides.tokens);
  Object.assign(props, overrides.props);

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
Whitelist: composition levers only. Everything else → recipes / layerStyles.
*/
export const jsxUtilityControls = buildControls({
  props: {
    textStyle: true,
    layerStyle: true,
    colorPalette: true,
  },
});

function parseUnionLiterals(source, typeName) {
  const match = source.match(
    new RegExp(
      String.raw`type ${typeName}\s*=([\s\S]*?)(?:\nexport type |\ntype [A-Z]|\n\/\*$)`,
    ),
  );
  if (!match) return [];
  return Iterator.from(match[1].matchAll(/\| '([^']+)'/g))
    .map((m) => m[1])
    .toArray();
}

function isPaintProp(prop) {
  return (
    /^(background|color|fill|stroke)/i.test(prop) ||
    /Color$/i.test(prop) ||
    /Shadow$/i.test(prop)
  );
}

function isAllowed(name, tokenList, controls) {
  if (
    controls.props[name] === true ||
    tokenList.some((t) => controls.tokens[t] === true)
  )
    return true;
  return controls.default === true;
}

/**
 * Resolve ban list — everything in the catalog that isn't whitelisted.
 */
export function resolveJsxUtilityBans(controls = jsxUtilityControls) {
  const { utility, aliases, tokenCategories } = catalog;
  const decided = new Set([...utility.keys(), ...aliases.keys()]);
  const banned = new Map();

  const entries = [...utility.entries(), ...aliases.entries()];
  for (const [name, tokenList] of entries) {
    if (isAllowed(name, tokenList, controls)) continue;
    banned.set(name, { tokens: tokenList });
  }

  for (const [alias, target] of [
    ["bgGradient", "backgroundGradient"],
    ["bgLinear", "backgroundLinear"],
  ]) {
    decided.add(alias);
    if (banned.has(alias) || utility.has(target) === false) continue;
    const tokenList = utility.get(target);
    if (
      isAllowed(alias, tokenList, controls) ||
      isAllowed(target, tokenList, controls)
    )
      continue;
    banned.set(alias, { tokens: tokenList });
  }

  if (
    controls.composition?.textStyleProperties ||
    controls.composition?.layerStylePaint
  ) {
    const composition = readFileSync(COMPOSITION, "utf8");
    if (controls.composition.textStyleProperties) {
      for (const prop of parseUnionLiterals(composition, "TextStyleProperty")) {
        if (
          decided.has(prop) ||
          banned.has(prop) ||
          controls.props[prop] === true
        )
          continue;
        banned.set(prop, { tokens: [] });
      }
    }
    if (controls.composition.layerStylePaint) {
      const paintProps = parseUnionLiterals(
        composition,
        "LayerStyleProperty",
      ).filter((prop) => isPaintProp(prop));
      for (const prop of paintProps) {
        if (
          decided.has(prop) ||
          banned.has(prop) ||
          controls.props[prop] === true
        )
          continue;
        banned.set(prop, { tokens: ["colors"] });
      }
    }
  }

  return {
    banned,
    utilityKeys: Iterator.from(utility.keys()).toArray(),
    tokenCategories,
    controls,
  };
}

const SVG_TAGS =
  "svg|path|circle|line|polyline|polygon|g|rect|defs|clipPath|use|text|tspan";

/**
 * Build `no-restricted-syntax` for non-whitelisted JSX utility props.
 */
export function buildJsxUtilityPropPolicy(controls = jsxUtilityControls) {
  const { banned } = resolveJsxUtilityBans(controls);
  if (banned.size === 0) return [];

  const names = Iterator.from(banned.keys()).toArray();
  const re = names
    .map((n) => n.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
    .join("|");
  const message =
    "JSX utility prop not whitelisted. Use textStyle / layerStyle / colorPalette, or move styles into a recipe.";

  return [
    {
      selector: `JSXOpeningElement:not([name.name=/${SVG_TAGS}/]) > JSXAttribute[name.name=/^(${re})$/]`,
      message,
    },
    {
      selector: `JSXAttribute ObjectExpression > Property[key.name=/^(${re})$/]`,
      message,
    },
    {
      selector: `CallExpression[callee.name=/^(cva|sva)$/] Property[key.name=/^(${re})$/]`,
      message,
    },
  ];
}

export const jsxUtilityPropPolicy = buildJsxUtilityPropPolicy();

export { catalog, buildControls };
