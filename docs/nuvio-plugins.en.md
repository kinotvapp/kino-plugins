# Plugins that use Nuvio scrapers (`kino.nuvio`)

From **Kino 0.9.71** (`"apiVersion": 11`) a plugin can say "use this Nuvio repository" and let Kino do the heavy
lifting of finding links. Many Nuvio repositories hold dozens of scrapers that already work; instead of writing and
maintaining one scraper per site, your plugin feeds on them and you only do the part that is yours: the catalogue,
which scrapers to ask first, how to sort and label the copies, and what to do when one fails.

!!! warning "Experiment"
    `kino.nuvio` is new and may change. Use it behind `typeof kino.nuvio === "object"`: an older Kino does not have it
    (and rejects a manifest with `"apiVersion": 11`).

!!! note "This is not the Nuvio import"
    [Nuvio scrapers](nuvio.md) tells how **a person** adds the scrapers of a repository, one by one, from "Agregar
    plugin". This page is for **plugin authors**: the plugin names the repository and Kino installs and uses the
    scrapers with no screens and no steps for the person. Underneath it is the same reading, the same conversion and
    the same rules.

## How it works { #how }

1. In the manifest you declare the `nuvio` capability and `nuvioRepos` (1 to 4 repositories).
2. In your `resolve` (or any function of yours) you call `kino.nuvio`:
    - `available` tells you what the repository offers;
    - `use` installs the scrapers you pick, with the importer's own reader and conversion;
    - `streams` asks each scraper for the links of a title (by its TMDB id) and returns **one answer per scraper**;
    - `scrapers` lists the ones already installed and on.
3. You decide what to do with the answers: sort them, merge them, label them and drop the ones that are no good. What
   you return is an ordinary `Stream`, with the main copy and the rest as `alternatives`.

Your plugin does not run or download anything from the scrapers: Kino does, with the same hosts, the same request
budget and the same torrent filter as the import.

## The manifest { #manifest }

```json
{
  "id": "my-all-in-one",
  "name": "My All-in-One",
  "version": "1.0.0",
  "apiVersion": 11,
  "entry": "plugin.js",
  "description": "Movies and series with TMDB; finds the links in a Nuvio repository",
  "author": "your-user",
  "hosts": ["image.tmdb.org"],
  "streamHosts": "any",
  "capabilities": ["search", "episodes", "resolve", "nuvio"],
  "nuvioRepos": ["owner/nuvio-repository"]
}
```

| Field | Rule |
| --- | --- |
| `capabilities` | Include `"nuvio"`. It is a declarative capability that **the person approves** when installing: the sheet says "Installs and uses Nuvio scrapers from the repository it names to look for links". Needs `"apiVersion": 11`. |
| `nuvioRepos` | Required with `nuvio`, and `nuvio` is required with it. 1 to 4 repositories, each a GitHub `owner/repo` or the https address of the Nuvio `manifest.json`. `kino.nuvio` refuses any other repository with `not_allowed`, so the repositories your plugin can reach are fixed and visible at install time. |
| `streamHosts` | Usually `"any"` (`apiVersion` 4): the videos come from each scraper's own sites, which you cannot list in advance. The person approves it when installing. |
| `hosts` | Only your own plugin's (for example `image.tmdb.org` for posters). Each scraper's hosts come with the scraper. |

## The functions { #api }

Call them **only inside one of your functions** (never when the module loads, never on the signing lane); all return a
promise.

