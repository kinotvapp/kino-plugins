# Novedades para quienes escriben plugins { #changelog }

Lo que cambió en Kino y que importa cuando escribes un plugin, por versión de la app. Cada número
está en [el contrato](contract.md) y en [los archivos de referencia](reference/index.md).

## Kino 0.9.46 (aún sin publicar) { #v0946 }

- **Se aceptará un `./` al principio de `entry` e `icon`.** Kino lo quita e instala el plugin.
  **Kino 0.9.45 y anteriores lo siguen rechazando** (`El campo "entry" debe ser una ruta relativa a
  un archivo .js`), así que sigue escribiendo `"plugin.js"` e `"icon.png"`. El `validate.mjs` del
  kit rechaza `"./plugin.js"` por eso. [Detalles](manifest.md#entry-dot-slash).
- Por ahora nada más cambia en el contrato de plugins en 0.9.46 (el resto del trabajo de esa versión,
  como la búsqueda de subtítulos en línea, no toca los plugins).

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
