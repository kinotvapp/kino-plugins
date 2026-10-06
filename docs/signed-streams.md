# Firma por petición (`signing`, apiVersion 6)

Algunos orígenes quieren una firma fresca en **cada** petición: un header que vence en segundos. Desde
`"apiVersion": 6` (Kino 0.9.50) devuelve `signing: "request"` en el stream y exporta `sign`:

```js
export async function resolve(ref, options) {
  const session = await openSession(options?.retry); // un reintento dice por qué: "conflict" o "expired"
  return { url: session.playlist, signing: "request", signContext: JSON.stringify({ token: session.token }),
           headers: { "Content-License": session.license } };
}

export async function sign({ url, kind, ref, context }) { // kind: "playlist" | "segment"
  const { token } = JSON.parse(context);
  return { headers: { "Content-Auth": await signatureFor(token, Date.now()) } };
}
```

Kino reproduce el stream a través de un proxy local. Antes de cada petición de playlist y de segmento
llama `sign()` y envía sus headers, mezclados sobre los `headers` propios del stream.

!!! note "Es para orígenes que de verdad lo exigen"
    Si tu origen acepta un token que dura minutos, devuélvelo en `headers` o en la URL y usa
    [`expiresInSeconds`](contract.md#stream): es más simple y no pasa por el proxy.

## Las reglas { #rules }

- **Solo HLS**: un `mime` HLS o una ruta `.m3u8`. Sin `drm` ni `audioTracks` (los subtítulos sí: reciben
  los `headers` propios del stream, como los subtítulos de cualquier stream, pero nunca pasan por
  `sign()`). El `stream` en línea de un ítem de `liveChannels` no lo puede pedir: un canal que también
  tiene `ref` se reproduce con `resolve(ref)` (el stream en línea se deja de lado), y uno sin `ref` se
  descarta. Un stream que rompe esto se rechaza con `per-request signing only works with HLS video
  (.m3u8)`, `a video signed per request can't carry drm or separate audio tracks` o `a channel signed
  per request must play through resolve()` (el detalle del log; la persona lee la línea propia de
  Kino). Un video firmado no se puede descargar: su descarga termina con `Este contenido no se puede
  descargar` (Kino 0.9.53 y anteriores: `Este video no se puede descargar`).
- **`sign()` corre aparte de tus otras funciones** (el "carril de firma"), así que un `home` lento nunca
  demora un segmento. Tiene `kino.crypto`, `kino.secret`, `kino.config`, `kino.html` y `kino.log`, y nada
  más: `kino.fetch` responde un error `host_not_allowed` ("sign can't use the network"), y
  `kino.storage`, `kino.cookies` y `kino.sleep` fallan con el código `not_allowed` y "sign() can't use
  kino.storage: whatever you need must come in signContext" (igual para los demás). Tampoco ve nada de lo
  que el runtime principal tiene en memoria (ni las llaves privadas de
  [`generateKeyPair`](kino-api.md#key-pairs)).
- Lo que necesita viaja en `context`, el `signContext` que devolvió tu `resolve()` (un texto de máximo
  4096 caracteres; uno más largo o que no es texto rechaza el stream con `the "signContext" value is not
  valid`). Un marcador de `kino.secret()` ahí no significa nada (un marcador solo sirve en el runtime que
  lo creó): llama `kino.secret()` dentro de `sign()` mismo; un `signContext` que lleva uno se rechaza
  con "signContext can't carry a kino.secret(): call it inside sign()".
- Un stream que pide `signing: "request"` de un plugin que no exporta `sign` se rechaza con "the plugin
  asks to sign the video but doesn't export sign()".
- **1,5 s por llamada** (3 s contando su espera). Una respuesta lenta cuenta como firma fallida.
- Responde `{ headers }`, filtrados como los `headers` de un stream (mismos nombres y reglas de tamaño).
  Un valor que contiene un marcador de `kino.secret()` se rechaza ("sign can't return sealed
  data"): un marcador solo sirve dentro de `kino.crypto`, así que calcula el header ahí.
- Tres firmas fallidas seguidas detienen el video.
- Por debajo de apiVersion 6, `signing` y `signContext` se ignoran.
- **Los mensajes de arriba son los de Kino 0.9.54**: desde esa versión el detalle
  técnico que ven tu código y el log está en inglés y puede cambiar, así que compara el `code` del error,
  nunca su texto. Kino 0.9.53 y anteriores los escriben en español (`La firma por petición solo funciona
  con video HLS (.m3u8)`, "sign no puede usar la red", `El dato "signContext" no es válido`…).
- Un stream firmado no usa [`alternatives`](contract.md#stream): su conmutación son los `alternateHosts`
  de abajo.

## Volver a abrir: `resolve(ref, { retry })` { #retry }

Si el origen responde 409, o 401/403 dos veces seguidas, Kino vuelve a llamar
`resolve(ref, { retry: { reason, attempt, status } })`:

- `reason`: `"conflict"` (el acceso está en uso en otra parte: consigue otro) o `"expired"`;
- `attempt` de 1 a 3;
- `status`, el estado HTTP del origen que lo causó (401, 403 o 409; ausente cuando Kino no oyó
  ninguno), para tu log.

El presupuesto se recarga cuando el video lleva un minuto reproduciéndose bien; después del tercer
reintento la persona ve el error. `options` es `undefined` en una llamada normal, y solo los plugins
apiVersion 6 lo reciben.

## Otros hosts que sirven el mismo stream (`alternateHosts`) { #alternate-hosts }

`alternateHosts`, hasta 6 `"host"` o `"host:puerto"`, sin esquema ni ruta. Kino prueba la playlist en
cada uno, primero el que sirvió de último, hasta 3 rondas, y pasa un segmento, una llave o un map a otro
host cuando el suyo falla 3 veces. `sign()` siempre recibe la URL del host al que se le está pidiendo,
así que escoge el token de ese host desde `context`.

```js
return { url: "http://cdn1.example/live/ch.m3u8", signing: "request",
         alternateHosts: ["cdn2.example", "cdn3.example:8080"],
         signContext: JSON.stringify({ "cdn1.example": t1, "cdn2.example": t2, "cdn3.example:8080": t3 }) };
// sign({ url, context }): const tokens = JSON.parse(context); const token = tokens[new URL(url).host];
```

- Cada entrada cumple la misma regla de host que `url`: un host declarado (`http` plano solo en uno
  declarado `insecureHttp`), o cualquier host público con `liveStreamHosts: "any"`, nunca uno local.
- Una entrada que no la cumple, que repite el host de `url` u otra entrada, o que viene después de la
  sexta se descarta (`run.mjs` y `validate.mjs` la muestran como `[dropped by Kino]`); un valor que no es
  un arreglo de textos rechaza el stream con `the "alternateHosts" value is not valid` (Kino 0.9.53 y anteriores: `El dato
  "alternateHosts" no es válido`).
- Con ellos, el stream cuenta como `"expired"` solo cuando **todos** los hosts rechazaron la firma, y
  como `"conflict"` solo cuando el último respondió 409; un host que responde 404 o no responde solo
  hace que Kino siga con el siguiente.
- Un host que nombra la playlist y que no es uno de estos nunca se cambia.
- Sin `signing`, se ignora.

## Chromecast y DLNA { #cast }

Un stream firmado se puede enviar a un TV como cualquier HLS. El TV nunca firma nada: pide el stream a
través de Kino en el celular, que llama `sign()` para cada playlist y segmento que el TV pide,
exactamente como para su propio reproductor (el mismo límite de 1,5 s, la misma regla de "tres firmas
fallidas detienen el video"). Así que el celular tiene que seguir en el mismo Wi-Fi que el TV, con Kino
abierto, durante todo el envío.

- Si el origen rechaza el stream mientras el TV lo reproduce y el reproductor sigue abierto en el
  celular, Kino vuelve a llamar `resolve(ref, { retry })` y el TV lo recarga desde el mismo punto (un
  canal en vivo, desde su borde).
- Cuando la persona sale del reproductor, un Chromecast sigue reproduciendo hasta que lo detienen o le
  envían otra cosa, pero un rechazo ya no se vuelve a resolver: la reproducción del TV simplemente
  termina. Salir del reproductor detiene un TV DLNA, como con cualquier título.
- Un stream firmado con `drm` nunca se envía. Kino reproduce un stream firmado a la vez: abrir otro en el
  celular termina el envío del primero.

## Probarlo en tu computador { #test }

```
node sdk/run.mjs ./plugin.js sign '{"url":"https://cdn.example/seg.ts","kind":"segment","ref":"<ref>","context":"<signContext>"}'
node sdk/run.mjs --retry conflict:1 ./plugin.js resolve '<ref>'      # o conflict:1:409 para pasar un status
```

El primero corre `sign` en el mismo carril restringido; el segundo llama `resolve` con un reintento.
Con `"telemetry": "verbose"` Kino también reporta las estadísticas de firma de cada reproducción (p50,
p95, máximo y tiempos agotados): mira [Registro y telemetría](diagnostics.md#playback).
