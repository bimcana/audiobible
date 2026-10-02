# AudioBible — documento de continuidad

Guía para retomar el proyecto en otra sesión: **qué es**, **cómo está montado**,
**qué se probó y descartó** y **qué no se debe romper**.

Última actualización: 2026-10-01 · las seis fases terminadas: versión 1 completa

---

## 1. Qué es

App web estática que lee la Biblia en voz alta con las voces neuronales del
motor de Lyrio (`https://lyrio-voz.onrender.com`) y resalta palabra por palabra.
Los textos van incluidos; no se suben archivos.

- **Repositorio:** https://github.com/bimcana/audiobible
- **Especificación:** `docs/superpowers/specs/2026-10-01-audiobible-design.md`
- **Planes por fase:** `docs/superpowers/plans/`

Fases: 1 textos ✅ · 2 lector y voz ✅ · 3 importador local ✅ · 4 sin conexión ✅ · 5 estudio ✅ ·
6 planes y licencias ✅

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

---

## 8. El importador de Biblias propias (fase 3)

Permite leer una versión con derechos de autor que el lector ya tiene, sin que
la app la distribuya. El archivo se procesa en el navegador y el resultado se
guarda en IndexedDB (`src/almacen/propias.js`). **Nada se sube.**

| Ruta | Qué es |
|---|---|
| `src/importar/pdf.js` | PDF → trozos de texto con posición, tamaño, tipo de letra y color. Sirve en navegador y en Node. |
| `src/importar/perfil.js` | Trozos → libros en el formato de AudioBible. Puro; es donde está la inteligencia. |
| `src/importar/validar.js` | Comprobación contra el canon y contra señales de mala lectura. |
| `src/importar/importador.js` | Orquesta la lectura, carga pdf.js solo cuando hace falta, empaqueta el archivo de traspaso. |
| `src/ui/importar.js` | Hojas de importación y de gestión. |
| `vendor/pdfjs/` | pdf.js 4.10.38 (Apache 2.0), copiado de Lyrio. Sin `cmaps` ni `standard_fonts`: el perfil admitido lleva sus fuentes incrustadas. |
| `herramientas/probar-importador.mjs` | La prueba contra PDF reales. |

### Qué archivos reconoce

Un solo perfil: libro electrónico convertido a PDF con Calibre, con encabezados
de capítulo del tipo «JUAN 3». Es el de los cuatro PDF de `NVI/`. Todo se decide
por tamaño **relativo al cuerpo del texto** y por la sangría de cada renglón;
la tabla está en la cabecera de `perfil.js`.

### Lo que costó averiguar

**El color sí se puede recuperar.** `getTextContent()` no lo da, pero las
órdenes de dibujo (`getOperatorList()`) sí, y su texto coincide carácter a
carácter con el de `getTextContent()` si se ignoran los blancos. Con eso se
asigna un color a cada carácter. El rojo son las palabras de Jesús; **el azul
son los enlaces del libro electrónico** (asteriscos de glosario, llamadas de
nota, navegación entre testamentos) y se descarta. Si en una página no casan
las cuentas, esa página se lee sin color.

**Los nombres de las fuentes** («LiberationSerif-BoldItalic») salen de
`page.commonObjs.get(fontName).name`, disponible tras `getOperatorList()`. La
negrita son títulos de sección; la negrita cursiva, pasajes paralelos.

**Las versalitas son dos tamaños de mayúsculas.** «GENEALOGÍA» llega como «G» a
16,6 y «ENEALOGÍA» a 11,6: las letras grandes son las mayúsculas reales, las
pequeñas se pasan a minúscula. «SEÑOR» en el cuerpo (S a 14,4 y EÑOR a 10,8) se
deja en mayúsculas: no es un número de versículo porque no son cifras.

**La NVI une versículos.** «5-6» en letra pequeña abre el versículo 5 y guarda
`f: 6`; se muestra «5-6» y no cuenta como hueco.

**Las notas van al final de cada libro**, en letra menor de 0,62 × cuerpo. El
primer renglón así cierra el capítulo, y todo lo que sigue se ignora hasta el
próximo encabezado: índices, glosario, tablas de pesos y medidas.

**Un encabezado puede llevar una llamada pegada** («SALMO 9[9]»): nueve salmos
no se reconocían por eso.

### Cómo se sabe que lee bien

`node herramientas/probar-importador.mjs NVI/*.pdf` sobre los cuatro archivos:
66 libros, 1 189 capítulos, 31 054 versículos, cero errores, 12 segundos. Los
únicos avisos son 16 saltos de numeración, y **son exactamente los 16
versículos que la NVI omite** por crítica textual (Mateo 17:21, 18:11, 23:14;
Marcos 7:16, 9:44, 9:46, 11:26, 15:28; Lucas 17:36, 23:17; Juan 5:4; Hechos
8:37, 15:34, 24:7, 28:29; Romanos 16:24). Esa coincidencia es la mejor prueba
de que no se pierde ni se inventa ningún versículo.

