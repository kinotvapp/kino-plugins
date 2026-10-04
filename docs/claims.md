# Reclamos y retiro de plugins { #claims }

Kino es un reproductor: no aloja, no vende ni distribuye contenido. La lista de plugins de la comunidad es un índice automático de repositorios públicos de terceros que usan la etiqueta kino-plugin; Kino no los revisa, no los recomienda ni los promociona, y cada autor es responsable de su propio plugin. Si un plugin infringe tus derechos, es dañino o incumple las reglas para plugins (por ejemplo, usa `userMessage` para pedir plata, contraseñas o datos de contacto), abre un issue en github.com/kinotvapp/kino-plugins/issues indicando el repositorio y el motivo. Lo retiramos del índice en un plazo máximo de 5 días hábiles y dejamos constancia pública en el historial del repositorio. Los autores pueden pedir la revisión de un retiro por el mismo medio.

## Cómo hacer un reclamo { #how }

1. Abre un issue en [github.com/kinotvapp/kino-plugins/issues](https://github.com/kinotvapp/kino-plugins/issues/new/choose)
   con la plantilla **"Reclamo / retiro de plugin"**. Los reclamos solo se reciben así, en público; no
   hay correo.
2. Llena los tres campos:
    - **Repositorio**: el plugin, como `owner/nombre` (el que aparece en "De la comunidad").
    - **Motivo**: qué derecho infringe, por qué es dañino o qué regla para plugins incumple.
    - **Enlace a la prueba**: dónde se ve lo que reclamas.
3. No pongas datos personales que no quieras que sean públicos: el issue lo puede leer cualquiera.

## Qué hace Kino { #what-kino-does }

- Agrega el repositorio a [`community-blocklist.json`](https://github.com/kinotvapp/kino-plugins/blob/main/community-blocklist.json),
  en la raíz de este repositorio, en un plazo máximo de 5 días hábiles. Cada entrada dice el repositorio,
  el motivo, la fecha y el enlace al issue. Los motivos:
    - `claim`: infringe los derechos de alguien;
    - `malware`: es dañino;
    - `broken`: no funciona;
    - `rules`: incumple las reglas para plugins, por ejemplo un `userMessage` que pide plata, contraseñas o
      datos de contacto ([Contrato](contract.md#user-message));
    - `author_request`: lo pidió su autor.

  El
  historial de git de ese archivo es la constancia pública.
- La app descarga esa lista y la aplica:
    - un repositorio de la lista nunca aparece en "De la comunidad" ni en la lista de respaldo;
    - un plugin de la lista que alguien ya tiene instalado sigue funcionando, pero su tarjeta dice
      "Retirado del índice de la comunidad." y deja de recibir actualizaciones desde su repositorio. No se
      desinstala a la fuerza.
    - instalarlo escribiendo su dirección (`owner/repo` o la URL de su manifiesto) sigue funcionando.
- La comparación del repositorio no distingue mayúsculas de minúsculas. Un fork de un repositorio
  retirado no queda retirado automáticamente: necesita su propio reclamo.

## Si eres el autor { #appeal }

Pide la revisión del retiro por el mismo medio: un issue en
[github.com/kinotvapp/kino-plugins/issues](https://github.com/kinotvapp/kino-plugins/issues), enlazando
el issue original y explicando qué cambió. Si se acepta, el repositorio sale de la lista con otro commit,
también público. Para retirar tu propio plugin del índice, abre el issue con motivo "a pedido del autor"
(`author_request`), o pon `"discoverable": false` en tu manifiesto ([Manifiesto](manifest.md)).

## Plugins de la comunidad y plugins recomendados { #community }

La app muestra la sección de la comunidad con la nota "Plugins de la comunidad — Kino no los revisa ni
responde por su contenido." Los plugins recomendados son otra lista, corta y mantenida por Kino
([Plugins de ejemplo](examples.md)); los de la comunidad aparecen solos cuando cumplen los
[requisitos de descubrimiento](publish.md#get-found).
