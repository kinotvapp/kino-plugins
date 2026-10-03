# Pasar lo guardado a tu plugin (`migrate`, apiVersion 6)

Cuando tu plugin cambia la forma de sus refs, o se hace cargo de títulos que antes abría otra fuente,
declara la capacidad `migrate` (con `"apiVersion": 6`, Kino 0.9.50) y exporta `migrate(input)`. Kino lo
llama en segundo plano por cada valor que tiene guardado y que ya no puede abrir:

| `input` | Qué es | Respuesta esperada |
| --- | --- | --- |
| `{ kind: "title", ref }` | un título de la biblioteca | `{ kind: "movie" \| "series", id, ref }` |
| `{ kind: "chapter", ref, season, episode }` | cada uno de sus capítulos | `{ kind: "episode", ref, season, number }` |
| `{ kind: "live", provider, code }` | un canal en favoritos o recientes | `{ kind: "live", code }` |

Responde con lo que `search()` devolvería hoy para eso, o `null` cuando no es tuyo.

```js
export async function migrate(input) {
  if (input.kind === "title") {
    const id = oldIdFrom(input.ref);              // tu propia lectura del ref viejo
    if (!id) return null;
    const t = await lookUp(id);
    return { kind: t.isSeries ? "series" : "movie", id: t.id, ref: t.ref };
  }
  if (input.kind === "chapter") {
    const ep = await findEpisode(input.ref, input.season, input.episode);
    return ep ? { kind: "episode", ref: ep.ref, season: ep.season, number: ep.number } : null;
  }
  if (input.kind === "live") {
    const code = channelCodeFrom(input.provider, input.code);
    return code ? { kind: "live", code } : null;
  }
  return null;
}
```

## Las reglas { #rules }

- Declarar `migrate` agrega "Revisar lo que tienes guardado (biblioteca, historial, favoritos) para
  pasarlo a este plugin" a la hoja de consentimiento, y una actualización que la agrega espera la
  aprobación de la persona como cualquier alcance nuevo: tu plugin ve lo que ella guardó.
- Kino les pregunta a los plugins instalados con `migrate` en el orden de su id; gana la primera
  respuesta.
- Una serie solo se pasa cuando cada capítulo guardado se responde como `episode`.
- El progreso visto, las marcas de intro/final, las descargas y los favoritos se pasan con el título.
- Un `null` se recuerda hasta la siguiente versión de tu plugin, así que devolver `null` es barato. Lo
  mismo un error lanzado por tu propio código, o un `kino.error` con cualquier código menos `timeout`,
  `network`, `host_not_allowed`, `unavailable`, `rate_limited` o `auth_required`: esos pocos significan
  "ahora no", y Kino vuelve a preguntar en una ejecución posterior (mientras tanto no se le pregunta a
  ningún plugin después del tuyo por ese valor).
- Nunca devuelvas un ref que empiece por `plg1:`.
- No hagas peticiones dentro de `migrate` salvo que sea necesario: corre por cada valor guardado, 10 s
  cada uno.
- Un valor que nadie reclama no se borra: se queda guardado, sin abrirse, por si un plugin lo reclama
  después.
- Con `"telemetry": "verbose"`, los resultados de `migrate` se reportan como casos especiales
  ([Registro y telemetría](diagnostics.md#telemetry)).

Pruébalo con el kit: `node sdk/run.mjs ./plugin.js migrate '{"kind":"title","ref":"<ref viejo>"}'` (imprime lo que Kino conservaría de tu respuesta).
