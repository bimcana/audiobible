import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANES, construirPlan, avance, racha } from '../src/planes/planes.js';

const cuentas = { 'biblia-1-ano': 1189, 'nt-90': 260, 'salmos-proverbios-60': 181, 'evangelios-30': 89 };

for (const { id, dias } of PLANES) {
  test(`${id}: cubre todos sus capítulos una vez, en orden, sin días vacíos`, () => {
    const plan = construirPlan(id);
    assert.equal(plan.dias.length, dias);
    assert.equal(plan.capitulos, cuentas[id]);
    const todos = plan.dias.flat().map((c) => `${c.libro}.${c.cap}`);
    assert.equal(todos.length, cuentas[id]);
    assert.equal(new Set(todos).size, cuentas[id]);
    assert.ok(plan.dias.every((d) => d.length >= 1));
    const tamanos = plan.dias.map((d) => d.length);
    assert.ok(Math.max(...tamanos) - Math.min(...tamanos) <= 1, 'reparto parejo');
  });
}

test('la Biblia en un año empieza en Génesis 1 y termina en Apocalipsis 22', () => {
  const plan = construirPlan('biblia-1-ano');
  assert.deepEqual(plan.dias[0][0], { libro: 'GEN', cap: 1 });
  assert.deepEqual(plan.dias.at(-1).at(-1), { libro: 'REV', cap: 22 });
});

test('un plan desconocido no existe', () => {
  assert.equal(construirPlan('otro'), null);
});

test('el avance cuenta capítulos y señala el primer día sin terminar', () => {
  const plan = construirPlan('evangelios-30');
  assert.deepEqual(avance(plan, {}), { leidos: 0, total: 89, diasCompletos: 0, hoy: 0, terminado: false });

  const hechos = {};
  for (const c of plan.dias[0]) hechos[`${c.libro}.${c.cap}`] = 1;
  hechos[`${plan.dias[2][0].libro}.${plan.dias[2][0].cap}`] = 1;        // un capítulo suelto del día 3
  const a = avance(plan, hechos);
  assert.equal(a.leidos, plan.dias[0].length + 1);
  assert.equal(a.diasCompletos, 1);
  assert.equal(a.hoy, 1);                                              // saltarse días no bloquea
});

test('un plan con todo leído está terminado', () => {
  const plan = construirPlan('evangelios-30');
  const hechos = Object.fromEntries(plan.dias.flat().map((c) => [`${c.libro}.${c.cap}`, 1]));
  assert.deepEqual(avance(plan, hechos), { leidos: 89, total: 89, diasCompletos: 30, hoy: null, terminado: true });
});

test('la racha cuenta días seguidos y perdona el día de hoy', () => {
  const dia = 86400000;
  const hoy = new Date(2026, 9, 10, 12).getTime();
  assert.equal(racha({}, hoy), 0);
  assert.equal(racha({ a: hoy }, hoy), 1);
  assert.equal(racha({ a: hoy - dia, b: hoy - 2 * dia }, hoy), 2);          // hoy aún no ha leído
  assert.equal(racha({ a: hoy, b: hoy - dia, c: hoy - 3 * dia }, hoy), 2);   // hueco hace dos días
  assert.equal(racha({ a: hoy - 2 * dia }, hoy), 0);                        // se rompió ayer
});
