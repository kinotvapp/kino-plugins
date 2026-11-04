# GitHub sign-in for the theme creator

The theme creator is a static page, so it cannot hold a client secret and `github.com/login/*` sends no CORS
headers. This folder is the small proxy that solves both: it calls GitHub's **device flow** from a runtime that
can, holds only the OAuth app's **public client id**, and never sees or stores a token beyond passing GitHub's
answer back to the browser.

## 1. Create the OAuth app

GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**:

| Field | Value |
| --- | --- |
| Application name | `Kino theme creator` |
| Homepage URL | `https://kinotvapp.github.io/kino-plugins/` |
| Authorization callback URL | `https://kinotvapp.github.io/kino-plugins/theme-creator/` |

The callback URL is only required by the form: the device flow never redirects, so it is not used. Use the
English page (`https://kinotvapp.github.io/kino-plugins/en/theme-creator/`) if that is the page you share.

Then, in the app's own page, **tick “Enable device flow”** (mandatory since 2022; without it GitHub answers
`device_flow_disabled`). Copy the **Client ID**; no client secret is needed for the device flow.

That Client ID is already the one in `worker.mjs` (`CONFIG.CLIENT_ID`): if you create a different OAuth app, change it
there.

## 2. Deploy the proxy

Everything is already set at the top of `worker.mjs` —`CLIENT_ID`, `SCOPE` and `ALLOWED_ORIGINS`—, so there are no
variables to configure. Either way works:

**From the Cloudflare dashboard, without installing anything.** Workers & Pages → **Create** → **Worker** → name it
`kino-theme-creator-oauth` → **Deploy** → **Edit code** → select everything in the editor, paste all of `worker.mjs` →
**Deploy**. Then open the Worker's URL in a new tab: it answers `{"ok":true,...}` when it is alive. The address is
`https://kino-theme-creator-oauth.<your-subdomain>.workers.dev`.

**With wrangler**, from this folder:

```bash
npx wrangler deploy
```

`ALLOWED_ORIGINS` allows `https://kinotvapp.github.io`; add the origin of a local preview to that array in `worker.mjs`
while testing (for example `http://localhost:8000`). `SCOPE` is `public_repo`, enough to create a public repository,
write its files and set its topics.

The deploy prints the Worker's URL, e.g. `https://kino-theme-creator-oauth.<account>.workers.dev`.

## 3. Point the pages at it

Put that URL in the `data-gh-proxy` attribute of the creator's container, in both pages:

```html
<div id="kino-theme-creator" data-lang="es" data-gh-proxy="https://kino-theme-creator-oauth.<account>.workers.dev">…</div>
```

- `docs/theme-creator.md`
- `docs/theme-creator.en.md`

The pages in this repository already use the deployed Worker:
`https://kino-theme-creator-oauth.juanpry2345tjlfm.workers.dev`.

Until that attribute is set, the panel hides “Sign in with GitHub” and explains how to configure it. It always
accepts a personal access token with the `public_repo` scope as a fallback, so publishing works with no proxy at
all.

## What the page does with the token

- It asks `GET /user` to show who is signed in, then `POST /user/repos` (or reuses the repository if it exists),
  writes `kino-plugin.json`, `plugin.js` and `.gitignore` through the Contents API, and sets the
  `kino-plugin` topic (merged with the repository's current topics).
- The token lives in `sessionStorage` of that tab only (wiped when it is closed) and goes straight to
  `api.github.com`: no server of ours relays it.
- `kino-plugin` is the only way Kino discovers a plugin, and it only looks at public, non-fork repositories
  (`docs/publish.md`).
