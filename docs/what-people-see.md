# Lo que ve la persona

- **La hoja de consentimiento.** Cuando alguien escribe tu dirección, Kino muestra "Instalar
  &lt;name&gt;", tu versión y tu autor, la descripción, la lista de hosts bajo "Se va a conectar con:"
  (no sale cuando `hosts` está vacío), y la advertencia
  "Plugin no verificado: solo instálalo si confías en quien lo hizo." con "Instalar" y "Cancelar".
  Si tu manifiesto tiene un ajuste `password` agrega "Este plugin usa tu usuario y contraseña"; un
  ajuste `url` agrega "Se conectará a los servidores que escribas en su configuración". Declarar
  `download` agrega "Puede descargar videos para verlos sin conexión", `drm` agrega "Reproduce video
  protegido (DRM)", `channels` agrega "Agrega canales en vivo a la pestaña En vivo", cada host
  `insecureHttp` agrega, en rojo, "Conexión sin cifrar con &lt;host&gt;", y `liveStreamHosts: "any"`
  agrega, en rojo, "Puede reproducir canales desde cualquier servidor que indique su lista",
  `streamHosts: "any"` agrega, en rojo, "Puede reproducir video desde cualquier servidor que indique",
  y `secrets` agrega "Usa datos sellados por su autor". Desde apiVersion 6, `migrate` agrega "Revisar lo
  que tienes guardado (biblioteca, historial, favoritos) para pasarlo a este plugin", `telemetry: true`
  agrega "Comparte registros de errores con Kino para corregir fallas" y `telemetry: "verbose"` agrega
  "Comparte registros detallados de reproducción y errores con Kino para corregir fallas". En una actualización, lo nuevo lleva un chip
  "nuevo". Nada tuyo corre antes de que acepten.
- **Una lista larga de hosts se pliega.** Con más de 3 hosts la hoja dice "Se va a conectar con N
  servidores:", lista los 3 primeros (en una actualización, primero los nuevos) y "y N más (M
  nuevos)", con un botón "Ver todos" / "Ver menos". Las líneas de permisos y la advertencia "Plugin no
  verificado" van encima de la lista y nunca se pliegan; "Cancelar" e "Instalar" quedan fijos abajo
  mientras el cuerpo se desplaza. Una lista corta se lee mejor igual: declara lo que usas, no cada
  espejo que alguna vez viste.
- **Diálogos de host.** Un `kino.fetch` a un host no declarado durante `resolve`/`episodes`, y un host
  no declarado del video que el reproductor abre o se encuentra en plena reproducción, le preguntan a
  la persona ("Rechazar" / "Permitir"; el foco empieza en "Rechazar"). Para el video, los subtítulos o
  el audio de una película o un episodio, el diálogo también ofrece "Permitir video de cualquier
  servidor" ([el permiso amplio de video](contract.md#broad-video)); una vez elegido, los detalles del
  plugin dicen "Puede reproducir video desde cualquier servidor" junto a "Quitar permiso de video
  amplio". Un plugin con rechazos recordados también muestra "Olvidar rechazos de host".
- **Mientras corre `resolve`** el reproductor muestra "Resolviendo fuente &lt;name&gt;…", y después
  de 5 s "… buscando enlaces (N s)".
- **Cuando un stream no se puede reproducir**, el reproductor dice por qué en español, nunca con el
  inglés del propio reproductor: por ejemplo "Este aparato no puede reproducir este formato de video
  (4K/HEVC)", "El servidor del video respondió con un error" o "No se pudo reproducir este video".
- **Configurar.** Un plugin con `settings` tiene un botón "Configurar" en Ajustes ▸ Plugins y, desde
  Kino 0.9.50, su propia pestaña en Ajustes con el mismo formulario ([Formulario de
  ajustes](settings-form.md)). Mientras algún ajuste obligatorio no tenga valor, su estado es "Falta
  configurar" y nada de él corre.
- **Ver más.** Una fila de Inicio con `ref` termina en una tarjeta "Ver más", y una página de búsqueda
  con `next` muestra "Ver más resultados de &lt;name&gt;": las dos abren una cuadrícula que te pide la
  página siguiente a medida que la persona baja.
