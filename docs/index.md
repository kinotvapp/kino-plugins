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

El plugin de referencia es [kinotvapp/kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive)
(`kino-plugin.json` + `plugin.js`, una fuente de Internet Archive), y su carpeta `sdk/` es el kit de
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
5. **Publícalo** como repositorio público con el topic `kino-plugin`, e instálalo en Kino desde
   Ajustes > Plugins escribiendo `owner/repo` ([Publicar](publish.md)).

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
resolverse. Si usas un paso de compilación o una librería, empaqueta todo en ese único archivo.

**Cómo lo instala la gente.** En Kino, Ajustes > Plugins, escriben la dirección de tu repositorio:

| Escriben | Kino lee |
| --- | --- |
| `owner/repo` | la raíz del repositorio, rama por defecto |
| `owner/repo/sub/dir` | una carpeta dentro del repositorio |
| `owner/repo@v1.2.0` | una rama, tag o commit (el nombre no puede tener `/`); también sirve con una carpeta |
| `https://github.com/owner/repo` o `.../tree/<ref>/<path>` | lo mismo, pegado desde el navegador |

Kino descarga `kino-plugin.json`, tu archivo de entrada y el ícono desde `raw.githubusercontent.com`;
por eso el repositorio tiene que ser público.

## La guía, página por página { #pages }

| Página | Qué tiene |
| --- | --- |
| [Primer plugin](first-plugin.md) | Dos archivos que buscan y reproducen, y cómo ejecutarlos |
| [Manifiesto](manifest.md) | Cada campo y regla de `kino-plugin.json`, ajustes, los servidores propios de la persona, `insecureHttp`, descargas |
| [Contrato](contract.md) | Las funciones que exportas, sus argumentos, lo que devuelves y los errores que la gente entiende |
| [API kino](kino-api.md) | `fetch`, cookies, crypto, sleep, config, HTML, storage, log, rank |
| [Canales en vivo](live-channels.md) | Ítems `live`, la pestaña En vivo, listas M3U/XMLTV, guías, `liveStreamHosts`, tres recetas |
| [Límites y trampas del motor](engine-limits.md) | Todos los números en un solo lugar, cómo vive tu código, lo que le falta a QuickJS, la trampa del rechazo |
| [Probar en local](test-locally.md) | El kit de Node: `run.mjs`, `validate.mjs`, grabar y reproducir, canales en vivo |
| [Publicar](publish.md) | Versiones, actualizaciones y aprobaciones, y cómo aparecer en "De la comunidad" |
| [Lo que ve la persona](what-people-see.md) | La hoja de consentimiento, Configurar, estados, desactivar y desinstalar |
| [Recetario](cookbook.md) | Un sitio HTML con login, una API JSON con token, el servidor propio de la persona, Widevine, `http` plano |
| [Plugins de ejemplo](examples.md) | Los dos ejemplos publicados, y cómo está hecho el plugin de referencia |
| [Referencia](reference/index.md) | `contract.json` y `kino.d.ts`, para leer o descargar |
