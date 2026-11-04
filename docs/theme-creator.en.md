# Theme creator { #theme-creator }

Build an [app theme](themes.md) while you watch it take shape, with an AI assistant that also **draws its logo in SVG** (the
theme's icon). On the left is Kino (Home, the side menu, search and a dialog) with sample data and, below it, the logo as the app
would show it; on the right, the theme's values; below, the code as it gets written. It starts from Kino's own theme: every value
you move changes the view at once, and whatever Kino would drop (for contrast or range) is dropped here too and explained
underneath, in the kit's own words.

Press the three-line menu to open the side menu and **Home** to go back to Home. With **TV** you see the side rail and the focus.
You can also type or paste the JSON below: the controls follow what you write.

<div id="kino-theme-creator" data-lang="en" data-gh-proxy=""><noscript>The creator needs JavaScript.</noscript></div>

## The logo and the AI assistant { #logo-ai }

A theme's logo ([`logo`](themes.md#logo)) is **vectors only**: a `wordmark` (the long logo of the menu and the header), a `mark`
(the square in the TV rail) and a `decor` drawn over the "o" of Kino's own logo. The creator really draws them: in the phone's
header and menu, in the TV rail, and in the **Your logo in the app** strip under the preview.

Ask the assistant in your own words ("a neon lightning icon", "a wave mark for my blue theme") and it writes the paths. While it
works you see **which step it is on**: preparing the request, asking the AI, reading the answer, checking the values and updating
the preview. Every value it proposes is checked against the contract's rules before it is applied: 1 to 8 paths of up to 2,000
characters each, only SVG path commands (`M L H V C S Q T A Z`), a canvas of at most 1,000 × 1,000 and at most 8 times wider than
tall, and a fill of `accent`, `onAccent`, `textPrimary`, `textSecondary` or a `#RRGGBB`. Anything that does not fit is not applied
and the reason is shown underneath.

The logo can also come in the JSON you paste, and it is included in the code and in the `kino-plugin.json` you download. In the
**Logo and icon** section on the right you can see each piece's size and path count and remove them one by one.

## Publishing the plugin from the creator { #github }

The **Publish to GitHub** panel creates the plugin's repository and uploads `kino-plugin.json`, `plugin.js` (with `export {};`)
and a `.gitignore`, without leaving this page. It also writes the repository's description and, if you leave the box ticked, adds
the **`kino-plugin`** topic: the only way Kino discovers a plugin, and it must be a public, non-fork repository
([Publishing your plugin](publish.md#appear-in-the-app)). When it finishes it tells you the `owner/repo` to type in Kino.

There are two ways to sign in, and both happen in your browser, which talks straight to `api.github.com` (the token never goes
through a server of this site):

- **Sign in with GitHub** (recommended): GitHub's device flow. The page shows a code, you type it at
  `https://github.com/login/device` and approve the `public_repo` scope. No client secret lives here.
- **A token**: a personal access token with the `public_repo` scope, pasted into the field. It is kept in that tab only and wiped
  when you close it. It always works, even with nothing configured.

### Setting it up in your copy of the site { #github-setup }

Signing in with GitHub needs a small proxy, because `github.com/login/*` sends no CORS headers and a static page cannot keep a
client secret. It lives in
[`github-oauth-worker/`](https://github.com/kinotvapp/kino-plugins/tree/main/github-oauth-worker) and deploys to Cloudflare Workers:

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**:
    - **Homepage URL**: `https://kinotvapp.github.io/kino-plugins/`
    - **Authorization callback URL**: `https://kinotvapp.github.io/kino-plugins/theme-creator/` (the device flow never redirects,
      so it is unused; the form asks for it anyway).
    - On the app's page, tick **Enable device flow**. Without it GitHub answers `device_flow_disabled`.
    - Copy the **Client ID**. This flow needs no secret.
2. Deploy `github-oauth-worker/`. The Client ID, the scope and the allowed origin are already inside `worker.mjs`, so there is
   nothing to configure: paste the file into a Worker in the Cloudflare dashboard (Workers & Pages → **Create** → **Worker**
   → **Edit code** → **Deploy**), or deploy the folder with `npx wrangler deploy`. Open the Worker's URL in another tab: if it
   answers `{"ok":true}` it is alive. To test on your local preview, add its origin to `ALLOWED_ORIGINS` in that same file.
3. Paste the Worker's URL into the creator container's `data-gh-proxy` attribute, in this page and in the Spanish one:

    ```html
    <div id="kino-theme-creator" data-lang="en" data-gh-proxy="https://kino-theme-creator-oauth.YOUR-ACCOUNT.workers.dev">…</div>
    ```

Without that attribute the panel hides "Sign in with GitHub" and explains how to configure it; the token keeps working.

## Using the result { #use }

1. Download `kino-plugin.json` (or copy the code) and put it in a new GitHub repository, with a `plugin.js` that only says
   `export {};`, or let the **Publish to GitHub** panel do it for you. A plugin that only ships themes needs no capabilities and no
   hosts: [A plugin that only brings themes](themes.md#theme-only).
2. Give the repository the `kino-plugin` topic and [publish it](publish.md).
3. Validate with `node sdk/validate.mjs .` (the [kit](test-locally.md)): it prints the same warnings you see here.

The preview is an approximation of Kino made with HTML and CSS: it is good for choosing colors, shapes and borders, but the app has
the last word. The **Player** values are kept in the theme even though the preview only shows a small bar. The price (`price`), the
experience (`experience`) and the person's adjustments (`adjustable`) are written by hand in the code: see
[App themes](themes.md).
