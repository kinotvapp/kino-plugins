# El protocolo entre plugins en una página { #protocol-quick }

Lo mínimo que una IA (o una persona) necesita para escribir un **proveedor** y un **consumidor** del protocolo entre plugins
(apiVersion 20, Kino 0.9.81, aún no está en ningún Kino publicado). Cada línea apunta a la página larga, [El protocolo entre
plugins](protocol.md), para el resto.

## Empieza con las plantillas { #start }

```sh
node sdk/init.mjs mi-proveedor --kind provider --door recipes --call byId
node sdk/init.mjs mi-consumidor --kind consumer --door recipes --call byId --repo tu-usuario/kino-plugin-recipes   # escribe "hosts": []
```

Copia junto a cada plugin `sdk/` **sin `sdk/test/`** y `contract.json` (los dos obligatorios; `kino.d.ts` es opcional, solo para
los tipos del editor). El `test/provider` del consumidor es un **reemplazo**: cámbialo por una copia del proveedor real
([Probar sin conexión](protocol.md#kit)).

## Proveedor { #provider }

```json
{ "id": "recipes", "name": "Recetas", "version": "0.1.0", "apiVersion": 20, "entry": "plugin.js",
  "description": "Recetas para otros plugins", "hosts": [],
  "provides": { "recipes": { "summary": "Recetas con sus ingredientes",
    "calls": { "byId": { "in": { "id": "number" }, "out": "Recipe" } },
    "streams": { "latest": { "out": "Recipe", "everySeconds": 300 } },
    "types": { "Recipe": { "id": "number", "title": "string", "imageUrl": "string?" } } } } }
```

```js
export async function proto_recipes_byId({ id }) { /* devuelve una Recipe, o lanza un error: el consumidor recibe provider_failed */ }
export async function proto_recipes_latest(cursor) { return { items: [/* Recipes nuevas */], cursor: 0 /* JSON pequeño */ }; }
```

Sin capacidades ni ajustes es un plugin **que solo provee** (`hosts` `[]`, o los hosts reales que lee su `kino.fetch`). Nombres:
`^[A-Za-z][A-Za-z0-9]{0,31}$`. Tipos: `string`, `number`, `boolean`, `T?`, `T[]`, un tipo de la puerta, un objeto en línea
([tipos](protocol.md#types)). Prueba: `node sdk/run.mjs . proto recipes.byId '{"id":1}'`, `node sdk/run.mjs . proto
recipes.latest` (salida 0 la respuesta, 1 `✗ <código>`, 2 comando mal escrito).

## Consumidor { #consumer }

```json
{ "id": "recipe-picker", "name": "Recetario", "version": "0.1.0", "apiVersion": 20, "entry": "plugin.js",
  "description": "Elige una receta del plugin Recetas", "hosts": [],
  "capabilities": ["screen"], "screen": { "label": "Recetario", "labelEn": "Recipes" },
  "recommends": ["tu-usuario/kino-plugin-recipes"],
  "consumes": { "recipes": { "repo": "tu-usuario/kino-plugin-recipes", "door": "recipes", "calls": ["byId"], "streams": ["latest"] } } }
```

`"hosts": []`: un **consumidor solo de pantalla** (un `consumes` no vacío, `capabilities` exactamente `["screen"]`) no declara
hosts, y una `Image` no necesita declararse. Agrega un host real solo si el `kino.fetch` propio de la pantalla llega a él
(cualquier otra capacidad trae de vuelta "al menos un host"); nunca `example.com` ni un nombre inventado ([los `hosts` del
consumidor](protocol.md#consumer-hosts)).

La pantalla mínima (puerta de instalación, una sola barra compacta con una salida real, una llamada, una frase de error con una
por defecto):

```js
const REPO = "tu-usuario/kino-plugin-recipes"; // igual que en "recommends"
const t = (es, en, more = {}) => ({ type: "Text", text: es, textEn: en, ...more });
const page = (kids) => ({ type: "Scaffold",
  appBar: { type: "AppBar", title: "Recetario", titleEn: "Recipes", mergeWithKinoBar: true, dense: true,
    leading: { type: "IconButton", icon: "close", labelText: "Cerrar", labelTextEn: "Close", onPressed: { close: true } } },
  body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: kids }] } });
const ERR = { provider_missing: ["Recetas está apagado: revísalo en Plugins.", "Recipes is off: check it in Plugins."] };
const OTHER = ["No se pudo traer la receta.", "Could not get the recipe."]; // la frase por defecto para cualquier otro código

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
  if (installed[REPO] !== true) return null; // la puerta de instalación; `open` también
  if (name !== "next") return null;
  try {
    const r = await kino.plugins.call("recipes", "byId", { id: (state.n || 0) + 1 });
    return { state: { title: r.title, n: (state.n || 0) + 1, error: null } };
  } catch (e) { return { state: { error: e.code || "provider_failed", n: 0 } }; }
}
```

Pruébala (`I='{"installed":{"tu-usuario/kino-plugin-recipes":true}}'`; una corrida limpia no imprime líneas `dropped`):

```sh
node sdk/validate.mjs .                                                  # sin ✗; lee cada !
node sdk/run.mjs --context "$I" --provider ../mi-proveedor . screen      # también --lang en, --device tv, y sin --context (la puerta)
node sdk/run.mjs --context "$I" --provider ../mi-proveedor . screenEvent next
node sdk/run.mjs --context "$I" --state '{"error":"timeout"}' . screen    # cada código se dibuja desde el estado
```

Más: [una caja de búsqueda, una ruta de detalle, `open`, códigos inesperados y `focus`](protocol.md#consumer-recipes),
[flujos](protocol.md#streams), [errores](protocol.md#errors), [el kit](protocol.md#kit).

## Las cinco trampas { #traps }

1. `SingleChildScrollView` lleva `children` (una lista): con `child` el scroll sale vacío y **ninguna** línea `dropped` te avisa.
2. `appBar` tiene que ser `{ "type": "AppBar", … }`: sin `type` se descarta la barra entera.
3. No existe `FilledButton`: usa `ElevatedButton`/`TextButton` con `labelText` + `labelTextEn` y `onPressed`; y un `Text` con
   `text: ""` se descarta.
4. Sin `--context '{"installed":{…:true}}'` el kit dibuja la puerta de instalación y un `screenEvent` con puerta no responde
   nada; sin `--provider` toda llamada es `provider_missing`.
5. El valor de `run.mjs screenEvent` es la tercera palabra y es JSON: `screenEvent search "" '"tomate"'`, nunca `tomate`.
