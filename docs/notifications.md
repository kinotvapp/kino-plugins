# Avisos en la campanita { #notifications }

!!! note "Disponible con Kino 0.9.77"
    `notifications` es de `apiVersion` 15 y llega con Kino 0.9.77. Una versión anterior
    rechaza estos plugins con «Este plugin necesita una versión más nueva de Kino».

`notifications` deja que tu plugin deje **avisos cortos en la campanita de Inicio**: «Beto y 2 más comentaron tu publicación».
Es una capacidad **declarativa** (no exportas nada nuevo), no puede ir sola (la usa una [pantalla](screens.md) o un
[trabajo en segundo plano](jobs-and-shared.md#jobs)) y no se ofrece con [`enhancements`](enhancements.md).

```json
"capabilities": ["screen", "schedule", "notifications"]
```

## Publicar y quitar { #api }

```js
await kino.notifications.post({
  id: "c123",                                            // 1 a 64 de A-Z a-z 0-9 . _ -
  title: "Beto y 2 más comentaron tu publicación",       // 1 a 80 caracteres
  titleEn: "Beto and 2 more commented on your post",
  text: "«Qué buena recomendación»",                     // opcional, hasta 160
  textEn: "“What a great pick”",
  go: { screen: { route: "post", args: { id: "123" } } }, // opcional: a dónde lleva el toque
});

await kino.notifications.clear("c123"); // quita ese aviso
await kino.notifications.clear();       // quita todos los tuyos
```

- **`id`** reemplaza un aviso anterior con el mismo `id`, otra vez sin leer: **agrupa** tus noticias bajo un solo `id` en vez
  de publicar una por evento.
- **`title`** (de 1 a 80 caracteres) y **`text`** (hasta 160) son texto plano de una línea: Kino quita los caracteres de
  control y de dirección. `titleEn` y `textEn` son lo que se muestra en inglés.
- **`go`** es solo `{ screen: { route?, args? } }` (una pantalla **tuya**, leída como el `go.screen` de una pantalla),
  `{ title: {…} }` o `{ titleByIds: {…} }` (con las reglas de las pantallas). Cualquier otra cosa descarta el `go` (no el
  aviso; queda en el registro) y el toque abre la raíz de tu pantalla. Hoy un `go` de título también abre la raíz.
- Ambas funciones responden `undefined` o se rechazan con un error con `code`: `permission_denied`, `rate_limited` o
  `bad_request`.

## Cuándo se puede llamar { #when }

Desde tu `screen`, un `screenEvent` o tu **trabajo programado** (`job`): lo habitual es que el trabajo le pregunte a tu
servidor qué hay de nuevo y lo publique. Es una de las pocas cosas que un trabajo puede hacer además de `kino.fetch`,
`kino.storage` y `kino.log`, y no cuenta contra ninguna otra cuota.

## Límites { #limits }

Por plugin:

| Qué | Límite |
| --- | --- |
| Publicaciones | 20 por hora (después, `rate_limited`) |
| Avisos guardados | 30 (se descartan los más viejos) |
| Vida de un aviso | 30 días |
| `title` / `text` | 80 / 160 caracteres |
| Tamaño de la petición | 8192 caracteres |

Los números exactos están en `contract.json` (`kinoNotifications.limits`).

## Lo que ve la persona { #what-people-see }

- La campanita de Inicio muestra una insignia con los avisos **sin leer** más las actualizaciones de plugins que esperan
  aprobación.
- La lista muestra los avisos del más nuevo al más viejo, cada uno con el ícono y el nombre de tu plugin, el título, el texto
  y hace cuánto. Tocar un aviso sigue su `go` y lo marca leído; abrir la lista marca todos como leídos.
- El aviso de un plugin +18 solo se muestra mientras el código +18 esté desbloqueado.
- **Los avisos no se sincronizan**: cada aparato guarda los suyos (el trabajo de cada aparato pide lo suyo), así que deja que
  tu servidor recuerde qué se leyó.

## Consentimiento { #consent }

La persona lee, como una línea normal (no en rojo), en la hoja de instalación y en la actualización que la agrega:

- «Podrá mostrarte avisos en la campanita» (EN: "Can show you notices in the bell").

Y en la pestaña de tu plugin en Ajustes puede apagarla, para todo el aparato y sus aparatos sincronizados: «Mostrar sus avisos
en la campanita» ("Show its notices in the bell"). Apagada, sus avisos salen de la campanita y toda llamada se rechaza con
`permission_denied`.

## Probar con el kit { #kit }

El kit guarda lo que publicas en `<carpeta>/.kino-notices.json` y lo imprime:

```
node sdk/run.mjs --device phone . job notices      # corre el trabajo y publica
node sdk/run.mjs . notifications                    # lo publicado hasta ahora
```

`KINO_NOTIFICATIONS_REVOKED=1` simula que la persona la apagó. Agrega `.kino-notices.json` a tu `.gitignore`, como los demás
archivos locales del kit. El contrato está en `contract.json` (`kinoNotifications`) y los tipos en `kino.d.ts`.

## Ejemplo trabajado: Kino Social { #example }

**Kino Social** convierte comentarios, «me gusta» y seguidores nuevos en avisos de la campanita con un trabajo que corre cada
15 minutos o más (el trabajo `notices` de su manifiesto, que la persona activa y ajusta). Cada pasada le pide a su servidor lo
nuevo, lo publica del más viejo al más nuevo (para que el más nuevo quede arriba) y mueve su cursor solo hasta donde la
campanita aceptó, así que uno rechazado por el tope por hora vuelve en la pasada siguiente:

```js
export async function postNotices() {
  if (typeof kino.notifications !== "object") return 0;        // un Kino sin la capacidad
  const body = await call("/notifications?since=" + since);    // lo nuevo, de su servidor
  const fresh = body.items.filter((n) => !n.read).sort((a, b) => a.createdAt - b.createdAt);
  for (const n of fresh) {
    try {
      await kino.notifications.post({
        id: "c" + n.id, title: titleEs, titleEn, text: excerpt,
        go: { screen: { route: "post", args: { id: String(n.postId) } } }, // el toque abre esa publicación
      });
    } catch (_) { break; }                                     // el tope por hora: seguir en la próxima pasada
    since = Math.max(since, n.createdAt);
  }
}
```
