# Plugins firmados { #signed }

Un **plugin firmado** lleva tu firma: una marca que solo tú puedes hacer, porque sale de una clave
privada que solo tú tienes. Kino comprueba esa marca antes de instalar tu plugin y en cada
actualización. Firmar es **opcional**, necesita **Kino 0.9.45 o más nuevo** y **`"apiVersion": 5` o más** (también sirve con 6, Kino 0.9.50),
y no cambia nada para los plugins que no lo usan.

!!! info "En una frase"
    Tu código sigue siendo JavaScript normal y legible. La firma solo demuestra que este código
    exacto viene de ti y que nadie lo cambió por el camino.

## Qué es, en palabras sencillas { #what }

Piensa en el sello de lacre de una carta. Creas **un par de claves** una sola vez:

- una **clave privada**, un archivo pequeño (`kino-author-key.pem`) que se queda en tu computador y
  que nunca compartes, y
- una **clave pública**, escrita dentro de tu `kino-plugin.json` (`authorKey`), que cualquiera puede
  leer.

Cada vez que publicas, corres un comando. Lee tu `plugin.js` y escribe una **firma** (`value`) en
`kino-plugin.json`. Kino usa la clave pública para comprobar que la firma de verdad la hizo la clave
privada, sobre ese código exacto. Si un solo byte de `plugin.js` es distinto, la comprobación falla
y el plugin no se instala.

