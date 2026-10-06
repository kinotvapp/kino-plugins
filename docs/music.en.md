# Music and podcasts

From **`"apiVersion": 8` (Kino 0.9.54)** a plugin can offer audio next to (or instead of) video:
albums, playlists and tracks, podcasts, audiobooks and radio shows. This page is the short version;
every rule, with its exact values, is in the contract:
[Music and podcasts](contract.md#music-podcasts).

## The two kinds { #kinds }

| `kind` | What it is | One "episode" is |
| --- | --- | --- |
| `"music"` | an album, a playlist or a single track | a track |
| `"podcast"` | a show, an audiobook or a radio program | an episode or a chapter |

An audio item goes in `search`, `browse`, `home` rows and your section like any other item. The
optional `artist` field (`music` and `podcast` only, at most 200 characters) is the artist, or the
host or author: the album or podcast page shows it under the title.

## How it plays { #play }

- **With the `episodes` capability**, Kino calls `episodes(ref)` for **every** `music` and `podcast`
  item: the tracks of an album, the chapters of an audiobook, the episodes of a show, in your order.
  It must answer for each audio ref, even a single track (one entry): there is no per-item way to
  skip it. Each entry's `ref` goes to `resolve`.
- **Without `episodes`**, the item's own `ref` goes straight to `resolve` and plays as one track.
- The `Stream` is a normal one: progressive audio (MP3, M4A, AAC, OGG) or an HLS/DASH manifest.

## Before you declare 8 { #version }

- An older Kino refuses an apiVersion 8 plugin ("Este plugin necesita una versión más nueva de
  Kino"): declare 8 only when you return audio items or export [`details`](contract.md#details).
- Below apiVersion 8 a `music` or `podcast` item is dropped (with a line in the log); the rest of the
  answer stays.
- From apiVersion 8, `details` is a reserved export name: never export a helper called `details`.

## The reference audio plugin { #reference }

[**Internet Archive Audio**](https://github.com/kinotvapp/kino-plugin-archive-audio)
(`kinotvapp/kino-plugin-archive-audio`, apiVersion 8): free music, live concerts, audiobooks and
old-time radio from archive.org. Its `episodes` answers for every album, audiobook and show (a single
78 rpm side included), and `resolve` offers each audio format as a labelled lazy copy. Start from it
for an audio plugin; see also [Example plugins](examples.md).

What the person gets in Kino 0.9.54 (square covers, the album or podcast page, the audio player,
"Seguir escuchando", downloads and cast) is listed in
[the contract](contract.md#music-podcasts).
