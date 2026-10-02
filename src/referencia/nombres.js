// Nombres de los libros en español e inglés, sus grupos, y cómo se titula y
// se anuncia un capítulo.
import { LIBROS, libro } from './canon.js';

const ES = 'Génesis|Éxodo|Levítico|Números|Deuteronomio|Josué|Jueces|Rut|1 Samuel|2 Samuel|1 Reyes|2 Reyes|1 Crónicas|2 Crónicas|Esdras|Nehemías|Ester|Job|Salmos|Proverbios|Eclesiastés|Cantares|Isaías|Jeremías|Lamentaciones|Ezequiel|Daniel|Oseas|Joel|Amós|Abdías|Jonás|Miqueas|Nahúm|Habacuc|Sofonías|Hageo|Zacarías|Malaquías|Mateo|Marcos|Lucas|Juan|Hechos|Romanos|1 Corintios|2 Corintios|Gálatas|Efesios|Filipenses|Colosenses|1 Tesalonicenses|2 Tesalonicenses|1 Timoteo|2 Timoteo|Tito|Filemón|Hebreos|Santiago|1 Pedro|2 Pedro|1 Juan|2 Juan|3 Juan|Judas|Apocalipsis'.split('|');
const EN = 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation'.split('|');

const NOMBRES = { es: ES, en: EN };
const idiomaValido = (idioma) => (idioma === 'en' ? 'en' : 'es');

export function nombreLibro(id, idioma) {
  const l = libro(id);
  return l ? NOMBRES[idiomaValido(idioma)][l.orden] : '';
}

// Nombre de un capítulo suelto: los Salmos van en singular.
const SINGULAR = { PSA: { es: 'Salmo', en: 'Psalm' } };

export function tituloCapitulo(id, cap, idioma) {
  const i = idiomaValido(idioma);
  const l = libro(id);
  if (!l) return '';
  if (l.caps === 1) return NOMBRES[i][l.orden];
  return `${SINGULAR[id]?.[i] ?? NOMBRES[i][l.orden]} ${cap}`;
}

// Cómo se dice en voz alta un libro numerado: «Primera de Samuel», «First Samuel».
const ORDINAL = {
  es: { 1: 'Primera de', 2: 'Segunda de', 3: 'Tercera de' },
  en: { 1: 'First', 2: 'Second', 3: 'Third' },
};

export function nombreHablado(id, idioma) {
  const i = idiomaValido(idioma);
  const nombre = nombreLibro(id, i);
  const m = /^([123]) (.+)$/.exec(nombre);
  return m ? `${ORDINAL[i][m[1]]} ${m[2]}` : nombre;
}

// Lo que dice la voz al pasar a un capítulo.
export function anuncioCapitulo(id, cap, idioma, { conLibro = false } = {}) {
  const i = idiomaValido(idioma);
  const l = libro(id);
  if (!l) return '';
  if (SINGULAR[id]) return `${SINGULAR[id][i]} ${cap}.`;
  if (l.caps === 1) return `${nombreHablado(id, i)}.`;
  const capitulo = `${i === 'en' ? 'Chapter' : 'Capítulo'} ${cap}.`;
  return conLibro ? `${nombreHablado(id, i)}. ${capitulo}` : capitulo;
}

// Grupos tradicionales, para el navegador de libros.
const CORTES = [
  ['ley', 5], ['historia', 12], ['poesia', 5], ['mayores', 5], ['menores', 12],
  ['evangelios', 4], ['hechos', 1], ['pablo', 13], ['generales', 8], ['apocalipsis', 1],
];

export const GRUPOS = (() => {
  let desde = 0;
  return CORTES.map(([id, cuantos]) => {
    const libros = LIBROS.slice(desde, desde + cuantos);
    desde += cuantos;
    return { id, t: libros[0].t, libros: libros.map((l) => l.id) };
  });
})();
