# Moving saved titles to your plugin (`migrate`, apiVersion 6)

When your plugin changes how its refs look, or takes over titles another source used to open, declare
the `migrate` capability (with `"apiVersion": 6`, Kino 0.9.50) and export `migrate(input)`. Kino calls it
in the background for every value it has saved and can no longer open:

| `input` | What it is | Expected answer |
| --- | --- | --- |
| `{ kind: "title", ref }` | a library title | `{ kind: "movie" \| "series", id, ref }`, or (apiVersion 8, Kino 0.9.54) `{ kind: "music" \| "podcast", id, ref }` |
| `{ kind: "chapter", ref, season, episode }` | each of its chapters | `{ kind: "episode", ref, season, number }` |
| `{ kind: "live", provider, code }` | a channel in favorites or recents | `{ kind: "live", code }` |

Answer with what `search()` would return for it today, or `null` when it is not yours.

```js
export async function migrate(input) {
  if (input.kind === "title") {
    const id = oldIdFrom(input.ref);              // your own reading of the old ref
    if (!id) return null;
    const t = await lookUp(id);
    return { kind: t.isSeries ? "series" : "movie", id: t.id, ref: t.ref };
  }
  if (input.kind === "chapter") {
    const ep = await findEpisode(input.ref, input.season, input.episode);
    return ep ? { kind: "episode", ref: ep.ref, season: ep.season, number: ep.number } : null;
  }
  if (input.kind === "live") {
    const code = channelCodeFrom(input.provider, input.code);
    return code ? { kind: "live", code } : null;
  }
  return null;
}
```

## The rules { #rules }

- Declaring `migrate` adds "Revisar lo que tienes guardado (biblioteca, historial, favoritos) para
  pasarlo a este plugin" to the consent sheet, and an update that adds it waits for the person's
  approval like any new reach: your plugin sees what they saved.
- Kino asks the installed plugins with `migrate` in order of their id; the first answer wins.
- A series moves only when every saved chapter is answered as an `episode`.
- A `music` or `podcast` title (apiVersion 8, Kino 0.9.54; below 8 that answer is no claim) moves in the
  shape your plugin saves it in from then on. If you declare `episodes`, it is an album or show: every
  saved row is asked about as a chapter and must be answered as an `episode` (a saved row with no ref
  and no number can't be one, so the title stays). Without `episodes`, it is a lone track: it moves like
  a movie, with no chapter asked, and only when one row is saved (with more, the title stays). Either
  refusal is logged and remembered like a `null`. See [Music and podcasts](contract.md#music-podcasts).
- Watched progress, intro/outro marks, downloads and favorites move with the title.
- A `null` is remembered until your plugin's next version, so returning `null` is cheap. So is a throw
  from your own code, or a `kino.error` with any code but `timeout`, `network`, `host_not_allowed`,
  `unavailable`, `rate_limited` or `auth_required`: those few mean "not now", and Kino asks again on a
  later run (meanwhile no plugin after yours is asked about that value).
- Never return a ref that starts with `plg1:`.
- Never fetch from inside `migrate` unless you must: it runs for every saved value, 10 s each.
- A value nobody claims is not deleted: it stays saved, unopened, in case a plugin claims it later.
- With `"telemetry": "verbose"`, `migrate` results are reported as edge cases
  ([Logs and telemetry](diagnostics.md#telemetry)).

Try it with the kit: `node sdk/run.mjs ./plugin.js migrate '{"kind":"title","ref":"<old ref>"}'` (it prints what Kino would keep of your answer).
