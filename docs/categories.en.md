# Home categories { #home-categories }

Kino can show a **Home by categories**, in the style of streaming apps: a single list of rows by
category (Action, Comedy, Anime, Kids...), with **one card per title**. It is optional and off by default: the person turns it on in Ajustes ▸ App ▸ "Home por categorías (experimento)" ("Home by categories (experiment)" in English).
It is built **only from what your Home rows already left cached** (it does not search on its own or call your plugin), so
what you declare in `home()` decides where your content lands. This page explains how to declare it. Items and rows are
in [the contract](contract.md).

!!! note "From the next Kino release"
    Until now a Home row's `genre` accepted only ten closed ids. From the next release it accepts **any category**
    (below). Earlier versions keep ignoring a value that was not in the list of ten.

## What the Home does with your categories { #how }

- **Rows by category, all in one list.** The Home no longer has type tabs: it is a single list of rows, one per
  category, with everything mixed (movies, series, anime...). Each row shows at most 30 titles.
- **Genre rows, merged across types.** Kino groups video titles by each item's `genres` (`["Drama", "Suspenso"]` puts
  the title in the Drama and Suspenso rows) and by the row's `genre` when it is a genre id (`accion`) or a new
  category. One "Acción" row holds every video title with that genre, whether movie, series or anime.
- **Thematic type rows, complete.** When a title's type is `anime`, `doramas`, `infantil`, `documentales`, `clasicos`,
  `deportes` or `noticias`, the title is also in that type's row ("Anime", "Infantil"...), which holds **every** title
  of that type, with a genre or without (they may repeat in their genre rows). The type comes from the row's `genre`
  when it is a type id (`anime`); otherwise from the item's `kind` (`movie`, `series`, `music`, `podcast`). With no
  `genre`, Kino reads the row title: one that names a known genre ("Terror", "Comedia") gives that genre, and the guess
  is skipped when the row already names a known genre; only `anime`, `infantil`, `documentales`, `deportes`,
  `noticias` and `musica` can be guessed as a type. A title's type is decided by the first row it appears in.
- **Generic types, only the leftovers.** `peliculas`, `series`, `entretenimiento` and `otros` get a row only for the
  titles with **no genre at all** (and no thematic type), named after the type ("Películas", "Series"...). A title
  with a genre appears in its genre rows and not in this one. The old single "Más títulos" ("More titles") row is gone.
- **One title, one card.** When several sources have the same title, one card is shown. Identity is, in this order: the
  **TMDB id** (movie and series kept apart), else the **normalised title plus year**, else just the title. Movies and series are kept apart even without a TMDB id. Then Kino joins copies of the same title (and the same kind, movie or series) when there is no doubt: a copy without ids joins the only one with a TMDB id when the years match or one of them has no year, and a year-less copy joins the only dated one. With two TMDB ids or two different years for that title, the copies without ids stay apart: Kino never guesses. Tapping a video
  card makes Kino search that title across every source that has it; an audio card plays that plugin's own item directly.
