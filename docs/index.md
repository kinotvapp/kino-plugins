# Escribir un plugin de Kino

Un plugin de Kino es una fuente de video que cualquiera puede publicar como un repositorio pequeño
de GitHub: un manifiesto JSON y un archivo JavaScript. Una persona escribe `owner/repo` en Kino, ve
con qué sitios va a hablar el plugin, acepta, y desde ese momento el plugin es una fuente más: sus
resultados salen en la búsqueda y en Inicio, y sus títulos se abren, listan capítulos, se reproducen
en el reproductor de Kino, guardan el progreso y aparecen en "Continuar viendo" y en la biblioteca
como cualquier otro título.

Puedes escribir, ejecutar y probar un plugin en tu computador con Node antes de tocar la app. Esta
guía tiene todo lo que necesitas: la estructura de archivos, el manifiesto, el contrato que tu
código debe cumplir, la API que Kino te da, cada límite, las particularidades del motor de
JavaScript y cómo publicar.

La demo completa de la API es [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)
("Tu servidor": cada función funcionando de punta a punta); [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
(Internet Archive) es la plantilla de arranque más simple. Los dos traen la carpeta `sdk/`, el kit de
Node. Otros dos archivos describen el contrato para máquinas (los dos están en la página
[Referencia](reference/index.md)): `contract.json` guarda cada número y cada regla que la app hace
cumplir (las tablas de esta guía salen de él, y las pruebas de la app amarran sus propias constantes
a él), y `kino.d.ts` declara toda la API `kino` para tu editor
(`/// <reference path="./kino.d.ts" />` al comienzo de `plugin.js`).

## El camino de 5 minutos { #five-minutes }

1. **Parte de la plantilla.** Crea tu repositorio desde
   [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) -- la más
   simple -- o desde [kinotvapp/kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server)
   si necesitas ajustes, sesión, descargas o canales en vivo ("Use this template" en cualquiera de
   los dos, o clónalo y copia `sdk/`). No le hagas *fork*: la búsqueda de la comunidad de Kino deja
   los forks por fuera ([Hazte encontrar](publish.md#get-found)). O deja que el kit te escriba un
   esqueleto: `node sdk/init.mjs mi-plugin --host example.com`.
2. **Declara lo que necesitas** en `kino-plugin.json`: un `id`, los `hosts` a los que vas a llamar y
   las `capabilities` que exportas ([Manifiesto](manifest.md)).
3. **Escribe las funciones** en `plugin.js`: `search` o `home` (o las dos), y como mínimo `resolve`
   ([Contrato](contract.md), [API `kino`](kino-api.md)).
4. **Revísalo como lo hace Kino:** `node sdk/validate.mjs .` y luego
   `node sdk/run.mjs . search "algo"` ([Probar en local](test-locally.md)).
5. **Publícalo** como repositorio público con el topic `kino-plugin` (obligatorio: sin él Kino no lo encuentra), e instálalo en Kino desde
   Ajustes > Plugins escribiendo `owner/repo` o pegando la URL de su `kino-plugin.json`
   ([Publicar](publish.md)).
6. **Haz que Kino lo muestre solo** en "De la comunidad": topic, nombre y descripción, y cómo
   comprobarlo, en [Aparecer en Kino](listed.md).

¿Usas un asistente de IA? Dale [el prompt listo](ai.md): lee toda esta guía desde `llms-full.txt` y
sigue `AGENTS.md`.

## Qué es un plugin { #what-a-plugin-is }

Un repositorio público de GitHub, o una carpeta dentro de uno, con:

```
kino-plugin.json   el manifiesto (obligatorio)
plugin.js          el código: un solo módulo ES (obligatorio; su nombre lo fija "entry")
icon.png           opcional, cuadrado, máximo 128 KB
README.md          para humanos
```

Kino ejecuta tu código en un sandbox: sin sistema de archivos, sin temporizadores, sin otros plugins,
sin acceso a los datos de la persona. La única salida es `kino.fetch`, que solo llega a los hosts que
declara tu manifiesto y que la persona aprobó en pantalla, más los servidores que la persona escribió
en los ajustes de tu plugin (mira [Manifiesto](manifest.md)).

Kino carga exactamente un archivo JavaScript, así que no hay nada a lo que un `import` pueda
resolverse. Si usas un paso de compilación o una librería, empaqueta todo en ese único archivo --
mira [Dividir tu código en varios archivos](engine-limits.md#splitting-files) para un ejemplo completo.

**Cómo lo instala la gente.** En Kino, Ajustes > Plugins, escriben la dirección de tu repositorio:

| Escriben | Kino lee |
| --- | --- |
| `owner/repo` | la raíz del repositorio, rama por defecto |
| `owner/repo/sub/dir` | una carpeta dentro del repositorio |
| `owner/repo@v1.2.0` | una rama, tag o commit (el nombre no puede tener `/`); también sirve con una carpeta |
| `https://github.com/owner/repo` o `.../tree/<ref>/<path>` | lo mismo, pegado desde el navegador |
| `https://raw.githubusercontent.com/owner/repo/<ref>/<path>/kino-plugin.json` (o un `github.com/.../blob/<ref>/.../kino-plugin.json`, también `/raw/`) | la carpeta donde está ese `.json`, en esa ref; cualquier otro tipo de archivo se rechaza |
| `https://cdn.jsdelivr.net/gh/owner/repo[@<ref>]/<path>/kino-plugin.json` (también `fastly`, `gcore`, `testingcf` y `quantil.jsdelivr.net`) | la misma carpeta del repositorio, leída desde GitHub: sin `@ref` o con `@latest` es la rama por defecto; la ref tiene que ser una rama, tag o commit exactos (`@main`, `@v1.2.0`), así que un rango de versiones (`@1`, `@^1.2`, `@1.x`) se rechaza |
| `https://<cualquier servidor público>/<path>/kino-plugin.json` | un plugin alojado fuera de GitHub: mira [Instalar desde la URL del manifiesto](#manifest-url) |

El campo de Kino dice "Escribe usuario/repositorio de GitHub o pega la URL del manifest
(kino-plugin.json)". Un `?query` o un `#fragmento` en una URL pegada se ignora. Una ref que solo viene
de una URL pegada (`tree`, `blob`, `raw`, `raw.githubusercontent.com` o el `@ref` de jsDelivr) no es un
pin: un plugin con [secretos sellados](manifest.md#secrets) pegado así se instala desde la rama
principal.

Con una dirección de repositorio, Kino descarga `kino-plugin.json`, tu archivo de entrada y el ícono
desde `raw.githubusercontent.com`; por eso el repositorio tiene que ser público. Una URL del
`kino-plugin.json` de un repositorio (en GitHub, raw.githubusercontent.com o jsDelivr) siempre se
convierte en la dirección de ese repositorio, así que los secretos sellados, la firma y la búsqueda de
la comunidad le siguen funcionando.

### Instalar desde la URL del manifiesto { #manifest-url }

Tu plugin no tiene que vivir en GitHub (nuevo en la versión de Kino que sigue a la 0.9.49). La gente
puede pegar la URL `https` de su `kino-plugin.json` en cualquier servidor público: tu propio sitio,
GitHub Pages, un CDN como el `npm/` de jsDelivr. Kino la guarda como la dirección
`url:https://…/kino-plugin.json` (esquema y host en minúsculas, puerto por defecto, sin query ni
fragmento): esa URL es la identidad del plugin, y viaja tal cual a los otros aparatos de la persona con
la sincronización de plugins.

- `entry` e `icon` se leen relativos a la URL del manifiesto: `"entry": "plugin.js"` al lado de
  `https://example.com/kino/kino-plugin.json` es `https://example.com/kino/plugin.js`.
- Solo `https` (`http://` se rechaza con "Kino solo instala plugins desde direcciones https…"), en un
  nombre público: nada de direcciones IP, `localhost`, nombres de una sola etiqueta o `.local`/`.lan`,
  ni usuario:contraseña en la URL, y el archivo tiene que llamarse exactamente `kino-plugin.json`.
  También se rechazan un nombre que resuelve a una dirección privada y una redirección que sale de
  `https` o va a un host así.
- **Sin secretos sellados**: los sellos van amarrados a un repositorio de GitHub, así que un
  manifiesto con `secrets` instalado desde una URL se rechaza ("Este plugin trae datos sellados, y esos
  solo funcionan si lo instalas desde su repositorio de GitHub…"). Publica ese plugin en GitHub.
- **Sin firma**: una `signature` va amarrada a `owner/repo`, así que no se revisa y el plugin se
  instala (y se muestra) como no firmado.
- Todo lo demás es igual que con un repositorio: la hoja de consentimiento, los `hosts` y cada regla
  de aprobación, y las actualizaciones: Kino vuelve a leer la misma URL y aplica una `version` más alta,
  y pregunta otra vez cuando necesita más de lo aprobado. La búsqueda de la comunidad nunca lo lista
  (solo encuentra repositorios de GitHub con el topic `kino-plugin`).

**Los addons de Stremio** son una función de Kino para la gente, no algo que tú escribes: en el mismo
campo una persona puede pegar la dirección del `manifest.json` de un addon de Stremio (o un enlace
`stremio://`) y Kino genera un plugin para él. Nada de esta guía cambia para tu plugin.

## La guía, página por página { #pages }

| Página | Qué tiene |
| --- | --- |
| [Primer plugin](first-plugin.md) | Dos archivos que buscan y reproducen, y cómo ejecutarlos |
| [Plugins firmados](signed.md) | **Firma tu plugin con tu propia clave** para que la gente sepa que cada actualización es tuya (apiVersion 5, Kino 0.9.45+) |
| [Novedades](changelog.md) | Qué cambió para quienes escriben plugins, por versión de Kino |
| [Manifiesto](manifest.md) | Cada campo y regla de `kino-plugin.json`, ajustes, `streamHosts`, secretos sellados, los servidores propios de la persona, `insecureHttp`, descargas |
| [Contrato](contract.md) | Las funciones que exportas, sus argumentos, lo que devuelves, las preguntas de host y el permiso amplio de video, y los errores que la gente entiende |
| [API kino](kino-api.md) | `fetch`, cookies, `secret`, crypto, sleep, config, HTML, storage, log, rank |
| [Canales en vivo](live-channels.md) | Ítems `live`, la pestaña En vivo, listas M3U/XMLTV, guías, `liveStreamHosts`, tres recetas |
| [Formulario de ajustes](settings-form.md) | `section`, `status` y `action` en los ajustes, `clearSettings`, `validateSettings`, la pestaña propia y la sincronización (apiVersion 6) |
| [Firma por petición](signed-streams.md) | Streams HLS firmados en cada petición: `signing`, `sign`, reintentos y `alternateHosts` (apiVersion 6) |
| [Pasar lo guardado](migrate.md) | `migrate`: pasar a tu plugin lo que la persona tenía guardado (apiVersion 6) |
| [Sección, categorías y colores](section-theme.md) | `section`, `categories` y `theme` (apiVersion 6) |
| [Registro y telemetría](diagnostics.md) | `debug`, la página Registro, `telemetry`, `kino.log.report`, logcat y las métricas de reproducción (apiVersion 6) |
| [Límites y trampas del motor](engine-limits.md) | Todos los números en un solo lugar, cómo vive tu código, lo que le falta a QuickJS, la trampa del rechazo |
| [Probar en local](test-locally.md) | El kit de Node: `run.mjs`, `validate.mjs`, grabar y reproducir, canales en vivo |
| [Aparecer en Kino](listed.md) | Los cinco pasos para salir en "De la comunidad", cuánto tarda y cómo comprobarlo |
| [Publicar](publish.md) | Versiones, actualizaciones y aprobaciones, y cómo aparecer en "De la comunidad" |
| [Lo que ve la persona](what-people-see.md) | La hoja de consentimiento, los diálogos de host, los mensajes del reproductor, Configurar, estados, desactivar y desinstalar |
| [Recetario](cookbook.md) | Un sitio HTML con login, una API JSON con token, el servidor propio de la persona, Widevine, `http` plano |
| [Scrapers de Nuvio](nuvio.md) | Cómo instala la gente los scrapers de Nuvio, qué arma la conversión y sus límites |
| [Plugins de ejemplo](examples.md) | Los dos ejemplos publicados, y cómo está hecho el plugin de referencia |
| [Reclamos y retiro de plugins](claims.md) | Cómo pedir que un plugin de la comunidad salga del índice, qué hace Kino y cómo apelar |
| [Referencia](reference/index.md) | `contract.json` y `kino.d.ts`, para leer o descargar |
