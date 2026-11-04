# GitHub sign-in proxy for the theme creator

The theme creator is a static page: it cannot hold a client secret and `github.com/login/*` sends no CORS headers. This single-file
Cloudflare Worker makes the two GitHub **device flow** calls for it. The page works without it (it also takes a one-repository token).

- **Sees the token.** It receives the access token from GitHub and hands it to the browser. It stores nothing and logs nothing, and it
  forwards only `access_token`, `token_type`, `scope`, `expires_in` (never the refresh token). Run it only from an account you control.
- **Only this page.** Calls from any origin but `https://kinotvapp.github.io` get 403.
- **Fixed link.** The verification link it returns is always `https://github.com/login/device`.
- **Limits.** Body of at most 2 KB and a best-effort 30 calls per minute per client and isolate. Workers share no memory between
  isolates, so this is not a hard limit; GitHub rate-limits the OAuth app on its side too.

Deployed as `kino-theme-creator-oauth` at `https://kino-theme-creator-oauth.kinotv.workers.dev`, with the OAuth App *Kino theme
creator* owned by `kinotvapp` (device flow enabled; Client ID `Ov23liucTnzDF7RmUGIL`, a public value). `public_repo` is the scope it asks for.

## Deploying your own

1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**; tick **Enable Device Flow**; copy the **Client ID**.
2. Put it in `CONFIG.CLIENT_ID` in `worker.mjs`, and your site's origin in `ALLOWED_ORIGINS`.
3. Cloudflare dashboard → Workers & Pages → Create → Hello World → **Edit code** → paste `worker.mjs` → **Deploy**
   (or `npx wrangler deploy` here). Opening the Worker's URL answers `{"ok":true,...}`.
4. Put its URL in the creator container's `data-gh-proxy` attribute, in `docs/theme-creator.md` and `docs/theme-creator.en.md`.
