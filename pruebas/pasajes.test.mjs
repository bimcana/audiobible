import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirPasajes } from '../src/lectura/pasajes.js';

const v = (n, ...x) => ({ t: 'v', n, x });
const P = { t: 'p' };

test('une los versículos de un párrafo en texto corrido sin números', () => {
  const [p, ...resto] = construirPasajes([v(1, 'En el principio.'), v(2, 'Y la tierra estaba vacía.')]);
  assert.equal(resto.length, 0);
  assert.equal(p.texto, 'En el principio. Y la tierra estaba vacía.');
  assert.deepEqual(p.versos, [{ n: 1, cs: 0, ce: 16 }, { n: 2, cs: 17, ce: 42 }]);
  assert.equal(p.texto.slice(17, 42), 'Y la tierra estaba vacía.');
});

test('un salto de párrafo separa pasajes', () => {
  const ps = construirPasajes([v(1, 'Uno.'), P, v(2, 'Dos.')]);
  assert.deepEqual(ps.map((p) => p.texto), ['Uno.', 'Dos.']);
});

test('los títulos cierran el pasaje y acompañan al siguiente', () => {
  const ps = construirPasajes([v(1, 'Uno.'), { t: 'h', x: 'Título' }, v(2, 'Dos.')]);
  assert.deepEqual(ps.map((p) => p.titulos), [[], ['Título']]);
  assert.ok(!ps.some((p) => p.texto.includes('Título')));
});

test('el sobrescrito de un salmo es un pasaje propio', () => {
  const ps = construirPasajes([{ t: 'h', x: 'El Señor es mi pastor' }, { t: 's', x: 'Salmo de David.' }, v(1, 'Uno.')]);
  assert.deepEqual(ps.map((p) => [p.tipo, p.texto, p.titulos]), [
    ['sobrescrito', 'Salmo de David.', ['El Señor es mi pastor']],
    ['texto', 'Uno.', []],
  ]);
});

test('sin párrafos, cierra al pasar del objetivo en un final de oración', () => {
  const frase = 'Esta es una oración de relleno que termina aquí.';   // 48
  const elementos = Array.from({ length: 6 }, (_, i) => v(i + 1, frase));
  const ps = construirPasajes(elementos, { objetivo: 100, maximo: 400 });
  assert.deepEqual(ps.map((p) => p.versos.map((x) => x.n)), [[1, 2, 3], [4, 5, 6]]);
});

test('no cierra a mitad de oración aunque pase del objetivo', () => {
  const ps = construirPasajes(
    [v(1, 'Empieza una oración larga que sigue,'), v(2, 'y continúa en el siguiente versículo.'), v(3, 'Otra.')],
    { objetivo: 20, maximo: 400 },
  );
  assert.deepEqual(ps.map((p) => p.versos.map((x) => x.n)), [[1, 2], [3]]);
});

test('cierra antes de superar el máximo', () => {
  const ps = construirPasajes(
    [v(1, 'aaaaaaaaaa,'), v(2, 'bbbbbbbbbb,'), v(3, 'cccccccccc,')],
    { objetivo: 500, maximo: 25 },
  );
  assert.deepEqual(ps.map((p) => p.versos.map((x) => x.n)), [[1, 2], [3]]);
});

test('marca las palabras de Jesús sin incluir el espacio inicial', () => {
  const [p] = construirPasajes([v(3, 'Jesús le dijo:', { j: ' Te aseguro.' }, ' Y calló.')]);
  assert.equal(p.texto, 'Jesús le dijo: Te aseguro. Y calló.');
  assert.deepEqual(p.jesus, [[15, 26]]);
  assert.equal(p.texto.slice(15, 26), 'Te aseguro.');
});

test('marca las acotaciones', () => {
  const [p] = construirPasajes([v(8, 'No me dejes.', { d: ' BETH' })]);
  assert.deepEqual(p.acotaciones, [[13, 17]]);
});

