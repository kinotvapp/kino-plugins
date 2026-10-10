# Home por categorías { #home-categories }

Kino puede mostrar un **Home por categorías**, al estilo de las apps de streaming: una sola lista de filas
por categoría (Acción, Comedia, Anime, Infantil…), con **una tarjeta por título**. Es
opcional y viene apagado: la persona lo activa en Ajustes ▸ App ▸ «Home por categorías (experimento)». Se arma **solo con lo que tus filas de Inicio ya dejaron guardado**
(no busca nada por su cuenta ni llama a tu plugin), así que lo que declares en `home()` decide dónde cae tu contenido.
Esta página explica cómo declararlo. Los ítems y las filas están en [el contrato](contract.md).

!!! note "Desde la próxima versión de Kino"
    Hasta ahora el `genre` de una fila de Inicio solo aceptaba diez ids cerrados. Desde la próxima versión acepta
    **cualquier categoría** (abajo). Las versiones anteriores siguen ignorando un valor que no estaba en la lista de diez.

## Qué hace el Inicio con tus categorías { #how }

- **Filas por categoría, todas en una lista.** El Home ya no tiene pestañas por tipo: es una sola lista de filas, una
  por categoría, con todo mezclado (películas, series, anime…). Cada fila muestra hasta 30 títulos.
- **Filas de género, mezcladas entre tipos.** Kino agrupa los títulos de video por los `genres` de cada ítem
  (`["Drama", "Suspenso"]` pone el título en las filas Drama y Suspenso) y por el `genre` de la fila si es de género
  (`accion`) o una categoría nueva. Una fila «Acción» junta todos los títulos de video con ese género, sean películas,
  series o anime.
- **Filas de tipo temático, completas.** Si el tipo del título es `anime`, `doramas`, `infantil`, `documentales`,
  `clasicos`, `deportes` o `noticias`, el título también está en la fila de ese tipo («Anime», «Infantil»…), que tiene
  **todos** los títulos de ese tipo, con género o sin él (pueden repetirse en sus filas de género). El tipo sale del
  `genre` de la fila si es de tipo (`anime`); si no, del `kind` del ítem (`movie`, `series`, `music`, `podcast`). Sin
  `genre`, Kino mira el título de la fila: uno que diga un género conocido («Terror», «Comedia») da ese género, y esa
  adivinanza se omite cuando la fila ya nombra un género conocido; solo `anime`, `infantil`, `documentales`,
  `deportes`, `noticias` y `musica` se pueden adivinar como tipo. El tipo de un título lo decide la primera fila en que aparece.
- **Tipos genéricos, solo lo que sobra.** `peliculas`, `series`, `entretenimiento` y `otros` tienen fila solo para los
  títulos **sin ningún género** (y sin tipo temático), con el nombre del tipo («Películas», «Series»…). Un título
  con género aparece en sus filas de género y no en esta. La antigua fila única «Más títulos» ya no existe.
- **Un título, una tarjeta.** Si varias fuentes tienen el mismo título, se muestra una sola tarjeta. La identidad es,
  en este orden: el **id de TMDB** (película y serie van aparte), si no el **título normalizado más el año**, y si no solo
  el título. Película y serie van aparte aunque no tengan TMDB. Después, Kino junta las copias del mismo título (y del mismo tipo, película o serie) cuando no hay duda: una copia sin ids se junta con la única que tiene id de TMDB si el año coincide o alguna no tiene año, y una sin año se junta con la única que tiene año. Si hay dos ids de TMDB o dos años distintos para ese título, las copias sin ids quedan aparte: Kino nunca adivina. Al tocar una tarjeta de video, Kino busca el título en todas las fuentes que lo tengan; una tarjeta de audio reproduce directamente el ítem de ese plugin.