`pruebas/importar.test.mjs` cubre cada regla con páginas inventadas, porque los
PDF reales no pueden estar en el repositorio.

### El archivo de traspaso

`.audiobible` es el JSON de la versión, comprimido con gzip
(`CompressionStream`). La NVI ocupa 1,5 MB y se instala en 0,3 segundos. Sirve
para pasar la versión del ordenador al teléfono sin volver a leer los PDF. Es
una copia personal del lector: la app no la aloja.

---

## 9. Sin conexión (fase 4)

Tres cosas distintas, guardadas en tres sitios:

| Qué | Dónde | Cómo se llena |
|---|---|---|
| La app (HTML, estilos, módulos) | Cache `audiobible-app-v1` | `sw.js`, red primero |
| Los textos (`data/`) y las tipografías | Caches `audiobible-datos-v1` y `audiobible-fuentes-v1` | `sw.js`, lo guardado primero |
| El audio y sus tiempos | IndexedDB, almacenes `audio` y `audioFichas` | `src/voz/motor.js` |

**La app va con «red primero».** Con conexión siempre se sirve lo último, entero;
sin conexión, lo guardado. Así desaparece el problema de Lyrio con los `?v=`:
no hay forma de mezclar un HTML nuevo con módulos viejos.

**Los textos van con «guardado primero»** porque no cambian. Consecuencia: si
se regenera `data/` o se añade una versión al catálogo, **hay que subir el
número de `DATOS` en `sw.js`**, o los dispositivos seguirán con lo viejo.

**El audio se guarda por texto y voz, no por capítulo.** La clave es
`voz | huella del texto | velocidad`. Todo pasaje que se escucha queda
guardado; el icono de descarga de cada capítulo solo adelanta ese trabajo y
añade el anuncio del capítulo.

**Un capítulo cuenta como descargado si están todos sus pasajes con la voz en
uso, a cualquier velocidad.** Un audio grabado a otra velocidad se aprovecha
acelerándolo o frenándolo en el reproductor (`ritmo(clip)` usa la velocidad a
la que se grabó ese audio). Solo se pide otro al motor si el estirón saldría de
0,6–1,7, donde ya suena forzado.

**El sonido y su ficha van en almacenes separados** con la misma clave. Para
saber qué hay guardado se leen solo las fichas; leer el almacén de sonido
cargaría todos los MP3 en memoria.

**Sin red y sin el anuncio guardado, el anuncio se salta** en vez de pasar a la
voz del dispositivo: el capítulo que sigue puede estar descargado.

Medido: descargar el Salmo 23 son 2 peticiones; después, con las peticiones al
motor bloqueadas, la lectura arranca igual.

**Sin probar:** instalación como app en iPhone y Android, y el límite de
almacenamiento real de Safari.

---

## 10. Estudio (fase 5)

Todo vive en `src/estudio.js`, que recibe de la app solo lo que necesita
(`estado`, `irA`, `aviso`, `cargarLibro`). Los datos, en
`src/almacen/marcas.js` y `src/datos/busqueda.js`.

**Subrayados, notas y marcadores se guardan por referencia, no por versión.**
Un documento por capítulo (`JHN.3`) con sus versículos. Lo subrayado en la RVG
aparece al leer la KJV o la NVI importada. Cinco colores; cada tema tiene sus
propios tonos para que el texto siga leyéndose.

**Cómo se selecciona un versículo.** Tocando su número; con pulsación larga
sobre el texto (dedo); o con el botón derecho (ratón). Un toque normal sobre el
texto sigue llevando la lectura a esa oración, salvo que ya haya una selección
abierta: entonces añade o quita versículos. `estudio.alTocar()` decide si el
toque es suyo antes de que la app mueva la lectura.

**La búsqueda no usa un worker.** El plan lo preveía, pero recorrer los 31 000
versículos de una versión tarda milisegundos; lo lento es descargar los 66
libros la primera vez (unos 4 s), y eso no lo arregla un worker. El índice se
guarda en memoria para una sola versión. Busca palabras enteras, sin tildes ni
mayúsculas; entre comillas, la frase exacta. Si lo escrito es una referencia,
ofrece ir a ella.

**La comparación se alinea por pasaje, no por versículo.** Junto a cada
párrafo de la versión principal van los versículos de la otra que caen en su
tramo (del primer versículo del pasaje al primero del siguiente). Alinear
versículo a versículo habría obligado a partir los párrafos y a rehacer el
karaoke. En pantallas de 1 000 px o más van en dos columnas; en el móvil, la
otra versión queda debajo, en tono más suave. La voz y el karaoke siguen a la
principal.

