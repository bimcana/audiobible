# AudioBible — especificación de diseño

Fecha: 2026-10-01 · Estado: aprobado e implementado. Lo que cambió al construirlo está en `CONTINUIDAD.md`.

## 1. Qué es

App web estática, pública y gratuita, que lee la Biblia en voz alta con voces
neuronales y resaltado palabra por palabra (karaoke), en español e inglés.
Hermana de Lyrio (`../Audio-PDF`), de la que reutiliza el motor de voz y las
piezas de reproducción ya probadas. A diferencia de Lyrio no recibe archivos:
los textos vienen incluidos.

- Repositorio y publicación: `https://github.com/bimcana/audiobible.git` (GitHub Pages).
- Motor de voz: `https://lyrio-voz.onrender.com`, el mismo de Lyrio, sin cambios.
- Nombre: **AudioBible**.
- Canon: 66 libros.

## 2. Versiones incluidas

Solo versiones de dominio público o con licencia que permite redistribuir.
Fuente del texto: helloao.org (`https://bible.helloao.org/api/{id}/complete.json`),
conversión del corpus de eBible.org. La licencia de cada una se verificó en
`https://ebible.org/{id}/copr.htm`.

| Id propio | Versión | Id helloao | Licencia |
|---|---|---|---|
| `rv1909` | Reina-Valera 1909 | `spa_r09` | Dominio público |
| `rvg` | Reina Valera Gómez | `spa_rvg` | Copyright; reproducción gratuita permitida sin alterar el texto |
| `nbv` | Nueva Biblia Viva 2008 (Biblica Open) | `spa_onbv` | CC BY-SA 4.0 |
| `vbl` | Versión Biblia Libre | `spa_vbl` | CC BY-SA 4.0 |
| `pddpt` | Palabra de Dios para ti | `spa_pdt` | CC BY 4.0 |
| `kjv` | King James Version | `eng_kjv` | Dominio público |
| `bsb` | Berean Standard Bible | `BSB` | Dominio público (desde 2023) |
| `web` | World English Bible | `ENGWEBP` | Dominio público |
| `asv` | American Standard Version | `eng_asv` | Dominio público |
| `lsv` | Literal Standard Version | `eng_lsv` | CC BY-SA 4.0 |

### Versiones que no se incluyen, y por qué

RVR1960, RVR1995, DHH (Sociedades Bíblicas Unidas), NVI y NIV (Biblica), NTV
(Tyndale), ESV (Crossway) y NKJV (HarperCollins Christian) tienen derechos de
autor y sus titulares limitan la cita a unos 500 versículos sin libros
completos. Vías descartadas tras investigarlas:

- **Incluir el texto**: redistribución sin licencia.
- **API.Bible**: sus términos prohíben convertir texto con copyright en audio,
  limitan a 3 versiones y 5 000 llamadas al mes, y exigen clave secreta.
- **Extraer de otra web (bible.com, bibliavida.com)**: es la misma
  redistribución a través de un intermediario, más frágil.

Vías abiertas:

- **Importador local** (fase 3, ver §8): cada usuario carga un archivo propio
  que se queda en su dispositivo.
- **Cartas de solicitud de permiso** a las editoriales (tarea aparte).
- **Enlaces de salida**: el selector de versiones ofrece «Leer en bible.com»
  para esas versiones, abriendo el mismo capítulo en su sitio.

La carpeta `NVI/` (PDF del usuario) queda fuera de git y solo sirve para
verificar el importador local.

## 3. Arquitectura

App sin paso de compilación: HTML, CSS y módulos ES. Cada módulo tiene una sola
responsabilidad; ningún archivo concentra la app como el `app.js` de Lyrio.

```
index.html
styles/            tokens, temas, componentes
src/
  datos/           carga de libros, catálogo de versiones, referencias cruzadas
  referencia/      análisis y formato de referencias («jn 3 16»), nombres de libros ES/EN
  lectura/         pasajes, texto para voz, mapa palabra↔versículo, pronunciación
  voz/             cliente del motor, reproductores en relevo, velocidad, caché de audio
  ui/              lector, navegador, versiones, búsqueda, comparación, ajustes, notas, planes
  almacen/         IndexedDB: ajustes, subrayados, notas, marcadores, planes, audio
  i18n/            cadenas de interfaz ES y EN
sw.js              service worker
data/
  versiones.json   catálogo: id, nombre, idioma, licencia, aviso
  {version}/{LIBRO}.json
  refs/{LIBRO}.json
  planes/{plan}.json
herramientas/      scripts de preparación de datos (no se publican como app)
pruebas/           banco de pruebas de la lógica pura
```

