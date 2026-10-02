# AudioBible — documento de continuidad

Guía para retomar el proyecto en otra sesión: **qué es**, **cómo está montado**,
**qué se probó y descartó** y **qué no se debe romper**.

Última actualización: 2026-10-01 · fases 1 (textos) y 2 (lector y voz) terminadas

---

## 1. Qué es

App web estática que lee la Biblia en voz alta con las voces neuronales del
motor de Lyrio (`https://lyrio-voz.onrender.com`) y resalta palabra por palabra.
Los textos van incluidos; no se suben archivos.

- **Repositorio:** https://github.com/bimcana/audiobible
- **Especificación:** `docs/superpowers/specs/2026-10-01-audiobible-design.md`
- **Planes por fase:** `docs/superpowers/plans/`

Fases: 1 textos ✅ · 2 lector y voz ✅ · 3 importador local · 4 sin conexión ·
5 estudio · 6 planes, inglés y licencias.

---

## 2. De dónde salen los textos

| Qué | Fuente | Licencia |
|---|---|---|
| Las 10 versiones | `https://bible.helloao.org/api/{id}/complete.json` (conversión del corpus de eBible.org) | Cada una la suya; ver `herramientas/fuentes.mjs` |
| Referencias cruzadas | `https://a.openbible.info/data/cross-references.zip` | CC BY 4.0 |

La licencia de cada versión se comprobó en `https://ebible.org/{id}/copr.htm`,
no en helloao, cuya documentación dice «sin restricciones» de forma demasiado
amplia: tres versiones son CC BY-SA, una CC BY y la Reina Valera Gómez tiene
copyright con permiso de distribución gratuita **sin cambiar el texto**.

`npm run datos` regenera todo. Una versión que no pasa la validación no se
escribe.

---

## 3. Formato de los datos

`data/{version}/{LIBRO}.json` → `{"id":"JHN","caps":[[elemento,…],…]}`

| Elemento | Significado |
|---|---|
| `{"t":"h","x":"…"}` | Título de sección |
| `{"t":"s","x":"…"}` | Sobrescrito de salmo |
| `{"t":"p"}` | Salto de párrafo |
| `{"t":"v","n":16,"x":[…]}` | Versículo, con su lista de tramos |

| Tramo | Significado |
|---|---|
| `"texto"` | Texto corriente |
| `{"j":"texto"}` | Palabras de Jesús |
| `{"d":"texto"}` | Acotación (letras del Salmo 119, notas al director del coro) |
| `{"l":n}` | Empieza una línea nueva con sangría `n` |

**Los espacios van dentro del texto.** Concatenar los tramos de una línea da la
línea exacta; quien pinte o lea no tiene que decidir dónde va un espacio.

`data/refs/{LIBRO}.json` → `{"3":{"16":["ROM.5.8","1JN.4.9-1JN.4.10"]}}`,
de más a menos votos, con un mínimo de 3 votos y un máximo de 12 por versículo.

`data/versiones.json` → catálogo con licencia, aviso, cifras y `rasgos`
(`titulos`, `jesus`, `poesia`, `parrafos`), para que la interfaz sepa qué
ofrecer en cada versión.

---

## 4. Reglas que nacieron de los datos reales

Cada una viene de mirar las diez fuentes enteras, no de suponer.

**La marca «palabras de Jesús» solo vale en el Nuevo Testamento.** La fuente de
«Palabra de Dios para ti» usa esa misma marca para todo lo que dice Dios en el
Antiguo Testamento: 6 214 tramos, empezando por «Haya luz». Fuera del NT se
ignora en todas las versiones.

**Hay versículos sin texto, y se omiten.** Numeraciones distintas dejan huecos:
18 en la RV1909, 16 en VBL y en ASV, 5 en WEB. Un versículo vacío no se escribe.

**Los números de versículo pueden saltar.** La Nueva Biblia Viva une versículos
(Génesis 1 pasa del 11 al 13) y tiene 29 102 en vez de unos 31 100. Nada debe
asumir que la numeración es continua ni que dos versiones tienen los mismos
versículos.

**El «¶» de la KJV es un salto de párrafo, no texto.** Hay 2 970. Se convierte
en `{"t":"p"}` y desaparece.

**Los tramos llegan sin espacios en los bordes**, separados por notas al pie.
Se unen con un espacio salvo ante un signo de cierre (`, . ; : ! ? ) ] ” ’`).
La raya de continuación española `»` no es cierre: lleva espacio delante.

**Una comilla de cierre suelta no abre línea.** En la poesía de la BSB el cierre
de una cita llega como tramo aparte tras una nota; se pega a la línea anterior.

**La validación compara el texto letra por letra** con la fuente (sin espacios
ni «¶»). Es la garantía de que no se altera nada, condición de varias licencias.

---

## 5. Vías cerradas (no volver a intentarlas)

Todas para las versiones con derechos de autor: RVR1960, RVR1995, DHH, NVI,
NTV, NIV, ESV, NKJV.