**Referencias cruzadas:** `data/refs/{LIBRO}.json`, con la vista previa del
texto en la versión que se está leyendo.

**Copia de seguridad de las notas:** un JSON que se descarga y se restaura
desde «Mis notas». Al restaurar, ante un mismo versículo gana lo más reciente.

---

## 11. Planes de lectura y licencias (fase 6)

**Los planes se calculan, no se guardan.** `src/planes/planes.js` reparte los
capítulos de un conjunto de libros, en orden, lo más parejo posible entre los
días. Cuatro planes: la Biblia en un año (1 189 capítulos), el Nuevo
Testamento en 90 días (260), Salmos y Proverbios en 60 (181) y los Evangelios
en 30 (89). Añadir otro es una línea en `PLANES` y dos textos.

**No hay calendario.** «Hoy» es el primer día sin terminar, no la fecha. Si el
lector se salta una semana, el plan sigue donde lo dejó; nada marca retraso.
La racha sí mira el calendario (días seguidos con algún capítulo leído) y
perdona el día en curso.

**Un capítulo se da por leído al oírlo hasta el final** (`darPorLeido()` en
`app.js`, cuando la lectura pasa al capítulo siguiente o termina), en todos
los planes activos que lo incluyan. También se puede marcar o desmarcar a mano
desde la hoja «Mi lectura».

**Licencias:** `src/ui/licencias.js` muestra el aviso de cada versión tal como
está en `data/versiones.json`, que sale de `herramientas/fuentes.mjs`. Si se
añade una versión, su aviso aparece solo. Los créditos de datos, voces y
tipografías están escritos en ese módulo.

---

## 12. Pendiente y no comprobado

- **Dispositivos reales.** Todo se probó en el navegador integrado de
  escritorio y en su emulación de móvil. Falta iPhone, iPad y Android: pantalla
  bloqueada, controles del sistema, instalación como app, pulsación larga.
- **El motor compartido con Lyrio.** Si Render lo duerme, la primera lectura
  tarda hasta un minuto; si cae, caen las dos apps.
- **Permisos de las editoriales.** `docs/permisos/solicitud-biblica-nvi.md`
  está redactado y sin enviar.
- **Importador:** un solo perfil de PDF. Otros formatos (EPUB, USFM) no.
- **Versículo a versículo en la comparación**, notas al pie, deuterocanónicos,
  sincronización entre dispositivos y exportación a MP3: fuera de alcance.

---

## 13. Segunda tanda: pestañas, repetición, temario (2026-10-02)

**Tres pestañas: Biblia, Planes y Buscar** (`#pestanas`, `irAVista()` en
`app.js`). Abajo en el móvil; en pantallas de 900 px o más, un riel a la
izquierda. Cada pestaña es una `.vista`; solo una está visible. La lectura en
voz alta sigue sonando al cambiar de pestaña. Abrir un pasaje desde Planes o
Buscar pasa por `irDesdeFuera()`, que vuelve a la Biblia y señala unos
instantes el versículo de destino (`destellar()`).

**El muelle del móvil es de una sola fila**, porque debajo van las pestañas.
El nombre de la voz se oculta y queda solo su icono.

**«Repetir capítulo» es un modo, no un salto.** `estado.repetir` no interrumpe
la lectura: solo cambia lo que devuelve `siguienteUnidad()` al llegar al final
del capítulo (vuelve al pasaje 0, sin anuncio, con `vuelta + 1`). Al pulsarlo
se descarta el relevo ya precargado y se prepara otro. Cada vuelta completa
cuenta como capítulo leído en los planes.

**El desplazamiento aprovecha la pantalla.** `ANCLA = 0.12` y
`FRANJA = [0.04, 0.9]` en `ui/lector.js`: la línea que suena baja hasta el
90 % y entonces el texto vuelve arriba. La primera versión recolocaba solo al
cambiar de oración mirando dónde empezaba, y una oración larga llegaba al
100 %, fuera de la pantalla. Ahora se mira dónde **termina** la oración que
empieza (`hasta`), y hay una comprobación palabra a palabra como red de
seguridad. Medido en Juan 3 a 2×: entre el 16 % y el 87 %.

**Temario** (`src/datos/temario.js`): 45 temas en cinco categorías, cada uno
con ocho citas. Son solo referencias, así que sirven para cualquier versión.
`pruebas/temario.test.mjs` comprueba que todas existen, versículo a versículo,
en RVG y KJV. Es una selección de pasajes conocidos, sin comentario.

