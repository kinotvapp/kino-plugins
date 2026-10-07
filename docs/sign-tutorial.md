# Firma tu plugin, paso a paso { #sign-tutorial }

Este tutorial te lleva de un plugin sin firma a uno **firmado y publicado**, y después por cada
actualización. Si quieres entender primero qué es una firma y qué protege, lee
[Plugins firmados](signed.md); aquí solo están los pasos.

!!! info "Lo que vas a lograr"
    Quien instale tu plugin verá **"Firmado por su autor"** en la ventana de instalación, y Kino
    rechazará cualquier actualización que no venga de tu clave, aunque alguien entre a tu cuenta de
    GitHub.

## Antes de empezar { #before }

Necesitas:

- **Node.js 18 o más nuevo** (`node --version`).
- **El kit `sdk/`** dentro de la carpeta del plugin. Si creaste tu repositorio desde
  [un ejemplo](examples.md) con "Use this template", ya lo tienes.
- Tu plugin en un **repositorio público de GitHub**. La firma queda atada a ese repositorio: solo
  vale cuando el plugin se instala desde ahí, no desde una URL de manifiesto en otro servidor.
- **Kino 0.9.45 o más nuevo** en los aparatos de quienes lo instalen.

En los comandos de abajo, cambia `tu-usuario/tu-plugin` por tu repositorio.

## Paso 1: crea tu clave (una sola vez) { #step-key }

La clave es tuya para siempre: la vas a usar en todas las versiones de este plugin. Créala **fuera
del repositorio**, en una carpeta privada:

```bash
mkdir -p ~/.config/kino && chmod 700 ~/.config/kino
cd ~/.config/kino
node /ruta/a/tu-plugin/sdk/seal.mjs --keygen
chmod 600 kino-author-key.pem
```

El comando escribe `kino-author-key.pem` e imprime su **huella**, algo como
`07DA-B67F-2ACF-B4D3`. Anótala: es la que Kino mostrará en los detalles de tu plugin.

!!! warning "Haz una copia de seguridad ahora"
    Guarda `kino-author-key.pem` en un gestor de contraseñas o en un disco cifrado. **No hay forma de
    recuperarla**: si la pierdes, Kino rechaza tus actualizaciones y cada persona tiene que
    desinstalar tu plugin e instalarlo otra vez ([qué pasa](signed.md#lost)).

    Usa una clave nueva solo para esto: no reutilices tu clave SSH de GitHub ni ninguna otra.

## Paso 2: protege el repositorio { #step-gitignore }

Aunque la clave vive fuera del repositorio, agrega `*.pem` al `.gitignore` por si algún día la copias
ahí por error:

```bash
cd /ruta/a/tu-plugin
echo '*.pem' >> .gitignore
```

El kit también te protege: `validate.mjs` falla si un `.pem` está en git.

## Paso 3: sube el apiVersion { #step-api }

La firma necesita **`"apiVersion": 5` o más** en `kino-plugin.json`. Si tu plugin ya usa 6, 7 u 8,
déjalo así:

```json
"apiVersion": 8,
"entry": "plugin.js"
```

## Paso 4: firma { #step-sign }

Siempre **después** del último cambio a `plugin.js` y a `version`:

```bash
node sdk/seal.mjs --sign --repo tu-usuario/tu-plugin --key ~/.config/kino/kino-author-key.pem
```

El comando escribe en tu `kino-plugin.json`:

```json
"signature": { "authorKey": "<64 caracteres hex>", "value": "<128 caracteres hex>" }
```

- `authorKey` es tu clave **pública**: está bien que sea visible.
- Si tu plugin vive en una carpeta del repositorio, usa `--repo tu-usuario/tu-repo/carpeta`.
- No edites `signature` a mano.

## Paso 5: comprueba { #step-check }

```bash
node sdk/validate.mjs . --repo tu-usuario/tu-plugin
```

Tiene que terminar en `✓ Kino would accept this plugin` y mostrar
`Clave del autor: XXXX-XXXX-XXXX-XXXX` con la huella del paso 1. Si dice que la firma no es válida,
mira [Cuando algo falla](signed.md#troubleshooting).

## Paso 6: publica { #step-publish }

Sube `kino-plugin.json` (con la firma) y `plugin.js`. Un tag ayuda a que la gente pueda fijar una
versión:

```bash
git add kino-plugin.json plugin.js .gitignore
git commit -m "Signed release 1.0.0"
git tag v1.0.0
git push origin main v1.0.0
```

GitHub tarda hasta unos cinco minutos en servir los archivos nuevos.

## Paso 7: compruébalo en Kino { #step-kino }

1. En Kino, **Plugins ▸ Agregar plugin**, escribe `tu-usuario/tu-plugin`.
2. La ventana de instalación tiene que decir **"Firmado por su autor"**.
3. Después de instalar, los detalles del plugin (celular: Gestionar; TV: las acciones del plugin)
   muestran **"Clave del autor"** con tu huella.

Desde esa primera instalación, Kino recuerda tu clave para esa persona.

## Cada actualización { #updates }

Repite siempre estos cuatro pasos, en este orden:

1. Haz tus cambios en `plugin.js`.
2. **Sube `version`** en `kino-plugin.json` (por ejemplo `1.0.0` → `1.0.1`). Sin eso, nadie recibe la
   actualización.
3. **Firma otra vez** con la misma clave ([paso 4](#step-sign)) y comprueba ([paso 5](#step-check)).
4. Commit, tag y push ([paso 6](#step-publish)).

La firma cubre tu `plugin.js` exacto, el `id`, la `version` y el repositorio: cambiar un solo byte,
aunque sea un comentario, la invalida. Si cambias solo el README o las capturas, no hace falta firmar
otra vez.

!!! tip "Una vez que firmas, firma siempre"
    Una actualización **sin firma** o con **otra clave** se rechaza para todos los que ya tienen tu
    plugin. Si tu plugin estaba publicado sin firma y empiezas a firmarlo, Kino le pide a cada persona
    aprobar esa actualización una vez.

## Lista rápida { #checklist }

- [ ] La clave está fuera del repositorio y tiene copia de seguridad.
- [ ] `*.pem` está en `.gitignore`.
- [ ] `"apiVersion"` es 5 o más.
- [ ] Firmaste **después** del último cambio a `plugin.js` y a `version`.
- [ ] `validate.mjs --repo …` dice `✓` y muestra tu huella.
- [ ] La ventana de instalación de Kino dice "Firmado por su autor".

## Un ejemplo real { #example }

[Internet Archive Audio](https://github.com/kinotvapp/kino-plugin-archive-audio) está firmado así
(huella `07DA-B67F-2ACF-B4D3`): mira el bloque `signature` de su `kino-plugin.json`.

Mira también: [Plugins firmados](signed.md) (qué protege la firma, cómo cuidar la clave, mensajes de
error), [el campo `signature` del manifiesto](manifest.md#signature) y [Publicar](publish.md).
