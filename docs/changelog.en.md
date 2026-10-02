# What's new for plugin authors { #changelog }

What changed in Kino that matters when you write a plugin, by app version. Every number is in
[the contract](contract.md) and [the reference files](reference/index.md).

## Kino 0.9.46 (not released yet) { #v0946 }

- **A leading `./` in `entry` and `icon` will be accepted.** Kino drops it and installs the plugin.
  **Kino 0.9.45 and older still refuse it** (`El campo "entry" debe ser una ruta relativa a un
  archivo .js`), so keep writing `"plugin.js"` and `"icon.png"`. The kit's `validate.mjs` refuses
  `"./plugin.js"` for that reason. [Details](manifest.md#entry-dot-slash).
- Nothing else in the plugin contract changes in 0.9.46 so far (the other work in that version, such
  as online subtitle search, does not touch plugins).

## Kino 0.9.45 { #v0945 }

**Contract (`contract.json`, `maxApiVersion` 5):**

- **Signed plugins, `apiVersion` 5.** Optional author signature in `kino-plugin.json`
  (`node sdk/seal.mjs --keygen`, `--sign`; `validate.mjs` checks it), key pinned at first install,
  "Firmado por su autor" on the consent sheet, "Firmado" badge, the author key in the details. It
  needs Kino 0.9.45+; older apps refuse an `apiVersion` 5 manifest. Earlier drafts of these docs said
  0.9.46: it shipped in **0.9.45**. [Signed plugins](signed.md).
- **No maximum number of `hosts`.** The old limit of 20 is gone (only the manifest's 16 KB bounds
  it). Kino 0.9.44 and older still refuse more than 20, and the kit warns about it.
  [The manifest](manifest.md).
- **`kino.apiVersion`** reports 5.

**Behavior you may notice (no manifest change):**

- **Sending to the TV (Chromecast and DLNA) works for plugin titles.** Direct for mp4/webm and HLS
  with no `headers`; through the phone when you set `headers`; never for DRM, DASH, progressive
  MPEG-TS or a format nothing identifies. [Sending to the TV](what-people-see.md#cast).
- **Plugins follow the person across their devices** (phone and TV): installs, switches, approvals,
  settings and passwords (encrypted) sync, and the other device installs your plugin from the same
  address. [Plugins on other devices](what-people-see.md#sync).
- **Install addresses** can also be a `raw.githubusercontent.com/.../kino-plugin.json` (or
  `manifest.json`, for Nuvio) URL, or a `github.com/.../blob/...` one; a ref that only comes from a
  pasted URL is not a pin. [Index](index.md), [Nuvio scrapers](nuvio.md).
- **HLS downloads**: `EXT-X-DISCONTINUITY` is kept as is unless the format changes at it; a bad key
  or an empty segment ends as "Este video no se puede descargar"; a retry resumes only with the same
  content. Downloads stay declarative: `"download"` in `capabilities`, nothing to export.
  [Downloads](manifest.md#downloads).
- **M3U channel headers**: `#EXTHTTP`, `url|User-Agent=...` and `#KODIPROP` headers are read; only
  `User-Agent`, `Referer`, `Origin` and `Cookie` are kept. [Live channels](live-channels.md).
- **`kino.fetch`**: refused redirect hops count toward the 60-request limit, at most 6 fetches in
  flight, at most 3 host questions per call, IPv6 forms of private addresses refused, no device
  proxy. A plugin converted from a Nuvio scraper gets 250 requests and a 75 s `resolve`.
  [Limits](engine-limits.md).

!!! note "About the version of each item"
    The contract file states the version only for signed plugins and the host limit (0.9.45). The
    other items above are in the build that was released as 0.9.45; the exact version in which each
    one first appeared was not checked.

## Already there before 0.9.45 { #earlier }

`streamHosts: "any"` (apiVersion 4), `liveStreamHosts: "any"` (apiVersion 3 plus the `channels`
capability), `fetchHosts: "any"` (written by Kino into converted Nuvio scrapers only, never for your
plugin), and the question Kino asks the person the first time a stream uses a host you did not
declare. They are documented in [the manifest](manifest.md#stream-hosts),
[live channels](live-channels.md) and [the contract](contract.md#forgotten-host).
