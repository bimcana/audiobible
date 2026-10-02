// Carga del catálogo de versiones y de los libros. Las versiones incluidas
// salen de data/; las que el lector importó, de su dispositivo.
import { esPropia, listarPropias, leerLibroPropio } from '../almacen/propias.js';

const DATA = new URL('../../data/', import.meta.url);

export class LibroAusente extends Error {}

async function leerJson(ruta) {
  const r = await fetch(new URL(ruta, DATA));
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json();
}

let incluidas = null;

// Las incluidas se piden una vez; las propias se releen, porque cambian.
export async function cargarCatalogo() {
  incluidas ??= leerJson('versiones.json').catch((e) => { incluidas = null; throw e; });
  const [fijas, propias] = await Promise.all([incluidas, listarPropias()]);
  return [...fijas, ...propias];
}

const libros = new Map();          // "rvg/JHN" → Promise<{id, caps}>

export function cargarLibro(version, libro) {
  const clave = `${version}/${libro}`;
  if (!libros.has(clave)) {
    const p = esPropia(version)
      ? leerLibroPropio(version, libro).then((l) => { if (!l) throw new LibroAusente(clave); return l; })
      : leerJson(`${clave}.json`);
    p.catch(() => libros.delete(clave));
    libros.set(clave, p);
  }
  return libros.get(clave);
}

// Tras importar o borrar una versión propia, lo guardado en memoria ya no vale.
export function olvidarVersion(version) {
  for (const clave of [...libros.keys()]) if (clave.startsWith(`${version}/`)) libros.delete(clave);
}
