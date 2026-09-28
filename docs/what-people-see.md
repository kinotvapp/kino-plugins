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
  agrega, en rojo, "Puede reproducir canales desde cualquier servidor que indique su lista". Nada tuyo
  corre antes de que acepten.
- **Configurar.** Un plugin con `settings` tiene un botón "Configurar" en Ajustes ▸ Plugins. Mientras
  algún ajuste obligatorio no tenga valor, su estado es "Falta configurar" y nada de él corre.
- **Ver más.** Una fila de Inicio con `ref` termina en una tarjeta "Ver más", y una página de búsqueda
  con `next` muestra "Ver más resultados de &lt;name&gt;": las dos abren una cuadrícula que te pide la
  página siguiente a medida que la persona baja.
- **Búsqueda, Inicio y la biblioteca.** Tus resultados salen en la búsqueda bajo el nombre de tu
  plugin (con tu `color`), al lado de las fuentes propias de la app; tus filas de `home` salen en
  Inicio después de las de la app; tus títulos se reproducen en el reproductor de Kino y aparecen en
  "Continuar viendo" y en la biblioteca. Los títulos de un plugin que declara `download` se pueden
  guardar para verlos sin conexión ([Descargas](manifest.md#downloads)); Chromecast y DLNA no están
  disponibles para títulos de plugins en esta versión. La tarjeta de un ítem `live` dice "EN VIVO" y se
  reproduce al tocarla, sin página de información; un canal nunca entra a "Continuar viendo" ni a la
  biblioteca ([Canales en vivo](live-channels.md#live-items)). Un plugin encontrado por el topic
  `kino-plugin` lleva la etiqueta "De la comunidad" en su tarjeta.
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
