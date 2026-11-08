# Compartir: a Kino Social y con tarjetas { #share }

Cualquier plugin puede ofrecerle a la persona un botón **Compartir**. Esta página tiene dos partes:

- **[Compartir en Kino Social hoy](#social)** (Kino 0.9.81 o más nuevo, con Kino Social 0.9.7 o posterior): tu plugin le
  propone a Kino Social una publicación (un texto y, si quieres, el título que la persona está viendo) por la puerta `wall`
  del [protocolo entre plugins](protocol.md). Kino Social la guarda como **borrador**; la persona la revisa y la publica allá.
  **Nada se publica sin la persona.**
- **[Tarjetas para compartir](#cards)** (Kino 0.9.84, todavía sin publicar): las piezas para que un plugin abra el
  contenido de otro plugin desde una tarjeta: [`go.plugin`](#go-plugin), [`openFrom.routes`](#open-from),
  [`ctx.caller`](#ctx-caller) y [`kino.image.thumbnail`](#thumbnail).

Mira a Megaplay ([xuper-plugin/kino-plugin-megaplay](https://github.com/xuper-plugin/kino-plugin-megaplay), su
`src/browse/share.js`) como el ejemplo publicado: comparte desde la página de un título y desde la barra.

!!! tip "No lo confundas con la respuesta `share`"
    La respuesta `share` de una pantalla (apiVersion 17) abre la hoja de compartir del propio aparato. Esta página trata de
    otra cosa: mandarle algo a Kino Social o abrir el contenido de otro plugin.

## Compartir en Kino Social hoy { #social }

!!! note "Kino 0.9.81 o más nuevo, con Kino Social 0.9.7 o posterior"
    La puerta `wall` llega en Kino Social 0.9.7 ([kinotvapp/kino-social](https://github.com/kinotvapp/kino-social)). Va dentro
    de su `enhancements["20"]`, así que solo Kino 0.9.81 o más nuevo la abre. Tu plugin la usa como consumidor del
    [protocolo entre plugins](protocol.md) (`apiVersion` 20, o `consumes` dentro de `enhancements["20"]`).

**Qué pasa cuando tu plugin comparte:**

1. La persona aprieta **Compartir** en tu pantalla, escribe (o deja) un texto y envía.
2. Tu plugin llama a `kino.plugins.call("social", "share", { … })`.
3. Kino Social **no publica nada**: guarda la propuesta como borrador en el aparato y responde
   `{ status: "draft", draftId, pending }`.
4. La campanita de Kino avisa («Megaplay quiere publicar en tu muro») y el muro de Kino Social muestra el borrador arriba,
   con **Revisar** y **Descartar**. Revisar abre el editor de Kino Social ya lleno (con el póster del título, si lo
   mandaste); la persona aprieta **Publicar** ella misma, o lo descarta.

### El manifiesto { #social-manifest }

```json
"consumes": { "social": { "repo": "kinotvapp/kino-social", "door": "wall", "calls": ["share"] } },
"recommends": ["kinotvapp/kino-social"]
```

- `social` es tu alias local, el primer argumento de `kino.plugins.call`.
- `recommends` nombra el mismo repositorio: así `screen` y `screenEvent` reciben `installed["kinotvapp/kino-social"]` y sabes
  si ofrecer instalarlo.
- Con `"apiVersion": 20`, los dos van en el nivel principal. Si tu plugin se queda en un `apiVersion` más bajo para seguir
  instalándose en Kinos anteriores, `consumes` va dentro de `enhancements["20"]` y la función se esconde con
  `typeof kino.plugins === "object"`. Megaplay, por ejemplo, se queda en `apiVersion` 9, declara su pantalla en
  `enhancements["14"]` y su `consumes` en `enhancements["20"]` (junto con `"capabilities": ["screen"]`).
- Compartir no necesita ningún host: lo que mandas llega a Kino Social por Kino, no por la red.

### La llamada `share` { #share-call }

```js
const r = await kino.plugins.call("social", "share", {
  text: "Estoy viendo «Frieren»",                                   // opcional, hasta 500 caracteres
  title: { kind: "series", tmdb: 209867, season: 1, episode: 3 },   // opcional: una película o serie por su id de TMDB
  link: "https://example.com/pagina",                               // opcional, solo https
  from: "Mi plugin",                                                // opcional: el nombre de tu plugin
});
// r = { status: "draft", draftId: "…", pending: 1 }
```

| Campo | Tipo | Qué hace Kino Social |
| --- | --- | --- |
| `text` | `string?` | El texto propuesto. Quita los caracteres de control, junta las líneas en blanco de más y lo corta en 500 caracteres (el límite de su editor) |
| `title` | `{ kind, tmdb, season?, episode? }?` | El título que se adjunta. `kind` es `"movie"` o `"series"`; `tmdb` un id de TMDB entero y positivo. `season` y `episode` (enteros positivos, los dos) solo cuentan en una serie. Al revisar, Kino Social trae el nombre, el año y el póster de TMDB |
| `link` | `string?` | Un enlace `https` (máximo 500 caracteres, sin usuario ni contraseña). Va al final del texto al revisar |
| `from` | `string?` | Tu nombre, máximo 40 caracteres. Sale en el aviso («Mi plugin quiere publicar en tu muro») |

- **Al menos uno** de `text`, `title` o `link`. Compartir **solo texto** es válido: no mandes `title` (Megaplay lo hace
  desde su barra, o cuando la persona apaga «Adjuntar el título»).
- Kino revisa los tipos contra la puerta: un campo de más, o un tipo equivocado (`tmdb: "209867"`), es `bad_input`. Kino
  Social revisa el sentido: una propuesta vacía, un `kind` que no es `movie` ni `series`, o un enlace que no es https la
  rechaza, y a ti te llega `provider_failed`.
- **La respuesta:** `status` es `"draft"`, `draftId` el id del borrador y `pending` cuántos borradores esperan (como mucho 5:
  el más viejo se va). La misma propuesta dos veces (texto, título y enlace iguales) deja un solo borrador. Los borradores de
  más de 14 días se borran.
- `from` es tu propia palabra: Kino Social 0.9.7 no sabe qué plugin llama y muestra lo que mandes. Pon el nombre real de tu
  plugin.

### Errores y qué hacer { #share-errors }

| Qué pasa | Qué hacer |
| --- | --- |
| `typeof kino.plugins !== "object"` (Kino anterior a 0.9.81) | No llames: un aviso «Actualiza Kino para compartir en Kino Social» |
| `provider_missing` y `installed["kinotvapp/kino-social"]` no es `true` | Kino Social no está instalado: responde `go: { installPlugin: { repo: "kinotvapp/kino-social" } }` para que Kino abra su hoja de instalación (la persona decide) |
| `provider_missing` con `installed[…] === true` | Kino Social está apagado o le falta configurarse: díselo con una frase (un `go.installPlugin` de un plugin ya instalado solo muestra «Ese plugin ya está instalado») |
| `not_declared` | Tu `consumes` no declara `share`, o el Kino Social instalado es anterior a 0.9.7 y no tiene la puerta `wall`: pídele que actualice Kino Social |
| `bad_input` | Un error de tu código: un campo de más o un tipo equivocado |
| `provider_failed` | Kino Social rechazó la propuesta (vacía, título o enlace inválidos) o falló: «No se pudo enviar a Kino Social. Inténtalo de nuevo.» |
| `rate_limited`, `timeout` | Ofrece intentarlo otra vez; nunca reintentes en bucle |

Ten siempre una frase por defecto para un código que no esperabas. La lista completa de códigos está en
[Errores](protocol.md#errors).

### Reglas { #share-rules }

- **Solo desde una pulsación de la persona.** Comparte cuando la persona apretó Compartir y envió; nunca desde `open`, un
  temporizador, un `job` (ahí `kino.plugins.call` responde `not_allowed`) ni por tu cuenta.
- **Nunca publiques en nombre de la persona.** La puerta solo deja un borrador; no le digas a la persona que ya se publicó.
  Dile que la espera en Kino Social para revisarla.
- **Deja que la persona vea y cambie el texto** antes de enviarlo, y que quite el título si no lo quiere compartir.
- **Nada privado.** Lo que mandas le llega a Kino Social: ni tokens, ni datos de ajustes, ni lo que la persona escribió en un
  campo privado.
- **Textos en español y en inglés**, como todo lo que lee la persona.

### Un ejemplo completo y mínimo { #share-example }

Una pantalla con un botón **Compartir** (en la barra, solo texto; y en el contenido, con el título), una hoja con el texto y
un interruptor «Adjuntar el título», y el envío. Es la forma de Megaplay, simplificada.

```json
{
  "id": "mi-plugin",
  "name": "Mi plugin",
  "version": "1.0.0",
  "apiVersion": 20,
  "entry": "plugin.js",
  "hosts": [],
  "capabilities": ["screen"],
  "screen": { "label": "Mi plugin", "labelEn": "My plugin" },
  "recommends": ["kinotvapp/kino-social"],
  "consumes": { "social": { "repo": "kinotvapp/kino-social", "door": "wall", "calls": ["share"] } }
}
```

```js
const SOCIAL = "kinotvapp/kino-social";   // tal como está en "recommends"
const SHEET = "shareSheet";
const TITLE = { kind: "series", tmdb: 209867, name: "Frieren" };   // el título que muestra esta página

const en = () => String(kino.lang || "").startsWith("en");
const say = (es, english) => ({ toast: es, toastEn: english });

function shareSheet(share) {
  return {
    type: "BottomSheet", key: SHEET, title: "Compartir en Kino Social", titleEn: "Share on Kino Social",
    children: [{ type: "Form", key: "shareForm", onSubmitted: { event: "sendShare", timeoutMs: 15000 }, gap: 12, children: [
      { type: "TextField", key: "shareText", multiline: true, maxLines: 6, maxLength: 500,
        labelText: "Qué quieres contar", labelTextEn: "What do you want to say" },
      ...(share ? [{ type: "Switch", key: "shareTitle", value: true, labelText: "Adjuntar el título", labelTextEn: "Attach the title" }] : []),
      { type: "Text", style: "caption", color: "muted",
        text: "Llega a Kino Social como borrador: allá lo revisas y lo publicas.",
        textEn: "It reaches Kino Social as a draft: you review and post it there." },
      { type: "ElevatedButton", key: "shareSend", icon: "send", submit: true,
        labelText: "Enviar a Kino Social", labelTextEn: "Send to Kino Social" },
    ] }],
  };
}

export async function screen({ state = {} }) {
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar", title: "Mi plugin", titleEn: "My plugin", mergeWithKinoBar: true, dense: true,
      leading: { type: "IconButton", icon: "close", labelText: "Cerrar", labelTextEn: "Close", onPressed: { close: true } },
      actions: [{ type: "IconButton", key: "shareBar", icon: "share", labelText: "Compartir", labelTextEn: "Share",
        onPressed: { event: "openShare", arg: "" } }],                       // desde la barra: solo texto
    },
    body: { type: "SingleChildScrollView", children: [{ type: "Column", padding: 16, gap: 12, children: [
      { type: "Text", text: TITLE.name, textEn: TITLE.name, style: "h3" },
      { type: "ElevatedButton", key: "share", icon: "share", labelText: "Compartir", labelTextEn: "Share", autofocus: true,
        onPressed: { event: "openShare", arg: "title" } },                    // desde el título: con el título
      shareSheet(state.share || null),
    ] }] },
  };
}

export async function screenEvent({ name, arg, value, state = {}, installed = {} }) {
  if (name === "openShare") {
    const share = arg === "title" ? TITLE : null;
    const text = share ? (en() ? `I'm watching "${share.name}"` : `Estoy viendo «${share.name}»`) : "";
    return { state: { share, inputs: { shareText: text, shareTitle: !!share } }, ui: [{ open: SHEET }] };
  }
  if (name === "sendShare") {
    // Los campos del formulario llegan en value; state.inputs también los tiene.
    const v = { ...(state.inputs || {}), ...(value && typeof value === "object" ? value : {}) };
    return sendShare(v, state.share || null, installed);
  }
  return null;
}

async function sendShare(v, share, installed) {
  const text = String(v.shareText || "").trim().slice(0, 500);
  const withTitle = !!share && v.shareTitle !== false;
  if (!text && !withTitle) return say("Escribe algo o adjunta el título.", "Write something or attach the title.");
  if (typeof kino.plugins !== "object") return say("Actualiza Kino para compartir en Kino Social.", "Update Kino to share on Kino Social.");
  const arg = { from: "Mi plugin" };
  if (text) arg.text = text;
  if (withTitle) arg.title = { kind: share.kind, tmdb: share.tmdb };
  try {
    await kino.plugins.call("social", "share", arg);
    return { ui: [{ close: SHEET }], state: { share: null },
      ...say("Listo: tienes el borrador en Kino Social para revisarlo y publicarlo.", "Done: the draft waits in Kino Social for you to review and post.") };
  } catch (e) {
    const code = e && e.code;
    if (code === "provider_missing" && installed[SOCIAL] !== true) {
      return { ui: [{ close: SHEET }], go: { installPlugin: { repo: SOCIAL } },
        ...say("Instala Kino Social para compartir.", "Install Kino Social to share.") };
    }
    if (code === "provider_missing") return say("Kino Social está apagado o le falta configurarse: revísalo en Plugins.", "Kino Social is off or needs setting up: check it in Plugins.");
    if (code === "not_declared") return say("Actualiza Kino Social para compartir.", "Update Kino Social to share.");
    return say("No se pudo enviar a Kino Social. Inténtalo de nuevo.", "Could not send to Kino Social. Try again.");
  }
}
```

- La hoja es una [ventana declarada](screen-forms.md#popup): vive en el árbol con su `key` y la abre la respuesta
  (`ui: [{ open }]`), así nunca muestra el texto de la vez anterior.
- El `go.installPlugin` sale de la respuesta a un envío de la persona, que es justo de donde puede salir
  ([`go.installPlugin`](screen-forms.md#go-install-plugin)).
- Para probarlo con el kit sin Kino Social:
  `node sdk/run.mjs --state '{"inputs":{"shareText":"hola"}}' . screenEvent sendShare --trigger submit`. Sin `--provider`,
  toda llamada es `provider_missing` y `installed` está en `false`, así que ves el camino de instalación. Megaplay prueba su
  `share.js` con un `kino.plugins.call` de mentira en `test/share.test.mjs`.

## Tarjetas para compartir { #cards }

!!! note "Disponible desde Kino 0.9.84"
    Todavía sin publicar: esto llega con Kino 0.9.84. No hay `apiVersion` nuevo: `go.plugin` y `openFrom` son de
    `apiVersion` 20 y un Kino anterior los descarta o los ignora; `ctx` y `kino.image` simplemente no existen en un Kino
    anterior (revisa antes de usarlos). Cada número está en `contract.json` (`manifest.openFrom`, `manifest.screen.goPlugin`,
    `protocol.ctx`, `kinoImage`).

Un plugin que muestra contenido de otros plugins (un muro de títulos compartidos, un feed, una lista) puede llevar una
tarjeta pequeña por elemento y dejar que la persona la abra en el plugin del que vino, sin saber cómo ese plugin arma sus
páginas. Cuatro piezas encajan:

- **Quien envía** (el plugin dueño del contenido) pone su propia dirección en la tarjeta: su `repo`, una `route` y unos
  `args` que tienen sentido para él, y una `query` (casi siempre el título) por si nada más sirve.
- **Quien muestra las tarjetas** dibuja un botón con [`go.plugin`](#go-plugin).
- **El plugin de destino** dice en su manifiesto qué rutas de su pantalla se pueden abrir desde afuera:
  [`openFrom.routes`](#open-from).
- Un **proveedor** del protocolo sabe quién lo llama con [`ctx.caller`](#ctx-caller), y quien recibe la dirección de una
  imagen la achica con [`kino.image.thumbnail`](#thumbnail).

**Kino Social mostrará estas tarjetas en una versión posterior.** Hasta entonces, un plugin que quiere compartir usa la
llamada [`share`](#social) de arriba. Lo que sí puedes hacer desde ya es declarar `openFrom.routes`, para que las tarjetas
puedan abrir tu contenido cuando lleguen.

### `go.plugin`: abrir el contenido de otro plugin { #go-plugin }

Desde `apiVersion` 20 (Kino 0.9.84): un botón de tu pantalla que abre la pantalla de otro plugin, o su búsqueda, a partir de
su repositorio de GitHub.

```js
{ type: "ElevatedButton", labelText: "Ver en Mi anime", labelTextEn: "Open in Mi anime", onPressed: { go: { plugin: {
  repo: "tu-usuario/kino-plugin-anime", route: "detail", args: { id: "frieren" }, query: "Frieren" } } } }
```

| Campo | Reglas |
| --- | --- |
| `repo` | Obligatorio. Un `owner/name` de GitHub, con una subcarpeta opcional (`owner/name/plugins/x`), máximo 200 caracteres. Una URL (cualquier cosa con `://`) o un `@ref` descartan el `go`, con registro |
| `route` | Opcional. Una ruta como la de [`go.screen`](screen-forms.md#go-screen) (máximo 64 caracteres) |
| `args` | Opcional. Un objeto JSON, con el mismo tope que los `args` de `go.screen` (4.096 bytes) |
| `query` | Opcional. Un texto de máximo 200 caracteres para la búsqueda de respaldo |

Cualquier otro campo descarta el `go`, con registro. Solo sale de la **pulsación o el envío de la propia persona en tu
pantalla** (un toque, un envío, la respuesta a uno, el botón de una ventana): desde `open`, un temporizador, un cambio, un
«cargar más», el `onClose` de una ventana, un panel o un aviso se descarta, con registro. Por debajo de `apiVersion` 20
también.

**Qué hace Kino cuando la persona aprieta el botón, en este orden:**

1. El plugin **no está instalado**: Kino muestra su hoja de instalación (la misma de `go.installPlugin`) y, cuando la persona
   lo instala, sigue con los pasos de abajo.
2. El plugin es **+18** y el contenido para adultos está bloqueado: no se abre nada y Kino muestra su propio aviso de
   contenido +18 bloqueado.
3. El plugin está **apagado**: Kino pregunta «¿Activar?» y, si la persona acepta, sigue.
4. `route` está en el `openFrom.routes` del plugin: se abre esa pantalla con `args`.
5. Si no, y mandaste una `query` y el plugin tiene búsqueda: se abre la búsqueda de Kino solo en ese plugin, con esa `query`.
6. Si no (sin `query`, o sin búsqueda): Kino abre la sección del plugin, o la página por defecto de su pantalla.
7. Si no se puede nada de eso: Kino muestra un aviso.

Una ruta que el destino no lista nunca se abre (pasa el paso 5 o el 6), y la tarjeta no puede llegar a ninguna otra de sus
pantallas.

### `openFrom.routes`: qué se puede abrir de tu plugin { #open-from }

```json
"openFrom": { "routes": ["detail"] }
```

- `apiVersion` 20 y la capacidad `screen` (contando la de `enhancements`). Con `"apiVersion": 20` va en el nivel principal;
  con un `apiVersion` más bajo, dentro de `enhancements["20"]` (un Kino anterior lo ignora sin rechazar el plugin). En el
  nivel principal por debajo de 20 se rechaza: `The "openFrom" block needs apiVersion 20`.
- De 1 a 16 nombres distintos, cada uno de 1 a 64 letras, dígitos o `. _ ~ -` (los mismos nombres que acepta la `route` de
  `go.screen`). Una lista mala rechaza el manifiesto con un mensaje que nombra `openFrom.routes`.
- **Dice qué se puede abrir, no cómo.** Tú decides después, en tu pantalla, cómo llega cada ruta a su contenido. Así una
  tarjeta vieja sigue funcionando aunque cambies cómo están armadas tus páginas.

**Cómo lee la ruta el plugin de destino.** Se abre tu pantalla en esa ruta: `screen({ route })` recibe `route.name` (la
ruta) y `route.args` (los `args` de la tarjeta), y el evento reservado `open` llega con la misma `route`, así que cargas ahí
lo que nombran los `args`:

```js
export async function screenEvent({ name, route }) {
  if (name === "open" && route && route.name === "detail") {
    const id = route.args && typeof route.args.id === "string" ? route.args.id : null;
    if (!id) return null;                                   // args de otro plugin: revísalos siempre
    const detail = await loadDetail(id);                    // tu propio cargador
    return { state: { detail } };
  }
  return null;
}
```

Los `args` vienen de la tarjeta, es decir, de otro plugin: trátalos como datos de afuera. Revisa el tipo, el largo y que
nombren algo tuyo, y ten una vista para un id que ya no existe.

### `ctx.caller`: quién llama a tu puerta { #ctx-caller }

Desde Kino 0.9.84, cada exportación `proto_` de un [proveedor](protocol.md#exports) recibe un segundo argumento, `ctx`, que
llena Kino y que el consumidor no puede mandar ni cambiar. `ctx.caller` es el plugin que llama:

| Campo | Qué es |
| --- | --- |
| `id` | El id del plugin que llama |
| `repo` | La dirección desde la que se instaló, tal como la guarda Kino: `owner/name`, con `/ruta` para un plugin en una subcarpeta y `@ref` para una rama o etiqueta fija (`owner/name/dir@v2`); `null` si vino de una URL de manifiesto o de un archivo |
| `name` | Su nombre visible |
| `adult` | Si es +18 (la misma prueba que el candado +18) |

```js
export async function proto_wall_share(arg, ctx) {
  const caller = ctx && ctx.caller;   // un Kino anterior a 0.9.84 no manda ctx
  // caller = { id: "mi-juego", repo: "yo/mi-juego", name: "Mi juego", adult: false }
  return { ok: true, from: caller ? caller.name : null };
}
```

- Trata `repo` como una clave opaca, o compara solo su parte `owner/name`.
- **Antes de usar `repo` en un `go.plugin`, quítale el `@ref`**: `go.plugin` descarta un `repo` con `@ref`.
  `repo.split("@")[0]` deja `owner/name` o `owner/name/ruta`.
- Un proveedor que solo declara `(arg)` sigue funcionando: JavaScript ignora el argumento de más.
- En el kit, `node sdk/run.mjs --repo yo/mi-juego <carpeta del proveedor> proto <puerta>.<llamada>` prueba un proveedor como
  ese plugin. El kit pasa el mismo `ctx`: el `id` y el `name` del manifiesto de la carpeta del consumidor, `repo` de
  `--repo <owner/name>` o del origin de git de esa carpeta (si no, `null`) y `adult` según sus `categories`.

### `kino.image.thumbnail`: una imagen pequeña a partir de una dirección { #thumbnail }

```js
let thumb = null;
if (typeof kino.image === "object") {          // Kino 0.9.84+
  try { thumb = await kino.image.thumbnail(card.image, { maxWidth: 200, maxBytes: 16384 }); }
  catch (e) { /* not_image, too_large, network...: muestra la tarjeta sin imagen */ }
}
// thumb es "data:image/jpeg;base64,…" (o null): tan pequeña que cabe dentro de un mensaje.
```

Quien envía manda solo la dirección de una imagen; el plugin que la recibe le pide a Kino una miniatura y la recibe como una
dirección `data:`. El JavaScript de un plugin no puede decodificar y volver a codificar una imagen (una librería para eso deja
sin memoria a una caja de TV de 1 GB), así que Kino lo hace por su cuenta: descarga la imagen, la lee con muestreo (nunca el
mapa de bits completo), la achica (nunca la agranda) hasta `maxWidth` y escribe un JPEG con calidad 85, 75, 65, 55 y luego
45 hasta que cabe en `maxBytes`. Una imagen transparente queda sobre blanco.

| | Reglas |
| --- | --- |
| `url` | Una dirección `https` (máximo 2.048 caracteres). Cualquier otra cosa es `bad_request` |
| `maxWidth` | Un entero de 32 a 400; 200 por defecto |
| `maxBytes` | Un entero de 2.048 a 32.768; 16.384 por defecto |
| La respuesta | Un texto `"data:image/jpeg;base64,…"` |
| La descarga | Sigue **las reglas de red de tu plugin**, las mismas de `kino.fetch`: tus `hosts` (o `fetchHosts: "any"` aprobado por la persona), solo https, nunca la red de la casa, y tu cupo de peticiones (en un trabajo programado, cada llamada es una de sus peticiones). Máximo 5 MB |
| Ritmo | Máximo 20 llamadas por minuto por plugin |
| Dónde | Toda exportación que puede usar los servicios de Kino (como `kino.tmdb`), incluidas la llamada `proto_*` de un proveedor y un trabajo programado; nunca `sign()` |

**Errores** (`e.code`): `bad_request` (no es https, o las opciones están fuera de rango), `host_not_allowed`, `not_found`
(404/410), `network`, `timeout` (la descarga), `too_large` (la descarga pasa de 5 MB, o la imagen no cabe en `maxBytes`),
`not_image` (no es un JPEG, PNG, WebP o GIF que Android lea), `rate_limited`, `not_allowed` (desde `sign()`). Muestra la
tarjeta sin imagen en cualquiera de ellos.

Sin `apiVersion` nuevo: revisa `typeof kino.image === "object"`. La telemetría de Kino solo cuenta llamadas por resultado,
nunca una dirección. En el kit de Node no hay códec de imágenes: `kino.image.thumbnail` descarga con tus reglas y responde los
bytes **solo si ya son** un JPEG (o PNG) dentro de `maxWidth` y `maxBytes`; si no, lanza `kit_unsupported` con un aviso de que
la app sí lo hace. Con `KINO_THUMBNAIL_FIXTURE=<archivo>` responde ese archivo como miniatura, para probar sin conexión.
