# Writing a Kino plugin

A Kino plugin is a video source that anyone can publish as a small GitHub repository: one JSON
manifest and one JavaScript file. A person types `owner/repo` in Kino, sees which sites the plugin
will talk to, accepts, and from then on the plugin is one more source: its results show up in
search and on Home, and its titles open, list episodes, play in Kino's player, keep progress and
appear in "Continuar viendo" and the library like any other title.

You can write, run and test a plugin on your computer with Node before you ever touch the app. This
guide has everything you need: the file layout, the manifest, the contract your code must meet, the
API Kino gives you, every limit, the quirks of the JavaScript engine, and how to publish.

The complete API demo is [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)
("Tu servidor": every feature working end to end); [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
(Internet Archive) is the simplest starting template. Both carry the `sdk/` folder, the Node
kit. Two more files describe the contract for machines (both on the [Reference](reference/index.md)
page): `contract.json` holds every number and rule the app enforces (the tables in this guide are
generated from it, and the app's tests pin its own constants to it), and `kino.d.ts` declares the
whole `kino` API for your editor (`/// <reference path="./kino.d.ts" />` at the top of `plugin.js`).

## The 5-minute path { #five-minutes }

1. **Start from the template.** Create your repository from
   [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) -- the
   simplest one -- or from [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)
   if you need settings, a session, downloads or live channels ("Use this template" on either one,
   or clone it and copy `sdk/`). Do not *fork* it: Kino's community search leaves forks
   out ([Get found](publish.md#get-found)). Or let the kit write a skeleton:
   `node sdk/init.mjs my-plugin --host example.com`.
2. **Declare what you need** in `kino-plugin.json`: an `id`, the `hosts` you will call and the
   `capabilities` you export ([The manifest](manifest.md)).
3. **Write the functions** in `plugin.js`: `search` and/or `home`, and `resolve` at least
   ([The contract](contract.md), [The `kino` API](kino-api.md)).
4. **Check it the way Kino does:** `node sdk/validate.mjs .`, then
   `node sdk/run.mjs . search "algo"` ([Test it locally](test-locally.md)).
5. **Publish** it as a public repository with the topic `kino-plugin` (mandatory: without it Kino cannot find it), and install it in Kino from
   Ajustes > Plugins by typing `owner/repo` or pasting the URL of its `kino-plugin.json`
   ([Publishing](publish.md)).
6. **Get Kino to show it by itself** in "De la comunidad": the topic, name and description, and how
   to check it, in [Get listed in Kino](listed.md).

Using an AI assistant? Give it [the ready-made prompt](ai.md): it reads this whole guide from
`llms-full.txt` and follows `AGENTS.md`.

## What a plugin is { #what-a-plugin-is }

A public GitHub repository, or a folder inside one, with:

```
kino-plugin.json   the manifest (required)
plugin.js          the code: a single ES module (required; its name is set by "entry")
icon.png           optional, square, at most 128 KB
README.md          for humans
```

Kino runs your code in a sandbox: no filesystem, no timers, no other plugins, no access to the
person's data. The only way out is `kino.fetch`, which can reach only the hosts your manifest
declares and the person approved on screen, plus the servers the person typed in your plugin's
settings (see [The manifest](manifest.md)).

Kino loads exactly one JavaScript file, so there is nothing for an `import` to resolve to. If you
use a build step or a library, bundle everything into that single file -- see
[Splitting your code across files](engine-limits.md#splitting-files) for a worked example.

**How people install it.** In Kino, Ajustes > Plugins, they type the address of your repository:

| They type | Kino reads |
| --- | --- |
| `owner/repo` | the repository root, default branch |
| `owner/repo/sub/dir` | a folder inside the repository |
| `owner/repo@v1.2.0` | a branch, tag or commit (the name cannot contain `/`); also works with a folder |
| `https://github.com/owner/repo` or `.../tree/<ref>/<path>` | the same, pasted from the browser |
| `https://raw.githubusercontent.com/owner/repo/<ref>/<path>/kino-plugin.json` (or a `github.com/.../blob/<ref>/.../kino-plugin.json`, also `/raw/`) | the folder that `.json` file is in, at that ref; any other kind of file is refused |
| `https://cdn.jsdelivr.net/gh/owner/repo[@<ref>]/<path>/kino-plugin.json` (also `fastly`, `gcore`, `testingcf` and `quantil.jsdelivr.net`) | the same repository folder, read from GitHub: no `@ref` or `@latest` is the default branch; the ref must be an exact branch, tag or commit (`@main`, `@v1.2.0`), so a version range (`@1`, `@^1.2`, `@1.x`) is refused |
| `https://<any public server>/<path>/kino-plugin.json` | a plugin hosted outside GitHub: see [Installing from a manifest URL](#manifest-url) |

The field in Kino says "Escribe usuario/repositorio de GitHub o pega la URL del manifest
(kino-plugin.json)". A `?query` or `#fragment` in a pasted URL is ignored. A ref that only comes from a
pasted URL (`tree`, `blob`, `raw`, `raw.githubusercontent.com` or jsDelivr's `@ref`) is not a pin: a
plugin with [sealed secrets](manifest.md#secrets) pasted that way installs from the default branch.

For a repository address, Kino downloads `kino-plugin.json`, your entry file and the icon from
`raw.githubusercontent.com`, which is why the repository has to be public. A URL of a repository's
`kino-plugin.json` (on GitHub, raw.githubusercontent.com or jsDelivr) always becomes that repository's
address, so sealed secrets, signatures and community search keep working for it.

### Installing from a manifest URL { #manifest-url }

Your plugin does not have to live on GitHub (new in the Kino version after 0.9.49). People can paste the
`https` URL of its `kino-plugin.json` on any public server: your own site, GitHub Pages, a CDN such as
jsDelivr's `npm/`. Kino stores it as the address `url:https://…/kino-plugin.json` (scheme and host
lowercased, default port, query and fragment dropped): that URL is the plugin's identity, and it
travels as is to the person's other devices with plugin sync.

- `entry` and `icon` are read relative to the manifest URL: `"entry": "plugin.js"` next to
  `https://example.com/kino/kino-plugin.json` is `https://example.com/kino/plugin.js`.
- `https` only (`http://` is refused with "Kino solo instala plugins desde direcciones https…"), on a
  public name: no IP addresses, no `localhost`, no single-label or `.local`/`.lan` names, no
  user:password in the URL, and the file has to be named exactly `kino-plugin.json`. A name that
  resolves to a private address, and a redirect off `https` or to such a host, are refused too.
- **No sealed secrets**: seals are bound to a GitHub repository, so a manifest with `secrets`
  installed from a URL is refused ("Este plugin trae datos sellados, y esos solo funcionan si lo
  instalas desde su repositorio de GitHub…"). Publish such a plugin on GitHub.
- **Unsigned**: a `signature` is bound to `owner/repo`, so it is not checked and the plugin installs
  (and shows) as unsigned.
- Everything else is the same as a repository install: the consent sheet, `hosts` and every approval
  rule, and updates: Kino re-reads the same URL and applies a higher `version`, asking again when it
  needs more than was approved. The plugin is never listed by community search (that only finds
  GitHub repositories with the `kino-plugin` topic).

**Stremio addons** are a Kino feature for people, not something you write: in the same field a person
can paste the address of a Stremio addon's `manifest.json` (or a `stremio://` link) and Kino generates
a plugin for it. Nothing in this guide changes for your plugin.

## The guide, page by page { #pages }

| Page | What is in it |
| --- | --- |
| [A first plugin](first-plugin.md) | Two files that search and play, and how to run them |
| [Signed plugins](signed.md) | **Sign your plugin with your own key** so people know every update is yours (apiVersion 5, Kino 0.9.45+) |
| [What's new](changelog.md) | What changed for plugin authors, by Kino version |
| [The manifest](manifest.md) | Every field and rule of `kino-plugin.json`, settings, `streamHosts`, sealed secrets, the person's own servers, `insecureHttp`, downloads |
| [The contract](contract.md) | The functions you export, their arguments, what you return, host questions and the broad video permission, and the errors people understand |
| [The `kino` API](kino-api.md) | `fetch`, cookies, `secret`, crypto, sleep, config, HTML, storage, log, rank |
| [Live channels](live-channels.md) | `live` items, the En vivo tab, M3U/XMLTV playlists, guides, `liveStreamHosts`, three recipes |
| [The settings form](settings-form.md) | `section`, `status` and `action` settings, `clearSettings`, `validateSettings`, the own tab and syncing (apiVersion 6) |
| [Signing every request](signed-streams.md) | HLS streams signed on every request: `signing`, `sign`, retries and `alternateHosts` (apiVersion 6) |
| [Hidden browser](browser.md) | `"browser": true` / `"pages"`, `kino.browser.capture` and `kino.browser.page`: when to use them, the safety model, never a captcha, timeouts and failures (apiVersion 6) |
| [Moving saved titles](migrate.md) | `migrate`: move what the person had saved to your plugin (apiVersion 6) |
| [Section, categories and colors](section-theme.md) | `section`, `categories` and `theme` (apiVersion 6) |
| [Logs and telemetry](diagnostics.md) | `debug`, the Registro page, `telemetry`, `kino.log.report`, logcat and playback metrics (apiVersion 6) |
| [Limits and engine quirks](engine-limits.md) | Every number in one place, how your code lives, what QuickJS lacks, the rejection trap |
| [Test it locally](test-locally.md) | The Node kit: `run.mjs`, `validate.mjs`, record and replay, live channels |
| [Get listed in Kino](listed.md) | The five steps to show in "De la comunidad", how long it takes and how to check it |
| [Publishing](publish.md) | Releases, updates and approvals, and appearing in "De la comunidad" |
| [What people see](what-people-see.md) | The consent sheet, host dialogs, player messages, Configurar, statuses, disabling and uninstalling |
| [Cookbook](cookbook.md) | An HTML site with a login, a JSON API with a token, the person's own server, Widevine, plain `http` |
| [Nuvio scrapers](nuvio.md) | How people install Nuvio scrapers, what the conversion builds, and its limits |
| [Example plugins](examples.md) | The two published examples, and how the reference plugin is built |
| [Claims and plugin takedowns](claims.md) | How to ask for a community plugin to leave the index, what Kino does and how to appeal |
| [Reference](reference/index.md) | `contract.json` and `kino.d.ts`, to read or download |
