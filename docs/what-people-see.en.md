# What people see

- **The consent sheet.** When someone types your address, Kino shows "Instalar &lt;name&gt;", your version
  and author, the description, the list of hosts under "Se va a conectar con:" (left out when
  `hosts` is empty), and the warning
  "Plugin no verificado: solo instálalo si confías en quien lo hizo." with "Instalar" and "Cancelar".
  If your manifest has a `password` setting it adds "Este plugin usa tu usuario y contraseña"; a `url`
  setting adds "Se conectará a los servidores que escribas en su configuración". Declaring `download`
  adds "Puede descargar videos para verlos sin conexión", `drm` adds "Reproduce video protegido (DRM)",
  `channels` adds "Agrega canales en vivo a la pestaña En vivo", `secrets` adds "Usa datos sellados por su autor", each `insecureHttp` host adds, in red, "Conexión sin cifrar con &lt;host&gt;", `liveStreamHosts: "any"` adds, in red, "Puede reproducir canales desde cualquier servidor que indique su lista", and `streamHosts: "any"` adds, in red, "Puede reproducir video desde cualquier servidor que indique". From apiVersion 6, `migrate` adds "Revisar lo que tienes guardado (biblioteca, historial, favoritos) para pasarlo a este plugin", `telemetry: true` adds "Comparte registros de errores con Kino para corregir fallas" and `telemetry: "verbose"` adds "Comparte registros detallados de reproducción y errores con Kino para corregir fallas". On an update, what is new carries a "nuevo" chip. Nothing of yours runs
  before they accept.
- **A long host list folds.** With more than 3 hosts the sheet says "Se va a conectar con N
  servidores:", lists the first 3 (on an update, the new ones first) and "y N más (M nuevos)", with a
  "Ver todos" / "Ver menos" toggle. The permission lines and the "Plugin no verificado" warning sit
  above the list and never fold; "Cancelar" and "Instalar" stay pinned below it while the body
  scrolls. A short list still reads better: declare what you use, not every mirror you ever saw.
