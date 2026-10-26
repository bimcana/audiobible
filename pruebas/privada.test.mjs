import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { leerClave } from '../src/importar/privada.js';

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) {
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let salida = '';
  for (let i = 0; i < bits.length; i += 5) salida += ALFABETO[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return salida;
}

test('leerClave recupera los 16 bytes, con guiones, espacios o minúsculas', () => {
  const clave = crypto.randomBytes(16);
  const texto = base32(clave).match(/.{1,4}/g).join('-');
  assert.equal(texto.replace(/-/g, '').length, 26);
  assert.deepEqual([...leerClave(texto)], [...clave]);
  assert.deepEqual([...leerClave(` ${texto.toLowerCase().replace(/-/g, ' ')} `)], [...clave]);
});

test('leerClave rechaza lo que no tiene la forma de una clave', () => {
  assert.equal(leerClave(''), null);
  assert.equal(leerClave('ABCD-EFGH'), null);
  assert.equal(leerClave(null), null);
  assert.equal(leerClave('A'.repeat(27)), null);
});

test('lo que cifra la herramienta lo abre el navegador con la misma clave, y solo con ella', async () => {
  const claro = Buffer.from('contenido de la versión privada');
  const clave = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-128-gcm', clave, iv);
  const archivo = Buffer.concat([Buffer.from('AB1'), iv, c.update(claro), c.final(), c.getAuthTag()]);

  const abrir = async (bytes) => {
    const k = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: archivo.subarray(3, 15) }, k, archivo.subarray(15));
  };
  const texto = base32(clave).match(/.{1,4}/g).join('-');
  assert.equal(Buffer.from(await abrir(leerClave(texto))).toString(), claro.toString());
  await assert.rejects(abrir(crypto.randomBytes(16)));
});

test('lo alojado en privado/ va cifrado y el índice cuadra con los archivos', () => {
  const indice = JSON.parse(fs.readFileSync('privado/indice.json', 'utf8'));
  assert.ok(indice.includes('nvi') && indice.includes('rv1960'));
  for (const id of indice) {
    const datos = fs.readFileSync(`privado/${id}.bin`);
    assert.equal(datos.subarray(0, 3).toString(), 'AB1');
    // Ni rastro de texto legible: un gzip o un JSON sin cifrar empezarían así.
    assert.ok(!datos.subarray(15).toString('latin1').includes('audiobible'));
  }
  const llaves = JSON.parse(fs.readFileSync('privado/llaves.json', 'utf8'));
  for (const [id, envuelta] of Object.entries(llaves)) {
    assert.ok(indice.includes(id));
    assert.equal(Buffer.from(envuelta, 'base64').length, 12 + 16 + 16);   // iv + clave + etiqueta
  }
});
