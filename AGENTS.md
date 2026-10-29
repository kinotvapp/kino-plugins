# AGENTS.md: building a Kino plugin with an AI assistant

You are helping a person write a **Kino plugin**: a public GitHub repository with one JSON manifest
(`kino-plugin.json`) and one JavaScript ES module (`plugin.js`) that Kino, an Android app for phones
and TVs, runs inside a QuickJS sandbox. The plugin turns one source into search results, Home rows,
episodes and playable streams: video, live TV channels, and (from apiVersion 8, Kino 0.9.54) music and
podcasts; or, with `"catalogOnly": true`, a catalog that plays nothing (lists, ratings); or, with the
`syncProvider` capability (apiVersion 12, Kino 0.9.74), the transport of the person's own Kino sync
between their devices. apiVersion 13 (in development for the next Kino version, **not in any released Kino**) adds
sockets, streams and images the plugin serves itself, a SQLite catalog, a larger storage and QR codes. apiVersion 14
(with Kino 0.9.74 as well, the next version, **not published yet**) adds **screens**: a full-screen canvas the plugin
describes as a JSON tree that Kino draws on the phone and the TV, plus player-panel tabs on any title, rooms over the
Internet, background jobs, small results shared between the person's devices and Kino's text AI. apiVersion 15 (the
next Kino version after that, **not published yet**) adds `identity` (who the person is, without a sign-up),
`notifications` (notices in the Home bell) and `pluginStore`: a plugin that is a **store**, a source of plugins for
Kino's own store.

Your job: produce a plugin that **Kino accepts and that actually plays**, verified with the Node kit
before anyone installs it. Kino is strict: every rule below is enforced by the app, not a style
suggestion. When this file and your prior knowledge disagree, this file and the guide win.

## 0. The plugin's UI: screens first

