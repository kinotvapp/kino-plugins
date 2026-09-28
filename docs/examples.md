# Plugins de ejemplo

Dos plugins publicados, los dos públicos y los dos instalables en Kino. Arranca por el primero; lee el
segundo cuando tu fuente sea un servidor de la persona, o cuando quieras ver funcionando de punta a
punta todas las funciones de apiVersion 3.

<div class="grid cards" markdown>

-   ![](assets/archive-icon.png){ .card-icon } **Internet Archive** · `kinotvapp/kino-plugin-archive`

    ---

    Películas de dominio público y televisión clásica de archive.org. **La plantilla de la que
    partir**: un manifiesto, un archivo JavaScript, sin paso de compilación, apiVersion 1, las cinco
    capacidades, más el kit `sdk/`, `GUIDE.md`, `contract.json` y `kino.d.ts`.

    [:octicons-repo-template-16: Usar como plantilla](https://github.com/kinotvapp/kino-plugin-archive/generate){ .md-button .md-button--primary }
    [:octicons-mark-github-16: Ver en GitHub](https://github.com/kinotvapp/kino-plugin-archive){ .md-button }

-   ![](assets/own-server-icon.png){ .card-icon } **Tu servidor** · `kinotvapp/kino-plugin-own-server`

    ---

    Un servidor multimedia en la casa (Jellyfin, Emby, un NAS…): la persona escribe su dirección, su
    usuario y su contraseña. El demo de todo el SDK: apiVersion 3, `"hosts": []`, temporadas,
    `download`, `audioTracks`, ítems `live`, `channels` en sus tres formas, un TTL de `kino.storage`,
    `kino.rank`, `ids.tmdb`, y un servidor de referencia (`server.mjs`) para probarlo.

    [:octicons-mark-github-16: Ver en GitHub](https://github.com/kinotvapp/kino-plugin-own-server){ .md-button }
    [:octicons-book-16: Su código, explicado](cookbook.md#own-server){ .md-button }

</div>

Para probar cualquiera de los dos en Kino, abre Ajustes > Plugins y escribe
`kinotvapp/kino-plugin-archive` o `kinotvapp/kino-plugin-own-server`.

**Usa la plantilla, no hagas fork.** "Usar como plantilla" crea un repositorio nuevo tuyo con los
mismos archivos. Un fork también funcionaría como plugin, pero la búsqueda de la comunidad de Kino deja
los forks por fuera ([Hazte encontrar](publish.md#get-found)). Luego cambia `id`, `name`, `homepage`,
`hosts` y `capabilities` en `kino-plugin.json`, reescribe `plugin.js` y conserva `sdk/`.

## El plugin de referencia { #reference-plugin }

`kino-plugin.json` y `plugin.js` de
[kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) son el plugin de
Internet Archive, con las cinco capacidades. Se lee más o menos así:

1. Declara `archive.org` **y** `*.archive.org`: una URL de descarga en `archive.org` redirige a un
   nodo de almacenamiento como `dn720705.ca.archive.org`, y el comodín no cubre el dominio pelado.
2. `getJson` hace primero el `await` y lanza errores después (la regla de
   [la trampa del rechazo](engine-limits.md#rejection-trap)).
3. `search` limpia lo que escribió la persona: archive.org responde 200 con un cuerpo de error cuando
   la consulta tiene un `/`, `-`, `&` o `'` suelto o un `AND`/`OR`/`NOT` colgando, así que conserva
   letras, dígitos y apóstrofes dentro de las palabras, quita las palabras de operador, y les pregunta
   a las dos colecciones (películas y TV clásica) diga lo que diga `type`, que usa solo para decidir qué
   grupo va primero; un ítem que está en las dos se lista una vez.
4. `home` arma tres filas (películas, TV clásica, animación clásica) y envuelve cada fila en su propio
   `try`/`catch`, para que una fila que falla no haga perder las otras; lo reporta con `kino.log`. Cada
   fila lleva su propio id como `ref`, y `browse(ref, cursor)` recorre la misma consulta de a 50 con el
   número de página como cursor (`"2"`, `"3"`, …), y lanza `kino.error("not_found")` para una fila que
   no conoce.
5. `episodes` lee la lista de archivos del ítem, conserva los videos originales en orden natural (un
   comparador `natural()` pequeño, porque no se puede confiar en `localeCompare`), los numera a partir
   de un `S01E02` en el nombre del archivo o 1, 2, 3, y usa `"<item>|<file name>"` como `ref` de cada
   capítulo.
6. `resolve` escoge el mejor archivo reproducible (un mp4 derivado del original, o el mp4/webm mismo),
   convierte los archivos `.vtt`/`.srt` hermanos en `subtitles`, y pone `durationMs`.
7. Cada URL que arma es `https` en un host declarado; los pósters usan
   `https://archive.org/services/img/<id>` y no se revisan contra los hosts.

El `README.md` de ese repositorio dice lo que no hace (una colección se muestra como una sola
película, los capítulos numerados 0 se descartan), así que no copies eso como si fuera lo esperado.

## El demo de todo el SDK { #own-server-demo }

[kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) trae un
servidor de referencia sin dependencias (`node server.mjs [--port 8096] [--user ana] [--password s3cr3t]`)
cuyo catálogo ejercita una función por título, para que puedas instalar el plugin en Kino y ver
funcionar cada una. Su README relaciona cada función con el lugar de `plugin.js` y el título que la
muestra; el código mismo está explicado en el recetario, [El servidor propio de la persona](cookbook.md#own-server).

Tres poderes **no** están a propósito, porque un servidor en la casa nunca los necesita: DRM Widevine
([receta](cookbook.md#widevine)), un host declarado por `http` plano
([receta](cookbook.md#insecure-site)) y streams de canales en cualquier servidor
([receta](live-channels.md#recipe-m3u)).
