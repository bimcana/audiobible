# AudioBible, fase 1: textos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar en `data/` las 10 versiones de la Biblia convertidas al formato propio y verificadas contra su fuente, más las referencias cruzadas, listas para que la app las cargue.

**Architecture:** Scripts de Node sin dependencias en `herramientas/`. La conversión y la validación son funciones puras con pruebas; un único script de línea de órdenes descarga, convierte, valida y escribe. El canon vive en `src/referencia/canon.js` porque también lo usará la app.

**Tech Stack:** Node 24 (módulos ES, `fetch`, `node:test`, `node:zlib`). Sin paquetes de npm.

**Spec:** `docs/superpowers/specs/2026-10-01-audiobible-design.md`, secciones 2 y 3.

## Global Constraints

- El texto bíblico no se altera: solo se descartan notas al pie y el «¶» de la KJV.
- Palabras de Jesús (`{j}`) solo en libros del Nuevo Testamento.
- Versículos sin texto se omiten; los huecos en la numeración son válidos.
- Un archivo por libro y versión: `data/{version}/{LIBRO}.json`, con ids USFM (`GEN`, `JHN`…).
- Nada dentro de `NVI/` se lee ni se copia en esta fase.
- Código y comentarios en español; sin dependencias externas.
- Los archivos descargados van a `herramientas/.cache/`, fuera de git.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json` | Declara módulos ES y los comandos `test` y `datos`. |
| `src/referencia/canon.js` | Los 66 libros: id, capítulos, testamento. |
| `herramientas/convertir.mjs` | Libro de helloao → libro de AudioBible (puro). |
| `herramientas/validar.mjs` | Versión convertida frente a canon y fuente (puro). |
| `herramientas/refs.mjs` | TSV de OpenBible → referencias por libro (puro). |
| `herramientas/zip.mjs` | Extrae un archivo de un ZIP con `node:zlib`. |
| `herramientas/fuentes.mjs` | Catálogo de las 10 versiones: ids, licencias, avisos. |
| `herramientas/preparar.mjs` | Orquesta: descarga, convierte, valida, escribe `data/`. |
| `pruebas/*.test.mjs` | Pruebas de cada módulo puro. |
| `data/versiones.json` | Catálogo publicado, con cifras y rasgos de cada versión. |
| `data/{version}/{LIBRO}.json` | 660 archivos de texto. |
| `data/refs/{LIBRO}.json` | 66 archivos de referencias cruzadas. |

## Formatos

**Libro** (`data/kjv/GEN.json`): `{"id":"GEN","caps":[[elemento,…],…]}`.
Elementos y tramos según la sección 3 de la especificación.

**Catálogo** (`data/versiones.json`): lista de

```json
{
  "id": "rv1909", "sigla": "RV1909", "nombre": "Reina-Valera 1909", "idioma": "es",
  "descripcion": {"es": "…", "en": "…"},
  "licencia": "Dominio público", "licenciaUrl": "https://…", "aviso": "…", "cambios": "…",
  "fuente": "https://bible.helloao.org/api/spa_r09/complete.json",
  "versiculos": 31084,
  "rasgos": {"titulos": false, "jesus": false, "poesia": false, "parrafos": false}
}
```

**Referencias** (`data/refs/GEN.json`): `{"1":{"1":["PSA.115.15","PRO.8.22-PRO.8.30"]}}`
— capítulo → versículo → destinos ordenados de más a menos votos.

---

### Task 1: Andamiaje y canon

**Files:**
- Create: `package.json`, `src/referencia/canon.js`, `pruebas/canon.test.mjs`
- Modify: `.gitignore` (añadir `herramientas/.cache/`)

**Interfaces:**
- Produces: `LIBROS: ReadonlyArray<{id:string, caps:number, t:'AT'|'NT'}>`, `libro(id) → {id,caps,t,orden}|null`, `esNT(id) → boolean`.

- [ ] **Step 1:** `package.json`:

```json
{
  "name": "audiobible",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"pruebas/*.test.mjs\"",
    "datos": "node herramientas/preparar.mjs"
  }
}
```

- [ ] **Step 2:** Prueba que falla, `pruebas/canon.test.mjs`: 66 libros; 39 AT y 27 NT; suma de capítulos 1189; `libro('JHN')` da `{caps:21, t:'NT', orden:42}`; `libro('XXX')` da `null`; `esNT('GEN')` es falso y `esNT('REV')` verdadero.
- [ ] **Step 3:** `npm test` → falla por módulo inexistente.
- [ ] **Step 4:** Implementar `canon.js` a partir de dos cadenas `ID:caps` (AT y NT) y un `Map` por id.
- [ ] **Step 5:** `npm test` → pasa. Commit.

### Task 2: Conversor

**Files:**
- Create: `herramientas/convertir.mjs`, `pruebas/convertir.test.mjs`

**Interfaces:**
- Produces:
  - `convertirVersiculo(partes, {jesus}) → {tramos, parrafoAntes, vacio}`
  - `convertirCapitulo(contenido, {jesus}) → {elementos, vacios}`
  - `convertirLibro(libroFuente, {jesus}) → {libro:{id,caps}, vacios}`
  - `textoDeTramos(tramos) → string` (cada `{l}` se da como `\n`)

**Reglas, cada una con su prueba** (los ejemplos son casos reales de las fuentes):

| Entrada | Salida |
|---|---|
| `["a", {noteId:0}, "b"]` | `["a b"]` |
| `["dijo", {noteId:1}, "). El sol"]` | `["dijo). El sol"]` — sin espacio ante `, . ; : ! ? ) ] ” ’` |
| `["offspring.", {noteId:1}, "” So"]` | `["offspring.” So"]` |
| `["x:", {text:"«¡Efatá!»", wordsOfJesus:true}, "(y)"]` con `jesus:true` | `["x:", {j:" «¡Efatá!»"}, " (y)"]` |
| lo mismo con `jesus:false` | `["x: «¡Efatá!» (y)"]` |
| `[{text:"a", poem:1}, {text:"b", poem:2}]` | `[{l:1}, "a", {l:2}, "b"]` |
| `["a", {lineBreak:true}, {text:"b", poem:1}]` | `["a", {l:1}, "b"]` — marcas de línea seguidas se funden en la última |
| `[{text:"you.", poem:2}, {noteId:1}, {text:"”", poem:2}]` | `[{l:2}, "you.”"]` — un cierre suelto no abre línea |
| `["¶ And God said"]` | tramos `["And God said"]`, `parrafoAntes: true` |
| `[{text:"BETH", descriptive:true}]` | `[{d:"BETH"}]` |
| `[]` o `[{noteId:0}]` | `vacio: true` |
| parte con forma desconocida | lanza error |

Capítulo: `heading` → `{t:'h'}`, `hebrew_subtitle` → `{t:'s'}` (solo sus cadenas, unidas con espacio), `line_break` → `{t:'p'}`. Sin `p` al principio, al final ni repetidos. Un versículo vacío se omite y se cuenta. Un versículo con `parrafoAntes` va precedido de `{t:'p'}` salvo que sea el primer elemento. Tipo desconocido → error.

- [ ] **Step 1:** Escribir las pruebas de la tabla y de capítulo.
- [ ] **Step 2:** `npm test` → fallan.
- [ ] **Step 3:** Implementar. Núcleo de `convertirVersiculo`:

```js
const CIERRE = /^[,.;:!?)\]”’]/;
const SOLO_CIERRE = /^[,.;:!?)\]”’]+$/;

for (const parte of partes) {
  const objeto = typeof parte !== 'string';
  if (objeto && 'noteId' in parte) continue;
  if (objeto && parte.lineBreak) { ponerLinea(0); continue; }
  let texto = objeto ? parte.text : parte;
  if (typeof texto !== 'string') throw new Error(`Tramo desconocido: ${JSON.stringify(parte)}`);
  if (tramos.length === 0 && texto.startsWith('¶')) { parrafoAntes = true; texto = texto.slice(1).trimStart(); }
  if (texto === '') continue;
  if (objeto && parte.poem && !(hayTexto && SOLO_CIERRE.test(texto))) ponerLinea(parte.poem);
  if (hayTexto && !CIERRE.test(texto)) texto = ' ' + texto;
  hayTexto = true;
  if (objeto && parte.wordsOfJesus && jesus) tramos.push({ j: texto });
  else if (objeto && parte.descriptive) tramos.push({ d: texto });
  else if (typeof tramos[tramos.length - 1] === 'string') tramos[tramos.length - 1] += texto;
  else tramos.push(texto);
}
```

`ponerLinea(n)` sustituye el nivel si el último tramo ya es `{l}`; si no, añade `{l:n}`; y pone `hayTexto = false`.

- [ ] **Step 4:** `npm test` → pasan. Commit.

### Task 3: Validador

**Files:**
- Create: `herramientas/validar.mjs`, `pruebas/validar.test.mjs`

**Interfaces:**
- Consumes: `LIBROS`, `textoDeTramos`.
- Produces: `validarVersion(fuente, libros) → {errores: string[], cifras: {libros, capitulos, versiculos, titulos, jesus, lineas, parrafos}}`.

**Comprobaciones:** 66 libros en el orden del canon, en la conversión y en la fuente; capítulos por libro igual al canon; por capítulo, tantos versículos como versículos no vacíos tiene la fuente, y al menos uno; números enteros y crecientes; **texto idéntico al de la fuente** comparando ambos sin espacios ni «¶»; ninguna línea con espacios dobles, iniciales o finales; ningún título vacío.

- [ ] **Step 1:** Pruebas con una fuente sintética de 66 libros generada desde `LIBROS` (un versículo por capítulo): pasa limpia; quitar un libro, cambiar una letra, desordenar dos versículos e introducir un espacio doble produce, cada uno, su error.
- [ ] **Step 2:** `npm test` → fallan. **Step 3:** Implementar. **Step 4:** pasan. Commit.

### Task 4: Catálogo, script y generación de las 10 versiones

**Files:**
- Create: `herramientas/fuentes.mjs`, `herramientas/preparar.mjs`
- Create (generado): `data/versiones.json`, `data/{version}/*.json`

**Interfaces:**
- Consumes: `convertirLibro`, `validarVersion`, `esNT`.
- Produces: `VERSIONES` en `fuentes.mjs`, con `id, helloao, sigla, nombre, idioma, descripcion{es,en}, licencia, licenciaUrl, aviso, cambios`.

| id | helloao | sigla | licencia |
|---|---|---|---|
| `rv1909` | `spa_r09` | RV1909 | Dominio público |
| `rvg` | `spa_rvg` | RVG | © 2004, 2010, 2023 Dr. Humberto Gómez Caballero; distribución gratuita permitida sin cambiar el texto |
| `nbv` | `spa_onbv` | NBV | CC BY-SA 4.0 — Biblica® Open Nueva Biblia Viva™, © 2006, 2008 Biblica, Inc. |
| `vbl` | `spa_vbl` | VBL | CC BY-SA 4.0 — © 2018-2020 Jonathan Gallagher y Shelly Barrios de Avila |
| `pddpt` | `spa_pdt` | PDDPT | CC BY 4.0 — © 2020 Asociación Bíblica Latinoamericana |
| `kjv` | `eng_kjv` | KJV | Dominio público |
| `bsb` | `BSB` | BSB | Dominio público |
| `web` | `ENGWEBP` | WEB | Dominio público |
| `asv` | `eng_asv` | ASV | Dominio público |
| `lsv` | `eng_lsv` | LSV | CC BY-SA 4.0 — © 2020 Covenant Press |

`licenciaUrl` es `https://ebible.org/{idEbible}/copr.htm` (ids: `spaRV1909`, `sparvg`, `spaonbv`, `spavbl`, `spapddpt`, `eng-kjv2006`, `engbsb`, `engwebp`, `eng-asv`, `englsv`). El aviso de la NBV incluye la frase exigida por Biblica: «The original Work by its copyright holders is available for free at www.biblica.com and open.bible». `cambios` es igual en todas: «Se omiten las notas al pie. El texto no se ha modificado.»

**Comportamiento de `preparar.mjs`:**

- `node herramientas/preparar.mjs` procesa todo; `--solo kjv` una versión; `--refs` solo referencias.
- Descarga `https://bible.helloao.org/api/{helloao}/complete.json` a `herramientas/.cache/` si no está.
- Convierte cada libro con `jesus: esNT(id)`, valida, y **si hay errores imprime los 20 primeros y termina con código 1 sin escribir esa versión**.
- Escribe los 66 libros y, al final, `data/versiones.json` con `versiculos` y `rasgos` calculados de las cifras (`titulos > 0`, `jesus > 0`, `lineas > 0`, `parrafos > 0`).
- Imprime una línea por versión: sigla, versículos, omitidos, tamaño.

- [ ] **Step 1:** Escribir `fuentes.mjs` y `preparar.mjs`.
- [ ] **Step 2:** `npm run datos`. Esperado: 10 líneas, 0 errores, 1189 capítulos cada una y estas cifras (medidas en el prototipo):

| Versión | Versículos | Omitidos |
|---|---|---|
| RV1909 | 31 084 | 18 |
| RVG | 31 102 | 0 |
| NBV | 29 102 | 0 |
| VBL | 31 086 | 16 |
| PDDPT | 31 081 | 0 |
| KJV | 31 102 | 0 |
| BSB | 31 086 | 0 |
| WEB | 31 098 | 5 |
| ASV | 31 086 | 16 |
| LSV | 31 104 | 0 |

- [ ] **Step 3:** Comprobación manual de muestra: leer Juan 3:16 en las 10, Salmo 23 en BSB (poesía con sangrías) y Génesis 1:5-6 en KJV (salto de párrafo, sin «¶»). `git status` no debe mostrar nada bajo `herramientas/.cache/`.
- [ ] **Step 4:** Commit de código y de `data/` (unos 50 MB).

### Task 5: Referencias cruzadas

**Files:**
- Create: `herramientas/refs.mjs`, `herramientas/zip.mjs`, `pruebas/refs.test.mjs`
- Modify: `herramientas/preparar.mjs`
- Create (generado): `data/refs/*.json`

**Interfaces:**
- Produces:
  - `convertirRef("Prov.8.22-Prov.8.30") → "PRO.8.22-PRO.8.30"`; `null` si el libro no está en el canon.
  - `agruparRefs(tsv, {minVotos, maxPorVersiculo}) → Map<idLibro, {[cap]: {[vers]: string[]}}>`
  - `extraerDeZip(buffer) → Buffer` (primer archivo del ZIP).

**Datos:** `https://a.openbible.info/data/cross-references.zip`, un TSV `From Verse⇥To Verse⇥Votes` con cabecera; 344 799 filas; ids OSIS (`Gen`, `Ps`, `1Cor`…). Parámetros: `minVotos: 3`, `maxPorVersiculo: 12`.

- [ ] **Step 1:** Pruebas: conversión de una referencia simple y de un rango; libro desconocido → `null`; con cinco filas de ejemplo, `agruparRefs` descarta la de votos bajos, ordena por votos y respeta el máximo.
- [ ] **Step 2:** fallan. **Step 3:** Implementar. `zip.mjs` localiza el fin del directorio central (`0x06054b50`), lee la primera entrada (tamaño comprimido en +20, desplazamiento de la cabecera local en +42) y descomprime con `inflateRawSync`. **Step 4:** pasan.
- [ ] **Step 5:** Integrar en `preparar.mjs` y ejecutar `node herramientas/preparar.mjs --refs`. Esperado: 66 archivos; comprobar que `data/refs/JHN.json` trae destinos para 3:16 y que todos los destinos de todos los archivos apuntan a libros y capítulos existentes en el canon.
- [ ] **Step 6:** Commit.

### Task 6: Documentación

**Files:**
- Create: `README.md`, `CONTINUIDAD.md`

- [ ] **Step 1:** `README.md`: qué es, carpetas, cómo regenerar datos (`npm run datos`) y probar (`npm test`).
- [ ] **Step 2:** `CONTINUIDAD.md`, en el estilo del de Lyrio: fuentes y licencias, formato de datos, las reglas nacidas de los datos reales (marca de Jesús solo en NT, versículos vacíos, huecos de la NBV, «¶»), y las vías cerradas para versiones con copyright (incluirlas, API.Bible, extraer de otra web) con su porqué.
- [ ] **Step 3:** Commit.

## Verificación final de la fase

- `npm test` pasa entero.
- `npm run datos` termina con código 0 y las cifras de la tabla.
- 660 archivos en `data/` de versiones más 66 en `data/refs/`.
- `git status --ignored` muestra `NVI/` y `herramientas/.cache/` como ignorados.
