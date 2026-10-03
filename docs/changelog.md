# Novedades para quienes escriben plugins { #changelog }

Lo que cambió en Kino y que importa cuando escribes un plugin, por versión de la app. Cada número
está en [el contrato](contract.md) y en [los archivos de referencia](reference/index.md).

## Próxima versión de Kino (después de la 0.9.49, aún sin publicar) { #next }

- **Instalar desde la URL del manifiesto.** La gente puede pegar la URL `https` de un
  `kino-plugin.json` en cualquier servidor público, no solo un `owner/repo` de GitHub. Una instalación
  `url:` así lee `entry` e `icon` al lado del manifiesto, no puede usar `secrets` sellados, siempre
  cuenta como no firmada y nunca sale en "De la comunidad" (el descubrimiento sigue usando el topic de
  GitHub). Una URL de `kino-plugin.json` en GitHub, raw.githubusercontent.com o jsDelivr
  (`cdn.jsdelivr.net/gh/owner/repo@<ref exacta>/…`; `@latest` es la rama por defecto, un rango de
  versiones se rechaza) se vuelve `owner/repo` como antes.
  [Instalar desde la URL del manifiesto](index.md#manifest-url), [Publicar](publish.md#manifest-url).
- **`liveSearch`, un export opcional nuevo para canales en vivo** (sin `apiVersion` nuevo: sigue
  siendo 3 con `channels`). Kino lo pide desde la búsqueda de En vivo mientras algunos de tus canales
  nunca se han listado; devuelve canales como una página de `liveChannels`, máximo 100 conservados,
  desde 2 caracteres escritos, 15 s. [Canales en vivo](live-channels.md#live-search).
- **Los catálogos en vivo grandes siguen paginando.** `liveChannels` recibe 10 páginas al comienzo, y
  5 más cada vez que la persona se acerca al final, hasta 10.000 canales (200 páginas) por categoría.
  Las versiones anteriores se quedan en 10 páginas. Pruébalo con `node sdk/run.mjs . live search <consulta>`.
- **Listas M3U** en UTF-8, Latin-1 o UTF-16; los atributos de `#EXTINF` pueden ir con comillas simples
  o sin comillas; una lista de más de 20 MB o una guía de más de 50 MB se corta en su última línea
  completa en vez de rechazarse. [Canales en vivo](live-channels.md#live-contract).
- **Addons de Stremio**: la gente los puede instalar desde el mismo campo (Kino genera el plugin; no
  tienes nada que escribir). Su `resolve`, como el de un scraper de Nuvio convertido, tiene 75 s.
- `ditu` ya no es un `id` de plugin reservado (las versiones anteriores lo siguen rechazando, así que
  evítalo).

## Kino 0.9.46 a 0.9.49 { #v0946 }

- **Se acepta un `./` al principio de `entry` e `icon`.** Kino lo quita e instala el plugin.
  **Kino 0.9.45 y anteriores lo siguen rechazando** (`El campo "entry" debe ser una ruta relativa a
  un archivo .js`), así que sigue escribiendo `"plugin.js"` e `"icon.png"`. El `validate.mjs` del
  kit rechaza `"./plugin.js"` por eso. [Detalles](manifest.md#entry-dot-slash).
- **Tus logs ayudan cuando falla un plugin recomendado.** En un plugin del catálogo recomendado de
  Kino, las últimas 30 líneas de `kino.log` de una llamada fallida (depuradas, 2 KB) van con el reporte
  del error como `plugin_log`. Registra pasos y estados, nunca lo que la persona escribió ni un
  secreto. [`kino.log`](kino-api.md#log).
- Un canal en vivo nunca muestra el botón de descarga, aunque el plugin declare `download`.

!!! note "Sobre la versión de cada punto"
    Estos puntos están en las versiones publicadas como 0.9.46 a 0.9.49; no se comprobó la versión
    exacta en la que apareció cada uno.

## Kino 0.9.45 { #v0945 }

**Contrato (`contract.json`, `maxApiVersion` 5):**

- **Plugins firmados, `apiVersion` 5.** Firma opcional del autor en `kino-plugin.json`
  (`node sdk/seal.mjs --keygen`, `--sign`; `validate.mjs` la comprueba), clave fijada en la primera
  instalación, "Firmado por su autor" en la hoja de consentimiento, insignia "Firmado", la clave del
  autor en los detalles. Necesita Kino 0.9.45+; las apps más viejas rechazan un manifiesto con
  `apiVersion` 5. Borradores anteriores de estos documentos decían 0.9.46: salió en **0.9.45**.
  [Plugins firmados](signed.md).
- **Sin máximo de `hosts`.** El límite de 20 desapareció (solo lo acota el manifiesto de 16 KB). Kino
  0.9.44 y anteriores siguen rechazando más de 20, y el kit avisa. [Manifiesto](manifest.md).
- **`kino.apiVersion`** reporta 5.

**Comportamiento que puedes notar (sin cambio de manifiesto):**

- **Enviar a la TV (Chromecast y DLNA) funciona para títulos de plugins.** Directo para mp4/webm y HLS
  sin `headers`; por el celular cuando pones `headers`; nunca para DRM, DASH, MPEG-TS progresivo o un
  formato que nada identifica. [Enviar a la TV](what-people-see.md#cast).
- **Los plugins acompañan a la persona entre sus aparatos** (celular y TV): instalaciones, encendidos,
  aprobaciones, ajustes y contraseñas (cifradas) se sincronizan, y el otro aparato instala tu plugin
  desde la misma dirección. [Plugins en otros aparatos](what-people-see.md#sync).
- **Direcciones de instalación**: también sirve una URL `raw.githubusercontent.com/.../kino-plugin.json`
  (o `manifest.json`, para Nuvio) o una `github.com/.../blob/...`; una ref que solo viene de una URL
  pegada no es un pin. [Inicio](index.md), [Scrapers de Nuvio](nuvio.md).
- **Descargas HLS**: `EXT-X-DISCONTINUITY` se deja tal cual salvo que el formato cambie en él; una
  llave mala o un segmento vacío terminan como "Este video no se puede descargar"; un reintento solo
  retoma con el mismo contenido. Las descargas siguen siendo declarativas: `"download"` en
  `capabilities`, nada que exportar. [Descargas](manifest.md#downloads).
- **Headers de canales M3U**: se leen `#EXTHTTP`, `url|User-Agent=...` y los headers de `#KODIPROP`;
  solo se conservan `User-Agent`, `Referer`, `Origin` y `Cookie`. [Canales en vivo](live-channels.md).
- **`kino.fetch`**: los saltos de redirección rechazados cuentan para las 60 peticiones, máximo 6
  fetch en vuelo, máximo 3 preguntas de host por llamada, se rechazan las formas IPv6 de direcciones
  privadas, sin proxy del dispositivo. Un plugin convertido desde un scraper de Nuvio tiene 250
  peticiones y 75 s de `resolve`. [Límites](engine-limits.md).

!!! note "Sobre la versión de cada punto"
    El archivo del contrato fija la versión solo para los plugins firmados y el límite de hosts
    (0.9.45). Los demás puntos están en la compilación que se publicó como 0.9.45; no se verificó en
    qué versión exacta apareció cada uno.

## Ya estaba antes de 0.9.45 { #earlier }

`streamHosts: "any"` (apiVersion 4), `liveStreamHosts: "any"` (apiVersion 3 más la capacidad
`channels`), `fetchHosts: "any"` (lo escribe Kino solo en scrapers de Nuvio convertidos, nunca para tu
plugin), y la pregunta que Kino le hace a la persona la primera vez que un stream usa un host que no
declaraste. Están documentados en [el manifiesto](manifest.md#stream-hosts),
[canales en vivo](live-channels.md) y [el contrato](contract.md#forgotten-host).
