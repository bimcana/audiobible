import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TEMARIO, leerCita } from '../src/datos/temario.js';
import { libro } from '../src/referencia/canon.js';

const libros = new Map();
const leer = (version, id) => {
  const clave = `${version}/${id}`;
  if (!libros.has(clave)) libros.set(clave, JSON.parse(fs.readFileSync(`data/${clave}.json`, 'utf8')));
  return libros.get(clave);
};

test('leerCita entiende un versículo y un tramo', () => {
  assert.deepEqual(leerCita('JHN.3.16'), { libro: 'JHN', cap: 3, vers: 16, hasta: 16 });
  assert.deepEqual(leerCita('PSA.23.1-4'), { libro: 'PSA', cap: 23, vers: 1, hasta: 4 });
  assert.equal(leerCita('Juan 3:16'), null);
});

test('los identificadores no se repiten y todo tiene nombre en los dos idiomas', () => {
  const ids = TEMARIO.flatMap((c) => c.temas.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(TEMARIO.map((c) => c.id)).size, TEMARIO.length);
  for (const c of TEMARIO) {
    assert.ok(c.nombre.es && c.nombre.en);
    for (const t of c.temas) assert.ok(t.nombre.es && t.nombre.en, t.id);
  }
});

test('cada tema trae entre 6 y 10 citas, sin repetir', () => {
  for (const t of TEMARIO.flatMap((c) => c.temas)) {
    assert.ok(t.citas.length >= 6 && t.citas.length <= 10, `${t.id}: ${t.citas.length}`);
    assert.equal(new Set(t.citas).size, t.citas.length, t.id);
  }
});

// Cada cita debe existir, versículo a versículo, en una versión de cada idioma.
for (const version of ['rvg', 'kjv']) {
  test(`todas las citas existen en ${version}`, () => {
    for (const t of TEMARIO.flatMap((c) => c.temas)) {
      for (const cita of t.citas) {
        const c = leerCita(cita);
        assert.ok(c, `${t.id}: ${cita} mal escrita`);
        assert.ok(libro(c.libro), `${t.id}: libro de ${cita}`);
        assert.ok(c.hasta >= c.vers, `${t.id}: tramo de ${cita}`);
        const versos = new Set((leer(version, c.libro).caps[c.cap - 1] ?? []).filter((e) => e.t === 'v').map((e) => e.n));
        for (let n = c.vers; n <= c.hasta; n++) assert.ok(versos.has(n), `${t.id}: ${cita} — falta el versículo ${n}`);
      }
    }
  });
}
