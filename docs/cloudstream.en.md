# CloudStream plugins

**Kino 0.9.54.** Kino can install the plugins of a CloudStream repository without
anyone writing a Kino plugin: each plugin the person picks is converted, on the device, into a Kino
plugin that talks to a **complement**, a separate app where the CloudStream code runs. This page covers
how people add them, how each part maps, and where it stops. It is useful if you maintain a CloudStream
repository, or want to know why a converted plugin behaves differently from a hand-written one. You need
none of it to write your own plugin.

## How people add them { #add }

1. In Ajustes ▸ Plugins, "Agregar plugin", the person pastes the repository's address: the URL of its
   `repo.json` (an object with `pluginLists`) or of a `plugins.json` (the plugin list itself). The
   `cloudstreamrepo://…` and `https://cs.repo/?…` links repositories are shared with work too (Kino
   reduces them to the `https` URL of the JSON), and so does the repository's
   [short code](#short-code).
2. The address must be `https`, on a public host (never `http`, a local IP, `localhost` or a home
   network name), with no user name or password, end in `.json` and be at most 500 characters. If it is
   not a CloudStream repository, Kino tries Nuvio and a Kino plugin, as with any pasted address.
3. Kino reads the `repo.json` (up to 1 MB, at most 10 `pluginLists`; one broken list does not sink the
   others) and opens a picker with its plugins (up to 2000): name, types, language, version and author,
   with filters by type (Película, Serie, Anime, En vivo) and by language, and a "Buscar por nombre"
   field. Installable plugins come first, then the ones **in Spanish** (`es`, any `es-*` or `es_*`, and
   also `mx`, `lat` and `latino`, as many repositories write them), then by name.
4. A plugin that cannot be installed is dimmed with the reason:
    - **"Usa torrents: Kino no los permite"**: any plugin that declares the `Torrent` type among its
      `tvTypes`, even when it also lists movies or series. It is never installed or offered as a
      source, and an installed one that starts declaring it is switched off with that reason instead of
      being updated.
    - **"Desactivado por su autor"**: `status: 0` in the list.
    - **"Dirección no válida"**: an `internalName` outside `^[A-Za-z0-9._-]{1,64}$` or a `url` that is
      not public `https`.
5. A plugin marked `NSFW` in `tvTypes` installs only behind the app's **18+ code**, like an
   [adult Stremio addon](stremio.md): while that code is locked the picker does not offer it, and
   everything it shows is marked 18+.
6. "Agregar" downloads the `.cs3`, hands it to the complement to learn which sources it registers,
   generates the Kino plugin and opens the usual [consent sheet](what-people-see.md). Each CloudStream
   plugin becomes **its own Kino plugin**, in Ajustes ▸ Plugins like any other, and the repository stays
   in the "Repositorios de CloudStream" list under its own name (the `repo.json`'s `name`). "Quitar" on a
   repository asks first and does not uninstall its plugins: they stay and keep updating.

### With a short code { #short-code }

In the same box, the person can type a repository's **short code**, as in CloudStream: only letters,
digits, `_`, `-` and `!` (at most 64 characters; an address is never a code). A code that starts with
`!` is a **py.md** link (`!abc` is `https://py.md/abc`); any other is a **cutt.ly** link (`abc` is
`https://cutt.ly/abc`).

- Kino asks the shortener **once**, with no cookies or credentials and 10 s at most, and **does not
  follow the redirect**: it only reads where it points. No other page of the shortener is opened.
- That target is checked like an address pasted by hand (also when it is a `cloudstreamrepo://` link):
  it must be a public `https` URL, with no user name or password, ending in `.json`. If not, "Ese
  código lleva a una dirección que Kino no abre…" ("That code leads to an address Kino doesn't open:
  only https repositories outside the home network.").
- Before reading anything from the repository, Kino shows the address the code leads to so the person
  confirms it: "¿Abrir este repositorio?" ("Open this repository?"), the URL, and "Ábrelo solo si
  confías en quien te pasó el código." ("Open it only if you trust whoever gave you the code."). Only
  "Abrir" ("Open") goes on as in step 3.
- An unknown code says "That code doesn't lead to any CloudStream repository. Check that it's spelled
  right."; offline, or when the shortener fails, "Couldn't look up the code. Check your connection and
  try again." (each in the app's language).
- Neither the code nor its target goes to the logs.

## The complement { #complement }

CloudStream code **never runs inside Kino**. It runs in a separate app, the CloudStream complement,
which has no internet permission: everything a plugin asks of the network is carried out by Kino, which
decides what is allowed. The first time, Kino offers to install it ("Instalar complemento"): it
downloads it for the person from the same servers as its own updates, checks that it is Kino's copy
(package, version, sha256 and signature), and the system asks for permission to install it. Kino also
says when a new version is out ("Actualizar complemento").

When it is missing, outdated, or the installed one is not Kino's, the player, the source search and the
episode list do not say "no está disponible": they say what is wrong ("Necesitas el complemento de
CloudStream", "Actualiza el complemento de CloudStream", "El complemento instalado no es el de Kino")
with a button that opens the complement sheet.

A CloudStream plugin's requests:

- go to **any public host over `https`**, on every redirect hop (at most 10); never `http`, never an
  invalid certificate, never the local network. That is why the consent sheet says so in red, like a
  plugin with [`"streamHosts": "any"`](manifest.md#stream-hosts);
- are capped per operation: 250 requests, a 1 MB request body and a 5 MB response; 15 s per request by
  default, 30 s at most;
- carry no credentials from one origin to another;
- if the plugin opens a hidden page (its WebView), only during a call the person started, under the
  same rules as the [hidden browser](browser.md): `https`, never the local network.

The repository's address never goes into logs, errors or telemetry: the plugin's id is a hash.

## What the conversion builds { #conversion }

Each installed plugin is a generated Kino plugin: a manifest plus one JavaScript adapter shared by all,
whose calls go to [`kino.cloudstream`](kino-api.md#cloudstream) (only these generated plugins have it;
a hand-written one never does). The generated manifest:

- `id`: `cloudstream-<name>-<hash>` (at most 40 characters), stable across devices, derived from the
  repository and the `internalName`.
- `version`: `1.<converter revision>.<the entry's version>` (the revision is 4 today, so `1.4.N`): it
  moves when the repository entry or Kino's adapter changes.
- `apiVersion` 8, `"streamHosts": "any"` and the capabilities `search`, `episodes`, `resolve` and
  `download`, plus `home` and `browse` when a source has a main page, and `channels` when one lists
  `Live`.
- The entry's description, ending in "(CloudStream, <repository host>)".

How each part maps:

| CloudStream | Kino |
| --- | --- |
| Each source's `search` | Kino's search (a source that lists only `Live` is not asked: its channels are searched in En vivo). When one source fails the others go on. |
| Main page (`mainPage`), up to 12 sections per source | Rows on Home and in the plugin's section. **Each row** of a section is its own row with its own "Ver más", which pages that row only. A broken section never hides the others. |
| `load` | The title page: synopsis (`plot`), poster, backdrop, genres (`tags`), year, rating and runtime, through [`details`](contract.md#details) for a movie and `episodes().series` for a series. |
| The title's ids (`imdb`, `tmdb`, `mal`, `anilist`, `kitsu`) | Handed to Kino, which describes the title with TMDB, AniList and the person's `meta` plugins, like any other. Without ids, Kino searches TMDB by name and year (with [`kino.tmdb`](kino-api.md#tmdb)) and takes an id **only** on one exact match of the same year. An 18+ title is never searched. |
| Types `Movie`, `AnimeMovie`, `Documentary` | `movie` |
| `TvSeries`, `Anime`, `OVA`, `Cartoon`, `AsianDrama`, `Others`, or no type | `series` |
| `Music`, `Audio` | `music` (apiVersion 8, see [Music and podcasts](contract.md#music-podcasts)) |
| `Podcast`, `AudioBook` | `podcast` |
| `Live` | En vivo channels: each main page section is a category, with paging and search. |
| `NSFW` | A `movie` marked 18+, only in an `NSFW` plugin; any other plugin drops it. |
| Any other type | Dropped. |
| `loadLinks` | The `Stream`: only public `https` addresses of type `VIDEO`, `M3U8` or `DASH` (never torrents or magnets), without repeats, ranked by quality (at equal quality, HLS first). The first one plays and up to 8 more become alternatives, named in the Servidor menu. Up to 20 headers per link and 30 subtitles. |

A title listed as a movie that has a single episode (an `NSFW` title, a mislabelled series) plays its
first one. The adapter keeps the `load` answer of the last few titles for a few minutes, so the page
and the "Reproducir" right after it cost one call.

## A plugin's settings { #settings }

Some CloudStream plugins bring a settings screen of their own (the one the plugin's gear opens in
CloudStream). In Kino it is in Ajustes ▸ Plugins, the plugin's "Gestionar" ▸ **"Ajustes del plugin"**
("Plugin settings"):

- **Only on a phone or a tablet.** On a TV the entry does not appear.
- Only when the complement said, while loading the installed version, that the plugin has settings, and
  while the complement is ready.
- The screen is the plugin's own: the complement shows it over Kino, one at a time ("Some settings are
  already open"). When it is saved, Kino reads again what it shows from that plugin.
- The values live in the plugin's storage ([`kino.storage`](kino-api.md#storage)), so they sync to the
  person's other devices like the rest of its state.
- When something goes wrong, the plugin's card says so: "This plugin's settings failed", "The plugin
  didn't answer", "This plugin isn't compatible with the companion" or "Couldn't open the settings.
  Try again".

## Limits that differ from a hand-written plugin { #limits }

- List calls (`search`, `home`, `browse`, `episodes`, `details`) get **45 s**
  (`timeoutsMs.cloudstreamList` in `contract.json`) instead of the usual 15 or 20 s: they go through
  the complement, which may start cold, and then the site.
- The `.cs3` is downloaded up to 20 MB and, when the repository publishes `fileHash`
  (`sha256-<64 hex>`), it must match: otherwise "El archivo del plugin no coincide con el del
  repositorio".
- A plugin the complement cannot load, or that brings no source Kino can use, is not installed, and
  nothing is left half-done.

## Updates { #updates }

Kino reads the repository again on every update check. When the entry has the same `version`, the same
`fileHash` (when there is one) and the converter is the same, there is nothing to do; otherwise the whole
install runs again with the new `.cs3` and applies, or waits for the person's approval when it reaches
further, like any [update](publish.md#updates). Also:

- `status: 0` switches the installed plugin off with "Desactivado por su autor".
- An entry that starts declaring `Torrent` switches it off with "Usa torrents: Kino no los permite"; it
  is never updated into.
- When the repository no longer lists the plugin (or cannot be read), the installed version keeps
  working with the adapter it was installed with.

## On the person's other devices { #sync }

The repository list and the installed plugins sync both ways, like any plugin. What does not travel is
the file: **each device downloads its own copy of the `.cs3`** from the repository, and the receiving
device waits until it has the complement to install it.

## For CloudStream repository maintainers { #maintainers }

- Publish everything over `https` on a public host: the `repo.json`, each `plugins.json`, each `.cs3`
  and its `iconUrl`. None of it may be on `http` or a local IP.
- Declare `tvTypes` honestly: Kino uses them to filter, to decide what goes to Home and what to En vivo,
  and to refuse. A single `Torrent` keeps **the whole** plugin out, even when it also has movies or
  series; `NSFW` puts it behind the 18+ code.
- Set the plugin's `language`: the picker filters by language and puts Spanish first (`es`, `es-MX`,
  `es-419`, `mx`, `lat` or `latino` count as Spanish).
- Publish `fileHash` (`sha256-…`) and raise `version` on every change: that is what Kino compares to
  find an update.
- When you can, give the title's ids in `load` (IMDb, TMDB, MAL, AniList, Kitsu): with them Kino shows
  TMDB's and AniList's synopsis, cast and score without guessing.
- Return `VIDEO`, `M3U8` or `DASH` links with a `quality` and a clear `name`: it is their label in the
  Servidor menu.
- Use `status: 0` to withdraw a plugin: it is switched off on the devices that already have it.
- You can publish a cutt.ly [short code](#short-code) for your repository (or a py.md one, typed with a
  leading `!`): its redirect must lead **straight** to your `repo.json`'s `https` URL (or to a
  `cloudstreamrepo://` link), because Kino never follows a second redirect of the shortener.
- If your plugin has a settings screen, people open it in Kino from a phone or a tablet, never from a
  TV: make the plugin work with its default values.
