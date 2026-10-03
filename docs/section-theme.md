# Tu sección, tus categorías y tus colores (apiVersion 6)

Tres ampliaciones opcionales, todas desde `"apiVersion": 6` (Kino 0.9.50). Ninguna necesita una
capacidad propia. Un ejemplo completo de las tres es `plugins/sdk/test/section-demo` en el repositorio
de Kino (su `highlight` falla a propósito para que veas el color de respaldo).

## Una sección propia { #section }

Declara `"section": { "label": "Demo" }` (de 1 a 20 caracteres) y exporta `section({ tab })`:

```js
export async function section({ tab }) {   // tab es null la primera vez
  const tabs = [{ id: "pelis", label: "Películas" }, { id: "series", label: "Series" }];
  const chosen = tabs.some((t) => t.id === tab) ? tab : "pelis";
  return {
    tabs,                                    // opcional, máximo 8, etiquetas de máximo 24 caracteres
    tab: chosen,                             // la pestaña de esta respuesta
    hero: { title: "Destacado", text: "…" }, // opcional; también image (http o https); text de máximo 300 caracteres
    rows: [{ id: `${chosen}-a`, title: "Destacadas", ref: `${chosen}-a`, items: [/* KinoItem */] }],
  };
}
```

- `rows` son exactamente las filas de `home` (misma forma, mismas revisiones y topes); una fila con `ref`
  tiene "Ver más", que llama `browse(ref, null)`. Devuelve `rows: []` para una pestaña vacía: Kino dice
  que no hay nada ahí.
- Escoger una pestaña vuelve a llamar `section({ tab })` con el `id` de esa pestaña. 20 s por llamada.
- Dónde aparece: en el **TV**, una entrada en la barra lateral después de "Categorías" (máximo 3 plugins
  tienen una); en el **celular**, un chip en la franja de arriba de Inicio (desplazable, máximo 8). Solo
  aparecen los plugins encendidos, utilizables y que no necesitan configuración: uno apagado, o que
  todavía pide un ajuste obligatorio, no tiene entrada. Las entradas se ordenan por etiqueta y luego por
  id del plugin. Una llamada que falla muestra un error dentro de la sección y nunca toca el resto de la
  app.
- Un manifiesto que declara `section` tiene que exportarla: si no, la instalación falla, como con
  cualquier otro export obligatorio.
- Las entradas `adult: true` siguen el [candado +18](contract.md#adult), y un `userMessage` de
  `not_found`, `unavailable` o `rate_limited` se muestra en la sección ([tu propia frase](contract.md#user-message)).

## Tus propias categorías { #categories }

Exporta `categories()` (necesita la capacidad `browse`; no hay campo en el manifiesto, Kino ve el
export):

```js
export async function categories() {
  return [{ id: "accion", title: "Acción", ref: "accion", art: "https://image.tmdb.org/t/p/w500/x.jpg" }];
}
```

- Máximo 24 mosaicos, en tu orden; `title` de máximo 40 caracteres, `ref` de máximo 4.096, `art` una URL
  de imagen (la regla de Imágenes del [contrato](contract.md#validation): `http` o `https`, no se revisa
  contra `hosts`).
- Aparecen en Categorías como un grupo con el nombre de tu plugin, y cada mosaico abre
  `browse(ref, null)`, paginado como cualquier `browse`.
- Si `categories()` falla o se pasa del tiempo, simplemente no aportas grupo. 20 s por llamada.
- Un mosaico con `adult: true` solo se muestra mientras el código +18 de la persona está desbloqueado en
  ese aparato, como cualquier [entrada +18](contract.md#adult); un grupo que queda solo con mosaicos así
  no se muestra.
- La página "Ver más" de un mosaico tiene búsqueda; con [`scopedSearch`](contract.md#scoped-search) la
  respondes tú.

## Tus colores (`theme`) { #theme }

`"theme"` recibe hasta cinco colores, cada uno `#RRGGBB`, cada uno opcional:

```json
"theme": { "accent": "#3D5AFE", "onAccent": "#FFFFFF", "background": "#101820", "surface": "#1A2733", "highlight": "#F7C948" }
```

| Token | Qué pinta |
| --- | --- |
| `accent` | en tu sección y tu pestaña de Ajustes: el chip y la pestaña seleccionados, los botones, el foco, la flecha de "Ver más"; en el reproductor: la barra de progreso, el deslizador, los estados activos y el borde de foco del TV |
| `onAccent` | el texto y los íconos dibujados encima de `accent` |
| `background` | la pantalla detrás de tu sección y tu pestaña de Ajustes |
| `surface` | en tu sección: las tarjetas, la tarjeta "Ver más" y las pestañas no seleccionadas |
| `highlight` | el texto destacado ahí; en Categorías, el título de tu grupo |

Alcance: tu sección, tu pestaña de Ajustes, el título de tu grupo en Categorías (solo ese título, en
`highlight`; sus mosaicos y su fondo siguen siendo los de Kino) y, mientras se reproduce tu contenido,
solo el `accent` y el `onAccent` del reproductor (el reproductor conserva el fondo y las superficies de
Kino). Nada más cambia en Kino, y **los errores siempre se muestran en el rojo de Kino**, diga lo que diga
tu tema.

Kino protege la lectura, así que cada color se revisa cuando se usa:

- `background` tiene que ser oscuro (luminancia relativa de máximo 0,05).
- `surface` tiene que ser oscuro (máximo 0,12) y estar al menos 1,05:1 separado del fondo.
- `accent` tiene que llegar a 3:1 contra el fondo.
- `onAccent` tiene que llegar a 4,5:1 contra `accent`.
- `highlight` tiene que llegar a 4,5:1 contra el fondo.
- Ningún color puede parecerse al rojo de Kino `#E50914` (distancia CIE76 menor de 25).

Los colores propios de Kino (los de respaldo) son `accent` `#E50914`, `onAccent` `#FFFFFF`,
`background` `#0E0E0E`, `surface` `#181818` y `highlight` `#F5F5F5`. Un color que falla vuelve al de Kino solo para ese token (`accent` y `onAccent` se juzgan y vuelven
**en pareja**); la instalación igual funciona y los demás colores se quedan. Un color que no es un
`#RRGGBB` válido se rechaza al instalar. Míralo, con los contrastes y los avisos que imprimiría Kino,
antes de publicar:

```
node sdk/run.mjs . theme
node sdk/run.mjs . section [tab]
node sdk/run.mjs . categories
```

`sdk/validate.mjs` muestra los mismos avisos.
