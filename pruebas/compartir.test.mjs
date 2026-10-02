import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FOTOS, LISOS, temasDe, fotosPara, urlFoto } from '../src/datos/fondos.js';
import { versiculoDelDia, cuantas } from '../src/datos/versiculo-del-dia.js';

test('las fotos no se repiten y todas llevan algún tema', () => {
  assert.equal(new Set(FOTOS.map((f) => f.id)).size, FOTOS.length);
  assert.ok(FOTOS.length >= 60);
  assert.ok(FOTOS.every((f) => f.temas.length >= 1));
  assert.equal(urlFoto(24, 1080, 1350), 'https://picsum.photos/id/24/1080/1350');
  assert.ok(LISOS.length >= 4);
});

test('reconoce los temas de un versículo, en español y en inglés, sin tildes', () => {
  assert.deepEqual(temasDe('Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar'), ['campo']);
  assert.deepEqual(temasDe('Lámpara es a mis pies tu palabra, y lumbrera a mi camino'), ['luz', 'camino']);
  assert.deepEqual(temasDe('The LORD is my rock, and my fortress'), ['roca']);
  assert.deepEqual(temasDe('Porque de tal manera amó Dios al mundo'), []);
});

test('las fotos del tema del versículo van primero, y el orden es estable', () => {
  const texto = 'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro?';
  const fotos = fotosPara(texto);
  assert.equal(fotos.length, FOTOS.length);
  assert.ok(fotos.slice(0, 6).every((f) => f.temas.includes('montana')));
  assert.equal(fotos[0].temas[0], 'montana');
  assert.deepEqual(fotosPara(texto).map((f) => f.id), fotos.map((f) => f.id));
});

test('sin pistas en el texto se ofrece un surtido que empieza por el libro', () => {
  assert.deepEqual(fotosPara('Porque de tal manera amó Dios al mundo')[0].temas, ['libro']);
});

test('el versículo del día es el mismo todo el día y cambia al siguiente', () => {
  const a = versiculoDelDia(new Date(2026, 9, 2, 8));
  const b = versiculoDelDia(new Date(2026, 9, 2, 23));
  const c = versiculoDelDia(new Date(2026, 9, 3, 1));
  assert.deepEqual(a, b);
  assert.equal(a.clave, '2026-10-02');
  assert.notDeepEqual([a.libro, a.cap, a.vers], [c.libro, c.cap, c.vers]);
});

test('hay versículos para casi todo un año sin repetir, todos cortos y existentes', () => {
  assert.ok(cuantas >= 250, `${cuantas}`);
  const vistos = new Set();
  for (let d = 0; d < cuantas; d++) {
    const v = versiculoDelDia(new Date(2026, 0, 1 + d));
    assert.ok(v.hasta - v.vers <= 2);
    vistos.add(`${v.libro}.${v.cap}.${v.vers}-${v.hasta}`);
    const versos = JSON.parse(fs.readFileSync(`data/rvg/${v.libro}.json`, 'utf8')).caps[v.cap - 1].filter((e) => e.t === 'v').map((e) => e.n);
    assert.ok(versos.includes(v.vers));
  }
  assert.equal(vistos.size, cuantas);
});
