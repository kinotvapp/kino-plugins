# Notices in the bell { #notifications }

!!! note "Available with Kino 0.9.77"
    `notifications` is `apiVersion` 15 and arrives with Kino 0.9.77. An older version refuses
    these plugins with «Este plugin necesita una versión más nueva de Kino».

`notifications` lets your plugin leave **short notices in the Home bell**: «Beto y 2 más comentaron tu publicación». It is a
**declarative** capability (you export nothing new), cannot stand alone (a [screen](screens.md) or a
[background job](jobs-and-shared.md#jobs) uses it) and is not offered through [`enhancements`](enhancements.md).

```json
"capabilities": ["screen", "schedule", "notifications"]
```

## Posting and clearing { #api }

```js
await kino.notifications.post({
  id: "c123",                                            // 1 to 64 of A-Z a-z 0-9 . _ -
  title: "Beto y 2 más comentaron tu publicación",       // 1 to 80 characters
  titleEn: "Beto and 2 more commented on your post",
  text: "«Qué buena recomendación»",                     // optional, up to 160
  textEn: "“What a great pick”",
  go: { screen: { route: "post", args: { id: "123" } } }, // optional: where a tap goes
});

await kino.notifications.clear("c123"); // removes that notice
await kino.notifications.clear();       // removes all of yours
```

- **`id`** replaces an earlier notice with the same `id`, unread again: **group** your news under one `id` instead of posting
  one per event.
- **`title`** (1 to 80 characters) and **`text`** (up to 160) are plain, one line: Kino removes control and direction
  characters. `titleEn` and `textEn` are what shows in English.
- **`go`** is only `{ screen: { route?, args? } }` (a screen of **yours**, read like a screen's `go.screen`),
  `{ title: {…} }` or `{ titleByIds: {…} }` (with the screens' rules). Anything else drops the `go` (never the notice; it is
  logged) and a tap opens your screen's root. Today a title `go` also opens the root.
- Both functions resolve `undefined` or reject with an error carrying a `code`: `permission_denied`, `rate_limited` or
  `bad_request`.

## When you can call it { #when }

From your `screen`, a `screenEvent` or your **scheduled job** (`job`): typically the job asks your server what is new and
posts it. It is one of the few things a job may do besides `kino.fetch`, `kino.storage` and `kino.log`, and it counts against
no other quota.

## Limits { #limits }

Per plugin:

| What | Limit |
| --- | --- |
| Posts | 20 an hour (after that, `rate_limited`) |
| Notices kept | 30 (the oldest are dropped) |
| Life of a notice | 30 days |
| `title` / `text` | 80 / 160 characters |
| Request size | 8192 characters |

The exact numbers are in `contract.json` (`kinoNotifications.limits`).

## What people see { #what-people-see }

- The Home bell shows a badge with the **unread** notices plus the plugin updates waiting for approval.
- The list shows notices newest first, each with your plugin's icon and name, the title, the text and how long ago. A tap
  follows its `go` and marks it read; opening the list marks them all read.
- An 18+ plugin's notices show only while the 18+ code is unlocked.
- **Notices are not synced**: each device keeps its own (each device's job asks for its own), so let your server remember
  what was read.

## Consent { #consent }

The person reads, as a plain line (not red), on the install sheet and on the update that adds it:

- «Podrá mostrarte avisos en la campanita» ("Can show you notices in the bell").

And in your plugin's tab in Ajustes they can switch it off, for the whole device and their synced devices: «Mostrar sus avisos
en la campanita» ("Show its notices in the bell"). Switched off, its notices leave the bell and every call rejects with
`permission_denied`.

## Testing with the kit { #kit }

The kit keeps what you post in `<folder>/.kino-notices.json` and prints it:

```
node sdk/run.mjs --device phone . job notices      # runs the job and posts
node sdk/run.mjs . notifications                    # what has been posted so far
```

`KINO_NOTIFICATIONS_REVOKED=1` simulates the person switching it off. Add `.kino-notices.json` to your `.gitignore`, like
the kit's other local files. The contract is in `contract.json` (`kinoNotifications`) and the types in `kino.d.ts`.

## Worked example: Kino Social { #example }

**Kino Social** turns comments, likes and new followers into bell notices with a job that runs every 15 minutes or more (the
`notices` job in its manifest, which the person turns on and tunes). Each run asks its server for what is new, posts it oldest
first (so the newest ends on top) and moves its cursor only as far as the bell took, so one refused by the hourly cap comes
back on the next run:

```js
export async function postNotices() {
  if (typeof kino.notifications !== "object") return 0;        // a Kino without the capability
  const body = await call("/notifications?since=" + since);    // what is new, from its server
  const fresh = body.items.filter((n) => !n.read).sort((a, b) => a.createdAt - b.createdAt);
  for (const n of fresh) {
    try {
      await kino.notifications.post({
        id: "c" + n.id, title: titleEs, titleEn, text: excerpt,
        go: { screen: { route: "post", args: { id: String(n.postId) } } }, // a tap opens that post
      });
    } catch (_) { break; }                                     // the hourly cap: carry on next run
    since = Math.max(since, n.createdAt);
  }
}
```
