# Kino plugins

Everything you need to write a plugin for [Kino](https://github.com/kinotvapp/kino-light), the
Android video app for phones and TVs: the manifest, the contract, the `kino` API, every limit, how to
test with the Node kit, and how to be found in the app's "De la comunidad" list.

**Read it at <https://kinotvapp.github.io/kino-plugins/>** — Spanish by default,
[English](https://kinotvapp.github.io/kino-plugins/en/) with the language switcher.

- **Start from an example:** [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
  (Internet Archive; the template, with the `sdk/` kit) and
  [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) (your own
  media server, and every apiVersion 3 feature).
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
