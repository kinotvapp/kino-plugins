# Bóveda: el secreto propio del plugin { #vault }

!!! note "Disponible con Kino 0.9.90"
    `vault` es de `apiVersion` 28 y llega con Kino 0.9.90. Una versión anterior
    rechaza estos plugins con «Este plugin necesita una versión más nueva de Kino».

`vault` deja que tu plugin lea su **propio secreto sellado** desde la bóveda de secretos de Kino. Es una capacidad
**declarativa** (no exportas nada nuevo), **requiere [`identity`](identity.md)** y no puede ir sola. La idea: la configuración
secreta de tu plugin (una API base, llaves para firmar peticiones, un token) vive en la bóveda, **no en el código**.

```json
"capabilities": ["screen", "identity", "vault"]
```

## La llamada { #call }

```js
const secret = await kino.vault.get();   // sin argumentos; devuelve el JSON que registraste para tu plugin
```

Kino hace **todo el intercambio por dentro**: prueba quién es la persona en Telegram y atesta qué plugin firmado pregunta
(la misma maquinaria de [`identity`](identity.md): el seudónimo por plugin, la firma con la llave del dispositivo, tu
huella de autor y el `codeHash`, y —para un autor de `tokenAuthors`— el token del gate, con el que la bóveda verifica la
membresía del grupo **en vivo**), y lee el secreto que la bóveda resuelve para tu `(pluginId, author)`.

**Nunca ves la dirección de la bóveda, el desafío, ni el `pluginId`/`author` con el que resuelve:** Kino los pone desde su
propio registro de la instalación, así que un plugin **solo puede leer SU PROPIO secreto**, y una copia re-firmada con otra
llave resuelve un ámbito distinto (inexistente). No hay respaldo hardcodeado: un no-miembro, o una copia re-firmada, no
obtiene nada; y **rotar** el secreto en la bóveda mata las copias que cachearon uno viejo.

Como la lectura está gateada por quién es la persona igual que `identity`, `vault` **se monta sobre el consentimiento de
`identity` y no agrega ninguna aprobación propia** — declara ambas capacidades; Kino incluso prende el switch de identidad
por la persona en una llamada de pantalla que ella inició, así que no hay nada extra que aprobar. Tu plugin tampoco declara
el host de la bóveda: la petición la hace Kino, no vos.

## Cuándo y los errores { #errors }

Solo dentro de una llamada que la persona inició desde `screen`, `screenEvent` o `panelAction` (nunca un tick de temporizador,
un trabajo, Inicio ni la búsqueda), 6 por minuto. Rechaza con:

- `permission_denied` — no aprobado, o la llamada no es de las permitidas.
- `not_member` — la persona no está en el grupo de Kino, o el ámbito de la copia no coincide.
- `not_found` — todavía no hay un secreto registrado para tu plugin.
- `rate_limited` / `unavailable` / `not_available` — transitorio (sin validación de Telegram en el dispositivo, o no se pudo contactar la bóveda).

**Cachea el secreto vos mismo** (en `kino.storage`, ~1 h): cada `get()` es un viaje al servidor más un chequeo de membresía en vivo.

## Ejemplo de la vida real { #example }

[**`kinotvapp/kino-plugin-vault-demo`**](https://github.com/kinotvapp/kino-plugin-vault-demo) — el plugin más chico que lee su
secreto con `kino.vault.get()` y saluda a la persona con `kino.identity`, con el manejo de cada estado de error. Un
`plugin.js` sin compilar, bien comentado. Ver también los [plugins de ejemplo](examples.md).
