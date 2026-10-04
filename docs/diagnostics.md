# Registro y telemetría (apiVersion 6)

Tres formas de saber qué le pasa a tu plugin en el aparato de otra persona, de la más local a la que
sale del aparato. Todas desde `"apiVersion": 6` (Kino 0.9.50); por debajo, los campos se ignoran.

| Qué | Dónde se ve | Quién lo enciende |
| --- | --- | --- |
| [`kino.log`](kino-api.md#log) | `adb logcat` | siempre |
| [Modo debug](#debug) | panel de error en pantalla, página "Registro" | la persona, con el interruptor que tiene todo plugin (`"debug": true` lo deja encendido de entrada) |
| [`"telemetry": true`](#telemetry) / `"verbose"` | el registro de errores de quienes mantienen Kino | tú lo pides y la persona lo aprueba (todavía no hay interruptor para apagarlo) |

## Logcat { #logcat }

`kino.log` y `console.*` van a `adb logcat` con la etiqueta `KinoPlugin`; en una compilación de
depuración de Kino, o en cualquier compilación mientras el [Modo debug](#debug) de tu plugin está
encendido, con la etiqueta `KinoPlugin/<tu id>`. Las [métricas de reproducción](#playback) de Kino van con la etiqueta
`KinoPlay` en esos mismos casos, así que

```
adb logcat -s KinoPlay KinoPlugin/<tu id>
```

muestra las líneas de Kino y las tuyas juntas.

## Modo debug: errores en pantalla y la página Registro { #debug }

Desde Kino 0.9.50 **todo plugin instalado** (el tuyo, un addon de Stremio convertido, un scraper de Nuvio)
tiene un interruptor **"Modo debug"** en su propia pestaña de Ajustes (Ajustes ▸ *el nombre de tu
plugin*, en el celular y en la TV), con la línea "Muestra los errores de este plugin en pantalla y guarda
un registro que puedes compartir con su autor." No tienes que hacer nada para que aparezca. Mientras está
encendido:

- cada llamada fallida de tu plugin muestra un panel en pantalla con la función, el código de error, el
  mensaje técnico, la pila de JavaScript y tus últimas líneas de `kino.log`;
- la pestaña gana un botón **"Ver registro"** que abre el **Registro**: los últimos 200 eventos (tus
  líneas, las fallas y las líneas `kino:play …` de cada reproducción), con "Copiar registro" y, en el
  celular, "Compartir registro".

Mientras está apagado, no se muestra ni se guarda nada; apagarlo borra el Registro.

**Así es como una persona te manda lo que falló.** Cuando alguien te reporte un problema, pídele que
encienda el Modo debug de tu plugin en Ajustes, repita lo que falló y te mande una captura del panel o el
Registro copiado o compartido.

**`"debug": true` en tu manifiesto solo fija el valor de entrada.** Con él, el interruptor arranca
encendido para todo el que instale el plugin (verá tus paneles hasta que lo apague); sin él (o con
`false`), arranca apagado. Usa `true` mientras desarrollas, o en una versión de prueba que le pasas a
quienes te ayudan a probar; en un plugin que publicas para todo el mundo, déjalo por fuera y que cada
persona lo encienda cuando necesite mandarte un reporte. `validate.mjs` agrega una nota cuando está en
`true`. Cuando una persona toca el interruptor, su decisión se conserva en las actualizaciones (una
actualización que agrega o quita `debug` solo cambia el valor de entrada de quien nunca lo tocó) y se
sincroniza con sus otros aparatos. Cualquier valor distinto de `true` o `false` se rechaza con "El campo
\"debug\" debe ser true o false".

El Registro se guarda en un archivo privado del aparato, así que sobrevive a un reinicio; nunca se
sincroniza ni se respalda, y se borra cuando se apaga el interruptor o se desinstala el plugin. Los
secretos, y las contraseñas de la propia persona, se tapan ahí como en todas partes, así que un Registro
compartido no lleva ninguno de los dos.

## `telemetry`: tus líneas llegan al registro de errores { #telemetry }

Desde Kino 0.9.50 solo un plugin que declara `"telemetry"` envía sus líneas de `kino.log` cuando una
llamada falla, sea recomendado o no, venga del repositorio que venga. De cualquier otro plugin (incluido
un scraper de Nuvio convertido) Kino solo anota que la llamada falló: tu id y versión, la función y el
tipo de falla, nunca una línea de log.

- **Consentimiento.** La hoja de consentimiento dice "Comparte registros de errores con Kino para
  corregir fallas". Una actualización que lo declara por primera vez espera la aprobación de la persona,
  como un host nuevo (queda en "Actualización disponible — requiere tu aprobación").
- **Todavía sin interruptor.** Por ahora, mientras se estabilizan los plugins, las líneas de un plugin
  que lo declara se envían siempre. Una versión posterior de Kino agrega un interruptor "Enviar registros
  de errores" en la pestaña de tu plugin en Ajustes, encendido por defecto, que la persona puede apagar
  en cada aparato; entonces no sale nada mientras esté apagado.
- **Qué se envía.** Cuando una llamada falla (lanza un error, se pasa del tiempo, devuelve algo
  inservible, incluidos `sign`, `settingsStatus`, `action` y `validateSettings`), las líneas que registró
  durante esa llamada (las últimas 30, cada una de máximo 300 caracteres, 2 KB en total) como
  `plugin_log`, marcadas con el id y la versión de tu plugin. Máximo un reporte por función y tipo de
  falla por hora. Una llamada que sale bien no envía nada.
- **Qué se quita antes de salir.** URL, nombres de host, IP, correos, ids largos, tiras largas de
  hex/base64, texto con forma de credencial, los valores de los ajustes de la persona y el texto de su
  búsqueda o del título. Aun así: registra lo que pasó (un estado, un paso, un conteo), nunca lo que la
  persona escribió, un secreto ni el valor de un ajuste.
- Cualquier valor distinto de `true`, `false` o `"verbose"` se rechaza con "El campo \"telemetry\" debe
  ser true, false o \"verbose\"".

### `"verbose"` { #verbose }

`"telemetry": "verbose"` comparte todo lo de `true` más las [métricas de reproducción](#playback) de una
muestra (un cuarto) de las reproducciones que salieron bien, los reportes de problemas en vivo y de
envío al TV, y los casos especiales (una nueva llamada a `resolve`, un cambio de host, un cambio de
decodificador, un tiempo agotado de firma, los resultados de `migrate`, ajustes sincronizados desde otro
aparato). Máximo 60 eventos por plugin hasta que Kino se reinicia y uno por minuto por área. Su línea de
consentimiento es "Comparte registros detallados de reproducción y errores con Kino para corregir
fallas"; una actualización de `true` (o de nada) a `"verbose"` espera la aprobación de la persona, y de
`"verbose"` a `true` se aplica en silencio.

## `kino.log.report`: un resultado degradado { #report }

`kino.log.report(...args)` (con `telemetry`) escribe una línea como `kino.log` y además le avisa al
registro de errores que tu plugin entregó un resultado **degradado** aunque la llamada funcionó: usó una
cuenta compartida de respaldo, una fuente de reserva, recortó una lista.

```js
kino.log.report("myplugin:session", "shared_fallback", "tries=2");   // área myplugin:session
```

- La primera palabra de la línea nombra el área, y tiene que ser una palabra con espacio de nombres:
  minúsculas, dígitos, `_` y `:`, con al menos un `_` o `:`, máximo 24 caracteres. Cualquier otra
  primera palabra (una palabra suelta, algo con punto, `@` o `/`, o que contiene uno de los valores de
  la persona) se archiva como `other`.
- Máximo un reporte por plugin y área por hora, y 3 por plugin hasta que Kino se reinicia (y 10 en total,
  sumando todos los plugins, en esa misma corrida de Kino); se envía como advertencia. Ese tope deja espacio
  a los fallos de verdad, que tienen sus propios topes.
- La línea entera se depura como cualquier línea de log, incluido el texto de la llamada en curso.
- Sin `telemetry` (o, cuando exista ese interruptor, con él apagado) es solo una línea de log.
- Reporta lo que pasó en códigos y conteos, nunca valores que vinieron de una respuesta.

## Métricas de reproducción y reportes de problemas { #playback }

Kino mide cada reproducción de un stream de plugin (una película, un capítulo, un canal en vivo) y cada
envío de uno a un TV, sin código en tu plugin. Cada reproducción tiene un registro: cuánto tardó
`resolve`, el tiempo hasta el primer cuadro (el tiempo de zapping en un canal), cómo llegó el
reproductor al stream (`direct`, `proxy`, `signed_proxy`, `remux`), el decodificador de video y sus
cambios, los cambios de resolución y de bitrate, las pausas por carga y el tiempo detenido, los errores
del reproductor por clase con su estado HTTP, los reintentos y su motivo (`expired`, `conflict`,
`network`, `cut`…), y para un [stream firmado por petición](signed-streams.md) el p50/p95/máximo de
`sign` y sus tiempos agotados por playlist y segmento, y el p50/p95 de las peticiones y sus errores por
**índice** de host (0 = el host propio del stream, 1… = sus `alternateHosts`).

Unos detectores buscan lo que nota quien mira: ningún primer cuadro en 10 s, imagen congelada, pausas
largas, ráfagas de cuadros perdidos, cortes o errores de audio, audio y video que se desfasan, la pista
de audio perdida, errores de decodificador, quedarse atrás de la ventana en vivo, errores HTTP por clase
de segmento; y en un envío al TV, los tiempos de carga agotados del receptor, sus errores y motivos de
inactividad, un remux que se detuvo, el TV arrancando lejos de la posición del celular, y una sesión que
se cayó. Nada de lo que escriben lleva una URL, un host, un token ni algo que la persona escribió: solo
números y las palabras propias de Kino.

Adónde va:

- a la página **Registro** de tu plugin (mientras su Modo debug está encendido): una línea `kino:play …` por hito y una de
  resumen;
- a **logcat** con la etiqueta `KinoPlay` en una compilación de depuración de Kino, o en cualquiera
  mientras ese interruptor está encendido;
- al **registro de errores**, solo con `telemetry` (y, cuando exista ese interruptor, mientras la persona lo deje encendido): con `true`,
  un resumen por reproducción que terminó en un error que la persona vio; con `"verbose"`, además un
  cuarto de las reproducciones que salieron bien y un evento por problema o caso especial (máximo 60 por
  plugin hasta que Kino se reinicia, uno por minuto por área). Los eventos de falla llevan la pila de la
  excepción de Kotlin y, cuando tu script lanzó el error, sus propios marcos de pila
  (`at fn (plugin.js:12:5)`, solo los marcos).
