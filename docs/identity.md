# Identidad: saber quién es la persona sin un registro { #identity }

!!! note "Disponible con la próxima versión de Kino"
    `identity` es de `apiVersion` 15 y llega con la próxima versión de Kino (todavía sin publicar). Una versión anterior
    rechaza estos plugins con «Este plugin necesita una versión más nueva de Kino».

`identity` deja que el servidor de tu plugin sepa **quién es la persona sin pedirle un usuario ni una contraseña**. Es una
capacidad **declarativa** (no exportas nada nuevo), no puede ir sola (la usa una [pantalla](screens.md) o una acción del
[panel](player-panel.md)) y no se ofrece con [`enhancements`](enhancements.md): el plugin declara `apiVersion` 15 él mismo.

!!! warning "Solo los plugins firmados con la llave de autor de Kino"
    `kino.identity.telegram` **solo responde a plugins firmados con la llave de autor de Kino**
    (`07DA-B67F-2ACF-B4D3`; una compilación de depuración de Kino responde a cualquier autor, para desarrollar). El token
    sirve como inicio de sesión en cualquier servidor que confíe en el bot de Kino y su contenido nombra la cuenta de
    Telegram, así que un plugin de la comunidad recibe `permission_denied` aunque la persona lo haya aprobado. Si tu plugin
    no es de Kino, necesita otra forma de entrar; una llave de bot propia por plugin levantaría esta restricción.

```json
"capabilities": ["screen", "identity"]
```

## La llamada { #call }

```js
const { id, token } = await kino.identity.telegram();
```

- **`id`** es un **seudónimo de la persona para tu plugin**: los primeros 32 caracteres hex de SHA-256 sobre
  `"kino-identity-v1\n" + idDeTuPlugin + "\n" + idDeCuentaDeTelegram`. Es el mismo en todas las instalaciones y aparatos de la
  persona y **distinto en cada plugin**. Nunca recibes el id de Telegram ni el nombre de usuario.
- **`token`** es el token que el bot de Kino firmó para este aparato (`base64url(carga).base64url(firma Ed25519)`). Tu
  servidor lo verifica con la llave pública del bot. Todavía nombra la cuenta de Telegram, así que trátalo como una
  credencial: **nunca lo registres ni lo muestres**.

## Con un desafío: ligar la sesión a este aparato y a tu código { #challenge }

```js
const who = await kino.identity.telegram({ challenge }); // el nonce que emitió tu servidor
// who = { id, token, deviceKey, signature, author, codeHash }
```

`challenge` es un nonce de tu servidor: de 16 a 128 caracteres de `A-Z a-z 0-9 _ -`. Con él, Kino además **firma** (SHA256withECDSA,
curva P-256, con una llave propia no exportable de **tu plugin en esta instalación**, guardada en el Android Keystore, creada
al primer uso y que no se sincroniza ni se respalda) los bytes UTF-8 de:

```
"kino-identity-v2\n" + idDeTuPlugin + "\n" + challenge + "\n" + author + "\n" + codeHash
```

| Campo | Qué es |
| --- | --- |
| `deviceKey` | La llave pública (X.509 SubjectPublicKeyInfo DER), base64url sin relleno. |
| `signature` | La firma DER, base64url sin relleno. |
| `author` | La huella de la llave de autor que Kino verificó y fijó al instalar tu plugin firmado (por ejemplo `07DA-B67F-2ACF-B4D3`), o `""` en un plugin sin firma. |
| `codeHash` | El SHA-256 en hex minúscula del archivo de entrada que Kino corre (el motor rechaza un script cuyos bytes difieran). |

`author` y `codeHash` salen del registro que Kino tiene del plugin instalado, **nunca de tu código**. Por eso tu servidor puede:

1. emitir un `challenge` de un solo uso;
2. verificar el `token` con la llave pública del bot;
3. verificar la `signature` con `deviceKey` sobre los bytes de arriba;
4. **exigir su propia huella en `author`** (y, si quiere, un `codeHash` conocido): una copia modificada de tu plugin no puede
   iniciar sesión;
5. ligar la sesión a `deviceKey` y rechazar un token repetido.

