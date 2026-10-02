import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { convertirRef, agruparRefs } from '../herramientas/refs.mjs';
import { extraerDeZip } from '../herramientas/zip.mjs';

test('convierte una referencia simple y un rango', () => {
  assert.equal(convertirRef('Ps.115.15'), 'PSA.115.15');
  assert.equal(convertirRef('Prov.8.22-Prov.8.30'), 'PRO.8.22-PRO.8.30');
  assert.equal(convertirRef('1Cor.13.4'), '1CO.13.4');
});

test('rechaza libros fuera del canon y capítulos inexistentes', () => {
  assert.equal(convertirRef('Tob.1.1'), null);
  assert.equal(convertirRef('Jude.2.1'), null);
  assert.equal(convertirRef('Gen.1.1-Tob.1.1'), null);
});

test('agrupa por libro, filtra por votos, ordena y recorta', () => {
  const tsv = [
    'From Verse\tTo Verse\tVotes\t#www.openbible.info CC-BY',
    'Gen.1.1\tPs.115.15\t82',
    'Gen.1.1\tProv.8.22-Prov.8.30\t76',
    'Gen.1.1\tJohn.1.1\t90',
    'Gen.1.1\tHeb.11.3\t2',
    'John.3.16\tRom.5.8\t50',
    'Gen.1.2\tTob.1.1\t99',
    '',
  ].join('\n');
  const r = agruparRefs(tsv, { minVotos: 3, maxPorVersiculo: 2 });
  assert.deepEqual([...r.keys()], ['GEN', 'JHN']);
  assert.deepEqual(r.get('GEN'), { 1: { 1: ['JHN.1.1', 'PSA.115.15'] } });
  assert.deepEqual(r.get('JHN'), { 3: { 16: ['ROM.5.8'] } });
});

// Un ZIP de una sola entrada, construido a mano.
function zipDe(nombre, contenido) {
  const datos = deflateRawSync(Buffer.from(contenido));
  const n = Buffer.from(nombre);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(datos.length, 18);
  local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(datos.length, 20);
  central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(0, 42);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(46 + n.length, 12);
  fin.writeUInt32LE(30 + n.length + datos.length, 16);
  return Buffer.concat([local, n, datos, central, n, fin]);
}

test('extrae la primera entrada de un ZIP', () => {
  assert.equal(extraerDeZip(zipDe('a.txt', 'hola mundo')).toString(), 'hola mundo');
});

test('rechaza lo que no es un ZIP', () => {
  assert.throws(() => extraerDeZip(Buffer.from('esto no es un zip, de verdad que no')), /No es un archivo ZIP/);
});
