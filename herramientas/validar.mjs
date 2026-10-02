// Comprueba una versión ya convertida contra el canon y contra su fuente.
// Función pura: devuelve la lista de errores y las cifras de la versión.
import { LIBROS } from '../src/referencia/canon.js';
import { textoDeTramos } from './convertir.mjs';

// Lo que debe conservarse intacto: el texto sin espacios ni calderones.
const letras = (s) => s.replace(/[\s¶]/g, '');

const letrasFuente = (partes) =>
  letras(partes.map((p) => (typeof p === 'string' ? p : p.text ?? '')).join(''));

export function validarVersion(fuente, libros) {
  const errores = [];
  const cifras = { libros: libros.length, capitulos: 0, versiculos: 0, titulos: 0, jesus: 0, lineas: 0, parrafos: 0 };

  if (libros.length !== LIBROS.length) errores.push(`Libros: ${libros.length}, se esperaban ${LIBROS.length}`);

  LIBROS.forEach((canon, i) => {
    const lib = libros[i];
    const src = fuente.books[i];
    if (!lib || lib.id !== canon.id) { errores.push(`Posición ${i}: se esperaba ${canon.id}, hay ${lib?.id}`); return; }
    if (!src || src.id !== canon.id) { errores.push(`Fuente, posición ${i}: se esperaba ${canon.id}, hay ${src?.id}`); return; }
    if (lib.caps.length !== canon.caps) errores.push(`${canon.id}: ${lib.caps.length} capítulos, se esperaban ${canon.caps}`);

    lib.caps.forEach((elementos, c) => {
      const donde = `${canon.id} ${c + 1}`;
      cifras.capitulos++;
      const versFuente = (src.chapters[c]?.chapter.content ?? [])
        .filter((x) => x.type === 'verse' && letrasFuente(x.content) !== '');
      const vers = elementos.filter((e) => e.t === 'v');
      if (vers.length !== versFuente.length) errores.push(`${donde}: ${vers.length} versículos, la fuente tiene ${versFuente.length}`);
      if (vers.length === 0) errores.push(`${donde}: capítulo sin versículos`);

      let anterior = 0;
      vers.forEach((v, k) => {
        cifras.versiculos++;
        if (!Number.isInteger(v.n) || v.n <= anterior) errores.push(`${donde}: versículo ${v.n} fuera de orden`);
        anterior = v.n;
        const texto = textoDeTramos(v.x);
        const f = versFuente[k];
        if (f && (f.number !== v.n || letrasFuente(f.content) !== letras(texto))) {
          errores.push(`${donde}:${v.n}: el texto no coincide con la fuente`);
        }
        if (texto.split('\n').some((linea) => / {2,}|^ | $/.test(linea))) errores.push(`${donde}:${v.n}: espacios sobrantes`);
        for (const t of v.x) {
          if (typeof t === 'object' && 'j' in t) cifras.jesus++;
          if (typeof t === 'object' && 'l' in t) cifras.lineas++;
        }
      });
      for (const e of elementos) {
        if (e.t === 'h') cifras.titulos++;
        if (e.t === 'p') cifras.parrafos++;
        if ((e.t === 'h' || e.t === 's') && !e.x) errores.push(`${donde}: título vacío`);
      }
    });
  });
  return { errores, cifras };
}