| Call | Does |
| --- | --- |
| `kino.nuvio.available({ repo })` | What the repository offers, read as the importer reads it: `id`, `name`, `description` (up to 120 characters), `types` (`movie`, `tv`, `anime`), `languages`, `compatible` and `installed`. |
| `kino.nuvio.use({ repo, scrapers })` | Makes sure those scrapers (up to 12) are installed, installing the missing ones one after another. Answers `{ ready, failed }`; `failed` holds each one that could not be installed (`refused` if torrent-based, `not_found`, `timeout`, `failed`) and the rest go on. |
| `kino.nuvio.scrapers({ repo, scrapers? })` | The repository's scrapers that are installed and on, in install order. 18+ ones are never listed. |
| `kino.nuvio.streams({ repo, type, tmdbId, season?, episode?, scrapers?, timeoutMs? })` | Asks the scrapers for a title and returns `{ results, truncated }`. Each item of `results` is `{ scraper, ok: true, stream }` or `{ scraper, ok: false, code, message }`. A series needs `season` and `episode`. |

Details that matter:

- `type` is `"movie"`, `"series"` or `"tv"`. `tmdbId` is the title's TMDB id.
- `streams` never throws because a scraper fails or is slow: that scraper is an entry with `ok: false`, so one slow
  source hides nothing. `timeoutMs` (2000 to 60000, default 60000) is how long **each** scraper may take.
- `stream` carries a `Stream`'s fields: `url`, `mime`, `headers`, `label`, `subtitles` and `alternatives`. A lazy copy
  (no address yet) is left out.
- `truncated` is `true` when more than 12 scrapers were installed and only the first 12 were asked.
- Torrent-only scrapers come out as `compatible: false` and are never installed.

### Errors { #errors }

`invalid_request` (a malformed query), `rate_limited`, `unavailable` (the repository cannot be read) and `not_allowed`
(you did not declare the capability, or the repository is not in `nuvioRepos`).

## Limits { #limits }

| What | How much |
| --- | --- |
| Calls per minute, per plugin | 20 |
| Scrapers per `use` or `streams` call | up to 12 (`streams` asks 4 at a time) |
| Time for one scraper | 60 s, or the `timeoutMs` you ask for (2 to 60 s) |
| Installing one scraper | 45 s each |
| Scrapers `available` returns | up to 200 |
| A query's `scrapers` filter | up to 64 ids |
| Size of the query | 4096 characters |
| `resolve` of a plugin that declares `nuvio` | 75 s (like converted plugins) |

## The scrapers belong to your plugin { #owned }

The scrapers you install from a repository you name in `nuvioRepos` are **your plugin's**, not the person's choice:

- Settings ▸ Plugins ▸ Installed does not list them; your plugin's card says "N Nuvio scrapers, removed with the
  plugin".
- If the person uninstalls your plugin, they are uninstalled with it, unless another installed plugin names the same
  repository.
- Nothing new is stored on the side: it is read from the manifests and records that already sync, so it holds on all
  of their devices.

## A complete example { #example }

A movies and series plugin: the catalogue comes from TMDB (with `kino.tmdb`, no key in your code), the episodes from
`kino.meta`, and the links from the scrapers of a Nuvio repository. Replace `owner/nuvio-repository` with the
repository you want to use. (`kino.tmdb` and `kino.meta` exist since Kino 0.9.53, so with `apiVersion` 11 they are always there; the kit warns about it and you can ignore the warning.)