**Firmar no es ofuscar.** No se oculta ni se cifra nada: cualquiera puede seguir leyendo tu
`plugin.js`. Para claves y tokens sigue usando los [secretos sellados](test-locally.md#secrets).

## Por qué importa { #why }

- **La gente sabe de quién viene y que no lo cambiaron.** Cuando alguien instala tu plugin, la
  pantalla de consentimiento dice **"Firmado por su autor"**. El catálogo y las tarjetas de la
  comunidad muestran la insignia **"Firmado"** (una tarjeta instalada dice "Activo · Firmado"), y los
  detalles del plugin muestran **"Clave del autor: ABCD-EF01-2345-6789"** (celular: Gestionar; TV:
  las acciones del plugin instalado).
- **Confianza en el primer uso: Kino recuerda tu clave.** La primera vez que alguien instala tu
  plugin, Kino fija tu clave de autor. Desde entonces **toda actualización tiene que estar firmada
  con la misma clave**. Una actualización firmada con otra clave, o que ya no viene firmada, se
  rechaza. Eso protege a tus usuarios si alguien se apodera de tu cuenta o repositorio de GitHub y
  trata de publicar otro código: sin tu clave privada, su actualización no se instala.
- **Es opcional y compatible hacia atrás.** Los plugins sin firma siguen funcionando, en cualquier
  apiVersion. Uno firmado simplemente gana más confianza. Un plugin sin firma que pasa a estar
  firmado le pide a la persona aprobar la actualización otra vez.

Lo que **no** hace: no vuelve confiable la *primera* instalación, no te protege si tu clave privada
se filtra, y no esconde tu código.

## Cómo firmar, paso a paso { #how }

Necesitas el kit de Node que viene con los plugins de ejemplo (la carpeta `sdk/`). Si empezaste
desde [un ejemplo](examples.md), ya lo tienes.

1. **Crea tu clave, una sola vez.** Desde la carpeta de tu plugin:

    ```bash
    node sdk/seal.mjs --keygen
    ```

    Escribe `kino-author-key.pem` (legible solo por ti) e imprime su huella. Si el archivo ya
    existe, se niega a sobrescribirlo.

2. **Mantén la clave fuera de git.** Agrega `*.pem` a tu `.gitignore` **antes** de tu próximo
   commit. El
   `.gitignore` del andamiaje cubre los archivos locales del kit pero no `*.pem`, y `--keygen` no lo
   edita. Mira [la clave](#key) más abajo.

3. **Pon el apiVersion.** En `kino-plugin.json`:

    ```json
    "apiVersion": 5,
    "entry": "plugin.js"
    ```

4. **Firma.** Después del último cambio en `plugin.js` y en `version`:

    ```bash
    node sdk/seal.mjs --sign --repo owner/repo
    ```

    Escribe `"signature": { "authorKey": "<64 hex>", "value": "<128 hex>" }` en
    `kino-plugin.json`. Para un plugin en una carpeta del repositorio usa
    `--repo owner/repo/carpeta`. Las opciones `--manifest` y `--key` cambian el manifiesto y el
    archivo de clave (por defecto: `kino-plugin.json`, `kino-author-key.pem`).

5. **Comprueba.**

    ```bash
    node sdk/validate.mjs . --repo owner/repo
    ```

    Verifica la firma, los exports y que ningún `*.pem` esté rastreado por git. Sin `--repo` lee el
    repositorio del `origin` de GitHub de la carpeta.

6. **Haz commit y push** de `plugin.js` y `kino-plugin.json` (nunca del `.pem`).

### Qué cubre la firma, y por qué hay que firmar otra vez { #covers }

La firma se hace sobre este texto:

```
kino-signed-entry:v1
<owner/repo[/carpeta], en minúsculas>
<id>
<version>
<sha256 de plugin.js>
```

Así que cubre tu **`plugin.js` exacto**, el **repositorio** (y la carpeta), el **`id`** del plugin y
la **`version`**. Dos consecuencias:

- **Firma otra vez después de cualquier cambio** en `plugin.js` o en `version`, aunque sea un
  comentario o un espacio. `validate.mjs` falla hasta que lo hagas.
- La firma no se puede copiar a otro repositorio, otro plugin u otra versión.

La rama o el tag *no* forman parte de ella: un plugin firmado se instala desde cualquier rama o tag.

Kino comprueba la firma **al instalar y al actualizar**, nunca mientras el plugin corre, así que no
cuesta nada en ejecución. Kino 0.9.44 y anteriores rechazan un manifiesto con `apiVersion` 5 ("Este
plugin necesita una versión más nueva de Kino"). Por debajo de apiVersion 5 el campo `signature` se
ignora.

### El mismo plugin en dos direcciones { #two-addresses }

Un plugin normalmente se conoce por la dirección exacta desde la que se instaló: el mismo `id` desde
otro repositorio es otro plugin (una segunda instalación de ese `id` se rechaza con "Ya hay un plugin
con ese id"). Un plugin firmado es la excepción (Kino 0.9.50): cuando la persona tiene tu plugin desde un
repositorio en su celular y desde otro en su TV, las dos instalaciones son **el mismo plugin** si tienen
el mismo `id` y las dos fijaron la **misma llave de autor**. Entonces encenderlo o apagarlo, los hosts
aprobados, los ajustes y las contraseñas (selladas de punta a punta, por ajuste) y una desinstalación se
sincronizan entre esos aparatos en los dos sentidos, igual que con una sola dirección. Cada aparato
conserva la dirección desde la que instaló y se sigue actualizando desde ella; nada se mueve.

- Una instalación sin firma en cualquiera de los dos lados, u otra llave, conserva la regla de la
  dirección exacta: nunca se unen, y ninguna recibe los ajustes ni las contraseñas de la otra.
- Los `secrets` sellados de tu manifiesto quedan atados a cada repositorio y nunca viajan entre
  aparatos: firma y sella el manifiesto de cada repositorio para ese repositorio.
- Si publicas el mismo plugin en dos direcciones (una mudanza, un espejo), firma las dos con la misma
  llave.
- En la lista de recomendados, una entrada que nombra tu llave (`"signed": true, "authorKey": "<64 hex>"`)
  dice "Instalado" para quien ya tiene tu plugin desde tu otro repositorio; cualquier otro plugin con
  ese `id` instalado ahí hace que la entrada diga "Ya tienes otro plugin con ese id" ("No disponible",
  nada que instalar).

## Cuida tu clave privada { #key }

- **Nunca la subas a git, nunca la compartas.** Pon `*.pem` en el `.gitignore`. El `validate.mjs`
  del kit falla si un archivo `.pem` está rastreado por git. Si alguna vez se filtra, trátala como
  perdida (abajo) y crea una nueva.
- **Haz una copia de seguridad** en un lugar privado (un gestor de contraseñas, un disco cifrado).
  El kit escribe la clave en la carpeta desde la que lo corres (`kino-author-key.pem` por defecto);
  ese archivo solo existe en tu computador.
- **No hay recuperación.** Kino no guarda ninguna copia y nadie puede regenerarla. `--keygen` se
  niega a sobrescribir un archivo existente, y una clave nueva es otra identidad.

### Si pierdes la clave, o la cambias { #lost }

Kino fijó la clave vieja en la primera instalación de cada persona, así que **un plugin firmado con
una clave nueva se rechaza para todos los que ya lo tienen instalado**: ven *"Esta versión está
firmada con otra clave de autor, así que no se instala. Si confías en el cambio, desinstala el
plugin y vuelve a instalarlo."* La única salida es que cada persona **desinstale tu plugin y lo
instale de nuevo**, lo que fija la clave nueva. Las instalaciones nuevas no se ven afectadas.

Una actualización que **quita la firma** se rechaza igual (*"Esta versión ya no está firmada por su
autor..."*), también hasta que la persona reinstale. Así que una vez que firmas, sigue firmando
todas las versiones.

!!! warning "No documentado en el repositorio de Kino"
    La documentación de Kino no describe ningún otro camino de recuperación (por ejemplo, rotar la
    clave sin reinstalar). Planea como si no existiera.

## Cuando algo falla { #troubleshooting }

| Mensaje | Qué significa y qué hacer |
| --- | --- |
| `El campo "signature" debe ser { "authorKey": 64 caracteres hex, "value": 128 caracteres hex } (node sdk/seal.mjs --sign)` | El campo `signature` está mal formado: debe tener exactamente `authorKey` (64 caracteres hex) y `value` (128 caracteres hex). No lo escribas a mano: corre `node sdk/seal.mjs --sign --repo owner/repo`. |
| `La firma del autor no es válida: el código no es el que firmó, o no es para este repositorio, este plugin o esta versión` | La firma no coincide. O `plugin.js` cambió después de firmar, o cambió el `id` o la `version`, o firmaste para otro repositorio (`--repo` equivocado). Firma otra vez con el `--repo` correcto y comprueba con `validate.mjs`. |
| `Esta versión está firmada con otra clave de autor, así que no se instala. Si confías en el cambio, desinstala el plugin y vuelve a instalarlo.` | Lo ve una persona que tiene tu plugin instalado cuando una actualización trae una clave distinta de la fijada. Usa la clave original; si la perdiste, tienen que reinstalar ([arriba](#lost)). |
| `Esta versión ya no está firmada por su autor, así que no se instala. Si confías en el cambio, desinstala el plugin y vuelve a instalarlo.` | Llegó una actualización sin firma aunque la versión instalada la tenía. Firma todas las versiones. |
| `Este plugin necesita una versión más nueva de Kino` | El Kino de la persona es anterior a 0.9.45 y tu manifiesto dice `"apiVersion": 5`. |
| `<archivo> is tracked by git: anyone can read your author key on GitHub...` (kit) | Hay un `.pem` en un commit. `git rm --cached <archivo>`, agrega `*.pem` al `.gitignore` y, como se filtró, crea una clave nueva (todos reinstalan). |
| `<manifiesto> needs "apiVersion": 5 or newer to carry a signature` (kit) | `--sign` necesita `"apiVersion": 5` en el manifiesto primero. |
| `no author key at kino-author-key.pem: create one once with node sdk/seal.mjs --keygen` (kit) | Todavía no has creado la clave (o `--key` apunta al archivo equivocado). |

Mira también: [el campo `signature` del manifiesto](manifest.md#signature), [publicar](publish.md#checklist)
y [crear con IA](ai.md).
