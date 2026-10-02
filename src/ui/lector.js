// Pinta un capítulo y lleva el resaltado de la lectura. No sabe de audio:
// recibe pasajes ya construidos y posiciones de carácter.
import { dividirOraciones } from '../lectura/oraciones.js';

const crear = (etiqueta, clase, texto) => {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
};

const dentro = (rangos, c) => rangos.some(([a, b]) => c >= a && c < b);

function pintarPasaje(pasaje, indice, capitular) {
  const seccion = crear('section', 'pasaje');
  const numeros = new Map();       // número de versículo → su <sup>
  seccion.dataset.i = indice;
  for (const titulo of pasaje.titulos) seccion.append(crear('h2', 'titulo', titulo));

  const p = crear('p', pasaje.tipo === 'sobrescrito' ? 'texto sobrescrito' : 'texto');
  // En prosa el número cuelga del párrafo; ante la poesía va suelto encima,
  // porque los renglones con sangría no pueden rodearlo.
  const empiezaEnVerso = pasaje.lineas.some((l) => l.c === 0 && l.n > 0);
  if (capitular && empiezaEnVerso) seccion.append(crear('p', 'capitular suelta', capitular));
  else if (capitular) p.append(crear('span', 'capitular', capitular));
  seccion.append(p);

  const oraciones = dividirOraciones(pasaje.texto);
  const lineaEn = new Map(pasaje.lineas.map((l) => [l.c, l.n]));
  const versoEn = new Map(pasaje.versos.map((v) => [v.cs, v]));
  const palabras = [];
  let destino = p;                 // el párrafo, o el renglón de poesía abierto
  let k = 0;                       // oración en curso
  let verso = null;
  let primera = true;

  const abrirRenglon = (n) => {
    destino = crear('span', 'renglon');
    destino.dataset.n = n;
    destino.style.setProperty('--sangria', Math.max(0, n - 1));
    p.append(destino);
  };

  for (const m of pasaje.texto.matchAll(/\S+/g)) {
    const c = m.index;
    const ce = c + m[0].length;
    while (k + 1 < oraciones.length && oraciones[k + 1].cs <= c) k++;

    if (lineaEn.has(c)) abrirRenglon(lineaEn.get(c));
    else if (primera && pasaje.lineas.length) abrirRenglon(0);
    else if (!primera) destino.append(' ');

    if (versoEn.has(c)) {
      const v = versoEn.get(c);
      verso = v.n;
      if (!primera && !lineaEn.has(c)) destino.append(crear('span', 'corte'));
      const sup = crear('sup', 'vn', v.f ? `${v.n}-${v.f}` : v.n);
      sup.dataset.v = v.n;
      numeros.set(v.n, sup);
      destino.append(sup);
    }

    let clase = 'w';
    if (dentro(pasaje.jesus, c)) clase += ' j';
    if (dentro(pasaje.acotaciones, c)) clase += ' d';
    const el = crear('span', clase, m[0]);
    el.dataset.w = palabras.length;
    destino.append(el);
    palabras.push({ el, c, ce, k, verso });
    primera = false;
  }
  return { el: seccion, palabras, oraciones, numeros, iluminada: -1 };
}

// La otra versión, junto al pasaje: los versículos que caen en su tramo.
function pintarParalelo(pasaje, siguiente, paralelo) {
  const desde = pasaje.versos[0]?.n;
  if (desde === undefined) return null;
  const hasta = siguiente?.versos[0]?.n ?? Infinity;
  const caja = crear('p', 'paralelo');
  caja.lang = paralelo.idioma;
  for (const [n, v] of paralelo.versos) {
    if (n < desde || n >= hasta) continue;
    if (caja.childNodes.length) caja.append(' ');
    caja.append(crear('sup', 'vn', v.f ? `${n}-${v.f}` : n), v.texto);
  }
  return caja.childNodes.length ? caja : null;
}

