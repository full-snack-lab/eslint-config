# The Panda policy

How the dynamic JSX utility ban works, how it's derived from your project,
and how to extend it.

## The premise

Panda exposes every token category as a JSX prop by default:

```jsx
<Box background="red.500" paddingX="md" marginTop="s" />
```

That's a lot of surface to police by hand. Our policy is the opposite:
**everything is banned by default, you whitelist what you actually use**.

The default whitelist is the smallest useful one:

```ts
{
  props: {
    textStyle: true,
    layerStyle: true,
    colorPalette: true,
  },
  composition: {
    textStyleProperties: true, // ban text-style property leaks
    layerStylePaint: true,     // ban layer-style paint leaks
  },
}
```

Everything else (`background`, `paddingX`, `marginTop`, `gap`, …) is banned.
If you find yourself reaching for one of them on JSX, the right answer is
almost always a recipe or a layerStyle.

## How the ban list is built

```
styled-system/dist/types/prop-type.d.ts
  └── export interface UtilityValues {
        background: Tokens["colors"];
        paddingX: Tokens["spacing"] | Tokens["sizes"];
        marginTop: Tokens["spacing"];
        …
      }

styled-system/dist/types/style-props.d.ts
  └── (prop aliases, e.g. `mx` → `marginX`)

styled-system/dist/tokens/tokens.d.ts
  └── export type TokenCategory = "colors" | "spacing" | "sizes" | "radii" | …

styled-system/dist/types/composition.d.ts
  └── type TextStyleProperty = "color" | "fontSize" | …;
      type LayerStyleProperty = "background" | "color" | "borderColor" | …;

styled-system/dist/patterns/*.d.ts
  └── export declare const stack: …;
      export declare const flex: …;
      …
```

The catalog parser in `panda/catalog.ts` extracts these with regex and
returns a typed `PandaCatalog`. From there:

1. `buildControls(catalog, overrides)` produces a fully-populated
   `JsxUtilityControls` — every prop and token starts `false`.
2. `resolveJsxUtilityBans(catalog, controls)` walks the catalog and marks
   every prop as banned (or allowed, per the controls).
3. `buildJsxUtilityPropPolicy(catalog, controls, paths)` converts the ban
   list into esquery selectors (with composition-derived additions).
4. `buildCombinedNoCssOrPatternFnPolicy(paths)` adds the static raw-CSS /
   pattern-fn policies.

The result is a single `no-restricted-syntax` array with three selector
shapes:

```js
[
  {
    selector: "JSXOpeningElement:not([name.name=/svg|path|…/]) > JSXAttribute[name.name=/^(bg|padding|margin|…)$/]",
    message: "JSX utility prop not whitelisted. Use textStyle / layerStyle / colorPalette, or move styles into a recipe.",
  },
  {
    selector: "JSXAttribute ObjectExpression > Property[key.name=/^(bg|padding|…)$/]",
    message: "…",
  },
  {
    selector: "CallExpression[callee.name=/^(cva|sva)$/] Property[key.name=/^(bg|padding|…)$/]",
    message: "…",
  },
]
```

The three shapes cover the three places a JSX prop can land:

1. `<Box bg="red.500" />` — `JSXOpeningElement`
2. `<Box {...{ bg: "red.500" }} />` — `JSXAttribute ObjectExpression`
3. `cva({ base: { bg: "red.500" } })` — `CallExpression` (recipe definitions)

SVG elements are exempted in the first selector — `<svg viewBox="…">` and
`<path fill="…">` carry real paint attributes, not Panda props.

## Why composition-derived bans?

`textStyle` and `layerStyle` are composition levers. They're allowed on JSX
because they refer to **named entities** defined elsewhere in the Panda
config:

```jsx
<Heading textStyle="display.card.title" />
<Card layerStyle="surface.primary" />
```

But Panda also derives property aliases from these. A `layerStyle` named
`"primary"` might paint `background`, `color`, and `borderColor`. If we
allowed `background: "red.500"` on JSX as a leak, consumers would bypass
the layerStyle abstraction entirely.

