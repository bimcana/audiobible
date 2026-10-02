# AudioBible, fase 2: lector y voz — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una app publicable que abre cualquier capítulo de las 10 versiones y lo lee en voz alta de forma continua, con karaoke, sin pronunciar números de versículo.

**Architecture:** Módulos ES sin compilación. La lógica (referencias, pasajes, pronunciación, oraciones, velocidad) es pura y se prueba con `node:test`. El reproductor no conoce el DOM ni la Biblia: recibe «unidades» opacas y emite eventos. `src/app.js` une datos, reproductor e interfaz.

**Tech Stack:** HTML, CSS y JavaScript de navegador; `fetch`, `Audio`, Media Session, Wake Lock, `speechSynthesis`. Motor de voz de Lyrio (`POST /tts`, `GET /voices`).

**Spec:** secciones 4 y 6 de `docs/superpowers/specs/2026-10-01-audiobible-design.md`.

## Global Constraints

- Motor de voz por defecto: `https://lyrio-voz.onrender.com`. Texto máximo por petición: 4 000 caracteres.
- Ningún número de versículo llega al texto que se envía al motor.
- El capítulo solo se anuncia en la transición automática al siguiente.
- La pantalla muestra siempre el texto original; solo el texto para voz se corrige.
- Velocidad de 0,5× a 2×: motor hasta 1,6 y el resto en el reproductor, con ritmo natural 1,10 a 1×.
- Interfaz en español e inglés desde el principio (`src/i18n/textos.js`); ninguna cadena visible fuera de ahí.
- Temas: papel, sepia, noche, negro. Contraste AA. `prefers-reduced-motion` respetado.
- Sin dependencias ni compilación. Fuentes desde Google Fonts.

## Mapa de archivos

| Archivo | Responsabilidad | Pruebas |
|---|---|---|
| `src/referencia/nombres.js` | Nombres y grupos de los libros en ES y EN; título y anuncio de capítulo | sí |
| `src/referencia/analizar.js` | Texto escrito («jn 3 16») → `{libro, cap, vers}` | sí |
| `src/lectura/pasajes.js` | Elementos de un capítulo → pasajes con texto corrido y mapa de versículos | sí |
| `src/lectura/oraciones.js` | División de un texto en oraciones | sí |
| `src/lectura/pronunciacion.js` | Texto de pantalla → texto para voz, con mapa de posiciones | sí |
| `src/voz/velocidad.js` | Reparto de la velocidad entre motor y reproductor | sí |
| `src/voz/motor.js` | Cliente del motor: voces y clips, con caché en memoria | — |
| `src/voz/reproductor.js` | Dos `<audio>` en relevo sobre una cola de unidades | — |
| `src/voz/dispositivo.js` | Respaldo con la voz del sistema | — |
| `src/datos/biblia.js` | Carga del catálogo y de los libros | — |
| `src/almacen/ajustes.js` | Ajustes y posición en `localStorage` | — |
| `src/i18n/textos.js` | Cadenas de interfaz | — |
| `src/ui/*.js` | Lector, barra, navegador, versiones, voces, ajustes, hojas, avisos | navegador real |
| `src/app.js` | Estado y cableado | navegador real |
| `index.html`, `styles/*.css`, `manifest.webmanifest`, `icon.svg` | Estructura, diseño e identidad | navegador real |

## Interfaces

