# Background jobs, shared results and AI { #jobs-and-shared }

!!! note "Available with Kino 0.9.74"
    Available with Kino 0.9.74 (the next version, not published yet). An older Kino refuses these plugins with
    «Este plugin necesita una versión más nueva de Kino»; to keep reaching people on an older version use
    `enhancements` (see [Screens without raising your apiVersion](enhancements.md)).

Three capabilities help your [screen](screens.md) open with fresh data without making anybody wait:

- **`schedule`** (with the manifest's `jobs` field and the `job` export): Kino runs your code in the background every so
  often ([below](#jobs)).
- **`shared`**: a few small results that sync between the person's linked devices, so the phone does the work and the TV
  reads it ([below](#shared)).
- **`ai`**: one short ask to Kino's text AI, to summarise or classify ([below](#ai)).

None stands alone: a job feeds what your screen or catalog shows.

The reference example is **Solo noticias** (<https://github.com/kinotvapp/kino-plugin-news>): a news screen and a job that,
from the phone, fetches the headlines, sorts them with the AI and leaves the result in `kino.shared` so the TV's screen
reads it when it opens.

## Consent { #consent }

| Capability | What the person reads | Red, waits for approval | The person's switch (your tab in Ajustes) |
| --- | --- | --- | --- |
| `schedule` | «Podrá ejecutarse en segundo plano cada cierto tiempo para actualizar sus datos, usando internet y batería» ("Can run in the background every so often to refresh its data, using your internet and battery") | yes | «Dejar que trabaje en segundo plano» ("Let it work in the background") |
| `ai` | «Podrá enviar texto a un servicio de IA de terceros (Kilo) para que lo resuma o clasifique; lo que envíe sale de tu aparato» ("Can send text to a third-party AI service (Kilo) to have it summarized or classified; what it sends leaves your device") | yes | «Dejar que use la IA de texto» ("Let it use the text AI") |
| `shared` | «Guarda unos pocos resultados que se sincronizan entre tus aparatos vinculados» ("Keeps a few small results that sync between your linked devices") | no | none |

- A red line is asked at install and again on the update that adds it, and **Kino never approves it on its own**; the
  kit's import starts it unticked. Until the person approves it the API refuses, so always handle the refusal and work
  without it.
- Each switch is in your plugin's tab in Ajustes, covers the whole device and every profile, and syncs to the person's
  other devices. Off, the API refuses at once (a job's work is cancelled).
- `shared` is a plain line: marked new on the update that adds it and never waiting for approval (it is the person's own
  data on the person's own devices). An update that adds only `shared` applies without a sheet.
- Be honest in your own UI: say what you send and where (Solo noticias' settings say «Los titulares se envían al servicio
  de IA de terceros de Kino»).

The whole model is in [Screens](screens.md#consent).

## Background jobs (`schedule`, `jobs`, `job(ctx)`) { #jobs }

The capability `schedule`, the manifest's `jobs` field and the export `job` need each other; a job never stands alone (it
feeds what your screen or catalog shows):

```json
"capabilities": ["screen", "schedule", "shared"],
"jobs": [{ "id": "refresh", "label": { "es": "Actualizar", "en": "Refresh" }, "everyMin": 60,
           "everyOptions": [15, 60, 180, 1440], "runOn": "preferPhone" }]
```

```js
export async function job({ id, reason, lastRunMs, attempt }) {
  const data = await refreshSomething(); // a few requests, one at a time
  kino.storage.set("feed", JSON.stringify(data)); // or kino.shared, for "preferPhone"
}
```

### The manifest's `jobs` field { #jobs-manifest }

Required with the `schedule` capability and refused without it: 1 to 3 jobs, each like this:

```json
{ "id": "refresh", "label": { "es": "Actualizar noticias", "en": "Refresh news" }, "everyMin": 60,
  "everyOptions": [15, 30, 60, 180, 720, 1440] }
```

| Field | What it is |
| --- | --- |
| `id` | 1 to 24 characters (`a-z`, `0-9`, `-`), unique. |
| `label` | `{ es, en? }`: `es` 1 to 40 characters, `en` optional with the same limit (control and bidirectional characters are dropped). |
| `everyOptions` | 1 to 6 different whole minutes, from 15 (Android's floor for periodic work) to 1440. |
| `everyMin` | The default: one of `everyOptions`. |
| `runOn` | Optional: `"any"` (the default) or `"preferPhone"`; see [below](#prefer-phone). |
| `enabledBy` | Optional: the key of one of your `toggle` settings; see [below](#enabled-by). |

Any other key of a job is ignored. The texts a manifest is refused with:

| Problem | Text |
| --- | --- |
| `jobs` without `schedule` | `The "jobs" field needs the "schedule" capability` |
| `schedule` without `jobs` | `The "schedule" capability needs a "jobs" list with 1 to 3 jobs` |
| `jobs` is not a valid list | `The "jobs" field must be a list of 1 to 3 jobs` |
| `id` | `Each job needs an "id" of 1 to 24 characters: a-z, 0-9 and -` / `Two jobs have the same "id"` |
| `label` | `Each job needs a "label" object whose "es" is 1 to 40 characters ("en" optional, the same limit)` |
| `everyOptions` | `Each job's "everyOptions" must list 1 to 6 different whole numbers of minutes from 15 to 1440` |
| `everyMin` | `Each job's "everyMin" must be one of its "everyOptions"` |
| `runOn` | `Each job's "runOn" must be "any" or "preferPhone"` |
| `enabledBy` | `Each job's "enabledBy" must name one of the plugin's toggle settings` |

### How it runs { #jobs-run }

- Kino runs `job(ctx)` headless, through Android's WorkManager, every `everyMin` minutes while the person has that job
  switched on: **each job starts off** (the person switches it on), and off again after any gap in its approval
  (uninstalled, an update without it, a reinstall).
- `ctx` is `{ id, reason, lastRunMs, attempt }`: `id` is the manifest's; `reason` is `scheduled` or `manual` («Ejecutar
  ahora»); `lastRunMs` is when it last ran on this device (`null` before the first run); `attempt` is 1 plus its failures
  in a row.
- **Its answer is never read and nothing of a job is shown**: write to `kino.storage` (or [`kino.shared`](#shared)) and
  let your screen read it when it opens (stale-while-revalidate).
- It never starts while your screen, panel or catalog call runs (it waits up to 30 s, then gives way).
- It needs a network and the battery not low; «Solo con Wi-Fi» is on by default (per plugin).
- It stops when the plugin is disabled, removed or updated (it then runs as a new work), when the job is switched off or
  paused, or when Kino switches plugin screens off.

### Caps per run { #jobs-caps }

| What | Cap |
| --- | --- |
| Time | 20 s |
| Requests | 10, made one at a time (the next answers `rate_limited`) |
| Answer bodies | 2 MB in all (an answer that would cross it is refused with `too_large`, never handed over) |
| Written to `kino.storage` | 256 KB (UTF-8 bytes of keys and values; the next `set` throws `too_large`) |
| Runs | 96 a day per plugin (UTC), all its jobs together |

A cap crossed cuts the run and counts as a failure. A failure waits 15 minutes, doubling up to 6 h; **3 in a row pause the
job** until the person switches it off and on, or a manual run succeeds. Kino words the failure itself (`timeout`,
`cap_fetches`, `cap_bytes`, `cap_storage`, `network` only when `kino.fetch` itself failed to reach a site, `plugin_error`).

### A job's APIs { #jobs-apis }

An allow-list:

- `kino.fetch` (your declared hosts and every usual rule and quota), `kino.storage`, `kino.log`, `kino.config` (read),
  `kino.cookies`, `kino.crypto`, `kino.sleep`, `kino.html`, `kino.secret`, `kino.error`, `kino.rank`.
- [`kino.library`](rooms.md#library), with its own approval (the same 18+ rule, rounding and rate).
- [`kino.ai`](#ai), with its own approval; each ask is one of the run's 10 requests.
- [`kino.shared`](#shared).
- [`kino.seed`](kino-api.md#seed), under exactly its usual rules: the same telemetry consent, filter and caps. So a
  contribution may move from after Home into a job (with [`enabledBy`](#enabled-by) on your contribution setting, it runs
  exactly while the person leaves that setting on).
- The plain values: `kino.apiVersion`, `kino.appVersion`, `kino.lang`, `kino.device`, `kino.fetchAnyHost`, `kino.screen`.

Everything else (`kino.room`, `kino.qr`, `kino.browser`, `kino.ws`, `kino.meta`, `kino.tmdb`, `kino.nuvio`,
`kino.catalog`, `kino.sync`, `kino.cloudstream` and any later API) answers `not_allowed` (logged). No UI, `go`, toast,
player action or room can come out of a job. Once a run is over (it answered or was cut), every API refuses whatever its
evaluation still tries.

### Kino's rows in Ajustes { #jobs-rows }

In your plugin's tab in Ajustes Kino draws, for each job (you draw nothing): its switch, its frequency (only your
`everyOptions`), «Solo con Wi-Fi», the last run and «Ejecutar ahora» (`reason: "manual"`, the same caps; with the
permission off not even a manual run goes). The person's choices (on, frequency, Wi-Fi only) sync between their devices.

An update never makes a job that is on run more often than before: the person's choice stays while it is still an option,
else the nearest option at least as slow as both the new `everyMin` and the period it ran at; when no option is that slow,
the job is switched off and its row asks the person to choose again.

### `runOn: "preferPhone"` { #prefer-phone }

`runOn: "any"` (the default): every device that has the plugin runs its own job, for its own `kino.storage`.

`runOn: "preferPhone"`: **ONE** of the person's linked devices runs it, a linked phone first:

- A TV never runs it while a phone that ran it **successfully** within two of its periods can. With no phone, or no
  successful run on the phone for two periods (its job paused or switched off there, no Wi-Fi with «Solo con Wi-Fi», the
  app force-stopped), the device that has the plugin (the TV) runs it itself.
- Each device decides by itself from a synced record (no voting); on a device whose turn it is not, the firing skips at
  once (no network, never a failure). A rare overlap runs it twice, harmless with last-writer-wins results.
- Write the result with [`kino.shared`](#shared) so the TV's screen reads it, and read `kino.device` in the job to do a
  lighter batch when the TV does run it (Kino enforces nothing extra; the job's caps apply).
- Kino's row adds «Hacer el trabajo en» ("Do the work on") with two choices, «Este aparato» ("This device") and «El
  celular si está vinculado» ("The phone, if linked", the default), and «Última ejecución en: {device}» ("Last run on:
  {device}"). «Ejecutar ahora» runs on the device where it is pressed.

### A setting that switches it on (`enabledBy`) { #enabled-by }

A job may name one of your own `toggle` settings, `"enabledBy": "contribute"`: that setting is then the person's on/off for
the job instead of the job's own switch (no second switch to find).

- The job is on while the setting is on (its `default` counts) and the job's row in Ajustes holds no OFF of the person's:
  the row still switches it off, and that OFF wins until the person switches the row on again. With the setting off the
  job never runs.
- Kino's row says which setting drives it: «Lo enciende y lo apaga el ajuste «{label}» del plugin; aquí también puedes
  apagarlo.» ("The plugin's “{label}” setting turns it on and off; you can also switch it off here.")
- Anything but the key of one of your `toggle` settings refuses the manifest (`Each job's "enabledBy" must name one of the
  plugin's toggle settings`); in an `enhancements` block, the block is dropped.
- The consent line, the permission switch, the frequency, «Solo con Wi-Fi» and every cap stay as above.

### Trying it with the kit { #jobs-kit }

```
node sdk/run.mjs <folder> job [jobId] [scheduled|manual]        # one job run, with Kino's caps
node sdk/run.mjs --device phone <folder> job refresh manual      # the job, as the phone
node sdk/run.mjs --device tv <folder> screen                     # ...then read what the job shared, as the TV
```

## Results shared between devices (`shared`) { #shared }

A declarative capability (no export) that never stands alone, with a **plain** consent line (not red, never waiting: the
person's own data on the person's own devices; an update that adds only `shared` applies without a sheet).

```js
kino.shared.set("digest", { at: Date.now(), items: top });  // true when stored, false when it was already that value
const digest = kino.shared.get("digest");                   // the value or null; never throws for a stored value
kino.shared.set("digest", null);                            // removes it
```

- `kino.shared.get(key)` answers the value or `null` (it never throws for a stored value: one this engine cannot read
  answers `null`). `kino.shared.set(key, value)` answers `true` when stored and `false` when it was already that value
  (nothing written or sent); `set(key, null)` removes it.
- Synchronous, like `kino.storage`, from screens, panels, settings and jobs (in a job it does not count against its
  `kino.storage` cap, but against these limits).
- Feature-detect it with `typeof kino.shared === "object"`.

### Limits { #shared-limits }

| What | Limit |
| --- | --- |
| Keys | up to 4 per plugin, `^[A-Za-z0-9_.-]{1,40}$` |
| A value | strict JSON of at most 64 KB (UTF-8) and 16 levels |
| The whole plugin | 128 KB of values |
| Writes | 30 a minute per plugin (`rate_limited`) |
| Travel | a key's new value travels at most once a minute, and at most 4 of your keys a minute |

- Values sync between the person's linked devices, both ways, **per profile** (a TV that carries several people's
  profiles never hands one person's values to another's phone); last writer wins by a clock Kino assigns. A scheduled job
  (device-wide) writes to the profile in use. Reads on this device see the new value at once.
- A device not linked to any other keeps them as an ordinary local store.
- They go (on every linked device) when the plugin is removed. Each plugin reaches only its own keys.
- Errors (thrown as Kino errors): `not_allowed` (no capability, the plugin off, a sealed value), `bad_request` (a bad key,
  a value that is not JSON, a secret-like key), `too_large`, `rate_limited`.

!!! warning "Never a secret in `shared`"
    Never put a token, a password, a cookie or a session there: it is copied to every linked device. A key with a word
    like one (`token`, `secret`, `password`, `cookie`, `session`, `auth`, `apiKey`, plurals too; `author` is fine) is
    refused, and so is a value holding a sealed secret. Those belong in `kino.storage` or your settings.

!!! warning "What `get` answers is untrusted"
    Another device wrote it, maybe with another version of your plugin. Validate its shape, sizes and every field before
    you use it.

### Trying it with the kit { #shared-kit }

`--device phone` and `--device tv` are two simulated devices sharing `.kino-shared.json`:

```
node sdk/run.mjs --device phone <folder> job
node sdk/run.mjs --device tv <folder> screen
node sdk/run.mjs <folder> shared                                 # what the simulated phone and TV hold
```

## Kino's text AI (`ai`) { #ai }

`kino.ai.ask({ prompt, system?, json?, maxChars? })` sends one short text to Kino's text AI (Kilo's free models, the same
fixed destination as Kino's own assistant; no key and no server of yours) and answers `{ ok: true, text, model }` or
`{ ok: false, error, message }`. **It never throws.**

```js
const answer = await kino.ai.ask({
  system: "Classify each headline as sports, politics or other.",
  prompt: headlines.map((h, i) => `${i}. ${h.title}`).join("\n"),
  json: true,
  maxChars: 1000,
});
if (!answer.ok) return fallback(); // unavailable, rate_limited, too_large, timeout or refused
```

- One-shot: no memory between asks, no streaming, no tools, no images or files; Kino adds no persona and keeps nothing (its
  logs carry sizes and codes only).
- `model` is only the name of the model that answered: never an address, a key or a header. `message` is Kino's English
  detail for you, never for the person.
- `json: true` only **ASKS** for JSON (Kino adds an instruction to the system text); the text comes back as the model
  wrote it, parseable or not.
- Feature-detect it with `typeof kino.ai === "object"`.

### Limits { #ai-limits }

| What | Limit |
| --- | --- |
| `prompt` | non-empty, at most 8192 UTF-8 bytes |
| `system` | at most 2048 UTF-8 bytes |
| `maxChars` | 1 to 4096 (default 2048): the reply is cut there |
| Per plugin | 10 asks in any minute, 100 a day (UTC), one at a time (the next is `rate_limited`, never queued), 20 s each |
| The whole device | 300 a day and 2 at once for every plugin together, so plugins never starve Kino's own assistant (which shares Kilo's anonymous quota) |

The errors: `unavailable` (no model could answer: no internet, every free model busy), `rate_limited`, `too_large`,
`timeout`, `refused` (anything else: not approved, switched off, the plugin disabled, the wrong origin, a malformed
request).

### When it can ask { #ai-when }

- **Only after the person's own press**: a settings `action`, a `panelAction`, a `screenEvent` that follows a tap or a
  submit. Never from a screen's `open`, a tick, a load-more, a change, a `playerEvent`, Home, search or play.
- **Or from your [job](#jobs)**: each ask is one of the run's 10 requests, and is refused once the run is over.
- A screen event is still bounded by its session's own 60 s: ask once per event and batch items into one prompt.

!!! warning "The reply is untrusted data"
    The model read whatever you sent, and text you took from the web or from the person can steer it (prompt
    injection). Validate every field against what you sent (drop ids and categories you did not ask for), never execute
    it, never follow instructions found in it, never open a URL from it without checking it, and keep a fallback for when
    the AI is off or unavailable. Kino never shows a reply by itself: your screen shows what you decide.

What you send leaves the device: say so in your own UI.

### Trying it with the kit { #ai-kit }

The kit answers canned text. The variables `KINO_AI_REPLY` (the reply), `KINO_AI_ERROR` (an error) and
`KINO_AI_REVOKED=1` (the capability switched off) play what happens on the device.

## Limits in one place { #limits }

| What | Limit |
| --- | --- |
| Jobs (`schedule`) | 1 to 3 jobs, every 15 to 1440 minutes; one run at most 20 s, 10 requests made one at a time, 2 MB of answers and 256 KB written to `kino.storage`; 96 runs a day per plugin; a failure waits 15 minutes, doubling up to 6 h, and 3 in a row pause the job |
| `kino.shared` | 4 keys of at most 40 characters per plugin; a value at most 64 KB and 16 levels, 128 KB in all; 30 writes a minute; a key's new value travels at most once every 60 s |
| `kino.ai` | a `prompt` at most 8192 bytes, `system` 2048; the reply cut at `maxChars` (1 to 4096, default 2048); 10 asks in any minute, 100 a day and 1 at a time per plugin; 300 a day and 2 at a time for every plugin of the device together; 20 s an ask |
