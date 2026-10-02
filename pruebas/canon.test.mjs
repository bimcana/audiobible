import test from 'node:test';
import assert from 'node:assert/strict';
import { LIBROS, libro, esNT } from '../src/referencia/canon.js';

test('el canon tiene 66 libros, 39 del AT y 27 del NT', () => {
  assert.equal(LIBROS.length, 66);
  assert.equal(LIBROS.filter((l) => l.t === 'AT').length, 39);
  assert.equal(LIBROS.filter((l) => l.t === 'NT').length, 27);
});

test('la suma de capítulos es 1189', () => {
  assert.equal(LIBROS.reduce((n, l) => n + l.caps, 0), 1189);
});

test('los ids no se repiten', () => {
  assert.equal(new Set(LIBROS.map((l) => l.id)).size, 66);
});

test('libro() devuelve los datos y el orden', () => {
  assert.deepEqual(libro('JHN'), { id: 'JHN', caps: 21, t: 'NT', orden: 42 });
  assert.deepEqual(libro('GEN'), { id: 'GEN', caps: 50, t: 'AT', orden: 0 });
  assert.equal(libro('XXX'), null);
});

test('esNT() distingue los testamentos', () => {
  assert.equal(esNT('GEN'), false);
  assert.equal(esNT('MAL'), false);
  assert.equal(esNT('MAT'), true);
  assert.equal(esNT('REV'), true);
  assert.equal(esNT('XXX'), false);
});
