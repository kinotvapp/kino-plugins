# Rooms, the library and player control { #rooms }

!!! note "Available with Kino 0.9.74"
    Available with Kino 0.9.74 (the next version, not published yet). An older Kino refuses these plugins with
    «Este plugin necesita una versión más nueva de Kino»; to keep reaching people on an older version use
    `enhancements` (see [Screens without raising your apiVersion](enhancements.md)).

Three capabilities give your plugin a reach beyond its own source:

- **`library`**: read what the person watched and saved in Kino ([below](#library)).
- **`playerControl`**: pause, resume and move the video by itself, not only right after the person presses a button
  ([below](#player-control)).
- **`room`**: open a room that other people reach over the Internet through the person's device ([below](#room)).

All three are **declarative** (you export nothing new: you declare them in `capabilities`) and all three have a **red**
consent line the person approves. A screen ([`screen`](screens.md)) or a tab of the
[player panel](player-panel.md#contributed-tab) is what uses them.

The reference example is **Party Chat** (<https://github.com/kinotvapp/kino-plugin-watch-party>): a player-panel tab, on
any title of any plugin, that opens a room, shares it with a code and a QR, keeps everyone at the same point of the video
with `playerControl` and carries a chat. It shows everything on this page.

## Consent { #consent }

None of these capabilities is approved on its own. Kino asks the person **in its own words**, which you cannot change or
hide:

| Capability | What the person reads | Red, waits for approval | The person's switch (your tab in Ajustes) |
| --- | --- | --- | --- |
| `library` | «Podrá leer lo que has visto y guardado en Kino, y enviarlo a sus servicios» ("Can read what you have watched and saved in Kino, and send it to its services") | yes | «Dejar que lea lo que he visto y guardado» ("Let it read what I watched and saved") |
| `playerControl` | «Podrá pausar, reanudar y mover tu video por sí solo» ("Can pause, resume and move your video by itself") | yes | «Dejar que pause y mueva mi video» ("Let it pause and move my video") |
| `room` | «Podrá abrir una sala a la que se entra por internet a través de este aparato, y enviar los mensajes de la sala a quienes entren» ("Can open a room that people reach over the Internet through this device, and send the room's messages to whoever joins") | yes | «Dejar que abra salas por internet» ("Let it open rooms over the Internet") |

- A red line is asked at install and again on the update that adds it, and **Kino never approves it on its own**; the
  kit's import starts it unticked. Until the person approves it the API refuses (`permission_denied`), so always handle
  that refusal and work without it.
- Each switch is in your plugin's tab in Ajustes, covers the whole device and every profile, and syncs to the person's
  other devices. Off, the API refuses at once (a room closes).
- Kino lists your declared hosts beside the line: these lines are the safeguard, not a technical wall. A plugin that can
  `fetch` can send what it reads to its hosts.
- Be honest in your own UI too: say what you send and where.

The whole model, with the other capabilities that go with screens, is in [Screens](screens.md#consent).

## Reading what the person watched (`library`) { #library }

```json
"apiVersion": 14,
"capabilities": ["screen", "library"]
```

`library` may stand alone or beside `screen` (a plugin that declares only `library` is still valid, but can never read
it: see [when](#library-when)).

```js
const watched = await kino.library.watched({ limit: 20, kind: "movie", sinceMs: Date.now() - 30 * 86400000 });
const saved = await kino.library.saved({ limit: 50 });
```

`kino.library.watched({ limit?, kind?, sinceMs? })` and `kino.library.saved({ limit?, kind? })` answer what the **active
profile** watched and saved, newest first, one entry per title:

```ts
interface KinoLibraryEntry {
  title: string;                       // as Kino shows it (TMDB's when Kino identified it), at most 200 characters
  year?: number;                       // only when Kino knows it; usually absent on a watched one
  kind: "movie" | "series";
  ids: { tmdb?: number; imdb?: string }; // each only when Kino knows it; may be empty
  progress?: number;                   // watched only: 0..1 in steps of 0.01 (1 when finished)
  watchedAtMs?: number;                // watched only: rounded down to the day (UTC midnight)
  season?: number;                     // watched series only (apiVersion 15): the season of the latest chapter played
  episode?: number;                    // watched series only (apiVersion 15): the number of that chapter
}
```

- **`season` and `episode`** (arriving with Kino 0.9.77): on a **watched series**, the latest chapter played, only
  when its source numbered it. Never on a movie or on a series with no numbered chapter.

- `kind` is `movie` or `series` and works as a filter; music and podcasts are left out.
- `limit`: default 50, at most 100 (above 100 gives 100). `sinceMs` keeps titles played on that day (UTC) or later. A
  number that is not finite is `bad_request`.

### What never comes { #library-never }

- **Never**: a stream URL, a plugin ref, a Kino id, a position in seconds, a profile name, anything of another profile, or
  an 18+ title (always left out, even with the 18+ code unlocked; a title whose source this device cannot place is left
  out too: it fails closed).
- **Coarse on purpose**: `watchedAtMs` and `sinceMs` are rounded down to the day (UTC), `progress` to steps of 0.01, so
  nothing finer can be probed. Titles watched on the same day come in Kino's own order.

### When it can be read { #library-when }

- Only inside a call the person started: `screen`, `screenEvent` (timer ticks count while the screen is in front),
  `home`, `section`, `search`, and a [background job](jobs-and-shared.md#jobs) with this approval. Never in prewarm or
  sync calls. A plugin with only `library` can therefore never read it.
- At most **30 calls a minute** per plugin.
- Kino keeps nothing of an answer; a Home answer you build from it is cached like any Home answer.

### Errors and detection { #library-errors }

- `permission_denied` (not approved, or switched off), `rate_limited`, `bad_request`.
- Feature-detect with `typeof kino.library === "object"` and **still** catch `permission_denied`: a plugin whose `library`
  came through an [`enhancements`](enhancements.md) block on a Kino updated after the install is asked only with its next
  version.

```js
async function recentMovies() {
  if (typeof kino.library !== "object") return [];
  try {
    return await kino.library.watched({ limit: 20, kind: "movie" });
  } catch (e) {
    if (e && e.code === "permission_denied") return []; // not approved or switched off: work without it
    throw e;
  }
}
```

- Kit: `KINO_LIBRARY_FIXTURE=<json>` stands in for the person's data and `KINO_LIBRARY_REVOKED=1` plays the switch off.

## Moving the video (`playerControl`) { #player-control }

A declarative capability (no export) that **never stands alone**: only beside a panel, your own (`panel`) or a tab you
contribute to other plugins (`"panel": { "contributes": true }` with `playerPanelTab`, see
[the player panel](player-panel.md#contributed-tab)). Without a panel the manifest is refused with
"The \"playerControl\" capability needs a \"panel\" ...".

```json
"apiVersion": 14,
"capabilities": ["screen", "playerPanelTab", "playerControl", "room"],
"panel": { "contributes": true, "label": "Party Chat" }
```

With `playerControl` a `player` action may also carry `pause`: `true` pauses, `false` resumes (any other value is
dropped). It is a one-shot command: never stored.

### Without the capability and with it { #player-control-origins }

Every `player` action has an **origin**: `press`, `change` or `submit` (what the person does in the panel), `refresh` (a
panel result's own `player`: on open, on a tab, on a `refreshMs` tick, or a `playerEvent` answer's new panel) and `event`
(a `playerEvent` answer).

| Who | Without `playerControl` | With `playerControl` |
| --- | --- | --- |
| The plugin whose title plays | The apiVersion 9 rules: every `player` field after the person's `press`, `change` or `submit` and in a `playerEvent` answer; `pause` only after a `press`; a panel result's own `player` never counts. | Every origin counts: `press`, `change`, `submit`, `refresh` and `event`. |
| A tab contributed to another plugin | Only `seekToMs`, only after a `press` in your tab. | `seekToMs`, `pause` and `speed`, from any origin. |

So a `refreshMs` tick can keep the video in step with the room without anybody touching anything.

### What Kino still enforces { #player-control-limits }

The same for every plugin (contract.json `kinoPlayerControl`):

- **One seek or pause a second per plugin**, always (the panel and its `playerEvent` calls together).
- An action kept only thanks to the capability is dropped while Kino is not in front (the player covered or in the
  background), while one of Kino's dialogs is up, or while the person is seeking.
- On a live stream, only `pause`.
- At most **30 a minute**.
- A pause is dropped while the phone's player is held for a cast (Chromecast or DLNA), and when it asks for the state the
  video is already in (no notice, no budget).
- A panel nested in an answer carries no `player` of its own.
- When the action does not come from the person's press (`refresh` or `event`), Kino shows a short notice naming your
  plugin, which you cannot word or suppress: «Party Chat: pausado», «Party Chat: reanudado, movido a 1:02:03» (in English
  "Party Chat: paused", "resumed", "moved to {time}", "speed {speed}"). A name that reads like "Kino" is shown qualified.
- A contributed tab's speed is never stored: it ends with the title, and the person's own speed wins.

The `player` properties (`seekToMs`, `speed`, `resize`…) and who wins against the person are in
[Driving the player](player-panel.md#player).

- Kit: `KINO_PLAYER_CONTROL_REVOKED=1` plays the switch off.

## Rooms over the Internet (`room`) { #room }

A declarative capability that **never stands alone**: a screen or a player-panel tab drives it. `kino.room` is a
short-lived mailbox **hosted on the person's own device** and reached from the Internet through the same Cloudflare quick
tunnel Kino opens for «Recibir configuración»: no server of yours or Kino's, and your code never sees an address.

```js
const { code, words, expiresAtMs } = await kino.room.open({ ttlMin: 120, max: 6, name: "Ana" }); // the host, from a press
const { handle, memberId } = await kino.room.join({ words, code, name: "Beto" });                // a guest, from a press
await kino.room.send({ t: "chat", text: "hola" });                                               // a JSON object
const { events, last, more, reachable } = await kino.room.inbox({ since: state.last });          // poll it from a timer
```

Feature-detect it with `typeof kino.room === "object"`.

### The functions { #room-api }

| Function | What it does |
| --- | --- |
| `open({ ttlMin?, max?, name?, codeDigits?, code? })` | Opens the tunnel and the mailbox. `ttlMin` 10 to 240 (default 120); `max` members counting you, 2 to 8 (default 6); `name`, your name as the guests see it, up to 40 characters. Answers `{ code, words, expiresAtMs }`. |
| `join({ words, code, name? })` | Joins a room with the words and code the host shared; `name` up to 24 characters. Answers `{ handle, memberId, host: { name }, expiresAtMs }`. Keep `handle`: it names this session in the other calls. |
| `send(payload, { to?, session? })` | Sends a JSON object of at most 8192 bytes and 4 levels. The host writes to one `memberId` or everyone (`to` absent or `"all"`); a guest to the host (`to` absent or `"host"`) or to `"all"` through the host, never to another member directly. |
| `inbox({ since?, limit?, session? })` | Answers `{ events, last, more, reachable }`: the events after `since` (pass the answer's `last` next time), at most `limit` (1 to 50, default 50). |
| `members({ session? })` | `[{ memberId, name, host }]`: never an address. |
| `close({ session? })` | Closes the session (or the room, if you are the host). |
| `state()` | `{ role: "host" \| "guest" \| "none", joined: [...], hosted: { code, words, expiresAtMs, members } \| null }`: your plugin's sessions on this device. |

- `words` are **public** (`brave-river-cat-moon`): anyone may see them. The `code` is the room's **only secret**: 12
  digits, or the ones you ask for with `codeDigits` (4 to 12). Show it grouped, «1234 5678 9012», and as a QR; spaces and
  hyphens are ignored on `join`. `join` needs both.
- An event is `{ seq, from, kind, payload?, name? }`: `kind` is `msg`, `join`, `leave` or `closed`; `from` is a
  `memberId` or `"host"`; `payload` (`msg` only) is the object the sender passed, re-serialised by Kino; `name` (`join`
  only) is the member's name. `seq` only grows.
- `reachable: false` means a guest's last poll of its host got no answer: your failover cue. A guest asks its host at most
  once a second.
- `session` is `"hosted"` (the room this device hosts) or a `handle` from `join`. Absent: the first joined session, else
  the hosted one.
- A member the host has not heard from for 2 minutes is dropped (`leave`).

### A short code { #room-short-code }

`open({ codeDigits: 4 })` makes a code friends can type. It keeps strangers out **only because the words cannot be
guessed** and the room closes itself after 30 wrong codes (Kino tells the person; your next calls get `room_closed`).
Whoever captures the traffic and knows the words, the tunnel provider among them, recovers a 4-digit code offline in
milliseconds: such a room is not private from the provider. The default 12 digits makes that expensive, not impossible.
Keep a room's messages low-sensitivity either way.

### When it can be called { #room-when }

- `open` and `join` **only from the person's own press** (`screenEvent`, `panelAction`; never a tick or a refresh), so a
  plugin can never move a person into a room, or open one, behind their back.
- `send`, `inbox` and `members` from your screen's or panel's calls (`screen`, `screenEvent`, `panel`, `panelAction`,
  `playerEvent`), ticks included, only while Kino is in front.
- `close` and `state` from any live call.
- **Never from a [background job](jobs-and-shared.md#jobs)** (there `kino.room` answers `not_allowed`).

### Limits { #room-limits }

| What | Limit |
| --- | --- |
| A message | at most 8192 bytes (UTF-8, as your plugin's JSON text) and 4 levels (the object itself is 1) |
| Rate per member | 5 messages a second; 100 messages and 256 KB a minute (checked by the sender's Kino and again by the host) |
| Members | 2 to 8 (default 6) |
| Lifetime | 10 to 240 minutes (default 120) |
| Mailbox | 200 events or 15 minutes per member |
| Sessions per device | 2 joined and 1 hosted; at most 2 of them for one plugin (`room_busy`) |
| Wrong codes | 5 lock joins for 60 s, doubling up to 30 minutes (`rate_limited`); 30 in all close the room |

A room closes at its lifetime, with `close()`, when the plugin is removed, disabled or the person switches it off, when
plugin screens are switched off in Kino, and after **30 minutes** of Kino in the background. While the device hosts a room,
Android shows Kino's own notification «Sala abierta · N personas» with «Cerrar sala» and keeps the room alive, so the host
can step out to paste the invitation; the person swiping Kino away closes it.

While the device hosts a room, your tab in Ajustes shows it with a button to close it.

### Errors { #room-errors }

`room_denied`, `room_closed`, `room_full`, `room_unreachable`, `room_busy`, `rate_limited`, `permission_denied`,
`bad_request`. `room_unreachable` (no internet, a network that blocks it, Cloudflare's rate limit) and the room refusals
carry Kino's own `userMessage`.

### Security, said plainly { #room-security }

- Every request is sealed (scrypt N=8192 r=8 of the code salted with the words, AES-256-GCM plus HMAC-SHA256, per-member
  keys) and messages are never stored, logged or executed by Kino.
- **The code protects against casual access, not against the tunnel provider.** A stranger can only guess online (and
  gets locked out), but the TLS-terminating provider, targeting a room, could crack a captured join offline (about 400
  GPU-days on average on one high-end GPU) and then read it; there is no forward secrecy. **Keep a room's messages
  low-sensitivity** (a chat, a position). A password-authenticated exchange (CPace or SPAKE2) is recorded as future
  hardening.
- **Payloads are untrusted**: check every message's kind, exact fields, sizes and types; scrub names; cap texts; never
  execute or render one as markup. Never put the code in a message or a log.

### What is yours { #room-yours }

Who leads, what a message means, history and failover are yours. With `open({ code })` a member opens a second door to
the same room with its own words (refused with `permission_denied` unless your plugin is in that room now or opened it;
its expiry is capped at the room's); publish its words a few seconds later (a fresh name takes a moment to resolve). Send
a goodbye before `close()`. Party Chat shows all of it.

- Kit: an in-memory room with two simulated members (`createKitRoom()` in tests: `say`, `leave`) and `KINO_ROOM_REVOKED=1`
  for the switch off.

## Trying it with the kit { #kit }

```
node sdk/validate.mjs <folder>                                    # the manifest, the exports, every consent line
node sdk/run.mjs --foreign latino:Latino <folder> panel <ref>     # a tab you contribute to another plugin's title
node sdk/run.mjs --state '{}' --screen <folder> panelAction <ref> <name> press
```

| Variable | What it plays |
| --- | --- |
| `KINO_LIBRARY_FIXTURE=<json>` | the person's data for `kino.library` |
| `KINO_LIBRARY_REVOKED=1` | `library` switched off |
| `KINO_PLAYER_CONTROL_REVOKED=1` | `playerControl` switched off |
| `KINO_ROOM_REVOKED=1` | `room` switched off |

In `node --test` files, import the kit's helpers (`createKino`, `createKitRoom`…) as Party Chat's tests do. More in
[Testing screens with the kit](screens.md#testing).

## Limits in one place { #limits }

| What | Limit |
| --- | --- |
| `kino.library` | `limit` default 50, at most 100; at most 30 calls a minute per plugin; times rounded to the day, `progress` to 0.01 |
| `playerControl` | one seek or pause a second per plugin; at most 30 actions a minute |
| `kino.room` | a message at most 8192 bytes and 4 levels; 5 messages a second, 100 and 256 KB a minute per member; 2 to 8 members; 10 to 240 minutes (default 120); mailbox 200 events or 15 minutes; 2 joined and 1 hosted per device, 2 per plugin; 5 wrong codes lock joins for 60 s, doubling up to 30 minutes; closed after 30 minutes in the background (a hosted room shows Kino's notification meanwhile) |
