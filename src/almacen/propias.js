// Biblias importadas por el lector. Se guardan solo en este dispositivo.
import { transaccion } from './base.js';

export const esPropia = (id) => id.startsWith('propia-');

export async function listarPropias() {
  try {
    return await transaccion(['versiones'], 'readonly', (almacen, p) => p(almacen('versiones').getAll()));
  } catch {
    return [];                                     // sin IndexedDB (modo privado): no hay propias
  }
}

// Guarda la versión y sus libros. Los libros que ya hubiera se sustituyen;
// los demás se conservan, para poder añadir un PDF después de otro.
export async function guardarPropia(meta, libros) {
  await transaccion(['versiones', 'libros'], 'readwrite', (almacen) => {
    almacen('versiones').put(meta);
    for (const libro of libros) almacen('libros').put(libro, `${meta.id}/${libro.id}`);
  });
}

export function leerLibroPropio(version, libro) {
  return transaccion(['libros'], 'readonly', (almacen, p) => p(almacen('libros').get(`${version}/${libro}`)));
}

const rango = (version) => IDBKeyRange.bound(`${version}/`, `${version}/￿`);

export function leerLibrosPropios(version) {
  return transaccion(['libros'], 'readonly', (almacen, p) => p(almacen('libros').getAll(rango(version))));
}

export async function borrarPropia(version) {
  await transaccion(['versiones', 'libros'], 'readwrite', (almacen) => {
    almacen('versiones').delete(version);
    almacen('libros').delete(rango(version));
  });
}
