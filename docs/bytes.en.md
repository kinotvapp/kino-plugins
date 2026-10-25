# Sockets and plugin-served bytes (`socket` and `byteSource`, apiVersion 13) { #bytes }

!!! note "apiVersion 13 is in development"
    Nothing on this page is in a released Kino yet. apiVersion 13 is planned for the next Kino version (0.9.75 is
    provisional); today's Kino (0.9.74) supports up to apiVersion 12 and refuses a manifest with `"apiVersion": 13`
    ("Este plugin necesita una versión más nueva de Kino"). The contract and the kit already know it, so you can write and
    test a plugin now and publish it when that version is out.

Some services are not HTTP at all: a messaging service speaks its own protocol over a WebSocket, and the video lives in
messages, not behind a URL. Two capabilities cover that case. Declare either or both, with `"apiVersion": 13`:

```json
"apiVersion": 13,
"capabilities": ["search", "resolve", "socket", "byteSource"],
"hosts": ["ws.example.org"]
```

- **`socket`** gives your code `kino.ws`: outbound WebSockets (`wss://` only) to the hosts you declare.
- **`byteSource`** lets `resolve()` answer a stream that has no URL, `{ source: "plugin", handle, size, mime }`; Kino then
  asks your `read` export for its bytes, one range at a time, and plays them in its own player, on a Chromecast or on a
  DLNA TV.

Neither has a consent line of its own: `socket` reaches only the hosts the consent screen already lists, and
`byteSource` reaches nothing.

## `kino.ws`: WebSockets (`socket`) { #ws }

Declarative: nothing to export.

```js
const ws = await kino.ws.open("wss://ws.example.org/apiws", { protocol: "binary" });
await ws.send(new Uint8Array([1, 2, 3]));
const reply = await ws.recv(10000);   // Uint8Array, or null when nothing came within 10 s
await ws.close();
```

- **Host rules.** `wss://` only (a plain `ws://` is refused with code `not_https`), on port 443 only, and the host must
  be one your manifest declares in `hosts` and the person approved. Anything else is refused with `host_not_allowed` (the
  error carries the `host`). Never the local network and never an IP literal, the same rule as `kino.fetch`. Opening
  never asks the person about a new host: declare it in `hosts`.
- **Limits.** At most 4 open sockets per plugin (the fifth is refused with `limit`) and at most 8 MiB of received
  messages queued unread per socket; past that the socket closes and `recv` fails with `limit` once what was queued is
  read. A frame you send is at most 786,000 bytes (a bigger one fails with `too_large`: split it). One `recv` waits at
  most 60 s (30 s when you give no time). A socket the plugin never closes lives until Kino closes the plugin's sandbox
  (idle 5 minutes), which closes every socket it opened. Messages are binary (`Uint8Array`).
- **Closed sockets.** `send` or `recv` on a closed socket fails with code `closed`; `recv` on a socket the other side
  closed answers what is still queued, then fails with `closed`. Close every socket you open.
