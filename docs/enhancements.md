# Pantallas y funciones nuevas sin subir tu apiVersion { #enhancements-page }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). Solo un Kino 0.9.74 o posterior lee el bloque
    `enhancements`; una versión anterior de Kino **lo ignora**, como cualquier clave que no conoce, y sigue instalando
    y corriendo tu plugin como siempre: nunca lo rechaza por este bloque.

Un plugin que sube su `apiVersion` a 14 es rechazado por todo Kino anterior («Este plugin necesita una versión más nueva
de Kino»). Para no perder a esas personas, deja tu `apiVersion` como está y ofrece las [pantallas](screens.md) y las
demás funciones de apiVersion 14 en un bloque opcional que solo lee un Kino más nuevo.

## El bloque `enhancements` { #enhancements }

```json
"apiVersion": 8,
"capabilities": ["search", "home", "resolve"],
"enhancements": { "14": { "capabilities": ["screen", "library"], "screen": { "label": "Inicio", "menuOpens": "both" } } }
```

Un Kino anterior ignora la clave y nunca llama `screen`/`screenEvent` (el JS sigue siendo un solo archivo); este Kino
mezcla el bloque y lo revisa con las reglas de apiVersion 14. Un bloque que falla se descarta y se anota en el registro,
**nunca es un rechazo**.

Otro ejemplo, con un trabajo en segundo plano:

```json
"apiVersion": 8,
"enhancements": { "14": {
  "capabilities": ["screen", "schedule", "shared"],
  "screen": { "label": "Mi plugin", "opensFrom": ["settings"] },
  "jobs": [{ "id": "refresh", "label": { "es": "Actualizar", "en": "Refresh" }, "everyMin": 180, "everyOptions": [60, 180, 360] }]
} }
```

### Cómo lo lee Kino { #merge }

- **Las claves** son el `apiVersion` que trajo la función: hoy, `"14"`. Un Kino que conoce la clave mezcla su bloque sobre
  el manifiesto, en orden numérico de claves. Una clave por encima del apiVersion de ese Kino se ignora.
- **`capabilities` se suman.** Solo se pueden agregar así `screen`, `library`, `playerPanelTab`, `playerControl`, `room`,
  `schedule`, `shared` y `ai`.
- **`screen`, `settings` (la lista entera), `panel` y `jobs` reemplazan** los del manifiesto. `playerPanelTab` y un `panel`
  con `"contributes": true` van juntos en el mismo bloque, y también `schedule` y sus `jobs` (cada uno necesita al otro).
  Los `jobs` solo los trae un bloque: un `jobs` en el nivel de arriba por debajo de apiVersion 14 nunca se lee.