```js
// referencia/nombres.js
nombreLibro(id, idioma) → 'Juan'
tituloCapitulo(id, cap, idioma) → 'Juan 3' | 'Salmo 23'
anuncioCapitulo(id, cap, idioma, { conLibro }) → 'Capítulo 4' | 'Éxodo. Capítulo 1' | 'Salmo 23'
GRUPOS → [{ id, t:'AT'|'NT', libros:[ids] }]

// referencia/analizar.js
analizarReferencia(texto, idioma) → { libro, cap, vers } | null   // cap y vers pueden ser null

// lectura/pasajes.js
construirPasajes(elementos, { objetivo = 600, maximo = 1100 }) → [{
  tipo: 'texto' | 'sobrescrito',
  titulos: string[],                 // títulos de sección que lo preceden
  texto: string,                     // corrido, sin números de versículo
  versos: [{ n, cs, ce }],           // posición de cada versículo en `texto`
  jesus: [[cs, ce]], acotaciones: [[cs, ce]],
  lineas: [{ c, n }],                // línea nueva en la posición c, sangría n
}]

// lectura/pronunciacion.js
textoParaVoz(texto, { version, idioma }) → { texto, mapa }   // mapa: índice de voz → índice de pantalla, o null
reubicarPalabras(palabras, mapa) → palabras

// lectura/oraciones.js
dividirOraciones(texto) → [{ cs, ce }]

// voz/velocidad.js
repartoVelocidad(v) → { motor, reproductor, total }

// voz/motor.js
crearMotor({ url }) → { voces(), clip({ texto, voz, velocidad }) → Promise<{ url, palabras, segundos }> }

// voz/reproductor.js
crearReproductor({ clipDe, claveDe, siguiente, ritmo, al }) → {
  reproducir(unidad, { desdeCaracter }), pausar(), reanudar(), detener(), olvidarRelevo(), ajustarRitmo(),
  sonando, unidad
}
// al: { unidad(u), palabra(u, i, palabras), estado('cargando'|'sonando'|'pausa'), fin(), error(e, u) }
```

**Unidad de reproducción:** `{ tipo:'anuncio', libro, cap }` o `{ tipo:'pasaje', libro, cap, i }`. `siguiente(unidad)` es asíncrona porque puede tener que cargar el capítulo siguiente.

## Reglas de los pasajes

- Un título (`h`), un sobrescrito (`s`) o un salto de párrafo (`p`) cierran el pasaje abierto.
- El sobrescrito de un salmo es un pasaje propio y **sí se lee**; los títulos de sección no.
- Tras añadir un versículo: si el pasaje supera `objetivo` y el versículo cierra oración, se cierra. Si añadir el siguiente superaría `maximo`, se cierra antes.
- Entre versículos y entre líneas de poesía va un espacio en `texto`.

## Reglas de pronunciación

- Todas: los separadores de miles se retiran (`603,550` → `603550`), con mapa.
- `rv1909`: `á é ó ú` como palabra suelta pierden la tilde; `fué fuí dió vió` también. Misma longitud, sin mapa.
- `lsv`: `YHWH` → `Yahweh`, con mapa.

## Tareas

### Task 1: Referencias
`nombres.js`, `analizar.js` y sus pruebas. Casos: `jn 3 16`, `Juan 3:16`, `1 co 13`, `1co13`, `sal 23`, `Salmo 23`, `gn`, `apocalipsis 22.21`, `john 3`, `ps 119`, `rev 1`, capítulo fuera de rango → `null`, texto vacío → `null`.

### Task 2: Pasajes
`pasajes.js` con pruebas de cada regla, de la posición de los versículos (`texto.slice(cs, ce)` es el versículo), de las marcas de Jesús y de las líneas de poesía. Prueba sobre datos reales: en `data/*/JHN.json` cap. 3 y `data/bsb/PSA.json` cap. 23, la concatenación de los pasajes sin espacios coincide con la de los versículos, y ningún `texto` contiene un número de versículo intercalado.

### Task 3: Oraciones, pronunciación y velocidad
Portar de Lyrio `splitSentences`, `prepararTextoVoz`/`reubicarPalabras` y `repartoVelocidad`, con pruebas; añadir las reglas por versión.

### Task 4: Datos, ajustes, textos y motor
`biblia.js`, `ajustes.js`, `textos.js`, `motor.js`.

### Task 5: Reproductor
`reproductor.js` y `dispositivo.js`.

### Task 6: Interfaz
`index.html`, estilos, módulos de `ui/` y `app.js`. Lector con karaoke, barra con Play/Pausa, Repetir capítulo, capítulo anterior y siguiente, voz, velocidad, tamaño y temporizador; navegador de libros; selector de versiones; hoja de ajustes.

### Task 7: Verificación en navegador y documentación
Servidor local en `.claude/launch.json`. Medir, no mirar:
- El cuerpo de cada petición a `/tts` no contiene números de versículo.
- Al pasar de capítulo se pide un clip con el texto del anuncio; al pulsar Play, no.
- La palabra iluminada pertenece al versículo que suena.
- Móvil (375), tableta (768) y escritorio, en los cuatro temas.
Actualizar `CONTINUIDAD.md` y `README.md`.
