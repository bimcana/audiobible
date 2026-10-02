import test from 'node:test';
import assert from 'node:assert/strict';
import { LIBROS } from '../src/referencia/canon.js';
import { convertirLibro } from '../herramientas/convertir.mjs';
import { validarVersion } from '../herramientas/validar.mjs';

// Una Biblia sintética: dos versículos por capítulo en los 66 libros.
function fuenteSintetica() {
  return {
    books: LIBROS.map((l) => ({
      id: l.id,
      chapters: Array.from({ length: l.caps }, (_, c) => ({
        chapter: {
          number: c + 1,
          content: [
            { type: 'verse', number: 1, content: [`${l.id} ${c + 1} uno`] },
            { type: 'verse', number: 2, content: ['dos', { noteId: 0 }, 'y medio'] },
          ],
        },
      })),
    })),
  };
}

const convertir = (fuente) => fuente.books.map((b) => convertirLibro(b, { jesus: false }).libro);

test('una versión bien convertida no da errores y cuenta bien', () => {
  const fuente = fuenteSintetica();
  const { errores, cifras } = validarVersion(fuente, convertir(fuente));
  assert.deepEqual(errores, []);
  assert.equal(cifras.libros, 66);
  assert.equal(cifras.capitulos, 1189);
  assert.equal(cifras.versiculos, 2378);
});

test('detecta un libro que falta', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros.splice(5, 1);
  const { errores } = validarVersion(fuente, libros);
  assert.ok(errores.some((e) => e.includes('se esperaban 66')));
});

test('detecta un capítulo de menos', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros[0].caps.pop();
  const { errores } = validarVersion(fuente, libros);
  assert.ok(errores.some((e) => e.startsWith('GEN: 49 capítulos')));
});

test('detecta una letra cambiada', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros[42].caps[2][0].x = ['JHN 3 uno!'];
  const { errores } = validarVersion(fuente, libros);
  assert.deepEqual(errores, ['JHN 3:1: el texto no coincide con la fuente']);
});

test('detecta versículos fuera de orden', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros[0].caps[0].reverse();
  const { errores } = validarVersion(fuente, libros);
  assert.ok(errores.some((e) => e === 'GEN 1: versículo 1 fuera de orden'));
});

test('detecta un versículo perdido', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros[0].caps[0].pop();
  const { errores } = validarVersion(fuente, libros);
  assert.ok(errores.some((e) => e === 'GEN 1: 1 versículos, la fuente tiene 2'));
});

test('detecta espacios sobrantes', () => {
  const fuente = fuenteSintetica();
  const libros = convertir(fuente);
  libros[0].caps[0][1].x = ['dos  y medio'];
  const { errores } = validarVersion(fuente, libros);
  assert.deepEqual(errores, ['GEN 1:2: espacios sobrantes']);
});

test('no cuenta como versículo de la fuente el que está vacío', () => {
  const fuente = fuenteSintetica();
  fuente.books[0].chapters[0].chapter.content.push({ type: 'verse', number: 3, content: [] });
  const { errores } = validarVersion(fuente, convertir(fuente));
  assert.deepEqual(errores, []);
});