```js
const REPO = "owner/nuvio-repository"; // the same as "nuvioRepos" in kino-plugin.json
const MAX_SCRAPERS = 6;

function ref(o) { return JSON.stringify(o); }

function parse(r) {
  try { const o = JSON.parse(String(r)); if (o && o.t) return o; } catch { /* falls through */ }
  throw kino.error("not_found", "bad ref", { userMessage: "I don't recognise this title." });
}

function toItem(r, kind) {
  const title = String((kind === "movie" ? r.title : r.name) || "").trim();
  if (!r || !r.id || !title) return null;
  const item = { id: kind[0] + r.id, ref: ref({ k: kind, t: r.id }), title: title.slice(0, 200), kind, ids: { tmdb: r.id } };
  if (r.poster_path) item.poster = "https://image.tmdb.org/t/p/w342" + r.poster_path;
  return item;
}

export async function search(query) {
  const q = String(query.q || "").trim();
  if (q.length < 2) return [];
  const data = await kino.tmdb("/search/multi", { query: q, include_adult: false });
  const items = [];
  for (const r of data.results || []) {
    if (r.media_type === "movie" || r.media_type === "tv") {
      const item = toItem(r, r.media_type === "movie" ? "movie" : "series");
      if (item) items.push(item);
    }
  }
  return items.slice(0, 40);
}

export async function episodes(refText) {
  const r = parse(refText);
  const meta = await kino.meta({ type: "series", ids: { tmdb: r.t } });
  const list = [];
  for (const ep of (meta && meta.episodes) || []) {
    if (ep.season < 1 || ep.number < 1) continue; // specials (season 0) have no place in Kino's numbering
    list.push({ season: ep.season, number: ep.number, title: ep.title, ref: ref({ k: "series", t: r.t, s: ep.season, e: ep.number }) });
  }
  if (!list.length) throw kino.error("not_found", "no episodes", { userMessage: "I found no episodes." });
  return { episodes: list };
}

export async function resolve(refText) {
  const r = parse(refText);
  // An older Kino has no kino.nuvio: fail with a clear message instead of breaking.
  if (typeof kino.nuvio !== "object") throw kino.error("unavailable", "no kino.nuvio", { userMessage: "Update Kino to use this plugin." });

  // 1. What the repository offers, and of those, the ones that fit this kind of title.
  const offered = await kino.nuvio.available({ repo: REPO });
  const type = r.k === "movie" ? "movie" : "tv";
  const ids = offered.filter((o) => o.compatible && o.types.includes(type)).slice(0, MAX_SCRAPERS).map((o) => o.id);
  if (!ids.length) throw kino.error("unavailable", "no scrapers", { userMessage: "There are no sources for this title." });

  // 2. Install the missing ones. Any that cannot be installed are in "failed" and the rest go on.
  await kino.nuvio.use({ repo: REPO, scrapers: ids });

  // 3. Ask them for the title. A slow or broken scraper is an entry with ok: false, never an error.
  const query = { repo: REPO, type: r.k, tmdbId: r.t, scrapers: ids, timeoutMs: 15000 };
  if (r.k === "series") { query.season = r.s || 1; query.episode = r.e || 1; }
  const answer = await kino.nuvio.streams(query);

  // 4. You decide: here, every copy that answered, each address once; the first is the main one.
  const seen = new Set();
  const copies = [];
  for (const x of answer.results) {
    if (!x.ok) continue;
    const all = [x.stream].concat(x.stream.alternatives || []);
    for (const c of all) {
      if (!c || !c.url || seen.has(c.url)) continue;
      seen.add(c.url);
      copies.push({ url: c.url, mime: c.mime, headers: c.headers, label: x.scraper.name + (c.label ? " · " + c.label : ""), subtitles: c.subtitles });
    }
  }
  if (!copies.length) throw kino.error("unavailable", "no sources", { userMessage: "No source had this title." });

  const main = copies[0];
  const stream = { url: main.url, label: main.label.slice(0, 48) };
  if (main.mime) stream.mime = main.mime;
  if (main.headers) stream.headers = main.headers;
  if (main.subtitles) stream.subtitles = main.subtitles;
  stream.alternatives = copies.slice(1, 9).map((c, i) => ({ url: c.url, mime: c.mime, headers: c.headers, label: (c.label.slice(0, 44) + " " + (i + 2)) }));
  return stream;
}
```

What each step does, and where to put your own logic:

- **Choosing scrapers** (step 1): sort here by language, by type (anime ones only for animation), by the ones that
  worked last time (keep that in `kino.storage`) or by what the person picks in a setting.
- **Installing** (step 2): `use` takes up to 45 s per new scraper, so do not ask for all 12 at once; start with a few
  and ask for more only if none answers.
- **Asking** (step 3): lower `timeoutMs` so a hung source does not eat the 75 s of your `resolve`.
- **Merging** (step 4): sort as you like (by quality, by server, dropping embeds), label each copy with where it came
  from and leave the rest as `alternatives`; if the main one fails, Kino tries the others.


