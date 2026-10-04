# Logs and telemetry (apiVersion 6)

Three ways to find out what happens to your plugin on someone else's device, from the most local to the
one that leaves the device. All from `"apiVersion": 6` (Kino 0.9.50); below it the fields are ignored.

| What | Where you see it | Who turns it on |
| --- | --- | --- |
| [`kino.log`](kino-api.md#log) | `adb logcat` | always |
| [Modo debug](#debug) | error panel on screen, "Registro" page | the person, with the switch every plugin has (`"debug": true` makes it on by default) |
| [`"telemetry": true`](#telemetry) / `"verbose"` | the maintainers' error tracker | you ask and the person approves (no switch to turn it off yet) |

## Logcat { #logcat }

`kino.log` and `console.*` go to `adb logcat` under the tag `KinoPlugin`; in a debug build of Kino, or in
any build while your plugin's [Modo debug](#debug) switch is on, under `KinoPlugin/<your id>`. Kino's own
[playback metrics](#playback) go under the tag `KinoPlay` in those same cases, so

```
adb logcat -s KinoPlay KinoPlugin/<your id>
```

shows Kino's lines and yours together.

## Modo debug: errors on screen and the Registro page { #debug }

Since Kino 0.9.50 **every installed plugin** (yours, a generated Stremio addon, a Nuvio scraper) has a
**"Modo debug"** switch in its own tab in Ajustes (Ajustes ▸ *your plugin's name*, phone and TV), with
the line "Muestra los errores de este plugin en pantalla y guarda un registro que puedes compartir con su
autor." You don't have to do anything for it to be there. While it is on:

- every failed call of your plugin shows a panel on screen with the function, the error code, the
  technical message, the JavaScript stack and your last `kino.log` lines;
- the tab gets a **"Ver registro"** button that opens the **Registro**: the last 200 events (your lines,
  the failures and each playback's `kino:play …` lines), with "Copiar registro" and, on the phone,
  "Compartir registro".

While it is off, nothing is shown and nothing is kept; turning it off clears the Registro.

**This is how a person sends you what went wrong.** When someone reports a problem, ask them to turn on
Modo debug for your plugin in Ajustes, repeat what failed, and send you a screenshot of the panel or the
copied/shared Registro.

**`"debug": true` in your manifest only sets the default.** With it, the switch starts on for everyone
who installs the plugin (they still see your panels until they turn it off); without it (or with
`false`), the switch starts off. Use `true` while you develop, or for a test build you hand to testers;
for a plugin you publish to everyone, leave it out and let each person turn it on when they need to
send you a report. `validate.mjs` adds a note when it is `true`. Once a person touches the switch, their
choice is kept across updates (an update that adds or drops `debug` only moves the default of people who
never touched it) and syncs to their other devices. Any value other than `true` or `false` is refused
with "El campo \"debug\" debe ser true o false".

The Registro is kept in a private file on the device, so it survives a restart; it is never synced or
backed up, and it is deleted when the switch goes off or the plugin is uninstalled. Secrets, and the
person's own passwords, are masked there like everywhere else, so a shared Registro carries neither.

## `telemetry`: your lines reach the error tracker { #telemetry }

From Kino 0.9.50 only a plugin that declares `"telemetry"` sends its `kino.log` lines when a call
fails, recommended or not, whatever repository it comes from. For any other plugin (a converted Nuvio
scraper included) Kino only notes that the call failed: your id and version, the function and the kind
of failure, never a log line.

- **Consent.** The consent sheet says "Comparte registros de errores con Kino para corregir fallas". An
  update that newly declares it waits for the person's approval, like a new host ("Actualización
  disponible — requiere tu aprobación").
- **No switch yet.** For now, while plugins are being stabilized, a declared plugin's lines are always
  sent. A later Kino build adds an "Enviar registros de errores" switch to your plugin's tab in Ajustes,
  on by default, that the person can turn off on each device; then nothing leaves while it is off.
- **What is sent.** When a call fails (it throws, times out, returns something unusable, including
  `sign`, `settingsStatus`, `action` and `validateSettings`), the lines it logged during that call (the
  last 30, each at most 300 characters, 2 KB in all) as `plugin_log`, tagged with your plugin's id and
  version. At most one report per function and kind of failure an hour. A call that succeeds sends
  nothing.
- **What is removed before it leaves.** URLs, hostnames, IPs, e-mails, long ids, long hex/base64 runs,
  credential-shaped text, the person's setting values and the text of their search or title. Still: log
  what happened (a status, a step, a count), never what the person typed, a secret or a setting's value.
- Any value other than `true`, `false` or `"verbose"` is refused with "El campo \"telemetry\" debe ser
  true, false o \"verbose\"".

### `"verbose"` { #verbose }

`"telemetry": "verbose"` shares everything `true` does plus the [playback metrics](#playback) of a sample
(a quarter) of the plays that went well, live and cast problem reports, and edge cases (a re-resolve, a
failover, a decoder switch, a sign timeout, `migrate` results, settings synced from another device). At
most 60 events per plugin until Kino restarts and one a minute per area. Its consent line is "Comparte
registros detallados de reproducción y errores con Kino para corregir fallas"; an update from `true` (or
nothing) to `"verbose"` waits for the person's approval, while `"verbose"` to `true` applies silently.

## `kino.log.report`: a degraded result { #report }

`kino.log.report(...args)` (with `telemetry`) writes a line like `kino.log` and also tells the error
tracker that your plugin served a **degraded** result even though the call worked: it fell back to a
shared account, used a backup source, trimmed a list.

```js
kino.log.report("myplugin:session", "shared_fallback", "tries=2");   // area myplugin:session
```

- The line's first word names the area, and must be a namespaced word of lowercase letters, digits, `_`
  and `:` with at least one `_` or `:`, up to 24 characters. Any other first word (a bare word, anything
  with a dot, `@` or `/`, or one that holds one of the person's values) is filed as `other`.
- At most one report per plugin and area an hour and 3 per plugin until Kino restarts (and 10 in all,
  every plugin together, in that same run of Kino), sent as a warning. That cap leaves room for
  real failures, which have caps of their own.
- The whole line is scrubbed like any log line, the text of the call running at the time included.
- Without `telemetry` (or, once that switch exists, with it off) it is just a log line.
- Report what happened in codes and counts, never values that came from a response.

## Playback metrics and problem reports { #playback }

Kino measures every playback of a plugin stream (a film, a chapter, a live channel) and every cast of
one to a TV, with no code in your plugin. Each playback gets one record: how long `resolve` took, the
time to the first frame (the zap time for a channel), how the player reached the stream (`direct`,
`proxy`, `signed_proxy`, `remux`), the video decoder and its switches, resolution and bitrate changes,
rebuffers and the time spent stalled, player errors by class with their HTTP status, retries and their
reason (`expired`, `conflict`, `network`, `cut`…), and for a [request-signed stream](signed-streams.md)
`sign` p50/p95/max and timeouts per playlist and segment, fetch p50/p95 and errors per host **index**
(0 = the stream's own host, 1… = its `alternateHosts`).

Detectors watch for what a viewer feels: no first frame in 10 s, a frozen picture, long stalls,
dropped-frame bursts, audio underruns or sink errors, audio and video drifting apart, the audio track
lost, decoder errors, falling behind the live window, HTTP errors per segment class; and for a cast the
receiver's load timeouts, errors and idle reasons, a remux that stopped, the TV starting far from the
phone's position, and a session that dropped. Nothing they write holds a URL, a host, a token or
anything the person typed: only numbers and Kino's own words.

Where it goes:

- your plugin's **Registro** (while its Modo debug switch is on), one `kino:play …` line per milestone and a summary
  line;
- **logcat** under the tag `KinoPlay` in a debug build of Kino, or in any build while that switch is on;
- the **error tracker**, only with `telemetry` (and, once that switch exists, while the person leaves it on): with `true`, one summary per
  playback that ended on an error the person saw; with `"verbose"`, also a quarter of the playbacks that
  went well, and one event per problem or edge case (at most 60 per plugin until Kino restarts, one a
  minute per area). Failure events carry the Kotlin exception's stack and, when your script threw, its
  own stack frames (`at fn (plugin.js:12:5)`, frames only).