For any plugin that needs its own screen, configuration, onboarding, dashboard or panel, build it with **Kino's screens
UI**: apiVersion 14, the `screen` capability with the `screen()` and `screenEvent()` exports, Flutter-style components
(`Scaffold`, `AppBar`, `TabBar`, `ListTile`, `Card`, `Form`, `TextField`, the `settings` node...), per-size values,
the phone and the TV drawn from the same tree. Keep the old settings form and the legacy panel format only for
compatibility. apiVersion 14 arrives with Kino 0.9.74 (not published yet): to stay installable on older Kinos, keep your
`apiVersion` and offer the screen through [`enhancements`](https://kinotvapp.github.io/kino-plugins/en/enhancements/). Put the code in `src/` and bundle it to
`plugin.js` with esbuild (generated, committed, checked with `check:built`:
[Structure a bigger plugin](https://kinotvapp.github.io/kino-plugins/en/structure/)). Validate with `node sdk/validate.mjs .` and `node sdk/run.mjs . screen`
(also `--device tv`). Follow the component catalogue ([layout, content and actions](https://kinotvapp.github.io/kino-plugins/en/screen-components/),
[forms, overlays and navigation](https://kinotvapp.github.io/kino-plugins/en/screen-forms/), [state, style and recipes](https://kinotvapp.github.io/kino-plugins/en/screen-reference/)) and the
[TV focus rules](https://kinotvapp.github.io/kino-plugins/en/screens/#tv-focus): Kino draws its focus ring only on nodes the person can press; a node the remote
must stop on just to read it gets `"canRequestFocus": true`.

## 1. Read first, in this order

1. This file, whole.
2. The complete guide as one text file: <https://kinotvapp.github.io/kino-plugins/llms-full.txt>
   (English; the same pages in Spanish live at <https://kinotvapp.github.io/kino-plugins/>). If you
   cannot fetch it, read at least these pages, in order:
   [The contract](https://kinotvapp.github.io/kino-plugins/en/contract/),
   [The manifest](https://kinotvapp.github.io/kino-plugins/en/manifest/),
   [The `kino` API](https://kinotvapp.github.io/kino-plugins/en/kino-api/),
   [Limits and engine quirks](https://kinotvapp.github.io/kino-plugins/en/engine-limits/),
   [Test it locally](https://kinotvapp.github.io/kino-plugins/en/test-locally/),
   [Publishing](https://kinotvapp.github.io/kino-plugins/en/publish/),
   [Signed plugins](https://kinotvapp.github.io/kino-plugins/en/signed/),
   [What's new](https://kinotvapp.github.io/kino-plugins/en/changelog/), and for live TV
   [Live channels](https://kinotvapp.github.io/kino-plugins/en/live-channels/), and, when the plugin hands its titles to
   another installed app to turn them into a playable stream (apiVersion 11, Kino 0.9.66; the
   `externalResolve` capability),
   [External resolver apps](https://kinotvapp.github.io/kino-plugins/en/resolver/), and, when the plugin
   carries the person's Kino sync between their devices (apiVersion 12, Kino 0.9.74; the `syncProvider`
   capability), [Sync providers](https://kinotvapp.github.io/kino-plugins/en/sync-providers/), and, only when the
   person accepts that the plugin will not install on any released Kino yet (apiVersion 13, in development),
   [Sockets and plugin-served bytes](https://kinotvapp.github.io/kino-plugins/en/bytes/),
   [Catalog and large storage](https://kinotvapp.github.io/kino-plugins/en/catalog/),
   [Images from the plugin](https://kinotvapp.github.io/kino-plugins/en/images/) and
   [QR codes](https://kinotvapp.github.io/kino-plugins/en/qr/), and, for a plugin with its own screen, a player-panel tab,
   rooms, background jobs or the text AI (apiVersion 14, Kino 0.9.74, not published yet):
   [Screens](https://kinotvapp.github.io/kino-plugins/en/screens/), the component catalogue ([1](https://kinotvapp.github.io/kino-plugins/en/screen-components/), [2](https://kinotvapp.github.io/kino-plugins/en/screen-forms/),
   [3](https://kinotvapp.github.io/kino-plugins/en/screen-reference/)), [Rooms, the library and player control](https://kinotvapp.github.io/kino-plugins/en/rooms/),
   [Background jobs, shared results and AI](https://kinotvapp.github.io/kino-plugins/en/jobs-and-shared/), [The player panel](https://kinotvapp.github.io/kino-plugins/en/player-panel/#screen-kit),
   [Screens without raising your apiVersion](https://kinotvapp.github.io/kino-plugins/en/enhancements/) and [Structure a bigger plugin](https://kinotvapp.github.io/kino-plugins/en/structure/).
   For a plugin that is a store of plugins, or that uses the person's identity or the Home bell (apiVersion 15, not
   published yet): [Plugin stores](https://kinotvapp.github.io/kino-plugins/en/plugin-stores/),
   [Example stores](https://kinotvapp.github.io/kino-plugins/en/store-examples/),
   [Identity](https://kinotvapp.github.io/kino-plugins/en/identity/) and
   [Notices in the bell](https://kinotvapp.github.io/kino-plugins/en/notifications/). For apiVersion 6
   features, the page of each one (and, for an overview of everything a plugin can change in how Kino
   shows it, [Customize your plugin](https://kinotvapp.github.io/kino-plugins/en/customize/)):
   [The settings form](https://kinotvapp.github.io/kino-plugins/en/settings-form/),
   [Signing every request](https://kinotvapp.github.io/kino-plugins/en/signed-streams/),
   [Moving saved titles](https://kinotvapp.github.io/kino-plugins/en/migrate/),
   [Section, categories and colors](https://kinotvapp.github.io/kino-plugins/en/section-theme/),
   [Logs and telemetry](https://kinotvapp.github.io/kino-plugins/en/diagnostics/),
   [Hidden browser](https://kinotvapp.github.io/kino-plugins/en/browser/). For a plugin that finds its links through Nuvio scrapers (apiVersion 11, Kino 0.9.71):
   [Plugins that use Nuvio scrapers](https://kinotvapp.github.io/kino-plugins/en/nuvio-plugins/) -- the manifest, the four `kino.nuvio` calls, the limits and a complete example plugin to copy.
3. The machine-readable contract: `contract.json` (every number and rule) and `kino.d.ts` (every
   shape and the whole `kino` API), at <https://kinotvapp.github.io/kino-plugins/reference/contract.json>
   and <https://kinotvapp.github.io/kino-plugins/reference/kino.d.ts>, and also in the template.
4. The complete reference: `plugin.js` and `kino-plugin.json` in
   [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) -- raw at
   <https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/plugin.js> and
   <https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/kino-plugin.json> -- use
   nearly every feature up to apiVersion 7 a plugin can have ("Tu servidor" 1.5.0): every setting type
   and the settings form, a session, `kino.storage`, downloads, copies, request signing, `live` items
   and `channels` in every shape, a section, `migrate`, `meta`, `subtitles`, `tracking` and
   `segments`. Study it whenever the plugin needs settings, auth,
   downloads or live channels. For a plain plugin with no settings or login, read
   `plugin.js` in [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
   instead, the simpler reference for the five basic capabilities. For **music or podcasts**, read
   [Music and podcasts](https://kinotvapp.github.io/kino-plugins/en/contract/#music-podcasts) in the
   contract (apiVersion 8, Kino 0.9.54) and `plugin.js` in
   [kinotvapp/kino-plugin-archive-audio](https://github.com/kinotvapp/kino-plugin-archive-audio), the
   reference audio plugin (`music` and `podcast` items, `episodes` for every audio ref). For a **sync
   provider** (apiVersion 12, Kino 0.9.74), the references are three public repositories:
   **Sync-Gram** (`kinotvapp/kino-plugin-sync-gram`, id `sync-gram`, a Telegram bot of the
   person's own: `"hosts": ["api.telegram.org"]`, a multipart upload through `kino.fetch` without decoding
   the blob, `action.link` + `setSettings` to link the chat, `help` + `link` settings, `keySecret`) for a
   provider on a third-party service, and **Sync Servidor** (`kinotvapp/kino-plugin-sync-server`, not listed, installed as
   `kinotvapp/kino-plugin-sync-server/plugin`; id `sync-server`, a
   single-file Node server with `GET`/`PUT /blob`, `If-Match` and 409, `"fetchHosts": "any"`) for a
   provider on a server the person runs, and **Sync-Gram Cuenta** (`kinotvapp/kino-plugin-sync-gram-account`, not
   listed, installed by pasting `kinotvapp/kino-plugin-sync-gram-account`; id `sync-gram-account`, apiVersion 13: the
   person's own Telegram account over MTProto on `kino.ws`, `["syncProvider", "socket", "storageLarge"]`,
   `sync.generateKey`, a one-shot `"sync": false` two-step password in `provision`, a `"sync": false` phone `text`,
   `settingsStatus` `hide` by sign-in stage, a TV-only `qr` login) for a provider on the person's own account. All
   three have tests that run offline against a local imitation of the service.

Do not rely on memory of other plugin systems (Kodi, Stremio, Cloudstream…): the contract is different.

## 2. Before writing code, settle these with the person

- **The source**: the site or API, and whether it needs a login, an API key or a server address the
  person types. Credentials always come from `settings` (type `password` for secrets), never from
  the code.
- **The hosts**: every host your code calls **and** every host the video, subtitles, audio tracks,
  HLS/DASH segments and keys, and redirects land on. Look at real responses (`curl -sIL`) to find
  redirect targets and CDNs.
- **What it offers**: movies, series (with `episodes`), Home rows (`home`, and `browse` for "Ver más"),
  live channels (`live` items at apiVersion 2, or the En vivo tab with `channels` at apiVersion 3), music
  and podcasts (`kind: "music"` / `"podcast"` items, apiVersion 8). A catalog with **no video of its own**
  (a TMDB list, ratings) declares `"catalogOnly": true` (Kino 0.9.54, any apiVersion; older Kino ignores
  it), and still declares and exports a `resolve` that throws `kino.error("not_found", …, { userMessage })`
  plus `search` or `home`, so Kino 0.9.53 and older keep installing it.
- **The lowest `apiVersion` that works**: `1` unless you need `download`, `drm`, `insecureHttp`,
  `"hosts": []`, or `live` items (`2`), `channels`/`liveStreamHosts` (`3`), or a `list` setting,
  `"streamHosts": "any"` or sealed `secrets` (`4`), or an author `signature` (`5`, Kino 0.9.45+), or
  anything in "apiVersion 6" in section 4 (`6`, **Kino 0.9.50+**; Kino 0.9.49 and older refuse the
  whole plugin with "Este plugin necesita una versión más nueva de Kino"). `apiVersion` 6 = Kino
  0.9.50: never declare 6 "just in case". `7` only for `tracking` or `segments` (Kino 0.9.51+); `8` only
  for `music`/`podcast` items or the optional `details(ref)` export (a movie's own details for its title
  page; Kino 0.9.54+; Kino 0.9.53 and older refuse an apiVersion 8 plugin). From
  apiVersion 8 `details` is a reserved export name: never export a helper called `details`. `9` for the
  player panel, `settingsLayout`, the `labelEn`/`hintEn`/`confirmEn` texts or a hand-written
  `"fetchHosts": "any"` (Kino 0.9.55+); `10` only for `playlists` (Kino 0.9.65+); `11` only for
  `externalResolve` / `externalResolver` (Kino 0.9.66+) or the `nuvio` capability (`kino.nuvio`, Kino 0.9.71+;
  older Kino refuses an apiVersion 11 plugin); `12` only for `syncProvider`, the manifest's
  `sync` block or a `link`/`help` setting (**Kino 0.9.74+**; Kino 0.9.73 and older refuse an apiVersion 12
  plugin). An action's `setSettings` and `link` answers need no new apiVersion (Kino 0.9.74; older Kino
  ignores them). `13` only for `socket`, `byteSource`, `storageLarge`, `catalog`, `qrScan`, `imageSource` or a
  `qr` setting, `syncProvider` next to `socket`/`storageLarge`/`catalog`/`qrScan` without `resolve`/`search`/`home`,
  `setSettings` on a `password`, `sync.generateKey`, a `"sync": false` password in `sync.provision`, `settingsStatus`
  `hide` or `"sync": false` on a `password`/`text`: **Kino 0.9.74, the next release, not published yet** (every Kino before 0.9.74 refuses an apiVersion
  13 plugin, as it refuses 12), so use it only when the person agrees to wait for Kino 0.9.74, and say so plainly. `kino.crypto`'s byte
  operations (`aesIge`, `aesIgeVerify`, `modPow`, `gunzip`, `convert`) are gated on the Kino version, not on the
  manifest (Kino 0.9.74 has all five, an older Kino none): feature-detect each one with
  `typeof kino.crypto.convert === "function"` and keep a fallback.
- **Whether to sign it** (optional, `apiVersion` 5): ask whether the person wants people to know every
  update comes from them. If yes, follow "Signing" in section 4. Never sign without telling them
  what it is and that the key must be kept and backed up.
- Whether the person has the right to use the source. Do not help circumvent DRM: the only DRM path
  is a Widevine license the source itself hands out (the `drm` capability).
- **Offline downloads**: declare `download` (apiVersion 2) when the source allows saving titles.
  Kino (phones only) saves a movie or episode that is a progressive file (`mp4`, `mkv`, `webm`,
  `ts`…) or an HLS VOD stream (AES-128 keys fine; discontinuities kept unless the video/audio codecs
  change at one, which is refused); a live stream, DASH, SAMPLE-AES or any DRM never downloads. A
  download never asks about a host: a refused server ends it for good (the person plays the title
  once to approve a server playback would ask about, then downloads again).
- **Whether plain `kino.fetch` is enough** (it almost always is): fetch the real pages with `curl` and
  look for the video address in the HTML, JSON or a script. Only if a server's embed builds the address
  by running its own scripts does the plugin need the hidden browser (`"browser": true`,
  `kino.browser.capture`, apiVersion 6, a red consent line): see "The hidden browser" in section 4. If
  the site shows a captcha or "verify you are human", tell the person Kino cannot use that source that
  way: **never** try to get around it.
- **Several servers or languages per title?** Plan labelled lazy copies (apiVersion 6): resolve one,
  list the rest as `{ label, ref }` (section 4).
- **Optional apiVersion 6 extras to offer only when they fit**: a settings form with a status line and
  action buttons (an account to link and a "Cerrar sesión"), a section of its own and Categorías
  tiles, colors, `adult` marks for 18+ content, `telemetry` so its errors reach Kino's error tracker,
  `migrate` when the plugin replaces an older one. Each has a cost (approval prompts, more code): ask.
- **A sync provider?** Only when the person wants their Kino data (library, history, progress,
  settings, plugins) to travel between their devices through a service instead of the local network:
  a bot, a storage API, a server they run. Settle with them: the service, the **long random token** it
  gives each person (it becomes the required `sync.keySecret`: the plugin and its service CAN read the
  data, shown in red; a service without such a token cannot be a provider), what a second device needs
  (`sync.provision`), and the hosts. It is not a way to add content.
  See "Sync providers" in section 4.
- If the person wants a **Nuvio scraper**, stop: Kino installs Nuvio repositories directly
  ([Nuvio scrapers](https://kinotvapp.github.io/kino-plugins/en/nuvio/)); no plugin needs writing.
- If the person wants a **CloudStream plugin** in Kino, stop too: from Kino 0.9.54 Kino installs the plugins of a
  CloudStream repository directly, through its CloudStream complement
  ([CloudStream plugins](https://kinotvapp.github.io/kino-plugins/en/cloudstream/)); `kino.cloudstream` exists only in
  those generated plugins, never in one you write.
- If the person wants a **Stremio addon** in Kino, stop too: Kino installs it from its `manifest.json`
  URL ([Stremio addons](https://kinotvapp.github.io/kino-plugins/en/stremio/)). Write a Kino plugin only
  for what an addon cannot do there (torrents and P2P are refused either way).

**The person may not program.** Explain each step in plain Spanish, run the commands yourself (say
which and why first), ask before anything irreversible (deleting files, pushing, publishing), and
give exact clicks for what they must do on GitHub or in Kino. Ask for the full terminal output or the
exact message Kino shows, never a summary.

## 3. Workflow

1. **Start from the template, not a fork** (Kino's community search leaves forks out). Use
   `kinotvapp/kino-plugin-archive` for a plain plugin (no settings, no login); use
   `kinotvapp/kino-plugin-own-server` instead when the plugin needs settings, auth, downloads or
   live channels; for music or podcasts, follow `kinotvapp/kino-plugin-archive-audio` (the reference
   audio plugin):
    - `gh repo create my-plugin --public --template kinotvapp/kino-plugin-archive --clone` (swap the
      template name for `kinotvapp/kino-plugin-own-server` when that fits better), or
    - `git clone https://github.com/kinotvapp/kino-plugin-archive` (or `-own-server`) somewhere
      else, then `node kino-plugin-archive/sdk/init.mjs my-plugin --host example.com` and copy its
      `sdk/` and `contract.json` into `my-plugin/` (the kit looks for `contract.json` next to
      `sdk/`). `init.mjs` never overwrites a file.
2. **Write `kino-plugin.json`**: a new `id` (`^[a-z0-9][a-z0-9-]{1,39}$`, never a reserved one, never
   changed after release), `name`, `version` `0.1.0`, the lowest `apiVersion`, `entry`, `hosts`,
   `capabilities`, `settings` if needed, `description` in Spanish.
3. **Implement one named `export async function` per declared capability** (`search`, `home`,
   `browse`, `episodes`, `resolve`; `liveCategories` + `liveChannels` (+ optional `guide`, and optional `liveSearch` for a
   catalog too big to list whole: `liveSearch({ query })` returns channels like a `liveChannels`
   page, with the same `id`s; export it only if the source can really search) for `channels`; `migrate`
   for `migrate`; `meta` for `meta`; `subtitles` for `subtitles`). `download`, `drm` and `scopedSearch` are declarative: nothing to export. Other
   exports are required by a manifest field, not a capability: `section` (by `"section"`),
   `settingsStatus` (by a `status` setting), `action` (by an `action` setting), `sign` (by any stream
   with `signing: "request"`), `panel` (by `"panel"`, apiVersion 9; `panelAction` and `playerEvent` are optional); `categories` (needs `browse`) and `validateSettings` are optional.
   `syncProvider` (apiVersion 12) requires `syncPull` and `syncPush` (`syncStatus` optional), each taking one
   object argument (`null` for `syncStatus`). `byteSource` (apiVersion 13) requires `read` and `imageSource`
   (apiVersion 13) requires `image`; `socket`, `storageLarge`, `catalog` and `qrScan` are declarative.
   Return plain JSON only.
   Kino loads exactly one file (`entry`), with no `require` and no module resolver, so do not split
   source across files that `plugin.js` imports at runtime. If the plugin is big enough to want more
   than one file for its own sake, write it split (e.g. `src/plugin.js` importing from
   `src/animeav1.js`) and bundle it to a single `plugin.js` before validating or publishing:
   `npx esbuild src/plugin.js --bundle --format=esm --outfile=plugin.js`. `plugin.js` is always the
   finished, single-file output — never hand-edit it if a `src/` exists.
4. **Validate the manifest and exports**: `node sdk/validate.mjs .` must exit 0.
5. **Run every function against the real source** and read what Kino would drop (stderr):

    ```
    node sdk/run.mjs . search "algo"
    node sdk/run.mjs . home
    node sdk/run.mjs . browse <row-ref>
    node sdk/run.mjs . episodes '<series-ref>'
    node sdk/run.mjs . resolve '<ref>'
    node sdk/validate.mjs . --run search "algo"
    ```

    For live channels: `node sdk/run.mjs . live categories`, `node sdk/run.mjs . live channels <categoryId>`,
    `node sdk/run.mjs . live guide <id,id>`, `node sdk/run.mjs . live search <query>` (for `liveSearch`), `node sdk/run.mjs live playlist <url|file> [--epg <url|file>]`,
    and `resolve <ref> --live` for a channel's ref. Settings: `--config key=value` (repeatable) or
    `sdk/config.json` (never committed). apiVersion 6: `node sdk/run.mjs . section [tab]`,
    `. categories`, `. theme`, `. settingsStatus`, apiVersion 9: `. panel <ref> [tab]`, `. panelAction <ref> <key> <press|change|submit>`, `. playerEvent <ref> <type>`, `. action <key>`, `. validateSettings '<json>'`,
    `./plugin.js migrate '{"kind":"title","ref":"…"}'`, `--within '<ref>' ./plugin.js search "…"`,
    `./plugin.js sign '{"url":…,"kind":"segment","ref":…,"context":…}'`,
    `--retry conflict:1 ./plugin.js resolve '<ref>'`, and `node sdk/validate.mjs . --run liveSearch <q>`
    for the 18+ marks. Lines marked `[dropped by Kino]` are what the app would drop.
6. **Record fixtures and test offline**: `node sdk/run.mjs --record test/fixtures.json . search "algo"`,
   then `node --test test/plugin.test.mjs` (the scaffold's test: it validates the manifest and
   replays the fixtures offline). Name the file explicitly: a bare `node --test test/` does not work
   on every Node version, and a bare `node --test` would also run the kit's own suite. The kit's
   tests (`node --test sdk/test/kit.test.mjs`) are only for someone changing the kit (you should not).
7. **Check what Node hides** (the kit is more permissive than Kino): grep `plugin.js` for the
   missing globals (section 4) and for any `throw` before the first `await` of an async function.
8. **Publish**: public repository, `kino-plugin.json` and `plugin.js` at the root, `.gitignore` with
   `.kino-storage.json`, `.kino-cookies.json`, `.kino-secrets.json`, `sdk/config.json`; tag a release (`v1.0.0`);
   add the topic and a one-line GitHub description:
   `gh repo edit owner/repo --add-topic kino-plugin --description "…"` (or, on the repo page,
   About → ⚙ → Description + Topics → Save changes). Write a good Spanish `name` and `description` in
   the manifest: that is what Kino's cards show (see section 6). The person installs it from Kino (on
   a phone: menu ☰ → Plugins → the + button; on a TV: Ajustes → Plugins → Agregar), typing
   `owner/repo` → Agregar → Instalar, and must try it in the app (search, episodes, play, and download
   if declared). The same field ("Escribe usuario/repositorio de GitHub o pega la URL del manifest
   (kino-plugin.json)") also takes the URL of the `kino-plugin.json` (GitHub `blob`/`raw`,
   raw.githubusercontent.com or `cdn.jsdelivr.net/gh/owner/repo@<exact ref>/…`, which all become
   `owner/repo`; jsDelivr needs an exact ref such as `@main` or `@v1.0.0`, `@latest` is the default
   branch, a range like `@1` is refused). From the Kino version after 0.9.49 a plugin can also live
   **outside GitHub**, shared as the `https` URL of its `kino-plugin.json` on any public server (the
   file must be named exactly that; `entry`/`icon` are read next to it; no IPs, `localhost` or local
   names). Such a `url:` install cannot use sealed `secrets` (refused), always counts as unsigned,
   updates from that same URL, and is never listed in "De la comunidad" (discovery only finds GitHub
   repositories with the topic). Recommend GitHub + topic unless the person has a reason not to.
9. **Updates**: raise `version` every time (an equal or lower version never reaches anyone). Adding
   hosts, `permissions`, `download`, `drm`, `channels`, `migrate`, `telemetry` (or `true` → `"verbose"`),
   `liveStreamHosts`, `streamHosts`, `browser` (or `true` → `"pages"`), an `insecureHttp` host, or `secrets` to a plugin that had none
   makes the update wait for the person's approval; so does adding `syncProvider` or `sync.keySecret`
   (never approved on its own). From Kino 0.9.50 updates are also checked at app
   start (at most every 12 h), a badge counts the waiting ones, and a failed call of a plugin whose
   update waits says "Hay una versión nueva de <name>: actualízala en Ajustes ▸ Plugins".

## 4. Hard rules (with the exact numbers)

**Network**

- `kino.fetch` reaches only the manifest's `hosts` (and servers the person typed in a `url`
  setting), over `https`, checked on **every redirect hop**. `*.example.com` does **not** cover
  `example.com`: list both. No IPs, no `localhost`, no `.local`/`.lan`/`.internal`/`.localhost`/`.home.arpa`,
  no bare `*`, no scheme/port/path in `hosts`. At least 1 entry (`[]` only from apiVersion 2 with a
  `url` setting) and **no maximum from Kino 0.9.45**; Kino 0.9.44 and older refuse more than 20 (the
  kit warns "Más de 20 hosts: ..."), so with more than 20 hosts tell the person it needs 0.9.45+. During `resolve` and `episodes` only, a fetch to an undeclared `https` host asks the
  person (the call's clock stops meanwhile) -- at most 3 hosts per call, and none after the person
  rejects one; everywhere else it just fails as `host_not_allowed`. Declared names that resolve into
  the home network (including IPv6 prefixes embedding such an address) are refused, and plugin
  traffic never goes through a device proxy.
  Likewise, when the person opens a title, an undeclared `https` host of the returned `Stream` (video,
  subtitle, audio track, license) or one the player meets mid-playback is asked about once; a
  download or anything in the background is never asked. Never design around those questions:
  declare every host.
- Kino strips `Accept-Encoding` (and `Host`, `Content-Length`, `Transfer-Encoding`, `Connection`,
  `Cookie2`) from your headers and always hands you decompressed bodies.
- The `Stream` URL, subtitles, `audioTracks`, every HLS variant/segment/key, DASH `BaseURL`, and the
  `drm` `licenseUrl` must be on those same hosts. Images (`poster`, `backdrop`, `still`, `logo`) are
  the only exception: any `http` or `https` URL (a public IPv4 is fine), never a private address or local name.
- Plain `http` only for a server the person typed, or a host declared
  `{ "host": "…", "insecureHttp": true }` (apiVersion 2, no wildcard; shown in red to the person).
- **`"entry"` and `"icon"` never start with `./`.** Write `"plugin.js"`, not `"./plugin.js"`: Kino
  0.9.45 and older refuse the `./` (`El campo "entry" debe ser una ruta relativa a un archivo .js`)
  and the plugin does not install (an AI-generated plugin did exactly this and failed for about 35
  installs). Kino 0.9.46 and later tolerate it, but never rely on that. The kit's `validate.mjs` refuses it.
- `"liveStreamHosts": "any"` (apiVersion 3 + `channels`) frees only live channel streams, never
  `kino.fetch`, playlists, subtitles, licenses, movies or images.
- `"streamHosts": "any"` (apiVersion 4) lets what the plugin plays be on any public host: for a movie
  or episode the video, its manifest, redirects, `subtitles` and `audioTracks` (and its download);
  for a channel the `liveStreamHosts` rule. Never `kino.fetch`, images or DRM licenses, never the
  home network. Shown in red; prefer listing real domains. The person can grant the same rule
  themselves ("Permitir video de cualquier servidor", the broad video permission).
- `"fetchHosts": "any"` (Kino converts Nuvio scrapers with it; a hand-written plugin may use it from
  apiVersion 9, Kino 0.9.55) lets `kino.fetch` reach hosts you did not declare, without a question per host.
  The person approves it with a red consent line ("Puede conectarse a cualquier servidor público de internet
  (solo https, nunca tu red local)"). Only `https` on port 443, to a dotted public name or a public IPv4
  address; never the home network; a request budget (60 a minute per site, 600 every 10 minutes per plugin,
  else `rate_limited`). Declared `hosts` keep their own rules and spend no budget, so declare the primary
  sites and use it only for hosts that rotate. Check `kino.fetchAnyHost === true`. Below apiVersion 9 it is
  ignored in a hand-written plugin (`sdk/validate.mjs` says so). From apiVersion 4 any value but `"any"` is refused.
- `kino.device` (Kino 0.9.55, every apiVersion) is `"tv"` or `"phone"`, the UI Kino shows on this device; `undefined` on an
  older Kino, so treat anything but `"tv"` as the phone. Use it for what really differs on a TV box (fewer items per
  request, wording that says "en el control" instead of "toca"). The kit says `"phone"` unless `run.mjs --device tv`.
- `kino.seed(session)` (Kino 0.9.55, every apiVersion) is ONLY for a source that hands anonymous guest sessions to anyone
  and blocks regions from logging in: share ONE brand-new guest session you just created and proved works, never the
  person's own, at most once every few hours per device (keep the time in `kino.storage`), behind a setting the person can
  turn off, and mention it in the plugin's description. Feature-detect `typeof kino.seed === "function"`. Kino keeps only
  `sn`, `userId`, `userToken`, `jwtToken`, `mintedAt`, `customer`, `activeTime`, `availableTime` (the first three required),
  and sends them to its own error board only with the person's telemetry consent. Never add it to a plugin that does not
  need it. Reference: [kino.seed](https://kinotvapp.github.io/kino-plugins/en/kino-api/#seed).

**The engine is QuickJS, not Node, not a browser.** Missing: `setTimeout`, `setInterval`,
`setImmediate`, `queueMicrotask`, `Buffer`, `process`, `require`, `fetch`, `AbortController`,
`structuredClone`, `performance`, `crypto`, `WeakRef`, `Intl`. Present: `URL` (no punycode),
`URLSearchParams`, `atob`, `btoa`, `TextEncoder`, `TextDecoder` (UTF-8), `console` (`URL` has the
usual setters: `url.hostname = …` works). The extra globals Nuvio-converted scrapers get
(`setTimeout`, `AbortController`, `crypto.subtle`, `require`…) are **not** available to your plugin. Use
`kino.fetch`, `kino.sleep`, `kino.crypto`, `kino.storage`, `kino.html.select` (only in the app; the
Node kit's version throws). No `import`: one file; bundle anything else into it. `localeCompare`
and `toLocaleString` do not localize. No network calls at the module's top level (install loads it
offline). Never write a synchronous infinite loop: it cannot be interrupted.

**Limits** (from `contract.json`)

| What | Limit |
| --- | --- |
| Manifest / entry file / icon | 16 KB / 1 MB / 128 KB |
| Memory / stack | 64 MB / 1 MB |
| Time per call | `syncPull` and `syncPush` 60 s, `syncStatus` 15 s (apiVersion 12); `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s; `details` 20 s (apiVersion 8) (`resolve` 75 s for an approved `"browser": true` or `"pages"` plugin, and for one Kino generates from a Nuvio scraper or a Stremio addon); `liveCategories`, `liveChannels`, `guide` 20 s; `liveSearch` 15 s; `subtitles` 10 s; `track` 10 s and `segments` 8 s (apiVersion 7); apiVersion 6: `section`, `categories`, `validateSettings` 20 s, `settingsStatus` 10 s, `action` 30 s, `migrate` 10 s, `sign` 1.5 s; `meta` 6 s per plugin (no answer after that); all fetches and sleeps count (not the time the person spends answering a host question) |
| Module top level | 10 s |
| Idle sandbox | closed after 5 minutes |
| Timeouts | 3 in a row disable the plugin ("No responde") |
| `kino.fetch` | 15 s default, 30 s max; body 5 MB; request 1,048,576 characters (a `{ base64 }` body counted as its base64 text; inside `syncPull`/`syncPush` only, request, body and the answer up to ceil(`sync.maxBlobBytes` × 4/3) + 65,536); 60 requests per call (every redirect hop counts, refused ones too); 6 in flight at once; 3 host questions per call; 10 redirects |
| Cookies | 50 per domain, 64 KB total |
| `kino.storage` | 256 KB; `ttlMs` 1..2,592,000,000 (30 days) |
| `kino.sleep` | 0..5,000 ms |
| `kino.meta` (Kino 0.9.53) | 30 calls a minute per plugin; 8 s at most, inside your call's own limit; answers cached 30 minutes |
| `kino.tmdb` (Kino 0.9.53) | 40 calls per 10 s per plugin; 15 s per call; body 2 MB; not counted in `kino.fetch`'s 60 requests |
| `kino.crypto` | 5 MB data; PBKDF2 100,000 iterations, 64-byte keys; `randomBytes` 1,024; `modPow` 4,096 bits (next Kino) |
| `kino.ws` (apiVersion 13, in development) | `wss://` to a declared host, port 443; 4 sockets; 8 MiB queued unread per socket; 786,000 bytes per frame sent (decoded); `recv` ≤ 60 s |
| `byteSource` (apiVersion 13, in development) | `read` 20 s, one at a time, ≤ 1 MiB at an offset multiple of 4,096; `handle` 1..512 chars; 2 streams open on the device (+2 served to TVs); 3 timed-out reads in a row stop the stream |
| `kino.catalog` (apiVersion 13, in development) | 100,000 items and a 64 MiB file; `id` 1..128, `title` 300, `data` 4,096 bytes of JSON; 500 per `upsert`/`get`/`remove`; `search` `limit` ≤ 100, `offset` ≤ 1,000,000, `q` ≤ 256 |
| `storageLarge` (apiVersion 13, in development) | 16 MB total, 2 MB per value, 1,000 keys of ≤ 256 chars; device-only, never synced, not in backups |
| `kino.qr.scan` / `qr` setting (apiVersion 13, in development) | only from a settings `action` or `panelAction`, phone only; 120 s; `title` ≤ 80; scanned text ≤ 4,096; a `qr` setting's text ≤ 512, `refreshMs` 2,000..60,000 |
| `image` (`imageSource`, apiVersion 13, in development) | 10 s; base64 JPEG/PNG/WebP ≤ 262,144 bytes decoded; `handle` 1..512; one call at a time per plugin, never while a byte stream of yours plays |
| Log message | 2,000 characters; for a plugin with `"telemetry"` (apiVersion 6; no other plugin sends lines), a failed call's last 30 lines (300 chars each, scrubbed, 2 KB) go with the error report: log steps and statuses, never what the person typed, a secret or a setting value |
| Return value | 2,000,000 characters of JSON |
| Results | `search` 100; `home` 20 rows × 60; `browse` 100/page; `episodes` 5,000 (+50 `seasons`); `ref` 4,096 chars; `next` 2,048 chars; `id` `^[A-Za-z0-9._~-]{1,128}$` |
| Live (apiVersion 3) | 200 categories; 500 channels/page, 10 pages at first then 5 more per scroll, up to 10,000 channels (200 pages)/category; `liveSearch` keeps 100 channels, asked from 2 characters; `guide` 50 channels, 24 h, 100 entries/channel; `number` 1..9999 |
| Settings | 12 with a value, plus 16 `section`/`status`/`action`/`link`/`help` (apiVersion 6; `link`/`help` apiVersion 12, 4 of each, link `url` 2,048, help `title` 60 and `body` 2,000); `text` 500, `url` 2,048, `password` 500 characters; a `list` holds up to `max` entries (1..50, default 20), each of 1..4 `text`/`url` fields; `status` text 200, action `message` 300, `confirm` 120, `clearSettings` 12 keys |
| `secrets` (apiVersion 4) | 16; names `^[A-Za-z][A-Za-z0-9_]{0,31}$`; values 1..4,096 bytes (1..8,192 at apiVersion 6); typed cipher keys 16/24/32 bytes (apiVersion 6) |
| Stream (apiVersion 6) | `alternatives` 8 (any apiVersion; lazy and concrete together); `label` 48 chars; lazy `ref` 512 chars; `alternateHosts` 6; `signContext` 4,096 chars; 3 `resolve` retries |
| Hidden browser (apiVersion 6) | one page at a time in the whole app; `capture` `timeoutMs` ≤ 25,000 (default 18,000), ≤ 8 media, 10 subtitles; `page` `timeoutMs` ≤ 25,000 (default 15,000; Kino cuts it to the call's remaining time minus 1.5 s; pass ~12,000 in `search`), never from `categories`, top document on your hosts, 20 reads a minute; automatic fallback waits ≤ 20 s per lazy copy |
| Player panel (apiVersion 9) | `panel`/`panelAction` 20 s, `playerEvent` 5 s; 40 top-level elements, 120 nodes, depth 4, 6 per row; title 60, button/input label 40, text 1,000; 6 tabs; values 50 keys per scope, 500 characters; `message` 160 |
| `kino.nuvio` (apiVersion 11, Kino 0.9.71) | 20 calls a minute per plugin; 1 to 4 `nuvioRepos`; up to 12 scrapers per `use`/`streams` call (`streams` asks 4 at a time); 60 s per scraper (`timeoutMs` 2,000 to 60,000); installs 45 s each; `available` up to 200 scrapers; scraper filter up to 64 ids; query 4,096 characters; `resolve` 75 s |
| Section / categories (apiVersion 6) | label 20; 8 tabs × 24 chars; hero text 300; 24 category tiles, titles 40 |
| Error text | `kino.error` detail 200 characters; `userMessage` 160 (apiVersion 6) |
| Sync provider (apiVersion 12) | blob ≤ `sync.maxBlobBytes` ≤ 4,194,304 bytes decoded; `pullEveryMs` ≥ 30 s, `pushDebounceMs` ≥ 5 s; 60 rounds an hour; `provision` 8 keys; `kino.sync.remoteChanged()` once per 30 s; action `setSettings` 8 keys, link `candidate` 64 characters |

**Home categories** (the optional "Home por categorías"; the full vocabulary and aliases are at
<https://kinotvapp.github.io/kino-plugins/en/categories/>): preferably group the plugin's content in
Kino's categories. Put `genre` on each `home()` row (a type id sets the item's type; a genre id or a new category makes every item of the row belong to that genre row and each item's `kind` sets its type; the Home is one flat list of category rows, no tabs; types: `peliculas`, `series`, `anime`, `doramas`,
`infantil`, `documentales`, `clasicos`, `deportes`, `noticias`, `entretenimiento`, `otros`; audio: `radio`,
`podcasts`, `audiolibros`, `conciertos`, `musica`) and `genres` on each item (genre ids such as `accion`,
`comedia`, `drama`, `terror`, `suspenso`, `ciencia-ficcion`, `romance`; or the source's own names, which Kino
maps when they are known aliases). Invent a new category only when nothing fits: from the next Kino release a
row's `genre` accepts any category, canonicalised (a known id or alias maps to the base id; anything else is a
slug, lowercase ASCII `[a-z0-9-]`, at most 40 characters, appended after the known ones merged with another plugin's row only when the spelling matches). Live categories and playlists keep the closed ten-id `genre`. Send `ids.tmdb` and `year` so one title
is one card across sources (identity: TMDB id, else normalised title + year, else title); genre rows mix every type; thematic types (`anime`, `doramas`, `infantil`, `documentales`, `clasicos`, `deportes`,
`noticias`) also have a full row of their own; `peliculas`, `series`, `entretenimiento` and `otros` get a row only for
titles with no genre (there is no "Más títulos" row); audio goes in its own square-cover rows at the end; the row order
is fixed (see the categories page).

**Data rules that silently drop things**: an item `id` outside `^[A-Za-z0-9._~-]{1,128}$` (derive a
slug); a repeated `id`; `adult: true` below apiVersion 6 (from 6 it is kept behind the person's 18+
code); a `series` without the `episodes` capability; a `live` item at apiVersion 1, or in a `home` row
below apiVersion 6; a `music` or `podcast` item below apiVersion 8; an episode `number` 0; images that are not `http`/`https` or point at a local
address; in `search`, a `live` item whose name shares too few words with the query (so never
answer a search with your whole channel list). `id` must be stable across calls (library
and progress hang off it); `ref` may change but must keep working later (put a stable id in it and
look fresh links up inside `resolve`). A `Stream` is all or nothing; `mime` must look like
`video/mp4` or be omitted.

**Audio items (apiVersion 8, Kino 0.9.54)**: `kind: "music"` is an album, a playlist or a single
track; `kind: "podcast"` a show, an audiobook or a radio program; optional `artist` (`music` and
`podcast` only, ≤ 200 characters) is the artist, or the host or author. They need no capability. With
`episodes` declared, `episodes(ref)` must answer for **every** `music` and `podcast` ref, even a lone
track (one entry); without it, the item's own `ref` goes to `resolve`. Full rules:
[Music and podcasts](https://kinotvapp.github.io/kino-plugins/en/contract/#music-podcasts).

**Playlists (apiVersion 10, Kino 0.9.65)**: a contract only -- no installed or announced plugin uses
it, and Kino itself doesn't call any of these six exports anywhere on screen yet; do not present it as
something already live in the app. The `playlists` capability lets a plugin expose the
person's own playlists on its own service -- not the pre-existing `KinoPlaylist` M3U/IPTV list the
person pastes under En vivo, and not `sign`'s `kind: "playlist"` (an HLS playlist request to sign);
all three are unrelated despite the name. Six exports, every one independently optional and needing
no approval prompt (unlike `channels`, which requires two and does need one): `playlists()`,
`playlistItems(arg)`, `playlistCreate(arg)`, `playlistAddItem(arg)`, `playlistRemoveItem(arg)`,
`playlistReorder(arg)`; declare the capability and export only the ones your service actually
supports. `playlistItems` answers the same `Page` shape as `browse`. Full rules:
[Playlists](https://kinotvapp.github.io/kino-plugins/en/contract/#playlists).

**Another app resolving what you found (`externalResolve`, apiVersion 11, Kino 0.9.66)**: for the one
case where a plugin can identify what it found but cannot produce a playable URL itself and a separate,
independently-installed resolver app can. Declare the declarative `externalResolve` capability (nothing to
export) and, to name the app, the manifest's `externalResolver` (`{ package, apk?: { url, sha256, label? }, fdroid?: true, downloader?: { code } }`,
the `apk` a GitHub release asset, `fdroid` meaning the same package is in F-Droid, `downloader.code` 3 to 10 digits for TV sideloading); then `resolve()` (or one entry of `alternatives`) answers
`{ external: { protocol, ref, resolver? } }` instead of `{ url }`. `protocol` is a string you choose (1 to 64 of
`a-z 0-9 . _ -`; Kino never interprets it), `ref` is opaque (1 to 2048 characters, no control characters), and
the plugin never learns which app handled it or how. Kino asks the person once per app, shows the app's live
progress, validates its answer like a plugin's own (DRM and a second `external` refused) and plays it. The
answer may carry an advisory `media` and a `portable` universal HLS copy for casting. Nothing guarantees an app is
installed: do not present it as always available, and give the title a fallback when you can. If you do not
need it, do not use it. Full rules, what the person sees and the cast caveats (Chromecast and DLNA each tried on one real receiver, with an HLS answer):
[External resolver apps](https://kinotvapp.github.io/kino-plugins/en/resolver/).

**Sync providers (`syncProvider`, apiVersion 12, Kino 0.9.74)**: only when the person wants their Kino
sync to travel through a service (a bot, a storage API, a server they run) instead of the local network.
Kino keeps all the logic (what syncs, merging, scheduling), compresses and encrypts the snapshot
(AES-256-GCM) and hands the plugin an opaque blob; the plugin moves bytes. Full rules:
[Sync providers](https://kinotvapp.github.io/kino-plugins/en/sync-providers/).

- **Exports**, each with ONE object argument: `syncPull({ maxBlobBytes })` → `{ blob, version }` or `null`
  when nothing is stored; `syncPush({ maxBlobBytes, blob, expectedVersion })` → `{ version }`; optional
  `syncStatus(null)` → `{ ready, message? }`. `blob` is standard base64 (RFC 4648, padded, no line breaks)
  both ways: store it and return it **byte for byte**, never decode or re-encode it. `version` is a
  non-blank string of yours; `expectedVersion` is the one Kino last pulled (`null` if none).
- **Conflict**: when the service can tell the remote changed since `expectedVersion`, throw
  `kino.error("conflict", "…")`; Kino pulls, merges and pushes again (it stops after a few retries). Without
  compare-and-set, ignore `expectedVersion` (last write wins). Throw `auth_required` when settings are
  missing or refused: the person reads "al proveedor le falta configuración, revísala en Configurar".
- **`syncStatus`**: one cheap request, never the blob. Kino asks it before every round: `ready: false`
  skips the round quietly (asked again a pull period later, or when settings are saved); its `message`
  (scrubbed) is the provider row's line. During a failed round the person reads Kino's own reason, not your
  error text, so put guidance in the `message`.
- **The manifest's `sync` block** (needs the capability): `mode` `"poll"` (default) or `"realtime"`;
  `pullEveryMs` (default 600000, floor 30 s); `pushDebounceMs` (default 300000, floor 5 s); `maxBlobBytes`
  (default and maximum 4194304 = 4 MiB, decoded); `keySecret` and `provision`, both **required** (a
  `syncProvider` without them is refused: `The "syncProvider" capability needs a "sync" field whose
  "keySecret" is the key of one of the plugin's own "password" settings`). Kino runs at most 60 rounds an
  hour, pushes after the last change of a burst, and the playback position only when playback stops.
- **`keySecret`** = the `key` of one of the plugin's own `password` settings, with no `default`, holding a
  **long random token** (bot token, API key, a token the server prints), never a password a person picks
  (offline guessing). Kino derives the key from it on each device (HKDF-SHA256), so a second device needs
  only the same settings and **the key never travels**; but the plugin and its service CAN then read the
  data, and the consent line says so in red ("Sincronizará tus datos a través de su servicio: el plugin y
  su servicio podrán leerlos"), the only consent line a provider has (on the install sheet and the switch-on
  confirmation, not on the provider's card). With `"generateKey": true` (apiVersion 13) Kino writes 32 random bytes
  as hex into the empty `keySecret` setting itself (when the provider is switched on and when "Enviar configuración"
  is pressed), for a service with no shared secret of its own; the key still comes from that setting.
  Changing the token changes the key ("El token no coincide o los datos guardados no son de Kino"): the
  person fixes the token or taps "Restablecer sincronización" (this device's copy replaces the stored one;
  other devices keep syncing if they use the same token, else they must receive the new one with "Enviar
  configuración" or have it typed).
- **`provision`** = at most 8 of the plugin's own valued settings that "Enviar configuración" ("Send settings";
  the other device shows "Recibir configuración") hands to a
  second device (QR or typed address and a 6-digit code, over the local network or a Cloudflare quick
  tunnel whose words are public, so the code, 5 attempts, single use, 3 minutes and the person's
  "Recibido para <plugin>: ¿aplicar?" are the gate); it must include `keySecret`. Fill what you
  find yourself (a chat id) with `setSettings` so the person types nothing.
- **Size**: inside `syncPull`/`syncPush` only, `kino.fetch` requests (JSON, base64 body included),
  response bodies and the call's answer may reach ceil(`maxBlobBytes` × 4/3) + 64 KB; every other call
  keeps 1 MB / 5 MB / 2,000,000. A 4 MiB blob needs 25-30 MB of the 64 MB engine memory: never make extra
  copies of it (build a multipart body around its base64, as Sync-Gram does). `syncPull`/`syncPush` 60 s,
  `syncStatus` 15 s.
- **`kino.sync.remoteChanged()`** (Kino 0.9.74, only with `mode: "realtime"`, else `not_allowed`): tell Kino
  the remote moved so it pulls now; at most one signal per 30 s, dropped during a pull; call it from
  `syncStatus`, never from `syncPull`. Feature-detect `typeof kino.sync === "object"`.
- **Hosts and secrets**: declare the service's hosts. A server the person runs at an unknown address needs a
  `url` setting or `"fetchHosts": "any"` (public https only, never the home network: a server at home needs
  a public tunnel). Never put the token in an error, a status line or a log; scrub the service's own error
  texts. Kino logs only the host of each plugin request.
- **Testing**: `node sdk/validate.mjs .` checks the `sync` block and prints the consent line; `run.mjs` has no
  sync command: write `node --test` tests like the examples (`loadPlugin` from `sdk/sandbox.mjs`,
  `createKino` from `sdk/kino-shim.mjs`, `checkSyncAnswer` from `sdk/contract.mjs`) against a local imitation
  of the service, with a 4 MiB blob both ways and a conflict.

**apiVersion 14 (Kino 0.9.74, not published yet; every older Kino refuses it, so offer these through `enhancements`
when the plugin must keep installing there)**. Each has its own page, read it whole before using it:

- `screen` → exports `screen(ctx)` (answers a tree of nodes) and `screenEvent(ev)` (answers `{ state, toast, go, ui,
  config, ... }` or `null`), and the manifest's `screen` block (`label` 1..20, `icon`/`iconFile`, `menuOpens`,
  `opensFrom`, `settingsIn`...). May be the plugin's only capability; no consent line. Kino keeps the state (your runtime
  closes when idle): never keep it in a variable. Limits: depth 10, 600 nodes, 500 items per list, state 64 KB, a text
  2,000 characters, 20 s per call. <https://kinotvapp.github.io/kino-plugins/en/screens/>
- `playerPanelTab` → `"panel": { "contributes": true }` and the `panel` export: a tab in the player panel of any
  plugin's title (`"kinds": ["live"]` for live channels), red consent line. <https://kinotvapp.github.io/kino-plugins/en/player-panel/#contributed-tab>
- `library`, `playerControl`, `room` → read what the person watched and saved, pause/seek the video from a panel,
  rooms over the Internet hosted on the person's device; each a red consent line the person can switch off; `room` and
  `playerControl` never stand alone. Room messages are untrusted and low-sensitivity only. <https://kinotvapp.github.io/kino-plugins/en/rooms/>
- `schedule` (manifest `jobs`, export `job(ctx)`), `shared` (`kino.shared`), `ai` (`kino.ai.ask`) → background runs
  (20 s, 10 requests, 2 MB, 96 a day), up to 4 small JSON values synced between the person's devices (never a secret;
  what `get` answers is untrusted), and one short ask to Kino's text AI (never throws; the reply is untrusted: validate
  every field, never execute it). <https://kinotvapp.github.io/kino-plugins/en/jobs-and-shared/>
- `kino.fetch` `maxBytes` / `stopAt` read only the head of a page (`r.truncated`). A toggle's or select's
  `"unlockWith": "adultCode"` asks the 18+ code before moving it away from its default. <https://kinotvapp.github.io/kino-plugins/en/kino-api/#fetch>
- Test with the kit: `node sdk/run.mjs . screen`, `--device tv`, `--state '{...}' . screenEvent <name>`,
  `. panel <ref>`, `--foreign <id>:<Name> . panel <ref>`, `--device phone . job <id> manual`, `. shared`;
  `KINO_AI_REPLY` / `KINO_AI_ERROR` / `KINO_AI_REVOKED=1`. <https://kinotvapp.github.io/kino-plugins/en/test-locally/#api14>

**apiVersion 13 (in development, the next Kino version; no released Kino accepts it)**: use these only when the
person needs them and accepts the wait; never present them as already in the app. Each has its own page, read it whole
before using it:

- `socket` → `kino.ws.open("wss://host/path")` to a host in `hosts` (port 443, never an IP or the LAN), at most 4 sockets.
  Ask for frames as strings, `recv(ms, { encoding: "hex" })` / `send(hexOrB64, { encoding })`: a JavaScript loop over
  1 MiB of bytes costs about a second on a phone. Close what you open. Keep sessions in sealed secrets or `kino.storage`.
  <https://kinotvapp.github.io/kino-plugins/en/bytes/>
- `byteSource` → `resolve()` answers `{ source: "plugin", handle, size, mime }` (no `url`); export
  `read({ handle, offset, length })` answering `{ bytes: <base64> }` of exactly that range (fewer only at the end), in
  under 20 s. Build the base64 with `kino.crypto.convert(hex, "hex", "base64")` or a `kino.crypto` step's
  `outputEncoding: "base64"`, never in a JavaScript loop. Never declare `download` for such streams. Check it with
  `node sdk/run.mjs . resolve <ref>` (it accepts the byte-stream shape with the app's rules) and
  `node sdk/run.mjs --size <total bytes> . read <handle> <offset> <length>`, and write a Node test with `askRead` or a
  fake `globalThis.WebSocket`, as the page's example does. `node sdk/init.mjs … --with byteSource,images,catalog,socket`
  scaffolds an apiVersion 13 plugin with an example of each.
- `catalog` → `kino.catalog.upsert/search/get/remove/clear/count` for thousands of records: index from `home()` a few
  pages per call, answer `search()` from the catalog only, keep `data` small, rebuild when `count()` is 0 (it is never
  synced or backed up). <https://kinotvapp.github.io/kino-plugins/en/catalog/>
- `storageLarge` → `kino.storage` at 16 MB but **device-only and out of backups, and it moves the existing keys there**:
  credentials go in sealed secrets or settings.
- `"sync": false` on a `password` setting → its value stays on the device where it was typed (a two-step
  verification password sent once and then cleared with `clearSettings`); `sync.provision` may name it as a one-shot
  secret (sent once, only while it holds a value), never as `keySecret`. On a `text` (a phone number shown as typed)
  too, but never in `sync.provision`; on no other type; only a boolean.
  <https://kinotvapp.github.io/kino-plugins/en/settings-form/#sync-false>
- `settingsStatus` may answer `hide: [setting keys]` (≤ 32, the plugin's own) → the form does not draw them while that
  answer is current (values kept, rules unchanged); a `qr` with no text draws nothing.
  <https://kinotvapp.github.io/kino-plugins/en/settings-form/#status-hide>
- `qrScan` → `kino.qr.scan({ title })` only from an `action` or `panelAction`; `unavailable` on a TV; handle `null`,
  `timeout`, `permission_denied`, `busy`. A `qr` setting (no capability) shows a code from `settingsStatus()`, refreshed
  every `refreshMs`. <https://kinotvapp.github.io/kino-plugins/en/qr/>
- `imageSource` → `poster`/`backdrop`/`still`/hero `image` may be `{ source: "plugin", handle }` only when no public URL
  exists; export `image({ handle })` answering `{ bytes: <base64>, mime }` (JPEG, PNG or WebP, ≤ 256 KB); try it with
  `node sdk/run.mjs --out poster.jpg . image <handle>`. Never put a secret in a handle: it is saved and synced like a
  poster URL. <https://kinotvapp.github.io/kino-plugins/en/images/>

**Configuration aids and action answers (Kino 0.9.74)**: a `"type": "link"` setting (`label`, `url`
`https://` only, no user info, ≤ 2,048; a button that opens it through the system only on the person's tap;
on a TV, the address and a QR; Kino makes no request to it) and a `"type": "help"` setting (optional
`label`, `title` ≤ 60, `body` ≤ 2,000 plain text, `titleEn`/`bodyEn`; a modal titled with the plugin's
name), at most 4 of each, no value, apiVersion 12. Keep a help short: what the plugin needs and where to get
it; link to a full guide. An `action` may answer `setSettings: { key: "value" }` (≤ 8 of the plugin's own
`text`/`select` settings, and from apiVersion 13 a `password` (sealed, never logged, scrubbed from the answer), never
`url`, `toggle`, `list`; saved and synced like typed values,
without `validateSettings`; any bad entry refuses the whole field) and `link: { candidate, confirm }` (Kino
asks "¿Eres tú, <candidate>?" in its own words; `candidate` 1 to 64 plain characters; `confirm` is
**another** `action` key without its own `confirm` question; only "Sí, soy yo" runs it, once). Both are
ignored by older Kino: also say in `message` what to do. Mark that confirm action `"linkOnly": true`
(apiVersion 12) so it is never drawn and the person sees one button. Any settings item may carry
`"devices": ["phone"]` or `["tv"]` (apiVersion 12): it is drawn only there, but its value is still stored,
synced, provisioned and read through `kino.config`; a sync provider draws its setup on the phone only,
because the TV receives it with "Recibir configuración". Kino itself puts a "Sincronización ▸
Proveedor" button at the top of every provider's page and a per-device "Sincronizar cada" on its card
(`pullEveryMs` is only the default).
[The settings form](https://kinotvapp.github.io/kino-plugins/en/settings-form/#aids).

**Feature-detect what older Kino lacks**: `kino.meta` and `kino.tmdb` (Kino 0.9.53, no new apiVersion)
only behind `typeof kino.meta === "function"` / `typeof kino.tmdb === "function"`; the hidden
browser's `captureAll`, `alsoMatch`, `waitForCookie` and `returnCookiesOnTimeout` options (Kino 0.9.54) only when
`kino.browser.captureAll === true`. TMDB goes through `kino.tmdb`: never put a TMDB key in the code.

**Errors**: `throw kino.error(code, detail)` with one of these codes; the person reads Kino's Spanish
sentence, your detail (cut at 200 characters) goes to the log.

| Code | The person sees |
| --- | --- |
| `auth_required` | "Configura {plugin} en Ajustes ▸ Plugins" (from Kino 0.9.50 "… Ajustes ▸ {plugin}" when it has settings: its own tab), with a button to Configurar |
| `not_found` | "No se encontró en {plugin}" |
| `geo_blocked` | "Este contenido no está disponible en tu región" |
| `rate_limited` | "{plugin} está limitando las peticiones; intenta en unos minutos" |
| `unavailable` | "{plugin} no está disponible ahora" |

**`userMessage` (apiVersion 6)**: `throw kino.error("not_found", "E100006", { userMessage: "Este capítulo
ya no está disponible." })` shows "Mensaje de <plugin name>: <sentence>" **instead of** Kino's line,
only for the five codes above and only if the sentence passes every safety rule; otherwise Kino's line
shows and the sentence is dropped silently. The rules, in short: 1 to 160 characters of Spanish/Latin-1
letters, digits and plain punctuation (no emoji, `@`, other scripts or invisible characters); at least
two words; no URL, domain, `www` or "punto com"; fewer than 6 digits in all, no digit glued to a
letter; never spells "Kino"; never asks for money, credentials, codes or contact (`pag…`, `recarg…`,
`transfer…`, `contraseñ…`, `clave…`, `token…`, `tarjeta`, `PIN`, Nequi, Daviplata, WhatsApp, Telegram,
SMS/verification codes); never contains a password the person typed or a sealed value. The plugin
name itself must be plain (no `:`, no digit glued to a letter). **A plugin that uses `userMessage` to
ask for money, credentials or contact outside Kino breaks the rules for plugins.** Each author is responsible
for their own plugin; Kino only lists community plugins (no recommendation or promotion), and removes one
that breaks the rules (asking for money, passwords or contact data, malware, rights claims) from the
community index through [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json); anyone can report it with the
["Reclamo / retiro de plugin"](https://github.com/kinotvapp/kino-plugins/issues/new?template=reclamo-retiro-plugin.yml) issue template. An installed copy stays installed, shows
"Retirado del índice de la comunidad." and gets no more updates; a fork needs its own report. Build it where you
throw, write it in Spanish, and never echo what the person typed. Full rules:
[Your own sentence](https://kinotvapp.github.io/kino-plugins/en/contract/#user-message).

`kino.fetch` does not throw on non-2xx (check `r.ok`); it throws with `e.code` one of
`host_not_allowed`, `timeout`, `network`, `too_large`, `invalid_request`. `kino.crypto` errors carry
`code: "crypto_error"`.

**The unhandled-rejection trap**: in Kino 0.9.49 and older a `throw` inside an `async` function
**before its first `await`** aborts the whole call even if the caller wraps it in `try`/`catch` (also
`return Promise.reject(e)` and a `new Promise` rejected at once). Kino 0.9.50 catches it like Node; only a
rejection nobody ever handles still fails the call. The Node kit does not show the old behaviour.
Since people update late, keep `await`ing first (a fetch, or `await null;`) and validate after.

**Language**: everything the person sees (the manifest's `name` and `description`, settings `label`
and `hint`, Home row titles, error details, badges) is **Spanish from Bogotá, with tuteo** ("Configura",
"Escribe tu usuario"), **never voseo** ("Configurá", "Escribí" are wrong). From Kino 0.9.54 the app may
speak English, and `kino.lang` is then `"en-US"` (before, always `"es-CO"`): texts your code builds
at run time (row titles, a `userMessage`) follow `kino.lang`'s language. Code, identifiers and
comments may be English.

**Secrets**: never hardcode a password, token, API key or cookie in `plugin.js` or the repository;
ask for it in a `settings` entry of type `password`, keep derived tokens in `kino.storage` keyed by
user and server, and never log a setting. A `url` setting cannot have a `default` (use `hint`).
A fixed key that belongs to the plugin's author (not the person) can be **sealed** instead:
`node sdk/seal.mjs --repo owner/repo --name apiKey` prints `kino-sealed:v1:…` for the manifest's
`"secrets"` (apiVersion 4); the code uses `kino.secret("apiKey")` (fine at module top level too),
a marker Kino swaps for the
value only inside `kino.fetch`, toward the manifest's `hosts` over https, and redacts from everything
the code reads back. It is obfuscation, not secrecy; seals only open when the plugin is installed
from its default branch (no `@ref`); the Node kit reads plain values from `.kino-secrets.json`
(never commit it). Full rules: [Sealed secrets](https://kinotvapp.github.io/kino-plugins/en/manifest/#secrets).

**Downloads are declarative.** `"download"` in `capabilities` (apiVersion 2) is a flag the app acts
on: export nothing extra, there is no separate "resolve for download" call (Kino calls your
`resolve(ref)` when the queued download actually runs). Progressive files and non-live HLS save;
DASH, live, SAMPLE-AES and DRM never do. Phones only.

**Signing (apiVersion 5, Kino 0.9.45+, optional).** The author signs `plugin.js` with their own
Ed25519 key; the manifest carries `"signature": { "authorKey": <64 hex>, "value": <128 hex> }`;
Kino checks it at install and at every update (never at runtime), pins the key at the first install
(trust on first use) and refuses an update signed with another key or no longer signed. People see
"Firmado por su autor" and a "Firmado" badge. It does not hide the code. Full page:
[Signed plugins](https://kinotvapp.github.io/kino-plugins/en/signed/). When the person wants it:

1. Explain it in plain Spanish first. Then `node sdk/seal.mjs --keygen` **once** (writes
   `kino-author-key.pem`; refuses to overwrite). Add `*.pem` to `.gitignore` **before any commit**
   (the scaffold's `.gitignore` does not have it). Tell them to back the key up and never share it:
   there is no recovery, and a new key makes every existing install refuse the update (they must
   uninstall and reinstall). **Never put the key in the repository, the chat or a log.**
2. Set `"apiVersion": 5`, then `node sdk/seal.mjs --sign --repo owner/repo[/folder]` **after the last
   change** to `plugin.js` or `version`, and **again after every later change** (the signature covers
   the exact entry file, repo, `id` and `version`).
3. `node sdk/validate.mjs . --repo owner/repo` verifies it and fails if a `.pem` is tracked.
4. If it says "La firma del autor no es válida…", the code, `id`, `version` or repo changed after
   signing: sign again. If a person reports "firmada con otra clave de autor", the key changed.

**apiVersion 6 (Kino 0.9.50+): every widening, when to use it, its limits.** Declare `"apiVersion": 6`
only when you use one of these.

- **Typed / larger sealed secrets.** Values up to 8,192 bytes; a key for `kino.crypto` can be sealed as
  `{ "seal": "kino-sealed:v1:…", "use": "cipher-key", "encoding": "hex"|"base64" }`
  (`seal.mjs --use cipher-key --encoding hex`), 16/24/32 bytes, usable as the whole key of any cipher
  (DES-EDE3 too) and **nothing else**: never HMAC/PBKDF2 input, never in `kino.fetch`. Use it when a
  site's own player ships a fixed cipher key.
- **`migrate`** (capability + export, needs approval): Kino asks it about saved library titles,
  chapters and live favorites it can no longer open; answer what `search()` would return today, or
  `null`. 10 s each; avoid fetching; never return a `plg1:` ref. Use it only when the plugin replaces
  an older source or changes its ref format.
- **Request-signed streams** (`signing: "request"` + export `sign`): only for an HLS origin that wants a
  fresh signature on every playlist/segment request. `sign()` runs in a separate **signing lane**: only
  `kino.crypto`, `kino.secret`, `kino.config`, `kino.html`, `kino.log`; no network, no storage, no
  cookies, no sleep, no memory shared with the main runtime; 1.5 s per call; three failures stop the
  video. Everything it needs travels in `signContext` (a string ≤ 4,096 chars, never a `kino.secret`
  marker: call `kino.secret()` inside `sign`). No `drm`, no `audioTracks`, not downloadable, not for an
  inline channel stream. `resolve(ref, { retry: { reason: "conflict"|"expired", attempt, status } })`
  is called again on 409 or repeated 401/403 (3 tries). `alternateHosts` (≤ 6, same host rules as `url`)
  are other hosts serving the same stream. Casting works through the phone, which must stay on the
  same Wi-Fi. [Signing every request](https://kinotvapp.github.io/kino-plugins/en/signed-streams/).
- **Settings form**: `section` (heading), `status` (needs export `settingsStatus()` → `{ key: text }`,
  10 s) and `action` (needs export `action(key)` → `{ message?, refresh?, clearSettings? }`, 30 s,
  optional `confirm`) hold no value; at most 16 on top of the 12 valued settings. `clearSettings`
  empties up to 12 of the plugin's own optional valued settings (never `required` ones); use it for
  "Cerrar sesión". Optional `validateSettings(values)` (20 s) returns `null` to accept, a text, or
  `{ key: "message" }` to refuse. Every plugin with settings gets its own Ajustes tab; settings sync
  between paired devices and arrive **without** `validateSettings`, so key any `kino.storage` session
  by account and never store a device identity in a setting. A `toggle` without `default` reads
  `false`, a `select` without one its first option, a `list` an array of `{ [field key]: string }`;
  `confirm` only on `action`, `fields`/`max` only on `list`, `options` only on `select`. There are no
  conditional fields: group with a `section` and check combinations in `validateSettings`. Every type
  and attribute: [The settings form](https://kinotvapp.github.io/kino-plugins/en/settings-form/#types).
- **`debug: true`**: on-screen error panels and a "Registro" page (last 200 events); logcat tag
  `KinoPlugin/<id>` (and `KinoPlay` for playback metrics). Development only: **remove before
  publishing** (`validate.mjs` warns).
- **`telemetry: true | "verbose"`**: asks the person (consent line, and an update that adds it waits
  for approval) to share the failed call's scrubbed `kino.log` lines with Kino's error tracker; only
  plugins that declare it ever send lines (recommended or not). From Kino 0.9.54 each such plugin's
  Ajustes tab has an "Enviar registros de errores y de reproducción" switch, on by default and synced
  across the person's devices; older Kino always sends. `"verbose"` adds playback metrics of a sample of good plays and
  edge cases (60 events per run). `kino.log.report("myplugin:area", "code", "count=2")` flags a
  degraded-but-working result (area: lowercase namespaced word with `_` or `:`, ≤ 24 chars; 1/hour per
  area, 3 per run). Log codes and counts, never values from a response, never what the person typed.
  [Logs and telemetry](https://kinotvapp.github.io/kino-plugins/en/diagnostics/).
- **`section`** (`"section": { "label": "…" }` ≤ 20 chars + export `section({ tab })` →
  `{ tabs?, tab, hero?, rows }`, 20 s): a section of its own (TV sidebar, max 3 plugins; phone chip strip,
  max 8). **`categories()`** (needs `browse`, 20 s): up to 24 tiles in Categorías, each opening
  `browse(ref, null)`. **`theme`**: up to five `#RRGGBB` colors (`accent`, `onAccent`, `background`,
  `surface`, `highlight`); dark backgrounds only, contrast 3:1 / 4.5:1, nothing close to Kino's red
  `#E50914`; a failing color falls back to Kino's (accent+onAccent as a pair); errors are always Kino's
  red. Preview with `node sdk/run.mjs . theme`.
- **`scopedSearch`** (capability, needs `search`): your `search` gets `query.within` (the browse `ref`
  of a "Ver más" page) and answers inside that category; `null` means "let Kino filter". Kino gives up
  on you after 6 s. Without it Kino filters the loaded titles itself.
- **`adult: true`** on items, Categorías tiles, live categories and channels: kept and shown only while
  the person's 18+ code is unlocked (Ajustes ▸ Adultos). Below apiVersion 6 they are dropped. With an
  18+ live category, mark **every** `liveSearch` hit with `adult` or its `categoryId` (unmarked hits
  count as 18+). Never try to detect or bypass the lock: always send the mark.
- **Live channels in Home rows**: `kind: "live"` items now stay in `home` rows (a country's channels,
  for example); below 6 they are dropped from Home.
- **`kino.crypto` key pairs**: `generateKeyPair` (`ec` P-256/P-384, `ed25519`, `x25519`), `sign`,
  `verify`, `importKey`, `deriveSharedSecret`; private keys are handles that live only in the sandbox
  that made them (not in `sign()`'s lane), at most 64. For a player that proves itself by signing a
  challenge. Map Node/WebCrypto calls with the table in
  [The kino API](https://kinotvapp.github.io/kino-plugins/en/kino-api/#key-pairs).
- **`Stream.label` and labelled lazy copies**: `label` (≤ 48 chars, e.g. `"Latino · Servidor 1"`) names
  a copy in the player's **Servidor** menu; an alternative may be `{ label, ref }` (ref ≤ 512 chars) that
  Kino passes to `resolve(ref)` only when needed: the person picks it (whole `resolve` limit; if it fails
  they keep watching the copy they had), the automatic fallback reaches it (≤ 20 s, then the next copy),
  or a download's copy choice probes it (inside its 30 s budget). From that answer only `url`,
  `headers`, `mime`, `subtitles`, `expiresInSeconds` and `skip` are used; its own `alternatives` are
  ignored. Use it for **every** source with several servers or languages: never resolve all of them up
  front. [Labelled and lazy copies](https://kinotvapp.github.io/kino-plugins/en/contract/#lazy-copies).
- **`"browser": true`** (`kino.browser.capture`) or **`"browser": "pages"`** (capture plus `kino.browser.page`): see "The hidden browser"
  below.
- **`meta`** (capability + export `meta(query)`, no consent line, 6 s): fill a title's info page when
  TMDB/AniList have nothing (e.g. `kitsu:` anime); return `null` for titles you do not know.
- **Kino 0.9.53, no new apiVersion, always behind `typeof kino.<name> === "function"`**: `kino.meta(query)` asks Kino
  what it knows about a title (its own TMDB lookup, AniList, the person's other `meta` plugins; 30/min; `null` when
  unknown). `kino.tmdb(path, params)` is read-only TMDB v3 with **no key in your code**: Kino's own key first (behind its
  cache and limits: 20/10 s per plugin, 60/10 s for all), the person's key (Ajustes, or a Stremio addon's key they agreed
  to share) only when Kino's fails: never put a TMDB key in the code, and for a TMDB-based catalog prefer it
  over a `tmdbKey` setting (keep the setting only as the fallback for older Kino). Catch `no_tmdb_key` where an empty
  answer is better than an error (Home rows); uncaught, the person reads Kino's own sentence telling them where to add
  the key. [The `kino` API](https://kinotvapp.github.io/kino-plugins/en/kino-api/#tmdb).
- **Kino 0.9.54, no new apiVersion**: `kino.browser.capture` takes `captureAll`, `alsoMatch`,
  `waitForCookie` and `returnCookiesOnTimeout`, only behind `if (kino.browser.captureAll)` (older Kino ignores them).
  `kino.lang` follows the app's language (`"es-CO"` or `"en-US"`; before 0.9.54 always `"es-CO"`): word your
  `userMessage` and send `Accept-Language` from it. Kino's own error messages become English and may change: match on
  `e.code`, never on the text. [What's new](https://kinotvapp.github.io/kino-plugins/en/changelog/#v0954).
- **Any apiVersion**: `Stream.alternatives` (≤ 8 `{ url, mime?, headers? }`, other copies of the same
  video **in the same language** (never a dub next to the original: offer another language as another stream), best
  first; name the resolution in a `label` ("720p", "4K") so Kino 0.9.54 can move to a lighter copy after stalls; Kino switches when one cannot decode or is gone; ignored with `drm`, `signing` and
  for live). `Stream.skip` (`{ openingStartMs?, openingEndMs?, endingStartMs? }` for this exact file:
  "Saltar intro"/"Saltar outro"; wins over AniSkip, a hand correction wins over it). The `subtitles`
  export (10 s, background): tracks for any title Kino knows by IMDb/TMDB id, alongside your videos or
  as a pure subtitle provider (`"capabilities": ["subtitles"]` alone). The manifest's `categories`
  field (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`) only tags the
  plugin in the marketplace; it is not the `categories()` export. `settingsStatus()` is asked again after
  every `action` (no need for `refresh: true`).

**The hidden browser (`"browser": true` or `"pages"`, apiVersion 6, Kino 0.9.50+).** Rules, in order:

1. **Prefer `kino.fetch`.** Use the browser only for a server whose embed builds the video address by
   running its own scripts, after you checked the HTML, JSON and scripts with `curl`. It costs the
   person a red consent line ("Puede abrir páginas web ocultas para encontrar el video"), 5-25 s per page,
   and it never runs in the Node kit (`browser_unavailable` there): keep a `kino.fetch` path wherever one
   exists.
2. **`kino.browser.capture(url, { timeoutMs, headers, match, autoplay })` only inside `resolve`**, and
   only a `resolve` the person started (play or a download); anywhere else `not_allowed`. The start
   `url` must be on your `hosts`, https, public. It returns `{ media: [{ url, mime?, headers }],
   subtitles, finalUrl }`: return `media[0].url` with **its `headers`** (Referer, User-Agent, cookies…)
   as the Stream's `headers`. Add `"streamHosts": "any"` because the video lives on hosts you cannot list.
   An approved plugin's `resolve` gets 75 s: plan for two or three servers, not all of them.
3. **`kino.browser.page(url, { waitFor, timeoutMs })`**, only with `"browser": "pages"` (its own red line,
   "Puede abrir páginas web ocultas para mostrar contenido y encontrar el video"; `true` is capture-only and
   gets `not_allowed`; an update from `true` to `"pages"` asks the person again), returns `{ html, finalUrl, status, truncated }` for
   a site whose plain fetch only gets its automatic check page ("Just a moment…"): only from `search`,
   `home`, `browse`, `episodes`, `section` or `resolve` while the person is using the app (never
   background calls; **never from `categories`**, which is always Kino's own call), 20 reads a minute,
   Kino never touches the page. The top document must stay on your hosts: every redirect or navigation
   hop is checked, and the first one off your hosts ends the read with `blocked` (no HTML). Kino cuts
   `timeoutMs` to the call's remaining time minus 1.5 s; still pass ~12000 in `search`. Try `kino.fetch`
   first and cache with `kino.storage`.
4. **Never try to defeat a captcha or bot protection.** Kino never solves, clicks or ticks a CAPTCHA,
   Turnstile, hCaptcha, reCAPTCHA or "verify you are human": the call ends with `blocked`. Do not add
   solver services, fingerprint spoofing, stealth tricks, or retry loops; on `blocked`, `timeout` or
   `busy` move to the next server or return nothing. The author is responsible for their own plugin;
   Kino only lists community plugins (community search), it does not recommend or promote them (see
   "Community takedowns" for what happens to a plugin that breaks the rules).
5. **One page at a time in the whole app** (`busy`); a device without WebView gets
   `browser_unavailable`. Each page starts with no cookies and is wiped after; it never reaches the
   home network.
6. **Combine it with labelled lazy copies**: capture the first server in `resolve`, list the other
   servers/languages as `{ label, ref }`, and capture each only when its `ref` comes back. ([Maratón](https://github.com/xuper-plugin/maraton),
   a signed community plugin, works this way; "Tu servidor" stays the complete
   reference for everything else.) Full page:
   [Hidden browser](https://kinotvapp.github.io/kino-plugins/en/browser/).

**apiVersion 15 (the next Kino version, not published yet; every older Kino refuses it and none of these is offered
through `enhancements`)**. Each has its own page, read it whole before using it:

- `pluginStore` → a **store**: the plugin is a source of plugins for Kino's store. Kino keeps one local index of every
  store's entries, paints the store from it (cards, search, categories, sort, pagination, a "de <store>" badge and a store
  filter), applies its own blocklist and the 18+ code, and installs through its own consent sheet: **a store only hands over
  addresses and never installs anything**. Authors answer for the plugins they list; Kino only lists them. The store view
  has three tabs: "De Kino" (EN "From Kino"), Kino Plugins' default list; "De la comunidad" (EN "Community"), everything
  else from every store **without Kino's list**, with the "Populares"/"Recientes" sort, the store filter and the live
  stores; and "Instalados" (EN "Installed"). A reload icon syncs every store and ends with a toast, "Se actualizaron N
  plugins" or "Tus plugins están al día". Manifest:
  `"capabilities": ["pluginStore"]` (may stand alone: no `resolve`, no `search`) and an optional
  `"pluginStore": { "mode": "local" | "live", "name": 1..60 chars }` (the block without the capability is refused).
  - `storeSync({ reason: "schedule" | "reload", since?, state? })` → `{ full, entries, removed?, state? }`: `full: true`
    is the whole list (Kino replaces the store's rows), `full: false` is upserts plus `removed` addresses (an empty change
    means nothing changed); `state` (<= 16 KB of JSON) comes back on the next call. It runs only in the background (every
    2 h by default, Wi-Fi only) and on reload: at most 60 s, 40 `kino.fetch` requests and 8 MB downloaded. At most 5,000
    entries and 4 MB of JSON per answer. **`since` (and `state`) may be absent at any time, not only the first time:** when
    Kino loses a store's rows (a restore, a rebuilt database) it syncs that store from scratch, with no `since` and no
    `state`, and the store must then answer its whole list (`full: true`). Never rely on a stored cursor.
  - A **live** store (`"mode": "live"`) must export all three: `storeSync` (a base list), `storeList({ category?, sort:
    "popular" | "recent", cursor? })` and `storeSearch({ q, category?, cursor? })`, each answering `{ entries, next? }`, at
    most 5 s per call and 20 calls a minute per store, cached 30 minutes. Kino paints local entries first and appends live
    ones at the end as they arrive (nothing on screen moves, repeats of an address are skipped); a live store picked in the
    filter shows only its live answers. The person reads an extra red line (what they search reaches its servers).
  - `StoreEntry`: `address` (`owner/repo`, `owner/repo/path`, `owner/repo@ref` or `url:https://.../kino-plugin.json`; required
    unless `stremio`), `id` (`^[a-z0-9][a-z0-9-]{1,39}$`), `name` (1..60), `description` (<= 300), `longDescription`
    (<= 4000), `categories` (`movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`), `tags`,
    `icon` and `screenshots` (https), `version`, `author`, `popularity` (number), `updatedAt` (ms), `stremio`, `requires`,
    `needsSetup`, and the hints `signed`/`authorKey` (Kino re-checks at install). `recommended` is honoured only from
    Kino's own store (Kino Plugins). Invalid entries are dropped, long texts cut.
  - **One plugin per `id` across all stores.** If two repositories claim an id, the one in Kino Plugins' list wins; if none is
    there, one is kept deterministically and the rest are dropped. No store may list the id `kino-plugins` (Kino's own store).
    "De la comunidad" leaves out what "De Kino" shows. Leaving a store never uninstalls anything. 18+ entries stay hidden
    while the person's 18+ code is locked.
  - Consent lines: a store shows «Agrega plugins de sus servidores a tu tienda» and, if live, also in red «Lo que busques en la
    tienda llegará a sus servidores». The owner's blocklist is applied by Kino to every entry and refreshed with every store
    sync; Kino Plugins' daily index already leaves blocked repositories out. Kino Plugins ships inside Kino (version 1.0.2),
    signed with Kino's author key.
  - Kit: `node sdk/init.mjs my-store --host store.example.org --store local|live` scaffolds one;
    `node sdk/run.mjs . storeSync [--since <ms>] [--state '<json>']`, `storeList [popular|recent] [category]` and
    `storeSearch "<q>" [category]` print the answer as Kino's index keeps it and report what it drops. Copyable examples
    with offline tests: <https://kinotvapp.github.io/kino-plugins/en/store-examples/> (a local store over a static JSON file, a live
    store over its own API). <https://kinotvapp.github.io/kino-plugins/en/plugin-stores/>
- `identity` → declarative, never alone: `await kino.identity.telegram({ challenge? })` answers `{ id, token }` (`id` a
  per-plugin pseudonym of the person, `token` Kino's bot's signed token: a credential, **never log or show it**); with a
  `challenge` (16..128 of `A-Z a-z 0-9 _ -`, a nonce from the plugin's server) also `deviceKey`, `signature`, `author` and
  `codeHash`, so the server can bind a session to this device and require its own author fingerprint. **Only plugins
  signed with Kino's own author key get an answer**; any other gets `permission_denied`, so a community plugin must not
  depend on it. Only inside a call the person started (`screen`, `screenEvent`, `panelAction`), 10 a minute. Red consent line
  ("Podrá saber tu usuario de Telegram y enviarlo a sus servicios"), switchable in Ajustes. Kit: `KINO_IDENTITY_TG`,
  `KINO_IDENTITY_TOKEN`, `KINO_IDENTITY_AUTHOR`, `KINO_IDENTITY_REVOKED=1`. <https://kinotvapp.github.io/kino-plugins/en/identity/>
- `notifications` → declarative, never alone: `await kino.notifications.post({ id, title, titleEn?, text?, textEn?, go? })`
  and `clear(id?)` leave short notices in the Home bell. `id` is 1..64 of `A-Z a-z 0-9 . _ -` and replaces an earlier notice
  with the same id (group news under one id); `title` 1..80, `text` <= 160, plain one-line text; `go` is `{ screen: {
  route?, args? } }` (the plugin's own screen). From `screen`, `screenEvent` or the plugin's `job`; 20 posts an hour, 30
  kept, 30 days. Not synced between devices. Plain consent line ("Podrá mostrarte avisos en la campanita"), switchable in
  Ajustes. Kit: `node sdk/run.mjs . notifications` (it keeps `.kino-notices.json`), `KINO_NOTIFICATIONS_REVOKED=1`.
  <https://kinotvapp.github.io/kino-plugins/en/notifications/>
- `kino.library.watched()` also carries `season` and `episode` (the latest chapter played) on a watched series, never on a
  movie.

What Kino 0.9.50 does for every plugin, with no field: plays a plugin title on the paired TV through
the TV's own copy of the plugin (keep `id` and refs identical across devices), checks followed series
for new chapters through `episodes(ref)` (keep series refs stable), saves "Para ti" picks by `ref`,
and treats a **signed** plugin installed from two repos with the same `id` and author key as one
plugin across devices.

**The player panel (apiVersion 9, Kino 0.9.55).** `"panel": { "label", "labelEn?", "icon" | "iconFile" }` adds a
button in the player, only while a title of the plugin plays, and requires exporting `panel(context)`; optional
`panelAction(event, context)` answers presses, changes and submits, and `playerEvent(event, context)` hears
started/paused/resumed/ended/failed/copyChanged. `settingsLayout` arranges the settings form in rows, columns and
cards. Playback must never depend on any of it (older Kino refuses apiVersion 9). Full reference:
<https://kinotvapp.github.io/kino-plugins/en/player-panel/>.

**Nuvio scrapers as a link source (apiVersion 11, Kino 0.9.71, experiment).** Many Nuvio repositories hold dozens of working scrapers; a plugin can use them instead of writing its own scraper per site. Declare `"nuvio"` in `capabilities` and `"nuvioRepos": ["owner/repo"]` (1 to 4 GitHub `owner/repo` or https addresses of a Nuvio `manifest.json`; each requires the other; `kino.nuvio` refuses any repository not listed with `not_allowed`), plus `"streamHosts": "any"` because the videos come from each scraper's own hosts. Inside your functions (never at module load) call `kino.nuvio.available({ repo })` (what is offered: `id`, `name`, `types`, `languages`, `compatible`, `installed`), `kino.nuvio.use({ repo, scrapers })` (installs up to 12, 45 s each; `{ ready, failed }`), `kino.nuvio.scrapers({ repo })` (the installed ones) and `kino.nuvio.streams({ repo, type, tmdbId, season?, episode?, scrapers?, timeoutMs? })`, which answers `{ results, truncated }` with ONE entry per scraper (`{ scraper, ok: true, stream }` or `{ scraper, ok: false, code, message }`; a failing or slow scraper is never a throw). You turn those into one `Stream` (main copy + `alternatives`) in your `resolve`, deciding order, labels and what to drop. Limits: 20 calls a minute per plugin, up to 12 scrapers per call (`streams` asks 4 at a time), 60 s per scraper (`timeoutMs` 2000 to 60000), `resolve` gets 75 s. Torrent-only scrapers are never installed. The scrapers you install belong to your plugin: not listed in Instalados, removed with it. Always check `typeof kino.nuvio === "object"` first. The Node kit (`kino-plugin-sdk`, current version) knows `nuvio`: `validate.mjs` checks `nuvioRepos`, and `run.mjs` answers `kino.nuvio` from a fixture you write (`KINO_NUVIO_FIXTURE`, sample at <https://github.com/kinotvapp/kino-plugin-sdk/blob/main/fixtures/nuvio.json>), with the app's checks and limits, so you can test your own logic offline. If the person's copy of the kit says `Unknown capability: "nuvio"`, it is old: have them copy `sdk/`, `contract.json` and `kino.d.ts` again from that repository; never remove the capability to silence it. The kit has no scrapers, so tell the person the real ones are only tested by installing the plugin in Kino 0.9.71 or newer. The catalogue still comes from you (for example `kino.tmdb` and `kino.meta`). Copy the shape of the example in <https://kinotvapp.github.io/kino-plugins/en/nuvio-plugins/#example>. This is NOT the person-side Nuvio import (<https://kinotvapp.github.io/kino-plugins/en/nuvio/>): that needs no plugin at all.

**Community takedowns**: each author is responsible for their own plugin; Kino only lists community
plugins (no recommendation or promotion). A plugin that breaks the rules for plugins (a `userMessage`
asking for money, passwords or contact data, malware, a rights claim) is removed from the community
index through `community-blocklist.json` at the root of `kinotvapp/kino-plugins` (reasons `claim`,
`malware`, `broken`, `rules`, `author_request`); anyone can report one with the "Reclamo / retiro de
plugin" issue template. Installed copies stay installed, show "Retirado del índice de la comunidad."
and stop updating; a fork needs its own report. Do not build anything that infringes rights or harms
people. See
[Claims and plugin takedowns](https://kinotvapp.github.io/kino-plugins/en/claims/).

**Sending to the TV** needs nothing from the plugin; it casts best with a correct `mime` and no
`headers` (see [What people see](https://kinotvapp.github.io/kino-plugins/en/what-people-see/#cast)).

## 5. Checklist before publishing

- [ ] `node sdk/validate.mjs .` exits 0, and `node sdk/validate.mjs . --run <fn> …` passes for every
      declared capability.
- [ ] `node --test test/plugin.test.mjs` passes offline from recorded fixtures.
- [ ] Every host the code, the stream, its segments, subtitles and redirects touch is in `hosts`,
      with the bare domain next to its `*.` form.
- [ ] No missing global (`setTimeout`, `fetch`, `Buffer`, `process`, `require`, `crypto`, `Intl`…)
      in `plugin.js`; no `import`.
- [ ] No `throw` before the first `await` in any async function.
- [ ] Every declared capability is an exported async function (except `download`/`drm`); nothing
      exported that the manifest does not declare is ever called.
- [ ] `id`s are stable and match the pattern; `ref`s keep working when replayed later.
- [ ] User-facing text in Spanish (Bogotá, tuteo), and texts built at run time in `kino.lang`'s
      language (it may be `"en-US"` from Kino 0.9.54); no secrets in the repository.
- [ ] `version` raised; `apiVersion` is the lowest that works (6 only for an apiVersion 6 feature:
      it needs Kino 0.9.50+; 7 only for `tracking` or `segments`: it needs Kino 0.9.51+; 8 only for
      `music`/`podcast` items or `details`: it needs Kino 0.9.54+; 10 only for the `playlists`
      capability: it needs Kino 0.9.65+; 11 only for the `externalResolve` capability (Kino 0.9.66+) or the `nuvio` capability (Kino 0.9.71+);
      12 only for `syncProvider`, the `sync` block or a `link`/`help` setting: it needs Kino 0.9.74+;
      13 only for `socket`, `byteSource`, `storageLarge`, `catalog`, `qrScan`, `imageSource` or a `qr` setting:
      in development, no released Kino accepts it yet, and the person was told).
      A plugin that uses `kino.nuvio` declares `nuvioRepos`, `"streamHosts": "any"` and checks
      `typeof kino.nuvio === "object"`.
- [ ] A plugin with no video of its own declares `"catalogOnly": true` and still exports a `resolve`
      that throws `not_found` (for Kino 0.9.53 and older).
- [ ] Audio: every audio item has `kind` `"music"` or `"podcast"` and `"apiVersion": 8`; with
      `episodes` declared, `episodes(ref)` answers every audio ref, even a single track.
- [ ] Playlists: if you export any of `playlists`, `playlistItems`, `playlistCreate`,
      `playlistAddItem`, `playlistRemoveItem` or `playlistReorder`, declare the `playlists`
      capability and `"apiVersion": 10`; export only the functions your service actually supports --
      none is required.
- [ ] External resolver: a plugin that hands a title to another app declares `"apiVersion": 11` and the
      `externalResolve` capability (nothing to export), optionally `externalResolver` (`{ package, apk?, fdroid?, downloader? }`) in the
      manifest, and `resolve()` (or one `alternatives` entry) answers `{ external: { protocol, ref, resolver? } }` with no
      `url`; the plugin does not promise an app is installed, keeps a fallback copy when it can, and never uses `external`
      when it can produce the URL itself. Its `hosts` list only what the plugin's own code fetches, not what the resolver
      app reaches.
- [ ] Sync provider: `"apiVersion": 12`, `syncProvider` declared, `syncPull` and `syncPush` exported with one
      object argument, the blob stored and returned byte for byte, `conflict` thrown when the remote moved,
      `sync.maxBlobBytes` ≤ 4194304, `keySecret` (required) a long random token in a `password` setting with no
      `default`, `provision` lists what a second device needs, no token in any error/status/log, offline tests
      with a 4 MiB blob both ways, and the person was told in plain Spanish who can read the data.
- [ ] apiVersion 13 (in development): `byteSource` exports `read` and answers exactly the range asked as base64,
      with no JavaScript loop over the bytes; `imageSource` exports `image` and puts no secret in a handle;
      `kino.ws` only to declared hosts, every socket closed; `kino.qr.scan` only from an `action`/`panelAction`;
      `storageLarge` and `kino.catalog` hold nothing that must survive a restore; a `"sync": false` password is a
      one-device value (in `sync.provision` only as a one-shot secret the plugin clears once used, never as
      `keySecret`) and a `"sync": false` text is not in `sync.provision`; `run.mjs . read` and a Node test
      (`askRead`) cover `read`, `run.mjs . image` covers `image`; every `kino.crypto` byte operation you use is
      feature-detected (they depend on the Kino version, not on the manifest).
- [ ] apiVersion 14 / screens: `node sdk/run.mjs . screen` and `node sdk/run.mjs --device tv . screen` print the tree
      with nothing dropped; every event name the tree uses is handled in `screenEvent`; no state kept in module
      variables; a node the TV must stop on to read has `canRequestFocus`; below apiVersion 14 the screen and its
      capabilities come through `enhancements` and `validate.mjs` reports no dropped block; nothing secret in
      `kino.shared`, a room message or an AI prompt; the AI reply and `kino.shared.get` values are validated.
- [ ] apiVersion 15 / a store: `node sdk/validate.mjs .` shows the consent lines and no problem; `node sdk/run.mjs . storeSync`
      prints entries with nothing reported as `[dropped by Kino]` (every entry has a valid `address`, `id` and `name`);
      a live store exports `storeSync`, `storeList` and `storeSearch`; the list is complete (`full: true`) or the change is
      right (`removed`); `state` is small; no secret in an entry; the store never claims to install or approve anything.
- [ ] apiVersion 15 / `identity`, `notifications`: the plugin works with them switched off or refused (`permission_denied`); no
      token logged or shown; a notice's `id` groups events, its `go` points to the plugin's own screen.
- [ ] No helper exported under the name `details` unless it is the real `details` export (reserved
      from apiVersion 8).
- [ ] `kino.meta`, `kino.tmdb` and the `captureAll` options are used only behind their feature checks
      (`typeof kino.meta === "function"`, `typeof kino.tmdb === "function"`,
      `kino.browser.captureAll === true`); no TMDB key in the code.
- [ ] No `"debug": true` in the manifest unless the person asked for it (every plugin has a
      "Modo debug" switch in Kino's Ajustes; `true` only turns it on by default for everyone). If `telemetry` is declared, the person agreed and
      the logs hold codes and counts only.
- [ ] Every `userMessage` passes the rules (Spanish, ≤ 160, no URL/digits/money/credentials/contact)
      and `run.mjs` shows it; 18+ content carries `adult: true`.
- [ ] `"entry"` and `"icon"` have **no leading `./`** (`"plugin.js"`).
- [ ] If `"browser": true`: every server that works with `kino.fetch` uses it; `kino.browser.capture`
      is only called from `resolve`; nothing tries to solve, click or bypass a captcha or bot check;
      `blocked`/`timeout`/`busy`/`browser_unavailable` move on to the next server or end cleanly; the
      captured `headers` are returned with the Stream; several servers are labelled lazy copies.
- [ ] If signed: `"apiVersion": 5`, `signature` present, `node sdk/validate.mjs . --repo owner/repo`
      verified it after the last edit, `*.pem` in `.gitignore`, no `.pem` tracked, the person knows to
      back the key up.
- [ ] Public repository, manifest at the root, topic `kino-plugin` on THAT repository (mandatory: without it the
      app never finds the plugin), not a fork. Manifest `description` written (the card shows it);
      the GitHub About description is optional and not read by the app.
- [ ] The person installed it in Kino and it searched, listed episodes or tracks and played.

## 6. Being discovered ("De la comunidad")

**From the next Kino version (apiVersion 15, not published yet)** the app no longer searches GitHub by itself: the community
list comes from the built-in store, Kino Plugins (a `pluginStore` plugin), which reads an index built every day from the
repositories with the `kino-plugin` topic plus what changed since. The rules below are still what gets a plugin into that list.
People see it in the store view's "De la comunidad" tab (the old "Buscar en GitHub" tab is gone), beside "De Kino" and
"Instalados". There is one plugin per `id` across stores.
Anyone can also publish a store of their own (see apiVersion 15 above).

Kino lists community plugins itself; nobody approves them. The step-by-step for the person, with
exact clicks and how to check it, is [Get listed in Kino](https://kinotvapp.github.io/kino-plugins/en/listed/).
Every rule, as the app applies it (full detail:
[Publishing › Get found](https://kinotvapp.github.io/kino-plugins/en/publish/#get-found)):

1. Public GitHub repository at `https://github.com/<owner>/<repo>` (owner `^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`,
   repo `^[A-Za-z0-9._-]{1,100}$`), **not a fork** (use the template's "Use this template").
2. Topic exactly `kino-plugin`, **mandatory**, on the repository that holds `kino-plugin.json`
   (`gh repo edit owner/repo --add-topic kino-plugin`). Verify:
   `curl -s https://api.github.com/repos/owner/repo | tr -d ' \n' | grep -o '"topics":\[[^]]*\]'` must list it. The card shows the
   manifest `description`; the GitHub About description is optional and does not affect discovery.
3. `kino-plugin.json` at the repository **root on the default branch**
   (`https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json`), at most 16 KB, valid
   by the installer's rules, `apiVersion` not above the person's Kino (12 from Kino 0.9.74, 11 on 0.9.66 to 0.9.73, 10 on 0.9.65, 9 on 0.9.55 to 0.9.64, 8 on 0.9.54, 7 on 0.9.51 to 0.9.53, 6 on 0.9.50, 5 on 0.9.45 to 0.9.49; a signed plugin needs Kino 0.9.45+), and not
   `"discoverable": false`.
4. An `id` of your own: never a recommended plugin's id from another repo (today `internet-archive`,
   `own-server`), never the template's `archive-org`; the same id installed from
   another repo hides it on that device.
5. Order and reach. **From Kino 0.9.54** the app reads one page of 100 results at a time
   (`https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=100`,
   or `sort=updated`), in the order the person picks ("Populares", most stars, the default; or
   "Recientes", most recently updated); "Cargar más" reads the next 100 (up to GitHub's 1,000), and
   "Buscar en GitHub" adds the typed words matched against the repository's name and description
   (`in:name,description`), so a plugin with no stars is found too. **Kino 0.9.53 and older** make one
   request with `per_page=50` sorted by stars, keep the first 30 well-formed results, then drop the
   ones whose manifest fails (they still used a slot): below the top 30 a plugin is not listed there.
6. Timing: each device searches when its plugins screen opens and its copy is older than 12 hours,
   or on "Actualizar" (never twice within 60 s); 403/429 means waiting `Retry-After` /
   `X-RateLimit-Reset` / 15 min (1 min to 24 h). GitHub indexes new topics on its own schedule;
   raw files are cached about 5 minutes.
7. If GitHub cannot answer, a backup list published by the Kino team is used; it is rebuilt from the
   same search, so nothing needs requesting. A repository in `community-blocklist.json` (a claim was
   upheld) never shows, in either list. From the next Kino version the list is refreshed with every store sync.
8. Nothing installs by itself: the person always sees the consent sheet ("Plugin no verificado…").
9. Where to look in the app (before the next Kino version, apiVersion 15): Plugins (phone: menu ☰ → Plugins; TV: Ajustes → Plugins), the "De la
   comunidad" tab, beside "Recomendados" ("Plugins de la comunidad — Kino no los revisa ni responde por
   su contenido.") with its "Actualizar" button (from Kino 0.9.54 also "Populares"/"Recientes",
   "Cargar más" and "Buscar en GitHub"); also the first-run "Elige tus fuentes", which has the same
   tabs. On the web: <https://github.com/topics/kino-plugin>.

To debug "it does not appear": open the search URL in a browser and find the repo in `items`; open
the raw manifest URL; run `node sdk/validate.mjs .`; check the id; tap "Actualizar" after 60 s.

## 7. Common mistakes

- Declaring `*.site.com` only, then failing on `site.com` (or the reverse after a redirect).
- A CDN, a subtitle host or a license server missing from `hosts`: playback stops with an error.
- Using `fetch`, `setTimeout` or `Buffer` because the Node kit ran fine.
- Writing `plugin.js` with an `import`/`require` of a second local file: Kino only loads `entry`,
  there is nothing for it to resolve on-device. Bundle to one file first (section 3, step 3).
- Validating arguments with `throw` before the first `await` in a helper wrapped in `try`/`catch`.
- Returning ids with `/`, `:` or spaces (dropped), or ids that change between calls (the library
  loses the title).
- Returning `next` or a row `ref` without declaring and exporting `browse` (they are dropped).
- Putting expiring links in `ref` instead of resolving them fresh in `resolve`.
- Network calls at the top level of the module (install fails).
- Forgetting to raise `version`, so the fix never reaches anyone.
- Writing `"entry": "./plugin.js"` (or `"icon": "./icon.png"`): refused by Kino 0.9.45 and older.
- Signing, then editing `plugin.js` or `version` without signing again; committing the `.pem`; making
  a new key for an already published plugin (everyone must reinstall).
- Declaring `apiVersion` 2 or 3 without needing it (older Kino builds cannot install it); declaring
  6 for nothing (Kino 0.9.49 and older refuse it).
- Publishing with `"debug": true` without being asked (it turns error panels on by default for everyone).
- Calling `kino.fetch`, `kino.storage` or a private-key handle from `sign()`, or putting a
  `kino.secret()` marker in `signContext`.
- A `userMessage` with a URL, a phone number, "WhatsApp", "paga"/"recarga" or the person's own input:
  dropped silently at best, the plugin removed at worst.
- A `status` or `action` setting without exporting `settingsStatus` / `action`; `"section"` without
  exporting `section` (install fails).
- `kino.html.select` "failing" under Node: it only exists in the app; test that part in Kino.
- Forking the template: forks never appear in "De la comunidad".
- Keeping the template's `"id": "archive-org"`: install refused ("Ya hay un plugin con ese id") and
  hidden from the community list wherever the Internet Archive plugin is installed.
- English or voseo in what the person reads.
- Copying a browser's `Accept-Encoding` or `Host` header and expecting it to be sent.
- Pasting a secret into `kino-plugin.json` or `plugin.js` instead of sealing it (author keys) or
  asking for it in a `password` setting (the person's credentials); committing `.kino-secrets.json`.
- A sync provider that decodes, re-encodes or trims the blob, keeps extra copies of it (memory), puts the
  token in an error or status text, uses a password a person picks as `keySecret`, or promises the plugin
  "cannot read" the data (with `keySecret`, always required, it can).
- `setSettings` on a `url` setting (or a `password` below apiVersion 13), or a `link` whose `confirm` is the answering action or an
  action with its own `confirm` question: refused whole.
