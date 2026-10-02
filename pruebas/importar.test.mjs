// El analizador del importador, con páginas inventadas que imitan la
// tipografía de un libro electrónico pasado por Calibre. (La prueba contra PDF
// reales es herramientas/probar-importador.mjs; esos archivos no están aquí.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLector } from '../src/importar/perfil.js';
import { validarImportada } from '../src/importar/validar.js';
import { construirPasajes } from '../src/lectura/pasajes.js';

const CUERPO = 14.4;
const MARGEN = 80;
const estilo = (f) => f;

// Constructor de páginas: cada llamada a renglon() baja una línea.
function pagina() {
  const trozos = [];
  let y = 700;
  const api = {
    trozos,
    // partes: [texto, {h, f, color, dy}] …
    renglon(x, ...partes) {
      partes.forEach(([str, o = {}], i) => {
        trozos.push({
          str, x: x + i * 40, y: y + (o.h && o.h < CUERPO ? 5 : 0), h: o.h ?? CUERPO, fuente: o.f ?? 'r', color: o.color ?? null,
          eol: i === partes.length - 1,
        });
      });
      y -= 18;
      return api;
    },
    hueco() { y -= 30; return api; },
    // Relleno para que el lector reconozca el tamaño del cuerpo y el margen.
    relleno(n = 6) {
      for (let i = 0; i < n; i++) api.renglon(MARGEN, ['texto de relleno que ocupa un renglón entero del cuerpo de la página']);
      return api;
    },
  };
  return api;
}

const num = (n) => [String(n), { h: 10.8 }];
const cabecera = (texto) => [texto, { h: 20.2, color: 'azul' }];

function leer(...paginas) {
  const lector = crearLector({ idioma: 'es' });
  for (const p of paginas) lector.pagina(p.trozos, estilo);
  return lector.terminar();
}

const capitulo = (resultado, id, n) => resultado.libros.find((l) => l.id === id).caps[n - 1];

// Una primera página que fija cuerpo y margen, como la portada de un libro real.
const portada = () => pagina().relleno(8);

test('reconoce el encabezado de capítulo y los versículos, sin sus números', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUAN 3'))
    .renglon(MARGEN, num(1), ['Había un hombre llamado Nicodemo. '], num(2), ['Éste fue de noche'])
    .renglon(MARGEN, ['a visitar a Jesús.']));
  assert.deepEqual(capitulo(r, 'JHN', 3), [
    { t: 'v', n: 1, x: ['Había un hombre llamado Nicodemo.'] },
    { t: 'v', n: 2, x: ['Éste fue de noche a visitar a Jesús.'] },
  ]);
  assert.deepEqual(r.incidencias.filter((i) => !i.includes('falta el capítulo')), []);
});

test('ignora lo anterior al primer encabezado y el título del libro', () => {
  const r = leer(portada(), pagina()
    .renglon(MARGEN, ['Prefacio que no es texto bíblico.'])
    .renglon(250, ['JUDAS', { h: 23.8, color: 'azul' }])
    .renglon(250, cabecera('JUDAS 1'))
    .renglon(MARGEN, num(1), ['Judas, siervo de Jesucristo.']));
  assert.deepEqual(capitulo(r, 'JUD', 1), [{ t: 'v', n: 1, x: ['Judas, siervo de Jesucristo.'] }]);
});

test('reconstruye las mayúsculas de un título en versalitas', () => {
  const b = (str, h) => [str, { h, f: 'b' }];
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUAN 3'))
    .renglon(MARGEN, b('J', 16.6), b('ESÚS', 11.6), b(' ', 0), b('ENSEÑA', 11.6), b(' ', 0), b('A', 11.6), b(' ', 0), b('N', 16.6), b('ICODEMO', 11.6))
    .renglon(MARGEN, num(1), ['Había un hombre.']));
  assert.deepEqual(capitulo(r, 'JHN', 3)[0], { t: 'h', x: 'Jesús enseña a Nicodemo' });
});

test('descarta pasajes paralelos, llamadas de nota, asteriscos y enlaces', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('MATEO 1'))
    .renglon(MARGEN, ['1:1–17 — Lc 3:23–38', { f: 'bi' }])
    .renglon(MARGEN, num(1), ['Tabla de '], ['*', { color: 'azul' }], ['Jesucristo'], ['[1]', { h: 10.8, color: 'azul' }], [', hijo de David.'])
    .renglon(MARGEN, ['Antiguo Testamento', { color: 'azul' }], [' | '], ['Nuevo Testamento', { color: 'azul' }]));
  assert.deepEqual(capitulo(r, 'MAT', 1), [{ t: 'v', n: 1, x: ['Tabla de Jesucristo, hijo de David.'] }]);
});

test('las notas al final cierran el capítulo y lo que sigue se ignora', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUDAS 1'))
    .renglon(MARGEN, num(1), ['Judas, siervo.'])
    .renglon(MARGEN, ['1:1 Nota al pie en letra pequeña.', { h: 8.6 }])
    .renglon(MARGEN, ['Glosario en letra normal que no es texto bíblico.']));
  assert.deepEqual(capitulo(r, 'JUD', 1), [{ t: 'v', n: 1, x: ['Judas, siervo.'] }]);
});

test('une los versículos «5-6» y recuerda el último número', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('NÚMEROS 26'))
    .renglon(MARGEN, num(4), ['Cuatro.'], ['5-6', { h: 10.8 }], ['De Enoc y Falú.'], num(7), ['Siete.']));
  assert.deepEqual(capitulo(r, 'NUM', 26).map((v) => [v.n, v.f]), [[4, undefined], [5, 6], [7, undefined]]);
});

