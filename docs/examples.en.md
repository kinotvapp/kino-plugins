# Example plugins

Two published plugins, both public, both installable in Kino, and both usable as a template. Start
from **Internet Archive** for the simplest possible template; start from **Tu servidor**, the
complete API demo, when your source is a server the person owns, or when you want to see every
apiVersion 2 and 3 feature working end to end.

<div class="grid cards" markdown>

-   ![](assets/own-server-icon.png){ .card-icon } **Tu servidor** · `kinotvapp/kino-plugin-own-server`

    ---

    **The complete API demo.** A media server at home (Jellyfin, Emby, a NAS…): the person types its
    address, user and password. apiVersion 3, `"hosts": []`, `url`/`user`/`password` settings, a
    session kept with `kino.storage`, a cache TTL, `kino.rank`, `ids.tmdb`, seasons, `download`,
    `audioTracks`, `live` items and `channels` in all three shapes, plus a reference server
    (`server.mjs`) to run it against with nothing of your own.

    [:octicons-repo-template-16: Use as template](https://github.com/kinotvapp/kino-plugin-own-server/generate){ .md-button .md-button--primary }
    [:octicons-mark-github-16: View on GitHub](https://github.com/kinotvapp/kino-plugin-own-server){ .md-button }

-   ![](assets/archive-icon.png){ .card-icon } **Internet Archive** · `kinotvapp/kino-plugin-archive`

    ---

    Public-domain films and classic TV from archive.org. **The simplest template to start from**:
    one manifest, one JavaScript file, no build step, apiVersion 1, all five capabilities, plus the
    `sdk/` kit, `GUIDE.md`, `contract.json` and `kino.d.ts`.

    [:octicons-repo-template-16: Use as template](https://github.com/kinotvapp/kino-plugin-archive/generate){ .md-button .md-button--primary }
    [:octicons-mark-github-16: View on GitHub](https://github.com/kinotvapp/kino-plugin-archive){ .md-button }

</div>

To try either one in Kino, open Ajustes > Plugins and type `kinotvapp/kino-plugin-archive` or
`kinotvapp/kino-plugin-own-server`.

**Use the template, don't fork.** "Use as template" creates a fresh repository of your own with the
same files. A fork would work as a plugin too, but Kino's community search leaves forks out
([Get found](publish.md#get-found)). Then change `id`, `name`, `homepage`, `hosts` and
`capabilities` in `kino-plugin.json`, rewrite `plugin.js`, and keep `sdk/`.

## The reference plugin { #reference-plugin }

For the basics -- `search`, `home`, `browse`, `episodes` and `resolve` over a public site, with no
settings or session -- the reference is `kino-plugin.json` and `plugin.js` in
[kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive), the Internet
Archive plugin, with all five capabilities. It reads about like this:

1. It declares `archive.org` **and** `*.archive.org`: a download URL on `archive.org` redirects to a
   storage node such as `dn720705.ca.archive.org`, and the wildcard does not cover the bare domain.
2. `getJson` does the `await` first and throws afterwards (the rule of
   [the rejection trap](engine-limits.md#rejection-trap)).
3. `search` cleans what the person typed: archive.org answers 200 with an error body when the query
   has a stray `/`, `-`, `&` or `'` or a dangling `AND`/`OR`/`NOT`, so it keeps letters, digits and
   apostrophes inside words, drops the operator words, and asks both collections (films and classic
   TV) whatever `type` says, using it only to decide which group comes first; an item that is in both
   is listed once.
4. `home` builds three rows (films, classic TV, classic animation) and wraps each row in its own
   `try`/`catch`, so one failing row does not lose the others; it reports it with `kino.log`. Each row
   carries its own id as `ref`, and `browse(ref, cursor)` pages through the same query 50 at a time
   with the page number as the cursor (`"2"`, `"3"`, …), throwing `kino.error("not_found")` for a row
   it does not know.
5. `episodes` reads the item's file list, keeps the video originals in natural order (a small
   `natural()` comparator, because `localeCompare` cannot be trusted), numbers them from `S01E02`
   in the file name or 1, 2, 3, and uses `"<item>|<file name>"` as each episode's `ref`.
6. `resolve` picks the best playable file (an mp4 derived from the original, or the mp4/webm itself),
   turns sibling `.vtt`/`.srt` files into `subtitles`, and sets `durationMs`.
7. Every URL it builds is `https` on a declared host; posters use
   `https://archive.org/services/img/<id>` and are not host-checked.

`README.md` in that repository says what it does not do (a collection is exposed as a single movie,
episodes numbered 0 are dropped), so do not copy those as intended behavior.

For everything else apiVersion 2 and 3 allow -- settings, a session, downloads, `live` items,
`channels` -- the reference is
[kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server): its
[`kino-plugin.json`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/kino-plugin.json)
and its [`plugin.js`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js) use
nearly everything that exists, and its
[`README.md`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/README.md) maps every
feature to the title of its test server that exercises it:

| What it shows | Where in the code | Guide |
| --- | --- | --- |
| `url`, `text`, `password`, `toggle` settings | `kino-plugin.json`: `settings` | [Settings](manifest.md#settings) |
| `"hosts": []` and the server the person types | `kino-plugin.json`; `base()` | [The person's own servers](manifest.md#own-servers) |
| A login and a token kept in `kino.storage` | `token()`, `api()` | [`kino.storage`](kino-api.md#storage) |
| A cache with `ttlMs` | `home()` | [`kino.storage`](kino-api.md#storage) |
| Title search over a backend that matches any word | `search()`, `kino.rank.*` | [`kino.rank`](kino-api.md#rank) |
| Cursor paging | `browse()` | [Paging](contract.md#paging) |
| Seasons as separate titles | `episodes()` | [Seasons](contract.md#seasons) |
| Downloads (`download`) | `kino-plugin.json`; `resolve()` returns a progressive mp4 | [Downloads](manifest.md#downloads) |
| A separate audio track (`audioTracks`) | `resolve()` | [The `Stream` rules](contract.md#stream) |
| `ids.tmdb` | `item()` | [`ids.tmdb`](contract.md#tmdb) |
| `live` items (apiVersion 2) | `item()`, `resolve()` | [Live channels (apiVersion 2)](live-channels.md#live-items) |
| `channels`: a `ref`, an inline `stream`, and an M3U list with an XMLTV guide | `liveCategories()`, `liveChannels()` | [Channels in the En vivo tab](live-channels.md#en-vivo-tab), [Three recipes](live-channels.md#recipes) |
| A User-Agent the channels insist on, typed in Configurar: `headers` on a Stream, `streamHeaders` on a playlist | `resolve()`, `liveChannels()`, `liveCategories()` | [Channels in the En vivo tab](live-channels.md#en-vivo-tab) |
| A guide for its own channels | `guide()` | [The channel functions](live-channels.md#live-contract) |
| Typed errors (`kino.error`) | `api()` | [Errors people understand](contract.md#errors) |

The complete code, explained line by line, is in the cookbook:
[The person's own server](cookbook.md#own-server).

## Install it and see it work { #own-server-demo }

[kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) bundles a
reference server with no dependencies
(`node server.mjs [--port 8096] [--user ana] [--password s3cr3t]`) whose catalog exercises one
feature per title, so you can install the plugin in Kino and watch every row of the table above work,
with no real server of your own.

Three powers are deliberately **not** in it, because a server at home never needs them: Widevine DRM
([recipe](cookbook.md#widevine)), a declared host over plain `http`
([recipe](cookbook.md#insecure-site)), and channel streams on any server
([recipe](live-channels.md#recipe-m3u)).
