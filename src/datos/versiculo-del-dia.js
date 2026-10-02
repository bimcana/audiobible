// El versículo del día: uno distinto cada día, el mismo para todos, tomado de
// las citas del temario. No necesita datos propios ni conexión.
import { TEMARIO, leerCita } from './temario.js';

// Citas cortas (hasta tres versículos), sin repetir, en un orden fijo que
// mezcla los temas para que no salgan seguidas ocho del mismo.
const CITAS = (() => {
  const vistas = new Set();
  const porTema = TEMARIO.flatMap((c) => c.temas.map((t) => t.citas));
  const salida = [];
  for (let i = 0; i < 10; i++) {
    for (const citas of porTema) {
      const cita = citas[i];
      if (!cita || vistas.has(cita)) continue;
      const c = leerCita(cita);
      if (c.hasta - c.vers > 2) continue;
      vistas.add(cita);
      salida.push(cita);
    }
  }
  return salida;
})();

export const cuantas = CITAS.length;

// fecha: Date. Devuelve {libro, cap, vers, hasta} y la clave del día («2026-10-02»).
export function versiculoDelDia(fecha = new Date()) {
  const dia = Math.floor(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86400000);
  const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  return { ...leerCita(CITAS[dia % CITAS.length]), clave };
}
