# Bóveda de secretos: guarda un secreto para tu plugin { #secrets-vault }

!!! note "Servicio alojado de Kino"
    La bóveda vive en **`secrets.kinoverse.app`** y se construye sobre [Identidad](identity.md) con
    desafío (`apiVersion` 15; la atestación para autores que no son Kino llega con Kino 0.9.88). No
    necesitas servidor propio: tú guardas un JSON desde un panel web y tu plugin lo lee en runtime.

La bóveda guarda **un secreto JSON por repositorio** —una clave de API, un `recipe` de configuración, lo que tu plugin
necesita para hablar con su fuente— **sin que tenga que vivir en el repositorio público**. Solo las personas que están en el
grupo de Kino lo reciben; cualquier otro, no. El secreto se guarda **cifrado**, y el único que lo ve en claro es tu plugin,
en el aparato de un miembro, en el momento de usarlo.

Sirve cuando tu plugin necesita un dato que no quieres publicar (y que una copia no debería poder reusar), pero no quieres —o
no puedes— levantar un servidor. Si ya tienes servidor propio, no la necesitas: haz tú mismo el flujo de [Identidad](identity.md).

!!! warning "Secretos moderados, no críticos"
    La bóveda frena a los que no son miembros y a las copias re-firmadas con otra llave, pero **no** a un falsificador
    decidido (mira [Qué protege y qué no](#trust)). Guarda en ella secretos **moderados** —mejor que dejarlos en el
    `plugin.js` público— no claves que, filtradas, hagan daño serio.

## 1. Guarda el secreto (el panel) { #store }

Entra a **<https://secrets.kinoverse.app>** con tu cuenta de GitHub. Vas a ver tus repositorios con el topic `kino-plugin`
de los que eres **owner o admin**; eliges uno, pegas el JSON y lo guardas.

Para que un repositorio aparezca y se pueda guardar, necesita:

- ser **público** y tener el topic **`kino-plugin`** (el panel entra con el permiso `public_repo`, así que un repositorio
  privado no se puede leer para guardar);
- un **`kino-plugin.json` firmado** en la rama por defecto. De ahí la bóveda saca el **alcance** del secreto: el `id` del
  manifiesto (el `pluginId`) y la huella de la llave de autor (`author`), que tu plugin tendrá que presentar al leer.

Al guardar, el panel te muestra las dos URLs que tu plugin usa (con un botón para copiarlas):

```
Secreto    https://secrets.kinoverse.app/secrets/<owner>/<repo>
Challenge  https://secrets.kinoverse.app/session/challenge
```

El secreto se guarda **cifrado** (nunca en claro en la base ni en el repositorio). Para **rotarlo**, lo editas en el panel:
la próxima lectura devuelve el valor nuevo (mira [Rotación](#rotation)).

## 2. Léelo desde tu plugin (con un desafío) { #read }

La lectura es el mismo patrón de [Identidad con desafío](identity.md#challenge), pero contra la bóveda: tu plugin pide un
desafío, deja que Kino firme y atestigüe quién pregunta, y la bóveda devuelve el secreto **solo si la persona está en el
grupo**. No usa el `token`: le basta la atestación, así que funciona con cualquier plugin **firmado**.

```js
const VAULT = "https://secrets.kinoverse.app";
const REPO = "<owner>/<repo>";          // donde guardaste el secreto
const PLUGIN_ID = "<el id de tu kino-plugin.json>";

async function getRecipe() {
  const cached = kino.storage.get("recipe");
  if (cached) return cached;                       // cachea: cada lectura gasta cupo (abajo)

  // 1. Un desafío de un solo uso de la bóveda (sin sesión ni token)
  const { challenge } = await post(VAULT + "/session/challenge", {});
  // 2. Kino firma el desafío con la llave de este aparato y atestigua quién pregunta
  const who = await kino.identity.telegram({ challenge });
  // 3. La bóveda verifica firma + huella del autor + membresía, y devuelve el secreto
  const { secret } = await post(VAULT + "/secrets/" + REPO, {
    pluginId: PLUGIN_ID,
    challenge,
    id: who.id,
    deviceKey: who.deviceKey,
    signature: who.signature,
    author: who.author || "",
    codeHash: who.codeHash || "",
  });

  kino.storage.set("recipe", secret, { ttlMs: 60 * 60 * 1000 });  // ~1 h
  return secret;
}
```

`id`, `deviceKey`, `signature`, `author` y `codeHash` salen tal cual de [`kino.identity.telegram`](identity.md#challenge): no
los calculas tú. Solo agregas el `pluginId` (el `id` de tu manifiesto) y el `challenge`.

El cuerpo del `POST /secrets/<owner>/<repo>`:

| Campo | Qué es |
| --- | --- |
| `pluginId` | El `id` de tu `kino-plugin.json`. Tiene que ser el que registraste al guardar. |
| `challenge` | El nonce de un solo uso que te dio `POST /session/challenge`. |
| `id` | El [seudónimo](identity.md#call) de la persona para tu plugin (`who.id`). |
| `deviceKey` | La llave pública del aparato (`who.deviceKey`). |
| `signature` | La firma del desafío (`who.signature`). |
| `author` | La huella de la llave de autor con la que firmaste el plugin (`who.author`). Debe coincidir con la del manifiesto que guardaste, y no puede ir vacía: un plugin **sin firmar** no puede leer. |
| `codeHash` | El hash del código (`who.codeHash`). Informativo en esta versión; fírmalo igual pero no se exige. |

Respuesta **`200`**: `{ "secret": <tu JSON> }` —exactamente lo que guardaste en el panel.

## 3. Cuándo se puede leer, y el cupo { #limits }

- **Solo en una llamada que la persona inició** (lo que abre una `screen`, un `screenEvent` o un `panelAction`), porque
  `kino.identity` solo responde ahí. Nunca desde un temporizador, Inicio, la búsqueda, reproducir o un trabajo en segundo
  plano. Mira [Cuándo se puede llamar](identity.md#when).
- **120 lecturas por hora por persona.** Más, y la bóveda responde `429`. Cada lectura gasta un desafío y un hit de cupo, así
  que **cachea** (en el ejemplo, `kino.storage` con TTL de ~1 h) y lee una vez por sesión, no en cada petición.
- Ten siempre una salida si falla: la persona puede apagar la identidad cuando quiera, o no ser miembro. **No dejes un
  secreto quemado en el código como respaldo** (eso rompe el anti-copia); muestra que falta el acceso.

## 4. Rotación { #rotation }

El secreto se guarda con un *upsert*: cuando lo editas en el panel, **la próxima lectura devuelve el valor nuevo** (del lado
del servidor es inmediato; del lado del plugin, lo acota tu caché). Rotar es solo editar el panel. Es la palanca anti-copia
más fuerte: si rotas el valor, cualquier copia que lo haya quemado queda vieja.

## 5. Qué protege y qué no { #trust }

El `author` y el `pluginId` del alcance hacen que:

- una copia **re-firmada con otra llave** presente otra huella de `author` → no coincide con la guardada → `403`;
- alguien que **no está en el grupo** → `403`.

Pero el `author` y el `pluginId` son **públicos** (están en tu `kino-plugin.json` público), y la firma va contra la
`deviceKey` que genera el aparato (sin una raíz que la ate al autor). Un **falsificador decidido** que copie tu `author` y tu
`pluginId` públicos **y** conozca el id de Telegram de un miembro real, puede leer. Por eso:

- guarda solo secretos **moderados** (mejor que el `plugin.js` público, no claves críticas);
- **no pongas un respaldo quemado** en el código;
- **rota** el secreto cuando haga falta.

Lo que sí te da, en conjunto: frena scrapers y no-miembros, frena forks honestos re-firmados, y la rotación mata copias que
quemaron el valor.

## 6. Errores { #errors }

| Código | Cuándo |
| --- | --- |
| `200` | Miembro y todo válido. `{ "secret": … }`. |
| `404` | No hay secreto guardado para ese `owner/repo` todavía. |
| `403` | La persona no está en el grupo, o el desafío/la firma no valen, o el `author`/`pluginId` no coinciden con el alcance guardado. |
| `429` | Más de 120 lecturas en una hora para esa persona. Haz *backoff* y usa tu caché. |
| `503` | La bóveda no pudo descifrar (problema de operación). Reintenta después. |

Detecta siempre `typeof kino.identity === "object"` y atrapa los errores: la lectura puede fallar porque la persona apagó la
identidad, no es miembro, o la bóveda está rotando. Nunca rompas la pantalla por eso.

## Resumen { #checklist }

- [ ] Tu plugin declara `apiVersion` 15 y la capacidad `identity`, y está **firmado** (Kino 0.9.88 o más nuevo para que un
      autor que no es Kino reciba la atestación).
- [ ] El repositorio es **público**, con topic `kino-plugin` y `kino-plugin.json` **firmado**.
- [ ] Guardaste el JSON en **<https://secrets.kinoverse.app>** (owner/admin del repo).
- [ ] Tu plugin lee con el flujo de arriba, **cachea** (~1 h) y **no** tiene un respaldo quemado.
