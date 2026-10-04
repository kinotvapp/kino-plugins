# Publishing your plugin

## To appear in the app, two things { #appear-in-the-app }

People can always install your plugin by typing `owner/repo`, or by pasting the URL of its
`kino-plugin.json` ([below](#manifest-url)). To make it **show up on its own** in
Kino (Ajustes ▸ Plugins ▸ "De la comunidad", and the first-run "Elige tus fuentes"), you need:

1. **The topic `kino-plugin` on the GitHub repository.** It is the only way the app discovers a
   plugin. Set it on the repository that holds `kino-plugin.json` (About ▸ ⚙ ▸ Topics), and keep the
   repository public and not a fork.
2. **A `description` in `kino-plugin.json`** (up to 300 characters). It is the text on your card in
   the app; without it the card has no text. (The GitHub repository description is not read by the
   app, but set it too, for people who open your repository.)

One command does the topic and the repository description:

```
gh repo edit OWNER/REPO --add-topic kino-plugin --description "What your plugin does, in one line"
```

Step by step, with the exact clicks and how to check it: [Get listed in Kino](listed.md).

Then wait: Kino refreshes the list at most every 12 hours per device, or right away when the person
taps "Actualizar". If it still does not appear, see [Why my plugin does not appear](#troubleshooting)
and [Every requirement, one by one](#discovery-requirements).

1. **Create a public GitHub repository** and put `kino-plugin.json` and your entry file (for
   example `plugin.js`) at its root, plus an optional `icon.png` and a `README.md`. Add
   `.kino-storage.json` to `.gitignore`. (A plugin can also live in a subfolder; people then type
   `owner/repo/sub/dir`.)
2. **People install it** in Kino from Ajustes > Plugins, typing `owner/repo` in the field ("Escribe
   usuario/repositorio de GitHub o pega la URL del manifest (kino-plugin.json)") and pressing
   "Agregar". To point at a release, they type `owner/repo@v1.0.0`. Tag your releases so that people
   can pin them. They can also paste the URL of your `kino-plugin.json` on GitHub, on
   raw.githubusercontent.com or on jsDelivr (`https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/kino-plugin.json`;
   jsDelivr needs an exact ref such as `@main` or `@v1.0.0`, `@latest` is the default branch, a range
   such as `@1` is refused): Kino turns any of those into the repository address
   ([every address Kino accepts](index.md#what-a-plugin-is)).
3. **A private repository cannot be installed.** Kino reads your files from
   `raw.githubusercontent.com` without any credentials, and GitHub answers a private repository with
   "not found". Make the repository public, or the plugin cannot be installed.
4. <span id="updates"></span>**To ship an update, raise `version`** (a strictly higher `MAJOR.MINOR.PATCH`; an unchanged or
   lower number is treated as "already up to date", so a fix without a version bump never reaches
   anyone). Kino checks for updates at most once a day per plugin, and when the person taps
   "Buscar actualización". From Kino 0.9.50 it also checks every installed plugin when the app starts
   (at most once every 12 hours).
    - If the new version does not add anything to `hosts`, `permissions`, `download`, `drm` or an
      `insecureHttp` host, and needs a supported `apiVersion`, it is installed silently.
    - If `hosts` or `permissions` grow, or the manifest newly declares `download`, `drm`, or marks an
      already-approved host `insecureHttp`, Kino does **not** apply it: the plugin shows "Actualización
      disponible — requiere tu aprobación" and the person sees the new ones (marked "nuevo") before
      accepting. Removing them needs no approval.
    - A new **required** setting does not block the update: it installs and the plugin shows "Falta
      configurar" until the person fills it in.
    - If the new version needs a higher `apiVersion` than the app supports, the check reports "Este
      plugin necesita una versión más nueva de Kino" and the installed version keeps working.
    - While an update waits for approval, the Plugins entry in Ajustes shows a badge with how many wait
      (phone and TV), and a failed call of that plugin says "Hay una versión nueva de &lt;name&gt;:
      actualízala en Ajustes ▸ Plugins" instead of the usual error (a refused host, your
      [`userMessage`](contract.md#user-message) and `auth_required` still win over it). Kino never
      approves on the person's behalf in that check.
    - **After a Kino update**, the first start checks every plugin that was installed and enabled
      before it, right away. In this release (a build switch Kino will turn off later) the updates that
      wait for approval are then installed **without asking**, once, and only when read from the
      plugin's own install address; a one-time notice "Se actualizaron tus plugins" lists each plugin
      and what it may do now (for example "Envía registros de errores a Kino"), with shortcuts to its
      tab in Ajustes, to disable it and to uninstall it. With the switch off, a one-time sheet "Hay
      actualizaciones de tus plugins" offers "Actualizar todos" and shows each consent sheet in turn.
      Later updates of your plugin follow the rules above.
5. **Give it time.** GitHub serves raw files with a cache of about five minutes (measured:
   `cache-control: max-age=300`), so a change you just pushed can take that long to be visible to an
   install or an update check.
6. **Keep the `id` and the address.** An `id` that is already installed from a different address is
   refused ("Ya hay un plugin con ese id"), so renaming or moving your repository makes it a
   different plugin for the people who installed it. The same goes for a plugin installed from a
   manifest URL: that URL is its address.

The same approval applies to the other additions that need a line on the consent sheet: `channels`
([Live channels](live-channels.md#en-vivo-tab)), `"liveStreamHosts": "any"`
([Channels from any server](live-channels.md#live-stream-hosts)), `"streamHosts": "any"`
([Playing from any server](manifest.md#stream-hosts)), `migrate` ([Moving saved titles](migrate.md)),
`telemetry` or a move from `true` to `"verbose"` ([Logs and telemetry](diagnostics.md#telemetry)) and
`secrets` in a plugin that had none
([Sealed secrets](manifest.md#secrets); adding, changing or removing a secret after that asks
nothing). Hosts the person approved while your plugin ran ([A host you forgot](contract.md#forgotten-host))
and the broad video permission carry over to every update. A plugin with `secrets` only updates from
its default branch, with no `@ref`.

### Sharing it by its manifest URL { #manifest-url }

From the Kino version after 0.9.49 you can also share your plugin as the `https` URL of its `kino-plugin.json`, on GitHub or on any other
public server (your site, GitHub Pages, jsDelivr's `npm/`); the file must be named exactly
`kino-plugin.json`, and `entry` and `icon` are read next to it. A plugin hosted **outside GitHub**:

- cannot use [sealed secrets](manifest.md#secrets) (a manifest with `secrets` installed from a URL is
  refused) and always counts as **unsigned** (a [signature](signed.md) is bound to `owner/repo`);
- updates the same way (Kino re-reads that URL and applies a higher `version`, with the same
  approvals), and that URL is its identity, so do not move it;
- is **never listed in "De la comunidad"**: discovery only searches GitHub repositories with the
  `kino-plugin` topic. To be found, publish on GitHub with the topic.

All the rules: [Installing from a manifest URL](index.md#manifest-url).

## Before you publish { #checklist }

Check that:

- `node sdk/validate.mjs . --run <function> ...` passes for every capability you declare;
- `"entry"` (and `"icon"`) are written **without a leading `./`**: `"plugin.js"`, never `"./plugin.js"`.
  Kino 0.9.45 and older refuse it and the plugin does not install ([why](manifest.md#entry-dot-slash));
- if you want people to know it is yours, [sign it](signed.md) (`apiVersion` 5, Kino 0.9.45+) and sign
  again after every change to `plugin.js` or `version`; the private key is never committed;
- every host your plugin talks to (and every stream and subtitle host) is in `hosts`, including the
  bare domain next to its `*.` form;
- there is no `throw` before the first `await` in a function that a caller wraps in `try`/`catch`
  ([the rejection trap](engine-limits.md#rejection-trap));
- your file uses none of the [missing globals](engine-limits.md#not-node);
- you installed it in Kino and it searches, lists episodes and plays.

## Get found: appear in "De la comunidad" { #get-found }

Kino lists community plugins by searching GitHub for public repositories with the topic
`kino-plugin` (forks are left out).

> **Important: without the `kino-plugin` topic, Kino will not find your plugin.** It is the only way
> the app discovers a plugin: a perfect manifest, a public repository and a thousand stars change
> nothing if the topic is missing. Put it on **the repository that contains `kino-plugin.json`** (a
> common mistake: adding it to another repository by the same author that only holds data, such as an
> `.m3u` playlist). Check it in 10 seconds:
>
> ```
> curl -s https://api.github.com/repos/OWNER/REPO | tr -d ' \n' | grep -o '"topics":\[[^]]*\]'
> ```
>
> `"kino-plugin"` must appear inside `topics`. An empty `"topics":[]` means Kino cannot see you yet.

**Descriptions.** On the card Kino shows the `description` of your **manifest** (up to 300 characters;
leave it empty and the card has no text), so write one. The GitHub repository description (About) is
not read by the app and does not affect discovery, but set it too: it is what people see when they open
your repository. One command does both repository settings:

```
gh repo edit OWNER/REPO --add-topic kino-plugin --description "What your plugin does, in one line"
```

To be listed:

1. On your repository's GitHub page, add the topic `kino-plugin` (About ▸ ⚙ ▸ Topics).
2. Keep `kino-plugin.json` at the root of the repository: Kino reads it to show your plugin's name,
   description, colour and icon, and skips a repository whose manifest is missing or invalid, needs a
   newer `apiVersion` than the person's Kino, or says `"discoverable": false`. A plugin in a subfolder
   can be installed by address but is not searched.
3. Kino keeps the 30 most-starred matches, searches at most every 12 hours per device (and when the
   person taps "Actualizar"), and shows them in their own tab of the Plugins screen, "De la comunidad"
   (beside Recomendados; in "Elige tus fuentes", after the recommended plugins).
   Installing one goes through the same consent sheet as any other plugin.

To stay out of the search while keeping the topic, set `"discoverable": false`;
`node sdk/validate.mjs .` then prints "No aparecerá en la búsqueda de Kino".

The rest of this section spells out every rule the app applies, with its exact value.

### Every requirement, one by one { #discovery-requirements }

| # | Requirement | The exact rule |
| --- | --- | --- |
| 1 | **A public GitHub repository** | The search is made without any credentials, so GitHub only ever returns public repositories. |
| 2 | **Not a fork** | The search asks `fork:false`, and the app also drops any result whose `fork` is not `false`. Create your repository with "Use this template" or from scratch, never with "Fork". |
| 3 | **A plain repository address** | The result's `html_url` must be exactly `https://github.com/<owner>/<repo>` and its owner's login must match `<owner>`. `<owner>` matches `^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`; `<repo>` matches `^[A-Za-z0-9._-]{1,100}$` and is not `.` or `..`. Every normal GitHub repository passes. |
| 4 | **The topic `kino-plugin`** | **Mandatory.** Exactly that topic, set on the repository that holds `kino-plugin.json` (About ▸ ⚙ ▸ Topics, or `gh repo edit owner/repo --add-topic kino-plugin`). Without it the app never sees you, whatever else you have. |
| 5 | **`kino-plugin.json` at the root, on the default branch** | The app reads `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json` (`HEAD` is the default branch). A manifest in a subfolder or only on another branch is not found. |
| 6 | **At most 16 KB** | A bigger manifest (16,384 bytes) is dropped. |
| 7 | **A valid manifest** | The same parser as the installer: every rule of [The manifest](manifest.md). `node sdk/validate.mjs .` checks it with the same messages. (Discovery reads only the manifest; the entry file and its exports are checked when someone installs.) |
| 8 | **An `apiVersion` the person's Kino supports** | A manifest whose `apiVersion` is higher than the build supports is invalid for that build ("Este plugin necesita una versión más nueva de Kino"), so it does not show on devices with an older Kino. Kino 0.9.50 supports up to `6`; 0.9.45 to 0.9.49, up to `5`. |
| 9 | **Not `"discoverable": false`** | Leave it out or set `true`. Any value that is not a boolean makes the whole manifest invalid. |
| 10 | **An `id` nobody else owns** | See [Why a valid plugin can still be hidden](#discovery-hidden). |
| 11 | **Enough stars to be in the top 30** | See [How the app searches](#discovery-search). |

The card shows your manifest's `name` and `description`, the tag "por &lt;owner&gt;", and your `color`
(`#RRGGBB`) and `icon`: the path the manifest names, which must be a real PNG (it starts with the PNG
signature) of at most 128 KB. An icon that is missing, too big or not a PNG only costs the icon; the
card falls back to the neutral look. The app keeps each card's colour and icon for a day.

### How the app searches { #discovery-search }

- **The one request.** Every device makes exactly this GitHub API call, with no token, no cookies
  and no redirects followed:

    ```
    https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=50
    ```

    Open it in a browser to see what Kino sees. An answer bigger than 1 MB is not read, and the call
    gives up after 20 s.
- **Top 30.** From that one page of up to 50 results (most stars first), the app keeps the first 30
  well-formed ones (requirements 2 and 3). There is no second page: a repository below them is never
  seen. Then it reads each of those 30 manifests; the ones that fail requirements 5 to 9 are dropped
  **after** taking their slot, so the list can show fewer than 30.
- **The manifest scan.** At most 4 manifests at a time, 10 s each, and 20 s for the whole scan. A
  manifest that could not be read for a passing reason (offline, a timeout, a 5xx or 429, the budget
  spent) keeps the plugin as it was last seen; a verdict (404, 410, 451, too big, invalid, too new,
  `"discoverable": false`) drops it.
- **On screen.** "De la comunidad" is its own tab of the Plugins screen, beside "Recomendados" (in
  "Elige tus fuentes" it comes after the recommended plugins), on phones and TVs, in the search's order (most stars first). The search box above the
  list filters it too, by name, description and "por &lt;owner&gt;". A plugin already installed from the
  same repository shows "Instalado".
- **When it searches.** When the plugins screen opens: the copy saved on the device shows at once,
  and GitHub is asked again only if that copy is older than **12 hours**. "Actualizar" asks right
  away, but never twice within **60 seconds** on the device.
- **Rate limits.** GitHub limits searches without a token per IP address (a shared mobile or office
  IP can run out). On a 403 or 429 the device waits what GitHub says (`Retry-After`, else
  `X-RateLimit-Reset`, else 15 minutes; always between 1 minute and 24 hours) and keeps showing its
  last list meanwhile.
- **Nothing installs by itself.** Tapping a community card opens the same consent sheet as any other
  plugin, with "Plugin no verificado: solo instálalo si confías en quien lo hizo.", and nothing of
  the plugin runs before the person taps "Instalar".
- **The empty states** the person may read: "Buscando plugins de la comunidad…", "Por ahora no hay
  plugins de la comunidad para mostrar." and "Todos los plugins de la comunidad que encontramos ya
  están en Recomendados."

### When GitHub cannot answer { #discovery-fallback }

When the search fails (no network to GitHub, a rate limit, a TLS error from a wrong clock) or finds
nothing valid, and the device has no search list of its own saved, the app reads a backup community
list that the Kino team publishes on the same CDNs as the recommended plugins. It holds only
`owner/repo` and a star count: each repository's `kino-plugin.json` is still read from GitHub and
checked with every rule above. The app asks GitHub again as soon as the spacing and any backoff
allow.

There is nothing to request to be in that list: it is rebuilt from the same GitHub search (public,
not a fork, a `kino-plugin.json` with an `id` that is not `"discoverable": false`, top 30) whenever the
Kino team republishes it, so a plugin that appears in the search appears in the next backup list.

### Why a valid plugin can still be hidden { #discovery-hidden }

The list drops, whatever the stars:

- **A repository that is already recommended.** It shows under "Recomendados" instead, never twice.
- **An impostor id.** A plugin whose manifest `id` belongs to a recommended plugin from **another**
  repository is dropped, so it can never hide the real one. Today the recommended ids are `internet-archive` and `own-server`; the list
  can grow, so pick an id that is clearly yours.
- **An id already installed from another repository.** Its install would be refused ("Ya hay un
  plugin con ese id"), so it is not offered. This is per device: it hides only where that other
  plugin is installed. A copy of the template that keeps `"id": "archive-org"` hides itself for
  everyone who installed the Internet Archive plugin: **always change the `id`**.
- **Repeats.** The same repository listed twice, or two repositories with the same `id`: the first
  one (the one with more stars) wins.
- **A repository hidden from the section.** The repositories in
  [`community-blocklist.json`](claims.md) never show in "De la comunidad" nor in the fallback list;
  installed copies keep working and updating, and they can still be installed by address
  ([Claims and plugin takedowns](claims.md)).
- **The ids Kino keeps for itself** (`live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys`; older versions reserve a few more) make the
  manifest invalid, so they never get this far.

### "Mi plugin no aparece": troubleshooting { #troubleshooting }

1. **Is it in GitHub's answer?** Open the search URL above in a browser and look for your
   `full_name` in `items`. If it is not there:
    - check the topic is exactly `kino-plugin` on the repository page, and that it is set on **the
      same repository that holds `kino-plugin.json`** (not a sibling one);
    - look from a terminal: `curl -s https://api.github.com/repos/OWNER/REPO | tr -d ' \n' | grep -o '"topics":\[[^]]*\]'`
      (`"topics":[]` means you do not have it yet);
    - check the repository is public and not a fork (the page says "forked from …" under the name
      of a fork; create a new repository from the template instead);
    - wait: GitHub indexes a new topic or a newly public repository on its own schedule, usually
      within minutes but with no promised delay;
    - if there are more than 50 results, yours is not in the first page: see the next point.
2. **Is it in the top 30?** Count the well-formed results above yours in that answer. Below 30, it
   is not listed; stars are the only ranking.
3. **Is the manifest there?** Open
   `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json`. A 404 means it is not at
   the root of the default branch.
4. **Does `entry` start with `./`?** `"./plugin.js"` installs on Kino 0.9.46 and later but fails on 0.9.45
   and older ("El campo \"entry\" debe ser una ruta relativa a un archivo .js"). Write `"plugin.js"`.
   The same goes for `"icon"`.
4. **Is the manifest valid?** Run `node sdk/validate.mjs .` in the repository: exit code 0 and no
   "No aparecerá en la búsqueda de Kino" line. Check it is at most 16 KB.
5. **Can that phone read it?** Is `apiVersion` at most what the person's Kino supports? Update Kino,
   or lower the `apiVersion` if you do not need its features.
6. **Is the `id` yours?** Not a recommended plugin's id, not the id of a plugin already
   installed on that device from another repository (not `archive-org` from the template).
7. **Is it already recommended?** Then it is under "Recomendados", not "De la comunidad".
8. **Is the device's copy old?** The list refreshes at most every 12 hours; tap "Actualizar" (wait
   60 seconds between taps). After a 403/429 from GitHub the device waits up to what GitHub asked.
9. **Did you just push?** `raw.githubusercontent.com` caches files for about five minutes.
