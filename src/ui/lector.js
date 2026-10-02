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
  seccion.dataset.i = indice;
  for (const titulo of pasaje.titulos) seccion.append(crear('h2', 'titulo', titulo));

  const p = crear('p', pasaje.tipo === 'sobrescrito' ? 'texto sobrescrito' : 'texto');
  // En prosa el número cuelga del párrafo; ante la poesía va suelto encima,
  // porque los renglones con sangría no pueden rodearlo.
  if (capitular && pasaje.lineas.length) seccion.append(crear('p', 'capitular suelta', capitular));
  else if (capitular) p.append(crear('span', 'capitular', capitular));
  seccion.append(p);

  const oraciones = dividirOraciones(pasaje.texto);
  const lineaEn = new Map(pasaje.lineas.map((l) => [l.c, l.n]));
  const versoEn = new Map(pasaje.versos.map((v) => [v.cs, v.n]));
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
      verso = versoEn.get(c);
      if (!primera && !lineaEn.has(c)) destino.append(crear('span', 'corte'));
      destino.append(crear('sup', 'vn', verso));
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
  return { el: seccion, palabras, oraciones, iluminada: -1 };
}

// Pinta el capítulo entero y devuelve la vista para el resaltado.
export function pintarCapitulo(raiz, { nombreLibro, numero, pasajes, pie }) {
  raiz.replaceChildren();
  raiz.append(crear('p', 'cap-libro', nombreLibro));

  // El número acompaña al primer pasaje de texto: los títulos y el
  // sobrescrito de un salmo quedan por encima, como en una Biblia impresa.
  const primero = pasajes.findIndex((p) => p.tipo === 'texto');
  const vista = pasajes.map((pasaje, i) => {
    const capitular = i === primero && numero !== null ? String(numero) : null;
    const v = pintarPasaje(pasaje, i, capitular);
    raiz.append(v.el);
    return v;
  });
  if (pie) raiz.append(pie);
  return vista;
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
