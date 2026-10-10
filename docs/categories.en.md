# Home categories { #home-categories }

Kino can show a **Home by categories**, in the style of streaming apps: type tabs on top (Movies, Series, Anime...) and
genre rows inside (Action, Comedy...), with **one card per title**. It is optional: the person turns it on in settings.
It is built **only from what your Home rows already left cached** (it does not search on its own or call your plugin), so
what you declare in `home()` decides where your content lands. This page explains how to declare it. Items and rows are
in [the contract](contract.en.md).

!!! note "From the next Kino release"
    Until now a Home row's `genre` accepted only ten closed ids. From the next release it accepts **any category**
    (below). Earlier versions keep ignoring a value that was not in the list of ten.

## What the Home does with your categories { #how }

- **Tabs = types.** Each row's `genre` (`peliculas`, `series`, `anime`...) decides which tab it lands in.
- **Rows = genres.** Inside a tab, Kino groups titles by each item's `genres` (`["Drama", "Suspenso"]` puts the title in
  the Drama and Suspenso rows).
- **One title, one card.** When several sources have the same title, one card is shown. Identity is, in this order: the
  **TMDB id** (movie and series kept apart), else the **normalised title plus year**, else just the title. Tapping the
  card makes Kino search that title across every source that has it.
- **No genre:** a title with no genre goes to the **"Más títulos"** row.
- **Nothing empty:** a row or tab with no titles is never shown.
- **18+:** `adult: true` content stays hidden while the person's 18+ code is locked.
- **Audio apart:** music and podcasts get their own tabs (`radio`, `podcasts`, `audiolibros`, `conciertos`, `musica`).
- **Live is not in it:** live channels stay in "En vivo", not in this Home.
- A **"Fuentes"** link opens the sources (your plugins).

## Group your content in these categories { #prefer }

!!! tip "Rule"
    Preferably group your content in the categories in the tables below: set `genre` on each `home()` row and `genres` on
    each item using ids from that list, and **invent a new category only when nothing fits**.

That way your content lands in the right place and sits together with other plugins' instead of in a lone row.

## Vocabulary { #vocabulary }

The **id** is what you write. Kino shows the Spanish name (or the English one if the person uses Kino in English). The
"Also understood" column holds aliases Kino maps to the id; case, accents and punctuation do not matter, and the names
shown on screen work too.

### Video types (tabs) { #video-types }

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

### Audio types (tabs) { #audio-types }

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

## Declaring it in your plugin { #declare }

`genre` goes on the **row** `home()` returns; `genres` goes on each **item** (up to 5 free-text names, each at most 30
characters; see [the contract](contract.en.md)). For a title to merge well with other sources' copies, also send `ids`
(with the TMDB id if you have it) and `year`.

```js
export async function home() {
  const movies = await getMovies();   // your code
  return [
    {
      id: "peliculas",
      title: "Películas recientes",
      genre: "peliculas",              // the tab
      items: movies.map((m) => ({
        id: String(m.id),
        ref: String(m.id),
        kind: "movie",
        title: m.title,
        year: String(m.year),          // helps merge the same title across sources
        ids: { tmdb: m.tmdbId },
        poster: m.poster,
        genres: m.genres,              // e.g. ["Drama", "Suspenso"]: the rows inside
      })),
    },
  ];
}
```

Both `genre` and `genres` accept the table ids **or** names and aliases (`"Action"`, `"Acción"`, `"Thriller"`,
`"Sci-Fi & Fantasy"`): Kino maps them to the id. Your genres can come straight from the source.

## What happens to an unknown category { #unknown }

A row's `genre` is no longer limited to the old ten ids. Kino **canonicalises** it:

1. If it is a known id or alias (Spanish or English), it goes to the table's id.
2. Otherwise it is kept as a **slug**: lowercase ASCII `[a-z0-9-]`, at most 40 characters.

A category that is not in the tables is **appended at the end**, after the known ones, and shown with your plugin's own
text. It helps when nothing really fits, but it does not merge with other plugins' categories: use it sparingly.

**Live categories** and **playlists** keep the closed ten-id vocabulary; see [Live channels](live-channels.en.md).

## Tips so titles merge { #dedupe }

- Send `ids` (especially the TMDB one, `ids: { tmdb: 603 }`) and `year` on every item. Without TMDB, title plus year merges best.
- Keep the title identical across rows and sources; do not append "(HD)", the year or the language.
- Declare `genres` on every item: without them the title lands in "Más títulos".
- Mark 18+ content `adult: true`: it stays hidden while the code is locked.
