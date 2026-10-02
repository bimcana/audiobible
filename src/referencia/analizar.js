// Interpreta una referencia escrita a mano: «jn 3 16», «Salmo 23», «1co13».
import { LIBROS } from './canon.js';
import { nombreLibro } from './nombres.js';

export const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim();

// Abreviaturas que no son el comienzo del nombre.
const ALIAS = {
  es: {
    GEN: 'gn', EXO: 'ex', LEV: 'lv', NUM: 'nm', DEU: 'dt', JOS: 'jos', JDG: 'jue|jc', RUT: 'rt',
    '1SA': '1 s|1 sm', '2SA': '2 s|2 sm', '1KI': '1 r|1 re', '2KI': '2 r|2 re', '1CH': '1 cr', '2CH': '2 cr',
    EZR: 'esd', NEH: 'neh', EST: 'est', JOB: 'jb', PSA: 'sal|salmo|sl', PRO: 'pr|prov', ECC: 'ec|ecl',
    SNG: 'cnt|cant|cantar de los cantares', ISA: 'is', JER: 'jr', LAM: 'lm', EZK: 'ez', DAN: 'dn', HOS: 'os',
    JOL: 'jl', AMO: 'am', OBA: 'abd', JON: 'jon', MIC: 'mi|miq', NAM: 'nah', HAB: 'hab', ZEP: 'sof', HAG: 'hag',
    ZEC: 'zac', MAL: 'mal', MAT: 'mt', MRK: 'mr|mc', LUK: 'lc', JHN: 'jn', ACT: 'hch', ROM: 'ro|rm',
    '1CO': '1 co', '2CO': '2 co', GAL: 'ga', EPH: 'ef', PHP: 'fil|flp', COL: 'col', '1TH': '1 ts', '2TH': '2 ts',
    '1TI': '1 ti|1 tm', '2TI': '2 ti|2 tm', TIT: 'tit', PHM: 'flm', HEB: 'he', JAS: 'stg', '1PE': '1 p',
    '2PE': '2 p', '1JN': '1 jn', '2JN': '2 jn', '3JN': '3 jn', JUD: 'jud', REV: 'ap|apoc',
  },
  en: {
    GEN: 'gn', EXO: 'ex', LEV: 'lv', NUM: 'nm', DEU: 'dt', JDG: 'jdg', RUT: 'rt', '1SA': '1 sm', '2SA': '2 sm',
    '1KI': '1 kgs', '2KI': '2 kgs', '1CH': '1 chr', '2CH': '2 chr', PSA: 'ps|psalm', PRO: 'prv', SNG: 'song|sos|song of songs',
    EZK: 'ezk', JOL: 'jl', OBA: 'ob', NAM: 'nah', ZEP: 'zep', ZEC: 'zec', MAT: 'mt', MRK: 'mk|mrk', LUK: 'lk',
    JHN: 'jn|jhn', ROM: 'rm', PHP: 'php', '1TH': '1 th', '2TH': '2 th', PHM: 'phm', JAS: 'jas|jm', '1JN': '1 jn',
    '2JN': '2 jn', '3JN': '3 jn', REV: 'rv',
  },
};

function claves(idioma) {
  const exactas = new Map();
  const nombres = [];
  for (const { id } of LIBROS) {
    const nombre = normalizar(nombreLibro(id, idioma));
    exactas.set(nombre, id);
    exactas.set(id.toLowerCase(), id);
    nombres.push([nombre, id]);
    const m = /^([123]) (.+)$/.exec(nombre);
    for (const a of (ALIAS[idioma][id] ?? '').split('|')) if (a) exactas.set(a, id);
    if (m) exactas.set(m[1] + m[2], id);
  }
  return { exactas, nombres };
}

const TABLAS = { es: claves('es'), en: claves('en') };

function buscarLibro(nombre, idioma) {
  const conEspacio = nombre.replace(/^([123])\s*/, '$1 ');
  for (const i of [idioma, idioma === 'es' ? 'en' : 'es']) {
    const { exactas } = TABLAS[i];
    const id = exactas.get(conEspacio) ?? exactas.get(nombre);
    if (id) return id;
  }
  if (conEspacio.replace(/^[123] /, '').length < 2) return null;
  for (const i of [idioma, idioma === 'es' ? 'en' : 'es']) {
    const candidatos = TABLAS[i].nombres.filter(([n]) => n.startsWith(conEspacio));
    if (candidatos.length) return candidatos[0][1];      // el primero en orden canónico
  }
  return null;
}

export function analizarReferencia(texto, idioma = 'es') {
  const limpio = normalizar(texto ?? '');
  const m = /^([123]?\s*[a-zñ][a-zñ ]*?)\s*(?:(\d{1,3})(?:\s*[:,\s]\s*(\d{1,3}))?)?$/.exec(limpio);
  if (!m) return null;
  const id = buscarLibro(m[1].trim(), idioma === 'en' ? 'en' : 'es');
  if (!id) return null;
  const caps = LIBROS.find((l) => l.id === id).caps;
  let cap = m[2] ? Number(m[2]) : null;
  let vers = m[3] ? Number(m[3]) : null;
  // En un libro de un solo capítulo, «Judas 5» es el versículo 5.
  if (caps === 1 && cap !== null && vers === null && cap > 1) { vers = cap; cap = 1; }
  if (cap !== null && (cap < 1 || cap > caps)) return null;
  if (vers !== null && vers < 1) return null;
  return { libro: id, cap, vers };
}