### Formato de un libro

Un archivo por libro y versión. Cada capítulo es una lista ordenada de
elementos:

- `{"t":"h","x":"Jesús y Nicodemo"}` — título de sección.
- `{"t":"s","x":"Salmo de David."}` — sobrescrito de salmo.
- `{"t":"p"}` — salto de párrafo.
- `{"t":"v","n":16,"x":[...]}` — versículo; `x` es una lista de tramos:
  una cadena (texto), `{"j":"..."}` (palabras de Jesús), `{"d":"..."}`
  (acotación) o `{"l":n}` (línea nueva con sangría `n`, para la poesía).

Los espacios entre tramos van dentro del texto: concatenar los tramos de una
línea da la línea exacta. El texto no se altera respecto a la fuente. Las notas
al pie se descartan. El «¶» de la KJV se convierte en salto de párrafo.

Reglas nacidas de los datos reales:

- **Palabras de Jesús solo en el Nuevo Testamento.** La fuente de «Palabra de
  Dios para ti» usa la misma marca para lo que dice Dios en el Antiguo
  Testamento (6 214 tramos); fuera del NT la marca se ignora en todas las
  versiones.
- **Versículos vacíos se omiten.** Algunas versiones numeran distinto y dejan
  versículos sin texto (18 en la RV1909, 16 en VBL y ASV, 5 en WEB).
- **Los números de versículo pueden tener huecos** (la NBV une versículos).

### Preparación de datos

`herramientas/` descarga cada versión, la convierte y verifica: 66 libros,
número de capítulos por libro, y número de versículos por capítulo **igual al
de la fuente** (no contra una cifra fija: la NBV une algunos versículos y tiene
29 102). Falla con un informe si algo no cuadra. Las referencias cruzadas salen
de `https://a.openbible.info/data/cross-references.zip` (CC BY), filtradas por
votos y partidas por libro.

### Almacenamiento en el dispositivo

IndexedDB guarda ajustes, posición de lectura, subrayados, notas, marcadores,
progreso de planes y audio. Los datos del usuario se indexan por referencia
(`JHN.3.16`), no por versión. Hay exportar e importar a un archivo JSON.

## 4. Motor de lectura

**Pasaje.** Unidad que se envía al motor: los versículos de un mismo párrafo
unidos en un texto corrido, **sin números de versículo**. En versiones sin
marcas de párrafo, los versículos se agrupan hasta cerrar oración y alcanzar un
tamaño objetivo (unos 600 caracteres; nunca más de los 4 000 que acepta el
motor). Los títulos de sección no se leen.

**Mapa de posiciones.** Al construir el texto del pasaje se registra a qué
versículo y a qué posición del texto en pantalla corresponde cada carácter. Los
tiempos de palabra que devuelve el motor se traducen con ese mapa, igual que
`reubicarPalabras()` en Lyrio.

**Pronunciación.** Una capa por versión transforma solo el texto enviado a la
voz (acentos antiguos de la RV1909, números con separador de miles). La
pantalla muestra siempre el texto original.

**Anuncio de capítulo.** Solo en la transición automática de un capítulo al
siguiente: «Capítulo 4»; si cambia el libro, «Éxodo. Capítulo 1»; en Salmos,
«Salmo 23» (en inglés: «Chapter 4», «Psalm 23»). No se anuncia al pulsar Play
ni al saltar manualmente.

**Karaoke.** Palabra resaltada y oración en curso destacada. El texto se
desplaza al terminar una oración, con la línea anclada a 1/4 de pantalla. Los
números de versículo se muestran pequeños y tenues, y se pueden ocultar.

**Reproducción.** Dos elementos de audio en relevo con el pasaje siguiente
precargado; velocidad de 0,5× a 2× repartida entre motor y reproductor, como en
Lyrio. Al terminar un capítulo continúa con el siguiente, salvo que el ajuste
«detenerse al final del capítulo» esté activo.

