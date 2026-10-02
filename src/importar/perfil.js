// Convierte el texto de un PDF de Biblia (libro electrónico pasado por
// Calibre) al formato de AudioBible. Función pura: recibe los trozos de texto
// de cada página con su posición y tipografía, y devuelve libros.
//
// Todo se decide por tamaño relativo al cuerpo del texto, no por valores
// absolutos, y por la posición de cada renglón respecto al margen:
//
//   encabezado de capítulo  letra ≥ 1,3 × cuerpo y texto «LIBRO N»
//   título de sección       negrita; las letras grandes son las mayúsculas
//   pasajes paralelos       negrita cursiva: se descartan
//   número de versículo     solo cifras, letra entre 0,62 y 0,9 × cuerpo
//   llamada de nota         «[12]» en letra menor: se descarta
//   notas al final          letra < 0,62 × cuerpo: cierran el capítulo
//   párrafo nuevo           renglón con sangría corta, o un hueco vertical
//   renglón de poesía       renglón con sangría larga
import { libro as datosLibro } from '../referencia/canon.js';
import { analizarReferencia } from '../referencia/analizar.js';

// «16» o, cuando la versión une versículos, «4-6».
const esCifra = (s) => /^\d{1,3}([-–]\d{1,3})?$/.test(s);
const esLlamada = (s) => /^\[\d+\]$/.test(s);

// Trozos de una página agrupados en renglones, de arriba abajo.
function renglonesDe(trozos) {
  const renglones = [];
  let actual = null;
  for (const t of trozos) {
    if (!actual) { actual = { trozos: [] }; renglones.push(actual); }
    if (t.str !== '') actual.trozos.push(t);
    if (t.eol) actual = null;
  }
  return renglones.filter((r) => r.trozos.some((t) => t.str.trim() !== '')).map((r) => {
    const visibles = r.trozos.filter((t) => t.str.trim() !== '');
    const cuerpo = visibles.reduce((a, b) => (b.h > a.h ? b : a));
    return { trozos: r.trozos, x: visibles[0].x, y: cuerpo.y, h: cuerpo.h };
  });
}

// La moda de una lista de números redondeados.
function moda(valores) {
  const cuenta = new Map();
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  let mejor = null;
  for (const [v, n] of cuenta) if (mejor === null || n > cuenta.get(mejor)) mejor = v;
  return mejor;
}

