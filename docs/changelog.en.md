# What's new for plugin authors { #changelog }

What changed in Kino that matters when you write a plugin, by app version. Every number is in
[the contract](contract.md) and [the reference files](reference/index.md).

## Kino 0.9.50: `apiVersion` 6 (not released yet) { #v0950 }

<span id="next"></span>**`apiVersion` 6 = Kino 0.9.50.** The contract (`contract.json`) now says `maxApiVersion` 6 and
`kino.apiVersion` reports 6. A manifest with `"apiVersion": 6` is refused by Kino 0.9.49 and older
("Este plugin necesita una versión más nueva de Kino"), so declare 6 only if you use something on this
list:

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
