# Stremio addons

Kino can install a Stremio addon without anyone writing a Kino plugin: it reads the addon's
`manifest.json` and generates, on the device, a Kino plugin that talks to the addon's server. This page
covers how people add one, how each Stremio resource maps, what is refused and how far it goes. It is
for you if you maintain an addon and want it to work well in Kino, or if you want to know why an addon
behaves differently from a hand-written plugin. You need none of it to write your own plugin.

## How people add one { #add }

1. In Kino, Ajustes ▸ Plugins (on a TV also through the "Plugins" button on Home), "Agregar plugin",
   type **Stremio**, and paste the `manifest.json` URL ("Pega la URL del manifest.json del addon de
   Stremio (o de una colección de addons)"). When the address is plainly an addon's, Kino picks the type
   by itself.
2. The address is normalized the way Stremio does it: `stremio://` means `https://`, a bare base
   address gets `manifest.json`, and a public name over `http` is upgraded to `https`. `http` is kept
   only for the person's own network (an IP, a single-label name, `.local`/`.lan`), so an addon on their
   home server is added by typing its address. `localhost`, loopback and link-local addresses are
   refused, and so is a path with `.`, `..` or encoded slashes.
3. An address on `github.com` or `raw.githubusercontent.com` is read as a GitHub repository (a Kino
   plugin or a Nuvio repository), never as an addon. Serve your `manifest.json` from your own domain.
4. A `stremio://…/manifest.json` link the person taps (a "Install" button on an addon page) opens Kino
   on Plugins ▸ Agregar with the address filled in; Kino reads nothing until the person taps
   "Agregar", and a link may only name a public host. On Android 12 and later an
   `https://…/manifest.json` link opens in the browser (Android hands a web link only to the app that
   verified that domain), so share the `stremio://` link or the address to paste.
5. Kino reads the manifest, generates the plugin and opens the usual
   [consent sheet](what-people-see.md). Nothing of the addon is used before the person accepts.

The full address (which often carries the addon's configuration, a debrid key for instance) is never
written into the generated plugin or the logs: it lives in two of the plugin's settings, "Servidor del
addon" (`addonUrl`, the server) and "Configuración del addon" (`addonPath`, the rest of the path, kept
as a password in the Keystore). The consent sheet says so: "Guarda la configuración del addon (puede
incluir tu clave) solo en tus aparatos". That part may be at most 2,048 characters ("La configuración
de ese addon es demasiado larga para guardarla en Kino").

