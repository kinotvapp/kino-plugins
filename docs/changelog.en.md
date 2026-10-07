# What's new for plugin authors { #changelog }

What changed in Kino that matters when you write a plugin, by app version. Every number is in
[the contract](contract.md) and [the reference files](reference/index.md).

## Kino 0.9.55: `apiVersion` 9, `fetchHosts` on hand-written plugins, English texts, `kino.meta` by title { #v0955 }

<span id="next"></span>(Not released yet.) **`apiVersion` 9 = Kino 0.9.55.** The contract (`contract.json`) now says
`maxApiVersion` 9 and `kino.apiVersion` reports 9. A manifest with `"apiVersion": 9` is refused by Kino 0.9.54 and older
("Este plugin necesita una versión más nueva de Kino"), and all three features need `apiVersion` 9: below it Kino
ignores them, as an older version does.

| Feature | From | How to tell |
| --- | --- | --- |
| `"fetchHosts": "any"` on a hand-written plugin | Kino 0.9.55, `apiVersion` 9 | `kino.fetchAnyHost === true` (approved by the person) |
| English settings and `section` texts (`labelEn`, `hintEn`, `confirmEn`) | Kino 0.9.55, `apiVersion` 9 | nothing to check: below 9, or on an older Kino, the usual ones show |
| `kino.meta({ type, title, year? })` without ids | Kino 0.9.55, `apiVersion` 9 | `kino.meta.byTitle === true` |

