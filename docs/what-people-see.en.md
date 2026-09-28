# What people see

- **The consent sheet.** When someone types your address, Kino shows "Instalar &lt;name&gt;", your version
  and author, the description, the list of hosts under "Se va a conectar con:" (left out when
  `hosts` is empty), and the warning
  "Plugin no verificado: solo instálalo si confías en quien lo hizo." with "Instalar" and "Cancelar".
  If your manifest has a `password` setting it adds "Este plugin usa tu usuario y contraseña"; a `url`
  setting adds "Se conectará a los servidores que escribas en su configuración". Declaring `download`
  adds "Puede descargar videos para verlos sin conexión", `drm` adds "Reproduce video protegido (DRM)",
  `channels` adds "Agrega canales en vivo a la pestaña En vivo", each `insecureHttp` host adds, in red, "Conexión sin cifrar con &lt;host&gt;", and `liveStreamHosts: "any"` adds, in red, "Puede reproducir canales desde cualquier servidor que indique su lista". Nothing of yours runs
  before they accept.
- **Configurar.** A plugin with `settings` has a "Configurar" button in Ajustes ▸ Plugins. Until
  every required setting has a value its status is "Falta configurar" and nothing of it runs.
- **Ver más.** A Home row with a `ref` ends in a "Ver más" card, and a search page with a `next`
  shows "Ver más resultados de &lt;name&gt;": both open a grid that asks you for the next page as the
  person scrolls.
- **Search, Home and the library.** Your results appear in search under your plugin's name (with your
  `color`), next to the app's own sources; your `home` rows appear on Home after the app's own; your
  titles play in Kino's player and appear in "Continuar viendo" and the library. Titles of a plugin
  that declares `download` can be saved for offline viewing ([Downloads](manifest.md#downloads));
  Chromecast and DLNA are not available for plugin titles in this version. A `live` item's card
  says "EN VIVO" and plays on tap, with no info page; a channel never enters "Continuar viendo" or
  the library ([Live channels](live-channels.md#live-items)). A plugin found through the `kino-plugin`
  topic carries the label "De la comunidad" on its card.
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
