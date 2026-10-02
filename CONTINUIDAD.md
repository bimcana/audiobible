# AudioBible — documento de continuidad

Guía para retomar el proyecto en otra sesión: **qué es**, **cómo está montado**,
**qué se probó y descartó** y **qué no se debe romper**.

Última actualización: 2026-10-01 · fase 1 (textos) terminada

---

## 1. Qué es

App web estática que lee la Biblia en voz alta con las voces neuronales del
motor de Lyrio (`https://lyrio-voz.onrender.com`) y resalta palabra por palabra.
Los textos van incluidos; no se suben archivos.

- **Repositorio:** https://github.com/bimcana/audiobible
- **Especificación:** `docs/superpowers/specs/2026-10-01-audiobible-design.md`
- **Planes por fase:** `docs/superpowers/plans/`

Fases: 1 textos ✅ · 2 lector y voz · 3 importador local · 4 sin conexión ·
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