**Controles.** Play/Pausa · Repetir capítulo (vuelve al versículo 1 del
capítulo actual y arranca) · capítulo anterior y siguiente · voz · velocidad ·
tamaño de letra · temporizador de apagado (15, 30, 60 min, fin de capítulo).
Tocar una oración lleva la lectura ahí y la arranca.

**Voces.** Una voz recordada por idioma; al cambiar de versión cambia sola.

**Pantalla bloqueada.** Media Session con título («Juan 3 · RV1909») y
controles.

**Fallos.** Motor dormido: aviso «despertando la voz». Sin red y sin audio
descargado: se ofrece la voz del dispositivo.

## 5. Sin conexión

- PWA instalable. El service worker guarda la app y cada libro que se abre.
- Caché de audio: todo pasaje escuchado se guarda (audio y tiempos), con clave
  `versión | libro | capítulo | pasaje | voz | velocidad del motor`.
- **Descarga por capítulo**: icono en el encabezado del capítulo y en la
  rejilla de capítulos, con estados disponible, descargando (progreso) y
  descargado. Descarga todos los pasajes del capítulo con la voz actual.
- Panel de almacenamiento en Ajustes: espacio usado y borrado por libro o versión.

## 6. Interfaz

Carácter: editorial sereno. Tipografía serif de lectura, mucho aire, color
contenido. Interfaz en español e inglés según el dispositivo, cambiable.

- **Arranque** directo en la última posición; la primera vez, Juan 1.
- **Barra superior**: referencia, versión, búsqueda, menú. Se oculta al leer.
- **Navegador**: libros por testamento y grupo, rejilla de capítulos, campo que
  interpreta referencias escritas.
- **Selector de versiones**: por idioma, con descripción breve; elección de
  versión para comparar; sección «Leer en bible.com».
- **Comparación**: dos columnas alineadas por versículo en pantallas anchas;
  intercalada en el móvil. Voz y karaoke siguen a la versión principal.
- **Búsqueda**: palabra o frase en la versión activa, en un worker; resultados
  por libro con filtros de testamento y libro. La primera búsqueda descarga la
  versión completa.
- **Menú de versículo** (pulsación larga, uno o varios): subrayar, nota,
  marcador, copiar con referencia, compartir, referencias cruzadas, ver en
  todas las versiones.
- **Ajustes de lectura**: temas claro, sepia, oscuro y negro; tres tipografías;
  tamaño, interlineado, ancho de columna; párrafos o versículo por línea;
  números de versículo; palabras de Jesús en color.
- **Adaptación**: paneles inferiores en móvil; panel lateral y atajos de
  teclado en escritorio.
- **Accesibilidad**: contraste AA en todos los temas, teclado completo,
  etiquetas para lector de pantalla, movimiento reducido.
- **Licencias**: pantalla con el aviso y la licencia de cada versión y de las
  referencias cruzadas.

## 7. Estudio personal y planes

- Subrayados en cinco colores, notas por versículo o rango, marcadores.
  Pantalla «Mis notas» con filtros y exportación.
- Planes: Biblia en un año, Nuevo Testamento en 90 días, Salmos y Proverbios en
  60 días, Evangelios en 30 días. Un capítulo se marca al terminar de leerlo o
  escucharlo. Progreso y racha, sin notificaciones.

## 8. Importador local de Biblias propias

Permite usar una versión que el usuario ya posee sin que la app la distribuya.
El archivo se procesa en el navegador y el resultado se guarda en IndexedDB con
el mismo formato de libro de §3; **nada se sube ni se incluye en el
repositorio**. Una versión importada tiene las mismas funciones que una
incluida y aparece en el selector bajo «Mis versiones».

**Alcance en la versión 1:** un solo perfil de archivo, el de los PDF de
`NVI/` (libro electrónico convertido con Calibre). Otros archivos se rechazan
con un mensaje claro si la validación falla. No se intenta un importador
universal.