- **Host dialogs.** A `kino.fetch` to an undeclared host during `resolve`/`episodes`, and an
  undeclared host of the video the player opens or meets mid-playback, ask the person ("Rechazar" /
  "Permitir"; the focus starts on "Rechazar"). For a movie's or episode's video, subtitles or audio
  the dialog also offers "Permitir video de cualquier servidor" ([the broad video
  permission](contract.md#broad-video)); once chosen, the plugin's details say "Puede reproducir video
  desde cualquier servidor" next to "Quitar permiso de video amplio". A plugin with remembered refusals
  also shows "Olvidar rechazos de host".
- **While `resolve` runs** the player shows "Resolviendo fuente &lt;name&gt;…", and after 5 s "…
  buscando enlaces (N s)".
- **When a stream can't play**, the player says why in Spanish, never the player's own English: for
  example "Este aparato no puede reproducir este formato de video (4K/HEVC)", "El servidor del video
  respondió con un error" or "No se pudo reproducir este video".
- **Configurar.** A plugin with `settings` has a "Configurar" button in Ajustes ▸ Plugins and, from
  Kino 0.9.50, its own tab in Ajustes with the same form ([The settings form](settings-form.md)). Until
  every required setting has a value its status is "Falta configurar" and nothing of it runs.
- **Ver más.** A Home row with a `ref` ends in a "Ver más" card, and a search page with a `next`
  shows "Ver más resultados de &lt;name&gt;": both open a grid that asks you for the next page as the
  person scrolls.
- **Search, Home and the library.** Your results appear in search under your plugin's name (with your
  `color`), next to the app's own sources; your `home` rows appear on Home after the app's own; your
  titles play in Kino's player and appear in "Continuar viendo" and the library. Titles of a plugin
  that declares `download` can be saved for offline viewing ([Downloads](manifest.md#downloads));
  Plugin titles can be sent to a TV (Chromecast and DLNA, see [Sending to the TV](#cast) below). A `live` item's card
  says "EN VIVO" and plays on tap, with no info page; a channel never enters "Continuar viendo" or
  the library ([Live channels](live-channels.md#live-items)). A plugin found through the `kino-plugin`
  topic carries the label "De la comunidad" on its card. In search, a live channel whose name has
  nothing to do with what was typed is left out ([the rule](contract.md#validation)); movies and
  series always stay.
- **Status of each plugin** in Ajustes > Plugins: "Activo", "Desactivado", "Falta configurar", "No
  responde — actívalo para volver a intentar" (three timeouts in a row; the person can re-enable it),
  "Actualización disponible — requiere tu aprobación", and "Archivos dañados, reinstálalo" (the
  installed file no longer matches what was installed).
- **Disable and uninstall.** A disabled plugin disappears from search and Home; its titles stay in
  the library and say "Activa el plugin &lt;name&gt; para ver esto". Uninstalling deletes the plugin's
  files, its storage and its cached Home rows immediately, but keeps the person's library titles and
  progress: opening one says "Esto venía del plugin &lt;name&gt;, que ya no está instalado", and installing
  the plugin again restores them. That is one more reason to keep `id` and `ref` handling stable.
  Titles already downloaded keep playing offline and can be removed from Descargas.

- **Signed plugins.** A signed plugin ([Signed plugins](signed.md)) shows the line "Firmado por su
  autor" on the consent sheet, a "Firmado" pill on catalog and community cards ("Activo · Firmado" on
  an installed one), and "Clave del autor: ABCD-EF01-2345-6789" in its details (phone: Gestionar; TV:
  the installed plugin's actions). Kino 0.9.45 and later.

## Sending to the TV (Chromecast and DLNA) { #cast }

Plugin titles can be sent to a TV from the player. Nothing in the manifest turns it on: Kino decides
per stream from what your `resolve` returns (`url`, `mime`, `headers`, `drm`):

| Your stream | What Kino does |
| --- | --- |
| mp4/webm (or another progressive file) with **no `headers`**, on a host your plugin may use | The TV fetches the URL itself; the phone moves no bytes. If the TV fails it, it is relayed through the phone. |
| HLS (`.m3u8`) | Through the phone (a Chromecast needs CORS on it): playlists are rewritten so every segment and key goes through the phone. |
| Any file **with `headers`** (Referer, cookies, tokens in headers) | Through the phone: it fetches with your headers and the TV only sees a local address. |
| A [request-signed](signed-streams.md#cast) stream (Kino 0.9.50) | Through the phone, which calls `sign()` for every playlist and segment the TV asks for. |
| DRM (Widevine or ClearKey), DASH, progressive MPEG-TS, or a format nothing tells apart | Not sent: the person reads "Este título no se puede enviar a la TV" (protected ones: "Este título está protegido y no se puede enviar a la TV"). |

What helps authors: return a real `mime` (`video/mp4`, `application/vnd.apple.mpegurl`) or a URL that
ends in the right extension; Kino probes the first bytes of a stream nothing describes (a 1 KB ranged
read, 2 s) but that costs a request. Prefer links that need no `headers` (the lightest route); every
host involved must be one your plugin may reach (declared, typed, or covered by an "any" permission), over
https. While casting, the phone itself stays silent.

## From Kino 0.9.50 { #v0950 }

With nothing new in your manifest, except where said:

- **Play on the TV from the phone.** With two paired devices, "Reproducir en el TV" works for a title
  of any plugin: the TV opens it with **its own copy** of the plugin. If the TV can't, the phone says
  why: "Instala el plugin &lt;name&gt; en el TV para verlo allí", "Activa …", "Configura …",
  "Actualiza …", "Reinstala …", "En el TV hay otro plugin con ese nombre; instala el mismo desde su
  repositorio", "Desbloquea el contenido 18+ en el TV para verlo allí" or, for a TV on an older Kino,
  "Actualiza Kino en el TV para verlo allí". So keep your `id` and your refs the same on every device.
- **New chapters of the series the person follows.** Kino checks now and then (at most every 6 hours)
  the saved series of any usable plugin that declares `episodes`, calling your `episodes(ref)` with the
  saved `ref`, and adds the missing chapters. A failure leaves that series alone and moves on to the
  next. Keep your series refs stable.
- **"Para ti".** A recommendation that comes from a plugin's catalog is saved by its `ref`: a movie as
  a movie, a series with its first season (calling `episodes`).
- **18+ content.** `adult: true` entries of an apiVersion 6 plugin show only with the 18+ code unlocked
  ([18+ content](contract.md#adult)).
- **Channels on Home.** An apiVersion 6 plugin can put channels in its Home rows
  ([Channels in your Home rows](live-channels.md#home-rows)).
- **A section of its own** in the TV sidebar or the phone's Inicio strip, and a group in Categorías,
  for a plugin that declares `section` or exports `categories`
  ([Section, categories and colors](section-theme.md)).
- **Search inside a "Ver más" page.** Every "Ver más" page has "Buscar en esta categoría"
  ([`scopedSearch`](contract.md#scoped-search)).
- **Updates.** A badge on Ajustes ▸ Plugins counts the updates waiting for approval, and a failed call
  of a plugin with a pending update says so ([Updates](publish.md#updates)).
- **Community plugins.** The section carries the note "Plugins de la comunidad — Kino no los revisa ni
  responde por su contenido.", and an installed plugin taken down from the index says "Retirado del
  índice de la comunidad." ([Claims and plugin takedowns](claims.md)).

## Plugins on the person's other devices { #sync }

Kino keeps a person's plugins in step between their own devices (for example phone and TV): an
install, a switch on or off, an uninstall, an approval or a saved setting on one device is sent to
the others, and passwords travel encrypted end to end. Nothing in your plugin changes. What the
other device does: it installs **your plugin again from the same address**, silently when what it
fetches asks for nothing more than the person approved on the first one; if an update adds something
(a host, a capability), it waits in "Plugins de tus otros aparatos" for the person to approve it
there. So keep your repository public and your address stable.