**Idioma, versión y posición se guardan desde el primer uso.** Los ajustes
solo se escribían al cambiarlos, de modo que el idioma dependía cada vez del
dispositivo. Y al recargar se volvía al principio del capítulo, porque el
enlace de la barra de direcciones ganaba a la posición guardada.

**Pendiente conocido:** en la RVG, dentro de las palabras de Jesús quedan
palabras sin marcar (por ejemplo en Juan 10:10). Viene de la fuente, que
separa las palabras en cursiva y pierde la marca en ellas.

**Iconos:** `python herramientas/iconos.py` genera las opciones en `iconos/`.

---

## 14. Versión privada cifrada e icono (2026-10-02)

**La NVI está en el repositorio, pero cifrada.** El autor quería tenerla en
todos sus dispositivos sin repetir la importación. Subir el texto legible a un
repositorio público sería publicarlo; cifrado con una clave que solo él tiene,
no lo es: para cualquier otra persona `privado/nvi.bin` es ruido.

| Pieza | Qué hace |
|---|---|
| `herramientas/cifrar-version.mjs` | Cifra un `.audiobible` con AES-GCM de 128 bits y una clave al azar. Escribe `privado/<id>.bin` y `privado/indice.json`. |
| `NVI/clave-nvi.txt` | La clave, en 26 letras y cifras. Está en una carpeta que git ignora. **No debe subirse nunca.** |
| `src/importar/privada.js` | En el navegador: lee la clave escrita, descarga el archivo, lo descifra con WebCrypto y lo guarda como versión propia (`propia-nvi`). |
| Ajustes → Versión privada | El campo donde se escribe la clave, una vez por dispositivo. |

Una vez desbloqueada, la versión vive en IndexedDB como cualquier otra
importada y la clave no se guarda en ningún sitio. Si la clave se filtrara,
hay que volver a ejecutar la herramienta (genera otra) y publicar de nuevo; el
archivo anterior seguiría en el historial de git, descifrable con la clave
vieja.

**Icono:** Biblia cerrada con el título y cinta roja (opción `f` de
`herramientas/iconos.py`). El título se dibuja con trazos sacados de la
tipografía, no como texto, para que se vea igual en cualquier dispositivo.

---

## 15. Versículo del día, Compartir, historial y palabras (2026-10-02)

**Compartir no usa IA ni añade peso a la app.** El autor planteó generar la
imagen con una API de Google salvo que hubiera otra vía. La hay: la imagen se
dibuja en un `<canvas>` en el propio dispositivo (`src/ui/compartir.js`) y el
fondo es una foto que se pide a `picsum.photos` (fotos de Unsplash, de uso
libre) solo al elegirla. Sin clave, sin coste y sin esperar a un modelo.

- **El banco** (`src/datos/fondos.js`) son 82 fotos elegidas y etiquetadas
  **mirándolas una a una** en hojas de contacto, no por su nombre. Trece temas:
  agua, montaña, cielo, camino, campo, árboles, luz, flores, desierto, noche,
  roca, lluvia y libro.
- **Se sugieren según lo que dice el versículo:** `temasDe()` busca palabras
  pista en español e inglés («pastor», «monte», «lámpara»…) y `fotosPara()`
  ordena el banco. Para un mismo versículo salen siempre las mismas.
- **El servicio permite usar la foto en un lienzo** (`Access-Control-Allow-Origin: *`).
  La imagen se carga con `crossOrigin = 'anonymous'`; sin eso, el navegador
  deja dibujarla pero no exportarla.
- **Sin conexión** quedan los fondos lisos. Si una foto no carga, se avisa y
  se pasa a uno liso.
- Se entra con «Abrir en Compartir» en el menú del versículo, desde el
  versículo del día, o directamente por la pestaña (que empieza con el del día).

**Versículo del día** (`src/datos/versiculo-del-dia.js`): sale de las citas
del temario, 315 sin repetir, en un orden que mezcla los temas. El mismo para
todos cada día, sin conexión ni datos nuevos. Su tarjeta va sobre el capítulo,
se quita con el aspa y vuelve al día siguiente.

**Historial** (`src/almacen/historial.js`, en `localStorage`): los últimos 30
capítulos y, de cada libro, el último por el que se pasó. Se ve en «Ir a»:
una fila de recientes y, en la rejilla de capítulos, el último leído con borde
de trazos.

**Palabras.** Al mantener el dedo sobre una palabra (o pulsarla con el botón
derecho), el menú del versículo ofrece esa palabra: su hoja muestra dónde más
aparece en la versión y, **solo con versiones en inglés**, la definición del
diccionario de Easton (1897, dominio público; `data/diccionario/en/`,
generado con `node herramientas/diccionario.mjs`). No se encontró ningún
diccionario bíblico libre en español en un formato utilizable; con versiones
en español se muestra solo la concordancia y se dice por qué.
