# Crear un plugin con IA

Un asistente de programación con IA (Claude Code, Cursor, Copilot, Codex, Aider…) puede escribirte
un plugin de Kino si primero lee las reglas. Este sitio las publica en los formatos que mejor leen
esas herramientas:

| Archivo | Qué es |
| --- | --- |
| [`AGENTS.md`](https://kinotvapp.github.io/kino-plugins/AGENTS.md) | Las instrucciones para el asistente: su rol, qué leer, el flujo de trabajo paso a paso, las reglas duras con sus números exactos, una lista de chequeo y los errores de siempre. También está en [el repositorio](https://github.com/kinotvapp/kino-plugins/blob/main/AGENTS.md). |
| [`llms-full.txt`](https://kinotvapp.github.io/kino-plugins/llms-full.txt) | Toda esta guía en un solo archivo de texto (en inglés), más `AGENTS.md`, `contract.json` y `kino.d.ts`. Se genera con el sitio, así que siempre es la misma versión de estas páginas. |
| [`llms.txt`](https://kinotvapp.github.io/kino-plugins/llms.txt) | El índice corto, en el formato [llms.txt](https://llmstxt.org/). |

## El prompt { #prompt }

Cópialo, llena las tres líneas que están entre `<<<` y `>>>`, y pégalo en tu asistente, idealmente
desde una carpeta vacía o desde un repositorio creado con la
[plantilla](https://github.com/kinotvapp/kino-plugin-archive).

```text
Vas a escribir un plugin de Kino: un repositorio público de GitHub con kino-plugin.json y un
módulo ES de JavaScript (plugin.js) que la app de video Kino ejecuta en un sandbox de QuickJS.

Antes de escribir nada:
1. Descarga y lee completo https://kinotvapp.github.io/kino-plugins/AGENTS.md y síguelo como tus
   instrucciones para esta tarea.
2. Descarga y lee https://kinotvapp.github.io/kino-plugins/llms-full.txt (la guía completa,
   contract.json y kino.d.ts). Si no puedes abrir URL, dímelo y te los pego.
3. Lee plugin.js y kino-plugin.json de https://github.com/kinotvapp/kino-plugin-archive, el plugin
   de referencia, y usa su carpeta sdk/ como kit de pruebas de Node.

Lo que quiero:
- Fuente: <<< el sitio o la API, p. ej. https://example.com, y qué tiene: películas, series, TV en vivo >>>
- Acceso: <<< ninguno / mi usuario y contraseña / una clave de API / la dirección de un servidor que escribo yo >>>
- Nombre del plugin que se ve en Kino: <<< p. ej. "Mi fuente" >>>

Reglas que no puedes romper (el detalle está en AGENTS.md):
- Solo se llega a los hosts declarados en el manifiesto (incluidos cada host de redirección, CDN,
  subtítulos y segmentos; *.x no cubre x). Nada de APIs de Node ni del navegador: nada de fetch,
  setTimeout, Buffer, process, require, crypto, Intl; usa kino.fetch, kino.sleep, kino.crypto,
  kino.storage.
- Nunca lances un error antes del primer await en una función async (primero await, después valida).
- Respeta los límites: search 15 s, las demás llamadas 20 s, 60 peticiones por llamada, cuerpos de
  5 MB, 256 KB de storage, 100 ítems de búsqueda, 20 filas de Inicio de 60.
- Usa kino.error("auth_required" | "not_found" | "geo_blocked" | "rate_limited" | "unavailable").
- Todo lo que lee la persona va en español de Bogotá con tuteo, nunca voseo.
- Nunca dejes contraseñas, tokens ni claves en el código: pídelos en un ajuste de tipo "password".
- Usa el apiVersion más bajo que funcione, un id nuevo y mío (nunca "archive-org"), y un
  repositorio creado desde la plantilla, no un fork.

Trabaja paso a paso: primero explora la fuente con peticiones reales, luego escribe el manifiesto,
luego cada función. Después de cada paso ejecuta `node sdk/validate.mjs .` y
`node sdk/run.mjs . <función> …` y arregla todo lo que Kino descartaría. Graba fixtures con
--record y haz que `node --test` pase sin conexión. Termina con la lista de chequeo de AGENTS.md y
luego dime cómo publicarlo (topic kino-plugin) y qué tengo que probar a mano en la app Kino.
```

## Consejos { #tips }

- **Dale una terminal al asistente.** El kit solo ayuda si el asistente puede ejecutar
  `node sdk/validate.mjs .` y `node sdk/run.mjs …` y leer lo que imprimen.
- **Pruébalo en la app.** El kit de Node es más permisivo que Kino
  ([lo que no reproduce](test-locally.md#differences)): instala el plugin desde Ajustes > Plugins y
  revisa que busque, liste capítulos y reproduzca antes de publicarlo.
- **Pide las razones.** Cuando el kit reporte un ítem descartado, pregúntale al asistente qué regla de
  [el contrato](contract.md) rompió, en vez de aceptar un parche.
- **Ojo con los derechos.** Un plugin solo puede llegar a lo que la persona igual podría ver; no le
  pidas a un asistente que se salte un muro de pago, un login o un DRM.
