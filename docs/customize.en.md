# Customize your plugin

Everything a plugin can change in how Kino shows it, in one place, each with a short example and the
page that has the full rules. Most of it is new in `"apiVersion": 6` (Kino 0.9.50): declare 6 only if
you use one of those, because Kino 0.9.49 and older refuse an apiVersion 6 plugin.

## At a glance { #overview }

| What | Where the person sees it | How | apiVersion | Rules |
| --- | --- | --- | --- | --- |
| Name, description, author | the consent sheet and every card of your plugin | `name`, `description`, `author` | 1 | [The manifest](manifest.md) |
| Icon | your plugin's cards (Ajustes ▸ Plugins, Recomendados, "De la comunidad") | `icon`: a square `.png`, at most 128 KB | 1 | [The manifest](manifest.md) |
| Accent color | your plugin's tab and chips, your name over your search results | `color`: `#RRGGBB` | 1 | [The manifest](manifest.md) |
| Marketplace chips | the category chips of Recomendados, "De la comunidad", "Elige tus fuentes" | `categories` in the manifest | any | [The manifest](manifest.md) |
| A settings form and its own Ajustes tab | Ajustes ▸ &lt;your plugin&gt; | `settings` (`list` from 4) | 1 | [The settings form](settings-form.md#types) |
| Headings, status lines, buttons, checks before saving | the same tab | `section`, `status`, `action` settings; `settingsStatus`, `action`, `validateSettings` | 6 | [The settings form](settings-form.md) |
| Colors | your section, your Ajustes tab, your group title in Categorías, the player's accent while you play | `theme` | 6 | [Your colors](section-theme.md#theme) |
| A section of your own, with tabs and a banner | TV sidebar, phone chip strip atop Inicio | `"section": { "label" }` + `section({ tab })` | 6 | [A section of your own](section-theme.md#section) |
| Tiles in Categorías | Categorías, a group named after you | `categories()` (with `browse`) | 6 | [Your own categories](section-theme.md#categories) |
| Home rows, "Ver más" and their genre | Inicio, Categorías | `home()` rows with `ref` and `genre` | 1 | [The contract](contract.md#paging) |
| Channels in your Home rows | Inicio | `kind: "live"` items in `home()` | 6 | [Live channels](live-channels.md#home-rows) |
| Search inside your "Ver más" pages | "Buscar en esta categoría" | `scopedSearch` | 6 | [The contract](contract.md#scoped-search) |
| 18+ entries | everywhere, only with the 18+ code unlocked | `adult: true` | 6 | [18+ content](contract.md#adult) |
| Names of the copies of a video | the player's Servidor menu | `Stream.label`, `alternatives` with `label` | 6 | [Labelled and lazy copies](contract.md#lazy-copies) |
| Skip buttons | "Saltar intro", "Saltar outro" | `Stream.skip` | any | [The contract](contract.md#stream) |
| Skip buttons on any title, from any source | "Saltar intro", "Saltar outro" | `segments` | 7 | [Where the intro and credits are](contract.md#segments) |
| Audio and subtitle names | the player's "Audio y subtítulos" menu | `audioTracks[].label`, `subtitles[].lang` | 1 | [The contract](contract.md#stream) |
| Your own sentence on an error | "Mensaje de &lt;your plugin&gt;: …" | `kino.error(code, detail, { userMessage })` | 6 | [Your own sentence](contract.md#user-message) |
| Subtitles for any title | "Buscar subtítulos en línea" | the `subtitles` export | any | [Subtitles for any title](contract.md#subtitles) |
| Info pages of other plugins' titles | a title's info page, where TMDB had nothing; from Kino 0.9.51 a logo instead of the name, other sites' ratings and the cast | `meta` (`logo`, `ratings`, `cast`) | 6 | [Describing other titles](contract.md#meta) |
| A tracker's switch and its status | "Enviar lo que veo" and "No pudo avisar a …" in your Ajustes tab | `tracking` | 7 | [Telling a tracker](contract.md#tracking) |
| Channels, logos, numbers, guide | En vivo, TV guide, channel drawer | `channels` | 3 | [Live channels](live-channels.md) |

## Your plugin's identity { #identity }

```json
{
  "id": "mi-cine", "name": "Mi cine", "version": "1.0.0", "apiVersion": 6, "entry": "plugin.js",
  "description": "Cine colombiano y latinoamericano, con subtítulos",
  "author": "ana", "homepage": "https://github.com/ana/mi-cine",
  "icon": "icon.png",
  "color": "#3D5AFE",
  "categories": ["movies", "series"],
  "hosts": ["api.example.com"],
  "capabilities": ["search", "home", "browse", "episodes", "resolve"]
}
```

- Write `name` and `description` in Spanish: they are what every card shows. `description` is at most
  300 characters, `name` 40.
- `icon` is a path next to the manifest, never `./icon.png`. A missing or too-big icon is skipped, never
  fatal.
- `color` paints your tab and chips and your name over your search results. `theme` (below) goes much
  further, from apiVersion 6.
- `categories` only tags your plugin for the marketplace chips. It is not the `categories()` export,
  which puts tiles inside Kino's Categorías.

## Your settings tab { #settings }

Every enabled plugin gets its own tab in Ajustes, with its [Modo debug](diagnostics.md#debug) switch; one
with `settings` shows their form there too. Nine field types (`text`, `password`,
`url`, `toggle`, `select`, `list`, and from apiVersion 6 `section`, `status`, `action`), defaults,
required fields, a check before saving and buttons that run your code:

```json
"settings": [
  { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional" },
  { "key": "email", "label": "Correo", "type": "text" },
  { "key": "password", "label": "Contraseña", "type": "password" },
  { "key": "linked", "label": "Estado", "type": "status" },
  { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión?" },
  { "key": "quality", "label": "Calidad", "type": "select", "default": "hd",
    "options": [{ "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Ahorro de datos" }] }
]
```

```js
export async function settingsStatus() {
  return { linked: kino.config.get("email") ? "Cuenta vinculada" : "Sin cuenta" };
}

export async function action(key) {
  if (key === "logout") return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
  return null;
}
```

Every type and attribute, `validateSettings` and a complete example: [The settings form](settings-form.md).
There are no conditional fields: every setting always shows.

## Your section, your tiles, your colors { #section-theme }

```json
"apiVersion": 6,
"section": { "label": "Mi cine" },
"theme": { "accent": "#3D5AFE", "onAccent": "#FFFFFF", "background": "#101820", "surface": "#1A2733", "highlight": "#F7C948" }
```

```js
export async function section({ tab }) {                 // tab is null the first time
  const tabs = [{ id: "pelis", label: "Películas" }, { id: "series", label: "Series" }];
  const chosen = tabs.some((t) => t.id === tab) ? tab : "pelis";
  return {
    tabs, tab: chosen,
    hero: { title: "Estreno de la semana", text: "Una película nueva cada viernes.", image: "https://img.example.com/hero.jpg" },
    rows: await rowsFor(chosen),                         // the same rows as home()
  };
}

export async function categories() {                     // needs the browse capability
  return [
    { id: "comedia", title: "Comedia", ref: "genre:comedia", art: "https://img.example.com/comedia.jpg" },
    { id: "terror", title: "Terror", ref: "genre:terror" },
  ];
}
```

Kino checks every color for readability when it uses it and falls back to its own for a color that
fails (`node sdk/run.mjs . theme` shows the ratios). Errors stay in Kino's red. The rules:
[Section, categories and colors](section-theme.md).

## Home rows { #home }

```js
export async function home() {
  return [
    { id: "nuevas", title: "Recién llegadas", ref: "nuevas", genre: "peliculas", items: newest },
    { id: "canales", title: "Canales de Colombia", genre: "noticias", items: [   // apiVersion 6
      { id: "canal-1", ref: "live:1", title: "Canal Uno", kind: "live", poster: "https://img.example.com/c1.png" },
    ] },
  ];
}
```

- A row with a `ref` (and the `browse` capability) ends in "Ver más"; with `scopedSearch` you answer the
  search inside it yourself.
- `genre` (one of `peliculas`, `series`, `anime`, `infantil`, `documentales`, `deportes`, `noticias`,
  `musica`, `entretenimiento`, `otros`) is how Categorías groups browsable rows of every plugin.
  Without it Kino guesses from the title.
- Each item can carry `badges` (up to 3 chips such as `"Latino"`, `"4K"`), `quality`, `lang`, `rating`,
  `year`, `genres`, `overview`, a `poster` and a `backdrop`; `ids.tmdb` lets Kino complete its info page.
- `kind: "live"` items stay in Home rows from apiVersion 6, as channel cards with the "En vivo" badge.
- `adult: true` keeps an entry hidden until the person unlocks their 18+ code.
- Your rows come after Kino's own, under your plugin's name. Rules: [The contract](contract.md#validation).

## In the player { #player }

```js
export async function resolve(ref) {
  const servers = await listServers(ref);              // [{ id, lang, name }]
  const first = await resolveServer(ref, servers[0]);
  return {
    url: first.url,
    label: `${servers[0].lang} · ${servers[0].name}`,   // "Latino · Servidor 1" in the Servidor menu
    alternatives: servers.slice(1, 9).map((s) => ({ label: `${s.lang} · ${s.name}`, ref: `${ref}|${s.id}` })),
    audioTracks: first.dubs.map((d) => ({ lang: d.lang, url: d.url, label: d.name })),  // "Español (Latinoamérica)"
    subtitles: first.subs.map((s) => ({ lang: s.lang, url: s.url })),
    durationMs: first.durationMs,
    skip: { openingStartMs: 62_000, openingEndMs: 152_000, endingStartMs: 1_290_000 },
  };
}
```

- `label` and lazy `{ label, ref }` copies (apiVersion 6) fill the **Servidor** section of the player's
  "Audio y subtítulos" menu; a copy is resolved only when the person picks it or the automatic
  fallback reaches it ([Labelled and lazy copies](contract.md#lazy-copies)).
- `audioTracks[].label` is shown as is in the audio menu; without it Kino names the track from `lang`.
- `skip` puts "Saltar intro" and "Saltar outro" on screen; a correction the person makes by hand wins.
- With a `theme`, the player's progress bar, slider and focus border take your `accent` while your
  content plays.

## Your own words { #words }

```js
throw kino.error("not_found", "E404", { userMessage: "Este capítulo ya no está disponible." });
```

The person reads "Mensaje de Mi cine: Este capítulo ya no está disponible." instead of Kino's line, only
when the sentence passes [the safety rules](contract.md#user-message) (Spanish, at most 160 characters,
no links, never asking for money, credentials or contact data). Status lines and action messages of your settings
form are your words too ([The settings form](settings-form.md)).

## What you cannot change { #limits }

- Kino's own screens, fonts and layout, the order of Inicio (your rows go after Kino's own) and the
  player's background and surfaces.
- Error colors: always Kino's red, whatever your `theme` says.
- Conditional settings: every field always shows.
- Anything that runs outside your exports: no screens of your own, no notifications, no background jobs.
  Kino calls you; you answer with data.
- Whether the person's 18+ code is unlocked: you only mark entries `adult: true`, Kino decides.
