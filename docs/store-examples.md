# Tiendas de ejemplo { #store-examples }

!!! note "Disponible con la próxima versión de Kino"
    Las tiendas de plugins son de `apiVersion` 15 y llegan con la próxima versión de Kino (todavía sin publicar). Antes,
    lee [Tiendas de plugins](plugin-stores.md).

Dos plugins completos que puedes copiar y cambiar. Los dos pasan `node sdk/validate.mjs .`, traen pruebas que corren sin red
con el kit y usan hosts de ejemplo (`raw.githubusercontent.com/your-user/…`, `plugins.example.org`): cambia `hosts`, la
dirección de tu lista y tus datos. Quien publica una tienda responde por lo que lista; Kino solo lo muestra, con su lista de
bloqueo y el código +18.

Para empezar de cero: `node sdk/init.mjs mi-tienda --host mi-sitio.example --store local` (o `--store live`).

## Tienda local: un archivo JSON estático { #local }

La lista completa es un archivo (`plugins.json`) que publicas donde quieras por https; el plugin lo descarga en `storeSync`
y le entrega a Kino toda la lista (`full: true`), o un cambio vacío si el archivo no cambió. Kino nunca le pregunta nada
mientras la persona navega.

Descargas: [`kino-plugin.json`](store-examples/store-local/kino-plugin.json) ·
[`plugin.js`](store-examples/store-local/plugin.js) · [`plugins.json`](store-examples/store-local/plugins.json) ·
[`test/store.test.mjs`](store-examples/store-local/test/store.test.mjs)

**`kino-plugin.json`**

```json
--8<-- "store-examples/store-local/kino-plugin.json"
```

**`plugin.js`**

```js
--8<-- "store-examples/store-local/plugin.js"
```

**`plugins.json`** (el archivo que publicas)

```json
--8<-- "store-examples/store-local/plugins.json"
```

## Tienda en vivo: su propia API { #live }

Además de `storeSync` (una lista base: sus destacados), responde mientras la persona navega: `storeList` (una página de una
categoría, populares o recientes) y `storeSearch`. Una tienda en vivo **debe exportar las tres funciones**. La persona ve, en
rojo, que lo que busque en la tienda llegará a sus servidores. Cómo la mezcla Kino con las demás tiendas:
[Tiendas de plugins](plugin-stores.md#mixing).

Descargas: [`kino-plugin.json`](store-examples/store-live/kino-plugin.json) ·
[`plugin.js`](store-examples/store-live/plugin.js) · [`sample-api.json`](store-examples/store-live/sample-api.json) ·
[`test/store.test.mjs`](store-examples/store-live/test/store.test.mjs)

**`kino-plugin.json`**

```json
--8<-- "store-examples/store-live/kino-plugin.json"
```

**`plugin.js`**

```js
--8<-- "store-examples/store-live/plugin.js"
```

**`sample-api.json`** (lo que responde la API inventada de la prueba)

```json
--8<-- "store-examples/store-live/sample-api.json"
```

## Probarlas { #try }

Copia la carpeta de un ejemplo, mete dentro `sdk/` y `contract.json` del [kit](https://github.com/kinotvapp/kino-plugin-sdk)
y corre:

```
node sdk/validate.mjs .
node --test test/store.test.mjs                  # sin red: la lista sale de un archivo de muestra
node sdk/run.mjs . storeSync                     # con red: descarga la lista de verdad
node sdk/run.mjs . storeList popular series      # tienda en vivo
node sdk/run.mjs . storeSearch "anime"           # tienda en vivo
```

## Otros ejemplos { #others }

- **Kino Plugins**, la tienda que viene en la app, es una tienda **local** real que combina una lista que trae consigo, un
  índice diario y cambios pequeños: [Tiendas de plugins](plugin-stores.md#kino-plugins).
- **Kino Social**, un plugin de pantalla de Kino, es el ejemplo trabajado de [`identity`](identity.md#example) y de
  [`notifications`](notifications.md#example).