export function crearLector({ idioma = 'es' } = {}) {
  const libros = new Map();          // id → [capítulos]
  const incidencias = [];
  let cuerpo = null;                 // tamaño de letra del texto
  let margen = null;                 // x donde empiezan los renglones sin sangría

  let cap = null;                    // elementos del capítulo abierto
  let donde = '';
  let verso = null;                  // versículo abierto: {t:'v', n, x:[]}
  let enNotas = true;                // hasta el primer encabezado no hay texto bíblico
  let titulo = null;                 // título de sección en construcción
  let sobrescrito = '';
  let parrafoPendiente = false;
  let lineaPendiente = null;
  let yAnterior = null;
  let hayRojo = false;

  const ponerParrafo = () => {
    if (cap.length && cap[cap.length - 1].t === 'v') cap.push({ t: 'p' });
  };

  function cerrarTitulo() {
    if (titulo === null) return;
    const x = titulo.replace(/\s+/g, ' ').trim();
    titulo = null;
    if (x) { cerrarVerso(); cap.push({ t: 'h', x }); }
  }

  function cerrarSobrescrito() {
    const x = sobrescrito.replace(/\s+/g, ' ').trim();
    sobrescrito = '';
    if (x) cap.push({ t: 's', x });
  }

  function cerrarVerso() {
    if (!verso) return;
    // Recortar espacios al final y descartar marcas de línea colgando.
    while (verso.x.length) {
      const ultimo = verso.x[verso.x.length - 1];
      if (typeof ultimo === 'object' && 'l' in ultimo) { verso.x.pop(); continue; }
      const texto = (typeof ultimo === 'string' ? ultimo : ultimo.j).trimEnd();
      if (texto === '') { verso.x.pop(); continue; }
      if (typeof ultimo === 'string') verso.x[verso.x.length - 1] = texto; else ultimo.j = texto;
      break;
    }
    if (verso.x.some((t) => typeof t === 'string' || t.j)) cap.push(verso);
    else incidencias.push(`${donde}:${verso.n}: versículo sin texto`);
    verso = null;
  }

  function cerrarCapitulo() {
    if (!cap) return;
    cerrarTitulo();
    cerrarVerso();
    while (cap.length && cap[cap.length - 1].t !== 'v') cap.pop();
    cap = null;
  }

  function abrirCapitulo(texto) {
    const r = analizarReferencia(texto, idioma);
    if (!r) return false;
    const info = datosLibro(r.libro);
    const numero = r.cap ?? 1;
    cerrarCapitulo();
    if (!libros.has(r.libro)) libros.set(r.libro, []);
    const caps = libros.get(r.libro);
    if (caps[numero - 1]) incidencias.push(`${r.libro} ${numero}: capítulo repetido`);
    cap = [];
    caps[numero - 1] = cap;
    donde = `${r.libro} ${numero}`;
    if (numero > info.caps) incidencias.push(`${donde}: capítulo fuera del canon`);
    enNotas = false;
    verso = null;
    parrafoPendiente = false;
    lineaPendiente = null;
    yAnterior = null;
    return true;
  }

  // Añade texto al versículo abierto, uniendo tramos del mismo tipo y sin
  // dejar nunca dos espacios seguidos ni un espacio al comienzo de una línea.
  function escribir(texto, rojo) {
    texto = texto.replace(/\s+/g, ' ');
    if (!verso) { sobrescrito += texto; return; }
    const x = verso.x;
    const ultimo = x[x.length - 1];
    const cola = typeof ultimo === 'string' ? ultimo : ultimo?.j;       // undefined: comienzo o línea nueva
    if (cola === undefined || cola.endsWith(' ')) texto = texto.trimStart();
    if (texto === '') return;
    if (texto === ' ') {                                               // el espacio hereda el tipo del tramo
      if (typeof ultimo === 'string') x[x.length - 1] += ' '; else ultimo.j += ' ';
      return;
    }
    if (rojo && typeof ultimo === 'object' && 'j' in ultimo) { ultimo.j += texto; return; }
    if (!rojo && typeof ultimo === 'string') { x[x.length - 1] += texto; return; }
    // Cambio de tipo: el espacio que los separa pasa al comienzo del tramo nuevo.
    if (cola?.endsWith(' ')) {
      if (typeof ultimo === 'string') x[x.length - 1] = cola.slice(0, -1); else ultimo.j = cola.slice(0, -1);
      texto = ` ${texto}`;
    }
    x.push(rojo ? { j: texto } : texto);
  }

  // Abre una línea nueva en el versículo, sin dejar un espacio colgando antes.
  function ponerLinea(n) {
    const x = verso.x;
    const ultimo = x[x.length - 1];
    if (typeof ultimo === 'string') x[x.length - 1] = ultimo.trimEnd();
    else if (ultimo && 'j' in ultimo) ultimo.j = ultimo.j.trimEnd();
    x.push({ l: n });
  }

  // hasta: último número cuando la versión une versículos («5-6»).
  function abrirVerso(n, hasta = null) {
    cerrarTitulo();
    cerrarVerso();
    if (sobrescrito.trim() && n !== 2) cerrarSobrescrito();
    const anterior = cap.findLast((e) => e.t === 'v')?.n ?? 0;
    // Un capítulo cuyo primer versículo no lleva número: lo leído hasta aquí es el 1.
    if (n === 2 && anterior === 0 && sobrescrito.trim()) {
      cap.push({ t: 'v', n: 1, x: [sobrescrito.replace(/\s+/g, ' ').trim()] });
      sobrescrito = '';
    }
    if (n <= (cap.findLast((e) => e.t === 'v')?.n ?? 0)) incidencias.push(`${donde}: versículo ${n} tras el ${anterior}`);
    if (parrafoPendiente) ponerParrafo();
    parrafoPendiente = false;
    verso = { t: 'v', n, x: [] };
    if (hasta !== null && hasta > n) verso.f = hasta;
    if (lineaPendiente !== null) verso.x.push({ l: lineaPendiente });
    lineaPendiente = null;
  }

  function leerRenglon(r, estilos) {
    const visibles = r.trozos.filter((t) => t.str.trim() !== '');
    // Un encabezado puede llevar pegada una llamada de nota («SALMO 9[9]»).
    const grandes = r.trozos.filter((t) => t.h >= cuerpo * 1.3 || (t.str.trim() === '' && t.h === 0));
    const grande = grandes.some((t) => t.str.trim() !== '')
      && visibles.every((t) => t.h >= cuerpo * 1.3 || esLlamada(t.str.trim()));
    const texto = grandes.map((t) => t.str).join('').replace(/\s+/g, ' ').trim();

    // Encabezado de capítulo.
    if (grande && /\s\d{1,3}$/.test(texto) && abrirCapitulo(texto)) return;
    if (grande) return;                                   // título del libro, portadas
    if (!cap) return;

    // Las notas al final del libro cierran el capítulo.
    if (visibles.every((t) => t.h < cuerpo * 0.62)) { enNotas = true; cerrarCapitulo(); return; }
    if (enNotas) return;

    const fuentes = visibles.map((t) => estilos(t.fuente));
    if (fuentes.every((f) => f === 'bi')) return;         // pasajes paralelos

    // Título de sección: las letras grandes son las mayúsculas.
    if (fuentes.every((f) => f === 'b')) {
      const tope = Math.max(...visibles.map((t) => t.h));
      const versalitas = visibles.some((t) => t.h < tope * 0.85);
      const linea = r.trozos.map((t) => (versalitas && t.h < tope * 0.85 ? t.str.toLowerCase() : t.str)).join('');
      // El sobrescrito de un salmo va antes que su primer título.
      if (titulo === null && !verso && sobrescrito.trim()) cerrarSobrescrito();
      titulo = titulo === null ? linea : `${titulo} ${linea}`;
      yAnterior = r.y;
      return;
    }
    cerrarTitulo();

    // Estructura: párrafo nuevo o renglón de poesía, según sangría y hueco.
    const sangria = r.x - margen;
    const hueco = yAnterior !== null && yAnterior > r.y && yAnterior - r.y > cuerpo * 1.9;
    yAnterior = r.y;
    if (sangria >= cuerpo * 1.25) {
      const nivel = sangria >= cuerpo * 2.3 ? 2 : 1;
      if (hueco) parrafoPendiente = true;
      lineaPendiente = nivel;
    } else if (sangria >= cuerpo * 0.28 || hueco) {
      parrafoPendiente = true;
    }

    // Los enlaces del libro electrónico (en azul) no son texto bíblico; un
    // renglón que sin ellos queda en barras separadoras es de navegación.
    const propios = r.trozos.filter((t) => t.color !== 'azul');
    if (/^[\s|]*$/.test(propios.map((t) => t.str).join(''))) return;

    let primero = true;
    for (const t of propios) {
      const s = t.str;
      const menor = t.h > 0 && t.h < cuerpo * 0.9;
      if (menor && esLlamada(s.trim())) continue;
      if (menor && esCifra(s.trim())) {
        const [desde, hasta] = s.trim().split(/[-–]/).map(Number);
        abrirVerso(desde, hasta ?? null);
        primero = false;
        continue;
      }

      if (primero && s.trim() !== '') {
        primero = false;
        // El renglón sigue un versículo ya abierto.
        if (verso && parrafoPendiente && lineaPendiente === null) {
          // Párrafo nuevo dentro de un versículo: no se puede partir el
          // versículo, así que se marca como línea nueva.
          ponerLinea(0);
          parrafoPendiente = false;
        } else if (verso && lineaPendiente !== null) {
          ponerLinea(lineaPendiente);
          lineaPendiente = null;
          parrafoPendiente = false;
        } else if (verso) {
          escribir(' ', false);
        } else if (sobrescrito && !sobrescrito.endsWith(' ')) {
          sobrescrito += ' ';
        }
      }
      // El asterisco de glosario va pegado al comienzo de una palabra.
      const limpio = s.replace(/\*/g, '');
      if (t.color === 'rojo') hayRojo = true;
      escribir(limpio, t.color === 'rojo');
    }
  }

  return {
    // trozos: [{str, x, y, h, fuente, eol, color?}] en el orden del PDF.
    // estilos(fuente) → 'r' | 'b' | 'i' | 'bi'
    pagina(trozos, estilos) {
      const renglones = renglonesDe(trozos);
      if (!renglones.length) return;
      if (cuerpo === null) {
        // El cuerpo es el tamaño que más texto lleva.
        const pesos = new Map();
        for (const t of trozos) pesos.set(t.h, (pesos.get(t.h) ?? 0) + t.str.length);
        const [h, peso] = [...pesos].reduce((a, b) => (b[1] > a[1] ? b : a));
        if (peso < 400) return;                            // página de portada: aún no se sabe
        cuerpo = h;
      }
      const delCuerpo = renglones.filter((r) => Math.abs(r.h - cuerpo) < 0.5);
      if (margen === null && delCuerpo.length >= 6) margen = Math.min(...delCuerpo.map((r) => r.x));
      if (margen === null) margen = moda(renglones.map((r) => Math.round(r.x))) ?? 0;
      yAnterior = null;                                    // el hueco no se mide entre páginas
      for (const r of renglones) leerRenglon(r, estilos);
    },

    terminar() {
      cerrarCapitulo();
      const salida = [];
      for (const [id, caps] of libros) {
        const total = datosLibro(id).caps;
        for (let c = 0; c < total; c++) {
          if (!caps[c] || !caps[c].length) incidencias.push(`${id} ${c + 1}: falta el capítulo`);
        }
        salida.push({ id, caps: Array.from({ length: Math.max(total, caps.length) }, (_, c) => caps[c] ?? []) });
      }
      return { libros: salida, incidencias, hayRojo };
    },
  };
}