Las llaves son por plugin: dos plugins no pueden reconocer a la misma persona por su llave. Una reinstalación crea una llave
nueva.

## Cuándo se puede llamar { #when }

Solo dentro de una llamada **que la persona inició**: lo que abre una `screen`, un `screenEvent` o un `panelAction`. Nunca
desde un temporizador de pantalla, un [trabajo en segundo plano](jobs-and-shared.md#jobs), Inicio, la búsqueda, reproducir
o la sincronización. Hasta **10 llamadas por minuto** por plugin.

## Errores { #errors }

`kino.identity.telegram` se rechaza con un error que lleva uno de estos `code`:

| `code` | Cuándo |
| --- | --- |
| `permission_denied` | La persona no la aprobó o la apagó, el plugin está desactivado, el interruptor del dueño, la llamada no es de las permitidas, o el plugin no está firmado con la llave de Kino. |
| `not_available` | Este aparato no tiene token (la persona debe validarse otra vez en Kino) o la llave no pudo firmar. |
| `rate_limited` | Más de 10 llamadas en un minuto. |
| `bad_request` | Opciones que no son un objeto, una clave desconocida o un `challenge` que no cumple el patrón. |

Detéctala con `typeof kino.identity === "object"` y **aun así** atrapa los errores. Ten siempre otra forma de entrar sin ella
(o muestra qué falta): la persona puede apagarla cuando quiera.

## Consentimiento { #consent }

La persona lee, **en rojo**, en la hoja de instalación y en la actualización que la agrega (Kino nunca la aprueba sola; en
una importación de kit viene sin marcar):

- «Podrá saber tu usuario de Telegram y enviarlo a sus servicios» (EN: "Can know your Telegram user and send it to its
  services").

Y en la pestaña de tu plugin en Ajustes tiene un interruptor, para todo el aparato y sus aparatos sincronizados: «Dejar que
sepa mi usuario de Telegram» ("Let it know my Telegram user").

## Probar con el kit { #kit }

El kit responde con una cuenta de mentira:

| Variable | Qué hace |
| --- | --- |
| `KINO_IDENTITY_TG=<id\|none>` | El id de la cuenta de Telegram falsa; `none` simula un aparato sin token (`not_available`). |
| `KINO_IDENTITY_TOKEN=<texto>` | El token que devuelve. |
| `KINO_IDENTITY_AUTHOR=<huella>` | El `author` que atesta (vacío por defecto: el kit no verifica ninguna firma de autor). |
| `KINO_IDENTITY_REVOKED=1` | La persona la apagó (`permission_denied`). |

```
KINO_IDENTITY_TG=401234567 node sdk/run.mjs --device phone . screenEvent open
```

El kit aplica las mismas puertas que la app (la capacidad, que la llamada sea de la persona, `bad_request`, 10 por minuto) pero
**no** la regla de la llave de autor de Kino: en el kit responde a cualquier plugin, así que pruébalo en la app, con un
plugin firmado, antes de depender de ella.

El contrato está en `contract.json` (`kinoIdentity`) y los tipos en `kino.d.ts`.

## Ejemplo trabajado: Kino Social { #example }

**Kino Social** (un experimento de Kino: un feed para contar lo que ves) es un plugin de pantalla que inicia sesión así,
sin pedir nada. Su servidor es propio (el plugin no guarda ninguna llave: todo lo firma Kino):

```js
// 1. Cuando la persona abre la pantalla: el desafío de un solo uso del servidor
const { challenge } = await post("/session/challenge", {});
// 2. Kino firma el desafío con la llave de este aparato y atesta quién pregunta
const who = await kino.identity.telegram({ challenge });
// 3. El servidor verifica token, firma, huella del autor y hash del código, y devuelve su propia sesión
const body = await post("/session", {
  token: who.token, challenge, deviceKey: who.deviceKey, signature: who.signature,
  author: who.author || "", codeHash: who.codeHash || "",
});
kino.storage.set("session", body.session, { ttlMs: SESSION_TTL_MS }); // la sesión es del servidor, no el token
```

Si `kino.identity` no existe o la llamada falla, la pantalla muestra que no se puede entrar en vez de romperse. La sesión es
la del servidor: el token de Telegram no se guarda ni se vuelve a enviar.
