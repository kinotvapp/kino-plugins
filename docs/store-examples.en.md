# Example stores { #store-examples }

!!! note "Available with Kino 0.9.77"
    Plugin stores are `apiVersion` 15 and arrive with Kino 0.9.77. Read
    [Plugin stores](plugin-stores.md) first.

Two complete plugins you can copy and change. Both pass `node sdk/validate.mjs .`, ship tests that run without a network
with the kit, and use example hosts (`raw.githubusercontent.com/your-user/…`, `plugins.example.org`): change `hosts`, the
address of your list and your details. The publisher of a store answers for what it lists; Kino only shows it, with its
blocklist and the 18+ code.

To start from scratch: `node sdk/init.mjs my-store --host my-site.example --store local` (or `--store live`).

## Local store: a static JSON file { #local }

The whole list is one file (`plugins.json`) that you publish anywhere over https; the plugin downloads it in `storeSync` and
hands Kino the whole list (`full: true`), or an empty change when the file did not change. Kino never asks it anything while
the person browses. It only skips the work when it holds a `state` from before: if Kino lost the store's rows it asks again
with no `since` and no `state`, and the plugin answers the whole list.

Downloads: [`kino-plugin.json`](store-examples/store-local/kino-plugin.json) ·
[`plugin.js`](store-examples/store-local/plugin.js) · [`plugins.json`](store-examples/store-local/plugins.json) ·
[`test/store.test.mjs`](store-examples/store-local/test/store.test.mjs)

**`kino-plugin.json`**

```json
--8<-- "store-examples/store-local/kino-plugin.json"
```

**`plugin.js`**

```js
--8<-- "store-examples/store-local/plugin.js"
```

**`plugins.json`** (the file you publish)

```json
--8<-- "store-examples/store-local/plugins.json"
```

## Live store: its own API { #live }

Besides `storeSync` (a base list: its featured plugins) it answers while the person browses: `storeList` (a page of a
category, popular or recent) and `storeSearch`. A live store **must export all three functions**. The person reads, in red,
that what they search in the store will reach its servers. How Kino mixes it with the other stores:
[Plugin stores](plugin-stores.md#mixing).

Downloads: [`kino-plugin.json`](store-examples/store-live/kino-plugin.json) ·
[`plugin.js`](store-examples/store-live/plugin.js) · [`sample-api.json`](store-examples/store-live/sample-api.json) ·
[`test/store.test.mjs`](store-examples/store-live/test/store.test.mjs)

**`kino-plugin.json`**

```json
--8<-- "store-examples/store-live/kino-plugin.json"
```

**`plugin.js`**

```js
--8<-- "store-examples/store-live/plugin.js"
```

**`sample-api.json`** (what the test's made-up API answers)

```json
--8<-- "store-examples/store-live/sample-api.json"
```

## Trying them { #try }

Copy an example's folder, put the [kit's](https://github.com/kinotvapp/kino-plugin-sdk) `sdk/` and `contract.json` inside it
and run:

```
node sdk/validate.mjs .
node --test test/store.test.mjs                  # offline: the list comes from a sample file
node sdk/run.mjs . storeSync                     # online: downloads the real list
node sdk/run.mjs . storeList popular series      # live store
node sdk/run.mjs . storeSearch "anime"           # live store
```

## Other examples { #others }

- **Kino Plugins**, the store that ships in the app, is a real **local** store that combines a list it carries, a daily
  index and small changes: [Plugin stores](plugin-stores.md#kino-plugins).
- **Kino Social**, a Kino screen plugin, is the worked example of [`identity`](identity.md#example) and
  [`notifications`](notifications.md#example).