test('una sangría corta o un hueco abren párrafo; dentro de un versículo, línea', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUAN 3'))
    .renglon(MARGEN, num(1), ['Uno.'])
    .renglon(MARGEN + 9, num(2), ['Dos, con sangría.'])
    .renglon(MARGEN + 9, ['—Diálogo en párrafo propio.'])
    .hueco()
    .renglon(MARGEN, num(3), ['Tres, tras un hueco.']));
  assert.deepEqual(capitulo(r, 'JHN', 3), [
    { t: 'v', n: 1, x: ['Uno.'] },
    { t: 'p' },
    { t: 'v', n: 2, x: ['Dos, con sangría.', { l: 0 }, '—Diálogo en párrafo propio.'] },
    { t: 'p' },
    { t: 'v', n: 3, x: ['Tres, tras un hueco.'] },
  ]);
});

test('la poesía registra cada renglón con su nivel', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('SALMO 23'))
    .renglon(180, ['Salmo de David.', { h: 16.6, f: 'i' }])
    .renglon(MARGEN + 20, num(1), ['El Señor es mi pastor,'])
    .renglon(MARGEN + 45, ['nada me falta;'])
    .renglon(MARGEN + 20, num(2), ['en verdes pastos me hace descansar.']));
  assert.deepEqual(capitulo(r, 'PSA', 23), [
    { t: 's', x: 'Salmo de David.' },
    { t: 'v', n: 1, x: [{ l: 1 }, 'El Señor es mi pastor,', { l: 2 }, 'nada me falta;'] },
    { t: 'v', n: 2, x: [{ l: 1 }, 'en verdes pastos me hace descansar.'] },
  ]);
});

test('un encabezado con llamada de nota sigue siendo un encabezado', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('SALMO 9'), ['[9]', { h: 16.6, color: 'azul' }])
    .renglon(MARGEN + 20, num(1), ['Quiero alabarte.']));
  assert.equal(capitulo(r, 'PSA', 9).length, 1);
});

test('las palabras de Jesús quedan marcadas y el espacio va al tramo siguiente', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUAN 3'))
    .renglon(MARGEN, num(3), ['—De veras te aseguro ', { color: 'rojo' }], ['—dijo Jesús—. '], ['Así es.', { color: 'rojo' }]));
  assert.deepEqual(capitulo(r, 'JHN', 3), [
    { t: 'v', n: 3, x: [{ j: '—De veras te aseguro' }, ' —dijo Jesús—.', { j: ' Así es.' }] },
  ]);
  assert.equal(r.hayRojo, true);
});

test('un versículo continúa en la página siguiente', () => {
  const r = leer(portada(),
    pagina().renglon(250, cabecera('JUAN 3')).renglon(MARGEN, num(1), ['Empieza aquí']),
    pagina().renglon(MARGEN, ['y termina en la otra página.']));
  assert.deepEqual(capitulo(r, 'JHN', 3), [{ t: 'v', n: 1, x: ['Empieza aquí y termina en la otra página.'] }]);
});

test('avisa de los capítulos que faltan en un libro', () => {
  const r = leer(portada(), pagina().renglon(250, cabecera('JUAN 3')).renglon(MARGEN, num(1), ['Uno.']));
  assert.ok(r.incidencias.includes('JHN 1: falta el capítulo'));
  assert.equal(r.libros[0].caps.length, 21);
});

test('lo importado se puede leer: los pasajes salen sin números', () => {
  const r = leer(portada(), pagina()
    .renglon(250, cabecera('JUDAS 1'))
    .renglon(MARGEN, num(1), ['Judas, siervo. '], ['2-3', { h: 10.8 }], ['Que reciban misericordia.']));
  const [p] = construirPasajes(capitulo(r, 'JUD', 1));
  assert.equal(p.texto, 'Judas, siervo. Que reciban misericordia.');
  assert.deepEqual(p.versos.map((v) => [v.n, v.f]), [[1, undefined], [2, 3]]);
});

test('la validación acepta huecos y señala lo que quedó mal', () => {
  const bien = [{ id: 'JUD', caps: [[{ t: 'v', n: 1, x: ['Uno.'] }, { t: 'v', n: 3, x: ['Tres.'] }]] }];
  const r1 = validarImportada(bien);
  assert.deepEqual(r1.errores, []);
  assert.deepEqual(r1.avisos, ['JUD 1: del versículo 1 salta al 3']);
  assert.equal(r1.faltan.length, 65);

  const mal = [{ id: 'JUD', caps: [[{ t: 'v', n: 2, x: ['Dos[4] con *marca.'] }, { t: 'v', n: 1, x: ['  '] }]] }];
  const r2 = validarImportada(mal);
  assert.ok(r2.errores.some((e) => e.includes('llamada de nota')));
  assert.ok(r2.errores.some((e) => e.includes('asterisco')));
  assert.ok(r2.errores.some((e) => e.includes('versículo 1 tras el 2')));
  assert.ok(r2.errores.some((e) => e.includes('vacío')));
});

test('un versículo unido no cuenta como hueco', () => {
  const r = validarImportada([{ id: 'JUD', caps: [[{ t: 'v', n: 1, f: 2, x: ['Uno y dos.'] }, { t: 'v', n: 3, x: ['Tres.'] }]] }]);
  assert.deepEqual(r.avisos, []);
});
