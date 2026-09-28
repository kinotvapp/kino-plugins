# AGENTS.md: building a Kino plugin with an AI assistant

You are helping a person write a **Kino plugin**: a public GitHub repository with one JSON manifest
(`kino-plugin.json`) and one JavaScript ES module (`plugin.js`) that Kino, an Android video app for
phones and TVs, runs inside a QuickJS sandbox. The plugin turns one video source into search
results, Home rows, episodes and playable streams (and, optionally, live TV channels).

Your job: produce a plugin that **Kino accepts and that actually plays**, verified with the Node kit
before anyone installs it. Kino is strict: every rule below is enforced by the app, not a style
suggestion. When this file and your prior knowledge disagree, this file and the guide win.

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
   [Publishing](https://kinotvapp.github.io/kino-plugins/en/publish/), and for live TV
   [Live channels](https://kinotvapp.github.io/kino-plugins/en/live-channels/).
3. The machine-readable contract: `contract.json` (every number and rule) and `kino.d.ts` (every
   shape and the whole `kino` API), at <https://kinotvapp.github.io/kino-plugins/reference/contract.json>
   and <https://kinotvapp.github.io/kino-plugins/reference/kino.d.ts>, and also in the template.
4. The complete reference: `plugin.js` and `kino-plugin.json` in
   [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) -- raw at
   <https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/plugin.js> and
   <https://raw.githubusercontent.com/kinotvapp/kino-plugin-own-server/main/kino-plugin.json> -- use
   nearly every apiVersion 2/3 feature a plugin can have: settings, a session, `kino.storage`,
   downloads, `live` items and `channels`. Study it whenever the plugin needs settings, auth,
   downloads or live channels. For a plain plugin with no settings or login, read
   `plugin.js` in [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
   instead, the simpler reference for the five basic capabilities.

Do not rely on memory of other plugin systems (Kodi, Stremio, Cloudstream…): the contract is different.

## 2. Before writing code, settle these with the person

- **The source**: the site or API, and whether it needs a login, an API key or a server address the
  person types. Credentials always come from `settings` (type `password` for secrets), never from
  the code.
- **The hosts**: every host your code calls **and** every host the video, subtitles, audio tracks,
  HLS/DASH segments and keys, and redirects land on. Look at real responses (`curl -sIL`) to find
  redirect targets and CDNs.
- **What it offers**: movies, series (with `episodes`), Home rows (`home`, and `browse` for "Ver más"),
  live channels (`live` items at apiVersion 2, or the En vivo tab with `channels` at apiVersion 3).
- **The lowest `apiVersion` that works**: `1` unless you need `download`, `drm`, `insecureHttp`,
  `"hosts": []`, or `live` items (`2`), or `channels`/`liveStreamHosts` (`3`).
- Whether the person has the right to use the source. Do not help circumvent DRM: the only DRM path
  is a Widevine license the source itself hands out (the `drm` capability).

## 3. Workflow

1. **Start from the template, not a fork** (Kino's community search leaves forks out). Use
   `kinotvapp/kino-plugin-archive` for a plain plugin (no settings, no login); use
   `kinotvapp/kino-plugin-own-server` instead when the plugin needs settings, auth, downloads or
   live channels:
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
   `browse`, `episodes`, `resolve`; `liveCategories` + `liveChannels` (+ optional `guide`) for
   `channels`). `download` and `drm` are declarative: nothing to export. Return plain JSON only.
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
    `node sdk/run.mjs . live guide <id,id>`, `node sdk/run.mjs live playlist <url|file> [--epg <url|file>]`,
    and `resolve <ref> --live` for a channel's ref. Settings: `--config key=value` (repeatable) or
    `sdk/config.json` (never committed).
6. **Record fixtures and test offline**: `node sdk/run.mjs --record test/fixtures.json . search "algo"`,
   then `node --test test/plugin.test.mjs` (the scaffold's test: it validates the manifest and
   replays the fixtures offline). Name the file explicitly: a bare `node --test test/` does not work
   on every Node version, and a bare `node --test` would also run the kit's own suite. The kit's
   tests (`node --test sdk/test/kit.test.mjs`) are only for someone changing the kit (you should not).
7. **Check what Node hides** (the kit is more permissive than Kino): grep `plugin.js` for the
   missing globals (section 4) and for any `throw` before the first `await` of an async function.
8. **Publish**: public repository, `kino-plugin.json` and `plugin.js` at the root, `.gitignore` with
   `.kino-storage.json`, `.kino-cookies.json`, `sdk/config.json`; tag a release (`v1.0.0`);
   add the topic: `gh repo edit owner/repo --add-topic kino-plugin`. The person installs it from
   Kino, Ajustes > Plugins, typing `owner/repo`, and must try it in the app (search, episodes, play).
9. **Updates**: raise `version` every time (an equal or lower version never reaches anyone). Adding
   hosts, `permissions`, `download`, `drm`, `channels`, `liveStreamHosts` or an `insecureHttp` host
   makes the update wait for the person's approval.

## 4. Hard rules (with the exact numbers)

**Network**

- `kino.fetch` reaches only the manifest's `hosts` (and servers the person typed in a `url`
  setting), over `https`, checked on **every redirect hop**. `*.example.com` does **not** cover
  `example.com`: list both. No IPs, no `localhost`, no `.local`/`.lan`/`.internal`/`.localhost`/`.home.arpa`,
  no bare `*`, no scheme/port/path in `hosts`. 1 to 20 entries (`[]` only from apiVersion 2 with a
  `url` setting).
- The `Stream` URL, subtitles, `audioTracks`, every HLS variant/segment/key, DASH `BaseURL`, and the
  `drm` `licenseUrl` must be on those same hosts. Images (`poster`, `backdrop`, `still`, `logo`) are
  the only exception: any `https` URL, never an IP or local name.
- Plain `http` only for a server the person typed, or a host declared
  `{ "host": "…", "insecureHttp": true }` (apiVersion 2, no wildcard; shown in red to the person).
- `"liveStreamHosts": "any"` (apiVersion 3 + `channels`) frees only live channel streams, never
  `kino.fetch`, playlists, subtitles, licenses, movies or images.

**The engine is QuickJS, not Node, not a browser.** Missing: `setTimeout`, `setInterval`,
`setImmediate`, `queueMicrotask`, `Buffer`, `process`, `require`, `fetch`, `AbortController`,
`structuredClone`, `performance`, `crypto`, `WeakRef`, `Intl`. Present: `URL` (no punycode),
`URLSearchParams`, `atob`, `btoa`, `TextEncoder`, `TextDecoder` (UTF-8), `console`. Use
`kino.fetch`, `kino.sleep`, `kino.crypto`, `kino.storage`, `kino.html.select` (only in the app; the
Node kit's version throws). No `import`: one file; bundle anything else into it. `localeCompare`
and `toLocaleString` do not localize. No network calls at the module's top level (install loads it
offline). Never write a synchronous infinite loop: it cannot be interrupted.

**Limits** (from `contract.json`)

| What | Limit |
| --- | --- |
| Manifest / entry file / icon | 16 KB / 1 MB / 128 KB |
| Memory / stack | 64 MB / 1 MB |
| Time per call | `search` 15 s; `home`, `browse`, `episodes`, `resolve` 20 s; `liveCategories`, `liveChannels`, `guide` 20 s; all fetches and sleeps count |
| Module top level | 10 s |
| Idle sandbox | closed after 5 minutes |
| Timeouts | 3 in a row disable the plugin ("No responde") |
| `kino.fetch` | 15 s default, 30 s max; body 5 MB; request 1,048,576 characters; 60 requests per call (redirects count); 10 redirects |
| Cookies | 50 per domain, 64 KB total |
| `kino.storage` | 256 KB; `ttlMs` 1..2,592,000,000 (30 days) |
| `kino.sleep` | 0..5,000 ms |
| `kino.crypto` | 5 MB data; PBKDF2 100,000 iterations, 64-byte keys; `randomBytes` 1,024 |
| Log message | 2,000 characters |
| Return value | 2,000,000 characters of JSON |
| Results | `search` 100; `home` 20 rows × 60; `browse` 100/page; `episodes` 5,000 (+50 `seasons`); `ref` 4,096 chars; `next` 2,048 chars; `id` `^[A-Za-z0-9._~-]{1,128}$` |
| Live (apiVersion 3) | 200 categories; 500 channels/page, 10 pages/category; `guide` 50 channels, 24 h, 100 entries/channel; `number` 1..9999 |
| Settings | 12; `text` 500, `url` 2,048, `password` 500 characters |

**Data rules that silently drop things**: an item `id` outside `^[A-Za-z0-9._~-]{1,128}$` (derive a
slug); a repeated `id`; `adult: true`; a `series` without the `episodes` capability; a `live` item at
apiVersion 1; an episode `number` 0; images not `https`. `id` must be stable across calls (library
and progress hang off it); `ref` may change but must keep working later (put a stable id in it and
look fresh links up inside `resolve`). A `Stream` is all or nothing; `mime` must look like
`video/mp4` or be omitted.

**Errors**: `throw kino.error(code, detail)` with one of these codes; the person reads Kino's Spanish
sentence, your detail (cut at 200 characters) goes to the log.

| Code | The person sees |
| --- | --- |
| `auth_required` | "Configura {plugin} en Ajustes ▸ Plugins", with a button to Configurar |
| `not_found` | "No se encontró en {plugin}" |
| `geo_blocked` | "Este contenido no está disponible en tu región" |
| `rate_limited` | "{plugin} está limitando las peticiones; intenta en unos minutos" |
| `unavailable` | "{plugin} no está disponible ahora" |

`kino.fetch` does not throw on non-2xx (check `r.ok`); it throws with `e.code` one of
`host_not_allowed`, `timeout`, `network`, `too_large`, `invalid_request`. `kino.crypto` errors carry
`code: "crypto_error"`.

**The unhandled-rejection trap**: in Kino a `throw` inside an `async` function **before its first
`await`** aborts the whole call even if the caller wraps it in `try`/`catch` (also
`return Promise.reject(e)` and a `new Promise` rejected at once). The Node kit does not show this.
Always `await` first (a fetch, or `await null;`) and validate after.

**Language**: everything the person sees (the manifest's `name` and `description`, settings `label`
and `hint`, Home row titles, error details, badges) is **Spanish from Bogotá, with tuteo** ("Configura",
"Escribe tu usuario"), **never voseo** ("Configurá", "Escribí" are wrong). Code, identifiers and
comments may be English.

**Secrets**: never hardcode a password, token, API key or cookie in `plugin.js` or the repository;
ask for it in a `settings` entry of type `password`, keep derived tokens in `kino.storage` keyed by
user and server, and never log a setting. A `url` setting cannot have a `default` (use `hint`).

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
- [ ] User-facing text in Spanish (Bogotá, tuteo); no secrets in the repository.
- [ ] `version` raised; `apiVersion` is the lowest that works.
- [ ] Public repository, manifest at the root, topic `kino-plugin`, not a fork.
- [ ] The person installed it in Kino and it searched, listed episodes and played.

## 6. Being discovered ("De la comunidad")

Kino lists community plugins itself; nobody approves them. Every rule, as the app applies it (full
detail: [Publishing › Get found](https://kinotvapp.github.io/kino-plugins/en/publish/#get-found)):

1. Public GitHub repository at `https://github.com/<owner>/<repo>` (owner `^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`,
   repo `^[A-Za-z0-9._-]{1,100}$`), **not a fork** (use the template's "Use this template").
2. Topic exactly `kino-plugin` (`gh repo edit owner/repo --add-topic kino-plugin`).
3. `kino-plugin.json` at the repository **root on the default branch**
   (`https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json`), at most 16 KB, valid
   by the installer's rules, `apiVersion` not above the person's Kino (3 today), and not
   `"discoverable": false`.
4. An `id` of your own: never a recommended plugin's id from another repo (today `internet-archive`,
   `own-server`), never `xuper`, never the template's `archive-org`; the same id installed from
   another repo hides it on that device.
5. Stars: the app makes one unauthenticated request,
   `https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=50`,
   keeps the first 30 well-formed results, then drops the ones whose manifest fails (they still used a
   slot). Below the top 30 a plugin is not listed.
6. Timing: each device searches when its plugins screen opens and its copy is older than 12 hours,
   or on "Actualizar" (never twice within 60 s); 403/429 means waiting `Retry-After` /
   `X-RateLimit-Reset` / 15 min (1 min to 24 h). GitHub indexes new topics on its own schedule;
   raw files are cached about 5 minutes.
7. If GitHub cannot answer, a backup list published by the Kino team is used; it is rebuilt from the
   same search, so nothing needs requesting.
8. Nothing installs by itself: the person always sees the consent sheet ("Plugin no verificado…").

To debug "it does not appear": open the search URL in a browser and find the repo in `items`; open
the raw manifest URL; run `node sdk/validate.mjs .`; check the id; tap "Actualizar" after 60 s.

## 7. Common mistakes

- Declaring `*.site.com` only, then failing on `site.com` (or the reverse after a redirect).
- A CDN, a subtitle host or a license server missing from `hosts`: playback stops with an error.
- Using `fetch`, `setTimeout` or `Buffer` because the Node kit ran fine.
- Validating arguments with `throw` before the first `await` in a helper wrapped in `try`/`catch`.
- Returning ids with `/`, `:` or spaces (dropped), or ids that change between calls (the library
  loses the title).
- Returning `next` or a row `ref` without declaring and exporting `browse` (they are dropped).
- Putting expiring links in `ref` instead of resolving them fresh in `resolve`.
- Network calls at the top level of the module (install fails).
- Forgetting to raise `version`, so the fix never reaches anyone.
- Declaring `apiVersion` 2 or 3 without needing it (older Kino builds cannot install it).
- `kino.html.select` "failing" under Node: it only exists in the app; test that part in Kino.
- Forking the template: forks never appear in "De la comunidad".
- Keeping the template's `"id": "archive-org"`: install refused ("Ya hay un plugin con ese id") and
  hidden from the community list wherever the Internet Archive plugin is installed.
- English or voseo in what the person reads.
