// Planes de lectura. Cada plan es una lista de capítulos repartida en días;
// sirve para cualquier versión. Funciones puras.
import { LIBROS } from '../referencia/canon.js';

const capitulosDe = (ids) => LIBROS.filter((l) => ids.has(l.id))
  .flatMap((l) => Array.from({ length: l.caps }, (_, c) => ({ libro: l.id, cap: c + 1 })));

const todos = new Set(LIBROS.map((l) => l.id));
const nt = new Set(LIBROS.filter((l) => l.t === 'NT').map((l) => l.id));

export const PLANES = [
  { id: 'biblia-1-ano', dias: 365, libros: todos },
  { id: 'nt-90', dias: 90, libros: nt },
  { id: 'salmos-proverbios-60', dias: 60, libros: new Set(['PSA', 'PRO']) },
  { id: 'evangelios-30', dias: 30, libros: new Set(['MAT', 'MRK', 'LUK', 'JHN']) },
];

const clave = (c) => `${c.libro}.${c.cap}`;

// Reparte los capítulos, en orden, lo más parejo posible entre los días.
export function construirPlan(id) {
  const plan = PLANES.find((p) => p.id === id);
  if (!plan) return null;
  const capitulos = capitulosDe(plan.libros);
  const dias = Array.from({ length: plan.dias }, (_, d) => capitulos.slice(
    Math.floor((d * capitulos.length) / plan.dias),
    Math.floor(((d + 1) * capitulos.length) / plan.dias),
  ));
  return { id, dias, capitulos: capitulos.length };
}

// hechos: {"JHN.3": fecha en ms}
export function avance(plan, hechos) {
  const completos = plan.dias.map((dia) => dia.every((c) => hechos[clave(c)]));
  const leidos = plan.dias.reduce((n, dia) => n + dia.filter((c) => hechos[clave(c)]).length, 0);
  const hoy = completos.indexOf(false);                 // el primer día sin terminar
  return {
    leidos,
    total: plan.capitulos,
    diasCompletos: completos.filter(Boolean).length,
    hoy: hoy === -1 ? null : hoy,                       // null: plan terminado
    terminado: hoy === -1,
  };
}

const DIA = 86400000;
const diaLocal = (ms) => {
  const f = new Date(ms);
  return Math.floor(new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime() / DIA + 0.5);
};

// Días seguidos, hasta hoy o ayer, en los que se leyó al menos un capítulo.
export function racha(hechos, ahora = Date.now()) {
  const dias = new Set(Object.values(hechos).map(diaLocal));
  let d = diaLocal(ahora);
  if (!dias.has(d)) d -= 1;                             // hoy aún no cuenta en contra
  let n = 0;
  while (dias.has(d)) { n++; d -= 1; }
  return n;
}

export const claveCapitulo = (libro, cap) => `${libro}.${cap}`;
