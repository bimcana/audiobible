// Avance de los planes de lectura: qué planes sigue el lector y qué capítulos
// lleva leídos en cada uno.
import { transaccion } from './base.js';

// [{id, inicio, hechos: {"JHN.3": fecha}}]
export async function planesActivos() {
  try {
    return await transaccion(['planes'], 'readonly', (almacen, p) => p(almacen('planes').getAll()));
  } catch {
    return [];
  }
}

export function empezarPlan(id) {
  return transaccion(['planes'], 'readwrite', async (almacen, p) => {
    if (!(await p(almacen('planes').get(id)))) almacen('planes').put({ id, inicio: Date.now(), hechos: {} });
  });
}

export function dejarPlan(id) {
  return transaccion(['planes'], 'readwrite', (almacen) => { almacen('planes').delete(id); });
}

// leido: true lo marca, false lo desmarca. planes: ids a los que afecta
// (null: todos los que el lector sigue). Devuelve los planes cambiados.
export function marcarCapitulo(clave, { leido = true, planes = null } = {}) {
  return transaccion(['planes'], 'readwrite', async (almacen, p) => {
    const cambiados = [];
    for (const plan of await p(almacen('planes').getAll())) {
      if (planes && !planes.includes(plan.id)) continue;
      if (leido && !plan.hechos[clave]) plan.hechos[clave] = Date.now();
      else if (!leido && plan.hechos[clave]) delete plan.hechos[clave];
      else continue;
      almacen('planes').put(plan);
      cambiados.push(plan);
    }
    return cambiados;
  });
}