| Vía | Resultado |
|---|---|
| **Incluir el texto en el repositorio** | ❌ Redistribución sin licencia. Sus editoriales limitan la cita a unos 500 versículos y prohíben libros completos. Que existan JSON en GitHub no los hace legales. |
| **API.Bible** | ❌ Sus términos prohíben convertir texto con copyright en audio. Además: 3 versiones como máximo, 5 000 llamadas al mes en total, clave secreta y caché de 30 días. |
| **API de la ESV** | ❌ Solo permite guardar 500 versículos y exige clave secreta. |
| **Extraer de otra web** (bible.com, bibliavida.com) | ❌ El navegador no puede leer otro sitio; haría falta un servidor intermediario, y eso es la misma redistribución, más frágil. |
| **Importador local** | ✅ Cada usuario carga su propio archivo; se queda en su dispositivo. Fase 3. |
| **Permiso de la editorial** | ✅ Única vía para incluirlas como versión formal. |

La carpeta `NVI/` contiene los PDF del autor. Está en `.gitignore` y **nunca
debe entrar en el repositorio**; sirve para verificar el importador.

---

## 6. Cómo probar

`npm test` ejecuta las pruebas de `pruebas/`. Node 24 no acepta una carpeta
como argumento de `--test`; por eso la orden usa el patrón `pruebas/*.test.mjs`.

La regla heredada de Lyrio: verificar midiendo, no mirando. Para los textos, eso
es la validación contra la fuente; `npm run datos` debe terminar con diez líneas
`✔` y código de salida 0.

---

## 7. El lector y la voz (fase 2)

### Mapa del código

| Ruta | Qué es |
|---|---|
| `src/app.js` | Estado y cableado. Es el único módulo que conoce a todos los demás. |
| `src/referencia/` | Canon, nombres de libros en ES/EN, análisis de referencias escritas. |
| `src/lectura/pasajes.js` | Elementos de un capítulo → pasajes de texto corrido con mapa de versículos. |
| `src/lectura/pronunciacion.js` | Texto de pantalla → texto para voz, con mapa de posiciones. |
| `src/lectura/oraciones.js` | División en oraciones (traído de Lyrio). |
| `src/voz/reproductor.js` | Cola de unidades sobre dos `<audio>` en relevo. No conoce el DOM ni la Biblia. |
| `src/voz/motor.js` | Cliente de `lyrio-voz` con caché en memoria. |
| `src/voz/dispositivo.js` | Respaldo con la voz del sistema cuando no hay red. |
| `src/ui/` | Lector (pintado y karaoke), hoja modal, navegador, versiones, paneles. |
| `src/i18n/textos.js` | Todas las cadenas, en español e inglés. Ninguna cadena visible fuera de ahí. |
| `styles/` | `base.css` (temas y medidas), `lector.css`, `controles.css`. |

### Reglas que conviene no romper

**La unidad de voz es el pasaje, no el versículo.** Los versículos de un párrafo
se envían unidos y sin números; así la voz respira donde lo pide la puntuación.
En las versiones sin párrafos (RV1909, RVG, LSV) se agrupan hasta cerrar oración
pasados 600 caracteres, con un tope de 1 100.

**El capítulo solo se anuncia en `siguienteUnidad()`**, que es por donde pasa la
transición automática. Play, Repetir capítulo y los saltos manuales crean la
unidad directamente y no anuncian nada. El anuncio es una unidad aparte
(`tipo: 'anuncio'`), no un prefijo del primer pasaje: así su clip se reutiliza y
el karaoke no tiene que descontarlo.

**Tras un anuncio se pide ya el pasaje siguiente.** El anuncio dura dos segundos
y no daba tiempo a precargar lo que le sigue: se oía un hueco. Las unidades
marcadas `breve` hacen que el reproductor adelante la petición.

**La versión solo cambia cuando su texto ya está cargado** (`irA` con la opción
`version`). Antes se cambiaba primero y, pulsando Leer en ese instante, la voz
en inglés recibía el texto en español. Mientras un capítulo se pide,
`estado.cargando` hace que Leer no haga nada.

**Los espacios del karaoke.** Cada palabra en pantalla guarda su posición en el
texto del pasaje; los tiempos del motor llegan referidos al texto para voz y
`reubicarPalabras()` los devuelve al de pantalla. Las correcciones de la RV1909
no cambian la longitud, así que no necesitan mapa; `YHWH → Yahweh` (LSV) y los
separadores de miles sí.

**El número de capítulo cuelga del primer pasaje de texto en prosa.** Ante
poesía va suelto encima: los renglones con sangría son bloques y no pueden
rodear un elemento flotante (se encimaban en los Salmos de la BSB).

**Los pasajes inventan párrafos donde la fuente no los trae.** Es deliberado:
sin ellos, un capítulo de la RV1909 sería un bloque único. No es una afirmación
sobre el texto.

### Cómo probar

Servidor local en `.claude/launch.json` (`audiobible`, puerto 8095). Lo medido
en la fase 2, interceptando `fetch` en la página:

- Ninguna petición a `/tts` contiene dígitos en RV1909.
- Al pasar de Juan 3 a Juan 4 se pide «Capítulo 4.»; al pulsar Play, no.
- Pausa y reanudación no generan peticiones nuevas.
- Con el temporizador «al terminar el capítulo» no se pide anuncio y la lectura se detiene.
- Cambiar de versión mientras suena sigue leyendo en la nueva, en el mismo versículo.

Lo que **no** se ha probado en dispositivo real: iPhone e iPad (pantalla
bloqueada, controles del sistema, voz de respaldo sin red).
