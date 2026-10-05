# Plugins de ejemplo

Dos plugins publicados, los dos públicos, los dos instalables en Kino y los dos usables como
plantilla. Arranca por **Internet Archive** si quieres la plantilla más simple posible; arranca por
**Tu servidor**, el demo completo de la API, cuando tu fuente sea un servidor de la persona o cuando
quieras ver funcionando de punta a punta cada función hasta apiVersion 7.

<div class="grid cards" markdown>

-   ![](assets/own-server-icon.png){ .card-icon } **Tu servidor** · `kinotvapp/kino-plugin-own-server`

    ---

    **El demo completo de la API.** Un servidor multimedia en la casa (Jellyfin, Emby, un NAS…): la
    persona escribe su dirección, su usuario y su contraseña. Versión 1.5.0, apiVersion 7:
    `"hosts": []`, todos los tipos de ajuste y el formulario completo, sesión con `kino.storage`,
    `kino.rank`, temporadas, `download`, copias, firma por petición, `channels` en todas sus formas, una
    sección y mosaicos de Categorías, `migrate`, `meta`, `subtitles`, `tracking` y `segments`, más un
    servidor de referencia (`server.mjs`) para probarlo sin nada propio.

    [:octicons-repo-template-16: Usar como plantilla](https://github.com/kinotvapp/kino-plugin-own-server/generate){ .md-button .md-button--primary }
    [:octicons-mark-github-16: Ver en GitHub](https://github.com/kinotvapp/kino-plugin-own-server){ .md-button }

-   ![](assets/archive-icon.png){ .card-icon } **Internet Archive** · `kinotvapp/kino-plugin-archive`

    ---

    Películas de dominio público y televisión clásica de archive.org. **La plantilla más simple de la
    que partir**: un manifiesto, un archivo JavaScript, sin paso de compilación, las cinco
    capacidades más `download`, y un ajuste `list` para las direcciones de archive.org de la persona
    (apiVersion 4), con el kit `sdk/`, `GUIDE.md`, `contract.json` y `kino.d.ts`.

    [:octicons-repo-template-16: Usar como plantilla](https://github.com/kinotvapp/kino-plugin-archive/generate){ .md-button .md-button--primary }
    [:octicons-mark-github-16: Ver en GitHub](https://github.com/kinotvapp/kino-plugin-archive){ .md-button }

</div>

Para probar cualquiera de los dos en Kino, abre Ajustes > Plugins y escribe
`kinotvapp/kino-plugin-archive` o `kinotvapp/kino-plugin-own-server`.

**Usa la plantilla, no hagas fork.** "Usar como plantilla" crea un repositorio nuevo tuyo con los
mismos archivos. Un fork también funcionaría como plugin, pero la búsqueda de la comunidad de Kino deja
los forks por fuera ([Hazte encontrar](publish.md#get-found)). Luego cambia `id`, `name`, `homepage`,
`hosts` y `capabilities` en `kino-plugin.json`, reescribe `plugin.js` y conserva `sdk/`.

!!! note "Un ejemplo real: un plugin que usa el navegador oculto"
    [**Maratón**](https://github.com/xuper-plugin/maraton) (firmado, `apiVersion` 6, `"browser": "pages"`) es un plugin real, de otra persona, que
    encuentra su video con [`kino.browser.capture`](browser.md) y ofrece los otros servidores e idiomas
    de cada capítulo como [copias perezosas con etiqueta](contract.md#lazy-copies). Es un ejemplo solo
    de esas dos funciones (Kino solo lista los plugins de la comunidad: cada autor responde por el suyo); "Tu servidor" sigue siendo el plugin de referencia completo.

## El plugin de referencia { #reference-plugin }

Para lo básico -- `search`, `home`, `browse`, `episodes` y `resolve` sobre un sitio público, sin
ajustes ni sesión -- la referencia es `kino-plugin.json` y `plugin.js` de
[kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive), el plugin de
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

Para todo lo demás, hasta apiVersion 7 (Kino 0.9.51) -- ajustes, sesión, descargas, ítems `live`,
`channels`, lo de apiVersion 6, `tracking` y `segments` -- la referencia es
[kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) ("Tu servidor"
1.5.0): su
[`kino-plugin.json`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/kino-plugin.json)
y su [`plugin.js`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/plugin.js) usan casi
todo lo que existe, y su
[`README.md`](https://github.com/kinotvapp/kino-plugin-own-server/blob/main/README.md) relaciona cada
función con el título de su servidor de prueba que la ejercita:

| Lo que muestra | Dónde en el código | Guía |
| --- | --- | --- |
| `"hosts": []`, el servidor que escribe la persona y sus otras direcciones (una `list` de campos `url`) | `kino-plugin.json`; `base()`, `addresses()`, `reach()` | [Los servidores propios de la persona](manifest.md#own-servers) |
| Todos los tipos de ajuste: `url`, `text`, `password`, `toggle`, `select`, `list`, `section` (con explicación de 300 caracteres), `status`, `action` | `kino-plugin.json`: `settings` | [Formulario de ajustes](settings-form.md#types) |
| Líneas de estado, botones (`confirm`, `clearSettings`) y una revisión antes de guardar | `settingsStatus()`, `action()`, `validateSettings()` | [Formulario de ajustes](settings-form.md) |
| Login y un token guardado en `kino.storage`, reintentado una vez ante un 401; `kino.sleep` con un `Retry-After` corto | `token()`, `api()` | [`kino.storage`](kino-api.md#storage) |
| Errores tipados (`kino.error`) y una frase propia (`userMessage`) | `api()`, `resolveCopy()` | [Errores que la gente entiende](contract.md#errors) |
| Una caché con el `ttlMs` que escoge la persona, y la última copia si el servidor se cae; `telemetry` + `kino.log.report` | `home()`, `reach()` | [`kino.storage`](kino-api.md#storage), [Telemetría](diagnostics.md#telemetry) |
| Búsqueda por título sobre un backend que compara cualquier palabra; una `Page` con `next`; `scopedSearch` | `search()`, `kino.rank.*` | [`kino.rank`](kino-api.md#rank), [Buscar dentro de un "Ver más"](contract.md#scoped-search) |
| Paginación con cursor, filas con `genre` | `browse()`, `refFilter()`, `ROWS` | [Paginación](contract.md#paging) |
| Temporadas como títulos separados | `episodes()` | [Temporadas](contract.md#seasons) |
| `ids.tmdb` + `ids.imdb`, campos del ítem, entradas `adult: true` | `item()`, `categories()` | [`ids.tmdb`](contract.md#tmdb), [Contenido +18](contract.md#adult) |
| Una sección con pestañas y destacado, mosaicos de Categorías, `theme` | `section()`, `categories()`; `kino-plugin.json` | [Sección, categorías y colores](section-theme.md) |
| Descargas (`download`) | `kino-plugin.json`; `resolve()` devuelve un mp4 progresivo | [Descargas](manifest.md#downloads) |
| `audioTracks`, `subtitles`, `durationMs` y `skip` en el Stream | `resolve()` | [Las reglas del `Stream`](contract.md#stream) |
| Copias con etiqueta y perezosas, el mismo archivo en las otras direcciones | `withCopies()`, `resolveCopy()`, `withAddresses()` | [Copias con etiqueta y perezosas](contract.md#lazy-copies) |
| Firma de cada petición (`signing`, `signContext`, `sign`, `alternateHosts`, `resolve(ref, { retry })`) | `signedStream()`, `sign()`, `resolve()` | [Firma por petición](signed-streams.md) |
| Ítems `live` (apiVersion 2) | `item()`, `resolve()` | [Canales en vivo (apiVersion 2)](live-channels.md#live-items) |
| `channels`: un `ref`, un `stream` en línea, una lista M3U con guía XMLTV, una lista con `resolve: true`, `liveSearch`, paginación | `liveCategories()`, `channel()`, `liveChannels()`, `liveSearch()`, `resolveListEntry()` | [Canales en la pestaña En vivo](live-channels.md#en-vivo-tab), [Tres recetas](live-channels.md#recipes) |
| Un User-Agent que los canales exigen: `headers` en un Stream, `streamHeaders` en una lista | `agentHeaders()` | [Canales en la pestaña En vivo](live-channels.md#en-vivo-tab) |
| Una guía para canales propios | `guide()` | [Las funciones de canales](live-channels.md#live-contract) |
| Pasar lo guardado con los ids viejos del servidor | `migrate()`, `movedTable()` | [Pasar lo guardado](migrate.md) |
| `meta` con `logo`, `ratings` y `cast` (Kino 0.9.51) | `meta()` | [Describir otros títulos](contract.md#meta) |
| `subtitles` con la pista `file` (Kino 0.9.51) | `subtitles()` | [Subtítulos para cualquier título](contract.md#subtitles) |
| `tracking` (apiVersion 7): idempotencia con `event.id`, `{ skipped: true }` | `track()` | [Contarle a un servicio de seguimiento](contract.md#tracking) |
| `segments` (apiVersion 7) | `segments()` | [Dónde están la intro y los créditos](contract.md#segments) |

Su núcleo, línea por línea, está en el recetario:
[El servidor propio de la persona](cookbook.md#own-server).

## Instálalo y compruébalo { #own-server-demo }

[kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server) trae un
servidor de referencia sin dependencias
(`node server.mjs [--port 8096] [--user ana] [--password s3cr3t] [--live-agent VLC]`) cuyo catálogo ejercita una función
por título, así que puedes instalar el plugin en Kino y ver cada fila de la tabla de arriba
funcionando, sin necesitar un servidor real.

Algunos poderes **no** están a propósito, porque un servidor en la casa nunca los necesita: DRM
Widevine ([receta](cookbook.md#widevine)), un host declarado por `http` plano
([receta](cookbook.md#insecure-site)), streams en cualquier servidor
([receta](live-channels.md#recipe-m3u)), secretos sellados ([`kino.secret`](kino-api.md#secret)), la
firma del autor ([Plugins firmados](signed.md)), el navegador oculto y `kino.html.select`
([Navegador oculto](browser.md)) y los pares de llaves ([Pares de llaves](kino-api.md#key-pairs)).
