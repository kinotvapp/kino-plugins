# Plugins que vienen instalados { #default-plugins }

Kino instala por su cuenta unos pocos plugins en cada aparato, sin que la persona pase por la tienda y sin llevarlos dentro
del APK. Hoy son **Kino Social** y **Solo noticias**. La lista es un archivo, `default-plugins.json`, que Kino mantiene en
el repositorio público `kinotvapp/kino-plugins`, junto a la lista de bloqueo de la comunidad. Esta página cuenta cómo es ese
archivo y qué hace la app con él; **no es una forma de que tu plugin venga instalado**: la lista la publica solo Kino.

## Dónde se lee { #where }

La app lee el archivo de GitHub (`raw.githubusercontent.com/kinotvapp/kino-plugins/main/default-plugins.json`) y, si falla,
de la copia de jsDelivr (`cdn.jsdelivr.net/gh/kinotvapp/kino-plugins@main/default-plugins.json`). Los dos son destinos que
Kino ya usa: no hay un destino de red nuevo. Guarda una copia en el aparato y la refresca como mucho cada 12 horas, con una
espera de 3 horas tras un intento fallido.

Límites: 64 KB, 100 entradas y `"schema": 1`.

## El formato { #format }

```json
{
  "schema": 1,
  "plugins": [
    { "id": "kino-social", "repo": "kinotvapp/kino-social" },
    { "id": "news", "repo": "kinotvapp/kino-plugin-news", "required": false }
  ]
}
```

- `id` (obligatorio): el `id` del manifiesto del plugin (`^[a-z0-9][a-z0-9-]{1,39}$`, y no uno de los nombres reservados).
  Sirve para decidir sin red y antes de descargar nada si el plugin está instalado o la persona lo quitó; tras la vista
  previa, la instalación se rechaza si el `id` del manifiesto es otro.
- `repo` (obligatorio): el `owner/repo` simple desde el que se instala (sin URL y sin `@ref`).
- `required` (opcional): con `true` se oculta **Desinstalar** y se rechaza toda desinstalación (la pantalla, el registro y
  la desinstalación sincronizada desde otro aparato); el plugin sí se puede apagar. Solo una entrada que diga
  `"required": false` lo quita de nuevo; una entrada sin el campo, o un plugin que ya no está en el archivo, nunca lo quita.
- Los campos desconocidos se ignoran. Una entrada que rompe una regla de arriba (o repite un `id` anterior) se salta y se
  reporta una vez. Un archivo que no es JSON, de otro esquema o sin un arreglo `plugins` se ignora entero y sigue usándose la
  copia guardada.

## Qué hace Kino con la lista { #what-kino-does }

En cada arranque (después de decidir si restaura, y sin retrasarlo) y en la ronda de actualización de 12 horas, para cada
entrada y en orden:

1. Un plugin con ese `id` que ya está instalado (en cualquier estado) es de la persona: solo la marca `required` sigue a la
   entrada (se pone cuando el repositorio listado trae el plugin firmado por Kino).
2. Uno que la persona quitó, en este aparato o en otro suyo (una desinstalación sincronizada), no se instala nunca más.
3. Un repositorio que la lista de retiro de la comunidad da de baja se salta.
4. El plugin tiene que estar firmado con la llave de autor de Kino (huella 07DA-B67F-2ACF-B4D3) y leerse de su repositorio
   de GitHub; cualquier otra cosa se rechaza. El archivo no va firmado a propósito, como la lista de retiro: un archivo
   manipulado solo puede instalar plugins que Kino firmó.
5. Se instala en silencio (sin hoja de consentimiento ni aviso), con su manifiesto aprobado completo y la telemetría sin
   consentimiento, y queda registrado en la sincronización de plugins como cualquier instalación.

Quitar una entrada no desinstala nada. Un fallo (sin red, una vista previa rechazada) se reintenta en la ronda siguiente.

## Las dos entradas de hoy { #today }

| Plugin | `id` | `repo` |
| --- | --- | --- |
| Kino Social | `kino-social` | `kinotvapp/kino-social` |
| Noticias («Solo noticias» en el catálogo) | `news` | `kinotvapp/kino-plugin-news` |

Los dos se pueden desinstalar y apagar (ninguno lleva `required`).

## Publicarla (lo hace Kino) { #publishing }

1. Se edita `default-plugins.json` en la raíz de `kinotvapp/kino-plugins` (`main`) y se hace push. Todo plugin listado
   tiene que estar ya publicado y firmado con la llave de autor de Kino, o los aparatos lo rechazan.
2. jsDelivr puede servir la copia anterior un rato; GitHub se lee primero.
3. Los aparatos la recogen en su próximo arranque o ronda de 12 horas. Para retirar uno de los plugins por defecto se quita su
   entrada: los aparatos que ya lo tienen lo conservan.

Para tu propio plugin, el camino es [aparecer en Kino](listed.md) o una [tienda de plugins](plugin-stores.md).