- **Session advice.** Whatever lets you reconnect later (an authorization key, a session string) is a secret. Keep it in
  a [sealed secret](manifest.md#secrets) or `kino.storage`, never in the manifest or the logs, and never send it to a
  host you did not declare.

| Error `code` | When |
| --- | --- |
| `not_https` | The address is not `wss://`. |
| `host_not_allowed` | The host is not declared and approved, is not on port 443, is an IP literal or the local network. |
| `limit` | A fifth socket, or more than 8 MiB queued unread (the socket is then closed). |
| `closed` | The socket is closed (by you, by the other side, or by Kino). |
| `network`, `timeout` | The connection could not be made. |
| `too_large` | A frame to send over 786,000 bytes (counted decoded). |
| `invalid_request` | A malformed hex or base64 frame, or an `encoding` other than `hex` and `base64`. |

### Frames as strings: `{ encoding: "hex" | "base64" }` { #encodings }

Your plugin runs in QuickJS, an interpreter: a JavaScript loop over the bytes of a message costs real time on a phone,
about a second per MiB for the decode a `Uint8Array` needs (measured on a recent phone). A binary protocol that already
works on hex strings (most do, because `kino.crypto` takes and answers hex) should ask for its frames encoded instead.
Kino then encodes what `recv` answers and decodes what `send` passes in native code, and no JavaScript touches the
bytes:

```js
const ws = await kino.ws.open("wss://ws.example.org/apiws", { protocol: "binary" });
await ws.send("efefefef", { encoding: "hex" });                  // 4 bytes, decoded by Kino
const hex = await ws.recv(10000, { encoding: "hex" });          // "0a1b..." (lower case), or null after 10 s
await ws.send("AAECAw==", { encoding: "base64" });              // bytes 0, 1, 2, 3
const b64 = await ws.recv(10000, { encoding: "base64" });       // padded base64, or null
await ws.close();
```

- Without `encoding` nothing changes: `recv` answers a `Uint8Array` and `send` takes one.
- `hex` is an even number of digits (either case going out, lower case coming in); `base64` is the standard alphabet,
  padded, with no whitespace. Anything else, and any other `encoding`, fails with `invalid_request` before a byte is
  sent.
- Every limit counts the decoded bytes: a frame of at most 786,000 bytes is up to 1,572,000 hex characters.

## `byteSource`: a stream the plugin serves { #byte-source }

`resolve()` answers a stream that has no URL:

```js
return { source: "plugin", handle: "msg:12345", size: 734003200, mime: "video/mp4" };
```

`handle` is yours (opaque to Kino, 1 to 512 characters), `size` is the total length in bytes and `mime` the media type.
`handle` has no control character, `size` is a positive whole number and `mime` a media type (`video/mp4`,
`video/x-matroska`...; no parameters); anything else is refused ("El video que entregó el plugin no es válido"). It is read
only from a movie's, an episode's or a track's own `resolve`, never from a live channel or a lazy alternative. The player
then asks your `read` export for the bytes, one range at a time:

```js
export async function read({ handle, offset, length }) {
  // offset is always a multiple of 4096; length is at most 1048576 (1 MiB)
  const base64 = await fetchRangeAsBase64(handle, offset, length);   // your own code
  return { bytes: base64 };                                          // the range, base64-encoded
}
```

- **Answer exactly the range asked**, or fewer bytes only when it runs past `size`. An answer that is not `{ bytes }` of
  the right length is refused as "El plugin no entregó los datos del video".
- A plugin that declares `byteSource` must export `read`, or the install fails with "El plugin no carga: le falta
  read". A `{ source: "plugin" }` answer from a plugin that does not declare the capability is refused.
- **Time.** Each `read` has 20 seconds. What it throws (or a timeout) is what the person reads when the video stops,
  worded like any other failed call. After 3 timed-out reads in a row Kino stops reading that stream until it is opened
  again (each timeout leaves your script's evaluation running until it ends by itself).
- **One at a time.** Calls to `read` come one at a time, and a call that started always runs to its end, even when the
  person seeks meanwhile, so a connection you keep open between calls stays open.
- **What the stream may carry.** A byte stream may carry `subtitles`, `audioTracks`, `durationMs`, `skip`, `label` and
  `media` like any stream; it is only for a movie, an episode or a track (never a live channel nor a lazy alternative).
- **Casting.** It casts to a Chromecast or a DLNA TV when `mime` is a video or audio file type other than MPEG-TS
  (`video/mp4`, `video/webm`, `video/x-matroska`, `audio/mpeg`...): the TV fetches it from the phone over the home
  network, from a session of its own that ends with the cast (leaving the player doesn't stop the TV), and every byte
  still comes from your `read`, which then also serves what the TV asks for. Kino never remuxes or converts it for the
  TV, so a format the TV can't play as it is won't play there.
- **No downloads.** It is never downloaded, so declaring `download` is pointless for a plugin whose streams are all
  `{ source: "plugin" }`: its titles show the download button, and every download fails as not downloadable.

### How Kino reads, and how to make it fast { #performance }

Calls to `read` are serial per plugin (one at a time, whatever the player asks), so every call's time adds up before
the first frame. Kino asks for 1 MiB per call, at an offset that is a multiple of 1 MiB, reads ahead up to 3 chunks,
keeps the last 8 chunks it read, and reads the first and the last chunk of a stream early, because a player needs both
before it can start (an MP4 whose `moov` index sits at the end, a Matroska file's cues). When the person seeks, chunks
queued for the old position are dropped and the new position goes first; a read already running still ends and its
chunk is kept. What makes a chunk fast is your own per-call time:

- **Prefer few large reads**: answer the whole `length` asked in one call; if your source serves smaller pieces, fetch
  them in parallel inside that one call rather than one after another.
- **Keep the bytes out of JavaScript loops**: take socket frames encoded (`{ encoding: "hex" }`, above), do the crypto
  with `kino.crypto` on hex, and let the last `kino.crypto` step answer `outputEncoding: "base64"` instead of converting
  in JavaScript; when the last step is not a `kino.crypto` call (bytes you sliced out of a hex message), turn them into
  base64 with `kino.crypto.convert(hex, "hex", "base64")`. A plain loop over the bytes of 1 MiB takes about a second on
  a phone.
- **Fewer big strings**: every `kino.crypto` call copies its input and its answer once each across the bridge, so one
  call that does two steps beats two calls (`kino.crypto.aesIgeVerify`, [below](#crypto)).
- Your answer's `bytes` crosses as it is: Kino reads only `bytes` (any other field of the answer is dropped), and nothing
  scans the string on its way.

**Memory.** Each open stream holds up to about 12 MiB of Kino's own memory (the chunks kept, the ones read ahead and the
one in flight), outside your 64 MB sandbox; at most 2 streams are open at once on the device, plus at most 2 served to
TVs. What your `read` builds (a hex string is 2 bytes per byte, then the base64) counts in your 64 MB: keep few chunks
of your own, and drop what you no longer need. Not measured yet on 1 GB TV boxes.

## Byte operations in `kino.crypto` (the next Kino version: feature-detect) { #crypto }

For binary protocols (MTProto and the like), on strings in any of the three encodings (`utf8`, `hex`, `base64`):

```js
kino.crypto.aesIge("decrypt", keyHex, ivHex, dataHex, { keyEncoding: "hex", ivEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex" })
kino.crypto.modPow(baseHex, expHex, modHex)          // big-endian hex, padded to the modulus' width
kino.crypto.gunzip(b64)                              // base64 in, text out by default
kino.crypto.convert(hex, "hex", "base64")            // re-encoding, done natively
kino.crypto.aesIgeVerify(keyHex, ivHex, dataHex, {   // AES-IGE decrypt + SHA-256 MAC check in one call
  mac: msgKeyHex, macPrefix: authKeySliceHex, macOffset: 8,
  keyEncoding: "hex", ivEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex",
})
```

- `aesIge` is AES-256-IGE: a 32-byte key, a 32-byte iv (two blocks) and data a multiple of 16 bytes.
- `modPow` takes big-endian hex numbers of at most 4,096 bits and answers hex padded to the modulus' width.
- `convert(data, from, to)` turns, say, the hex of a chunk you sliced out of a message into the base64 a `read` answers,
  or a UTF-8 text into the base64 of a frame, without a JavaScript loop over its bytes.
- `aesIgeVerify` decrypts like `aesIge("decrypt", ...)` and then checks that bytes `macOffset` to
  `macOffset + mac.length` of `SHA-256(macPrefix || plaintext)` equal `mac` (`mac` and `macPrefix` read with
  `macEncoding`, hex by default). It answers the plaintext only when they match; otherwise it fails with "the mac
  doesn't match". MTProto 2.0's msg_key check is exactly that, with 32 bytes of the auth key as `macPrefix` and
  `macOffset: 8`: one call instead of a decryption, a join of the key slice with the plaintext and a hash.
- A sealed value is refused in every field of these five. Anything malformed fails with "invalid crypto operation".
- They are gated on the Kino you run on, not on your manifest: Kino gives every plugin the `kino.crypto` of its own
  version, so a Kino that predates one of them lacks it whatever `apiVersion` you declare (`convert` and `aesIgeVerify`
  arrived after the first apiVersion 13 builds). Feature-detect each one and keep a fallback:
  `typeof kino.crypto.convert === "function"`. The kit does the same: it offers what its own contract has. No capability
  is needed. Every `kino.crypto` call takes at most 5 MB of data.

The engine's own `atob` and `btoa` are also faster in the next Kino version (table-driven, same answers and errors), but a
1 MiB string through them is still a JavaScript-speed pass: for bulk bytes use `kino.crypto.convert`.

## A complete example: a video library behind a WebSocket { #example }

A made-up service, `files.example.org`, keeps a person's videos and speaks a tiny protocol of its own over a WebSocket:
each request is one frame of UTF-8 JSON; the answer to `{"op":"list"}` is one frame of UTF-8 JSON
(`{ "files": [{ "id", "name", "size", "mime" }] }`); the answer to `{"op":"read","id","offset","length"}` is that
range's bytes in one or more binary frames, then an empty frame. The plugin lists the files on Home and in search,
resolves a file to a byte stream, and serves it through `read`, with no JavaScript loop over the video's bytes: frames
come in as hex, are joined as strings, and become base64 natively.

`kino-plugin.json`:

```json
{
  "id": "ws-files",
  "name": "WS Files",
  "version": "1.0.0",
  "apiVersion": 13,
  "entry": "plugin.js",
  "hosts": ["files.example.org"],
  "capabilities": ["home", "search", "resolve", "socket", "byteSource"]
}
```

`plugin.js`:

```js
// A video library behind a WebSocket: files.example.org (a made-up service) keeps the files and speaks a tiny protocol
// of its own. Each request is one frame of UTF-8 JSON; the answer to "list" is one frame of UTF-8 JSON; the answer to
// "read" is the range's bytes in one or more binary frames, then an empty frame.
const WS_URL = "wss://files.example.org/ws";
const WAIT_MS = 15000;

let socket = null; // module-level: kept between calls while the sandbox lives (a cache, never relied on)

async function connection() {
  if (!socket) socket = await kino.ws.open(WS_URL, { protocol: "binary" });
  return socket;
}

// Sends one request; on a socket the service closed meanwhile, opens a new one and sends it once more.
async function send(request) {
  const frame = kino.crypto.convert(JSON.stringify(request), "utf8", "base64");
  try {
    await (await connection()).send(frame, { encoding: "base64" });
  } catch (e) {
    if (e.code !== "closed") throw e;
    socket = null;
    await (await connection()).send(frame, { encoding: "base64" });
  }
}

async function nextFrame(encoding) {
  const frame = await socket.recv(WAIT_MS, { encoding });
  if (frame === null) throw kino.error("unavailable", "files.example.org did not answer in time");
  return frame;
}

async function listFiles() {
  const cached = kino.storage.get("files");
  if (cached) return JSON.parse(cached);
  await send({ op: "list" });
  const { files } = JSON.parse(kino.crypto.convert(await nextFrame("base64"), "base64", "utf8"));
  kino.storage.set("files", JSON.stringify(files), { ttlMs: 10 * 60 * 1000 });
  return files; // [{ id, name, size, mime }]
}

const toItem = (f) => ({ id: "f" + f.id, ref: f.id, title: f.name, kind: "movie" });

export async function home() {
  const files = await listFiles();
  return [{ id: "files", title: "Mis videos", items: files.slice(0, 60).map(toItem) }];
}

export async function search(query) {
  const q = String(query.q || "").toLowerCase();
  return (await listFiles()).filter((f) => f.name.toLowerCase().includes(q)).slice(0, 100).map(toItem);
}

export async function resolve(ref) {
  const file = (await listFiles()).find((f) => f.id === ref);
  if (!file) throw kino.error("not_found", "no such file");
  // No URL: Kino plays it through read() below.
  return { source: "plugin", handle: file.id, size: file.size, mime: file.mime };
}

// Kino asks for one range at a time: offset is a multiple of 4096, length at most 1 MiB.
export async function read({ handle, offset, length }) {
  await send({ op: "read", id: handle, offset, length });
  let hex = "";
  for (;;) {
    const frame = await nextFrame("hex"); // hex string, decoded by Kino: no JavaScript loop over the bytes
    if (frame === "") break;              // the empty frame ends the range
    hex += frame;
    if (hex.length > 2 * length) throw kino.error("unavailable", "the service sent more than asked");
  }
  // Exactly the range asked, or fewer bytes only at the end of the file; base64 made natively.
  return { bytes: kino.crypto.convert(hex, "hex", "base64") };
}
```

What to notice:

- **The socket outlives a call** (module-level `socket`), because the sandbox is reused between calls; when the service
  or Kino closed it, `send` sees `closed` and opens a new one. Never rely on it surviving: Kino closes the sandbox after 5
  idle minutes, after a timeout and on an update.
- **Calls never overlap** (Kino runs one call of a plugin at a time), so one socket with one request in flight is safe
  here. A protocol that multiplexes (message ids) can keep several requests in flight inside one `read`.
- **Every byte stays a string**: hex frames joined with `+=`, then `kino.crypto.convert` to base64. A real service would
  add its own framing, retries and crypto (`kino.crypto.aesIge`/`aesIgeVerify` on the same hex) the same way.
- A real service also needs an account: keep its session in a [sealed secret](manifest.md#secrets) or `kino.storage`,
  and show a sign-in from the [settings form](settings-form.md) (for a TV, a [QR code](qr.md)).

### Test it with the kit { #testing }

The kit's `kino.ws` runs over Node's global `WebSocket` with the app's rules (wss only, declared hosts on port 443, the
4-socket and frame caps, `hex`/`base64` frames refused word for word like the app). To test without the network, swap
`globalThis.WebSocket` for a fake of your service before you load the plugin, and call your exports directly. This is
the test that ran the example above (Node 18+, the kit's `sdk/` next to it):

```js
// test/plugin.test.mjs -- node --test test/plugin.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createKino } from "../sdk/kino-shim.mjs";
import { loadPlugin } from "../sdk/sandbox.mjs";
import { validateManifest } from "../sdk/contract.mjs";

const FILE = Buffer.alloc(2_500_000).map((_, i) => (i * 31 + 7) & 255);

// files.example.org, faked: answers "list" and "read" as the protocol above says.
class FakeService {
  constructor() { this.l = {}; this.readyState = 0; setTimeout(() => { this.readyState = 1; this.emit("open", {}); }, 0); }
  addEventListener(n, f) { (this.l[n] ||= []).push(f); }
  emit(n, e) { (this.l[n] || []).forEach((f) => f(e)); }
  reply(bytes) { const c = Uint8Array.from(bytes); setTimeout(() => this.emit("message", { data: c.buffer }), 0); }
  send(data) {
    const req = JSON.parse(Buffer.from(data).toString("utf8"));
    if (req.op === "list") this.reply(Buffer.from(JSON.stringify({ files: [{ id: "a1", name: "Vacaciones 2024", size: FILE.length, mime: "video/mp4" }] })));
    if (req.op === "read") {
      const part = FILE.subarray(req.offset, Math.min(FILE.length, req.offset + req.length));
      for (let i = 0; i < part.length; i += 300_000) this.reply(part.subarray(i, i + 300_000));
      this.reply(new Uint8Array(0));
    }
  }
  close() { this.readyState = 3; this.emit("close", {}); }
}

test("lists, resolves to a byte stream and serves every range", async () => {
  const manifestText = readFileSync(new URL("../kino-plugin.json", import.meta.url), "utf8");
  assert.equal(validateManifest(manifestText).ok, true);
  globalThis.WebSocket = FakeService;
  const { kino } = createKino(JSON.parse(manifestText));
  const { plugin } = await loadPlugin(new URL("../plugin.js", import.meta.url).pathname, kino);
  assert.equal((await plugin.home())[0].items[0].title, "Vacaciones 2024");
  const s = await plugin.resolve("a1");
  assert.deepEqual({ ...s }, { source: "plugin", handle: "a1", size: FILE.length, mime: "video/mp4" });
  for (let offset = 0; offset < FILE.length; offset += 1048576) {
    const { bytes } = await plugin.read({ handle: "a1", offset, length: 1048576 });
    assert.ok(Buffer.from(bytes, "base64").equals(FILE.subarray(offset, offset + 1048576)), "range at " + offset);
  }
});
```

**The kit's own tools.** `checkOutput("resolve", ...)` (and so `node sdk/run.mjs . resolve <ref>`) accepts the
`{ source: "plugin", handle, size, mime }` shape of a plugin that declares `byteSource`, with the rules above.
`askRead(plugin, manifest, stream, offset, length)` from `sdk/kino-shim.mjs` calls your `read` the way Kino's proxy does
(the capability and the export, an offset that is a multiple of 4,096 inside the stream, 1 to 1,048,576 bytes, one call
at a time, 20 s, exactly `min(length, size - offset)` bytes back) and resolves with a Buffer. From the terminal:

```
node sdk/run.mjs --size 2500000 . read a1 0 1048576   # the byte count, the sha256 and the first bytes
```

`node sdk/init.mjs my-plugin --host example.com --with byteSource,socket` scaffolds an apiVersion 13 plugin with a
working, commented `read` and `kino.ws` example.

!!! warning "What the kit does not reproduce"
    Kino's player side: the 1 MiB chunks, the read-ahead, the early first and last chunk, the 3-timeouts stop and the
    cast sessions. Install the plugin on a device to see it play.

See also: [the `kino` API](kino-api.md#ws), [the limits](engine-limits.md#limits), [the contract's
`Stream` rules](contract.md#stream), and [images from the plugin](images.md), which wait while a byte stream plays.
