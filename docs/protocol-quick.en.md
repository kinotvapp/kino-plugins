# The plugin protocol on one page { #protocol-quick }

The minimum an AI (or a person) needs to write a **provider** and a **consumer** of the plugin protocol (apiVersion 20, Kino
0.9.81, not in any released Kino). Every line points to the long page, [The plugin protocol](protocol.md), for the rest.

## Start from the scaffolds { #start }

```sh
node sdk/init.mjs my-provider --kind provider --door recipes --call byId
node sdk/init.mjs my-consumer --kind consumer --door recipes --call byId --repo owner/kino-plugin-recipes --host <a real host>
```

Copy next to each plugin `sdk/` **without `sdk/test/`** and `contract.json` (both required; `kino.d.ts` is optional, only for
editor typings). The consumer's `test/provider` is a **stand-in**: replace it with a copy of the real provider
([Testing offline](protocol.md#kit)).

## Provider { #provider }

```json
{ "id": "recipes", "name": "Recetas", "version": "0.1.0", "apiVersion": 20, "entry": "plugin.js",
  "description": "Recetas para otros plugins", "hosts": [],
  "provides": { "recipes": { "summary": "Recetas con sus ingredientes",
    "calls": { "byId": { "in": { "id": "number" }, "out": "Recipe" } },
    "streams": { "latest": { "out": "Recipe", "everySeconds": 300 } },
    "types": { "Recipe": { "id": "number", "title": "string", "imageUrl": "string?" } } } } }
```

```js
export async function proto_recipes_byId({ id }) { /* return a Recipe, or throw: the consumer gets provider_failed */ }
export async function proto_recipes_latest(cursor) { return { items: [/* new Recipes */], cursor: 0 /* small JSON */ }; }
```

No capabilities and no settings make it **provides-only** (`hosts` `[]`, or the real hosts its `kino.fetch` reads). Names:
`^[A-Za-z][A-Za-z0-9]{0,31}$`. Types: `string`, `number`, `boolean`, `T?`, `T[]`, a door type, an inline object
([types](protocol.md#types)). Test: `node sdk/run.mjs . proto recipes.byId '{"id":1}'`, `node sdk/run.mjs . proto
recipes.latest` (exit 0 answer, 1 `✗ <code>`, 2 bad command).

## Consumer { #consumer }

```json
{ "id": "recipe-picker", "name": "Recetario", "version": "0.1.0", "apiVersion": 20, "entry": "plugin.js",
  "description": "Elige una receta del plugin Recetas", "hosts": ["<the host your screen really loads from>"],
  "capabilities": ["screen"], "screen": { "label": "Recetario", "labelEn": "Recipes" },
  "recommends": ["owner/kino-plugin-recipes"],
  "consumes": { "recipes": { "repo": "owner/kino-plugin-recipes", "door": "recipes", "calls": ["byId"], "streams": ["latest"] } } }
```

`hosts` needs one real entry even if you draw no picture (an `Image` itself needs no declaration); never `example.com` or a
made-up name: if the screen shows only text read [a consumer that shows only text](protocol.md#text-only-consumer).

The minimal screen (install gate, one compact bar with a real exit, a call, an error sentence with a default):

```js
const REPO = "owner/kino-plugin-recipes"; // exactly as in "recommends"
const t = (es, en, more = {}) => ({ type: "Text", text: es, textEn: en, ...more });
const page = (kids) => ({ type: "Scaffold",
  appBar: { type: "AppBar", title: "Recetario", titleEn: "Recipes", mergeWithKinoBar: true, dense: true,
    leading: { type: "IconButton", icon: "close", labelText: "Cerrar", labelTextEn: "Close", onPressed: { close: true } } },
  body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: kids }] } });
const ERR = { provider_missing: ["Recetas está apagado: revísalo en Plugins.", "Recipes is off: check it in Plugins."] };
const OTHER = ["No se pudo traer la receta.", "Could not get the recipe."]; // the default for any other code

export async function screen({ state = {}, installed = {} }) {
  if (installed[REPO] !== true) return page([t("Necesitas el plugin Recetas.", "You need the Recipes plugin."),
    { type: "ElevatedButton", key: "install", labelText: "Instalar", labelTextEn: "Install",
      onPressed: { go: { installPlugin: { repo: REPO } } }, autofocus: true }]);
  const kids = [];
  if (state.title) kids.push(t(state.title, state.title, { style: "h3" }));
  if (state.error) kids.push(t(...(ERR[state.error] || OTHER), { color: "error" }));
  kids.push({ type: "ElevatedButton", key: "next", labelText: "Otra receta", labelTextEn: "Another recipe", onPressed: "next", autofocus: true });
  return page(kids);
}

export async function screenEvent({ name, state = {}, installed = {} }) {
  if (installed[REPO] !== true) return null; // the gate; `open` too
  if (name !== "next") return null;
  try {
    const r = await kino.plugins.call("recipes", "byId", { id: (state.n || 0) + 1 });
    return { state: { title: r.title, n: (state.n || 0) + 1, error: null } };
  } catch (e) { return { state: { error: e.code || "provider_failed", n: 0 } }; }
}
```

Test it (`I='{"installed":{"owner/kino-plugin-recipes":true}}'`; a clean run prints no `dropped` line):

```sh
node sdk/validate.mjs .                                                  # no ✗; read every !
node sdk/run.mjs --context "$I" --provider ../my-provider . screen       # also --lang en, --device tv, and without --context (the gate)
node sdk/run.mjs --context "$I" --provider ../my-provider . screenEvent next
node sdk/run.mjs --context "$I" --state '{"error":"timeout"}' . screen    # every code is drawn from the state
```

More: a [search box, a detail route, `open`, unknown codes and `focus`](protocol.md#consumer-recipes), [streams](protocol.md#streams),
[errors](protocol.md#errors), [the kit](protocol.md#kit).

## The five traps { #traps }

1. `SingleChildScrollView` takes `children` (a list): with `child` the scroll is empty and **no** `dropped` line warns you.
2. `appBar` must be `{ "type": "AppBar", … }`: without `type` the whole bar is dropped.
3. There is no `FilledButton`: use `ElevatedButton`/`TextButton` with `labelText` + `labelTextEn` and `onPressed`; and a
   `Text` with `text: ""` is dropped.
4. Without `--context '{"installed":{…:true}}'` the kit draws the install gate and a gated `screenEvent` answers nothing;
   without `--provider` every call is `provider_missing`.
5. A `run.mjs screenEvent` value is the third word and JSON: `screenEvent search "" '"tomate"'`, never `tomate`.