<span id="detail-links"></span>**Title links.** From Kino 0.9.51 a Stremio *detail* link opens the title in Kino
instead of being ignored: `stremio:///detail/movie/<imdb>` or
`stremio:///detail/series/<imdb>[/<imdb>:<season>:<episode>]` (a tracker's "Open in Stremio", like
Seenr's). Kino finds the title through TMDB and opens its sources -- the screen a Home card opens, phone
and TV; an episode opens its series. Only an IMDb id (`tt` and 5 to 10 digits) is accepted; another type
or id, an extra segment, a query or a link over 200 characters is ignored, and a title TMDB does not know
shows "No encontré ese título". Addon links (`stremio://…/manifest.json`) work as before.

## What the conversion builds { #conversion }

- One plugin per addon, id `stremio-<name>-<hash>`: the same on every device for the same address. In
  Plugins it carries the "Stremio" badge.
- `version` `1.<converter revision>.0` (today `1.10.0`), `apiVersion` 4, or 6 when the addon uses
  something of 6 (search inside a row, `meta`, 18+ content).
- `hosts`: `api.themoviedb.org` (Kino uses TMDB to turn a TMDB id into an IMDb one) and the hosts **your
  catalogs redirect to** ([below](#redirects)). The addon's server is not a declared host: it is
  reached as a server the person typed.
- `"streamHosts": "any"` (and `"liveStreamHosts": "any"` with channels): your video may be on any
  public server. The sheet shows, in red, "Puede reproducir video desde cualquier servidor que indique".
- `download` when the addon plays movies or series, so they can be downloaded on phones
  ([Downloads](manifest.md#downloads)); live channels never.
- The addon's `logo` is the plugin's icon (at most 128 KB, read within 5 s; one that is not a PNG is
  converted, or left out).
- Kino writes the description: "Addon de Stremio. Ofrece: catálogo, streams, subtítulos, canales en
  vivo." depending on what you have.

### Category chips { #categories }

In the plugin store (Instalados, Recomendados, a collection) each addon falls under the category chips
by what its manifest declares: an addon with `stream` goes under **Películas** (`movie`, or when it says
nothing), **Series** (`series`), **Anime** (`anime`, or `kitsu`, `mal`, `anilist`, `anidb` ids), **En
vivo** (`tv`, `channel`) and **Radio** (`radio`, or a radio `music` catalog); an addon without `stream`
(lists, `meta`, collections) goes under **Utilidades** (and Anime when it is about anime); `subtitles`
adds **Subtítulos** and `adult` adds **+18**. Declare your `types` and `idPrefixes` accurately: that is
where they come from.

Kino's own Recomendados never suggest an addon that plays video (one with `stream`), except a few free,
legal channel addons checked by hand ("Gratis y legal"). People add yours by its address.

## How each resource maps { #resources }

| Stremio resource | In Kino |
| --- | --- |
| `catalog` of `movie`, `series`, `anime` or another type | Home rows with their "Ver más" (the first 20, 60 titles per row), the type in the title: "Popular · Películas", "Popular · Series". |
| `catalog` of `tv`, `channel`, `radio` (or `music` with "radio" in its id or name) | Channel categories in En vivo (at most 200), 500 channels per page. A `radio` one without "radio" in its name shows as "… · Radio". |
| `catalog` with the `search` extra | Typed search (up to 3 catalogs, 100 results) and the search inside that row's "Ver más". A `tv`/`channel` one answers the En vivo search (up to 3). |
| `catalog` with `search` required | Search only, never a row. |
| `catalog` with another required extra (`genre`…) | Left out: Kino cannot know which value to send. An optional `genre` is never sent. |
| `skip` extra | Paging of "Ver más" and of channels ([below](#paging)). |
| `meta` | Info page and episodes of your titles; it also describes other sources' titles when TMDB and AniList have nothing ([below](#meta)). |
| `stream` | What plays ([Streams](#streams)). |
| `subtitles` | The video's subtitles and the player's "Buscar subtítulos en línea" ([Subtitles](#subtitles)). |
| `addon_catalog` | An addon collection ([below](#collections)). |

An addon plays **exactly where Stremio would ask it**: the `types` and `idPrefixes` of its `stream`
resource (the resource object's own lists, else the manifest's). An id or type outside them is never
asked about (a `kitsu:` id to an addon that only takes `tt`). Kino treats anime as series, and an addon
that only declares `anime` (or only `series`) is asked with its own word.

### Ids and matching { #ids }

Kino knows a title by its IMDb id (`tt…`) and, when you give it, by its TMDB id (`moviedb_id`, as
Cinemeta does). With them your title lines up with the same title from other sources, gets TMDB's info
page and can look for subtitles. A title the person opens from a TMDB page is asked of your addon as
`tt…` (or `tt…:season:episode`), so **declare `tt` in your `stream` `idPrefixes`** if you want to be
asked about other sources' titles. Before offering your addon in that search, Kino confirms you have
the title with one request to your `/stream` (at most 3 titles per search).

### Search { #search }

- **Typed search**: your catalogs with `search`. With none (or when they return nothing), Kino searches
  the text on TMDB and offers only what your `stream` can play by IMDb id.
- **A title's page** ("Ver otras fuentes"): only when your `stream` takes IMDb ids for that type. A
  catalog-only addon (Cinemeta, Kitsu) or a channels-only one does not answer here.
- **Inside a "Ver más"**: when that row's catalog takes `search`, the search goes to your addon with
  `search=…` and pages with `skip`.

### Paging { #paging }

Kino asks `/catalog/<type>/<id>/skip=N.json` with N = how many titles it already showed (at most 100 a
page). It stops on an empty page, when a different `skip` answers exactly the same page (an addon that
ignores `skip`), or past 20,000 titles.

### `meta` { #meta }

With `meta`, your catalog's titles get an info page and episodes (`videos` with `season` and `episode`
above 0; seasons up to 999). An addon with `meta` also **describes other sources' titles** (the
[`meta`](contract.md#meta) capability): when TMDB and AniList leave something empty on an info page,
Kino asks you with the id your `meta` resource covers (`tt…`, `tmdb:`, `kitsu:`, `mal:`, `anilist:`).
A meta-only addon is useful for that and installs too. From Kino 0.9.51 a meta's `logo`, its IMDb
rating (`imdbRating`, or the name of its `imdb` link, where AIOMetadata-style addons put it) and its
cast (`app_extras.cast`, else `cast`, else its `Cast` links) become the info page's
[logo, ratings and cast](contract.md#meta).

### Live channels { #live }

A `tv`, `channel` or `radio` catalog is an En vivo category; each `meta` is a channel (its `logo`, or
its `poster`). It plays in the live player, with no progress bar and no download. There is no program
guide. When a page of channels fails, the person reads "No pude cargar los canales de este addon".

## Streams { #streams }

Kino plays **only direct `http(s)` links** in the `url` field. Streams with `infoHash` (P2P/torrent),
`nzbUrl` (Usenet), `rarUrls`, `zipUrls`, `tgzUrls`, `tarUrls`, `servers`, `ytId` (YouTube) and
`externalUrl` are dropped.

Of the rest, Kino ranks best first: first those without `behaviorHints.notWebReady`; then by the
resolution your `name`, `title` or `description` names (1080p, 720p, unlabelled, and 2160p/4K last,
because most devices cannot decode it); within each tier `.m3u8`/`.mp4` links win, HEVC with DTS/Dolby
audio is avoided and 8-bit is preferred over 10-bit (Hi10P). Ties keep your order, so **list your best
stream first**. The address never counts as evidence: only what the stream says about itself.

- **Copies and automatic fallback.** The best one plays and up to 8 more become
  [`alternatives`](contract.md#stream): when one cannot play on the device, Kino moves on to the next
  by itself. The player's **Servidor** menu lists them as "Opción 1", "Opción 2"…: Kino does not use
  the stream's `name` or `title` as a label.
- **Headers.** `behaviorHints.proxyHeaders.request` is sent with the video (at most 20 headers, string
  values only). `proxyHeaders.response` is ignored.
- **`notWebReady`** is not refused: Kino needs no streaming server to play it, it only ranks it last.
- **Type.** An address ending in `.m3u8` is HLS and one ending in `.mpd` is DASH; the player detects the
  rest.
- **Time.** Your `/stream` gets 20 s, and the generated plugin's `resolve` 75 s in all (like a
  [Nuvio scraper](nuvio.md#limits)), the TMDB-to-IMDb lookup and the subtitles included.

## Subtitles { #subtitles }

A stream's `subtitles` and your `subtitles` resource's (asked within 5 s, for movies and episodes
only) are merged: at most 30, one per address, their three-letter language turned into two (`spa` →
`es`). A `.vtt` or `.srt` file is marked with its format.

An addon with `subtitles` also answers the player's **"Buscar subtítulos en línea"** for any title Kino
knows by IMDb or TMDB id, from any source ([subtitles for any title](contract.md#subtitles)): the
person's languages first, named by release (`movieReleaseName` or `subtitleFileName`). From Kino 0.9.51
the request carries what Kino knows of the playing file as Stremio's own extras,
`/subtitles/{type}/{id}/videoHash=…&videoSize=…&filename=….json` (each only when known, URL-encoded;
`videoSize=0` beside a `filename` whose size is unknown; never the video's URL), so the addon can rank
the exact release first; with nothing known the path stays the plain one. An addon with
**only** `subtitles` (OpenSubtitles v3) installs as a subtitle provider: nothing on Home, in search or
En vivo, and its sheet says "Agrega subtítulos a tus películas y series".

A translator (its name or description says "translat" or "traduc", or the language carries the `gt`
mark, like GTSubs' `esgt`) shows the tracks from its own server as "Español (traducido)". GTSubs'
`info:` notice tracks are skipped. A translator is installed from its configured address (the one its
configure page gives, with the language in the path).

## What Kino refuses { #refused }

| What | What the person reads |
| --- | --- |
| A **torrent or P2P** addon: `behaviorHints.p2p`, or "torrent", "magnet" or "p2p" in its id, name or description (from Kino 0.9.51 a description that names them only to deny them, "no incluye streams, torrents ni contenido P2P", does not count; the id and name stay strict). **Also with debrid.** | "Kino no admite addons de torrents, ni siquiera con debrid" |
| A manifest without `id` or `name`, or that is not JSON | "Esto no es un addon de Stremio (no encontré su manifest.json)" |
| An addon with no `catalog`, `meta`, `stream` or `subtitles` | "Este addon no ofrece nada que Kino pueda usar" |
| An address that is not an addon's | "Esa dirección no es la de un addon de Stremio" |
| A manifest over 256 KB | "La respuesta del addon es demasiado grande: no parece un addon de Stremio" |
| A redirect to the device itself | "El addon redirige a una dirección de este mismo aparato, y Kino no la sigue" |

Kino never plays P2P, has no BitTorrent client and no local streaming server, and runs no server on the
device: whatever your addon can only deliver through Stremio's streaming server does not work here. A
torrent addon installed before this rule is switched off by its next update check and stays in
Instalados for the person to remove. When a title only has P2P links, the player says "<addon> solo
tiene enlaces P2P de este título".

## Configurable addons { #configurable }

- **`behaviorHints.configurationRequired`**: Kino does not install it from its unconfigured address
  ("… necesita configurarse en su página antes de instalarlo") and offers "Configurar en su página",
  which opens `<address>/configure` in the **phone's** browser. That page's "Install" button hands back
  a `stremio://` link with the configured address, which fills "Agregar" and installs normally. A TV
  never opens the page: it tells the person to do it on the phone, and the configuration reaches it
  through sync.
- **`behaviorHints.configurable`** (or an address that already carries a configuration): the installed
  plugin offers "Reconfigurar", which opens the same page with the current options. When the person
  installs the same addon from the same server with another configuration, Kino updates that plugin
  instead of adding another (unless two configurations are installed, or the new address has no
  configuration and the old one does: that never wipes their key).
- For this to work, **your configure page must end in a `stremio://…/manifest.json` link** with the
  configuration in the path, as Stremio expects.
- **A TMDB key in the configuration** (Kino 0.9.53): when the configuration carries a field whose name contains
  "tmdb" with a TMDB key (a 32-character v3 key or a v4 read token; plain, JSON, base64 or URL-encoded), Kino offers
  the person, once, to use it for [`kino.tmdb`](kino-api.md#tmdb) ("Usar la llave de TMDB de tu addon <name>"). Only
  with their yes, and the key never leaves the device except toward TMDB. A configuration kept on your server (only
  an opaque id in the address) is simply not found.

## 18+ addons { #adult }

An addon with `behaviorHints.adult` installs behind the person's **18+ code** (the same one as in
Ajustes): Kino asks for it before the consent sheet, which says "Contenido para adultos (+18)".
Everything the addon gives is marked 18+ ([18+ content](contract.md#adult)): it shows only while the
code is unlocked on that device. While it is locked, the plugin is not shown in Plugins, in the search
filters or among the other devices' offers. If your addon is for adults, **declare `adult`**: an addon
that does not say so shows like any other.

## Collections { #collections }

An addon whose only use is listing other addons (`addon_catalog`, no `catalog`, `meta` or `stream`) is a
collection: it does not install ("… es una colección de addons: elige cuáles agregar"). Kino keeps it in
"Tus colecciones de Stremio" and shows its addons as cards, under the same rules as above: P2P ones,
ones that offer nothing and 18+ ones while the code is locked do not show. Each addon installs with its
own sheet. A collection is read only at a public `https` address with no configuration in the path; at
most 20 lists per collection and 300 addons per list. Kino ships and adds no collection on its own.

## Catalog redirects { #redirects }

Some addons answer their catalogs with a redirect to another server (Cinemeta sends them to
`cinemeta-catalogs.strem.io`), and a plugin may follow a redirect from the person's server only to that
server or to a declared host. So at install Kino probes the catalog addresses it will use (each row's
first page and a later one, each search catalog, each live category: at most 30, about 10 s in all) and
declares every public `https` host they redirect to; the person sees them on the consent sheet. A
redirect to a local address or over `http` is never declared.

Only **catalog** redirects are discovered. If your `/meta`, `/stream` or `/subtitles` redirects to
another host, that request fails: answer those resources from the addon's server (the video itself may
live on any public host).

## What syncs { #sync }

The generated plugin and its settings travel both ways between the person's paired devices
([sync](what-people-see.md#sync)): the server goes in the sync row and the configuration part goes
sealed end to end. The other device reads the addon again by itself and generates the same plugin.
"Tus colecciones de Stremio" sync too, and removing one removes it on both. So the person configures on
the phone and the TV gets the addon ready, and "Ver en el TV" plays an addon title through the TV's own
copy.

## Updates { #updates }

The version only moves with Kino's converter. "Buscar actualización" (and the background check) reads
the addon again at the saved address, probes the redirects again, regenerates the plugin and compares
it with the installed one: a change within what was already approved installs by itself; one that adds
hosts, channels or downloads waits for the person's approval. When the address now belongs to another
addon ("La dirección ahora es de otro addon") or can no longer be read, the installed plugin stays as
it was.

## Limits { #limits }

| What | Limit |
| --- | --- |
| Reading `manifest.json` | 256 KB, 15 s in all, at most 5 redirects |
| Catalogs kept | 200 (and when the generated script passes 1 MB, the last ones go and the description says "Aviso: el addon tiene demasiados catálogos; N quedaron fuera.") |
| Home rows | 20 catalogs, 60 titles each |
| A "Ver más" page | 100 titles; up to `skip` 20,000 |
| A request to your catalog or `meta` | 12 s (6 s when describing other sources' titles) |
| A request to your `/stream` | 20 s; the whole `resolve` 75 s |
| A request to your `/subtitles` | 5 s |
| Responses | 5 MB per request, 60 requests per call ([engine limits](engine-limits.md#limits)) |
| Streams used | the best + 8 alternatives |
| Subtitles | 30 |
| Declared redirect hosts | 20 |

## When something fails { #troubleshooting }

| What the person sees | What happened |
| --- | --- |
| "No encontré el addon en esa dirección" | `manifest.json` answered 404. |
| "El addon tardó demasiado en responder. Intenta de nuevo en un rato." | The manifest did not arrive within 15 s. |
| "No pude conectarme con el addon. Revisa la dirección y tu conexión." | The name does not resolve or the server does not answer. |
| "El servidor del addon respondió con un error (N)…" | An error status reading the manifest. |
| "<addon> solo trae el catálogo. Busca este título en tus otras fuentes." | The addon has no `stream`: it is catalog-only. A Kino plugin gets the same route with [`"catalogOnly": true`](contract.md#catalog-only) (Kino 0.9.54). |
| "<addon> no reproduce este título. Búscalo en tus otras fuentes." | The title's type or id is outside your `stream`'s `types`/`idPrefixes`. |
| "Esta fuente ya no tiene este título (<addon>)" | Your `/stream` answered an empty list, or nothing playable. |
| "<addon> solo tiene enlaces P2P de este título" | Every stream was P2P. |
| "Falta la dirección del addon: escríbela en Configurar" | On an update check, the "Servidor del addon" setting is empty. |

**Diagnostics:** each plugin's debug-mode switch, Stremio addons included, and the Registro page are in
[Logs and telemetry](diagnostics.md). The generated plugin logs only counts (how many streams came, how
many were P2P, how many can play) and the host of a redirect it is not approved for, never your address
or your links.

## When to write a Kino plugin instead { #native }

A Stremio addon works with nothing to write, but a [Kino plugin](first-plugin.md) can do more:

- **Named and lazy copies**: "Latino · Servidor 1" in the Servidor menu, and copies resolved only when
  the person picks them ([labelled copies](contract.md#lazy-copies)).
- **Its own settings form** inside Kino, with status and actions, instead of an external web page
  ([the settings form](settings-form.md)).
- **Request-signed streams** and server failover when a token expires
  ([signing every request](signed-streams.md)).
- **The hidden browser**, for servers that build the video with scripts ([hidden browser](browser.md)).
- **Live channels with a guide**, M3U/XMLTV playlists and live search ([live channels](live-channels.md)).
- **Its own section, categories and colors** ([section, categories and colors](section-theme.md)),
  Widevine ([cookbook](cookbook.md#widevine)), `Stream.skip` for skipping intros, your own error
  sentences ([`userMessage`](contract.md#user-message)), sessions with `kino.storage` and
  `kino.cookies`.
- **An author signature** and a place in "De la comunidad" ([signed plugins](signed.md),
  [get listed](listed.md)).
