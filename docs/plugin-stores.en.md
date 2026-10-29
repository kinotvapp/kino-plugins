# Plugin stores { #plugin-stores }

!!! note "Available with the next Kino version"
    `pluginStore` is `apiVersion` 15 and arrives with the next Kino version (not published yet), together with
    [`identity`](identity.md) and [`notifications`](notifications.md). An older version refuses these plugins with
    «Este plugin necesita una versión más nueva de Kino».

A plugin that declares **`pluginStore`** is a **source of plugins** for Kino's store: it hands Kino a list of plugins people
can install, and Kino does everything else. Anyone can publish a store, backed by GitHub, by their own server or by a static
JSON file.

The author of a plugin answers for it; **Kino only lists what stores hand it**. A store never installs anything by itself:
installing is always Kino's own flow (preview, consent sheet, install).

## How it fits together { #how }

- **Kino paints the store, not the plugin.** Kino keeps one **local index** holding the entries of every store, each row
  tagged with its store, and the Plugins screen reads only that index: cards, search, categories, sort and pagination are
  local queries, instant and the same with no network.
- **Your plugin only hands over entries.** It syncs (`storeSync`) in the background and, if it is a live store, answers
  while the person browses (`storeList`, `storeSearch`). It draws nothing.
- **Three tabs.** The store view has "From Kino", "Community" and "Installed" (in Spanish: «De Kino», «De la comunidad»,
  «Instalados»). "From Kino" is Kino Plugins' default list. "Community" is everything else, from every store, **without Kino's
  list**: it has the sort («Populares» or «Recientes»), the store filter and the live stores.
- **Every card says where it came from**: at the bottom, the store's icon and «de &lt;store name&gt;». At the top there is a
  store filter: «Todas las tiendas» (the default), then every installed and active store.