// Pinta el capítulo entero y devuelve la vista para el resaltado.
// paralelo: {idioma, versos: Map<n, {texto, f}>} para comparar con otra versión.
export function pintarCapitulo(raiz, { nombreLibro, numero, pasajes, pie, accion, paralelo = null }) {
  raiz.replaceChildren();
  const cabeza = crear('header', 'cap-cabeza');
  cabeza.append(crear('p', 'cap-libro', nombreLibro));
  if (accion) cabeza.append(accion);
  raiz.append(cabeza);

  // El número acompaña al primer pasaje de texto: los títulos y el
  // sobrescrito de un salmo quedan por encima, como en una Biblia impresa.
  const primero = pasajes.findIndex((p) => p.tipo === 'texto');
  const vista = pasajes.map((pasaje, i) => {
    const capitular = i === primero && numero !== null ? String(numero) : null;
    const v = pintarPasaje(pasaje, i, capitular);
    if (paralelo) {
      // El tramo llega hasta el primer versículo del siguiente pasaje con versículos.
      const siguiente = pasajes.slice(i + 1).find((p) => p.versos.length);
      const otro = pintarParalelo(pasaje, siguiente, paralelo);
      if (otro) { v.el.classList.add('con-paralelo'); v.el.append(otro); }
    }
    raiz.append(v.el);
    return v;
  });
  if (pie) raiz.append(pie);
  return vista;
}

// Subrayados, notas y marcadores sobre el capítulo ya pintado.
// marcas: {[n]: {c, nota, m}}
export function pintarMarcas(vista, marcas) {
  for (const v of vista) {
    for (const p of v.palabras) {
      const color = marcas[p.verso]?.c ?? '';
      if ((p.el.dataset.color ?? '') !== color) {
        if (color) p.el.dataset.color = color; else delete p.el.dataset.color;
      }
    }
    for (const [n, sup] of v.numeros) {
      sup.classList.toggle('con-nota', Boolean(marcas[n]?.nota));
      sup.classList.toggle('con-marcador', Boolean(marcas[n]?.m));
    }
  }
}

// versos: Set de números de versículo seleccionados.
export function pintarSeleccion(vista, versos) {
  for (const v of vista) for (const p of v.palabras) p.el.classList.toggle('sel', versos.has(p.verso));
}

export function mensajeCarga(raiz, texto) {
  raiz.replaceChildren(crear('p', 'cargando-cap', texto));
}

// Índice de la palabra en pantalla que cubre el carácter dado.
export function palabraEn(vistaPasaje, caracter) {
  const ps = vistaPasaje.palabras;
  let lo = 0;
  let hi = ps.length - 1;
  let r = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ps[mid].c <= caracter) { r = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return r;
}

// Ilumina hasta la palabra i. Devuelve true si con ello cambió de oración.
export function iluminar(vistaPasaje, i) {
  const ps = vistaPasaje.palabras;
  const antes = vistaPasaje.iluminada;
  if (i === antes) return false;
  const desde = Math.min(antes, i);
  const hasta = Math.max(antes, i);
  for (let n = Math.max(0, desde); n <= hasta && n < ps.length; n++) {
    ps[n].el.classList.toggle('dicha', n <= i);
    ps[n].el.classList.toggle('ahora', n === i);
  }
  vistaPasaje.iluminada = i;
  return antes < 0 || i < 0 || ps[antes]?.k !== ps[i]?.k;
}

export function activarPasaje(vista, indice) {
  vista.forEach((v, i) => {
    v.el.classList.toggle('activo', i === indice);
    if (i !== indice && v.iluminada >= 0) iluminar(v, -1);
  });
}

/* La línea que suena se ancla a 3/10 de la pantalla. El texto solo se mueve
   cuando esa línea sale de la franja cómoda, nunca a mitad de oración. */
const ANCLA = 0.3;
const FRANJA = [0.08, 0.62];

export function mantenerALaVista(escena, el, { forzar = false, instantaneo = false } = {}) {
  if (!el) return;
  const zona = escena.getBoundingClientRect();
  const linea = el.getBoundingClientRect();
  const posicion = (linea.top - zona.top) / zona.height;
  if (!forzar && posicion >= FRANJA[0] && posicion <= FRANJA[1]) return;
  const destino = escena.scrollTop + (linea.top - zona.top) - zona.height * ANCLA;
  escena.scrollTo({ top: Math.max(0, destino), behavior: instantaneo ? 'instant' : 'smooth' });
}
