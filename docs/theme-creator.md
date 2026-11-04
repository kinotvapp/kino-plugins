# Creador de temas { #theme-creator }

Arma un [tema de la app](themes.md) viendo cómo queda. A la izquierda está Kino (el Inicio, el menú lateral, la búsqueda y un
diálogo) con datos de ejemplo; a la derecha, los valores del tema; abajo, el código que va escribiéndose. Parte del tema de Kino:
cada valor que muevas cambia la vista al instante, y lo que Kino descartaría (por contraste o por rango) se descarta también aquí
y se explica debajo, con las mismas palabras del kit.

Pulsa el menú de tres rayas para abrir el menú lateral y **Inicio** para volver al Inicio. Con **TV** ves el riel lateral y el foco.
También puedes escribir o pegar el JSON abajo: los controles se ponen al día con lo que escribas.

<div id="kino-theme-creator" data-lang="es"><noscript>El creador necesita JavaScript.</noscript></div>

## Cómo usar el resultado { #use }

1. Descarga `kino-plugin.json` (o copia el código) y ponlo en un repositorio nuevo de GitHub, junto con un `plugin.js` que solo
   diga `export {};`. Un plugin que solo trae temas no necesita capacidades ni hosts: [Un plugin que solo trae temas](themes.md#theme-only).
2. Pon el tópico `kino-plugin` al repositorio y [publícalo](publish.md).
3. Valida con `node sdk/validate.mjs .` (el [kit](test-locally.md)): imprime las mismas advertencias que ves aquí.

La vista previa es una aproximación de Kino hecha con HTML y CSS: sirve para escoger colores, formas y bordes, pero la última palabra
la tiene la app. Los valores de **Reproductor** se guardan en el tema aunque la vista previa solo muestre una barra pequeña. El logo
(`logo`), el precio (`price`), la experiencia (`experience`) y los ajustes de la persona (`adjustable`) se escriben a mano en el
código: mira [Temas de la app](themes.md).
