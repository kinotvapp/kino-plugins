# Signing every request (`signing`, apiVersion 6)

Some origins want a fresh signature on **every** request: a header that expires in seconds. From
`"apiVersion": 6` (Kino 0.9.50), return `signing: "request"` in the stream, and export `sign`:

```js
export async function resolve(ref, options) {
  const session = await openSession(options?.retry); // a retry says why: "conflict" or "expired"
  return { url: session.playlist, signing: "request", signContext: JSON.stringify({ token: session.token }),
           headers: { "Content-License": session.license } };
}

export async function sign({ url, kind, ref, context }) { // kind: "playlist" | "segment"
  const { token } = JSON.parse(context);
  return { headers: { "Content-Auth": await signatureFor(token, Date.now()) } };
}
```

Kino plays the stream through a local proxy. Before every playlist and segment request it calls
`sign()` and sends its headers, merged over the stream's own `headers`.

!!! note "It is for origins that really require it"
    If your origin accepts a token that lasts minutes, return it in `headers` or the URL and use
    [`expiresInSeconds`](contract.md#stream): simpler, and it does not go through the proxy.

## The rules { #rules }

- **HLS only**: an HLS `mime`, or a `.m3u8` path. No `drm`, no `audioTracks` (subtitles are fine: they
  get the stream's own `headers`, like any stream's subtitles, but are never `sign()`ed). An inline
  `stream` of a `liveChannels` item can't ask for it: a channel that also has a `ref` plays through
  `resolve(ref)` (the inline stream is set aside), and one without a `ref` is dropped. A stream that
  breaks these is refused with `per-request signing only works with HLS video (.m3u8)`, `a video signed
  per request can't carry drm or separate audio tracks` or `a channel signed per request must play
  through resolve()` (the log's detail; the person reads Kino's own line). A signed video can't be
  downloaded: its download ends with `Este contenido no se puede descargar` (Kino 0.9.53 and older:
  `Este video no se puede descargar`).
- **`sign()` runs apart from your other functions** (the "signing lane"), so a slow `home` never delays
  a segment. It gets `kino.crypto`, `kino.secret`, `kino.config`, `kino.html` and `kino.log`, and nothing
  else: `kino.fetch` answers a `host_not_allowed` error ("sign can't use the network"), and
  `kino.storage`, `kino.cookies` and `kino.sleep` fail with the code `not_allowed` and "sign() can't use
  kino.storage: whatever you need must come in signContext" (likewise for the others). It also can't
  see anything the main runtime holds in memory (not even the private keys of
  [`generateKeyPair`](kino-api.md#key-pairs)).
- What it needs travels in `context`, the `signContext` your `resolve()` returned (a string of up to
  4096 characters; a longer or non-string one refuses the stream with `the "signContext" value is
  not valid`). A `kino.secret()` marker means nothing there (a marker only works in the runtime that made
  it): call `kino.secret()` inside `sign()` itself; a `signContext` carrying one is refused with
  "signContext can't carry a kino.secret(): call it inside sign()".
- A stream asking for `signing: "request"` from a plugin that doesn't export `sign` is refused with "the
  plugin asks to sign the video but doesn't export sign()".
- **1.5 s per call** (3 s counting its wait). A slow answer counts as a failed signature.
- Answer `{ headers }`, filtered like a stream's `headers` (same names and size rules). A value
  containing a `kino.secret()` marker is refused ("sign can't return sealed data"): a marker is
  only good inside `kino.crypto`, so compute the header there.
- Three failed signatures in a row stop the video.
- Below apiVersion 6, `signing` and `signContext` are ignored.
- **The messages above are Kino 0.9.54's**: the technical detail your code and the
  log see is English from that version on and may change, so match on the error's `code`, never on its
  text. Kino 0.9.53 and older word them in Spanish (`La firma por petición solo funciona con video HLS
  (.m3u8)`, "sign no puede usar la red", `El dato "signContext" no es válido`…).
- A signed stream does not use [`alternatives`](contract.md#stream): its failover is the
  `alternateHosts` below.

## Reopening: `resolve(ref, { retry })` { #retry }

If the origin answers 409, or 401/403 twice in a row, Kino calls
`resolve(ref, { retry: { reason, attempt, status } })` again:

- `reason`: `"conflict"` (the access is in use elsewhere: get another one) or `"expired"`;
- `attempt` from 1 to 3;
- `status`, the origin's HTTP status that caused it (401, 403 or 409; absent when Kino did not hear
  one), for your log.

The budget refills once the video has played well for a minute; after the third retry the person sees
the error. `options` is `undefined` on a normal call, and only apiVersion 6 plugins ever get it.

## Other hosts that serve the same stream (`alternateHosts`) { #alternate-hosts }

`alternateHosts`, up to 6 `"host"` or `"host:port"`, no scheme or path. Kino tries the playlist on each,
the one that served last first, for up to 3 rounds, and moves a segment, key or map to another host
when its own fails 3 times. `sign()` always gets the URL of the host being asked, so choose that host's
token from `context`.

```js
return { url: "http://cdn1.example/live/ch.m3u8", signing: "request",
         alternateHosts: ["cdn2.example", "cdn3.example:8080"],
         signContext: JSON.stringify({ "cdn1.example": t1, "cdn2.example": t2, "cdn3.example:8080": t3 }) };
// sign({ url, context }): const tokens = JSON.parse(context); const token = tokens[new URL(url).host];
```

- Each entry meets the same host rule as `url`: a declared host (plain http only on one declared
  `insecureHttp`), or any public host under `liveStreamHosts: "any"`, never a local one.
- An entry that fails it, repeats `url`'s host or another entry, or comes after the sixth is dropped
  (`run.mjs` and `validate.mjs` show it as `[dropped by Kino]`); a value that is not an array of strings
  refuses the stream with `the "alternateHosts" value is not valid` (Kino 0.9.53 and older: `El dato
  "alternateHosts" no es válido`).
- With them, the stream counts as `"expired"` only when **every** host rejected the signature, and as
  `"conflict"` only when the last one answered 409; a host answering 404 or not at all just moves Kino on.
- A host the playlist names that is not one of these is never swapped.
- Ignored without `signing`.

## Chromecast and DLNA { #cast }

A signed stream can be sent to a TV like any other HLS. The TV never signs anything: it pulls the
stream through Kino on the phone, which calls `sign()` for every playlist and segment the TV asks for,
exactly as for its own player (the same 1.5 s limit, the same "three failed signatures stop the
video"). So the phone must stay on the same Wi-Fi as the TV with Kino running for the whole cast.

- If the origin refuses the stream while the TV plays it and the player is still open on the phone,
  Kino calls `resolve(ref, { retry })` again and the TV reloads it from the same point (a live channel
  from its edge).
- Once the person leaves the player, a Chromecast keeps playing until it is stopped or sent something
  else, but a refusal is no longer re-resolved: the TV's playback just ends. Leaving the player stops a
  DLNA TV, as for any title.
- A signed stream with `drm` is never cast. Kino plays one signed stream at a time: opening another one
  on the phone ends the cast of the first.

## Test it from your terminal { #test }

```
node sdk/run.mjs ./plugin.js sign '{"url":"https://cdn.example/seg.ts","kind":"segment","ref":"<ref>","context":"<signContext>"}'
node sdk/run.mjs --retry conflict:1 ./plugin.js resolve '<ref>'      # or conflict:1:409 to pass a status
```

The first runs `sign` in the same restricted lane; the second calls `resolve` with a retry. With
`"telemetry": "verbose"` Kino also reports each playback's signing statistics (p50, p95, max and
timeouts): see [Logs and telemetry](diagnostics.md#playback).
