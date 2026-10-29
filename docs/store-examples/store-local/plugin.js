// A LOCAL plugin store: the whole list is one static JSON file (plugins.json) that you publish anywhere over https, here a
// GitHub repository's raw file. Kino never asks this plugin anything while the person browses: it calls storeSync in the
// background (every 2 hours by default, Wi-Fi only) and when the person presses reload, keeps the entries in its own local
// index and paints the store from there (cards, search, categories, sort). Installing is always Kino's own flow.
//
// Change LIST_URL to where you publish plugins.json, and "hosts" in kino-plugin.json to that host.
const LIST_URL = "https://raw.githubusercontent.com/your-user/my-kino-store/main/plugins.json";

/** One row of plugins.json -> a StoreEntry. Only `address` (or `stremio`), `id` and `name` are required. */
function toEntry(p) {
  return {
    address: p.repo,                  // what Kino installs from: "owner/repo", "owner/repo/path", "owner/repo@ref" or "url:https://.../kino-plugin.json"
    id: p.id,                         // the plugin's own id (its kino-plugin.json "id")
    name: p.name,
    description: p.description,
    categories: p.categories,         // movies, series, anime, live, radio, subtitles, utilities, adult
    icon: p.icon,                     // an https URL; anything else is dropped
    version: p.version,
    author: p.author,
    popularity: p.popularity,         // a number; the "popular" sort
    updatedAt: p.updatedAt,           // ms since 1970; the "recent" sort
  };
}

export async function storeSync({ reason, since, state }) {
  // reason: "schedule" (the background refresh) or "reload" (the person pressed reload)
  // since:  when this store last synced successfully (ms), absent the first time
  // state:  whatever this function returned as `state` the last time (at most 16 KB of JSON)
  const r = await kino.fetch(LIST_URL);
  if (!r.ok) throw kino.error("unavailable", "the list answered " + r.status);
  const list = r.json();

  // Nothing changed since the last sync: say so with an empty delta (full: false, no entries) and keep Kino's rows as they are.
  if (state && state.generatedAt === list.generatedAt) return { full: false, entries: [], state };

  // full: true means `entries` is the WHOLE list: Kino replaces this store's rows, so a plugin you remove from plugins.json
  // leaves the store on its own. (Leaving a store never uninstalls anything a person already installed.)
  return { full: true, entries: list.plugins.map(toEntry), state: { generatedAt: list.generatedAt } };
}
