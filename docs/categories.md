# Categorías del Inicio { #home-categories }

Kino puede mostrar un **Inicio por categorías**, al estilo de las apps de streaming: arriba, pestañas por tipo
(Películas, Series, Anime…) y adentro, filas por género (Acción, Comedia…), con **una tarjeta por título**. Es
opcional: la persona lo activa en los ajustes. Se arma **solo con lo que tus filas de Inicio ya dejaron guardado**
(no busca nada por su cuenta ni llama a tu plugin), así que lo que declares en `home()` decide dónde cae tu contenido.
Esta página explica cómo declararlo. Los ítems y las filas están en [el contrato](contract.md).

!!! note "Desde la próxima versión de Kino"
    Hasta ahora el `genre` de una fila de Inicio solo aceptaba diez ids cerrados. Desde la próxima versión acepta
    **cualquier categoría** (abajo). Las versiones anteriores siguen ignorando un valor que no estaba en la lista de diez.

## Qué hace el Inicio con tus categorías { #how }

- **Pestañas = tipos.** El `genre` de cada fila (`peliculas`, `series`, `anime`…) decide en qué pestaña cae.
- **Filas = géneros.** Dentro de una pestaña, Kino agrupa los títulos por los `genres` de cada ítem (`["Drama", "Suspenso"]`
  pone el título en las filas Drama y Suspenso).
- **Un título, una tarjeta.** Si varias fuentes tienen el mismo título, se muestra una sola tarjeta. La identidad es,
  en este orden: el **id de TMDB** (película y serie van aparte), si no el **título normalizado más el año**, y si no solo
  el título. Al tocar la tarjeta, Kino busca el título en todas las fuentes que lo tengan.
- **Sin género:** un título sin ningún género va a la fila **«Más títulos»**.
- **Nada vacío:** una fila o una pestaña sin títulos no se muestra.
- **+18:** el contenido `adult: true` queda oculto mientras el código +18 de la persona esté bloqueado.
- **Audio aparte:** la música y los podcasts tienen sus propias pestañas (`radio`, `podcasts`, `audiolibros`,
  `conciertos`, `musica`).
- **En vivo no entra:** los canales en vivo siguen en «En vivo», no en este Inicio.
- Un enlace **«Fuentes»** abre las fuentes (tus plugins).

## Agrupa tu contenido en estas categorías { #prefer }

!!! tip "Regla"
    Agrupa tu contenido, de preferencia, en las categorías de las tablas de abajo: pon `genre` en cada fila de
    `home()` y `genres` en cada ítem con ids de esa lista, y **inventa una categoría nueva solo cuando ninguna encaje**.

Así tu contenido cae en el sitio correcto y se junta con el de otros plugins, en vez de quedar en una fila suelta.

## Vocabulario { #vocabulary }

El **id** es lo que escribes. Kino muestra el nombre en español (o en inglés si la persona usa Kino en inglés). La
columna «También entiende» son alias que Kino convierte al id; da igual mayúsculas, tildes y signos, y también
funcionan los nombres que se ven en pantalla.

### Tipos de video (pestañas) { #video-types }

| Id | Nombre en Kino | Nombre en inglés | También entiende |
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

### Tipos de audio (pestañas) { #audio-types }

| Id | Nombre en Kino | Nombre en inglés | También entiende |
|---|---|---|---|
| `radio` | Radio | Radio | emisoras, radios |
| `podcasts` | Podcasts | Podcasts | podcast |
| `audiolibros` | Audiolibros | Audiobooks | audiolibro, audiobooks, audiobook |
| `conciertos` | Conciertos | Concerts | concierto, concerts, concert, live music |
| `musica` | Música | Music | music |

### Géneros de video (filas) { #video-genres }

| Id | Nombre en Kino | Nombre en inglés | También entiende |
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

| Id | Nombre en Kino | Nombre en inglés | También entiende |
|---|---|---|---|
| `shonen` | Shonen | Shonen | shounen |
| `isekai` | Isekai | Isekai | — |
| `mecha` | Mecha | Mecha | — |
| `escolar` | Escolar | School | school, colegial |
| `slice-of-life` | Recuentos de la vida | Slice of life | — |

### Géneros de audio (filas) { #audio-genres }

| Id | Nombre en Kino | Nombre en inglés | También entiende |
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
      genre: "peliculas",              // la pestaña
      items: movies.map((m) => ({
        id: String(m.id),
        ref: String(m.id),
        kind: "movie",
        title: m.title,
        year: String(m.year),          // ayuda a juntar el mismo título de varias fuentes
        ids: { tmdb: m.tmdbId },
        poster: m.poster,
        genres: m.genres,              // p. ej. ["Drama", "Suspenso"]: las filas de dentro
      })),
    },
  ];
}
```

Tanto `genre` como `genres` aceptan los ids de las tablas **o** los nombres y alias (`"Action"`, `"Acción"`,
`"Thriller"`, `"Sci-Fi & Fantasy"`): Kino los convierte al id. Tus géneros pueden venir tal cual de la fuente.

## Qué pasa con una categoría desconocida { #unknown }

El `genre` de una fila ya no se limita a los diez ids de antes. Kino lo **canoniza**:

1. Si es un id o un alias conocido (en español o en inglés), lo lleva al id de la tabla.
2. Si no, lo guarda como un **slug**: minúsculas ASCII `[a-z0-9-]`, de hasta 40 caracteres.

Una categoría que no está en las tablas **se agrega al final**, después de las conocidas, y se muestra con el texto
de tu plugin. Sirve cuando de verdad nada encaja, pero no se junta con las de otros plugins: úsala poco.

Las **categorías en vivo** y las **listas** (`playlist`) siguen con el vocabulario cerrado de diez ids; ver
[Canales en vivo](live-channels.md).

## Consejos para que los títulos se junten { #dedupe }

- Manda `ids` (en especial el de TMDB, `ids: { tmdb: 603 }`) y `year` en cada ítem. Sin TMDB, el título más el año es lo que mejor junta.
- Deja igual el título entre filas y fuentes; no le añadas «(HD)», el año ni el idioma.
- Declara `genres` en cada ítem: sin ellos el título cae en «Más títulos».
- Marca `adult: true` en lo +18: queda oculto mientras el código esté bloqueado.
