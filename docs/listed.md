# Aparecer en Kino

La gente consigue tu plugin de dos maneras:

- **Escribiendo su dirección.** En Kino, en Plugins, el botón **+** (en el televisor, **Agregar**), y
  `usuario/repositorio`. Esto funciona siempre que el repositorio sea público.
- **Encontrándolo en la app, sin saber la dirección.** Kino muestra una lista, **"De la comunidad"**,
  con los plugins que encuentra solo en GitHub. Esta página explica cómo entrar en esa lista.

Nadie aprueba los plugins de la comunidad: la app los busca ella misma en GitHub, con las reglas de
abajo. Si cumples los cinco pasos, apareces.

## Los cinco pasos { #steps }

### 1. Un repositorio público, creado con la plantilla (no un fork) { #public-not-fork }

- Crea el repositorio con el botón verde **Use this template → Create a new repository** de
  [kino-plugin-archive](https://github.com/kinotvapp/kino-plugin-archive) o
  [kino-plugin-own-server](https://github.com/kinotvapp/kino-plugin-own-server), y escoge **Public**.
  **Nunca uses el botón Fork**: Kino deja los forks por fuera de la lista. Un fork se reconoce porque
  debajo de su nombre dice "forked from …"; si el tuyo lo es, crea uno nuevo con la plantilla y pasa
  tus archivos.
- ¿Lo creaste privado? En tu repositorio: **Settings → General**, al final **Danger Zone → Change
  visibility → Change to public**. Un repositorio privado no se puede ni buscar ni instalar.

### 2. `kino-plugin.json` en la raíz y válido { #valid-manifest }

- Kino lee `https://raw.githubusercontent.com/<usuario>/<repositorio>/HEAD/kino-plugin.json`: el
  archivo tiene que estar en la **raíz** de la **rama principal** (un plugin en una subcarpeta se puede
  instalar escribiendo su dirección, pero no aparece en la lista).
- Revísalo con el kit: `node sdk/validate.mjs .` tiene que terminar en
  `✓ Kino would accept this plugin` y **sin** la línea "No aparecerá en la búsqueda de Kino" (esa línea
  sale cuando el manifiesto dice `"discoverable": false`).
- Un `apiVersion` más nuevo que el Kino de la persona la deja sin verlo. Kino 0.9.54 llega hasta `8` (0.9.51 a 0.9.53, hasta `7`; 0.9.50, hasta `6`; 0.9.45 a 0.9.49, hasta `5`); usa
  el más bajo que te sirva y llegarás también a los Kino viejos.
- Un `id` tuyo: nunca el `archive-org` de la plantilla, ni el de un plugin recomendado
  (`internet-archive`, `own-server`). Con un id ajeno tu plugin queda oculto
  ([por qué](publish.md#discovery-hidden)).

### 3. Un buen nombre y una buena descripción, en el manifiesto { #name-description }

La tarjeta de tu plugin en Kino muestra el `name` y la `description` **de `kino-plugin.json`**, no los
de GitHub. Escríbelos en español, para la persona que va a escoger fuentes en su televisor:

- `name`: de 1 a 40 caracteres, corto y reconocible ("Cine clásico", no "my-plugin-v2").
- `description`: hasta 300 caracteres. Di qué hay (películas, series, anime, canales en vivo), de
  dónde sale y si pide algo (una cuenta, la dirección de un servidor). Sin descripción la tarjeta
  queda sin texto.

```json
"name": "Cine clásico",
"description": "Películas de dominio público de archive.org, con subtítulos en español cuando los hay. No pide cuenta."
```

Opcionales, pero ayudan a que la tarjeta se vea bien: `color` (`#RRGGBB`) e `icon` (un PNG cuadrado
de máximo 128 KB).

### 4. El topic `kino-plugin` y la descripción de GitHub { #topic }

El topic es **obligatorio**: es la única forma en que Kino encuentra un plugin. Ponlo en **el mismo
repositorio que tiene `kino-plugin.json`**.

**Con clics**, en la página de tu repositorio en GitHub:

1. A la derecha, en el recuadro **About**, toca el engranaje **⚙**.
2. En **Description**, escribe una línea que diga qué es ("Plugin de Kino: películas clásicas de
   archive.org").
3. En **Topics**, escribe `kino-plugin` y oprime Enter (queda como una etiqueta azul).
4. Toca **Save changes**.

**Con la terminal** (si tienes [GitHub CLI](https://cli.github.com/)):

```
gh repo edit USUARIO/REPOSITORIO --add-topic kino-plugin --description "Plugin de Kino: películas clásicas de archive.org"
```

Kino no lee la descripción de GitHub, pero ponla igual: es lo que ve quien llega a tu repositorio desde
[github.com/topics/kino-plugin](https://github.com/topics/kino-plugin) o desde una búsqueda de GitHub,
y una línea clara hace que más gente lo pruebe y le dé una estrella.

### 5. Compruébalo { #check }

1. **¿GitHub ve el topic?** Abre `https://api.github.com/repos/USUARIO/REPOSITORIO` en el navegador y
   busca `"topics"`: tiene que decir `"kino-plugin"`. También debe salir en
   [github.com/topics/kino-plugin](https://github.com/topics/kino-plugin).
2. **¿Está en la búsqueda que hace Kino?** Abre
   [esta búsqueda](https://api.github.com/search/repositories?q=topic:kino-plugin+fork:false&sort=stars&order=desc&per_page=50)
   (es exactamente la que hacen Kino 0.9.53 y anteriores; desde Kino 0.9.54 la app pide `per_page=100`,
   ordenado por `stars` o por `updated`, y lee más páginas con "Cargar más") y busca tu repositorio en
   `items`.
3. **En la app.** Abre Plugins (en el celular: el menú **☰ → Plugins**; en el televisor:
   **Ajustes → Plugins**), pestaña **"De la comunidad"**, y toca **Actualizar**. Tu tarjeta sale con tu nombre, tu descripción y "por &lt;tu usuario&gt;". La misma
   lista sale en "Elige tus fuentes", la pantalla que Kino muestra cuando no hay ninguna fuente.

## Cuánto tarda { #timing }

- **GitHub** indexa un topic nuevo (o un repositorio que se acaba de volver público) a su propio
  ritmo: normalmente minutos, sin plazo prometido.
- **Kino** guarda la lista en cada dispositivo y solo le vuelve a preguntar a GitHub cuando esa copia
  tiene más de **12 horas**, o cuando la persona toca **Actualizar** (máximo una vez cada 60 segundos).
- **Los archivos** de tu repositorio (`raw.githubusercontent.com`) tienen un caché de unos 5 minutos:
  un cambio en el manifiesto puede tardar eso en verse.

## En qué orden sale { #ranking }

**Desde Kino 0.9.54** la app lee los resultados de a 100 (`per_page=100`), en el orden que elige la
persona: "Populares" (más estrellas primero, `sort=stars`, el de partida) o "Recientes" (lo actualizado
más recientemente primero, `sort=updated`). "Cargar más" lee los 100 siguientes y "Buscar en GitHub"
encuentra un plugin por el nombre y la descripción de su repositorio, así que también se puede
encontrar un plugin sin estrellas ([detalle](publish.md#discovery-0954)).

**Kino 0.9.53 y anteriores** ordenan por **estrellas** de GitHub y se quedan con los **30 primeros** de
una sola búsqueda de 50 resultados; más abajo no se lista. Los que no cumplen las reglas igual ocupan
su puesto, así que la lista puede tener menos de 30.

En cualquier caso, las estrellas te suben: pídele a la gente que usa tu plugin que le dé una ⭐ al
repositorio.

Un plugin que el equipo de Kino recomienda sale en "Recomendados", no en "De la comunidad". Instalar
cualquier plugin de la lista pasa por la misma hoja de consentimiento ("Plugin no verificado…"): nada
se instala solo.

## Si no aparece { #not-showing }

Recorre [«Mi plugin no aparece»: qué revisar](publish.md#troubleshooting); cada regla exacta, con sus
números, está en [Hazte encontrar](publish.md#get-found).