- **`"fetchHosts": "any"` for your plugin** (apiVersion 9): until now Kino honoured it only on the Nuvio scrapers it
  converts. From Kino 0.9.55 a hand-written plugin with `"apiVersion": 9` and `"fetchHosts": "any"` may reach any public
  host you did not declare with `kino.fetch` (redirects included), only over `https` on port 443 and at a dotted name
  or a public IPv4 address, for sites and extractors that rotate domains. Those requests spend a budget per plugin
  (60 a minute to one site, 600 every 10 minutes; over it, `rate_limited`); your declared `hosts` keep their own rules
  and spend none of it, so declare your primary sites. The person approves it in red ("Puede conectarse a cualquier
  servidor público de internet (solo https, nunca tu red local)") and an update that adds it waits for that approval
  again, the first start after a Kino update included; the home network stays refused and a sealed secret only goes
  to your `hosts`. On hidden pages, the start address and every top-level navigation follow the same rule. `kino.fetchAnyHost` is `true` when it is active (`false` otherwise; `undefined` on
  an older Kino). Below apiVersion 9 nothing changes. [Reaching any server](manifest.md#fetch-hosts).
- **Your settings form and your section, in English too** (apiVersion 9). Every setting may carry `labelEn` and
  `hintEn` (an `action` with `confirm`, also `confirmEn`), every `select` option and `list` field its `labelEn`, and
  the manifest's `section` its `labelEn`, with the same limits as the usual text. With the app in English Kino shows
  them; the usual text stays the Spanish one and the fallback wherever one is missing. Below apiVersion 9 they are
  unknown keys, ignored without being checked. [English texts](settings-form.md#english).
- **`kino.meta` by title** (apiVersion 9). When your source only gives you the name and the year, `kino.meta({ type,
  title, year })` looks the title up on TMDB (es-MX, matching the original title too, the exact year or one off) and
  answers the same as with an id, `ids` included. When two hits tie or none matches it answers `null`: it never
  guesses. Check `kino.meta.byTitle === true` first; below apiVersion 9, or on an older Kino, the title never arrives
  and the query answers `invalid_request`. [By title, without ids](kino-api.md#meta-by-title).

## Kino 0.9.54: `apiVersion` 8, music and podcasts, catalog-only plugins { #v0954 }

(Released 2026-10-06.) **`apiVersion` 8 = Kino 0.9.54.** The contract (`contract.json`) now says
`maxApiVersion` 8 and `kino.apiVersion` reports 8. A manifest with `"apiVersion": 8` is refused by Kino 0.9.53 and older
("Este plugin necesita una versión más nueva de Kino"), so declare 8 only if you return `music` or `podcast` items or
export `details`. Everything else on this list is additive (valid at any `apiVersion`, ignored by older Kino), and
nothing on it makes you change your plugin. How to use each one and still run on older Kino:

| Feature | From | How to tell |
| --- | --- | --- |
| `music` / `podcast` items, `details` export | Kino 0.9.54, `apiVersion` 8 | declare `"apiVersion": 8` (older Kino refuses the plugin) |
| `"catalogOnly": true` | Kino 0.9.54, any `apiVersion` | older Kino ignores it: keep `resolve` and `search` or `home` |
| `kino.browser.capture`'s `captureAll`, `alsoMatch`, `waitForCookie`, `returnCookiesOnTimeout` | Kino 0.9.54, `apiVersion` 6 with `"browser": true` | `kino.browser.captureAll === true` |
| `episodes().series.rating`/`runtimeMinutes`, `ids.mal`/`anilist`/`kitsu` | Kino 0.9.54, any `apiVersion` | nothing to check: older Kino ignores them |
| `kino.lang` in the app's language | Kino 0.9.54 | read `kino.lang`; it was always `"es-CO"` before |

- **Music and podcasts** (apiVersion 8): an item may be `kind: "music"` (an album, a playlist or a single track) or
  `kind: "podcast"` (a show or an audiobook), with an optional `artist`. With `episodes` declared, Kino asks it for the
  tracks or episodes; without it, the item's `ref` goes straight to `resolve`. People get square covers in rows of
  their own, album and podcast pages with "Reproducir" and "Aleatorio", an audio player, "Seguir escuchando" for
  podcasts on Home, audio downloads (with `download`) and audio cast to Chromecast and DLNA. `search` may get
  `type: "music"` or `"podcast"`, and `migrate` may answer one. [Music and podcasts](contract.md#music-podcasts).
- **`details(ref)`** (apiVersion 8, optional, no capability): your own synopsis, art, genres, year, score and runtime
  for a movie's page, asked alongside TMDB under its own 20 s and allowed to use `kino.browser.page`. From apiVersion 8
  **`details` is a reserved export name**: rename a helper of yours that has it. `episodes().series` takes `rating` and
  `runtimeMinutes` too, and `ids` may carry an anime's `mal`, `anilist` and `kitsu`, which AniList and `meta` plugins
  are then asked by. The title page now follows one fixed order per field whatever answers first, with TMDB first for
  the synopsis, year, genres, score and runtime. [A title's own details](contract.md#details).
- **`"catalogOnly": true`** in `kino-plugin.json`: your plugin lists and describes titles but plays none (a TMDB
  catalog, a list of new releases, ratings). Kino 0.9.54 sends its titles to "Buscar dónde verlo" (the person's other
  sources) instead of opening the player, never uses it as a source of a title (the search, "Ver otras fuentes",
  "Buscar por fuente", the player's "Servidor"), never calls its `resolve`, does not count it as a source in "Elige tus
  fuentes", and the install sheet says "Solo catálogo: no reproduce videos" ("Catalog only: doesn't play videos"). With
  the field, `resolve` is no longer required and one of `home`, `browse`, `search` or `meta` is enough; `download`,
  `drm`, `channels`, `streamHosts` and `"browser": true` are refused (`"pages"` is fine).
- **It is additive**: valid at every `apiVersion`, and an older Kino ignores the field as it ignores any key it does
  not know. To keep your plugin installing and updating on Kino 0.9.53 and older, **keep declaring and exporting
  `resolve`** (failing with `kino.error("not_found", …, { userMessage })`) **and `search` or `home`**: those versions
  require them. `node sdk/validate.mjs` tells you whether your manifest also works there, and
  `node sdk/run.mjs . resolve <ref>` reminds you that Kino 0.9.54 no longer calls it.
  [Catalog-only plugins](contract.md#catalog-only).
- **`kino.browser.capture` catches every match**: `captureAll` collects every matching request (at most 20) until
  the page settles, `alsoMatch` adds up to 10 more patterns, `waitForCookie` waits for a cookie such as
  `cf_clearance` (with no `match`, a cookie-only page), and `returnCookiesOnTimeout` answers what the page had instead
  of throwing `timeout`. The answer then adds `requests`, `cookies`, `userAgent` and `timedOut`. No new apiVersion:
  check `kino.browser.captureAll === true` first; older Kino ignored these names, 0.9.54 checks their types
  (`invalid_request`). [Hidden browser](browser.md#capture-all).
- **`kino.lang` follows the app's language.** Kino 0.9.54 speaks Spanish or English (Ajustes ▸ App ▸ Idioma), and
  `kino.lang` is `"es-CO"` or `"en-US"` accordingly (always `"es-CO"` before). A language switch closes your sandbox
  and the next call opens one with the new value; `kino.meta`'s cache is cleared and Home's plugin rows are asked
  again. Word your row titles and `userMessage` in that language. [The `kino` API](kino-api.md#lang).
- **Kino's error messages to your code are English** (`e.message` of a `kino.fetch` failure, `kino.storage`,
  `kino.html`, the signing rules) and may change: match on `e.code`, never on the text. The manifest refusals the
  person reads at install stay as they were. [Errors your code can catch](kino-api.md#catch).
- **`telemetry: true`** has a new consent line, "Comparte con Kino registros de errores y datos técnicos de algunas
  reproducciones para corregir fallas", and also sends a small sample of playbacks that went well (one in twenty, at
  most 6 until Kino restarts), only once the person agreed to that wording. Your plugin's tab in Ajustes has an
  "Enviar registros de errores y de reproducción" switch, on by default. Playback records add the codec, the delivery,
  each stall's likely cause and the network type. [Logs and telemetry](diagnostics.md#telemetry).
- **Copies: same video, same language.** Every `alternatives` entry must be the same video in the same language
  (Kino switches between them by itself). After repeated stalls Kino may move once, by itself, to a clearly lighter
  copy when the labels name the resolution (`"720p"`, `"Full HD"`). [The `Stream` rules](contract.md#stream).
- **Downloads** that cannot be saved now end as "Este contenido no se puede descargar" (was "Este video no se puede
  descargar"). [Downloads](manifest.md#downloads).
- **"De la comunidad"** reads 100 plugins a page (was the 30 most-starred), sorted by "Populares" or "Recientes",
  with "Cargar más" and "Buscar en GitHub" for the typed text: a clear repository name and description help people
  find you. [Publishing](publish.md#discovery-0954).
- **CloudStream plugins**: people can add a CloudStream repository and Kino turns each plugin they pick into a Kino
  plugin that runs through a separate complement app; Music/Audio become `music` and Podcast/AudioBook `podcast`.
  Nothing for you to write: it is what a CloudStream repository maintainer may rely on. Generated plugins get a
  `kino.cloudstream` object yours never has. A repository can also be added by its CloudStream short code (cutt.ly, or
  py.md with a leading `!`), and a plugin's own settings screen opens on phones. [CloudStream plugins](cloudstream.md).
- **Fixed: `kino.tmdb` and `kino.meta` after an abandoned call.** When Kino abandoned a call of yours (a screen
  closed, a time limit) but still used its late answer, every `kino.tmdb` or `kino.meta` that call made afterwards
  failed with `not_allowed`, so a TMDB catalog could show one Home row instead of all of them until a restart. From
  0.9.54 they keep answering until that call's evaluation ends. [The `kino` API](kino-api.md#tmdb).
- **`no_tmdb_key`'s sentence for the person** is now "Agrega tu llave de TMDB en Ajustes ▸ Tu llave de TMDB"
  ("Add your TMDB key in Settings ▸ Your TMDB key"); 0.9.53's also pointed to a Stremio TMDB addon. Nothing to change:
  match on `e.code`, never on the text. [The `kino` API](kino-api.md#tmdb).

## Kino 0.9.53: `kino.meta` and `kino.tmdb` { #v0953 }

No new `apiVersion`: it is still 7, and nothing on this list makes you change your plugin. Both new
calls exist only from Kino 0.9.53, so feature-detect them (`typeof kino.meta === "function"`,
`typeof kino.tmdb === "function"`); `node sdk/validate.mjs` warns when your code calls one without that check.

- **`kino.meta(query)`**: ask Kino what it knows about a title (`{ type, ids: { imdb, tmdb, tvdb, kitsu, mal, anilist },
  lang }`) and get synopsis, year, poster, backdrop, logo, genres, runtime, episodes with their ids, the cross-reference
  of every id, ratings and cast, or `null`. Kino answers from its own TMDB lookup, AniList for anime, and the person's
  other `meta` plugins, merged the way its info page merges them; your plugin never touches a TMDB key, and it is never
  asked on its own behalf. 30 calls a minute, 8 s at most, cached 30 minutes.
  [The `kino` API](kino-api.md#meta).
- **`kino.tmdb(path, params)`**: TMDB's read-only v3 API with **no key in your plugin**. Kino's own key goes first,
  behind Kino's TMDB cache (on disk, shared with its own screens, a copy up to 7 days old when TMDB is down) and limits of
  its own (20 calls per 10 s per plugin, 60 per 10 s for all plugins), so plugins cannot spend Kino's quota. Only when
  Kino's key fails (TMDB answers 401/403/429 for it, or one of those limits is spent) does the same request go again with
  the person's key: the one they type in Ajustes ("Tu llave de TMDB", optional, synced between their devices), else the
  one they configured in an installed Stremio addon, once they agree. A key your plugin keeps in its own settings is never
  used. Kino adds the key; your code never sees any, and TMDB needs no entry in your `hosts`. `no_tmdb_key` (with Kino's
  sentence for the person in `e.userMessage`: "Agrega tu llave de TMDB en Ajustes, o instala un addon de TMDB de Stremio
  configurado con tu llave.") is left for a Kino build without a key of its own and a person without one. Allowlisted read
  paths only, 40 calls per 10 s per plugin whichever key, cached 10 minutes. A TMDB-based catalog no longer needs its own key setting (keep it only as a fallback for
  older Kino). [The `kino` API](kino-api.md#tmdb), [a complete example](cookbook.md#tmdb-catalog).
- **The Node kit** runs both: `KINO_META_FIXTURE`, `KINO_TMDB_KEY` (or `"tmdbKey"` in `sdk/config.json`) and
  `KINO_TMDB_FIXTURE`. [Test it locally](test-locally.md#kino-services).

## Kino 0.9.51: `apiVersion` 7 { #v0951 }

**`apiVersion` 7 = Kino 0.9.51.** The contract (`contract.json`) now says `maxApiVersion` 7 and
`kino.apiVersion` reports 7. A manifest with `"apiVersion": 7` is refused by Kino 0.9.50 and older ("Este
plugin necesita una versión más nueva de Kino"), so declare 7 only if you use `tracking` or `segments`.
Nothing else on this list makes you change your plugin.

- **`tracking`** (apiVersion 7): your plugin exports `track(event)` and Kino tells it which movie or
  episode plays on that device, from any source: `start`, `progress`, `stop` and `watched`, with the
  episode's own ids and the show's apart. Approved in red ("Le contará a … qué ves y cuándo lo
  terminas"), with a "Enviar lo que veo" switch in your Ajustes tab; events wait in a queue that survives
  offline and a closed app (ordered retries, 200 per plugin, 7 days). Return `{ skipped: true }` for an
  event your service has no use for. [Telling a tracker what the person watches](contract.md#tracking).
- **`segments`** (apiVersion 7): your plugin exports `segments(query)` and tells Kino where any movie's
  or episode's intro and credits are; the "Saltar intro" and "Saltar outro" buttons and auto-skip use
  them on phone and TV. No red approval. [Where the intro and credits are](contract.md#segments).
- **Subtitles for the exact file**: `subtitles()` gets `file: { hash?, size?, name? }`, what Kino knows
  of the playing file (its OpenSubtitles hash, its size, its name, or a release-style one built from the
  title), to rank the exact release first. A Stremio addon gets it as the `videoHash`, `videoSize` and
  `filename` extras. No new `apiVersion`. [Subtitles for any title](contract.md#subtitles),
  [Stremio addons](stremio.md#subtitles).
- **`meta` with a logo, ratings and cast**: a `meta` answer may carry `logo` (shown instead of the name
  on the info page), `ratings` (up to 6, from IMDb, Rotten Tomatoes, Letterboxd…) and `cast` (up to
  20); an AIOMetadata-style Stremio addon gives them through its `logo`, `imdbRating` and
  `app_extras.cast`. No new `apiVersion`: older versions ignore them.
  [Describing other titles](contract.md#meta).
- **`stremio:///detail/…` links open the title in Kino** (Seenr's "Open in Stremio" and the like)
  instead of being ignored. [Stremio addons](stremio.md#detail-links).
- **"Tu servidor" 1.5.0**, the reference plugin, now shows everything a server of one's own can use up
  to apiVersion 7: `tracking`, `segments`, `subtitles` with `file`, `meta` with logo, ratings and cast,
  and the apiVersion 6 features (section, categories, request signing, copies, the full settings form, a
  `resolve: true` playlist, `liveSearch` and channel paging). [Example plugins](examples.md#reference-plugin).

- **Nuvio compatibility v2**: Kino converts many more Nuvio scrapers. Multi-file scrapers (siblings
  read from the same repository, at most 16 files and 1 MiB), a Node subset (`path`, `url`, `util`,
  `events`, `querystring`, `timers`, `buffer` and `http`/`https`/`undici` over `kino.fetch`;
  `setInterval`, `queueMicrotask`), each scraper's `onSettings` as a settings form synced across
  devices, and every playable copy offered as a labelled alternative in the Servidor menu (embed pages
  last). A Kodi-style `url|User-Agent=…` address becomes headers. Peer-to-peer and debrid scrapers are
  refused ("No compatible"). None of it is for your own plugin: it is what a Nuvio scraper may rely on.
  [Nuvio scrapers](nuvio.md#runtime).
- **Settings form**: a `section`'s `hint` may be up to 300 characters and wraps
  (`sectionHintMaxChars` in `contract.json`). Builds before 0.9.51 refuse one over 80, so keep it
  short if your plugin must install on them. [The settings form](settings-form.md#types).
- **A `%` in an error's text no longer crashes the app.** Up to 0.9.50, an error from your plugin
  whose text carried a `%` (a percent-encoded URL such as `?q=Inception%20s` in a "fetch failed")
  could kill Kino outright. Now an error's text can be anything; if your plugin must run on 0.9.50 and
  older, keep encoded addresses out of its error messages. [Errors your code can catch](kino-api.md#catch).
- **Recomendados** gains Stremio utility addons (subtitles such as OpenSubtitles v3 and Subtis,
  catalogs such as Cinemeta, TMDB and IMDb) and free, legal channels (Pluto TV, Radios). The list is
  no longer published on npm: Kino reads it from this repository on GitHub, then from archive.org,
  then from jsDelivr's copy of the same GitHub file. An addon that plays video is still never
  recommended. [Stremio addons](stremio.md#subtitles).
- **A Stremio addon whose description denies torrents is no longer hidden** ("no incluye streams,
  torrents ni contenido P2P"); the id and name stay strict. [What Kino refuses](stremio.md#refused).
- **Your plugin's card no longer wears a "Kino" badge** (it read as made by Kino); Stremio addons and
  Nuvio scrapers keep theirs.

## Kino 0.9.50: `apiVersion` 6 { #v0950 }

**`apiVersion` 6 = Kino 0.9.50.** The contract (`contract.json`) now says `maxApiVersion` 6 and
`kino.apiVersion` reports 6. A manifest with `"apiVersion": 6` is refused by Kino 0.9.49 and older
("Este plugin necesita una versión más nueva de Kino"), so declare 6 only if you use something on this
list. Everything a plugin can now change in how Kino shows it is gathered on
[Customize your plugin](customize.md).

- **Larger and typed sealed secrets**: up to 8,192 bytes, and typed cipher keys (`use: "cipher-key"`)
  that also work for `des-ede3`. [The manifest](manifest.md#typed-keys).
- **`migrate`**: move to your plugin what the person had saved and Kino can no longer open.
  [Moving saved titles](migrate.md).
- **Request-signed streams**: `signing: "request"`, `signContext`, the `sign` export,
  `resolve(ref, { retry })` and `alternateHosts`. [Signing every request](signed-streams.md).
- **The settings form**: the `section`, `status` and `action` types (up to 16, on top of the 12 valued
  ones), `settingsStatus`, `action` with `clearSettings`, `validateSettings`, the plugin's own tab in
  Ajustes and syncing across devices. [The settings form](settings-form.md).
- **`debug`** and **`telemetry`** (`true` or `"verbose"`), `kino.log.report`, the Registro page, the
  `KinoPlugin/<id>` and `KinoPlay` logcat tags, and playback metrics. [Logs and telemetry](diagnostics.md).
- **Modo debug in every plugin**: every installed plugin (yours, a generated Stremio addon, a Nuvio
  scraper) has a "Modo debug" switch in its Ajustes tab, with no work on your side: on, its failures show
  on screen and its Registro can be copied or shared, so a person can send you a screenshot or their
  Registro. `"debug": true` now only makes the switch on by default; without it the switch starts off.
  The person's choice survives updates and syncs to their other devices. [Modo debug](diagnostics.md#debug).
- **Early rejections are caught**: a `throw` in an `async` function before its first `await` is caught
  by the caller's `try`/`catch` (or `.catch()`, `Promise.all`), as in Node; only a rejection nobody ever
  handles still fails the call. Keep awaiting first if your plugin must run on 0.9.49 and older.
  [The rejection trap](engine-limits.md#rejection-trap).
- **`section`, `categories` and `theme`**: a section of your own, a group in Categorías and your
  colors. [Section, categories and colors](section-theme.md).
- **`scopedSearch`**: answer the search inside a "Ver más" page yourself. [The contract](contract.md#scoped-search).
- **`kino.error(code, message, { userMessage })`**: your own sentence for the person, with safety
  rules and attributed to your plugin. [The contract](contract.md#user-message).
- **`adult: true` entries** behind the person's 18+ code (they used to be dropped).
  [18+ content](contract.md#adult).
- **Channels in your Home rows** (`kind: "live"` in `home`; they used to be dropped).
  [Live channels](live-channels.md#home-rows).
- **Key pairs in `kino.crypto`**: `generateKeyPair`, `sign`, `verify`, `importKey`,
  `deriveSharedSecret`. [The kino API](kino-api.md#key-pairs).
- **The hidden browser**: `"browser": true` (approved in red, "Puede abrir páginas web ocultas para
  encontrar el video") and `kino.browser.capture`, which opens an embed in a hidden in-app WebView inside
  a `resolve` the person started and returns the video requests it made, held so their tokens stay
  fresh, with the headers and cookies to play them. All its traffic goes through a proxy with a
  per-capture credential and vetted, pinned IPs; the home network never; one page at a time; cookies and
  storage wiped. A page that asks for a human ends with `blocked`: **Kino never solves a captcha**. An
  approved plugin's `resolve` gets 75 s. Also, with `"browser": "pages"` (its own red line), `kino.browser.page`, which reads a page's HTML through the
  same hidden browser when the site's automatic check passes by itself (never from `categories`; the top
  document must stay on your hosts, every redirect hop checked, or the read ends `blocked`). [Hidden browser](browser.md).
- **`Stream.label` and labelled lazy copies**: name each copy ("Latino · Servidor 1") for the player's
  new **Servidor** menu, and list copies as `{ label, ref }` that Kino resolves through `resolve(ref)`
  only when the person picks one, the automatic fallback reaches it (at most 20 s each) or a download's
  copy choice probes it. A failed pick returns to the copy that was playing.
  [Labelled and lazy copies](contract.md#lazy-copies).
- **`meta`**: describe titles other sources listed (synopsis, images, episodes) when TMDB and AniList
  have nothing. [Describing other titles](contract.md#meta).

No new `apiVersion` (for any plugin):

- **`alternatives`** on a `Stream`: up to 8 copies of the same video; Kino moves to the next when one
  cannot play on the device. [The contract](contract.md#stream).
- **Play on the TV from the phone**, **new chapters** of followed series and **"Para ti"** work for
  titles of any plugin. [What people see](what-people-see.md#v0950).
- **Updates**: a check when the app starts (at most every 12 h), a badge for pending ones, and a failed
  call with a pending update says so. [Publishing](publish.md#updates).
- **A signed plugin at two repositories** counts as the same plugin with the same `id` and key.
  [Signed plugins](signed.md#two-addresses).
- **`subtitles` export**: answer the player's "Buscar subtítulos en línea" for any title Kino knows by
  IMDb or TMDB id, alongside your videos or as a subtitle provider (`"capabilities": ["subtitles"]`
  alone). [Subtitles for any title](contract.md#subtitles).
- **`Stream.skip`**: where this file's opening and ending are, for "Saltar intro" / "Saltar outro";
  yours win over AniSkip, a hand correction wins over yours. [The contract](contract.md#stream).
- **The manifest's `categories`** (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`,
  `utilities`, `adult`): the plugin marketplace's category chips. [The manifest](manifest.md).
- **Settings form**: `settingsStatus()` is asked again after every action, so `refresh: true` is no
  longer needed. [The settings form](settings-form.md#ui-types).
- **Logs**: only a plugin that declares `telemetry` sends `kino.log` lines with a failure, recommended
  or not; for now there is no switch to turn it off. [Logs and telemetry](diagnostics.md#telemetry).
- **"De la comunidad"** is its own tab of the Plugins screen. [Publishing](publish.md#get-found).
- **Stremio subtitle addons** (OpenSubtitles v3, translators such as GTSubs) install as subtitle
  providers; machine translations show as "Español (traducido)". Nothing for you to write.
  [Stremio addons](stremio.md#subtitles).
- **Reserved ids**: `live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys`, `subtitle-prefs` (the list changed:
  older versions reserve a few more, so if one says "El id … está reservado por Kino", pick another).
- **Claims and takedowns of community plugins**: [`community-blocklist.json`](claims.md).
- **Sending to the TV**: every HLS goes through the phone; a file without `headers` goes direct and,
  if the TV fails it, through the phone. [Sending to the TV](what-people-see.md#cast).
- **`genre`** on a Home row, a live category or a playlist (`peliculas`, `series`, `anime`, `infantil`,
  `documentales`, `deportes`, `noticias`, `musica`, `entretenimiento`, `otros`): Categorías groups the
  browsable rows of every plugin by it, and En vivo filters by it across providers. Optional; without it
  Kino guesses from the title. [The contract](contract.md#returns).
- **`streamHeaders`** on a playlist: the `User-Agent` or `Referer` the player sends for every channel of
  the list, kept apart from the list's own download `headers`. [Live channels](live-channels.md#live-contract).
- **A failing synchronous `kino.*` call is catchable** (a full `kino.storage`, a `kino.crypto` error):
  your `try`/`catch` gets an ordinary `Error`; Kino 0.9.49 ended the whole call there.
  [Errors your code can catch](kino-api.md#catch).
- **After a Kino upgrade**, plugin updates that wait for approval are installed once, from the plugin's
  own address, with a one-time "Se actualizaron tus plugins" notice listing what each may do now.
  [Publishing](publish.md#updates).
- **The settings form, documented whole**: every field type, attribute and default, with a complete
  example. [The settings form](settings-form.md#types).

(Kino builds before `genre` and `streamHeaders` ignore them; the exact version that first shipped each
was not checked.)

Also in this version (documented earlier on this page as "next version"):

- **Install from a manifest URL.** People can paste the `https` URL of a `kino-plugin.json` on any
  public server, not only a GitHub `owner/repo`. Such a `url:` install reads `entry` and `icon` next to
  the manifest, cannot use sealed `secrets`, always counts as unsigned, and never appears in "De la
  comunidad" (discovery still uses the GitHub topic). A `kino-plugin.json` URL on GitHub,
  raw.githubusercontent.com or jsDelivr (`cdn.jsdelivr.net/gh/owner/repo@<exact ref>/…`; `@latest` is
  the default branch, a version range is refused) becomes `owner/repo` as before.
  [Installing from a manifest URL](index.md#manifest-url), [Publishing](publish.md#manifest-url).
- **`liveSearch`, a new optional export for live channels** (no new `apiVersion`: it stays 3 with
  `channels`). Kino asks it from En vivo's search while some of your channels were never listed;
  it returns channels like a `liveChannels` page, at most 100 kept, from 2 typed characters, 15 s.
  [Live channels](live-channels.md#live-search).
- **Big live catalogs keep paging.** `liveChannels` gets 10 pages at first, then 5 more each time
  the person scrolls near the end, up to 10,000 channels (200 pages) per category. Older versions stop
  at 10 pages. Test with `node sdk/run.mjs . live search <query>`.
- **M3U lists** may be UTF-8, Latin-1 or UTF-16; `#EXTINF` attributes may be single-quoted or bare; a
  list over 20 MB or a guide over 50 MB is cut at its last whole line instead of refused.
  [Live channels](live-channels.md#live-contract).
- **Stremio addons** can be installed by people from the same field (Kino generates the plugin; nothing
  for you to write). Their `resolve`, like a converted Nuvio scraper's, gets 75 s. What is supported,
  what is refused (torrents and P2P, always) and how to make an addon work well:
  [Stremio addons](stremio.md).
- `ditu` is no longer a reserved plugin `id` (older versions still refuse it, so avoid it).

## Kino 0.9.46 to 0.9.49 { #v0946 }

- **A leading `./` in `entry` and `icon` is accepted.** Kino drops it and installs the plugin.
  **Kino 0.9.45 and older still refuse it** (`El campo "entry" debe ser una ruta relativa a un
  archivo .js`), so keep writing `"plugin.js"` and `"icon.png"`. The kit's `validate.mjs` refuses
  `"./plugin.js"` for that reason. [Details](manifest.md#entry-dot-slash).
- **Your logs help when a recommended plugin fails.** For a plugin in Kino's recommended catalog, a
  failed call's last 30 `kino.log` lines (scrubbed, 2 KB) go with the error report as `plugin_log`.
  Log steps and statuses, never what the person typed or a secret. [`kino.log`](kino-api.md#log).
- A live channel never shows a download button, even in a plugin that declares `download`.

!!! note "About the version of each item"
    These items are in the builds released as 0.9.46 to 0.9.49; the exact version in which each one
    first appeared was not checked.

## Kino 0.9.45 { #v0945 }

**Contract (`contract.json`, `maxApiVersion` 5):**

- **Signed plugins, `apiVersion` 5.** Optional author signature in `kino-plugin.json`
  (`node sdk/seal.mjs --keygen`, `--sign`; `validate.mjs` checks it), key pinned at first install,
  "Firmado por su autor" on the consent sheet, "Firmado" badge, the author key in the details. It
  needs Kino 0.9.45+; older apps refuse an `apiVersion` 5 manifest. Earlier drafts of these docs said
  0.9.46: it shipped in **0.9.45**. [Signed plugins](signed.md).
- **No maximum number of `hosts`.** The old limit of 20 is gone (only the manifest's 16 KB bounds
  it). Kino 0.9.44 and older still refuse more than 20, and the kit warns about it.
  [The manifest](manifest.md).
- **`kino.apiVersion`** reports 5.

**Behavior you may notice (no manifest change):**

- **Sending to the TV (Chromecast and DLNA) works for plugin titles.** Direct for mp4/webm and HLS
  with no `headers`; through the phone when you set `headers`; never for DRM, DASH, progressive
  MPEG-TS or a format nothing identifies. [Sending to the TV](what-people-see.md#cast).
- **Plugins follow the person across their devices** (phone and TV): installs, switches, approvals,
  settings and passwords (encrypted) sync, and the other device installs your plugin from the same
  address. [Plugins on other devices](what-people-see.md#sync).
- **Install addresses** can also be a `raw.githubusercontent.com/.../kino-plugin.json` (or
  `manifest.json`, for Nuvio) URL, or a `github.com/.../blob/...` one; a ref that only comes from a
  pasted URL is not a pin. [Index](index.md), [Nuvio scrapers](nuvio.md).
- **HLS downloads**: `EXT-X-DISCONTINUITY` is kept as is unless the format changes at it; a bad key
  or an empty segment ends as "Este video no se puede descargar"; a retry resumes only with the same
  content. Downloads stay declarative: `"download"` in `capabilities`, nothing to export.
  [Downloads](manifest.md#downloads).
- **M3U channel headers**: `#EXTHTTP`, `url|User-Agent=...` and `#KODIPROP` headers are read; only
  `User-Agent`, `Referer`, `Origin` and `Cookie` are kept. [Live channels](live-channels.md).
- **`kino.fetch`**: refused redirect hops count toward the 60-request limit, at most 6 fetches in
  flight, at most 3 host questions per call, IPv6 forms of private addresses refused, no device
  proxy. A plugin converted from a Nuvio scraper gets 250 requests and a 75 s `resolve`.
  [Limits](engine-limits.md).

!!! note "About the version of each item"
    The contract file states the version only for signed plugins and the host limit (0.9.45). The
    other items above are in the build that was released as 0.9.45; the exact version in which each
    one first appeared was not checked.

## Already there before 0.9.45 { #earlier }

`streamHosts: "any"` (apiVersion 4), `liveStreamHosts: "any"` (apiVersion 3 plus the `channels`
capability), `fetchHosts: "any"` (written by Kino into converted Nuvio scrapers only, never for your
plugin), and the question Kino asks the person the first time a stream uses a host you did not
declare. They are documented in [the manifest](manifest.md#stream-hosts),
[live channels](live-channels.md) and [the contract](contract.md#forgotten-host).
