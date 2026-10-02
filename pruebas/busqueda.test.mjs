import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { plano, construirIndice, analizarConsulta, buscar, resaltar } from '../src/datos/busqueda.js';

const v = (n, ...x) => ({ t: 'v', n, x });
const libros = [
  { id: 'JHN', caps: [[v(1, 'En el principio era el Verbo.')], [], [v(16, 'Porque de tal manera amó Dios al mundo,', { j: ' que ha dado a su Hijo unigénito.' })]] },
  { id: 'PSA', caps: [[{ t: 's', x: 'Salmo de David.' }, v(1, { l: 1 }, 'Jehová es mi pastor;', { l: 2 }, 'nada me faltará.')]] },
];
const indice = construirIndice(libros);

test('plano quita tildes, mayúsculas y puntuación', () => {
  assert.equal(plano('¡Jehová, Dios mío!'), 'jehova dios mio');
});

test('el índice trae un registro por versículo con su texto unido', () => {
  assert.equal(indice.length, 3);
  assert.deepEqual([indice[1].libro, indice[1].cap, indice[1].n], ['JHN', 3, 16]);
  assert.equal(indice[1].texto, 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.');
  assert.equal(indice[2].texto, 'Jehová es mi pastor; nada me faltará.');
});

test('analiza palabras sueltas y frases entre comillas', () => {
  assert.deepEqual(analizarConsulta('amor Dios'), ['amor', 'dios']);
  assert.deepEqual(analizarConsulta('"de tal manera" mundo'), ['de tal manera', 'mundo']);
  assert.deepEqual(analizarConsulta('«Hijo unigénito»'), ['hijo unigenito']);
  assert.deepEqual(analizarConsulta('   '), []);
});

test('encuentra sin importar tildes ni mayúsculas', () => {
  assert.equal(buscar(indice, 'JEHOVA').total, 1);
  assert.equal(buscar(indice, 'amo dios').total, 1);
});

test('busca palabras enteras, no trozos', () => {
  assert.equal(buscar(indice, 'pas').total, 0);
  assert.equal(buscar(indice, 'pastor').total, 1);
});

test('todas las palabras deben estar; la frase, seguida', () => {
  assert.equal(buscar(indice, 'mundo pastor').total, 0);
  assert.equal(buscar(indice, '"amó Dios al mundo"').total, 1);
  assert.equal(buscar(indice, '"Dios amó"').total, 0);
});

test('filtra por libros y respeta el límite sin perder la cuenta', () => {
  assert.equal(buscar(indice, 'el', { libros: new Set(['PSA']) }).total, 0);
  const r = buscar(indice, 'a', { limite: 0 });
  assert.equal(r.resultados.length, 0);
  assert.equal(r.total, 1);
});

test('una consulta vacía no devuelve nada', () => {
  assert.deepEqual(buscar(indice, '  '), { terminos: [], resultados: [], total: 0 });
});

test('resaltar marca lo hallado sobre el texto original', () => {
  assert.deepEqual(resaltar('Jehová es mi pastor;', ['jehova', 'pastor']), [
    { texto: 'Jehová', hallado: true },
    { texto: ' es mi ', hallado: false },
    { texto: 'pastor', hallado: true },
    { texto: ';', hallado: false },
  ]);
});

test('resaltar marca una frase entera aunque lleve puntuación en medio', () => {
  const trozos = resaltar('al mundo, que ha dado', ['mundo que']);
  assert.deepEqual(trozos.filter((t) => t.hallado).map((t) => t.texto), ['mundo, que']);
});

test('sobre una versión real: «pastor» en la RVG y la frase del Salmo 23', () => {
  const todos = JSON.parse(fs.readFileSync('data/versiones.json', 'utf8')).length;
  assert.equal(todos, 10);
  const psa = JSON.parse(fs.readFileSync('data/rvg/PSA.json', 'utf8'));
  const jhn = JSON.parse(fs.readFileSync('data/rvg/JHN.json', 'utf8'));
  const real = construirIndice([psa, jhn]);
  const r = buscar(real, '"Jehová es mi pastor"');
  assert.deepEqual(r.resultados.map((x) => [x.libro, x.cap, x.n]), [['PSA', 23, 1]]);
  assert.ok(buscar(real, 'buen pastor').total >= 2);          // Juan 10:11 y 10:14
});