**Flujo.** En el selector de versiones, «Añadir una Biblia propia» → se
arrastran uno o varios PDF (los cuatro de la NVI de una vez o por separado) →
progreso por archivo → informe de validación → nombre y sigla de la versión.
Archivos añadidos después se fusionan en la misma versión.

**Lectura del PDF.** pdf.js, incluido en el repositorio como en Lyrio y cargado
solo al importar, con `disableNormalization: true` y sus `cmaps` y
`standard_fonts`.

**Reconocimiento de estructura**, por tamaño relativo al cuerpo del texto (no
por valores absolutos), medido en los archivos reales:

| Elemento | Señal en el PDF | Destino |
|---|---|---|
| Encabezado de capítulo | Tamaño mayor (20,2 frente a 14,4), texto «LIBRO N» | Abre capítulo; el libro se resuelve con la tabla de nombres. «SALMO»/«SALMOS» → Salmos |
| Número de versículo | Tramo solo de dígitos, tamaño menor (10,8) | Abre versículo |
| Título de sección | Negrita, versalitas (mezcla 16,6 / 11,6) | Elemento `h` |
| Pasajes paralelos | Negrita cursiva («1:1–17 — Lc 3:23–38») | Se descarta |
| Llamada de nota | Tramo menor con forma `[n]` | Se descarta |
| Asterisco de glosario | `*` pegado al inicio de palabra | Se descarta |
| Salto de línea dentro de párrafo | Línea que no cierra bloque | Se une con espacio |
| Portada, índices por libro | Páginas sin encabezado de capítulo | Se ignoran |

**Palabras de Jesús.** En el PDF van en rojo, pero `getTextContent` no entrega
color. Se intentará obtenerlo de la lista de operadores de la página. Si no
resulta fiable, la versión importada no las marca; no bloquea la entrega.

**Validación antes de guardar.** 66 libros (o los que traiga el archivo, con
aviso de los que faltan); número de capítulos de cada libro igual al canónico;
versículos en orden creciente dentro de cada capítulo, admitiendo huecos (la
NVI omite algunos versículos); ningún versículo vacío; ningún `[n]` ni `*`
residual en el texto.

**Archivo de traspaso.** Una versión importada se puede guardar como un solo
archivo (`.audiobible`, JSON comprimido con los 66 libros) e instalarse en otro
dispositivo del usuario abriéndolo desde «Añadir una Biblia propia», sin volver
a procesar los PDF. La app no aloja ni comparte ese archivo.

**Privacidad y repositorio.** `NVI/` está en `.gitignore`. El texto importado
solo sale del dispositivo, pasaje a pasaje, hacia el motor de voz, igual que
cualquier libro en Lyrio.

## 9. Fases

1. **Textos**: scripts, 10 versiones verificadas, referencias cruzadas.
2. **Lector y voz**: navegación, versiones, temas, lectura continua, karaoke,
   controles, anuncio de capítulo. Primera publicación.
3. **Importador local**, verificado con los cuatro PDF de `NVI/`.
4. **Sin conexión**: PWA, caché de audio, descarga por capítulo, almacenamiento.
5. **Estudio**: búsqueda, comparación, subrayados, notas, marcadores,
   referencias cruzadas.
6. **Planes, inglés y licencias**. Versión 1 completa.

## 10. Verificación

- **Importador**: los cuatro PDF de `NVI/` producen 66 libros y pasan la
  validación; pasajes de muestra (Juan 3, Salmo 23, Génesis 1) se comparan con
  la extracción de PyMuPDF como referencia.

- **Textos**: conteos contra la fuente y comparación de pasajes de muestra
  carácter a carácter.
- **Voz**: sobre el texto enviado al motor, comprobar que no contiene números
  de versículo; comprobar que cada palabra resaltada cae en su versículo.
- **Lógica pura** (referencias, pasajes, mapa de posiciones, planes): banco de
  pruebas automático en `pruebas/`.
- **Interfaz**: navegador real en ancho de móvil, tableta y escritorio, y en
  cada tema.
- **Sin conexión**: sin red, un capítulo descargado se lee y se escucha.

## 11. Fuera de alcance en la versión 1

Importar formatos distintos del perfil de §8 · notas al pie del traductor · libros deuterocanónicos · sincronización entre
dispositivos · repetición en bucle · exportación a MP3 · traducción automática.