- **Búsqueda, Inicio y la biblioteca.** Tus resultados salen en la búsqueda bajo el nombre de tu
  plugin (con tu `color`), al lado de las fuentes propias de la app; tus filas de `home` salen en
  Inicio después de las de la app; tus títulos se reproducen en el reproductor de Kino y aparecen en
  "Continuar viendo" y en la biblioteca. Los títulos de un plugin que declara `download` se pueden
  guardar para verlos sin conexión ([Descargas](manifest.md#downloads)); los títulos de plugins se pueden enviar a una TV (Chromecast y DLNA, mira [Enviar a la TV](#cast) abajo). La tarjeta de un ítem `live` dice "EN VIVO" y se
  reproduce al tocarla, sin página de información; un canal nunca entra a "Continuar viendo" ni a la
  biblioteca ([Canales en vivo](live-channels.md#live-items)). Un plugin encontrado por el topic
  `kino-plugin` lleva la etiqueta "De la comunidad" en su tarjeta. En la búsqueda, un canal en vivo
  cuyo nombre no tiene nada que ver con lo que se escribió se deja por fuera
  ([la regla](contract.md#validation)); las películas y series siempre se quedan.
- **Estado de cada plugin** en Ajustes > Plugins: "Activo", "Desactivado", "Falta configurar", "No
  responde — actívalo para volver a intentar" (tres tiempos agotados seguidos; la persona lo puede
  volver a activar), "Actualización disponible — requiere tu aprobación" y "Archivos dañados,
  reinstálalo" (el archivo instalado ya no coincide con lo que se instaló).
- **Desactivar y desinstalar.** Un plugin desactivado desaparece de la búsqueda y de Inicio; sus
  títulos se quedan en la biblioteca y dicen "Activa el plugin &lt;name&gt; para ver esto".
  Desinstalar borra de inmediato los archivos del plugin, su almacenamiento y sus filas de Inicio
  guardadas, pero conserva los títulos y el progreso de la persona en la biblioteca: al abrir uno dice
  "Esto venía del plugin &lt;name&gt;, que ya no está instalado", e instalar el plugin otra vez los
  recupera. Esa es una razón más para mantener estable el manejo de `id` y `ref`. Los títulos ya
  descargados se siguen reproduciendo sin conexión y se pueden quitar en Descargas.

- **Plugins firmados.** Un plugin firmado ([Plugins firmados](signed.md)) muestra la línea "Firmado
  por su autor" en la hoja de consentimiento, una insignia "Firmado" en las tarjetas del catálogo y
  de la comunidad ("Activo · Firmado" en una instalada), y "Clave del autor: ABCD-EF01-2345-6789" en
  sus detalles (celular: Gestionar; TV: las acciones del plugin instalado). Kino 0.9.45 y posteriores.

## Enviar a la TV (Chromecast y DLNA) { #cast }

Los títulos de plugins se pueden enviar a una TV desde el reproductor. Nada en el manifiesto lo
activa: Kino decide por cada stream según lo que devuelve tu `resolve` (`url`, `mime`, `headers`,
`drm`):

| Tu stream | Qué hace Kino |
| --- | --- |
| mp4/webm (u otro archivo progresivo) **sin `headers`**, en un host que tu plugin puede usar | La TV pide la URL ella misma; el celular no mueve bytes. Si la TV no puede con ella, se pasa por el celular. |
| HLS (`.m3u8`) | Por el celular (un Chromecast necesita CORS en él): las listas se reescriben para que cada segmento y cada clave pasen por el celular. |
| Cualquier archivo **con `headers`** (Referer, cookies, tokens en headers) | Por el celular: él pide con tus headers y la TV solo ve una dirección local. |
| Un stream [firmado por petición](signed-streams.md#cast) (Kino 0.9.50) | Por el celular, que llama `sign()` para cada playlist y segmento que pide la TV. |
| DRM (Widevine o ClearKey), DASH, MPEG-TS progresivo, o un formato que nada permite identificar | No se envía: la persona lee "Este título no se puede enviar a la TV" (los protegidos: "Este título está protegido y no se puede enviar a la TV"). |

Lo que ayuda a quien escribe plugins: devuelve un `mime` real (`video/mp4`,
`application/vnd.apple.mpegurl`) o una URL que termine en la extensión correcta; Kino prueba los
primeros bytes de un stream que nada describe (una lectura de 1 KB, 2 s), pero eso cuesta una
petición. Prefiere enlaces que no necesiten `headers` (la ruta más liviana); cada host involucrado
tiene que ser uno al que tu plugin puede llegar (declarado, escrito por la persona, o cubierto por un
permiso "any"), por https. Mientras se envía, el celular se queda en silencio.

## Desde Kino 0.9.50 { #v0950 }

Sin nada nuevo en tu manifiesto, salvo donde se dice:

- **Reproducir en el TV desde el celular.** Con dos aparatos emparejados, "Reproducir en el TV" funciona
  para un título de cualquier plugin: el TV lo abre con **su propia copia** del plugin. Si el TV no
  puede, el celular dice por qué: "Instala el plugin &lt;nombre&gt; en el TV para verlo allí", "Activa
  …", "Configura …", "Actualiza …", "Reinstala …", "En el TV hay otro plugin con ese nombre; instala el
  mismo desde su repositorio", "Desbloquea el contenido 18+ en el TV para verlo allí" o, con un TV que
  tiene una versión de Kino más vieja, "Actualiza Kino en el TV para verlo allí". Por eso conviene que
  tu `id` y tus refs sean los mismos en todos los aparatos.
- **Capítulos nuevos de las series que la persona sigue.** Kino revisa de vez en cuando (máximo cada
  6 horas) las series guardadas de cualquier plugin utilizable que declare `episodes`, llamando a tu
  `episodes(ref)` con el `ref` guardado, y agrega los capítulos que faltan. Una falla deja esa serie
  igual y sigue con la siguiente. Mantén tus refs de series estables.
- **"Para ti".** Una recomendación que viene del catálogo de un plugin se guarda por su `ref`: una
  película como película, una serie con su primera temporada (llamando a `episodes`).
- **Contenido +18.** Las entradas `adult: true` de un plugin apiVersion 6 se ven solo con el código +18
  desbloqueado ([Contenido +18](contract.md#adult)).
- **Canales en Inicio.** Un plugin apiVersion 6 puede poner canales en sus filas de Inicio
  ([Canales en tus filas de Inicio](live-channels.md#home-rows)).
- **Una sección propia** en la barra lateral del TV o en la franja de Inicio del celular, y un grupo en
  Categorías, para un plugin que declare `section` o exporte `categories`
  ([Sección, categorías y colores](section-theme.md)).
- **Buscar dentro de un "Ver más".** Toda página "Ver más" tiene "Buscar en esta categoría"
  ([`scopedSearch`](contract.md#scoped-search)).
- **Actualizaciones.** Una insignia en Ajustes ▸ Plugins cuenta las actualizaciones que esperan
  aprobación, y una llamada fallida de un plugin con una actualización pendiente lo dice
  ([Actualizaciones](publish.md#updates)).
- **Plugins de la comunidad.** La sección lleva la nota "Plugins de la comunidad — Kino no los revisa ni
  responde por su contenido.", y un plugin instalado que fue retirado del índice dice "Retirado del
  índice de la comunidad." ([Reclamos y retiro de plugins](claims.md)).

## Plugins en los otros aparatos de la persona { #sync }

Kino mantiene los plugins de una persona al día entre sus propios aparatos (por ejemplo celular y
TV): una instalación, un encendido o apagado, una desinstalación, una aprobación o un ajuste guardado
en un aparato se envía a los otros, y las contraseñas viajan cifradas de punta a punta. Nada cambia
en tu plugin. Lo que hace el otro aparato: **instala tu plugin de nuevo desde la misma dirección**,
en silencio cuando lo que descarga no pide nada más de lo que la persona aprobó en el primero; si una
actualización agrega algo (un host, una capacidad), espera en "Plugins de tus otros aparatos" a que la
persona la apruebe allá. Así que mantén tu repositorio público y tu dirección estable.
