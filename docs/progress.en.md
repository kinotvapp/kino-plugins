# Saving where the person is (`progress`, apiVersion 22) { #progress }

!!! note "Next Kino release, not published yet"
    apiVersion 22 arrives with the next Kino release, which is not published yet. A Kino that does not have it refuses a
    manifest with `"apiVersion": 22` ("Este plugin necesita una versión más nueva de Kino"). To keep running on older Kinos,
    keep your `apiVersion` and add `progress` as an [enhancement](enhancements.md) (`enhancements["22"]`).

A plugin whose items are not videos (a manga reader, a book reader, a podcast it plays by itself) can ask Kino to remember how
far along the person is in each one. It declares `progress`, calls `kino.progress.set` as the person reads, and reads the places
back with `get` and `list`. **Kino draws nothing from it**: no Home row, no card, no screen. Your plugin builds its own shelf (a
"keep reading" row in its `home()`, a section of its screen) from what `list` answers. What Kino adds is the keeping: the places
survive a restart, follow the person between their own devices and come back with a backup.

```json
{ "apiVersion": 22, "capabilities": ["screen", "progress"] }
```

`progress` is declarative: nothing to export. It has **no consent line and no approval**: it keeps only your plugin's own data
about the person's own reading. It may stand alone, sit beside `screen` (a plugin whose only capabilities are `progress` and
`screen` is valid) or beside any other capability, and the plugin stays that kind of plugin. Without the capability there is no
`kino.progress` (`typeof kino.progress === "undefined"`).

## The calls { #calls }

```js
await kino.progress.set({ id: "ch-87", title: "Berserk", fraction: 0.4, label: "Cap. 87 · hoja 12 de 40", resume: { cap: 87, pag: 12 } });
const here = await kino.progress.get("ch-87");              // { id, fraction, title, label, labelEn?, resume: { cap: 87, pag: 12 }, done, updatedAtMs } or null
const shelf = await kino.progress.list({ limit: 15 });      // most recently set first
await kino.progress.clear("ch-87");                          // forget it
```

| Call | What it does |
| --- | --- |
| `set({ id, fraction, title?, poster?, label?, labelEn?, resume?, done?, doneAt? })` | Saves where the person is in the element `id` (1 to 128 characters of `A-Z a-z 0-9 . _ ~ -`, yours to choose: a chapter, a book, an episode). `fraction` is 0 to 1. Resolves when Kino has taken it, not when it is on disk. |
| `get(id)` | What you last set for it, or `null` (never set, or cleared). |
| `clear(id)` | Forgets it. |
| `list({ limit?, sinceMs? })` | Your elements, most recently set first; `limit` 1 to 100 (default 50), `sinceMs` (a finite number >= 0, milliseconds since 1970) keeps only those set at or after that time. Finished ones are included (`done: true`). |

An entry, from `get` or `list`, is `{ id, fraction, title?, poster?, label?, labelEn?, resume?, done, updatedAtMs }`: every entry
of `list` carries its `id`, and `updatedAtMs` is the time of the last `set`.

