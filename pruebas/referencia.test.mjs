import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nombreLibro, tituloCapitulo, anuncioCapitulo, nombreHablado, GRUPOS,
} from '../src/referencia/nombres.js';
import { analizarReferencia } from '../src/referencia/analizar.js';

test('nombres de libro en los dos idiomas', () => {
  assert.equal(nombreLibro('JHN', 'es'), 'Juan');
  assert.equal(nombreLibro('JHN', 'en'), 'John');
  assert.equal(nombreLibro('REV', 'es'), 'Apocalipsis');
  assert.equal(nombreLibro('SNG', 'en'), 'Song of Solomon');
  assert.equal(nombreLibro('XXX', 'es'), '');
});

test('título de capítulo: salmos en singular, libros de un capítulo sin número', () => {
  assert.equal(tituloCapitulo('JHN', 3, 'es'), 'Juan 3');
  assert.equal(tituloCapitulo('PSA', 23, 'es'), 'Salmo 23');
  assert.equal(tituloCapitulo('PSA', 23, 'en'), 'Psalm 23');
  assert.equal(tituloCapitulo('JUD', 1, 'es'), 'Judas');
});

test('nombre hablado de los libros numerados', () => {
  assert.equal(nombreHablado('1SA', 'es'), 'Primera de Samuel');
  assert.equal(nombreHablado('3JN', 'es'), 'Tercera de Juan');
  assert.equal(nombreHablado('2KI', 'en'), 'Second Kings');
  assert.equal(nombreHablado('GEN', 'es'), 'Génesis');
});

test('anuncio de capítulo', () => {
  assert.equal(anuncioCapitulo('GEN', 4, 'es'), 'Capítulo 4.');
  assert.equal(anuncioCapitulo('EXO', 1, 'es', { conLibro: true }), 'Éxodo. Capítulo 1.');
  assert.equal(anuncioCapitulo('PSA', 23, 'es', { conLibro: true }), 'Salmo 23.');
  assert.equal(anuncioCapitulo('1CO', 1, 'es', { conLibro: true }), 'Primera de Corintios. Capítulo 1.');
  assert.equal(anuncioCapitulo('JUD', 1, 'es', { conLibro: true }), 'Judas.');
  assert.equal(anuncioCapitulo('GEN', 4, 'en'), 'Chapter 4.');
  assert.equal(anuncioCapitulo('PSA', 23, 'en'), 'Psalm 23.');
});

test('los grupos cubren los 66 libros en orden', () => {
  assert.equal(GRUPOS.length, 10);
  assert.equal(GRUPOS.flatMap((g) => g.libros).length, 66);
  assert.deepEqual(GRUPOS[5], { id: 'evangelios', t: 'NT', libros: ['MAT', 'MRK', 'LUK', 'JHN'] });
  assert.equal(GRUPOS[4].libros[0], 'HOS');
});

const casos = [
  ['jn 3 16', 'es', { libro: 'JHN', cap: 3, vers: 16 }],
  ['Juan 3:16', 'es', { libro: 'JHN', cap: 3, vers: 16 }],
  ['juan 3', 'es', { libro: 'JHN', cap: 3, vers: null }],
  ['1 co 13', 'es', { libro: '1CO', cap: 13, vers: null }],
  ['1co13', 'es', { libro: '1CO', cap: 13, vers: null }],
  ['1 Corintios 13:4', 'es', { libro: '1CO', cap: 13, vers: 4 }],
  ['sal 23', 'es', { libro: 'PSA', cap: 23, vers: null }],
  ['Salmo 23', 'es', { libro: 'PSA', cap: 23, vers: null }],
  ['Salmos 119:105', 'es', { libro: 'PSA', cap: 119, vers: 105 }],
  ['gn', 'es', { libro: 'GEN', cap: null, vers: null }],
  ['génesis', 'es', { libro: 'GEN', cap: null, vers: null }],
  ['apocalipsis 22.21', 'es', { libro: 'REV', cap: 22, vers: 21 }],
  ['Ap. 1', 'es', { libro: 'REV', cap: 1, vers: null }],
  ['1 juan 2', 'es', { libro: '1JN', cap: 2, vers: null }],
  ['3 jn', 'es', { libro: '3JN', cap: null, vers: null }],
  ['judas 5', 'es', { libro: 'JUD', cap: 1, vers: 5 }],
  ['cantar de los cantares 2', 'es', { libro: 'SNG', cap: 2, vers: null }],
  ['hech 2', 'es', { libro: 'ACT', cap: 2, vers: null }],
  ['john 3', 'es', { libro: 'JHN', cap: 3, vers: null }],
  ['john 3', 'en', { libro: 'JHN', cap: 3, vers: null }],
  ['ps 119', 'en', { libro: 'PSA', cap: 119, vers: null }],
  ['rev 1', 'en', { libro: 'REV', cap: 1, vers: null }],
  ['1 kings 8', 'en', { libro: '1KI', cap: 8, vers: null }],
  ['song of songs 2', 'en', { libro: 'SNG', cap: 2, vers: null }],
  ['mateo 5', 'en', { libro: 'MAT', cap: 5, vers: null }],
];

for (const [texto, idioma, esperado] of casos) {
  test(`analiza «${texto}» (${idioma})`, () => {
    assert.deepEqual(analizarReferencia(texto, idioma), esperado);
  });
}

test('rechaza lo que no es una referencia', () => {
  assert.equal(analizarReferencia('', 'es'), null);
  assert.equal(analizarReferencia('   ', 'es'), null);
  assert.equal(analizarReferencia('xyz 3', 'es'), null);
  assert.equal(analizarReferencia('juan 99', 'es'), null);
  assert.equal(analizarReferencia('juan 0', 'es'), null);
  assert.equal(analizarReferencia('3 16', 'es'), null);
  assert.equal(analizarReferencia('j', 'es'), null);
});
