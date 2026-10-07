# Nuvio scrapers

Kino can install the scrapers of a Nuvio provider repository without anyone writing a Kino plugin:
it converts the chosen scraper into a Kino plugin on the device, at install time. This page says how people add them, what the conversion does and where
it stops. You don't need any of it to write a plugin of your own; it matters if you maintain a Nuvio
repository, or you want to know why a converted plugin behaves differently from a hand-written one.

## How people add them { #add }

1. In Kino, Ajustes ▸ Plugins (on the TV, the "Plugins" button on Home also gets there), "Agregar
   plugin", and type the repository's address, `owner/repo`, exactly as for a Kino plugin. The pasted
   address can also be a `github.com/owner/repo` URL, a `/tree/<ref>/<folder>` one, or a
   `raw.githubusercontent.com/owner/repo/<ref>/.../manifest.json` URL (also `github.com/.../blob/...`
   or `/raw/...` to a `.json` file): Kino takes the folder that file is in. Any other file is refused.
2. Kino reads `manifest.json` at the repository root. When it is Nuvio's own format (an object with
   a `scrapers` array) the address is a Nuvio repository; otherwise Kino treats it as a Kino plugin
   (`kino-plugin.json`). If the default branch has a `manifest.json` that is not in that format (some
   repositories keep a template there), Kino also tries the `main` and then the `master` branch.
   The repository does not have to be on GitHub: see [Where the repository may live](#where).
3. A full-screen picker lists **every** scraper of the manifest, with its logo, types, language,
   version and author, and filters by type (Todas, Películas, Series, Anime) and language. Each card
   says "Agregar", "Instalado", or "No disponible" (a scraper the manifest disables, or disables on
   Android) or "No compatible" (a scraper of peer-to-peer sources, with or without debrid: "Kino no
   admite scrapers de torrents, ni siquiera con debrid", from Kino 0.9.51). A repository with nothing
   installable says "Este repositorio de Nuvio no tiene scrapers instalables en Android".
4. "Agregar" converts that scraper and opens the usual [consent sheet](what-people-see.md); after
   "Instalar" the picker stays open so the person can add another one. Each scraper becomes its own
   plugin, listed in Ajustes ▸ Plugins like any other.

The picker notes that the scrapers are converted from Nuvio and that their original code is under the
GPL-3.0 license; the plugin's description says the same ("Convertido desde el plugin de Nuvio …;
código original GPL-3.0").

### Where the repository may live (Kino 0.9.53) { #where }

- **On GitHub**: `owner/repo`, a github.com page, or its `manifest.json` on raw.githubusercontent.com
  or jsDelivr (`/gh/`). Each scraper's `filename` is a path inside the repository, read from
  raw.githubusercontent.com.
- **On any public https server** (from Kino 0.9.53): paste the URL of its `manifest.json`. A pasted
  URL is read once and judged by what it contains, whichever tab it was pasted in: a `scrapers` list
  (entries with `id` and `filename`) is a Nuvio repository, `resources` is a Stremio addon, both
  opens what the selected tab says, neither is refused. The address must be `https` on a public
  name: `http`, an IP address, `localhost`, a local name (`.local`, `.lan`…) or a name that resolves
  into the person's network is refused, and so are credentials in the URL. The manifest is at most
  256 KiB.
- **Scraper files**: a relative `filename` is resolved against the manifest's URL; an absolute
  `https://` one may be on another public server (a CDN), under the same rules. `http://`, a local
  server, `/root-relative`, `//protocol-relative` or `../` filenames are refused with a message
  saying why. A scraper's sibling files are read from the server its own file is on.

Kino 0.9.52 and older only read repositories on GitHub.

## What the conversion builds { #conversion }

The scraper's own JavaScript is kept byte for byte, wrapped with a compatibility layer and a small
adapter, and installed with a generated manifest:

- `apiVersion` 6 (4 before Kino 0.9.51), `version` `1.<converter revision>.0` (today `1.4.0`, see
  [Updates](#updates)), capabilities `search`, `episodes`, `resolve` and `download`.
- The plugin's `settings`, when the scraper has `onSettings` (Kino 0.9.51): see
  [The scraper's settings](#settings).
- The types the scraper serves come from its `supportedTypes`, with the usual spellings folded
  together: `movie`, `movies`, `film`, `films` are movies; `tv`, `series`, `show`, `shows` are series;
  `anime` is anime (any case). A scraper declaring `["movie", "series"]` serves series too.
- `hosts`: detected automatically from the scraper's code (and from a remote domain list it names,
  when it has one), with `api.themoviedb.org` always first. A manifest caps them at 20: over that,
  the addresses that look like the scraper's own site go first, and the description warns "se
  detectaron más de 20 dominios; algunos quedaron fuera". A scraper whose code names no domain at all
  cannot be converted ("No encontré ningún dominio en el código de …").
- `"streamHosts": "any"`: its movies and episodes may play from any public server
  ([the rule](manifest.md#stream-hosts)).
- `"fetchHosts": "any"`: its `kino.fetch` may reach any **public** server, without a question per
  host, but only over `https` on port 443 and at a dotted name or a public IPv4 address, under a request budget
  (hosts the scraper names with `http://` are declared by the converter as `insecureHttp`). Local names, private, loopback and link-local addresses, and names that resolve into the home
  network stay refused, on every redirect hop. This field is honoured **only** for these converted
  installs; in a hand-written plugin it has no effect ([why](manifest.md#stream-hosts)).

So the consent sheet of a converted scraper shows, in red, "Puede reproducir video desde cualquier
servidor que indique" and "Puede conectarse a cualquier servidor público de internet (solo https, nunca tu red local)", plus "Puede descargar
videos para verlos sin conexión". Nothing of it runs before the person accepts.

## How a converted scraper behaves { #behavior }

Nuvio scrapers have no catalogue and no text search: they only answer "streams for this TMDB id".
So the adapter works from TMDB:

- **No Home rows.** The plugin shows up in search results, never as Home rows.
- **`search` with a TMDB id** answers one item, for the TMDB id Kino is looking for, with TMDB's
  poster, backdrop, year and synopsis when TMDB answers in time. A scraper answers only for the types
  its manifest declares: one without movies (or without series) is not offered as a source for them.
- **`search` without a TMDB id** (a typed search, e.g. on the TV) asks TMDB's own search for the
  text instead (`/search/multi`, or only movies or only series when that is all the scraper serves or
  Kino asked for a series) and answers up to 10 matches, ranked by how close their title is to the
  query, ties by TMDB popularity. The scraper itself is not called until the person picks one. If TMDB
  fails, the search answers nothing rather than an error.
- **`episodes`** lists the seasons and episodes from TMDB, without season 0 (specials) and without
  episodes that have not aired yet.
- **`resolve`** calls the scraper's `getStreams` exactly as Nuvio does and keeps only the `http`/`https`
  copies (Kino has no BitTorrent client). From Kino 0.9.51 **every playable copy** is offered: the
  first one plays and up to 8 more go as [labelled alternative copies](contract.md#lazy-copies) in the
  **Servidor** menu, in this order: video files before embed pages, and within that 1080p first, then
  720p, then anything else, and 2160p/4K last (most phones and TVs here can't decode 4K HEVC). The
  label is the quality with the server's name ("1080p · Server X"), so two copies of one quality read
  apart. A Kodi-style address, `url|User-Agent=…&Referer=…`, is split: what follows the `|` becomes
  request headers. When nothing is left the person reads why: "sin resultados", "solo enlaces P2P", or
  "error del scraper: …" with what the scraper logged.
- **Downloads** work on phones like for any plugin with `download` ([Downloads](manifest.md#downloads)),
  under the same host rules as playing.

## Limits that differ from a hand-written plugin { #limits }

| What | Converted Nuvio scraper | Hand-written plugin |
| --- | --- | --- |
| `resolve` time | 75 s (the player counts the wait on screen) | 20 s |
| `kino.fetch` requests per call | 250 | 60 |
| Hosts `kino.fetch` may reach | any public host (`fetchHosts`) | `hosts`, typed servers, and hosts approved one by one; any public host with [`fetchHosts`](manifest.md#fetch-hosts) from apiVersion 9 |
| Where the video may be | any public host (`streamHosts`) | `hosts`, unless `streamHosts` or the broad video permission |

Everything else -- memory, body sizes, the home-network refusals, the other time limits -- is the
same.

## The runtime a scraper gets { #runtime }

The compatibility layer rebuilds, on top of `kino`, what a Nuvio scraper expects: CommonJS
`module`/`exports`/`require`, a browser-shaped `fetch`, `axios`, `process.env`, `global`,
`setTimeout`/`clearTimeout`, `AbortController`/`AbortSignal`, `require("crypto")` (Node's, for what
scrapers use), the browser Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`,
`crypto.randomUUID`), `TMDB_API_KEY`, and the real `cheerio-without-node-native`, `crypto-js` and
`Buffer`, bundled only when the scraper's code needs them.

From Kino 0.9.51 (Nuvio compatibility v2) also:

- **Nuvio's globals**: `window`, `self` and `SCRAPER_ID`; `getStreams` is found on `module.exports`,
  `exports.getStreams`, `default` or as a global; regenerator-based async code works, and so does a
  `require` inside a `try` or an `if`.
- **A Node subset**: `path`, `url`, `util`, `events`, `querystring`, `timers`, `buffer` and
  `http`/`https`/`undici` (over `kino.fetch`), plus `setInterval`, `setImmediate` and `queueMicrotask`.
  `fs`, `child_process`, `net`, `os`, `stream` and the like load as empty modules: every member reads
  as `undefined`, so a scraper's own feature check falls back to `fetch`, and calling one anyway is a
  `TypeError`.
- **Multi-file scrapers**: the sibling files it `require`s are read from the same repository (or, for
  a scraper whose file is on another server, from that server), through the same fetcher (no new
  destination). At most 16 files and 1 MiB in total; `../` inside the repository is fine, a path that
  escapes the repository or the server's root (also `%`-encoded) is refused. A sibling that throws on
  load is retried.
- **Timing**: 30 s per request. A timer a scraper leaves running is cleared once `getStreams` settles,
  so the call does not wait for it.

A `require` of anything not on that list and not a sibling file fails with "Nuvio compat:
require('…') was not bundled with this scraper".

Kino's TMDB key is never written into the converted plugin's code: `TMDB_API_KEY` holds a fixed
marker, and Kino puts the real key in its place only in `https` requests to `api.themoviedb.org`
(the same [sealed-secret](manifest.md#secrets) mechanism a plugin's own keys use). A request that
carries the marker anywhere else is refused before it leaves, and the key is blanked out of every
answer, error and log the plugin sees.
That marker is for converted scrapers only. A plugin you write yourself asks TMDB through
[`kino.tmdb`](kino-api.md#tmdb) (Kino 0.9.53): Kino's own key behind Kino's cache and limits, the person's key only when
Kino's fails, and no key in your code.

All of that exists **only** inside a converted scraper. A plugin you write gets the plain Kino
engine: none of those globals ([Limits and engine quirks](engine-limits.md#not-node)). The same goes
for the async-helper workaround of [the rejection trap](engine-limits.md#rejection-trap).

## The scraper's settings { #settings }

From Kino 0.9.51, a scraper's `onSettings` becomes the converted plugin's
[settings form](settings-form.md), in its own Ajustes tab, and what the person picks syncs across their
devices like any plugin setting. The scraper gets it in `SCRAPER_SETTINGS`, under its own keys. If the
scraper's form does not fit Kino's limits, the consent sheet says "Algunos ajustes del scraper no caben
y quedaron fuera". A setting that asks for a debrid account makes the scraper refused (see below).

## What is refused { #refused }

**Scrapers of peer-to-peer sources, with or without debrid** (Kino 0.9.51): Kino does not carry
torrents, so the card says "No compatible" and "Kino no admite scrapers de torrents, ni siquiera con
debrid"; it is judged like a [Stremio peer-to-peer addon](stremio.md). One installed before this is
switched off by its next update check.

## Updates { #updates }

A converted plugin's version is `1.<converter revision>.0`: it moves only when Kino's converter
itself changes (today `1.4.0`), because Nuvio's own `version` fields are not reliable. To find
updates Kino does not compare versions: "Buscar actualizaciones" (and the background check) re-runs
the whole conversion from the repository and compares the resulting code and manifest with the
installed ones, so a change in the scraper is found even though the version stays the same. A change that only touches code
installs by itself; one that adds hosts or a permission waits for the person's approval, like any
[update](publish.md#updates). A plugin converted by an older Kino asks for approval once for what
newer conversions add (`fetchHosts`, downloads).

## For Nuvio repository maintainers { #maintainers }

- Keep `manifest.json` at the root of the default branch (or, from Kino 0.9.53, at any public https
  address: [where it may live](#where)), with `scrapers[]` entries that have `id`,
  `name`, `filename`, and ideally `supportedTypes`, `contentLanguage`, `version`, `author`,
  `description` and `logo`: the picker shows and filters by them.
- Use `enabled: false` or `disabledPlatforms: ["android"]` for scrapers that should not be offered.
- Return direct `http`/`https` video addresses when you have them: they go before embed pages. Give
  every copy a `quality` and a `name`: they are its label in the Servidor menu.
- Write the site's own address as a literal in the code (or in a remote domain list): that is how
  Kino finds the hosts to declare.
