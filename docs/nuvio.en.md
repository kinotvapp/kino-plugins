# Nuvio scrapers

Kino can install the scrapers of a Nuvio provider repository without anyone writing a Kino plugin:
it converts the chosen scraper into a Kino plugin on the device, at install time. This page says how people add them, what the conversion does and where
it stops. You don't need any of it to write a plugin of your own; it matters if you maintain a Nuvio
repository, or you want to know why a converted plugin behaves differently from a hand-written one.

## How people add them { #add }

1. In Kino, Ajustes ▸ Plugins (on the TV, the "Plugins" button on Home also gets there), "Agregar
   plugin", and type the repository's address, `owner/repo`, exactly as for a Kino plugin.
2. Kino reads `manifest.json` at the repository root. When it is Nuvio's own format (an object with
   a `scrapers` array) the address is a Nuvio repository; otherwise Kino treats it as a Kino plugin
   (`kino-plugin.json`). If the default branch has a `manifest.json` that is not in that format (some
   repositories keep a template there), Kino also tries the `main` and then the `master` branch.
3. A full-screen picker lists **every** scraper of the manifest, with its logo, types, language,
   version and author, and filters by type (Todas, Películas, Series, Anime) and language. Each card
   says "Agregar", "Instalado", or "No disponible" (a scraper the manifest disables, or disables on
   Android). A repository with nothing installable says "Este repositorio de Nuvio no tiene scrapers
   instalables en Android".
4. "Agregar" converts that scraper and opens the usual [consent sheet](what-people-see.md); after
   "Instalar" the picker stays open so the person can add another one. Each scraper becomes its own
   plugin, listed in Ajustes ▸ Plugins like any other.

The picker notes that the scrapers are converted from Nuvio and that their original code is under the
GPL-3.0 license; the plugin's description says the same ("Convertido desde el plugin de Nuvio …;
código original GPL-3.0").

## What the conversion builds { #conversion }

The scraper's own JavaScript is kept byte for byte, wrapped with a compatibility layer and a small
adapter, and installed with a generated manifest:

- `apiVersion` 4, `version` `1.0.0`, capabilities `search`, `episodes`, `resolve` and `download`.
- `hosts`: detected automatically from the scraper's code (and from a remote domain list it names,
  when it has one), with `api.themoviedb.org` always first. A manifest caps them at 20: over that,
  the addresses that look like the scraper's own site go first, and the description warns "se
  detectaron más de 20 dominios; algunos quedaron fuera". A scraper whose code names no domain at all
  cannot be converted ("No encontré ningún dominio en el código de …").
- `"streamHosts": "any"`: its movies and episodes may play from any public server
  ([the rule](manifest.md#stream-hosts)).
- `"fetchHosts": "any"`: its `kino.fetch` may reach any **public** server, without a question per
  host. Local names, private, loopback and link-local addresses, and names that resolve into the home
  network stay refused, on every redirect hop. This field is honoured **only** for these converted
  installs; in a hand-written plugin it has no effect ([why](manifest.md#stream-hosts)).

So the consent sheet of a converted scraper shows, in red, "Puede reproducir video desde cualquier
servidor que indique" and "Puede conectarse a cualquier servidor de internet", plus "Puede descargar
videos para verlos sin conexión". Nothing of it runs before the person accepts.

## How a converted scraper behaves { #behavior }

Nuvio scrapers have no catalogue and no text search: they only answer "streams for this TMDB id".
So the adapter works from TMDB:

- **No Home rows.** The plugin shows up in search results, never as Home rows.
- **`search`** answers one item, for the TMDB id Kino is looking for (nothing when Kino has no TMDB
  id), with TMDB's poster, backdrop, year and synopsis when TMDB answers in time. A scraper answers
  only for the types its manifest declares: one without movies (or without series) is not offered as
  a source for them.
- **`episodes`** lists the seasons and episodes from TMDB, without season 0 (specials) and without
  episodes that have not aired yet.
- **`resolve`** calls the scraper's `getStreams` exactly as Nuvio does, drops torrent-only results
  (Kino has no BitTorrent client) and picks by quality: 1080p first, then 720p, then anything else,
  and 2160p/4K last (most phones and TVs here can't decode 4K HEVC). When nothing is left the person
  reads why: "sin resultados", "solo torrents", or "error del scraper: …" with what the scraper
  logged.
- **Downloads** work on phones like for any plugin with `download` ([Downloads](manifest.md#downloads)),
  under the same host rules as playing.

## Limits that differ from a hand-written plugin { #limits }

| What | Converted Nuvio scraper | Hand-written plugin |
| --- | --- | --- |
| `resolve` time | 45 s (the player counts the wait on screen) | 20 s |
| `kino.fetch` requests per call | 250 | 60 |
| Hosts `kino.fetch` may reach | any public host (`fetchHosts`) | `hosts`, typed servers, and hosts approved one by one |
| Where the video may be | any public host (`streamHosts`) | `hosts`, unless `streamHosts` or the broad video permission |

Everything else -- memory, body sizes, the home-network refusals, the other time limits -- is the
same.

## The runtime a scraper gets { #runtime }

The compatibility layer rebuilds, on top of `kino`, what a Nuvio scraper expects: CommonJS
`module`/`exports`/`require`, a browser-shaped `fetch`, `axios`, `process.env`, `global`,
`setTimeout`/`clearTimeout`, `AbortController`/`AbortSignal`, `require("crypto")` (Node's, for what
scrapers use), the browser Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`,
`crypto.randomUUID`), `TMDB_API_KEY`, and the real `cheerio-without-node-native`, `crypto-js` and
`Buffer`, bundled only when the scraper's code needs them. A scraper that `require`s anything else
fails with "Nuvio compat: require('…') was not bundled with this scraper".

All of that exists **only** inside a converted scraper. A plugin you write gets the plain Kino
engine: none of those globals ([Limits and engine quirks](engine-limits.md#not-node)). The same goes
for the async-helper workaround of [the rejection trap](engine-limits.md#rejection-trap).

## Updates { #updates }

A converted plugin always says version `1.0.0`, so Kino does not compare versions: "Buscar
actualizaciones" (and the background check) re-runs the whole conversion from the repository and
compares the resulting code and manifest with the installed ones. A change that only touches code
installs by itself; one that adds hosts or a permission waits for the person's approval, like any
[update](publish.md#updates). A plugin converted by an older Kino asks for approval once for what
newer conversions add (`fetchHosts`, downloads).

## For Nuvio repository maintainers { #maintainers }

- Keep `manifest.json` at the root of the default branch, with `scrapers[]` entries that have `id`,
  `name`, `filename`, and ideally `supportedTypes`, `contentLanguage`, `version`, `author`,
  `description` and `logo`: the picker shows and filters by them.
- Use `enabled: false` or `disabledPlatforms: ["android"]` for scrapers that should not be offered.
- Write the site's own address as a literal in the code (or in a remote domain list): that is how
  Kino finds the hosts to declare.
