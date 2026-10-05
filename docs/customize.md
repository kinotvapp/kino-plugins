# Personaliza tu plugin

Todo lo que un plugin puede cambiar de cómo lo muestra Kino, en un solo lugar, cada cosa con un ejemplo
corto y la página que tiene las reglas completas. Casi todo es nuevo en `"apiVersion": 6` (Kino 0.9.50):
declara 6 solo si usas algo de eso, porque Kino 0.9.49 y anteriores rechazan un plugin apiVersion 6.

## De un vistazo { #overview }

| Qué | Dónde lo ve la persona | Cómo | apiVersion | Reglas |
| --- | --- | --- | --- | --- |
| Nombre, descripción, autor | la hoja de consentimiento y cada tarjeta de tu plugin | `name`, `description`, `author` | 1 | [Manifiesto](manifest.md) |
| Ícono | las tarjetas de tu plugin (Ajustes ▸ Plugins, Recomendados, "De la comunidad") | `icon`: un `.png` cuadrado, máximo 128 KB | 1 | [Manifiesto](manifest.md) |
| Color de acento | la pestaña y los chips de tu plugin, tu nombre sobre tus resultados de búsqueda | `color`: `#RRGGBB` | 1 | [Manifiesto](manifest.md) |
| Chips de la tienda | los chips de categoría de Recomendados, "De la comunidad", "Elige tus fuentes" | `categories` en el manifiesto | cualquiera | [Manifiesto](manifest.md) |
| Un formulario de ajustes y su propia pestaña en Ajustes | Ajustes ▸ &lt;tu plugin&gt; | `settings` (`list` desde 4) | 1 | [Formulario de ajustes](settings-form.md#types) |
| Títulos, líneas de estado, botones, revisión antes de guardar | esa misma pestaña | ajustes `section`, `status`, `action`; `settingsStatus`, `action`, `validateSettings` | 6 | [Formulario de ajustes](settings-form.md) |
| Colores | tu sección, tu pestaña de Ajustes, el título de tu grupo en Categorías, el acento del reproductor mientras suena lo tuyo | `theme` | 6 | [Tus colores](section-theme.md#theme) |
| Una sección propia, con pestañas y un destacado | barra lateral del TV, franja de chips arriba de Inicio en el celular | `"section": { "label" }` + `section({ tab })` | 6 | [Una sección propia](section-theme.md#section) |
| Mosaicos en Categorías | Categorías, un grupo con tu nombre | `categories()` (con `browse`) | 6 | [Tus propias categorías](section-theme.md#categories) |
| Filas de Inicio, "Ver más" y su género | Inicio, Categorías | filas de `home()` con `ref` y `genre` | 1 | [Contrato](contract.md#paging) |
| Canales en tus filas de Inicio | Inicio | ítems `kind: "live"` en `home()` | 6 | [Canales en vivo](live-channels.md#home-rows) |
| Buscar dentro de tus "Ver más" | "Buscar en esta categoría" | `scopedSearch` | 6 | [Contrato](contract.md#scoped-search) |
| Entradas +18 | en todas partes, solo con el código +18 desbloqueado | `adult: true` | 6 | [Contenido +18](contract.md#adult) |
| Nombres de las copias de un video | el menú Servidor del reproductor | `Stream.label`, `alternatives` con `label` | 6 | [Copias con etiqueta y perezosas](contract.md#lazy-copies) |
| Botones para saltar | "Saltar intro", "Saltar outro" | `Stream.skip` | cualquiera | [Contrato](contract.md#stream) |
| Botones para saltar en cualquier título, de cualquier fuente | "Saltar intro", "Saltar outro" | `segments` | 7 | [Dónde están la intro y los créditos](contract.md#segments) |
| Nombres de audio y subtítulos | el menú "Audio y subtítulos" del reproductor | `audioTracks[].label`, `subtitles[].lang` | 1 | [Contrato](contract.md#stream) |
| Tu propia frase en un error | "Mensaje de &lt;tu plugin&gt;: …" | `kino.error(code, detalle, { userMessage })` | 6 | [Tu propia frase](contract.md#user-message) |
| Subtítulos para cualquier título | "Buscar subtítulos en línea" | la función `subtitles` | cualquiera | [Subtítulos para cualquier título](contract.md#subtitles) |
| Fichas de títulos de otros plugins | la ficha de un título, donde TMDB no tenía nada; desde Kino 0.9.51 un logo en lugar del nombre, notas de otros sitios y el reparto | `meta` (`logo`, `ratings`, `cast`) | 6 | [Describir otros títulos](contract.md#meta) |
| El interruptor de un servicio de seguimiento y su estado | "Enviar lo que veo" y "No pudo avisar a …" en tu pestaña de Ajustes | `tracking` | 7 | [Contarle a un servicio de seguimiento](contract.md#tracking) |
| Canales, logos, números, guía | En vivo, guía de TV, cajón de canales | `channels` | 3 | [Canales en vivo](live-channels.md) |

## La identidad de tu plugin { #identity }

```json
{
  "id": "mi-cine", "name": "Mi cine", "version": "1.0.0", "apiVersion": 6, "entry": "plugin.js",
  "description": "Cine colombiano y latinoamericano, con subtítulos",
  "author": "ana", "homepage": "https://github.com/ana/mi-cine",
  "icon": "icon.png",
  "color": "#3D5AFE",
  "categories": ["movies", "series"],
  "hosts": ["api.example.com"],
  "capabilities": ["search", "home", "browse", "episodes", "resolve"]
}
```

- Escribe `name` y `description` en español: es lo que muestra cada tarjeta. `description` tiene máximo
  300 caracteres, `name` 40.
- `icon` es una ruta al lado del manifiesto, nunca `./icon.png`. Un ícono que falta o que pesa demasiado
  se omite, nunca hace fallar la instalación.
- `color` pinta tu pestaña, tus chips y tu nombre sobre tus resultados de búsqueda. `theme` (más abajo)
  va mucho más allá, desde apiVersion 6.
- `categories` solo etiqueta tu plugin para los chips de la tienda. No es la función `categories()`, que
  pone mosaicos dentro de Categorías de Kino.

## Tu pestaña de ajustes { #settings }

Todo plugin encendido tiene su propia pestaña en Ajustes, con su interruptor de
[Modo debug](diagnostics.md#debug); uno con `settings` muestra ahí también su formulario. Nueve tipos de campo (`text`,
`password`, `url`, `toggle`, `select`, `list`, y desde apiVersion 6 `section`, `status`, `action`),
valores por defecto, campos obligatorios, una revisión antes de guardar y botones que corren tu código:

```json
"settings": [
  { "key": "account", "label": "Tu cuenta", "type": "section", "hint": "Opcional" },
  { "key": "email", "label": "Correo", "type": "text" },
  { "key": "password", "label": "Contraseña", "type": "password" },
  { "key": "linked", "label": "Estado", "type": "status" },
  { "key": "logout", "label": "Cerrar sesión", "type": "action", "confirm": "¿Cerrar la sesión?" },
  { "key": "quality", "label": "Calidad", "type": "select", "default": "hd",
    "options": [{ "value": "hd", "label": "Alta" }, { "value": "sd", "label": "Ahorro de datos" }] }
]
```

```js
export async function settingsStatus() {
  return { linked: kino.config.get("email") ? "Cuenta vinculada" : "Sin cuenta" };
}

export async function action(key) {
  if (key === "logout") return { message: "Sesión cerrada", clearSettings: ["email", "password"] };
  return null;
}
```

Todos los tipos y atributos, `validateSettings` y un ejemplo completo: [Formulario de ajustes](settings-form.md).
No hay campos condicionales: todo ajuste se muestra siempre.

## Tu sección, tus mosaicos, tus colores { #section-theme }

```json
"apiVersion": 6,
"section": { "label": "Mi cine" },
"theme": { "accent": "#3D5AFE", "onAccent": "#FFFFFF", "background": "#101820", "surface": "#1A2733", "highlight": "#F7C948" }
```

```js
export async function section({ tab }) {                 // tab es null la primera vez
  const tabs = [{ id: "pelis", label: "Películas" }, { id: "series", label: "Series" }];
  const chosen = tabs.some((t) => t.id === tab) ? tab : "pelis";
  return {
    tabs, tab: chosen,
    hero: { title: "Estreno de la semana", text: "Una película nueva cada viernes.", image: "https://img.example.com/hero.jpg" },
    rows: await rowsFor(chosen),                         // las mismas filas de home()
  };
}

export async function categories() {                     // necesita la capacidad browse
  return [
    { id: "comedia", title: "Comedia", ref: "genre:comedia", art: "https://img.example.com/comedia.jpg" },
    { id: "terror", title: "Terror", ref: "genre:terror" },
  ];
}
```

Kino revisa que cada color se lea bien cuando lo usa y vuelve al suyo para un color que no pasa
(`node sdk/run.mjs . theme` muestra los contrastes). Los errores siguen en el rojo de Kino. Las reglas:
[Sección, categorías y colores](section-theme.md).

## Filas de Inicio { #home }

```js
export async function home() {
  return [
    { id: "nuevas", title: "Recién llegadas", ref: "nuevas", genre: "peliculas", items: newest },
    { id: "canales", title: "Canales de Colombia", genre: "noticias", items: [   // apiVersion 6
      { id: "canal-1", ref: "live:1", title: "Canal Uno", kind: "live", poster: "https://img.example.com/c1.png" },
    ] },
  ];
}
```

- Una fila con `ref` (y la capacidad `browse`) termina en "Ver más"; con `scopedSearch` tú respondes la
  búsqueda dentro de ella.
- `genre` (uno de `peliculas`, `series`, `anime`, `infantil`, `documentales`, `deportes`, `noticias`,
  `musica`, `entretenimiento`, `otros`) es como Categorías agrupa las filas navegables de todos los
  plugins. Sin él, Kino lo adivina por el título.
- Cada ítem puede llevar `badges` (hasta 3 chips como `"Latino"`, `"4K"`), `quality`, `lang`, `rating`,
  `year`, `genres`, `overview`, un `poster` y un `backdrop`; `ids.tmdb` deja que Kino complete su ficha.
- Los ítems `kind: "live"` se quedan en las filas de Inicio desde apiVersion 6, como tarjetas de canal
  con la insignia "En vivo".
- `adult: true` mantiene una entrada oculta hasta que la persona desbloquee su código +18.
- Tus filas van después de las de Kino, bajo el nombre de tu plugin. Reglas: [Contrato](contract.md#validation).

## En el reproductor { #player }

```js
export async function resolve(ref) {
  const servers = await listServers(ref);              // [{ id, lang, name }]
  const first = await resolveServer(ref, servers[0]);
  return {
    url: first.url,
    label: `${servers[0].lang} · ${servers[0].name}`,   // "Latino · Servidor 1" en el menú Servidor
    alternatives: servers.slice(1, 9).map((s) => ({ label: `${s.lang} · ${s.name}`, ref: `${ref}|${s.id}` })),
    audioTracks: first.dubs.map((d) => ({ lang: d.lang, url: d.url, label: d.name })),  // "Español (Latinoamérica)"
    subtitles: first.subs.map((s) => ({ lang: s.lang, url: s.url })),
    durationMs: first.durationMs,
    skip: { openingStartMs: 62_000, openingEndMs: 152_000, endingStartMs: 1_290_000 },
  };
}
```

- `label` y las copias perezosas `{ label, ref }` (apiVersion 6) llenan la sección **Servidor** del menú
  "Audio y subtítulos" del reproductor; una copia se resuelve solo cuando la persona la escoge o el cambio
  automático llega a ella ([Copias con etiqueta y perezosas](contract.md#lazy-copies)).
- `audioTracks[].label` se muestra tal cual en el menú de audio; sin él, Kino nombra la pista por su `lang`.
- `skip` pone "Saltar intro" y "Saltar outro" en pantalla; una corrección que la persona hace a mano gana.
- Con un `theme`, la barra de progreso, el deslizador y el borde de foco del reproductor toman tu `accent`
  mientras suena lo tuyo.

## Tus propias palabras { #words }

```js
throw kino.error("not_found", "E404", { userMessage: "Este capítulo ya no está disponible." });
```

La persona lee "Mensaje de Mi cine: Este capítulo ya no está disponible." en lugar de la línea de Kino,
solo cuando la frase pasa [las reglas de seguridad](contract.md#user-message) (en español, máximo 160
caracteres, sin enlaces, sin pedir dinero, credenciales ni datos de contacto). Las líneas de estado y los
mensajes de las acciones de tu formulario de ajustes también son palabras tuyas
([Formulario de ajustes](settings-form.md)).

## Lo que no puedes cambiar { #limits }

- Las pantallas, las fuentes y la disposición de Kino, el orden de Inicio (tus filas van después de las
  de Kino) y el fondo y las superficies del reproductor.
- El color de los errores: siempre el rojo de Kino, diga lo que diga tu `theme`.
- Ajustes condicionales: todo campo se muestra siempre.
- Nada que corra por fuera de tus funciones: ni pantallas propias, ni notificaciones, ni tareas de fondo.
  Kino te llama; tú respondes con datos.
- Si el código +18 de la persona está desbloqueado: tú solo marcas entradas con `adult: true`, Kino
  decide.
