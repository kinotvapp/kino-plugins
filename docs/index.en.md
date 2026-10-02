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
   Ajustes > Plugins by typing `owner/repo` ([Publishing](publish.md)).
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

A `?query` or `#fragment` in a pasted URL is ignored. A ref that only comes from a pasted URL is not a
pin: a plugin with [sealed secrets](manifest.md#secrets) pasted that way installs from the default
branch.

Kino downloads `kino-plugin.json`, your entry file and the icon from `raw.githubusercontent.com`,
which is why the repository has to be public.

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
| [Limits and engine quirks](engine-limits.md) | Every number in one place, how your code lives, what QuickJS lacks, the rejection trap |
| [Test it locally](test-locally.md) | The Node kit: `run.mjs`, `validate.mjs`, record and replay, live channels |
| [Get listed in Kino](listed.md) | The five steps to show in "De la comunidad", how long it takes and how to check it |
| [Publishing](publish.md) | Releases, updates and approvals, and appearing in "De la comunidad" |
| [What people see](what-people-see.md) | The consent sheet, host dialogs, player messages, Configurar, statuses, disabling and uninstalling |
| [Cookbook](cookbook.md) | An HTML site with a login, a JSON API with a token, the person's own server, Widevine, plain `http` |
| [Nuvio scrapers](nuvio.md) | How people install Nuvio scrapers, what the conversion builds, and its limits |
| [Example plugins](examples.md) | The two published examples, and how the reference plugin is built |
| [Reference](reference/index.md) | `contract.json` and `kino.d.ts`, to read or download |
