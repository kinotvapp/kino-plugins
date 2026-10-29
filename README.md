# Kino plugins

Everything you need to write a plugin for [Kino](https://github.com/kinotvapp/kino-light), the
Android video app for phones and TVs: the manifest, the contract, the `kino` API, every limit, how to
test with the Node kit, and how to be found in the app's "De la comunidad" list.

**Read it at <https://kinotvapp.github.io/kino-plugins/>** — Spanish by default,
[English](https://kinotvapp.github.io/kino-plugins/en/) with the language switcher.

- **Start from an example:** [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
  (Internet Archive; the simplest starting template, with the `sdk/` kit) and
  [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) ("Tu servidor"
  1.5.0, the complete API demo: your own media server and every feature up to apiVersion 7 end to end).
- **Sync providers** (apiVersion 12, Kino 0.9.74): a plugin can carry the person's Kino sync between
  their devices through a service: [Sync providers](https://kinotvapp.github.io/kino-plugins/en/sync-providers/),
  with three example providers in public repositories:
  [Sync-Gram](https://github.com/kinotvapp/kino-plugin-sync-gram), on a Telegram bot of the person's own,
  [Sync Servidor](https://github.com/kinotvapp/kino-plugin-sync-server), on a server they run (not listed), and
  [Sync-Gram Cuenta](https://github.com/kinotvapp/kino-plugin-sync-gram-account), on the person's own Telegram
  account (apiVersion 13, not listed).
- **apiVersion 13** (in development for the next Kino version, not in any released Kino yet): sockets and
  streams the plugin serves itself ([Sockets and plugin-served bytes](https://kinotvapp.github.io/kino-plugins/en/bytes/)),
  a SQLite catalog and a larger storage ([Catalog and large storage](https://kinotvapp.github.io/kino-plugins/en/catalog/)),
  images the plugin serves ([Images from the plugin](https://kinotvapp.github.io/kino-plugins/en/images/)) and QR codes
  ([QR codes](https://kinotvapp.github.io/kino-plugins/en/qr/)).
- **Screens** (apiVersion 14, upcoming with Kino 0.9.74, not published yet): a plugin can draw its own full screen
  inside Kino from a JSON tree of Flutter-style components, the same tree on the phone and the TV, and the preferred way
  to build a plugin's UI: [Screens](https://kinotvapp.github.io/kino-plugins/en/screens/) and the component catalogue
  ([layout, content and actions](https://kinotvapp.github.io/kino-plugins/en/screen-components/),
  [forms, overlays and navigation](https://kinotvapp.github.io/kino-plugins/en/screen-forms/),
  [state, style and recipes](https://kinotvapp.github.io/kino-plugins/en/screen-reference/)); also player-panel tabs on any
  title, [rooms](https://kinotvapp.github.io/kino-plugins/en/rooms/), [background jobs, shared results and
  AI](https://kinotvapp.github.io/kino-plugins/en/jobs-and-shared/), and [`enhancements`](https://kinotvapp.github.io/kino-plugins/en/enhancements/)
  to offer all of it without raising your apiVersion. Examples:
  [kino-plugin-ui-gallery](https://github.com/kinotvapp/kino-plugin-ui-gallery),
  [kino-plugin-news](https://github.com/kinotvapp/kino-plugin-news) and
  [kino-plugin-watch-party](https://github.com/kinotvapp/kino-plugin-watch-party).
- **Identity, notices and plugin stores** (apiVersion 15, arriving with Kino 0.9.77): a plugin can
  know who the person is without a sign-up ([Identity](https://kinotvapp.github.io/kino-plugins/en/identity/)), leave notices in
  the Home bell ([Notices in the bell](https://kinotvapp.github.io/kino-plugins/en/notifications/)) and be a **store**, a source
  of plugins for Kino's store, local (a static list) or live (its own API); the store view has the tabs "De Kino", "De la comunidad" and "Instalados", one plugin per id across stores:
  [Plugin stores](https://kinotvapp.github.io/kino-plugins/en/plugin-stores/) and two copyable
  [example stores](https://kinotvapp.github.io/kino-plugins/en/store-examples/).
- **Signed plugins** (optional, Kino 0.9.45+): sign your plugin with your own key so people know every
  update is yours: [Signed plugins](https://kinotvapp.github.io/kino-plugins/en/signed/). What changed
  for authors, by Kino version: [What's new](https://kinotvapp.github.io/kino-plugins/en/changelog/).
- **Building with an AI assistant?** Point it at [`AGENTS.md`](AGENTS.md), or at
  [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt) (the whole guide in one
  file). The site has [a ready-to-paste prompt](https://kinotvapp.github.io/kino-plugins/ai/).
- **Machine-readable contract:** [`contract.json`](docs/reference/contract.json) and
  [`kino.d.ts`](docs/reference/kino.d.ts).

## Working on the docs

```
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
mkdocs serve            # http://127.0.0.1:8000, both languages
mkdocs build --strict   # what CI runs
```

Each page is a pair: `docs/<page>.md` (Spanish) and `docs/<page>.en.md` (English); the build fails if
one is missing. `hooks/llms.py` writes `llms-full.txt` and copies `AGENTS.md` to the site root.
`scripts/sync-from-kino-light.sh` refreshes `contract.json`, `kino.d.ts` and the generated tables from
Kino's repository and reports upstream guide changes to port. Pushing to `main` publishes the site
with GitHub Actions.

## License

The documentation, the site tooling and the reference files in this repository are licensed under the [Apache License 2.0](LICENSE). Copyright 2026 kinotvapp.
