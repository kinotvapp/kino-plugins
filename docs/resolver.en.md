# External resolver apps { #resolver }

Everything else in this guide runs inside Kino's sandbox: a plugin reads a site, a JSON API or your own
server and hands Kino a URL. Some sources cannot be turned into a URL that way. They need a real program on
the device: a download engine, a media pipeline that converts a format the phone cannot decode, a helper that
speaks a protocol the sandbox has no access to. Kino does not contain such programs and does not know how any
of them works. Instead it has a small **open protocol**: a plugin names *what* it found, and an
independently-installed Android app, an **external resolver**, turns it into something Kino can play.

This page is for three readers: the plugin author who wants to use a resolver, the developer who wants to
build one, and anyone who needs to know what to expect. It needs `"apiVersion": 11` (Kino 0.9.66) and the
`externalResolve` capability.

## What it is, and what it is not { #what }

- **It is** one extra hop in the life of a `resolve()`: your plugin answers `{ external: { protocol, ref } }`
  instead of a `url`; Kino hands `protocol` and `ref` to an installed app that says it handles `protocol`; that
  app answers with the same kind of object a plugin answers with (`url`, `headers`, `subtitles`, `mime`... plus
  `media` and `portable`); Kino plays that.
- **It is not** a way to reach another app in general, a plugin API or a back door around the host rules: Kino
  never sends the app anything but `protocol` and `ref`, never widens your plugin's approved hosts because of
  it, and the app never learns which plugin, title or person it is serving beyond what you put in `ref`.
- **It is not part of Kino.** Kino's own code never branches on the value of `protocol`, and there is no
  registry of names: a protocol name is a string a plugin and a resolver agree on by convention
  (`my-protocol` in the examples). Who builds the resolver, how it gets its content and whether you may use it
  for yours is between you and its author.
