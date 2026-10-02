// Comprueba una Biblia importada antes de guardarla. No hay fuente con la que
// comparar letra por letra, así que se comprueba contra el canon y contra las
// señales de una mala lectura.
import { LIBROS } from '../referencia/canon.js';

const textoDe = (x) => x.map((t) => (typeof t === 'string' ? t : t.j ?? t.d ?? '\n')).join('');

export function validarImportada(libros) {
  const porId = new Map(libros.map((l) => [l.id, l]));
  const errores = [];
  const avisos = [];
  const cifras = { libros: 0, capitulos: 0, versiculos: 0, titulos: 0, jesus: 0, lineas: 0, parrafos: 0 };
  const faltan = LIBROS.filter((l) => !porId.has(l.id)).map((l) => l.id);

  for (const canon of LIBROS) {
    const lib = porId.get(canon.id);
    if (!lib) continue;
    cifras.libros++;
    if (lib.caps.length !== canon.caps) errores.push(`${canon.id}: ${lib.caps.length} capítulos, se esperaban ${canon.caps}`);

    lib.caps.forEach((elementos, c) => {
      const donde = `${canon.id} ${c + 1}`;
      const vers = elementos.filter((e) => e.t === 'v');
      if (!vers.length) { errores.push(`${donde}: capítulo sin versículos`); return; }
      cifras.capitulos++;
      if (vers[0].n !== 1) avisos.push(`${donde}: empieza en el versículo ${vers[0].n}`);

      let anterior = 0;
      for (const v of vers) {
        cifras.versiculos++;
        const texto = textoDe(v.x);
        if (v.n <= anterior) errores.push(`${donde}: versículo ${v.n} tras el ${anterior}`);
        else if (v.n > anterior + 1 && anterior > 0) avisos.push(`${donde}: del versículo ${anterior} salta al ${v.n}`);
        anterior = v.f ?? v.n;                 // «5-6»: el siguiente esperado es el 7
        if (!texto.trim()) errores.push(`${donde}:${v.n}: versículo vacío`);
        if (/\[\d+\]/.test(texto)) errores.push(`${donde}:${v.n}: queda una llamada de nota`);
        if (texto.includes('*')) errores.push(`${donde}:${v.n}: queda un asterisco de glosario`);
        if (texto.split('\n').some((linea) => / {2}|^ | $/.test(linea))) errores.push(`${donde}:${v.n}: espacios sobrantes`);
        if (texto.length > 900) avisos.push(`${donde}:${v.n}: versículo de ${texto.length} caracteres`);
        for (const t of v.x) {
          if (typeof t === 'object' && 'j' in t) cifras.jesus++;
          if (typeof t === 'object' && 'l' in t) cifras.lineas++;
        }
      }
      for (const e of elementos) {
        if (e.t === 'h') cifras.titulos++;
        if (e.t === 'p') cifras.parrafos++;
      }
    });
  }
  return { errores, avisos, faltan, cifras };
}
