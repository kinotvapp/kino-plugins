# Test it locally

The Node kit is the `sdk/` folder of the example plugins ([where to get it](first-plugin.md#get-the-sdk)):
`run.mjs` (run one function), `validate.mjs` (check a plugin the way Kino does), `init.mjs` (scaffold
a new one), `kino-shim.mjs` (the `kino` API in Node), `contract.mjs` (the rules, read from
`contract.json`), `seal.mjs` (seals a [secret](manifest.md#secrets) for your manifest, and `--keygen`/`--sign` for a [signed plugin](signed.md)) and
`guide-tables.mjs` (regenerates the guide's tables). There is nothing to
install. It needs Node 18 or newer (checked on 18.20, 20.11 and 24.14); `node --test sdk/test/kit.test.mjs`
runs its own tests.

```
node sdk/run.mjs ./plugin.js search "metropolis"
node sdk/run.mjs ./plugin.js home
node sdk/run.mjs ./plugin.js browse films 2
node sdk/run.mjs ./plugin.js episodes 'Dragnet1951'
node sdk/run.mjs ./plugin.js resolve 'Dragnet1951|Dragnet/Season 1/Dragnet (1951) - S01E01 - The Human Bomb.mp4'
```

The first argument is your entry file (or the folder that holds `kino-plugin.json`), then the
function, then its argument: the text to search for, the `ref` for `episodes` and `resolve`, or the
`ref` and an optional cursor for `browse`. The runner reads your manifest, provides the `kino`
global, calls that one function the way Kino does, **checks the answer with the app's rules** and
prints what Kino would keep as JSON on stdout; every entry Kino would drop is reported on stderr with
the reason (`--raw` prints your answer untouched). Logs, `console.*` and errors go to stderr, so you can
pipe the result (`... | head -30`, `... | jq`). The exit code is 0 on success, 1 when your code
throws and 2 when the command is wrong. The runner only runs functions your manifest declares.

- `--config key=value` (repeatable) sets a setting; the runner also reads `sdk/config.json`
  (`{ "server": "http://192.168.1.10:8096", "user": "ana" }`; keep it out of git). A required setting
  with no value stops the run with `auth_required`, as in the app.
- `--record fixtures.json` saves every `kino.fetch` answer; `--replay fixtures.json` answers from that
  file only, with no network. Record once, then your tests run offline and always the same (the
  scaffold's `test/plugin.test.mjs` does exactly that).
- `KINO_TYPE=movie|series|music|podcast|any` sets the `type` of the search (default `any`; `music` and `podcast` are
  [apiVersion 8](contract.md#music-podcasts), Kino 0.9.54).
- To fill the other fields of the query, pass the whole query as JSON:
  `node sdk/run.mjs ./plugin.js search '{"q":"dragnet","type":"series","year":1951}'`
  (`season`, `episode`, `tmdbId` and `year` are `0` otherwise).
- Under the Node kit `kino.storage` is a file named `.kino-storage.json` and the cookie jar
  `.kino-cookies.json`, both next to your manifest. Add them to your `.gitignore`. Delete them to
  start from scratch. A plugin with `secrets` also reads `.kino-secrets.json` from the same folder
  ([below](#secrets)). `node sdk/init.mjs` already lists all three in the scaffold's `.gitignore`.
- `node sdk/validate.mjs <folder>` checks the manifest with every rule of [the manifest](manifest.md)
  (the same Spanish messages the app shows) and that each declared capability is exported, and prints the
  consent sheet's extra lines as the person will read them (the red ones, an `insecureHttp` host,
  `"liveStreamHosts": "any"` or `"streamHosts": "any"`, marked "(en rojo)"; `secrets` adds "Usa
  datos sellados por su autor", with a note that only the app can check which repository they were
  sealed for);
  `--run <function> [argument]` also runs it and lists what Kino would drop. With
  `--run liveCategories`, every declared playlist is downloaded and parsed too: one that cannot be
  downloaded or parses to 0 channels is a problem, and its discarded entries are listed. With
  `--run meta <ids>` it asks your `meta` ([below](#meta)). `--run section [tab]`, `--run categories`,
  `--run settingsStatus`, `--run action <key>` and `--run validateSettings '<json>'` (apiVersion 6) run them as `run.mjs`
  does and as the app reads them: the section and categories with their drops, each status line and its missing ones,
  what an action shows (and whether it refreshes or clears settings), and whether the save is accepted. A call the app
  never makes is a problem: no `"section"` in the manifest, `categories` without apiVersion 6 and `browse`, an action
  key no `action` setting has, a function not exported, or a `validateSettings` answer Kino cannot read. Exit code 0
  means Kino would accept it.
- The `sdk/` folder does not have to live in your repository. Copy it anywhere and run
  `node /path/to/sdk/run.mjs ./plugin.js ...`.
- A stack trace names a temporary `plugin.mjs`: the runner loads a copy of your file so that Node
  treats it as an ES module whatever its version and `package.json` say. The line numbers are your
  `plugin.js`'s.

## Sealed secrets (apiVersion 4) { #secrets }

The kit can never open a seal: it has no private key. So it reads the plain values straight from
`.kino-secrets.json` next to your manifest (`{ "apiKey": "..." }`; keep it out of git, as the
scaffold's `.gitignore` does) and simulates every rule of [`kino.secret`](kino-api.md#secret): the
markers, the substitution inside `kino.fetch`, the manifest-hosts-over-https check on every hop, the
`kino.crypto` restrictions and the redaction of what comes back. `--record` never writes the plain
value to a fixtures file either: a canonical placeholder stands in for it, so a committed recording
never carries a secret however it is replayed later.

To make the seal itself: `node sdk/seal.mjs --repo owner/repo --name apiKey`, then type the value at
the hidden prompt (or pipe it on stdin). Seal for the repository people will install from, and test
the sealed build in the app installed from its default branch, with no `@ref`
([why](manifest.md#secrets)).

## Signed plugins (apiVersion 5) { #signing }

`validate.mjs` checks a [signed plugin](signed.md) the way Kino does: the `signature` field's shape,
the signature itself against your entry file (`--repo owner/repo[/folder]`, or the folder's GitHub
`origin` when you omit it), that no `*.pem` is tracked by git, and it prints the author key's
fingerprint and the consent line "Firmado por su autor". It also refuses `"entry": "./plugin.js"`
(Kino 0.9.45 and older do not install it) and warns when `hosts` has more than 20 entries (Kino 0.9.44
and older refuse that). Sign again after every change to the entry file or the `version`.

## Live channels (apiVersion 3) { #live }

The `channels` exports run through `live`, with the plugin folder first:

```
node sdk/run.mjs . live categories
node sdk/run.mjs . live channels noticias
node sdk/run.mjs . live channels noticias 2
node sdk/run.mjs . live guide canal1,canal2
node sdk/run.mjs . live search noticias
node sdk/run.mjs live playlist https://iptv-org.github.io/iptv/countries/co.m3u
node sdk/run.mjs live playlist ./lista.m3u --epg ./guia.xml.gz
```

- `live categories` calls `liveCategories()` and prints what Kino keeps. Then, for each `{ playlist }`
  in the answer, it downloads the list as the app would (your `headers`, your `hosts` or the person's
  server only, every redirect too) and prints, on stderr, the same summary as `live playlist` and
  the list's groups as the categories people will see.
- `live channels <categoryId> [cursor]` calls `liveChannels({ categoryId, cursor })`, then plays the
  first channel that has a `ref` and no `stream` the way Kino would: it sends that `ref` to
  `resolve()` and checks the answer as a live channel's (so `"liveStreamHosts": "any"` applies). With
  `validate.mjs --run liveChannels`, a refused answer there is a problem.
- `live search <query>` calls `liveSearch({ query })`, prints the channels Kino keeps (at most 100)
  and plays the first one with a `ref` like `live channels` does.
- `resolve <ref> --live` checks a `resolve()` answer as a live channel's. Without `--live` the kit
  cannot know the `ref` is a channel's and applies the strict rule; when only that stops the URL
  and your manifest has `"liveStreamHosts": "any"`, it says "si este ref es de un canal en vivo,
  prueba con --live".
- `live guide <id,id>` calls `guide()` with those ids and a 24-hour window starting two hours ago.
- `live playlist <url|file>` needs no plugin: it reads any M3U list with Kino's own rules and prints
  `N canales en M categorías; K entradas descartadas; L ocultas (adultos)`, the categories, and the
  first 20 channels as `group › name  url`. With `--epg <url|file>` it also shows what each of those
  20 has on now, or "sin guía". A guide that declares a DOCTYPE is refused, as in the app, and the
  command says so: "La guía declara un DOCTYPE; Kino la rechaza por seguridad". Use it on a list
  before you write a line of plugin.

The kit reads lists and guides with `sdk/live-playlist.mjs`, a copy of the app's readers pinned to
the same test files (`docs/plugins/fixtures/live` in Kino's repository): what it keeps is what Kino
keeps.

## What's new in apiVersion 6 { #api6 }

```
node sdk/run.mjs . section [tab]                  # needs "section" in the manifest
node sdk/run.mjs . categories                     # needs the browse capability
node sdk/run.mjs . theme                          # your colors, their contrast ratios and fallbacks
node sdk/run.mjs . settingsStatus
node sdk/run.mjs . action logout
node sdk/run.mjs . validateSettings '{"email":"ana@x.co"}'
node sdk/run.mjs --within '<ref>' ./plugin.js search "texto"   # scopedSearch
node sdk/run.mjs ./plugin.js sign '{"url":"https://cdn.example/seg.ts","kind":"segment","ref":"<ref>","context":"<signContext>"}'
node sdk/run.mjs --retry conflict:1 ./plugin.js resolve '<ref>'  # or conflict:1:409
node sdk/validate.mjs . --run liveSearch noticias  # 18+ marks on liveSearch hits
node sdk/run.mjs ./plugin.js migrate '{"kind":"title","ref":"<old ref>"}'
```

`run.mjs` shows what Kino would drop as `[dropped by Kino]` (`clearSettings`, `alternateHosts`), prints
what the person would read for a [`userMessage`](contract.md#user-message) (or why it would not be
shown), and `validate.mjs` warns about `debug` before publishing, about a `scopedSearch` that never reads
`within` and about a plugin that uses `kino.crypto`'s key pairs without `"apiVersion": 6`. The pages:
[The settings form](settings-form.md), [Signing every request](signed-streams.md),
[Moving saved titles](migrate.md), [Section, categories and colors](section-theme.md),
[Logs and telemetry](diagnostics.md).

## Describing titles (`meta`) { #meta }

```
node sdk/run.mjs . meta tt1254207 tmdb:10378        # apiVersion 6, "meta": Kino's verdict field by field and the info page
node sdk/validate.mjs . --run meta tt1254207        # the same, as a check; null is a note, not a problem
```

`meta <ids> [movie|series]` calls your `meta()` with the query Kino builds for a title another source listed,
`{ type, ids: { imdb?, tmdb?, kitsu?, mal?, anilist? }, id?, lang? }`: `tt…` is `ids.imdb`, `tmdb:N` `ids.tmdb`, and
`kitsu:N`, `mal:N`, `anilist:N` set that id and the query's `id` (the source's own id, as for a Stremio anime);
`lang=xx` (default `KINO_LANG`, else `es`), `id=<source id>`, or the whole query as JSON. It never takes a `ref`: Kino
describes a title by its ids, whatever plugin listed it, and asks nobody about a title with none. The call gets Kino's
6 s; past them the kit stops waiting, as the app does. On stderr: the query, your answer as you returned it, Kino's
verdict field by field (`✓` kept, `~` cut or partly kept, `✗` dropped, `·` absent, `-` ignored, with the reason for each
dropped entry), then how the info page would use it; on stdout, what Kino keeps (`null` when it is no answer). If the
manifest declares `meta` and the entry does not export it, the runner says Kino refuses the install. A shortened run
against the [own-server reference plugin](examples.md#reference-plugin) (Tu servidor 1.5.0, its `server.mjs` running):

```
$ node sdk/run.mjs --config server=http://192.168.2.13:18096 --config user=ana --config password=s3cr3t . meta tt1254207 tmdb:10378
meta({"type":"movie","ids":{"imdb":"tt1254207","tmdb":10378},"lang":"es"})
the plugin answered:
{ … }
Kino's verdict, field by field:
  ✓ title           kept: 14 characters; the page keeps the source's own title, this one is not shown
  ✓ overview        kept: 73 characters; shown as the synopsis when TMDB and AniList have none (HTML tags stripped)
  ✓ poster          kept: http://192.168.2.13:18096/img/poster/bbb.png (a server the person typed); used when the page has no poster
  ✓ year            kept: 2008
  ✓ genres          kept: 2 of 2: Animación, Comedia
  ✓ runtimeMinutes  kept: 10; shown only for a movie (a series' runtime is per episode)
  · episodes        absent: not given
  ✓ ratings         kept: 2 of 2: imdb 6.4, letterboxd 3.4/5
  ✓ cast            kept: 2 of 2
{ … }
How the info page would use it (only where TMDB and AniList left the part blank; their values always win):
  info line: ★ <the page's score>  ·  IMDb 6.4  ·  Letterboxd 3.4/5  ·  2008  ·  10 min
  synopsis: Un conejo enorme y tranquilo contra tres roedores que no lo dejan en paz.
  …
```

A dropped part reads like `✗ backdrop        dropped: 192.168.1.4 is a private, local or reserved IP address: never the home network`,
and a list with bad entries like `~ ratings         partly kept: 3 of 4: …` followed by one line per entry. The same rules
run on the app's own test vectors (`docs/plugins/fixtures/meta/vectors.json` in Kino's repository), so what the kit keeps
is what Kino keeps.

`validate.mjs --run` also chains `meta`: with `--run search`, `browse`, `home` or `section` and the `meta` capability, your
`meta` is asked about the first title of the answer that carries `ids.imdb` or `ids.tmdb` (the way Kino builds the
query); what it drops is listed, and a throw or a timeout past 6 s is a problem.

## `kino.meta` and `kino.tmdb` (Kino 0.9.53) { #kino-services }

Both work in every function the runner calls, through the kit's stand-ins (any apiVersion):

```
KINO_META_FIXTURE=meta.json node sdk/run.mjs . home        # kino.meta answers from meta.json; without it, null
KINO_TMDB_KEY=<your TMDB key> node sdk/run.mjs . home      # kino.tmdb asks TMDB with YOUR key where Kino uses its own (or "tmdbKey" in sdk/config.json)
KINO_TMDB_FIXTURE=tmdb.json node sdk/run.mjs . search matrix   # kino.tmdb answers offline from tmdb.json
```

- `meta.json` maps `"<type>:<idKey>:<value>"` or `"<idKey>:<value>"` (`"movie:imdb:tt0133093"`, `"tmdb:1399"`) to an
  answer; the first id of the query with an entry answers, else `null` (Kino's own TMDB/AniList lookup and the person's
  other plugins do not exist in Node).
- `tmdb.json` maps `"<path>?<params sorted by name, URL-encoded>"` or just `"<path>"` to TMDB's body
  (`"/trending/movie/week?language=es-MX"`); a fixture stands in for TMDB and for a key, and a path it lacks
  answers `not_found`.
- Your key stands in for Kino's own, under Kino's limit for its key (20 calls per 10 s); the kit has no person's key to
  fall back to, so past that limit it throws `rate_limited`.
- Without a key or a fixture, `kino.tmdb` throws `no_tmdb_key`, as a Kino build without a key of its own does for a person
  who has none, and the runner prints the sentence Kino would show. Your key is never printed.
- Validation, rate limits, the cache and the error codes are the app's ([`kino.meta`](kino-api.md#meta),
  [`kino.tmdb`](kino-api.md#tmdb)); `node sdk/validate.mjs` warns when your code calls either without
  `typeof kino.<name> === "function"` (older Kino has neither). Samples of both files are in
  `docs/plugins/fixtures/kino-services/` of Kino's repository.

## What the Node kit does not reproduce { #differences }

Kino is the authority; the kit only approximates it so
you can iterate fast. Before you publish, install the plugin in the app and try it there. The
differences:

- `kino.html.select` throws (it uses Jsoup, which exists only in the app).
- The kit's XMLTV reader is a tolerant regex walk, not the app's XML parser. It gives the app's answer
  on every shared test guide, but on malformed XML in mid-document it may keep more than the app
  (which stops at the first error and keeps what it read up to there).
- The rejection trap of [Limits and engine quirks](engine-limits.md#rejection-trap): Node catches what Kino 0.9.49 and older would not.
- Node has globals Kino lacks (`setTimeout`, `fetch`, `Buffer`, ...): the plugin may pass under Node
  and fail in Kino. Kino's `URL` has no punycode.
- The host, redirect and request-count rules are the same, and so are the cookie rules as far as
  Node's own parsing goes, but there is no refusal of names that resolve to private addresses, bodies
  are always read as UTF-8, and the 15 s timeout covers the wait for the response but not the
  download.
- The kit never asks about a host: an undeclared one fails as `host_not_allowed` even during
  `resolve` or `episodes`, where the app could [ask the person](kino-api.md#fetch). It has no broad
  video permission either; `"streamHosts": "any"` it does apply.
- The per-call time limits, the memory limit and the size caps on requests, answers and selectors
  are not enforced, except `meta`'s 6 s (Kino gives up silently there, so the kit says so).
- `kino.browser.capture` and `kino.browser.page` always answer `browser_unavailable` ([Hidden browser](browser.md)).
  The kit's `kino.browser.captureAll` is `true` and it checks the [Kino 0.9.54 capture options](browser.md#capture-all)
  as the app does (`invalid_request`) before answering that.
- `kino.lang` is always `"es-CO"`; the app's follows its language from Kino 0.9.54 ([`kino.lang`](kino-api.md#lang)).
- There is no `details` command: try the [`details`](contract.md#details) export (apiVersion 8, Kino 0.9.54) on a movie
  page in the app.