- **It is not guaranteed to exist.** Nothing says an app is installed ([what to expect](#expect)).

## Who does what { #roles }

| Piece | Does | Never does |
| --- | --- | --- |
| **Your plugin** | Finds the title, produces an opaque `ref`, answers `{ external: { protocol, ref } }` (and may name the app: `resolver`, or the manifest's `externalResolver`). | See the app, its answer or how it played. |
| **Kino** | Finds the app, asks the person once, binds it, shows live progress with *Cancelar*, validates the answer with the same rules as a plugin's, plays it (and casts it), shows the person a readable error. | Interpret `ref`, widen your hosts, retry a failure the app explained, ask an app for a download, a preload or a background refresh. |
| **The resolver app** | Does the real work, keeps its own server alive while the player reads, answers `onResult` / `onError`, may say why a later request failed. | Run in Kino's sandbox or talk to your plugin. |

## The flow, step by step { #flow }

```
plugin  resolve("title-42")  ->  { external: { protocol: "my-protocol", ref: "<opaque>", resolver?: "com.example.resolver" } }
Kino    finds an app declaring "my-protocol"; first time: asks the person (Permitir / No permitir)
Kino    binds the app's service  ->  IExternalResolver.resolve("my-protocol", "<opaque>", callback)
app     onProgress(40, "Preparando...")  ...  Kino shows "Abriendo con <app>" with a bar and Cancelar
app     onResult(json)  or  onError(code, message)         (exactly one; Kino's own limit is 120 s for the whole call)
Kino    validates json like a plugin answer, unbinds right away, plays the url
player  reads the url while the app keeps serving (a foreground service)
```

1. **The answer.** `external` can be the whole `resolve()` answer (then `url` may be left out) or one entry of a
   Stream's `alternatives`, next to a concrete `{ url }` copy or a lazy `{ ref }` one
   ([labelled and lazy copies](contract.md#lazy-copies)). `protocol` is 1 to 64 characters from `a-z 0-9 . _ -`;
   `ref` is 1 to 2048 characters with no control characters; `resolver` is an Android package name. A plugin
   below `apiVersion` 11, or one that does not declare `externalResolve`, has `external` ignored and fails like an
   answer with no `url`. A malformed `external` is dropped, never half-read.
2. **Finding the app.** An installed app is a candidate when its manifest declares a `<service>` with the action
   `com.arkiv.player.action.RESOLVE_EXTERNAL` and a `<meta-data
   android:name="com.arkiv.player.meta.RESOLVER_PROTOCOLS" android:value="my-protocol,another">` naming
   `protocol`. When `resolver` (or the manifest's `externalResolver.package`) is set, only that app is a
   candidate; if it is not installed, Kino says so, or offers its download ([below](#expect)).
3. **Consent.** The first time, the person is asked, naming your plugin and the app, and told the app is not
   Kino's. The answer is stored per *(plugin, protocol, app)*, applies from then on and can be revoked in
   Ajustes, in the "Fuentes externas" section. With more than one candidate and no `resolver`, the person picks
   ("Elige qué aplicación usar") and the pick is remembered as the same decision; Kino asks again only when it
   becomes ambiguous. A "no" is remembered too: that title then says "No autorizaste resolver este contenido
   con ...". This is the only consent: your plugin's own install sheet does not change for `externalResolve`.
4. **Binding and the call.** Kino binds the service and calls `resolve(protocol, ref, callback)`. One call at a
   time per binding. The app answers with any number of `onProgress(percent, message)` and then exactly one of
   `onResult(json)` / `onError(code, message)`.
5. **Progress.** Kino shows the latest `onProgress` live: `percent` 0 to 100 as a bar (anything else means
   "indeterminate"), `message` as one short line (whitespace collapsed, control characters dropped, cut at 80
   characters; blank shows Kino's own "Buscando..."). The person can press *Cancelar* or leave the player: Kino
   calls `cancel()`, unbinds and ignores anything the app sends afterwards.
6. **The deadline.** Past 120 s Kino calls `cancel()` and reports `timeout`.
7. **The result.** `onResult`'s JSON is validated by the same code that validates a plugin's `resolve()`
   answer. It differs only in hosts ([below](#answer)), in that **DRM is refused** and that a second `external`
   inside it is `bad_response`: one hop, never a chain.
8. **After the answer.** Kino unbinds at once. The app has to keep itself alive (a foreground service) for as
   long as the player reads from the URL. If it has to refuse a later request it says why in a response header
   ([errors](#errors)).

## What a resolver app can do { #can }

Anything that ends in a URL Kino can play, for example:

- **Serve content it fetches as the player reads it.** A helper that downloads while you watch and answers with
  a URL on its own server on the device (the [loopback](#loopback) case).
- **Convert what the device cannot open.** A 10-bit video, an unusual container or an audio codec nobody
  decodes can be answered as an HLS of 8-bit H.264 and AAC, produced on demand, so the player still gets
  picture and sound.
- **Add tracks.** `subtitles` and `audioTracks` in the answer, or, for an HLS, renditions the manifest itself
  lists (`#EXT-X-MEDIA`).
- **Describe the file.** [`media`](#media) says what the file holds, so Kino can show it and use it as a hint.
- **Offer a universal copy for TVs.** [`portable`](#portable).
- **Explain failures** in a sentence the person reads, before the answer (`onError`) and after it
  (`X-Resolver-Error`).

Things it cannot do: change your plugin's approved hosts, ask the person for anything through Kino, reach other
plugins, return DRM, or be asked outside a person pressing play.

## The answer { #answer }

`onResult` carries the same JSON shape as [a plugin's `resolve()` answer](contract.md#stream):

| Field | Notes |
| --- | --- |
| `url` | The video. Required. See *Hosts* below. |
| `mime`, `headers`, `subtitles`, `audioTracks`, `durationMs`, `expiresInSeconds` | As for a plugin; `subtitles` and audio track URLs are checked like `url`. |
| `media` | Optional, advisory: what the file holds ([below](#media)). |
| `portable` | Optional: a universal HLS copy of the same video ([below](#portable)). |
| `drm`, `external` | Refused (`bad_response`). |

**Hosts.** The `url` came from the app, not from your plugin, so your declared hosts do not apply: any public
host is accepted, over `https` or `http`, for the video, its subtitles and audio tracks and everything its
manifest names while it plays; never an address on the home network, a local name or a private IP. That
allowance belongs to this one playback and is never added to your plugin's approved hosts; Kino never asks the
person to widen them for it.

### The loopback origin { #loopback }

An app that has the content locally may answer with the URL of its own server on the device:
`http://127.0.0.1:<port>/...`, plain http, host exactly `127.0.0.1`, port 1024 or higher, no credentials. That
one origin, taken from this very answer, is accepted for that playback (never `localhost`, another address,
IPv6, https on loopback or a low port; a redirect from elsewhere into it is refused). Put an unguessable token
in the path: any app on the device can reach loopback. The server should answer `GET` and `HEAD` with `Range`
(a player seeks with it).

### `media` { #media }

Optional and advisory, and a plugin's own `resolve()` answer may carry the same object (see
[The `Stream` rules](contract.md#stream)). Every field is optional and cleaned: one-line text cut at 120
characters (`codec`/`container` 40, `language` 20), numbers clamped, at most 16 tracks and 4 `notes`; an object
with nothing usable left is dropped, never an error.

```json
"media": {
  "title": "Movie.mkv", "sizeBytes": 1234567890, "container": "matroska,webm",
  "video": { "codec": "h264", "profile": "High 10", "width": 1920, "height": 1080, "fps": 23.976, "bitDepth": 10, "hdr": false },
  "audio": [ { "codec": "eac3", "channels": 6, "language": "eng", "title": "Original", "default": true } ],
  "subtitles": [ { "codec": "subrip", "language": "eng", "title": "", "text": true } ],
  "converted": true, "notes": ["no decoder for H.264 High 10 on this device"]
}
```

The tracks are the *file's*, whether or not the app converted them for the player (`converted`). Kino logs a
summary (codecs and counts, never a title or a note), carries `media` to the player and may use it as a hint
when it decides how to cast. It never trusts it for anything that could harm the person. Showing it to the
person is not built yet.

### `portable` { #portable }

`{ "url": "...", "mime": "application/x-mpegURL" }`: **a universal version of the same video**, which the app
can make on demand and any TV receiver plays: HLS, H.264 8-bit up to 1080p, stereo AAC, its audio tracks and
text subtitles as HLS renditions. It must cost nothing until something reads it. It is checked like `url`; a
non-HLS `mime`, or a URL that fails the checks, drops the `portable` and keeps the rest of the answer. It is
ignored next to DRM or request signing. The phone's own player never uses it.

## Errors the person reads { #errors }

| When | What the app sends | What the person sees |
| --- | --- | --- |
| Before the answer | `onError(code, message)`, `code` one of `unavailable`, `timeout`, `cancelled`, `unsupported`, `bad_response`, `other` (anything else is read as `other`) | "No se pudo resolver este contenido (`code`): `message`." The message is the app's own sentence, cleaned to one line of at most 120 characters and shown as the app's words, so keep it short and plain. |
| After the answer, when its server cannot serve a request | An HTTP 4xx/5xx with the header `X-Resolver-Error: <code>; <message>` (ASCII, at most 120 characters) | The player's error line "La aplicación que ofrece este video dijo: `message`", and Kino does not retry it. Only this origin's responses are read this way. |
| Kino's own failures | Nothing | Only the code: "No se pudo resolver este contenido (`unavailable`)" when the app cannot be bound, `timeout` past 120 s, `bad_response` for a JSON that fails the checks. Their English detail goes to the log, never the screen. |
| No app, a denial, the picked app gone | Nothing | "Este contenido necesita una aplicación externa que no tienes instalada.", "No autorizaste resolver este contenido con ...", "La aplicación que elegiste ya no está instalada." |

## Casting a resolver's title { #cast }

A TV can never reach `127.0.0.1`, so a title from a resolver is never handed to a TV by its own URL. Kino serves
it through its own cast proxy on the phone, which reads the resolver's origin and gives the TV a token URL on
the local network ([Sending to the TV](what-people-see.md#cast)). That means:

- the app's server must answer `GET` and `HEAD` with `Range`; every read through the proxy reaches it as an
  ordinary request (so it keeps an idle timer alive);
- an HLS answer is rewritten for the receiver, renditions included (`#EXT-X-MEDIA` audio and WebVTT
  subtitles), and a progressive file goes the way any plugin file does (the proxy, or the phone's remux when
  the cast method asks for it);
- when the title's own route would need a conversion, or `media` says the video is not something a receiver
  takes as it is (not H.264, deeper than 8 bits, above 1080p, HDR, a DTS or TrueHD main audio) and the stream
  is not already a conversion, Kino casts the app's **`portable`** copy instead, when it offered one. The phone
  keeps playing the title itself;
- a title with DRM, request signing, a live channel or music never uses `portable`.

This is covered by Kino's tests with a fake resolver and was tried on one real Chromecast (a TV's built-in one): a direct H.264
file, a converted HLS with audio and subtitle renditions (seeking from the phone works) and a `portable` copy of an HEVC file all play.
**DLNA is not working yet** for an HLS whose audio is a separate rendition (tried on an LG webOS TV that lists no HLS: Kino builds one
continuous MPEG-TS for it, cannot use a separate audio rendition, and the TV receives nothing): keep the audio of anything a DLNA TV
should play in the segments themselves. Not tried: other receivers, subtitles drawn on the TV, and an app that survives the phone's
screen turning off.

## What to expect { #expect }

- **Maybe no app is installed.** Your plugin is not told. The person reads "Este contenido necesita una
  aplicación externa que no tienes instalada." (or, when your manifest names the app with an `apk`, is offered
  to download it). Say in your description that your plugin needs it, and give it a real fallback when you can:
  a `url` your own code can produce, with `external` kept to one of several `alternatives`.
- **Only while the person plays.** Never for a preload, a background refresh or a download: an
  externally-resolved title says it can only be played ("Este contenido lo abre una aplicación externa: solo se
  puede reproducir.").
- **120 seconds** for the whole call, one hop only, DRM never.
- **Every app is the person's choice, not yours.** They can say no, pick another, or revoke later.
- **You never learn which app handled it, or how.** Either the stream plays, or `resolve` fails like any other
  failure.
- **Offering the download.** When your manifest's [`externalResolver`](manifest.md#external-resolver) has an
  `apk` (`url` on a GitHub release asset, `sha256`, optional `label`) and the app is missing, Kino shows a
  sheet: it can download it from GitHub, checks the file has exactly that `sha256` (otherwise it is deleted and
  nothing is offered) and hands it to Android's installer, which asks the person as for any app. Kino does not
  check who signed it and has not reviewed it; the sheet says so.

## Using a resolver from your plugin { #use }

1. **Manifest:** `"apiVersion": 11`, `"externalResolve"` in `capabilities` and, to name the app,
   `externalResolver`:

   ```json
   {
     "apiVersion": 11,
     "capabilities": ["search", "home", "resolve", "externalResolve"],
     "externalResolver": {
       "package": "com.example.resolver",
       "apk": { "url": "https://github.com/example/resolver/releases/download/v1.0.0/resolver.apk", "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "label": "My Resolver" }
     }
   }
   ```

   `hosts` is still the set of sites *your* code reaches (your catalog), not what the resolver reaches. A
   manifest must name at least one, even if the plugin does no networking.
2. **`resolve(ref)`** answers the hand-off:

   ```js
   export async function resolve(ref) {
     const entry = CATALOG[ref];
     if (!entry) throw kino.error("not_found", "ya no está");
     return { external: { protocol: "my-protocol", ref: entry.reference } };   // add resolver: "com.example.resolver" to force that app
   }
   ```

3. **Several copies** (qualities, releases): as `alternatives`, each `{ label, ref }` lazy copy resolved by your
   own `resolve` and answering `external` again, or an entry `{ external, label }` directly ([labelled and lazy
   copies](contract.md#lazy-copies)). The person moves to the next copy when one fails.
4. **Test offline** with the kit: `node sdk/run.mjs . resolve <ref>` applies Kino's output rules, so you see
   whether your `external` survives (it is ignored without `apiVersion` 11 and the capability) and how `media`
   and `portable` come out. The kit cannot run a resolver app: to see the whole hand-off you need the app
   installed on a device ([Test it locally](test-locally.md)).

## Building a resolver { #build }

The other side is an Android app with one bound service. The contract is small:

```aidl
package com.arkiv.player.resolver.contract;

interface IExternalResolver {
    /** protocol: 1..64 chars [a-z0-9._-]+. ref: 1..2048 chars, opaque. At most one resolve() in flight per binding. */
    oneway void resolve(String protocol, String ref, IExternalResolverCallback callback);
    /** Best effort: whatever resolve() is running ends with onError("cancelled", ...). */
    oneway void cancel();
}

interface IExternalResolverCallback {
    /** Zero or more times. percent: -1 = indeterminate, else 0..100. message: shown verbatim, trusted only as display text. */
    oneway void onProgress(int percent, String message);
    /** Exactly one of onResult/onError ends a resolve() call. */
    oneway void onResult(String resultJson);
    /** code: one of "unavailable","timeout","cancelled","unsupported","bad_response","other". */
    oneway void onError(String code, String message);
}
```

Declare the service so Kino finds it:

```xml
<service android:name=".MyResolverService" android:exported="true" android:foregroundServiceType="dataSync">
  <intent-filter><action android:name="com.arkiv.player.action.RESOLVE_EXTERNAL" /></intent-filter>
  <meta-data android:name="com.arkiv.player.meta.RESOLVER_PROTOCOLS" android:value="my-protocol" />
</service>
```

In short: implement `resolve(protocol, ref, callback)` off the binder thread (answer fast with progress, end with
exactly one `onResult` or `onError`), keep your server alive in a foreground service while the player reads,
answer `Range` and `HEAD`, put an unguessable token in your URLs, answer an unservable request with an HTTP
error and a readable `X-Resolver-Error: <code>; <message>`, and return the same URL when the same content is
resolved again (a player that still holds the old URL must not be left on a dead one). The protocol is open:
nothing checks who signed your app, and anyone may implement it. The full wire-level contract, with every limit,
is `resolver-contract/PROTOCOL.md` in Kino's source repository.

## Security model { #security }

- The protocol is **open**: nothing checks who signed the other app, and anyone may implement it. The person's
  per-app consent, and Android's own install prompt, are the trust decisions.
- Kino sends the app only `protocol` and `ref`, and only after consent.
- The app's text reaches the screen only as one cleaned, bounded line; its codes are whitelisted.
- Its URLs pass the plugin-answer checks; the only local address ever accepted is the one loopback origin of
  that answer, for that playback, for the first request (never as a redirect target).
- DRM and chains are refused; a failure is never retried once the app has explained it.

## FAQ { #faq }

**Can my plugin check that a resolver is installed?** No. Kino tells the person; your plugin is not told. Ship
a fallback.

**Does the resolver see my plugin's settings or secrets?** No. It receives `protocol` and `ref`, nothing else.

**Can one `ref` serve several apps?** Only by convention: `ref` is yours and the protocol name is a string you
share with whoever builds the app. Name the app in `externalResolver` when only one will do.

**Why is the `url` allowed to be `http://127.0.0.1:...`?** Because an app that serves the content from the
device has to; it is accepted for that one answer, with an unguessable path token in it, and for nothing else.

**Will it cast?** Through Kino's proxy: Chromecast yes (tried on a real one); DLNA not yet for an HLS with separate audio renditions
([above](#cast)).

**Where do I see what `media` said?** In Kino's log, as a one-line summary. A screen for it is not built yet.