- **Optional texts.** `title` (up to 200 characters) and `poster` (an https address under the rule of a screen's
  [`Image`](screen-components.md#image), or a `KinoImageRef` of your [`imageSource`](images.md)) are for your shelf; a `set`
  that leaves them out keeps what was there. A poster that fails the rule costs only the poster. `label` and `labelEn` are one
  short line about the place, up to 80 characters each ("Cap. 87 · hoja 12 de 40"); `get` and `list` hand both back.
- **Finished.** An element is finished (`done: true`) when you say `done: true`, or, if you do not say, when `fraction` reaches
  `doneAt` (0.9 unless you give another). It stays in `list`; a later `set` with a lower fraction reopens it. An identical `set`
  changes nothing.
- **Call it as often as you like.** Even on every page turn: Kino keeps the latest `set` of each element in memory and writes to
  disk at most every 2 seconds, and always when the screen closes or the app goes to the background. More than 20 calls a second
  are coalesced, never an error.

## `resume`: your own data { #resume }

Put in `resume` whatever lets you come back to the exact place: `{ "cap": 87, "pag": 12 }`, a screen route and its arguments, a
string. It is **any JSON value** (a string, a number, a boolean, an object or an array) of up to 1024 bytes once serialized (a
longer one is refused with `too_large`). Kino stores it, syncs it and hands it back exactly as you set it, but **never reads
it**. The `fraction` is only an approximation Kino keeps for you (and for a progress bar); the exact position belongs in
`resume`.

```js
// Small and exact: the chapter and the page.
await kino.progress.set({ id: manga.id, fraction: 0.4, resume: { cap: 87, pag: 12 } });

// Or the route of your own screen, to open it again just as it was.
await kino.progress.set({ id: book.id, fraction: 0.62, resume: { screen: "reader", args: { book: book.id, at: 18342 } } });
```

- **Keep a margin below 1024.** Kino measures `resume` with the escaping of its JSON library (U+2028 and U+2029 count 6 bytes
  where `JSON.stringify` writes them raw), so a value that `JSON.stringify` measures at exactly 1024 may be refused.
- **Validate what you read back.** Another device wrote it, maybe with another version of your plugin: check its shape before
  you use it, and fall back to the start when it does not fit.

## Errors { #errors }

A failed call rejects with a `KinoError` whose `code` is one of these:

| `code` | When | What to do |
| --- | --- | --- |
| `bad_request` | A bad `id`, `fraction`, `done`, `doneAt`, text or option. | Fix the call. |
| `too_large` | The `resume` is over 1024 bytes serialized. | Keep only what you need to come back (a chapter and a page, not the page's content). |
| `not_allowed` | The capability is not declared, the call is in a job that runs for a profile other than the active one, or Kino could not keep it right now. | Catch it; reading must still work without a saved place. |

## Limits { #limits }

| Limit | Value |
| --- | --- |
| `resume` | 1024 bytes serialized |
| `id` | 1 to 128 characters of `A-Z a-z 0-9 . _ ~ -` |
| `title` | 200 characters |
| `label`, `labelEn` | 80 characters each |
| Elements per plugin | 500 (past that the oldest by last activity are dropped) |
| `list` | 100 at most, 50 by default |
| Writes to disk | at most every 2 seconds per plugin |
| `set` calls | 20 a second, the rest coalesced |
| Finished | `done: true`, or `fraction` of 0.9 or more (`doneAt` changes it) |

## Whose it is, devices and backups { #sync }

- **Per plugin and per profile.** Each element belongs to your plugin and to the person's profile: another plugin never sees it,
  another profile of the same device has its own.
- **Apart from Kino's library.** It adds nothing to "Continuar viendo", to the watch time or to what
  [`kino.library`](rooms.md#library) answers, and [`tracking`](contract.md#tracking) never hears of it.
- **Synced and backed up.** It syncs per profile between the person's linked devices, in both directions, and travels in
  backups. When two devices set the same element, the latest wins.

## In a scheduled job { #jobs }

A [scheduled job](jobs-and-shared.md) may call `kino.progress`, but not a job that runs for a profile other than the active one
([`"perProfile": true`](jobs-and-shared.md#per-profile)): there it rejects with `not_allowed`, like `kino.notifications`,
`kino.coins` and `kino.seed`. Catch it.

## Older Kinos and enhancements { #enhancements }

Feature-detect with `typeof kino.progress === "object"`. To keep running on a Kino that does not have it, keep your `apiVersion`
and add the capability as an enhancement:

```json
{
  "apiVersion": 14,
  "capabilities": ["screen"],
  "enhancements": { "22": { "capabilities": ["progress"] } }
}
```

A Kino that knows apiVersion 22 adds `progress`; an older one ignores the block and your plugin runs as before, with
`kino.progress` absent. See [Screens without raising your apiVersion](enhancements.md).

## A worked example: a manga reader { #example }

It saves the place on each page turn, builds its own "keep reading" row from `list`, and resumes the exact page when a manga
opens. The three functions are the plugin's own code in `plugin.js`; `home()` is the usual export, so this plugin also declares
`home` (and `search` and `resolve`, like any source):

```json
{ "apiVersion": 22, "capabilities": ["search", "home", "resolve", "screen", "progress"] }
```

```js
// Each page turn: the exact place goes in `resume`; the fraction is for a bar and for "done".
async function onPageTurned(manga, chapter, page, pages) {
  await kino.progress.set({
    id: manga.id,                                   // one element per manga, so "keep reading" shows each manga once
    title: manga.title,
    poster: manga.cover,
    fraction: (chapter.index + page / pages) / manga.chapters,
    label: "Cap. " + chapter.number + " · hoja " + page + " de " + pages,
    labelEn: "Ch. " + chapter.number + " · page " + page + " of " + pages,
    resume: { cap: chapter.number, pag: page },     // yours: Kino never reads it
  });
}

// Home: a "keep reading" row built from what Kino kept. Kino draws nothing of its own.
async function home() {
  const rows = [];
  if (typeof kino.progress === "object") {
    const reading = (await kino.progress.list({ limit: 15 })).filter((e) => !e.done);
    if (reading.length) {
      rows.push({
        id: "keep-reading",
        title: "Seguir leyendo",
        items: reading.map((e) => ({ id: e.id, ref: e.id, title: e.title || e.id, kind: "series", poster: e.poster })),
      });
    }
  }
  return rows;                                       // a KinoRow[]; add the plugin's other rows here
}

// Opening a manga: go straight to the place the person left.
async function openManga(manga) {
  const here = await kino.progress.get(manga.id);
  const place = here && here.resume ? here.resume : { cap: 1, pag: 1 };
  return showPage(manga, place.cap, place.pag);
}
```

- `home()` answers an **array of rows**, each with its own `id`, and every item needs an `id` (and a `ref`, a `title` and a
  `kind`): see [the contract](contract.md).
- `get` answers `null` for a manga the person never opened: the example starts at chapter 1, page 1.
- If the pages come from a site that only answers to its own page, give each page's `Image` the
  [`headers`](screen-components.md#image-headers) it needs.

## Try it with no phone { #test }

The Node kit's `kino.progress` keeps the elements in memory for the run, with the same checks and error codes as Kino's
(`node --test sdk/test/progress.test.mjs`). See [Test it locally](test-locally.md).

## What the person sees { #what-people-see }

Nothing from Kino: no row, no card, no consent line. They see your own shelf, and the place they left on every device of theirs.
