import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertirVersiculo, convertirCapitulo, convertirLibro, textoDeTramos,
} from '../herramientas/convertir.mjs';

const tramos = (partes, jesus = true) => convertirVersiculo(partes, { jesus }).tramos;

test('une los tramos separados por una nota con un espacio', () => {
  assert.deepEqual(tramos(['a', { noteId: 0 }, 'b']), ['a b']);
});

test('no pone espacio ante un signo de cierre', () => {
  assert.deepEqual(tramos(['dijo', { noteId: 1 }, '). El sol']), ['dijo). El sol']);
  assert.deepEqual(tramos(['offspring.', { noteId: 1 }, '” So']), ['offspring.” So']);
  assert.deepEqual(tramos(['incomprehensible', { noteId: 1 }, '?”']), ['incomprehensible?”']);
});

test('sí pone espacio ante la raya de continuación «»»', () => {
  assert.deepEqual(tramos(['honor.', { noteId: 1 }, '»Porque']), ['honor. »Porque']);
});

test('marca las palabras de Jesús cuando se pide', () => {
  const partes = ['x:', { text: '«¡Efatá!»', wordsOfJesus: true }, '(y)'];
  assert.deepEqual(tramos(partes, true), ['x:', { j: ' «¡Efatá!»' }, ' (y)']);
});

test('ignora la marca de Jesús fuera del Nuevo Testamento', () => {
  const partes = ['x:', { text: '«¡Efatá!»', wordsOfJesus: true }, '(y)'];
  assert.deepEqual(tramos(partes, false), ['x: «¡Efatá!» (y)']);
});

test('la poesía abre una línea por tramo con su sangría', () => {
  assert.deepEqual(
    tramos([{ text: 'a', poem: 1 }, { text: 'b', poem: 2 }]),
    [{ l: 1 }, 'a', { l: 2 }, 'b'],
  );
});

test('dos marcas de línea seguidas se funden en la última', () => {
  assert.deepEqual(
    tramos(['a', { lineBreak: true }, { text: 'b', poem: 1 }]),
    ['a', { l: 1 }, 'b'],
  );
});

test('un salto de línea en prosa abre línea sin sangría', () => {
  assert.deepEqual(tramos(['a', { lineBreak: true }, 'b']), ['a', { l: 0 }, 'b']);
});

test('una comilla de cierre suelta no abre línea', () => {
  assert.deepEqual(
    tramos([{ text: 'you.', poem: 2 }, { noteId: 1 }, { text: '”', poem: 2 }]),
    [{ l: 2 }, 'you.”'],
  );
});

test('poesía con palabras de Jesús conserva ambas marcas', () => {
  assert.deepEqual(
    tramos([{ text: 'Blessed', wordsOfJesus: true, poem: 1 }]),
    [{ l: 1 }, { j: 'Blessed' }],
  );
});

test('el calderón inicial se convierte en párrafo y desaparece del texto', () => {
  const r = convertirVersiculo(['¶ And God said'], { jesus: false });
  assert.deepEqual(r.tramos, ['And God said']);
  assert.equal(r.parrafoAntes, true);
});

test('el texto descriptivo se marca aparte', () => {
  assert.deepEqual(tramos([{ text: 'BETH', descriptive: true }]), [{ d: 'BETH' }]);
});

test('un versículo sin texto se declara vacío', () => {
  assert.equal(convertirVersiculo([], { jesus: true }).vacio, true);
  assert.equal(convertirVersiculo([{ noteId: 0 }], { jesus: true }).vacio, true);
  assert.equal(convertirVersiculo(['a'], { jesus: true }).vacio, false);
});

test('un tramo de forma desconocida lanza un error', () => {
  assert.throws(() => convertirVersiculo([{ raro: 1 }], { jesus: true }), /Tramo desconocido/);
});

test('textoDeTramos concatena y da los saltos de línea como \\n', () => {
  assert.equal(textoDeTramos(['x:', { j: ' y' }, { l: 1 }, { d: 'z' }]), 'x: y\nz');
});

const v = (number, ...content) => ({ type: 'verse', number, content });

test('el capítulo traduce títulos, sobrescritos y párrafos', () => {
  const { elementos } = convertirCapitulo([
    { type: 'heading', content: ['La creación'] },
    { type: 'hebrew_subtitle', content: ['Salmo', { noteId: 1 }, 'de David.'] },
    v(1, 'uno'),
    { type: 'line_break' },
    v(2, 'dos'),
  ], { jesus: false });
  assert.deepEqual(elementos, [
    { t: 'h', x: 'La creación' },
    { t: 's', x: 'Salmo de David.' },
    { t: 'v', n: 1, x: ['uno'] },
    { t: 'p' },
    { t: 'v', n: 2, x: ['dos'] },
  ]);
});

test('no deja párrafos al principio, al final ni repetidos', () => {
  const { elementos } = convertirCapitulo([
    { type: 'line_break' },
    v(1, 'uno'),
    { type: 'line_break' },
    { type: 'line_break' },
    v(2, '¶ dos'),
    { type: 'line_break' },
  ], { jesus: false });
  assert.deepEqual(elementos.map((e) => e.t), ['v', 'p', 'v']);
});

test('el calderón del primer versículo no abre párrafo', () => {
  const { elementos } = convertirCapitulo([v(1, '¶ uno'), v(2, '¶ dos')], { jesus: false });
  assert.deepEqual(elementos.map((e) => e.t), ['v', 'p', 'v']);
  assert.deepEqual(elementos[0].x, ['uno']);
});

test('los versículos vacíos se omiten y se cuentan', () => {
  const r = convertirCapitulo([v(1, 'uno'), v(2), v(3, 'tres')], { jesus: false });
  assert.deepEqual(r.elementos.map((e) => e.n), [1, 3]);
  assert.equal(r.vacios, 1);
});

test('un elemento de tipo desconocido lanza un error', () => {
  assert.throws(() => convertirCapitulo([{ type: 'raro' }], { jesus: false }), /Elemento desconocido/);
});

test('convertirLibro devuelve el id y un arreglo por capítulo', () => {
  const fuente = {
    id: 'JUD',
    chapters: [{ chapter: { number: 1, content: [v(1, 'uno'), v(2)] } }],
  };
  assert.deepEqual(convertirLibro(fuente, { jesus: true }), {
    libro: { id: 'JUD', caps: [[{ t: 'v', n: 1, x: ['uno'] }]] },
    vacios: 1,
  });
});
