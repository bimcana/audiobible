// Carga del catálogo de versiones y de los libros. Cada libro se pide una vez.
const DATA = new URL('../../data/', import.meta.url);

async function leerJson(ruta) {
  const r = await fetch(new URL(ruta, DATA));
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json();
}

let catalogo = null;
export function cargarCatalogo() {
  catalogo ??= leerJson('versiones.json').catch((e) => { catalogo = null; throw e; });
  return catalogo;
}

const libros = new Map();          // "rvg/JHN" → Promise<{id, caps}>
export function cargarLibro(version, libro) {
  const clave = `${version}/${libro}`;
  if (!libros.has(clave)) {
    const p = leerJson(`${clave}.json`);
    p.catch(() => libros.delete(clave));
    libros.set(clave, p);
  }
  return libros.get(clave);
}
