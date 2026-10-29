// A LIVE plugin store: its list lives behind your own API. Like every store it exports storeSync (a base list Kino keeps in
// its local index, so the store shows up at once and offline), and because it is live it also answers WHILE the person
// browses: storeList (a category page, popular or recent) and storeSearch (a search the base list may not hold).
//
// How Kino mixes it: the local list paints first; this store's live results are appended at the end as they arrive (never
// inserted above what is on screen), entries whose address is already shown are skipped, and Kino's blocklist, 18+ code and
// "de <store>" badge apply to them as to any entry. When the person picks this store in the store filter, the list is only
// its live answers. Each call may take 5 s at most and a store gets 20 calls a minute (past either, that call adds nothing);
// Kino keeps a live page for 30 minutes. Because every search reaches your server, Kino shows the person a red line about it
// before they install the store. Change API and the manifest's "hosts" to your own server.
const API = "https://plugins.example.org/api";

/** One API row -> a StoreEntry. Only `address` (or `stremio`), `id` and `name` are required. */
function toEntry(p) {
  return {
    address: p.repo,
    id: p.id,
    name: p.name,
    description: p.summary,
    categories: p.categories,   // movies, series, anime, live, radio, subtitles, utilities, adult
    icon: p.iconUrl,            // https only
    version: p.version,
    author: p.author,
    popularity: p.downloads,    // the "popular" sort
    updatedAt: p.updatedAt,     // ms; the "recent" sort
  };
}

async function get(path, params) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
    .join("&");
  const r = await kino.fetch(API + path + (query ? "?" + query : ""));
  if (r.status === 429) throw kino.error("rate_limited", "too many requests");
  if (!r.ok) throw kino.error("unavailable", "the store answered " + r.status);
  return r.json();
}

/** The base list: your featured plugins. A full list, so a plugin you drop from /featured leaves the store on the next sync. */
export async function storeSync({ reason, since, state }) {
  const data = await get("/featured", {});
  return { full: true, entries: data.plugins.map(toEntry) };
}

/** A page of one category (or of everything): sort is "popular" or "recent"; cursor is whatever you returned as `next`. */
export async function storeList({ category, sort, cursor }) {
  const data = await get("/plugins", { category, sort, cursor });
  return { entries: data.plugins.map(toEntry), next: data.next || undefined };
}

/** A search the person typed (Kino waits until they stop typing and cancels an older search when a newer one starts). */
export async function storeSearch({ q, category, cursor }) {
  const data = await get("/search", { q, category, cursor });
  return { entries: data.plugins.map(toEntry), next: data.next || undefined };
}
