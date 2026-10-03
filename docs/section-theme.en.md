# Your own section, categories and colors (apiVersion 6)

Three optional widenings, all from `"apiVersion": 6` (Kino 0.9.50). None of them needs a capability of
its own. A complete example of the three is `plugins/sdk/test/section-demo` in Kino's repository (its
`highlight` fails on purpose so you can see the fallback).

## A section of your own { #section }

Declare `"section": { "label": "Demo" }` (1 to 20 characters) and export `section({ tab })`:

```js
export async function section({ tab }) {   // tab is null the first time
  const tabs = [{ id: "pelis", label: "Películas" }, { id: "series", label: "Series" }];
  const chosen = tabs.some((t) => t.id === tab) ? tab : "pelis";
  return {
    tabs,                                    // optional, at most 8, labels at most 24 characters
    tab: chosen,                             // the tab this answer is for
    hero: { title: "Destacado", text: "…" }, // optional; also image (http or https); text at most 300 characters
    rows: [{ id: `${chosen}-a`, title: "Destacadas", ref: `${chosen}-a`, items: [/* KinoItem */] }],
  };
}
```

- `rows` are exactly the rows of `home` (same shape, same checks and limits); a row with a `ref` gets
  "Ver más", which calls `browse(ref, null)`. Return `rows: []` for an empty tab: Kino says there is
  nothing there.
- Choosing a tab calls `section({ tab })` again with that tab's `id`. 20 s per call.
- Where it shows: on the **TV**, an entry in the sidebar after "Categorías" (at most 3 plugins have
  one); on the **phone**, a chip in the strip at the top of Inicio (scrollable, at most 8). Only plugins
  that are enabled, usable and need no setup appear: one that is off, or still asks for a required
  setting, gets no entry. Entries are ordered by label, then by plugin id. A call that fails shows an
  error inside the section and never touches the rest of the app.
- A manifest that declares `section` must export it: the install fails otherwise, like any other
  required export.
- `adult: true` entries follow the [18+ lock](contract.md#adult), and a `userMessage` on `not_found`,
  `unavailable` or `rate_limited` is shown in the section ([your own sentence](contract.md#user-message)).

## Your own categories { #categories }

Export `categories()` (needs the `browse` capability; no manifest field, Kino sees the export):

```js
export async function categories() {
  return [{ id: "accion", title: "Acción", ref: "accion", art: "https://image.tmdb.org/t/p/w500/x.jpg" }];
}
```

- At most 24 tiles, shown in your order; `title` at most 40 characters, `ref` at most 4,096, `art` an
  image URL (the Images rule of the [contract](contract.md#validation): `http` or `https`, not checked
  against `hosts`).
- They appear in Categorías as one group named after your plugin, and each tile opens
  `browse(ref, null)`, paged like any `browse`.
- If `categories()` fails or times out you simply contribute no group. 20 s per call.
- A tile with `adult: true` is shown only while the person's 18+ code is unlocked on that device, like
  any [18+ entry](contract.md#adult); a group left with only such tiles is not shown.
- A tile's "Ver más" page has a search field; with [`scopedSearch`](contract.md#scoped-search) you
  answer it yourself.

## Your colors (`theme`) { #theme }

`"theme"` takes up to five colors, each `#RRGGBB`, each optional:

```json
"theme": { "accent": "#3D5AFE", "onAccent": "#FFFFFF", "background": "#101820", "surface": "#1A2733", "highlight": "#F7C948" }
```

| Token | What it paints |
| --- | --- |
| `accent` | in your section and your Ajustes tab: selected chip and tab, buttons, focus, the "Ver más" arrow; in the player: the progress bar, the slider, active states and the TV focus border |
| `onAccent` | text and icons drawn on top of `accent` |
| `background` | the screen behind your section and your Ajustes tab |
| `surface` | in your section: the cards, the "Ver más" card and the tabs that are not selected |
| `highlight` | emphasized text there; in Categorías, the title of your group |

Scope: your section, your Ajustes tab, the title of your group in Categorías (only that title, in
`highlight`; its tiles and background stay Kino's) and, while your content plays, the player's `accent`
and `onAccent` only (the player keeps Kino's background and surfaces). Nothing else in Kino changes, and
**errors are always shown in Kino's red**, whatever your theme says.

Kino protects readability, so each color is checked when it is used:

- `background` must be dark (relative luminance at most 0.05).
- `surface` must be dark (at most 0.12) and at least 1.05:1 apart from the background.
- `accent` must reach 3:1 against the background.
- `onAccent` must reach 4.5:1 against `accent`.
- `highlight` must reach 4.5:1 against the background.
- No color may be close to Kino's red `#E50914` (CIE76 distance below 25).

Kino's own colors (the fallbacks) are `accent` `#E50914`, `onAccent` `#FFFFFF`, `background`
`#0E0E0E`, `surface` `#181818` and `highlight` `#F5F5F5`. A color that fails falls back to Kino's own for that token only (`accent` and `onAccent` are judged and
fall back **as a pair**); the install still succeeds and the other colors stay. A color that is not a
valid `#RRGGBB` is refused at install time. Preview it, with the ratios and the warnings Kino would
print, before publishing:

```
node sdk/run.mjs . theme
node sdk/run.mjs . section [tab]
node sdk/run.mjs . categories
```

`sdk/validate.mjs` shows the same warnings.
