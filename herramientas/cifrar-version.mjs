// Cifra una versión propia (.audiobible) para poder alojarla junto a la app
// sin que nadie más pueda leerla.
//
//   node herramientas/cifrar-version.mjs NVI.audiobible nvi
//
// Escribe privado/<id>.bin (cifrado con AES-GCM de 128 bits y una clave al
// azar) y añade el id a privado/indice.json. La clave se guarda en
// NVI/clave-<id>.txt, carpeta que git ignora: NO debe subirse ni publicarse.
// Quien tenga la clave puede leer la versión; quien no, solo ve ruido.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(bytes) {
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let salida = '';
  for (let i = 0; i < bits.length; i += 5) salida += ALFABETO[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return salida;
}

const [archivo, id] = process.argv.slice(2);
if (!archivo || !/^[a-z0-9]+$/.test(id ?? '')) {
  console.error('Uso: node herramientas/cifrar-version.mjs archivo.audiobible id');
  process.exit(2);
}

const claro = fs.readFileSync(archivo);
const clave = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const cifrador = crypto.createCipheriv('aes-128-gcm', clave, iv);
const cifrado = Buffer.concat([cifrador.update(claro), cifrador.final(), cifrador.getAuthTag()]);

const carpeta = path.join(RAIZ, 'privado');
fs.mkdirSync(carpeta, { recursive: true });
fs.writeFileSync(path.join(carpeta, `${id}.bin`), Buffer.concat([Buffer.from('AB1'), iv, cifrado]));

const indicePath = path.join(carpeta, 'indice.json');
const indice = fs.existsSync(indicePath) ? JSON.parse(fs.readFileSync(indicePath, 'utf8')) : [];
if (!indice.includes(id)) indice.push(id);
fs.writeFileSync(indicePath, JSON.stringify(indice));

const legible = base32(clave).match(/.{1,4}/g).join('-');
const destino = path.join(RAIZ, 'NVI', `clave-${id}.txt`);
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, [
  `Clave de la versión privada «${id}» de AudioBible`,
  '',
  legible,
  '',
  'Escríbela en Ajustes > Versión privada, una vez en cada dispositivo.',
  'No importan las mayúsculas ni los guiones.',
  'No la compartas ni la subas a ningún sitio: quien la tenga puede leer la versión.',
  '',
].join('\n'));

console.log(`privado/${id}.bin: ${(cifrado.length / 1e6).toFixed(2)} MB cifrados`);
console.log(`clave guardada en ${path.relative(RAIZ, destino)} (no se muestra aquí)`);
