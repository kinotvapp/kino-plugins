# Publicar tu plugin

## Para aparecer en la app, dos cosas { #appear-in-the-app }

La gente siempre puede instalar tu plugin escribiendo `usuario/repositorio`, o pegando la URL de su
`kino-plugin.json` ([más abajo](#manifest-url)). Para que **aparezca solo**
en Kino (Ajustes ▸ Plugins ▸ "De la comunidad", y en "Elige tus fuentes" la primera vez), necesitas:

1. **El topic `kino-plugin` en el repositorio de GitHub.** Es la única forma en que la app descubre un
   plugin. Ponlo en el repositorio que tiene `kino-plugin.json` (About ▸ ⚙ ▸ Topics), y mantén el
   repositorio público y que no sea un fork.
2. **Una `description` en `kino-plugin.json`** (hasta 300 caracteres). Es el texto de tu tarjeta en la
   app; sin ella la tarjeta queda sin texto. (La descripción del repositorio de GitHub no la lee la
   app, pero ponla también, para quien abra tu repositorio.)

Un solo comando pone el topic y la descripción del repositorio:

```
gh repo edit OWNER/REPO --add-topic kino-plugin --description "Qué hace tu plugin, en una línea"
```

Paso a paso, con los clics exactos y cómo comprobarlo: [Aparecer en Kino](listed.md).

Después espera: Kino actualiza la lista como máximo cada 12 horas por dispositivo, o al instante
cuando la persona toca "Actualizar". Si aun así no aparece, mira
[«Mi plugin no aparece»](#troubleshooting) y [Cada requisito, uno por uno](#discovery-requirements).

1. **Crea un repositorio público de GitHub** y pon `kino-plugin.json` y tu archivo de entrada (por
   ejemplo `plugin.js`) en la raíz, más un `icon.png` opcional y un `README.md`. Agrega
   `.kino-storage.json` al `.gitignore`. (Un plugin también puede vivir en una subcarpeta; la gente
   escribe entonces `owner/repo/sub/dir`.)
2. **La gente lo instala** en Kino desde Ajustes > Plugins, escribiendo `owner/repo` en el campo
   ("Escribe usuario/repositorio de GitHub o pega la URL del manifest (kino-plugin.json)") y tocando
   "Agregar". Para apuntar a una versión, escriben `owner/repo@v1.0.0`. Ponle tags a tus versiones para
   que la gente pueda fijarlas. También pueden pegar la URL de tu `kino-plugin.json` en GitHub, en
   raw.githubusercontent.com o en jsDelivr (`https://cdn.jsdelivr.net/gh/owner/repo@v1.0.0/kino-plugin.json`;
   jsDelivr necesita una ref exacta como `@main` o `@v1.0.0`, `@latest` es la rama por defecto y un
   rango como `@1` se rechaza): Kino convierte cualquiera de esas en la dirección del repositorio
   ([todas las direcciones que Kino acepta](index.md#what-a-plugin-is)).
3. **Un repositorio privado no se puede instalar.** Kino lee tus archivos desde
   `raw.githubusercontent.com` sin ninguna credencial, y GitHub responde "not found" para un
   repositorio privado. Haz público el repositorio, o el plugin no se puede instalar.
4. <span id="updates"></span>**Para sacar una actualización, sube `version`** (un `MAJOR.MINOR.PATCH`
   estrictamente mayor; un número igual o menor se toma como "ya está al día", así que un arreglo sin
   subir la versión nunca le llega a nadie). Kino busca actualizaciones máximo una vez al día por
   plugin, y cuando la persona toca "Buscar actualización". Desde Kino 0.9.50 también revisa todos los
   plugins instalados al abrir la app (máximo una vez cada 12 horas).
    - Si la versión nueva no agrega nada a `hosts`, `permissions`, `download`, `drm` ni un host
      `insecureHttp`, y necesita un `apiVersion` soportado, se instala en silencio.
    - Si `hosts` o `permissions` crecen, o el manifiesto declara por primera vez `download`, `drm`, o
      marca como `insecureHttp` un host ya aprobado, Kino **no** la aplica: el plugin muestra
      "Actualización disponible — requiere tu aprobación" y la persona ve lo nuevo (marcado "nuevo")
      antes de aceptar. Quitar cosas no necesita aprobación.
    - Un ajuste **obligatorio** nuevo no bloquea la actualización: se instala y el plugin muestra
      "Falta configurar" hasta que la persona lo llene.
    - Si la versión nueva necesita un `apiVersion` más alto del que soporta la app, la revisión dice
      "Este plugin necesita una versión más nueva de Kino" y la versión instalada sigue funcionando.
    - Mientras una actualización espera la aprobación, la entrada Plugins de Ajustes muestra una
      insignia con cuántas esperan (celular y TV), y una llamada fallida de ese plugin dice "Hay una
      versión nueva de &lt;nombre&gt;: actualízala en Ajustes ▸ Plugins" en vez del error de siempre
      (le siguen ganando un host rechazado, tu [`userMessage`](contract.md#user-message) y
      `auth_required`). Kino nunca aprueba por la persona en esa revisión.
    - **Después de una actualización de Kino**, el primer arranque revisa de una vez cada plugin que
      estaba instalado y encendido. En esta versión (un interruptor de compilación que Kino apagará
      después), las actualizaciones que esperan aprobación se instalan entonces **sin preguntar**, una
      sola vez, y solo cuando se leen desde la dirección de instalación del propio plugin; un aviso de
      una sola vez, "Se actualizaron tus plugins", lista cada plugin y lo que puede hacer ahora (por
      ejemplo "Envía registros de errores a Kino"), con accesos a su pestaña en Ajustes, a desactivarlo
      y a desinstalarlo. Con el interruptor apagado, una hoja de una sola vez, "Hay actualizaciones de
      tus plugins", ofrece "Actualizar todos" y muestra cada hoja de consentimiento por turnos. Las
      actualizaciones siguientes de tu plugin siguen las reglas de arriba.
5. **Dale tiempo.** GitHub sirve los archivos raw con un caché de unos cinco minutos (medido:
   `cache-control: max-age=300`), así que un cambio que acabas de subir puede tardar eso en verse en
   una instalación o en una búsqueda de actualización.
6. **Conserva el `id` y la dirección.** Un `id` que ya está instalado desde otra dirección se rechaza
   ("Ya hay un plugin con ese id"), así que renombrar o mover tu repositorio lo vuelve otro plugin para
   la gente que lo instaló. Lo mismo vale para un plugin instalado desde la URL de su manifiesto: esa
   URL es su dirección.

La misma aprobación aplica a las otras adiciones que necesitan una línea en la hoja de
consentimiento: `channels` ([Canales en vivo](live-channels.md#en-vivo-tab)),
`"liveStreamHosts": "any"` ([Canales desde cualquier servidor](live-channels.md#live-stream-hosts)),
`"streamHosts": "any"` ([Reproducir desde cualquier servidor](manifest.md#stream-hosts)), `migrate`
([Pasar lo guardado](migrate.md)), `telemetry` o un paso de `true` a `"verbose"`
([Registro y telemetría](diagnostics.md#telemetry)), `"browser"` o un paso de `true` a `"pages"`
([Navegador oculto](browser.md#permission); también en la pasada automática después de actualizar
Kino) y `secrets` en un plugin que no tenía ([Secretos sellados](manifest.md#secrets); agregar, cambiar o quitar un
secreto después de eso no pregunta nada). Los hosts que la persona aprobó mientras tu plugin corría
([Un host que se te olvidó](contract.md#forgotten-host)) y el permiso amplio de video se conservan en
cada actualización. Un plugin con `secrets` solo se actualiza desde su rama principal, sin `@ref`.

### Compartirlo por la URL de su manifiesto { #manifest-url }

Desde la versión de Kino que sigue a la 0.9.49 también puedes compartir tu plugin como la URL `https` de su `kino-plugin.json`, en GitHub o en
cualquier otro servidor público (tu sitio, GitHub Pages, el `npm/` de jsDelivr); el archivo tiene que
llamarse exactamente `kino-plugin.json`, y `entry` e `icon` se leen a su lado. Un plugin alojado
**fuera de GitHub**:

- no puede usar [secretos sellados](manifest.md#secrets) (un manifiesto con `secrets` instalado desde
  una URL se rechaza) y siempre cuenta como **no firmado** (una [firma](signed.md) va amarrada a
  `owner/repo`);
- se actualiza igual (Kino vuelve a leer esa URL y aplica una `version` más alta, con las mismas
  aprobaciones), y esa URL es su identidad, así que no la muevas;
- **nunca sale en "De la comunidad"**: el descubrimiento solo busca repositorios de GitHub con el topic
  `kino-plugin`. Para que te encuentren, publica en GitHub con el topic.

Todas las reglas: [Instalar desde la URL del manifiesto](index.md#manifest-url).

## Antes de publicar { #checklist }

Revisa que:

- `node sdk/validate.mjs . --run <function> ...` pase con cada capacidad que declaras;
- `"entry"` (y `"icon"`) estén escritos **sin `./` al principio**: `"plugin.js"`, nunca `"./plugin.js"`.
  Kino 0.9.45 y anteriores lo rechazan y el plugin no se instala ([por qué](manifest.md#entry-dot-slash));
- si quieres que la gente sepa que es tuyo, [fírmalo](signed.md) (`apiVersion` 5, Kino 0.9.45+) y firma
  otra vez después de cada cambio en `plugin.js` o `version`; la clave privada nunca se sube;
- cada host con el que habla tu plugin (y cada host de stream y de subtítulos) esté en `hosts`,
  incluido el dominio pelado al lado de su forma `*.`;
- no haya ningún `throw` antes del primer `await` en una función que quien la llama envuelve en
  `try`/`catch` ([la trampa del rechazo](engine-limits.md#rejection-trap));
- tu archivo no use ninguno de los [globales que faltan](engine-limits.md#not-node);
- lo instalaste en Kino y busca, lista capítulos y reproduce.

## Hazte encontrar: aparece en "De la comunidad" { #get-found }

Kino lista los plugins de la comunidad buscando en GitHub repositorios públicos con el topic
`kino-plugin` (los forks quedan por fuera).

> **Importante: sin el topic `kino-plugin`, Kino no encuentra tu plugin.** Es la única forma en que
> la app descubre un plugin: un manifiesto perfecto, un repositorio público y mil estrellas no cambian
> nada si el topic falta. Ponlo en **el repositorio que contiene `kino-plugin.json`** (un error común:
> ponerlo en otro repositorio del mismo autor que solo guarda datos, como una lista `.m3u`).
> Compruébalo en 10 segundos:
>
> ```
> curl -s https://api.github.com/repos/OWNER/REPO | tr -d ' \n' | grep -o '"topics":\[[^]]*\]'
> ```
>
> Tiene que salir `"kino-plugin"` dentro de `topics`. Un `"topics":[]` vacío significa que Kino todavía
> no te ve.

**Las descripciones.** En la tarjeta Kino muestra la `description` de tu **manifiesto** (hasta 300
caracteres; si la dejas vacía, la tarjeta queda sin texto), así que escribe una. La descripción del
repositorio en GitHub (About) no la lee la app y no afecta el descubrimiento, pero ponla también: es lo
que ve la gente al abrir tu repositorio. Un solo comando hace las dos cosas del repositorio:

```
gh repo edit OWNER/REPO --add-topic kino-plugin --description "Qué hace tu plugin, en una línea"
```

Para aparecer:

1. En la página de GitHub de tu repositorio, agrega el topic `kino-plugin` (About ▸ ⚙ ▸ Topics).
2. Deja `kino-plugin.json` en la raíz del repositorio: Kino lo lee para mostrar el nombre, la
   descripción, el color y el ícono de tu plugin, y se salta un repositorio cuyo manifiesto falta o es
   inválido, necesita un `apiVersion` más nuevo que el Kino de la persona, o dice
   `"discoverable": false`. Un plugin en una subcarpeta se puede instalar por dirección pero no se
   busca.
3. Kino se queda con los 30 resultados con más estrellas, busca máximo cada 12 horas por dispositivo
   (y cuando la persona toca "Actualizar"), y los muestra en su propia pestaña de la pantalla Plugins,
   "De la comunidad" (junto a Recomendados; en "Elige tus fuentes", después de los plugins
   recomendados). Instalar uno pasa por la misma hoja de consentimiento que cualquier
   otro plugin.

Para quedarte por fuera de la búsqueda sin quitar el topic, pon `"discoverable": false`;
`node sdk/validate.mjs .` imprime entonces "No aparecerá en la búsqueda de Kino".

El resto de esta sección explica cada regla que aplica la app, con su valor exacto.

### Cada requisito, uno por uno { #discovery-requirements }

| # | Requisito | La regla exacta |
| --- | --- | --- |
| 1 | **Un repositorio público de GitHub** | La búsqueda se hace sin ninguna credencial, así que GitHub solo devuelve repositorios públicos. |
| 2 | **Que no sea un fork** | La búsqueda pide `fork:false`, y además la app descarta cualquier resultado cuyo `fork` no sea `false`. Crea tu repositorio con "Use this template" o desde cero, nunca con "Fork". |
| 3 | **Una dirección de repositorio simple** | El `html_url` del resultado tiene que ser exactamente `https://github.com/<owner>/<repo>` y el login del dueño tiene que coincidir con `<owner>`. `<owner>` cumple `^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`; `<repo>` cumple `^[A-Za-z0-9._-]{1,100}$` y no es `.` ni `..`. Cualquier repositorio normal de GitHub pasa. |
| 4 | **El topic `kino-plugin`** | **Obligatorio.** Exactamente ese topic, puesto en el repositorio que tiene el `kino-plugin.json` (About ▸ ⚙ ▸ Topics, o `gh repo edit owner/repo --add-topic kino-plugin`). Sin él la app nunca te ve, tengas lo que tengas. |
| 5 | **`kino-plugin.json` en la raíz, en la rama por defecto** | La app lee `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json` (`HEAD` es la rama por defecto). Un manifiesto en una subcarpeta o solo en otra rama no se encuentra. |
| 6 | **Máximo 16 KB** | Un manifiesto más grande (16.384 bytes) se descarta. |
| 7 | **Un manifiesto válido** | El mismo analizador del instalador: todas las reglas de [el manifiesto](manifest.md). `node sdk/validate.mjs .` lo revisa con los mismos mensajes. (El descubrimiento solo lee el manifiesto; el archivo de entrada y sus exports se revisan cuando alguien instala.) |
| 8 | **Un `apiVersion` que soporte el Kino de la persona** | Un manifiesto cuyo `apiVersion` es más alto del que soporta esa versión de la app es inválido para ella ("Este plugin necesita una versión más nueva de Kino"), así que no aparece en dispositivos con un Kino más viejo. Kino 0.9.50 soporta hasta `6`; de 0.9.45 a 0.9.49, hasta `5`. |
| 9 | **Que no diga `"discoverable": false`** | Déjalo por fuera o ponlo en `true`. Cualquier valor que no sea booleano vuelve inválido todo el manifiesto. |
| 10 | **Un `id` que no sea de nadie más** | Mira [Por qué un plugin válido igual puede quedar oculto](#discovery-hidden). |
| 11 | **Suficientes estrellas para estar entre los 30 primeros** | Mira [Cómo busca la app](#discovery-search). |

La tarjeta muestra el `name` y la `description` de tu manifiesto, la etiqueta "por &lt;owner&gt;", y tu
`color` (`#RRGGBB`) y tu `icon`: la ruta que nombra el manifiesto, que tiene que ser un PNG de verdad
(empieza con la firma de PNG) de máximo 128 KB. Un ícono que falta, que pesa demasiado o que no es PNG
solo cuesta el ícono; la tarjeta vuelve al aspecto neutro. La app guarda el color y el ícono de cada
tarjeta durante un día.

### Cómo busca la app { #discovery-search }

- **La única petición.** Cada dispositivo hace exactamente esta llamada a la API de GitHub, sin token,
  sin cookies y sin seguir redirecciones:

    ```
    https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=50
    ```

    Ábrela en un navegador para ver lo que ve Kino. Una respuesta de más de 1 MB no se lee, y la
    llamada se rinde a los 20 s.
- **Los 30 primeros.** De esa única página de hasta 50 resultados (primero los de más estrellas), la
  app se queda con los primeros 30 bien formados (requisitos 2 y 3). No hay segunda página: un
  repositorio más abajo nunca se ve. Luego lee el manifiesto de cada uno de esos 30; los que no cumplen
  los requisitos 5 a 9 se descartan **después** de haber ocupado su puesto, así que la lista puede
  mostrar menos de 30.
- **La revisión de manifiestos.** Máximo 4 manifiestos a la vez, 10 s cada uno, y 20 s para toda la
  revisión. Un manifiesto que no se pudo leer por una razón pasajera (sin conexión, tiempo agotado, un
  5xx o 429, el presupuesto de tiempo gastado) conserva el plugin como se vio la última vez; un
  veredicto (404, 410, 451, demasiado grande, inválido, demasiado nuevo, `"discoverable": false`) lo
  descarta.
- **En pantalla.** "De la comunidad" es su propia pestaña de la pantalla Plugins, junto a
  "Recomendados" (en "Elige tus fuentes" va después de los plugins recomendados), en celulares y
  televisores, en el orden de la búsqueda (primero los de más
  estrellas). La caja de búsqueda de arriba también la filtra, por nombre, descripción y
  "por &lt;owner&gt;". Un plugin ya instalado desde el mismo repositorio muestra "Instalado".
- **Cuándo busca.** Cuando se abre la pantalla de plugins: la copia guardada en el dispositivo sale de
  una vez, y a GitHub solo se le vuelve a preguntar si esa copia tiene más de **12 horas**.
  "Actualizar" pregunta de inmediato, pero nunca dos veces en menos de **60 segundos** en el mismo
  dispositivo.
- **Límites de GitHub.** GitHub limita las búsquedas sin token por dirección IP (una IP móvil o de
  oficina compartida se puede quedar sin cupo). Ante un 403 o un 429 el dispositivo espera lo que diga
  GitHub (`Retry-After`, si no `X-RateLimit-Reset`, si no 15 minutos; siempre entre 1 minuto y 24
  horas) y mientras tanto sigue mostrando su última lista.
- **Nada se instala solo.** Tocar una tarjeta de la comunidad abre la misma hoja de consentimiento que
  cualquier otro plugin, con "Plugin no verificado: solo instálalo si confías en quien lo hizo.", y
  nada del plugin corre antes de que la persona toque "Instalar".
- **Los estados vacíos** que puede leer la persona: "Buscando plugins de la comunidad…", "Por ahora no
  hay plugins de la comunidad para mostrar." y "Todos los plugins de la comunidad que encontramos ya
  están en Recomendados."

### Cuando GitHub no responde { #discovery-fallback }

Cuando la búsqueda falla (no hay red hacia GitHub, un límite de peticiones, un error TLS por un reloj
mal puesto) o no encuentra nada válido, y el dispositivo no tiene guardada una lista de búsqueda
propia, la app lee una lista de respaldo de la comunidad que publica el equipo de Kino en los mismos
CDN que los plugins recomendados. Solo trae `owner/repo` y un número de estrellas: el
`kino-plugin.json` de cada repositorio igual se lee desde GitHub y se revisa con todas las reglas de
arriba. La app vuelve a preguntarle a GitHub en cuanto lo permiten la espera mínima y cualquier
bloqueo por límites.

No hay que pedir nada para estar en esa lista: se reconstruye a partir de la misma búsqueda de GitHub
(público, no fork, un `kino-plugin.json` con un `id` y sin `"discoverable": false`, los 30 primeros)
cada vez que el equipo de Kino la vuelve a publicar, así que un plugin que aparece en la búsqueda
aparece en la siguiente lista de respaldo.

### Por qué un plugin válido igual puede quedar oculto { #discovery-hidden }

La lista descarta, tenga las estrellas que tenga:

- **Un repositorio que ya es recomendado.** Sale en "Recomendados", nunca dos veces.
- **Un id impostor.** Un plugin cuyo `id` de manifiesto es el de un plugin recomendado de **otro**
  repositorio se descarta, para que nunca pueda tapar al de verdad. Hoy los ids recomendados son `internet-archive` y `own-server`;
  la lista puede crecer, así que escoge un id que sea claramente tuyo.
- **Un id ya instalado desde otro repositorio.** Su instalación se rechazaría ("Ya hay un plugin con
  ese id"), así que no se ofrece. Esto es por dispositivo: solo lo oculta donde ese otro plugin está
  instalado. Una copia de la plantilla que deja `"id": "archive-org"` se oculta sola para todo el que
  instaló el plugin de Internet Archive: **cambia siempre el `id`**.
- **Repetidos.** El mismo repositorio dos veces, o dos repositorios con el mismo `id`: gana el primero
  (el de más estrellas).
- **Un repositorio retirado del índice.** Los repositorios de
  [`community-blocklist.json`](claims.md) nunca salen en "De la comunidad" ni en la lista de respaldo
  ([Reclamos y retiro de plugins](claims.md)).
- **Los ids que Kino se guarda para sí** (`live`, `local`, `unknown`, `plugin`, `own`, `subtitle-keys`; las versiones anteriores reservan algunos más)
  vuelven inválido el manifiesto, así que nunca llegan hasta aquí.

### "Mi plugin no aparece": qué revisar { #troubleshooting }

1. **¿Está en la respuesta de GitHub?** Abre la URL de búsqueda de arriba en un navegador y busca tu
   `full_name` en `items`. Si no está:
    - revisa que el topic sea exactamente `kino-plugin` en la página del repositorio, y que esté
      puesto en **el mismo repositorio que tiene `kino-plugin.json`** (no en uno hermano);
    - míralo desde la terminal: `curl -s https://api.github.com/repos/OWNER/REPO | tr -d ' \n' | grep -o '"topics":\[[^]]*\]'`
      (si sale `"topics":[]`, todavía no lo tienes);
    - revisa que el repositorio sea público y no un fork (debajo del nombre de un fork dice "forked
      from …"; en ese caso crea un repositorio nuevo desde la plantilla);
    - espera: GitHub indexa un topic nuevo o un repositorio que se acaba de volver público a su propio
      ritmo, normalmente en minutos pero sin un plazo prometido;
    - si hay más de 50 resultados, el tuyo no está en la primera página: mira el siguiente punto.
2. **¿Está entre los 30 primeros?** Cuenta los resultados bien formados que hay por encima del tuyo en
   esa respuesta. Por debajo del 30 no se lista; las estrellas son el único orden.
3. **¿Está el manifiesto?** Abre
   `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/kino-plugin.json`. Un 404 significa que no
   está en la raíz de la rama por defecto.
4. **¿`entry` empieza con `./`?** `"./plugin.js"` se instala en Kino 0.9.46 y posteriores pero falla en 0.9.45
   y anteriores ("El campo \"entry\" debe ser una ruta relativa a un archivo .js"). Escribe `"plugin.js"`.
   Lo mismo vale para `"icon"`.
4. **¿El manifiesto es válido?** Ejecuta `node sdk/validate.mjs .` en el repositorio: código de salida
   0 y sin la línea "No aparecerá en la búsqueda de Kino". Revisa que pese máximo 16 KB.
5. **¿Ese celular lo puede leer?** ¿El `apiVersion` es máximo el que soporta el Kino de la persona?
   Actualiza Kino, o baja el `apiVersion` si no necesitas sus funciones.
6. **¿El `id` es tuyo?** Que no sea el de un plugin recomendado, ni el de un plugin ya
   instalado en ese dispositivo desde otro repositorio (ni `archive-org` de la plantilla).
7. **¿Ya es recomendado?** Entonces está en "Recomendados", no en "De la comunidad".
8. **¿La copia del dispositivo está vieja?** La lista se actualiza máximo cada 12 horas; toca
   "Actualizar" (espera 60 segundos entre toques). Después de un 403/429 de GitHub, el dispositivo
   espera hasta lo que pidió GitHub.
9. **¿Acabas de subir el cambio?** `raw.githubusercontent.com` guarda los archivos en caché unos cinco
   minutos.