- **Nada vacío:** una categoría sin títulos no se muestra.
- **Orden fijo:** las filas salen siempre en el [orden de abajo](#order); Kino no lo cambia según tu plugin y todavía no se puede personalizar.
- **+18:** el contenido `adult: true` queda oculto mientras el código +18 de la persona esté bloqueado.
- **Audio aparte:** la música y los podcasts van en sus propias filas, al final de la lista y con carátulas
  cuadradas: la fila de cada género de audio que tenga el ítem (`pop`, `rock`…) o, si no tiene ninguno, la de su tipo
  de audio (`radio`, `podcasts`, `audiolibros`, `conciertos`, `musica`). El audio y el video nunca comparten fila. Esas filas son
  para ítems de audio que **no** son en vivo (`music`, `podcast`).
- **En vivo no entra:** los canales en vivo (`kind: "live"`), **emisoras de radio incluidas**, siguen en «En vivo» y este
  Inicio no los pinta. Por eso una emisora nunca llega a la fila `radio`.
- Un enlace **«Fuentes»** abre las fuentes (tus plugins).

## Agrupa tu contenido en estas categorías { #prefer }

!!! tip "Regla"
    Agrupa tu contenido, de preferencia, en las categorías de las tablas de abajo: pon `genre` en cada fila de
    `home()` y `genres` en cada ítem con ids de esa lista, y **inventa una categoría nueva solo cuando ninguna encaje**.

Así tu contenido cae en el sitio correcto y se junta con el de otros plugins, en vez de quedar en una fila suelta.

## Vocabulario { #vocabulary }

El **id** es lo que escribes. Kino muestra el nombre en español (o en inglés si la persona usa Kino en inglés). La
columna «También entiende» son alias que Kino convierte al id; da igual mayúsculas, tildes y signos, y también
funcionan los nombres que se ven en pantalla (ojo: «Sports» en inglés es el nombre de `deportes` y de `deportivo`, y se convierte a `deportes`).

### Tipos de video { #video-types }

Son temáticos (fila completa) `anime`, `doramas`, `infantil`, `documentales`, `clasicos`, `deportes` y `noticias`; son genéricos (fila solo con lo que sobra) `peliculas`, `series`, `entretenimiento` y `otros`.

| Id | Nombre en español | Nombre en inglés | También entiende |
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

### Tipos de audio (filas) { #audio-types }

| Id | Nombre en español | Nombre en inglés | También entiende |
|---|---|---|---|
| `radio` | Radio | Radio | emisoras, radios |
| `podcasts` | Podcasts | Podcasts | podcast |
| `audiolibros` | Audiolibros | Audiobooks | audiolibro, audiobooks, audiobook |
| `conciertos` | Conciertos | Concerts | concierto, concerts, concert, live music |
| `musica` | Música | Music | music |

### Géneros de video (filas) { #video-genres }

| Id | Nombre en español | Nombre en inglés | También entiende |
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

### Géneros de anime (filas) { #anime-genres }

| Id | Nombre en español | Nombre en inglés | También entiende |
|---|---|---|---|
| `shonen` | Shonen | Shonen | shounen |
| `isekai` | Isekai | Isekai | — |
| `mecha` | Mecha | Mecha | — |
| `escolar` | Escolar | School | school, colegial |
| `slice-of-life` | Recuentos de la vida | Slice of life | — |

### Géneros de audio (filas) { #audio-genres }

| Id | Nombre en español | Nombre en inglés | También entiende |
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

## Orden de las filas { #order }

El orden es fijo y lo pone Kino, no tu plugin. Una categoría sin títulos no se muestra, y todavía no se puede
personalizar el orden. De arriba abajo:

1. Las filas de video de esta lista (géneros y tipos temáticos mezclados):

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

2. Las categorías desconocidas (las que no están en las tablas), en el orden en que llegaron.
3. Las filas de tipo genérico, solo con los títulos sin género: `peliculas`, `series`, `entretenimiento`, `otros`.
4. El audio, al final y con carátulas cuadradas: primero las filas de tipo de audio (`radio`, `podcasts`,
   `audiolibros`, `conciertos`, `musica`) y luego las de género de audio (`pop`, `rock`, `urbano`, `tropical`,
   `electronica`, `clasica`, `jazz`, `regional`, `religiosa`).

## Declararlo en tu plugin { #declare }

`genre` va en la **fila** que devuelve `home()`; `genres` va en cada **ítem** (hasta 5 textos libres, de hasta 30
caracteres cada uno; ver [el contrato](contract.md)). Para que un título se junte bien con el de otras fuentes, manda
también `ids` (con el id de TMDB si lo tienes) y `year`.

```js
export async function home() {
  const movies = await getMovies();   // tu código
  return [
    {
      id: "peliculas",
      title: "Películas recientes",
      genre: "peliculas",              // el tipo
      items: movies.map((m) => ({
        id: String(m.id),
        ref: String(m.id),
        kind: "movie",
        title: m.title,
        year: m.year ? String(m.year) : undefined,  // ayuda a juntar el mismo título de varias fuentes
        ids: { tmdb: m.tmdbId },
        poster: m.poster,
        genres: m.genres,              // p. ej. ["Drama", "Suspenso"]: sus filas de género
      })),
    },
  ];
}
```

`genres` solo ubica títulos en filas de género: un id de tipo ahí (`genres: ["Anime"]`) se ignora; el tipo va en el `genre` de la fila (o sale del `kind`). Tanto `genre` como `genres` aceptan los ids de las tablas **o** los nombres y alias (`"Action"`, `"Acción"`,
`"Thriller"`, `"Sci-Fi & Fantasy"`): Kino los convierte al id. Tus géneros pueden venir tal cual de la fuente.

## Qué pasa con una categoría desconocida { #unknown }

El `genre` de una fila ya no se limita a los diez ids de antes. Kino lo **canoniza**:

1. Si es un id o un alias conocido (en español o en inglés), lo lleva al id de la tabla.
2. Si no, lo guarda como un **slug**: minúsculas ASCII `[a-z0-9-]`, de hasta 40 caracteres.

Una categoría que no está en las tablas es una **fila de género** (no un tipo nuevo): todos los ítems de esa fila quedan en ella, el tipo sale del `kind` de cada ítem, y la fila **se agrega después de las conocidas** (antes de las filas de tipo genérico y de audio), en el orden en que llegó, con el texto de tu plugin. Sirve cuando de verdad nada encaja. Las filas se agrupan por slug, no por plugin: se juntan con las de otro plugin solo si la escritura coincide; úsala poco.

Las **categorías en vivo** y las **listas** (`playlist`) siguen con el vocabulario cerrado de diez ids; ver
[Canales en vivo](live-channels.md).

## Consejos para que los títulos se junten { #dedupe }

- Manda `ids` (en especial el de TMDB, `ids: { tmdb: 603 }`) y `year` en cada ítem. Una copia con TMDB y otra sin él nunca se juntan, así que manda siempre `ids.tmdb`; sin TMDB, el título más el año es lo que mejor junta.
- Deja igual el título entre filas y fuentes; no le añadas «(HD)», el año ni el idioma.
- Declara `genres` en cada ítem: sin ellos un título de tipo genérico solo aparece en la fila de su tipo («Películas», «Series»…), no en las de género.
- Marca `adult: true` en lo +18: queda oculto mientras el código esté bloqueado.
