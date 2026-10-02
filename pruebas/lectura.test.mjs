import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dividirOraciones } from '../src/lectura/oraciones.js';
import { textoParaVoz, reubicarPalabras } from '../src/lectura/pronunciacion.js';
import { repartoVelocidad } from '../src/voz/velocidad.js';
import { construirPasajes } from '../src/lectura/pasajes.js';

const partes = (t) => dividirOraciones(t).map((o) => t.slice(o.cs, o.ce));

test('divide por puntos, interrogaciones y exclamaciones', () => {
  assert.deepEqual(
    partes('En el principio creó Dios los cielos. Y la tierra estaba desordenada. ¿Quién lo vio?'),
    ['En el principio creó Dios los cielos.', 'Y la tierra estaba desordenada.', '¿Quién lo vio?'],
  );
});

test('no corta ante minúscula ni deja oraciones diminutas', () => {
  assert.deepEqual(partes('Dijo así. y siguió hablando sin parar.'), ['Dijo así. y siguió hablando sin parar.']);
  assert.deepEqual(partes('Sí. No. Tal vez mañana lo sepamos.'), ['Sí. No. Tal vez mañana lo sepamos.']);
});

test('las comillas de cierre quedan con su oración', () => {
  assert.deepEqual(
    partes('Y dijo: «Sea la luz.» Y fue la luz en aquel día.'),
    ['Y dijo: «Sea la luz.»', 'Y fue la luz en aquel día.'],
  );
});

test('reconoce la raya de diálogo como comienzo de oración', () => {
  assert.equal(partes('Jesús le respondió con calma. ―Te aseguro que es así.').length, 2);
});

test('las oraciones cubren todo el texto sin solaparse', () => {
  const t = JSON.parse(fs.readFileSync('data/nbv/JHN.json', 'utf8')).caps[2];
  for (const p of construirPasajes(t)) {
    const os = dividirOraciones(p.texto);
    assert.equal(os[0].cs, 0);
    assert.equal(os[os.length - 1].ce, p.texto.length);
    for (let i = 1; i < os.length; i++) assert.ok(os[i].cs >= os[i - 1].ce);
  }
});

test('sin nada que corregir devuelve el mismo texto y ningún mapa', () => {
  assert.deepEqual(textoParaVoz('Porque de tal manera amó Dios al mundo.', { version: 'rvg' }),
    { texto: 'Porque de tal manera amó Dios al mundo.', mapa: null });
});

test('retira los separadores de miles y guarda el mapa', () => {
  const { texto, mapa } = textoParaVoz('Eran 603,550 hombres.', { version: 'bsb' });
  assert.equal(texto, 'Eran 603550 hombres.');
  assert.equal(mapa[8], 9);                      // el «5» tras la coma
  assert.equal(mapa.length, texto.length);
});

test('respeta decimales y referencias', () => {
  assert.equal(textoParaVoz('Mide 2.5 codos, el 3,14.', {}).texto, 'Mide 2.5 codos, el 3,14.');
  assert.equal(textoParaVoz('603.550 y 1.234.567', {}).texto, '603550 y 1234567');
});

test('RV1909: quita las tildes antiguas sin cambiar la longitud', () => {
  const original = 'Y fué á la casa, é hizo lo que vió; ó no. Dió fe.';
  const { texto, mapa } = textoParaVoz(original, { version: 'rv1909' });
  assert.equal(texto, 'Y fue a la casa, e hizo lo que vio; o no. Dio fe.');
  assert.equal(mapa, null);
});

test('RV1909: no toca las tildes dentro de palabra', () => {
  const t = 'Él está allá; será; mamá.';
  assert.equal(textoParaVoz(t, { version: 'rv1909' }).texto, t);
});

test('las reglas de una versión no se aplican a otra', () => {
  assert.equal(textoParaVoz('Fué á casa.', { version: 'rvg' }).texto, 'Fué á casa.');
});

test('LSV: YHWH se pronuncia Yahweh y el mapa devuelve al original', () => {
  const original = 'And YHWH said to him.';
  const { texto, mapa } = textoParaVoz(original, { version: 'lsv' });
  assert.equal(texto, 'And Yahweh said to him.');
  const palabras = [
    { w: 'Yahweh', s: 100, e: 300, cs: 4, ce: 10 },
    { w: 'said', s: 300, e: 500, cs: 11, ce: 15 },
  ];
  const [yhwh, said] = reubicarPalabras(palabras, mapa);
  assert.equal(original.slice(yhwh.cs, yhwh.ce), 'YHWH');
  assert.equal(original.slice(said.cs, said.ce), 'said');
});

test('reubicarPalabras sin mapa devuelve lo mismo', () => {
  const p = [{ cs: 1, ce: 2 }];
  assert.equal(reubicarPalabras(p, null), p);
});

test('ningún pasaje real contiene números de versículo intercalados', () => {
  // En RV1909 no hay cifras en el texto bíblico: cualquier dígito sería un número colado.
  for (const libro of ['GEN', 'PSA', 'JHN', 'REV']) {
    const caps = JSON.parse(fs.readFileSync(`data/rv1909/${libro}.json`, 'utf8')).caps;
    for (const elementos of caps) {
      for (const p of construirPasajes(elementos)) {
        assert.ok(!/\d/.test(textoParaVoz(p.texto, { version: 'rv1909' }).texto), p.texto.slice(0, 60));
      }
    }
  }
});

test('reparto de velocidad', () => {
  assert.deepEqual(repartoVelocidad(1), { motor: 1.1, reproductor: 1, total: 1.1 });
  assert.deepEqual(repartoVelocidad(0.5), { motor: 0.55, reproductor: 1, total: 0.55 });
  const dos = repartoVelocidad(2);
  assert.equal(dos.motor, 1.6);
  assert.equal(dos.reproductor, 1.25);
});
