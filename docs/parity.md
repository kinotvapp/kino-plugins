# Probar como la app (render real)

El kit de Node revisa tu plugin con las reglas de Kino y ejecuta sus funciones, pero **no lo dibuja**: `run.mjs . screen`
imprime el árbol que Kino resolvería, no lo que la persona ve. Para eso está **`kino-parity`**, un complemento del kit
que pone tu plugin delante del mismo renderizador que la app lleva dentro y lo conduce: abre la pantalla, pulsa por
`key`, escribe, vuelve atrás y guarda qué cambió en cada frame.

El kit sigue sin dependencias: el complemento es **otro repositorio** que se clona el kit dentro y trabaja con él, sin
tocar una línea de `sdk/`.

## Qué te deja ver

| Con el kit | Con el complemento |
|---|---|
| el árbol validado (`run.mjs . screen`) | la pantalla **dibujada** con el renderizador del APK |
| un `screenEvent` suelto | una **sesión**: open → tap → frame → type → frame → back |
| `kino.fetch` simulado o `--record` | **red real** con `--net live`, grabada en `cassette.json` y reproducible sin conexión con `--net cassette` |
| nada comparado entre versiones | **goldens** de árbol, texto, HTML y píxeles, y `diff` entre dos ejecuciones |
| sin capturas ni informe | **una carpeta por paso**: `screen.txt`, `root.html`, `shot.png` y `report.md` |

Lo que el renderizador no conoce sale en `unsupported()`: un árbol válido puede dibujarse mal, perder nodos o romper
el foco, y eso es justo lo que el kit no puede ver.

Lo que la tabla no incluye porque **necesita un aparato o trabajo de datos**: la comparación con el resolver Kotlin de la
app (hace falta el repo de la app), el contraste con el teléfono (`device`, que pide `adb` y un aparato conectado) y el
corpus de los plugins del catálogo, que se añade de a uno y revisado a mano. Los goldens de píxeles necesitan un
navegador que arranque; sin él se comparan árbol, texto y HTML, y el paso lo dice en vez de fingir que pasó.

## Instalación