- **Nothing empty:** a category with no titles is never shown.
- **Fixed order:** rows always come in the [order below](#order); Kino does not change it per plugin and it cannot be customized yet.
- **18+:** `adult: true` content stays hidden while the person's 18+ code is locked.
- **Audio apart:** music and podcasts go in their own rows, at the end of the list and with square covers: the row of
  each audio genre the item has (`pop`, `rock`...) or, with none, the row of its audio type (`radio`, `podcasts`,
  `audiolibros`, `conciertos`, `musica`). Audio and video never share a row. Those rows are for audio items that are
  **not** live (`music`, `podcast`).
- **Live is not in it:** live channels (`kind: "live"`), **radio stations included**, stay in "En vivo" and this Home does
  not paint them. So a station never reaches the `radio` row.
- A **"Fuentes"** link opens the sources (your plugins).

## Group your content in these categories { #prefer }

!!! tip "Rule"
    Preferably group your content in the categories in the tables below: set `genre` on each `home()` row and `genres` on
    each item using ids from that list, and **invent a new category only when nothing fits**.

That way your content lands in the right place and sits together with other plugins' instead of in a lone row.

## Vocabulary { #vocabulary }

The **id** is what you write. Kino shows the Spanish name (or the English one if the person uses Kino in English). The
"Also understood" column holds aliases Kino maps to the id; case, accents and punctuation do not matter, and the names
shown on screen work too (note: English "Sports" is the name of both `deportes` and `deportivo`, and maps to `deportes`).

### Video types { #video-types }

Thematic (complete row): `anime`, `doramas`, `infantil`, `documentales`, `clasicos`, `deportes` and `noticias`. Generic (row only for the leftovers): `peliculas`, `series`, `entretenimiento` and `otros`.

| Id | Name in Spanish | Name in English | Also understood |
|---|---|---|---|
| `peliculas` | Películas | Movies | pelicula, movies, movie, films, film, cine |
| `series` | Series | Series | serie, tv shows, tv show, shows |
| `anime` | Anime | Anime | — |
| `doramas` | Doramas | Doramas | dorama, k drama, kdrama, k-drama, asian drama |
| `infantil` | Infantil | Kids | infantiles, kids, children, ninos, kids family |
| `documentales` | Documentales | Documentaries | documental, documentary, documentaries |
| `clasicos` | Clásicos | Classics | clasico, classics, classic, public domain, dominio publico |
| `deportes` | Deportes | Sports | sports, sport |
| `noticias` | Noticias | News | news |
| `entretenimiento` | Entretenimiento | Entertainment | entertainment, talk, talk show, variedades |
| `otros` | Otros | Other | other, others |

### Audio types (rows) { #audio-types }

| Id | Name in Spanish | Name in English | Also understood |
|---|---|---|---|
| `radio` | Radio | Radio | emisoras, radios |
| `podcasts` | Podcasts | Podcasts | podcast |
| `audiolibros` | Audiolibros | Audiobooks | audiolibro, audiobooks, audiobook |
| `conciertos` | Conciertos | Concerts | concierto, concerts, concert, live music |
| `musica` | Música | Music | music |

### Video genres (rows) { #video-genres }

| Id | Name in Spanish | Name in English | Also understood |
|---|---|---|---|
| `accion` | Acción | Action | action, action adventure |
| `aventura` | Aventura | Adventure | adventure, aventuras |
| `animacion` | Animación | Animation | animation, animado, animados, dibujos animados |
| `ciencia-ficcion` | Ciencia ficción | Sci-Fi | sci-fi, sci fi, science fiction, sci fi fantasy, scifi |
| `comedia` | Comedia | Comedy | comedy, comedias |
| `crimen` | Crimen | Crime | crime, policial, policiaco |
| `drama` | Drama | Drama | dramas, telenovela, novela, soap |
| `familia` | Familia | Family | family, familiar |
| `fantasia` | Fantasía | Fantasy | fantasy |
| `historia` | Historia | History | history, historico |
| `misterio` | Misterio | Mystery | mystery |
| `musical` | Musical | Musical | musicales |
| `romance` | Romance | Romance | romantico, romantic |
| `suspenso` | Suspenso | Thriller | suspense, thriller, intriga |
| `terror` | Terror | Horror | horror |
| `belica` | Bélica | War | guerra, war, war politics |
| `western` | Western | Western | oeste |
| `reality` | Reality | Reality | reality tv, realidad |
| `biografia` | Biografía | Biography | biography, biografico |
| `deportivo` | Deportivo | Sports | deportivas |

### Anime genres (rows) { #anime-genres }

| Id | Name in Spanish | Name in English | Also understood |
|---|---|---|---|
| `shonen` | Shonen | Shonen | shounen |
| `isekai` | Isekai | Isekai | — |
| `mecha` | Mecha | Mecha | — |
| `escolar` | Escolar | School | school, colegial |
| `slice-of-life` | Recuentos de la vida | Slice of life | — |

### Audio genres (rows) { #audio-genres }

| Id | Name in Spanish | Name in English | Also understood |
|---|---|---|---|
| `pop` | Pop | Pop | — |
| `rock` | Rock | Rock | — |
| `urbano` | Urbano | Urban | reggaeton, hip hop, hiphop, rap, trap |
| `tropical` | Tropical | Tropical | salsa, vallenato, cumbia, merengue, bachata |
| `electronica` | Electrónica | Electronic | electronic, edm, dance |
| `clasica` | Clásica | Classical | classical |
| `jazz` | Jazz | Jazz | blues |
| `regional` | Regional | Regional | folk, folclor, ranchera, mariachi |
| `religiosa` | Religiosa | Religious | gospel, cristiana |

## Row order { #order }

The order is fixed and set by Kino, not by your plugin. A category with no titles is not shown, and the order cannot
be customized yet. From top to bottom:

1. The video rows of this list (genres and thematic types interleaved):

1. `accion`
2. `comedia`
3. `drama`
4. `terror`
5. `suspenso`
6. `ciencia-ficcion`
7. `animacion`
8. `anime`
9. `aventura`
10. `romance`
11. `doramas`
12. `crimen`
13. `fantasia`
14. `infantil`
15. `familia`
16. `misterio`
17. `documentales`
18. `belica`
19. `historia`
20. `biografia`
21. `musical`
22. `western`
23. `reality`
24. `deportivo`
25. `deportes`
26. `noticias`
27. `clasicos`
28. `shonen`
29. `isekai`
30. `mecha`
31. `escolar`
32. `slice-of-life`

2. Unknown categories (those not in the tables), in the order they arrived.
3. The generic type rows, holding only the titles with no genre: `peliculas`, `series`, `entretenimiento`, `otros`.
4. Audio, at the end and with square covers: first the audio type rows (`radio`, `podcasts`, `audiolibros`,
   `conciertos`, `musica`), then the audio genre rows (`pop`, `rock`, `urbano`, `tropical`, `electronica`,
   `clasica`, `jazz`, `regional`, `religiosa`).

## Declaring it in your plugin { #declare }

`genre` goes on the **row** `home()` returns; `genres` goes on each **item** (up to 5 free-text names, each at most 30
characters; see [the contract](contract.md)). For a title to merge well with other sources' copies, also send `ids`
(with the TMDB id if you have it) and `year`.

```js
export async function home() {
  const movies = await getMovies();   // your code
  return [
    {
      id: "peliculas",
      title: "Películas recientes",
      genre: "peliculas",              // the type
      items: movies.map((m) => ({
        id: String(m.id),
        ref: String(m.id),
        kind: "movie",
        title: m.title,
        year: m.year ? String(m.year) : undefined,  // helps merge the same title across sources
        ids: { tmdb: m.tmdbId },
        poster: m.poster,
        genres: m.genres,              // e.g. ["Drama", "Suspenso"]: its genre rows
      })),
    },
  ];
}
```

`genres` only places titles into genre rows: a type id there (`genres: ["Anime"]`) is ignored; the type goes on the row's `genre` (or comes from the `kind`). Both `genre` and `genres` accept the table ids **or** names and aliases (`"Action"`, `"Acción"`, `"Thriller"`,
`"Sci-Fi & Fantasy"`): Kino maps them to the id. Your genres can come straight from the source.