test('la poesía registra cada línea con su sangría y deja un espacio en el texto', () => {
  const [p] = construirPasajes([
    v(1, { l: 1 }, 'El Señor es mi pastor;', { l: 2 }, 'nada me faltará.'),
    v(2, { l: 1 }, 'En verdes pastos.'),
  ]);
  assert.equal(p.texto, 'El Señor es mi pastor; nada me faltará. En verdes pastos.');
  assert.deepEqual(p.lineas, [{ c: 0, n: 1 }, { c: 23, n: 2 }, { c: 40, n: 1 }]);
  assert.deepEqual(p.versos.map((x) => x.cs), [0, 40]);
});

test('un salto de línea al final de un versículo abre el siguiente', () => {
  const [p] = construirPasajes([v(1, 'Dijo:', { l: 0 }), v(2, 'Escúchenme.')]);
  assert.equal(p.texto, 'Dijo: Escúchenme.');
  assert.deepEqual(p.lineas, [{ c: 6, n: 0 }]);
});

test('no duplica la línea si el siguiente versículo ya abre la suya', () => {
  const [p] = construirPasajes([v(1, { l: 1 }, 'Uno;', { l: 0 }), v(2, { l: 1 }, 'dos.')]);
  assert.deepEqual(p.lineas, [{ c: 0, n: 1 }, { c: 5, n: 1 }]);
});

// --- sobre los datos reales ---

const sinEspacios = (s) => s.replace(/\s/g, '');
const textoVerso = (x) => x.map((t) => (typeof t === 'string' ? t : t.j ?? t.d ?? ' ')).join('');

function comprobarCapitulo(version, libro, cap) {
  const elementos = JSON.parse(fs.readFileSync(`data/${version}/${libro}.json`, 'utf8')).caps[cap - 1];
  const pasajes = construirPasajes(elementos);
  const versos = elementos.filter((e) => e.t === 'v');

  const esperado = sinEspacios(elementos.filter((e) => e.t === 'v' || e.t === 's')
    .map((e) => (e.t === 's' ? e.x : textoVerso(e.x))).join(''));
  assert.equal(sinEspacios(pasajes.map((p) => p.texto).join('')), esperado, 'el texto se conserva');

  const numeros = pasajes.flatMap((p) => p.versos.map((x) => x.n));
  assert.deepEqual(numeros, versos.map((e) => e.n), 'están todos los versículos, en orden');

  for (const p of pasajes) {
    assert.ok(p.texto.length <= 1100, 'ningún pasaje supera el máximo');
    assert.ok(!/ {2}|^ | $/.test(p.texto), 'sin espacios sobrantes');
    for (const x of p.versos) {
      const original = versos.find((e) => e.n === x.n);
      assert.equal(sinEspacios(p.texto.slice(x.cs, x.ce)), sinEspacios(textoVerso(original.x)));
    }
  }
  return pasajes;
}

test('Juan 3 en las diez versiones conserva el texto y el orden', () => {
  for (const v10 of JSON.parse(fs.readFileSync('data/versiones.json', 'utf8'))) {
    comprobarCapitulo(v10.id, 'JHN', 3);
  }
});

test('Salmo 23 en BSB: sobrescrito aparte y líneas de poesía', () => {
  const ps = comprobarCapitulo('bsb', 'PSA', 23);
  assert.equal(ps[0].tipo, 'sobrescrito');
  assert.deepEqual(ps[0].titulos, ['The LORD Is My Shepherd']);
  assert.ok(ps.slice(1).every((p) => p.lineas.length > 0));
});

test('el capítulo más largo (Salmo 119) y el versículo más largo (Ester 8:9) caben', () => {
  comprobarCapitulo('rv1909', 'PSA', 119);
  comprobarCapitulo('kjv', 'EST', 8);
  comprobarCapitulo('nbv', 'EST', 8);
});

test('RV1909, sin párrafos en la fuente, queda en pasajes de tamaño razonable', () => {
  const ps = comprobarCapitulo('rv1909', 'GEN', 1);
  assert.ok(ps.length >= 4 && ps.length <= 10, `${ps.length} pasajes`);
});