The composition-derived bans close that hole by banning
`LayerStyleProperty`'s paint members (anything matching
`/^(background|color|fill|stroke)/i`, `/Color$/`, or `/Shadow$/`).

Toggle the bans off if you want raw properties to remain available:

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      composition: {
        textStyleProperties: false,
        layerStylePaint: false,
      },
    },
  },
});
```

## Pattern functions vs. pattern components

Panda ships two ways to use a layout pattern:

```jsx
// Pattern function — banned
import { stack } from "@styled-system/patterns";
const styles = stack({ direction: "column" });

// Pattern component — allowed
import { Stack } from "@styled-system/jsx";
<Stack direction="column">…</Stack>
```

The component form is preferred because it composes with everything else
in the JSX tree and is tree-shakeable. The function form is banned at:

- `ImportDeclaration[source.value=/styled-system/patterns(/|$)/]`
- `CallExpression[callee.name=/^(stack|flex|grid|hstack|vstack|…)$/]`
- `CallExpression[callee.object.name=/^(stack|flex|…)$/]`

The pattern function names are loaded from
`styled-system/dist/patterns/*.d.ts` at lint time, so the policy
auto-tracks your Panda version.

## Raw-CSS coverage

`noRawCssPolicy` bans:

| Surface | Selector |
| --- | --- |
| `css()` tagged template | `TaggedTemplateExpression[tag.name='css']` |
| `css()` call | `CallExpression[callee.name='css']` |
| `css` import | `ImportSpecifier[imported.name='css']` |
| Inline `style` prop | `JSXAttribute[name.name='style']` |
| `styles` variable | `VariableDeclarator[id.name='styles']` |
| Popular CSS-in-JS imports | `@emotion/*`, `styled-components`, `goober`, `linaria`, `@vanilla-extract/*`, `stitches`, `@stitches/*`, `aphrodite`, `jss`, `@mui/styled`, `styled-jsx` |
| `setAttribute("style")` | `CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']` |
| `setProperty` | `CallExpression[callee.property.name='setProperty']` |
| `insertRule` / `addRule` | `CallExpression[callee.property.name='insertRule']` |
| `CSSStyleSheet` constructor | `NewExpression[callee.name='CSSStyleSheet']` |
| `document.adoptedStyleSheets` | `MemberExpression[object.name='document'][property.name='adoptedStyleSheets']` |
| `style={{ … }}` object prop | `Property[key.name='style'][value.type='ObjectExpression']` |
| `styles={…}` template | `Property[key.name='styles'][value.type='TemplateLiteral']` |

If you find a new raw-CSS surface, add a selector to `style-policy.ts` and
open a PR — every consumer benefits.

## Adding a JSX utility prop to the default whitelist

Some packages/projects always want e.g. `gap` and `padding` on JSX. To make
that the **default** for everyone (not just your project):

1. Add the key to `props: { … }` in `DEFAULT_CONTROLS` in
   `panda/controls.ts`.
2. Bump the package version.
3. Open a PR.

For project-local additions, use the consumer override:

```js
export default await createConfig({
  panda: {
    jsxUtilityControls: {
      props: { gap: true, padding: true },
    },
  },
});
```

---

## Debugging the ban list

If a selector fires on something you think should be allowed, the error
message names the selector. To see the full resolved selectors:

```js
import {
  resolvePandaPaths,
  loadCatalog,
  buildControls,
  DEFAULT_CONTROLS,
  buildJsxUtilityPropPolicy,
} from "@fullsnacklab/eslint-config/panda";
import { writeFileSync } from "node:fs";

const paths = resolvePandaPaths();
const catalog = loadCatalog(paths);
const controls = buildControls(catalog, DEFAULT_CONTROLS);
const policy = buildJsxUtilityPropPolicy(catalog, controls, paths);

writeFileSync("eslint-policy.json", JSON.stringify(policy, null, 2));
```

Inspect `eslint-policy.json` — each entry has a `selector` and a `message`.