- **Kino Plugins** is the store that ships in the app: an ordinary, signed plugin that cannot be uninstalled (it can be
  switched off). It is the worked example of a local store: see [below](#kino-plugins).

## The manifest { #manifest }

```json
{
  "id": "ana-store", "name": "Ana's store", "version": "1.0.0", "apiVersion": 15, "entry": "plugin.js",
  "hosts": ["plugins.ana.example"],
  "capabilities": ["pluginStore"],
  "pluginStore": { "mode": "local", "name": "Ana's store" }
}
```

- `pluginStore` (the capability) needs `apiVersion: 15`, **may be declared alone** (a store plays nothing, so it needs
  neither `resolve` nor `search`), is not offered through [`enhancements`](enhancements.md) and needs the person's approval
  at install and on the update that adds it.
- The `pluginStore` block is optional: `mode` is `"local"` (the default) or `"live"`, and `name` (1 to 60 characters) is how
  the store shows in the filter and on its cards (default: the plugin's `name`). The block without the capability is refused.
- `hosts`: your store reaches only the hosts you declare, like any plugin.
- **One plugin per `id`.** Do not use the id `kino-plugins`: it is Kino's own store and no store may list it. And when two
  repositories claim the same `id` across all stores, only one stays: the one in Kino Plugins' list or, if none is there, one
  picked deterministically (see [how Kino mixes stores](#mixing)).

## `storeSync`: every store { #store-sync }

```js
export async function storeSync({ reason, since, state }) {
  // reason: "schedule" (the background refresh) or "reload" (the person pressed reload)
  // since:  when this store last synced successfully, in ms (absent the first time, and when Kino lost your rows)
  // state:  what you returned as `state` last time (at most 16 KB of JSON; also absent in those cases)
  const r = await kino.fetch("https://plugins.ana.example/list.json");
  return { full: true, entries: r.json().plugins.map(toEntry), state: { etag: "…" } };
}
```

It answers `{ full, entries, removed?, state? }`:

| Answer | What Kino does |
| --- | --- |
| `full: true` | `entries` is the **whole** list: Kino replaces your store's rows; anything missing is removed. |
| `full: false` | `entries` are additions or changes and `removed` the addresses that left: Kino applies them. An empty change (`entries: []`) means "nothing changed". |
| `state` | A small object (a cursor, an etag, the date of your last index) that Kino keeps and hands back on the next call. |

How you get the list (GitHub, your server, a static file) is your business. `storeSync` runs **only in the background**, at the
interval the person chooses (every 2 hours by default, Wi-Fi only), and when they press the reload icon; nothing waits for it
while they browse. A store that fails 3 times in a row pauses until the next reload.

**Be ready for `since` to be absent at any time.** If Kino loses your store's rows (a restore, a rebuilt database), it syncs the
store again from scratch: no `since` and no `state`, just like the first time. Your `storeSync` must then answer its **whole**
list (`full: true`) and not assume it has a saved cursor.

## An entry (`StoreEntry`) { #entry }

| Field | What it is |
| --- | --- |
| `address` | What Kino installs from: `owner/repo`, `owner/repo/path`, `owner/repo@ref` or `url:https://…/kino-plugin.json`. Required unless there is `stremio`. |
| `id` | The plugin's `id` (its `kino-plugin.json`'s). Required. |
| `name` | 1 to 60 characters. Required. |
| `description`, `longDescription` | Up to 300 and up to 4000 characters. |
| `categories` | `movies`, `series`, `anime`, `live`, `radio`, `subtitles`, `utilities`, `adult`. |
| `tags`, `icon`, `screenshots` | Up to 10 tags of 30 characters; the icon and up to 8 screenshots, `https` only. |
| `version`, `author` | Short text (40 and 60 characters). |
| `popularity`, `updatedAt` | Numbers: for the «Populares» and «Recientes» sorts of "Community" (`updatedAt` in ms). |
| `stremio`, `requires`, `needsSetup` | A Stremio addon installs through Kino's Stremio flow (then `address` may be absent); `requires` lists capabilities this Kino must be able to run, or the entry is hidden; `needsSetup` says it asks for configuration. |
| `signed`, `authorKey` | **Hints**: the card says «Firmado», and an installed plugin with that id pinned to that author key (64 lowercase hex characters) reads as installed. Kino re-checks at install. |
| `recommended` | Kino honours it **only** from Kino Plugins, and it is what puts the entry in "From Kino"; from any other store it is ignored. |

An entry with no `address` and no `stremio`, no valid `id` or no `name` is dropped; long texts are cut; a non-`https` icon is
dropped. Past 5000 entries (counting only valid ones, repeats of an address skipped) the rest are dropped. Kino never trusts
a store's hints.

## Local and live { #modes }

| | **Local** store (default) | **Live** store (`"mode": "live"`) |
| --- | --- | --- |
| Exports | `storeSync` | `storeSync`, `storeList` and `storeSearch` (all three) |
| While the person browses | Never touches the network | Answers what its synced list lacks |
| What the person reads at install | One plain line: «Agrega plugins de sus servidores a tu tienda» ("Adds plugins from its servers to your store") | That one and, **in red**: «Lo que busques en la tienda llegará a sus servidores» ("What you search in the store will reach its servers") |

```js
// A live store: besides storeSync
export async function storeList({ category, sort, cursor }) { /* sort: "popular" | "recent" */ return { entries, next }; }
export async function storeSearch({ q, category, cursor }) { return { entries, next }; }
```

Each answers `{ entries, next? }`; `next` is the cursor of the following page. A call takes **at most 5 s** and a store gets
**20 calls a minute**: past either, that call adds nothing. Kino keeps a live page for about **30 minutes**, tagged as live
cache: going back to the same search or page shows it at once, and those rows never count as the store's synced list.

### How Kino mixes stores { #mixing }

1. **A store may be both.** A live store should also sync a base list (its featured or newest entries) so it shows up at once
   and offline; live calls only add what that base lacks.
2. **Stable order.** In «Todas las tiendas» local entries come first, in the chosen order; a live store's results are
   **appended at the end** as they arrive. Nothing already on screen moves and focus (on a TV) never jumps.
3. **No repeats.** A live entry whose address is already in the list is skipped; the same address from two stores shows once
   (Kino Plugins' copy first). **One repository per `id`, across all stores:** the one in Kino Plugins' list wins; if none is
   there, Kino keeps one deterministically. And no store may list the id `kino-plugins`. "Community" leaves out what "From
   Kino" shows, whichever store lists it, so a live store only answers there.
4. **One «Cargar más».** It pages through the local index first, then asks each live store for its next page.
5. **Search.** Local results update as the person types; live searches wait until typing stops (half a second) and a newer
   search cancels an older one.
6. **A live store picked in the filter** shows **only** its live answers, nothing local.

## What Kino does by itself { #kino-does }

- **The blocklist.** Kino applies its blocklist (`community-blocklist.json`, see [Claims and plugin takedowns](claims.md)) to
  **every entry of every store** before painting, and again at install. Stores neither receive nor apply it: because Kino
  paints, no store can show a blocked plugin. Kino refreshes that list with every store sync (and on reload), and Kino Plugins'
  daily index already leaves blocked repositories out.
- **The 18+ code.** While the person's 18+ code is locked, an entry whose categories include `adult`, or that Kino already
  knows as 18+, is hidden from "From Kino", "Community", search, the detail sheet and the counts, from every store; a store whose
  own plugin is 18+ is not offered in the filter. Unlocking shows them. Installing one goes through the usual 18+ gate.
- **Plugins that disappear.** A repository that is deleted or loses the topic leaves its store's next list; a plugin whose
  manifest answers 404 when viewed or installed is dropped at once. Leaving a store **never uninstalls** anything: an
  installed plugin keeps working and Instalados says «Ya no está en ninguna tienda».
- **Switching a store off.** A store is switched off from its tab in Ajustes (and uninstalled like any plugin, except Kino
  Plugins), where its interval is also set; its rows leave the index at once.
- **Reloading.** The store view has a reload icon that syncs every active store now. When it ends, a toast says
  "N plugins updated" (Spanish: «Se actualizaron N plugins») or, if nothing changed, "Your plugins are up to date" («Tus plugins están al día»).
- **Installing.** Always the installer: address preview, consent sheet («Plugin no verificado…» when it is not signed) and
  install. Nothing installs by itself.

## Limits { #limits }

| What | Limit |
| --- | --- |
| Entries per `storeSync` | 5000 (the rest are dropped) |
| Size of a `storeSync` answer | 4 MB of JSON |
| `state` | 16 KB of JSON |
| One `storeSync` run | 60 s, 40 `kino.fetch` requests and 8 MB downloaded (more than a scheduled job) |
| Live calls (`storeList`, `storeSearch`) | 5 s each, 20 a minute per store; a 30-minute cache |

The exact numbers are in `contract.json` (`kinoStore.limits`).

## Two example stores { #examples }

Two complete, copyable plugins, validated with the kit and with tests that run without a network:
[**Example stores**](store-examples.md): a **local** store whose list is a static JSON file and a **live** store with its own
API. And to start yours:

```
node sdk/init.mjs my-store --host plugins.ana.example --store local     # or --store live
```

## Kino Plugins: the store that ships in the app { #kino-plugins }

**Kino Plugins** (`kinotvapp`, signed with Kino's author key) is an ordinary **local** store, with a single capability,
`pluginStore`, and the hosts `api.github.com`, `raw.githubusercontent.com`, `cdn.jsdelivr.net` and `archive.org`. It
ships inside Kino and is signed with Kino's author key (version 1.0.1). What its `storeSync` answers:

1. **The first time**, with no network: the list the plugin itself carries (the plugins Kino Plugins lists by default and the
   community's), so the store is full from the first start. The ones from Kino's catalog carry `recommended`.
2. **Once a day**, `index.json` from `kinotvapp/kino-plugins`: a static file that **is built every day** by a GitHub Action
   that walks the repositories with the `kino-plugin` topic. Re-reading it brings the stars and drops repositories that lost
   the topic, were deleted or are on the owner's blocklist. It applies the one-repository-per-`id` rule.
3. **Between one index and the next**, a small change (`full: false`): a GitHub search for what changed since the last time,
   keeping its cursor in `state`.

It is the pattern for a big store: a full list now and then and small changes in between. To be in that list, see
[Get listed in Kino](listed.md).

## Testing with the kit { #kit }

```
node sdk/validate.mjs <folder>                                  # the consent lines and the functions
node sdk/run.mjs <folder> storeSync [--since <ms>] [--state '<json>']
node sdk/run.mjs <folder> storeList [popular|recent] [category]     # a live store
node sdk/run.mjs <folder> storeSearch "<q>" [category]              # a live store
```

The kit prints the answer as Kino's index would keep it and tells you on stderr what Kino would drop
(`[dropped by Kino] …`). The types are in `kino.d.ts` (`StoreEntry`, `StoreSyncArg`, `StoreSyncAnswer`, `StoreListArg`,
`StoreSearchArg`) and the contract in `contract.json` (`kinoStore`). More in [Test it locally](test-locally.md#api15).