## The types (TypeScript) { #types }

These declarations are the ones in Kino 0.9.71's `kino.d.ts`; this site's reference files do not include them yet.

```ts
/** Kino 0.9.71, `kino.nuvio.scrapers(query)`: `repo` is a GitHub `owner/repo` or the https address of a Nuvio `manifest.json`, as the person added it. */
interface KinoNuvioScrapersRequest {
  repo: string;
  /** Only these scraper ids (at most 64). */
  scrapers?: string[];
}

/** Kino 0.9.71, `kino.nuvio.streams(query)`: the title by its TMDB id; a series needs `season` and `episode`. */
interface KinoNuvioStreamsRequest extends KinoNuvioScrapersRequest {
  type: "movie" | "series" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
  /** How long each scraper may take, 2000 to 60000 ms (default 60000): a scraper that hangs answers `timeout` and hides nothing. */
  timeoutMs?: number;
}

interface KinoNuvioScraper { id: string; name: string }

/** One scraper a repository offers (`kino.nuvio.available`). */
interface KinoNuvioOffered extends KinoNuvioScraper { description: string; types: string[]; languages: string[]; compatible: boolean; installed: boolean }

/** One copy a scraper found: a `Stream`'s fields, copies included; a lazy copy (no address yet) is left out. */
interface KinoNuvioStream {
  url: string;
  mime?: string;
  headers?: Record<string, string>;
  label?: string;
  expiresInSeconds?: number;
  subtitles?: { lang: string; url: string; format?: "vtt" | "srt" }[];
  alternatives?: { url: string; mime?: string; headers?: Record<string, string>; label?: string }[];
}

type KinoNuvioResult =
  | { scraper: KinoNuvioScraper; ok: true; stream: KinoNuvioStream }
  | { scraper: KinoNuvioScraper; ok: false; code: string; message: string };

interface KinoNuvioStreamsAnswer { results: KinoNuvioResult[]; truncated: boolean }

declare namespace kino.nuvio {
  function available(query: { repo: string }): Promise<KinoNuvioOffered[]>;
  function use(query: { repo: string; scrapers: string[] }): Promise<{ ready: string[]; failed: { id: string; code: string; message: string }[] }>;
  function scrapers(query: KinoNuvioScrapersRequest): Promise<KinoNuvioScraper[]>;
  function streams(query: KinoNuvioStreamsRequest): Promise<KinoNuvioStreamsAnswer>;
}
```

## Testing it { #test }

- **The Node kit does not know `nuvio` yet.** `node sdk/validate.mjs .` answers `capabilities: Unknown capability: "nuvio"` even when the manifest is right: it is a kit error, not a Kino one. Do not remove the capability to silence it; Kino 0.9.71 or newer decides when installing. The rest of what the kit checks (hosts, structure, your other functions) still helps.
- The Node kit **does not simulate `kino.nuvio` either**: in the kit, `typeof kino.nuvio` is not `"object"`. That is why the
  example checks it first. Test `resolve` for real by installing the plugin in Kino 0.9.71 or newer and playing a
  title.
- Read the plugin's log (`kino.log`) to learn which scraper failed and why.

## Common mistakes { #mistakes }

- Calling `kino.nuvio` when the module loads: it only works inside one of your functions.
- Forgetting `nuvioRepos` (or `nuvio` in `capabilities`): the manifest is rejected.
- Asking for a repository you did not declare: `not_allowed`.
- Asking for all 12 scrapers on every `resolve`: it is slow and spends your 20 calls a minute. Remember which ones work.
- Not declaring `"streamHosts": "any"`: Kino drops copies from hosts you did not declare.
- Expecting torrent scrapers: they are never installed.

More: [the contract](contract.md), [the manifest](manifest.md#nuvio-repos) and [Nuvio scrapers](nuvio.md), the import
a person does.
