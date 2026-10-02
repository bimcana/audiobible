// Subrayados, notas y marcadores del lector. Se guardan por referencia
// («JHN.3», versículo 16) y no por versión: lo subrayado en una se ve en todas.
import { transaccion } from './base.js';
import { libro as datosLibro } from '../referencia/canon.js';

export const COLORES = ['amarillo', 'rosa', 'azul', 'verde', 'naranja'];

const claveDe = (libro, cap) => `${libro}.${cap}`;
const vacia = (m) => !m.c && !m.nota && !m.m;

// {[n]: {c: color, nota: texto, m: marcador, t: fecha}}
export async function leerMarcas(libro, cap) {
  try {
    const doc = await transaccion(['marcas'], 'readonly', (almacen, p) => p(almacen('marcas').get(claveDe(libro, cap))));
    return doc?.versos ?? {};
  } catch {
    return {};
  }
}

// Aplica el parche a cada versículo dado. Un valor null borra ese campo.
export async function marcar(libro, cap, versos, parche) {
  return transaccion(['marcas'], 'readwrite', async (almacen, p) => {
    const clave = claveDe(libro, cap);
    const doc = (await p(almacen('marcas').get(clave))) ?? { cap: clave, versos: {} };
    for (const n of versos) {
      const m = { ...(doc.versos[n] ?? {}), ...parche, t: Date.now() };
      for (const k of Object.keys(m)) if (m[k] === null || m[k] === '' || m[k] === false) delete m[k];
      if (vacia(m)) delete doc.versos[n]; else doc.versos[n] = m;
    }
    if (Object.keys(doc.versos).length) almacen('marcas').put(doc); else almacen('marcas').delete(clave);
    return doc.versos;
  });
}

// Todo lo marcado, en orden bíblico: [{libro, cap, n, c, nota, m, t}]
export async function todasLasMarcas() {
  let docs = [];
  try {
    docs = await transaccion(['marcas'], 'readonly', (almacen, p) => p(almacen('marcas').getAll()));
  } catch { /* sin almacenamiento */ }
  const lista = [];
  for (const doc of docs) {
    const [libro, cap] = doc.cap.split('.');
    for (const [n, m] of Object.entries(doc.versos)) lista.push({ libro, cap: Number(cap), n: Number(n), ...m });
  }
  const orden = (x) => (datosLibro(x.libro)?.orden ?? 99) * 1e6 + x.cap * 1e3 + x.n;
  return lista.sort((a, b) => orden(a) - orden(b));
}

// Copia de seguridad: todo el almacén, tal cual.
export async function exportarMarcas() {
  return transaccion(['marcas'], 'readonly', (almacen, p) => p(almacen('marcas').getAll()));
}

// Lo importado se funde con lo que hay; ante un mismo versículo gana lo más reciente.
export async function importarMarcas(docs) {
  return transaccion(['marcas'], 'readwrite', async (almacen, p) => {
    let versiculos = 0;
    for (const nuevo of docs) {
      if (typeof nuevo?.cap !== 'string' || typeof nuevo.versos !== 'object') continue;
      const doc = (await p(almacen('marcas').get(nuevo.cap))) ?? { cap: nuevo.cap, versos: {} };
      for (const [n, m] of Object.entries(nuevo.versos)) {
        if (!doc.versos[n] || (m.t ?? 0) >= (doc.versos[n].t ?? 0)) { doc.versos[n] = m; versiculos++; }
      }
      almacen('marcas').put(doc);
    }
    return versiculos;
  });
}