## What happens to an unknown category { #unknown }

A row's `genre` is no longer limited to the old ten ids. Kino **canonicalises** it:

1. If it is a known id or alias (Spanish or English), it goes to the table's id.
2. Otherwise it is kept as a **slug**: lowercase ASCII `[a-z0-9-]`, at most 40 characters.

A category that is not in the tables is a **genre row** (not a new type): every item of that row goes into it, the type comes from each item's `kind`, and the row is **appended after the known ones** (before the generic type rows and the audio), in the order it arrived, shown with your plugin's own text. It helps when nothing really fits. Rows are grouped by slug, not by plugin: it merges with another plugin's row only when the spelling matches, so use it sparingly.

**Live categories** and **playlists** keep the closed ten-id vocabulary; see [Live channels](live-channels.md).

## Tips so titles merge { #dedupe }

- Send `ids` (especially the TMDB one, `ids: { tmdb: 603 }`) and `year` on every item. A copy with TMDB and one without never merge, so always send `ids.tmdb`; without TMDB, title plus year merges best.
- Keep the title identical across rows and sources; do not append "(HD)", the year or the language.
- Declare `genres` on every item: without them a title of a generic type appears only in its type row ("Películas", "Series"...), not in the genre rows.
- Mark 18+ content `adult: true`: it stays hidden while the code is locked.
