# Música y podcasts

Desde **`"apiVersion": 8` (Kino 0.9.54)** un plugin puede ofrecer audio junto al video (o en vez de
él): álbumes, listas y pistas, podcasts, audiolibros y programas de radio. Esta página es la versión
corta; cada regla, con sus valores exactos, está en el contrato:
[Música y podcasts](contract.md#music-podcasts).

## Los dos tipos { #kinds }

| `kind` | Qué es | Un "episodio" es |
| --- | --- | --- |
| `"music"` | un álbum, una lista o una sola pista | una pista |
| `"podcast"` | un programa (también de radio) o un audiolibro | un episodio o un capítulo |

Un ítem de audio va en `search`, `browse`, las filas de `home` y tu sección como cualquier otro ítem.
El campo opcional `artist` (solo en `music` y `podcast`, máximo 200 caracteres) es el artista, o quien
conduce o escribe: la página del álbum o del podcast lo muestra debajo del título.

## Cómo se reproduce { #play }

- **Con la capacidad `episodes`**, Kino llama `episodes(ref)` para **cada** ítem `music` y `podcast`:
  las pistas de un álbum, los capítulos de un audiolibro, los episodios de un programa, en tu orden.
  Tiene que responder por cada `ref` de audio, aunque sea una sola pista (una entrada): no hay forma de
  saltárselo ítem por ítem. El `ref` de cada entrada va a `resolve`.
- **Sin `episodes`**, el `ref` del propio ítem va directo a `resolve` y suena como una sola pista.
- El `Stream` es uno normal: audio progresivo (MP3, M4A, AAC, OGG) o un manifiesto HLS/DASH.

## Antes de declarar 8 { #version }

- Un Kino más viejo rechaza un plugin apiVersion 8 ("Este plugin necesita una versión más nueva de
  Kino"): declara 8 solo cuando devuelves ítems de audio o exportas [`details`](contract.md#details).
- Por debajo de apiVersion 8 un ítem `music` o `podcast` se descarta (con una línea en el registro); el
  resto de la respuesta se queda.
- Desde apiVersion 8, `details` es un nombre de export reservado: nunca exportes una función auxiliar
  llamada `details`.

## El plugin de audio de referencia { #reference }

[**Internet Archive Audio**](https://github.com/kinotvapp/kino-plugin-archive-audio)
(`kinotvapp/kino-plugin-archive-audio`, apiVersion 8): música libre, conciertos en vivo, audiolibros
y radio antigua de archive.org. Su `episodes` responde por cada álbum, audiolibro y programa (incluida
una sola cara de un disco de 78 rpm), y `resolve` ofrece cada formato de audio como una copia perezosa
con etiqueta. Parte de él para un plugin de audio; mira también [Plugins de ejemplo](examples.md).

Lo que recibe la persona en Kino 0.9.54 (portadas cuadradas, la página del álbum o del podcast, el
reproductor de audio, "Seguir escuchando", descargas y envío a la TV) está en
[el contrato](contract.md#music-podcasts).
