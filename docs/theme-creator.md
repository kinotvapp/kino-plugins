# Creador de temas { #theme-creator }

Arma un [tema de la app](themes.md) viendo cómo queda, con un asistente de IA que además **dibuja su logo en SVG** (el icono del
tema). A la izquierda está Kino (el Inicio, el menú lateral, la búsqueda y un diálogo) con datos de ejemplo, y debajo el logo
puesto en la app; a la derecha, los valores del tema; abajo, el código que va escribiéndose. Parte del tema de Kino: cada valor
que muevas cambia la vista al instante, y lo que Kino descartaría (por contraste o por rango) se descarta también aquí y se
explica debajo, con las mismas palabras del kit.

Pulsa el menú de tres rayas para abrir el menú lateral y **Inicio** para volver al Inicio. Con **TV** ves el riel lateral y el foco.
También puedes escribir o pegar el JSON abajo: los controles se ponen al día con lo que escribas.

<div id="kino-theme-creator" data-lang="es" data-gh-proxy="https://kino-theme-creator-oauth.juanpry2345tjlfm.workers.dev"><noscript>El creador necesita JavaScript.</noscript></div>

## El logo y el asistente de IA { #logo-ai }

El logo de un tema ([`logo`](themes.md#logo)) es **solo vectores**: un `wordmark` (el logo largo del menú y la cabecera), una
`mark` (el cuadrado del riel del TV) y un `decor` que se dibuja encima de la «o» del logo de Kino. El creador los dibuja de
verdad: en la cabecera y el menú del celular, en el riel del TV y en la tira **Tu logo en la app**, debajo de la vista previa.

Pídeselo al asistente con tus palabras («un icono de rayo neón», «una marca de ola para mi tema azul») y él escribe los trazos.
Mientras trabaja verás **en qué paso va**: preparando la petición, consultando a la IA, leyendo la respuesta, revisando los
valores y actualizando la vista previa. Cada valor que propone se comprueba antes de aplicarlo, con las reglas del contrato: de 1
a 8 trazos de hasta 2.000 caracteres cada uno, solo comandos de trazo SVG (`M L H V C S Q T A Z`), un lienzo de 1.000 × 1.000 como
mucho y como mucho 8 veces más ancho que alto, y el relleno entre `accent`, `onAccent`, `textPrimary`, `textSecondary` o un
`#RRGGBB`. Lo que no cumpla no se aplica y se dice debajo, con el motivo.

El logo también puede venir en el JSON que pegues, y sale en el código y en el `kino-plugin.json` que descargas. En la sección
**Logo e icono** de la derecha puedes ver el tamaño y los trazos de cada pieza y quitarlas una por una.

## Publicar el plugin desde el creador { #github }

El panel **Publicar en GitHub** crea el repositorio del plugin y sube `kino-plugin.json`, `plugin.js` (con `export {};`) y un
`.gitignore`, sin salir de esta página. También escribe la descripción del repositorio y, si dejas marcada la casilla, le pone el
topic **`kino-plugin`**, que es la única forma en que Kino descubre un plugin: el repositorio tiene que ser público y no un fork
([Publicar tu plugin](publish.md#appear-in-the-app)). Al terminar te dice el `usuario/repositorio` que se escribe en Kino.

Hay dos formas de entrar, y las dos se hacen desde tu navegador, que habla directo con `api.github.com` (el token no pasa por
ningún servidor de este sitio):

- **Entrar con GitHub** (recomendado): el flujo de dispositivo de GitHub. La página muestra un código, lo escribes en
  `https://github.com/login/device` y autorizas el permiso `public_repo`. Aquí no hay ningún secreto de cliente.
- **Un token**: un token personal con el permiso `public_repo`, pegado en el campo. Se guarda solo en esa pestaña y se borra al
  cerrarla. Sirve siempre, incluso sin configurar nada.

### Cómo está configurado { #github-setup }

La entrada con GitHub necesita un proxy mínimo, porque `github.com/login/*` no manda cabeceras CORS y una página estática no puede
guardar un secreto de cliente. Es un Worker de Cloudflare de un solo archivo, en
[`github-oauth-worker/`](https://github.com/kinotvapp/kino-plugins/tree/main/github-oauth-worker), ya desplegado y en uso por esta
página: `https://kino-theme-creator-oauth.juanpry2345tjlfm.workers.dev`.

Lleva dentro el Client ID, el scope `public_repo` y `https://kinotvapp.github.io` como único origen permitido, así que no tiene
variables ni secretos que configurar. Abre su URL y responde `{"ok":true}`; acepta `POST /device` y `POST /token`, y a cualquier
otro origen le contesta 403.

**Si haces tu propia copia del sitio**, necesitas tu propia OAuth App y tu propio Worker:

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**:
    - **Homepage URL**: `https://kinotvapp.github.io/kino-plugins/`
    - **Authorization callback URL**: `https://kinotvapp.github.io/kino-plugins/theme-creator/` (el flujo de dispositivo no
      redirige, así que no se usa; el formulario la pide igual).
    - En la página de la app, marca **Enable device flow**. Sin eso GitHub responde `device_flow_disabled`.
    - Copia el **Client ID**. Para este flujo no hace falta el secreto.
2. Despliega `github-oauth-worker/`. Tu Client ID, el scope y el origen permitido van dentro de `worker.mjs`, así que no hay
   variables que configurar: pega el archivo en un Worker desde el panel de Cloudflare (Workers & Pages → **Create** →
   **Worker** → **Edit code** → **Deploy**) o despliega la carpeta con `npx wrangler deploy`. Abre la URL del Worker en otra
   pestaña: si responde `{"ok":true}`, está vivo.
3. Pega la URL de tu Worker en el atributo `data-gh-proxy` del contenedor del creador, en esta página y en la inglesa, y añade
   el origen de tu sitio a `ALLOWED_ORIGINS` en `worker.mjs`:

    ```html
    <div id="kino-theme-creator" data-lang="es" data-gh-proxy="https://kino-theme-creator-oauth.TU-CUENTA.workers.dev">…</div>
    ```

Sin ese atributo el panel oculta «Entrar con GitHub» y explica cómo configurarlo; el token sigue funcionando.

## Cómo usar el resultado { #use }

1. Descarga `kino-plugin.json` (o copia el código) y ponlo en un repositorio nuevo de GitHub, junto con un `plugin.js` que solo
   diga `export {};`, o deja que el panel **Publicar en GitHub** lo haga por ti. Un plugin que solo trae temas no necesita
   capacidades ni hosts: [Un plugin que solo trae temas](themes.md#theme-only).
2. Pon el tópico `kino-plugin` al repositorio y [publícalo](publish.md).
3. Valida con `node sdk/validate.mjs .` (el [kit](test-locally.md)): imprime las mismas advertencias que ves aquí.

La vista previa es una aproximación de Kino hecha con HTML y CSS: sirve para escoger colores, formas y bordes, pero la última palabra
la tiene la app. Los valores de **Reproductor** se guardan en el tema aunque la vista previa solo muestre una barra pequeña. El precio
(`price`), la experiencia (`experience`) y los ajustes de la persona (`adjustable`) se escriben a mano en el código: mira
[Temas de la app](themes.md).
