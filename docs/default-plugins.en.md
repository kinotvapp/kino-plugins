# Plugins that come installed { #default-plugins }

Kino installs a few plugins on its own on every device, without the person visiting the store and without carrying them
inside the APK. Today they are **Kino Social** and **Solo noticias**. The list is a file, `default-plugins.json`, which Kino
keeps in the public repository `kinotvapp/kino-plugins`, next to the community blocklist. This page describes that file and
what the app does with it; **it is not a way to make your plugin come installed**: only Kino publishes the list.

## Where it is read { #where }

The app reads the file from GitHub (`raw.githubusercontent.com/kinotvapp/kino-plugins/main/default-plugins.json`) and, if that
fails, from jsDelivr's copy (`cdn.jsdelivr.net/gh/kinotvapp/kino-plugins@main/default-plugins.json`). Both are destinations
Kino already uses: no new network destination. It keeps a copy on the device and refreshes it at most every 12 hours, with a
3-hour back-off after a failed attempt.

Limits: 64 KB, 100 entries and `"schema": 1`.

## The format { #format }

```json
{
  "schema": 1,
  "plugins": [
    { "id": "kino-social", "repo": "kinotvapp/kino-social" },
    { "id": "news", "repo": "kinotvapp/kino-plugin-news", "required": false }
  ]
}
```

- `id` (required): the plugin's manifest `id` (`^[a-z0-9][a-z0-9-]{1,39}$`, and not a reserved name). It lets the app decide
  offline, before downloading anything, whether the plugin is installed or the person removed it; after the preview, the
  install is refused if the manifest's `id` is different.
- `repo` (required): the plain `owner/repo` it installs from (no URL, no `@ref`).
- `required` (optional): `true` hides **Desinstalar** and refuses every uninstall (the screen, the registry and an uninstall
  synced from another device); the plugin can still be switched off. Only an entry that says `"required": false` clears it
  again; an entry without the field, or a plugin that is no longer in the file, never does.
- Unknown fields are ignored. An entry that breaks a rule above (or repeats an earlier `id`) is skipped and reported once. A
  file that is not JSON, of another schema or without a `plugins` array is ignored whole and the saved copy stays in use.

## What Kino does with the list { #what-kino-does }

At every start (after the restore decision, and without delaying it) and on the 12-hour update round, for each entry and in
order:

1. A plugin with that `id` already installed (in any state) is the person's: only its `required` mark follows the entry (it is
   set when the listed repository carries the plugin signed by Kino).
2. One the person removed, on this device or on another of theirs (a synced uninstall), is never installed again.
3. A repository the community takedown list retires is skipped.
4. The plugin must be signed with Kino's own author key (fingerprint 07DA-B67F-2ACF-B4D3) and read from its GitHub
   repository; anything else is refused. The file is unsigned on purpose, like the takedown list: a tampered file can only
   install plugins Kino signed.
5. It is installed silently (no consent sheet, no notice), with its whole manifest approved and its telemetry consent left
   off, and recorded in plugin sync like any install.

Removing an entry never uninstalls anything. A failure (no network, a refused preview) is retried at the next round.

## The two entries today { #today }

| Plugin | `id` | `repo` |
| --- | --- | --- |
| Kino Social | `kino-social` | `kinotvapp/kino-social` |
| Noticias («Solo noticias» in the catalog) | `news` | `kinotvapp/kino-plugin-news` |

Both can be uninstalled and switched off (neither carries `required`).

## Publishing it (Kino does this) { #publishing }

1. `default-plugins.json` at the root of `kinotvapp/kino-plugins` (`main`) is edited and pushed. Every plugin listed must
   already be published and signed with Kino's author key, or devices refuse it.
2. jsDelivr may serve the previous copy for a while; GitHub is read first.
3. Devices pick it up at their next start or 12-hour round. To retire one of the default plugins its entry is removed: devices
   that already have it keep it.

For your own plugin, the way is [getting listed in Kino](listed.md) or a [plugin store](plugin-stores.md).