- Después **todo se revisa con ese apiVersion**, con las mismas reglas que los campos normales:
  [`screen`](screens.md#manifest), [`jobs`](jobs-and-shared.md#jobs-manifest), [`panel`](player-panel.md#contributed-tab),
  las [capacidades](screens.md#consent).
- **Tu `apiVersion` nunca se mueve**, así que nada más cambia de comportamiento.

### Cuándo se descarta un bloque { #dropped }

Tu plugin **nunca se rechaza** por un `enhancements`. El bloque se descarta (con una línea en el registro) y el plugin corre
como dice su propio manifiesto cuando:

- falla esas reglas (una pantalla mala, una capacidad que no se puede agregar, cualquier otro campo);
- su clave es igual o menor que tu propio `apiVersion` (declara cada función una sola vez);
- su `settings` cambia el tipo de un ajuste que tu manifiesto declara (mantén la lista como un superconjunto de la tuya: los
  valores se sincronizan por clave con aparatos que tienen un Kino anterior);
- su `screen.replaces` nombra Categorías y tu propio apiVersion no las tiene (por debajo de 6);
- a tu script le falta un export que el bloque necesita de nuevo (`screen`/`screenEvent`, `job`, o `settingsStatus`/`action`
  para esos ajustes). Kino lo revisa al instalar y en cada arranque;
- un trabajo con [`enabledBy`](jobs-and-shared.md#enabled-by) no nombra uno de tus ajustes `toggle`.

`node sdk/validate.mjs` reporta como problema cada bloque que Kino descartaría.

### El consentimiento { #consent }

Es el de un manifiesto normal. Las líneas rojas de `library`, `playerPanelTab`, `playerControl`, `room`, `schedule` y `ai`
se preguntan al instalar y en la actualización que las agrega (se muestran primero y abiertas, [abajo](#updates)), nunca
las aprueba Kino por su cuenta, y al importar con el kit empiezan sin marcar; `shared` es una línea simple.

Sus funciones siguen al bloque: tus trabajos corren, y `kino.shared` y `kino.ai` existen, solo en un Kino que lo leyó.
`kino.library` existe en todo Kino de apiVersion 14, pero hasta que la persona aprueba la línea sus llamadas rechazan con
`permission_denied`: a quien instaló tu plugin en un Kino anterior y después actualizó Kino se le pregunta solo con **tu
siguiente versión**. Así que `typeof kino.library === "object"` no basta: atrapa el rechazo y funciona sin él.

En un Kino anterior nada de esto existe: deja donde ya está el trabajo que tu plugin hace sin trabajos en segundo plano.

### Una lista `settings` en un bloque { #settings-in-block }

Una lista `settings` dentro de un bloque se lee con el apiVersion del bloque: sus textos en inglés (`labelEn`, `hintEn`,
`confirmEn`), `devices`, `linkOnly`, los elementos `help`, `link` y `qr`, `"sync": false` y `unlockWith` se aplican en un
Kino que leyó el bloque, y se ignoran en uno anterior, que lee tu lista base. Por eso:

- Mantén cada clave de la lista base con su tipo (si no, el bloque se descarta: `settingRetyped`) y con su `sync`
  (`"settings" changes "sync" of the setting "<key>"`, también se descarta: un valor que se sincroniza en un Kino y se queda
  en el aparato en otro sería distinto entre los aparatos de la persona). Una clave NUEVA sí puede decir `"sync": false`.
- Las dos funciones que dependen de lo que la lista puede declarar siguen a la lista: el `hide` de una respuesta de
  `settingsStatus` y el `setSettings` de una acción que llena un `password` (las dos desde apiVersion 13) se leen con el
  apiVersion del bloque cuando el bloque reemplazó `settings`, y con tu propio apiVersion si no (un bloque que solo agrega
  una pantalla no les cambia nada).
- `setSettings` sigue llenando solo un `password` que declara la lista vigente, sigue rechazando el campo entero por una
  clave no declarada o de otro tipo, nunca mueve un ajuste `unlockWith` de su valor por defecto, y el formulario guarda el
  valor como uno escrito (sellado, nunca se muestra de vuelta, solo en el aparato con `"sync": false`).
- Lo demás que lee tu propio apiVersion se queda así a propósito: el límite de `secrets` sellados, las reglas de la llave
  de cifrado, Categorías, y toda función fuera de `settings`.

Mira también [el formulario de ajustes](settings-form.md).

## Actualizaciones: los consentimientos nuevos van primero { #updates }

Cuando una actualización de tu plugin agrega una línea roja (una de las capacidades de arriba, `"fetchHosts": "any"`,
`browser`, `tracking`…) o un host nuevo, la hoja de actualización de Kino la muestra **primero y abierta**, bajo «Nuevo en
esta actualización»:

- En orden de gravedad: cualquier host primero, después las demás capacidades, una línea agrupada para los hosts nuevos
  inseguros, y luego los hosts nuevos.
- Cada línea es una parada del D-pad en la TV, con un aviso «Hay más abajo».
- Lo que la persona ya aprobó se queda detrás de «Ver detalles».

Así un solo toque nunca aprueba algo que no se vio. La actualización espera a la persona; una línea simple (`shared`) no la
detiene. En una primera instalación todo sigue detrás de «Ver detalles», como antes.

Explica en las notas de tu versión por qué necesitas el alcance nuevo. Mira también
[Lo que ve la persona](what-people-see.md) y [Publicar](publish.md).