Necesitas **Node 22 o más nuevo** y `git`. Chromium es opcional (ver [niveles](#niveles-sin-navegador-tambien-se-prueba)).

```bash
git clone https://github.com/kinotvapp/kino-parity
cd kino-parity
npm ci                    # jsdom; playwright-core, pixelmatch y pngjs son opcionales
npx kino-parity setup     # clona el kit en vendor/, lo verifica y prueba que arranca
npx kino-parity doctor    # qué quedó y hasta dónde se puede llegar (N0/N1/N2)
```

`setup` deja el kit **fijado por commit**: `compat.json` guarda el commit, la `apiVersion` del contrato y un hash del
árbol de `sdk/`, y `setup` se niega a correr con otro kit. Si el clon no coincide, lo reemplaza entero; si el humo
posterior falla, **restaura el anterior** y sale con código 3. Nunca edita `vendor/` con `git pull` ni corre
`npm install` dentro del kit.

```bash
npx kino-parity setup --frozen      # CI: falla si algo no coincide y no toca nada
npx kino-parity setup --try-latest  # prueba el main del kit sin mover el pin
npx kino-parity setup --self-update # actualiza el complemento y vuelve a cuadrar el par
```

## El APK, como oráculo

El renderizador y el plugin de fábrica salen del APK publicado, no de una copia:

```bash
npx kino-parity apk --file kino.apk --update   # extrae assets/web y fija sha256 en oracle.lock.json
npx kino-parity apk --file kino.apk --verify   # falla si el APK no es el del lock
```

Un APK nuevo es un PR que actualiza el lock y los goldens a la vez, revisado a mano: así un cambio de la app no se
cuela como "el test estaba mal".

## Conducir una pantalla

```bash
npx kino-parity open  --plugin ../mi-plugin --device tv --size compact --out runs/mi-plugin
npx kino-parity digest --run runs/mi-plugin        # la pantalla en texto
npx kino-parity tap   --run runs/mi-plugin --key sk:play
npx kino-parity type  --run runs/mi-plugin --key query --text "dune" --submit
npx kino-parity back  --run runs/mi-plugin
npx kino-parity shot  --run runs/mi-plugin --why "confirmar el foco"
npx kino-parity close --run runs/mi-plugin
```

Cada comando imprime **un sobre JSON** (texto por stderr, códigos `0` correcto, `2` aserción fallida, `3` entorno) y
deja su carpeta:

```
runs/mi-plugin/
  session.json
  steps/00-open/{state.json, screen.txt, root.html, shot.png}
  steps/01-tap:sk-play/{action.json, state.json, screen.txt, root.html, shot.png}
  report.md
  result.json
```

`digest` te da la pantalla en texto, que es lo que hace falta para decidir el paso siguiente:

```
Screen "Kino · Buscar"  device=tv size=compact focus=results.0 rows=7 popup=no toast=no
col key=auto-0
├ search key=query value="dune" [tap] →submit(q)
├ list key=auto-3 columns=1 items=7
│  ├ row key=n1 [tap] →play(1)  (0)
│  └ row key=n2 [tap] →play(2)  (1)
focus_order=n1,n2
```

Las keys son estables y el agente pulsa por `key`, nunca por coordenadas: un cambio de tamaño, de tema o de motor no
las mueve.

## Red y goldens

```bash
# la red del plugin, grabada y reproducible sin conexión
npx kino-parity open --plugin ../mi-plugin --net live --out runs/mi-plugin
npx kino-parity open --plugin ../mi-plugin --net cassette --cassette runs/mi-plugin/cassette.json --out runs/otra

# fijar la pantalla y compararla en cada cambio
npx kino-parity goldens ../mi-plugin --update   # árbol, texto, HTML y PNG
npx kino-parity goldens ../mi-plugin            # sale 2, con el diff, si algo cambió
```

Un cassette incompleto falla con salida `2` y lo dice: es un cassette que hay que completar grabando, no un fallo del
plugin. Los goldens se regeneran con `--update` solo cuando el cambio es el que se quería, en el mismo PR que lo causa.

## Niveles: sin navegador también se prueba

| Nivel | Qué hay | Qué puedes hacer | Qué no |
|---|---|---|---|
| **N0** | solo Node | el árbol del kit y un `screen.txt` derivado de él | ver lo dibujado, foco real, eventos |
| **N1** | Node + `npm ci` (jsdom) | render real: DOM, foco, `unsupported()`, eventos, informe | PNG |
| **N2** | N1 + Chromium que arranca | todo, más `shot.png` y goldens de píxeles | nada relevante |

Sin navegador, `shot` **no es un error**: devuelve `{"png":null,"skipped":"no-chromium"}` con salida `0` y el paso
guarda igual `root.html` y `screen.txt`. `doctor` dice en qué nivel estás y por qué (por ejemplo, un contenedor donde
Chromium no arranca porque faltan `libnss3`). Si quieres exigirlo, `--pixels require` convierte la ausencia en salida 3.

## Para agentes

El complemento está pensado para que lo conduzca un agente: `AGENTS.md` describe el bucle, y cada paso deja
`screen.txt`, el sobre JSON y una captura por frame nuevo (deduplicada por hash, con `--shot-scale` para no gastar
tokens). La imagen confirma; el texto decide. Un toque que no produce frame nuevo (`changed:false`) es un hallazgo,
no un "no pasó nada".

## Límites, dichos de frente

- La TV usa Chromium 79: no hay `flex-gap` ni `aspect-ratio`. El complemento fija una versión de Chromium y marca lo
  que no puede probar.
- jsdom no tiene layout: estructura, foco y eventos sí; geometría y píxeles solo en Chromium.
- Lo nativo (reproductor, DRM, selector de archivos, QR, bóveda, overlay del slot en TV) no se simula: eso sigue
  pidiendo un aparato.
- Los hosts reales tienen límites y caídas: la red en vivo es de solo lectura y no puede ser requisito para fusionar
  un PR.

El contrato completo, con todas las opciones: el `README.md` del complemento.
