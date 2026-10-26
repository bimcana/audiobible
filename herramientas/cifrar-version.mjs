// Cifra una versión propia para poder alojarla junto a la app sin que nadie
// más pueda leerla.
//
//   node herramientas/cifrar-version.mjs NVI.audiobible nvi
//   node herramientas/cifrar-version.mjs herramientas/.cache/rv1960.json rv1960 --clave-de nvi
//
// Acepta un .audiobible o el JSON de una conversión ({version, libros}).
// Escribe privado/<id>.bin (cifrado con AES-GCM de 128 bits) y añade el id a
// privado/indice.json.
//
// Sin --clave-de, genera una clave al azar y la guarda en NVI/clave-<id>.txt,
// carpeta que git ignora: NO debe subirse ni publicarse.
//
// Con --clave-de <otra>, usa la clave de esa otra versión: una sola clave abre
// las dos. Además escribe privado/llaves.json para que los dispositivos que ya
// abrieron <otra> reciban la nueva sin volver a escribir la clave (ver
// src/importar/privada.js, llaveDesdeLaInstalada).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CARPETA = path.join(RAIZ, 'privado');
// El libro de la versión ya instalada del que sale la llave de la nueva.
const LIBRO_LLAVE = 'JHN';

function base32(bytes) {
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let salida = '';
  for (let i = 0; i < bits.length; i += 5) salida += ALFABETO[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return salida;
}

function leerClave(id) {
  const archivo = path.join(RAIZ, 'NVI', `clave-${id}.txt`);
  const linea = fs.readFileSync(archivo, 'utf8').split('\n').find((l) => /^[A-Z2-7]{4}(-[A-Z2-7]{1,4})+$/.test(l.trim()));
  const limpia = linea.trim().replace(/-/g, '');
  let bits = '';
  for (const c of limpia) bits += ALFABETO.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(Array.from({ length: 16 }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2)));
}

function cifrar(claro, clave) {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-128-gcm', clave, iv);
  return { iv, cifrado: Buffer.concat([cifrador.update(claro), cifrador.final(), cifrador.getAuthTag()]) };
}

function descifrar(datos, clave) {
  const cuerpo = datos.subarray(15);
  const d = crypto.createDecipheriv('aes-128-gcm', clave, datos.subarray(3, 15));
  d.setAuthTag(cuerpo.subarray(cuerpo.length - 16));
  return Buffer.concat([d.update(cuerpo.subarray(0, cuerpo.length - 16)), d.final()]);
}

const args = process.argv.slice(2);
const opcion = args.indexOf('--clave-de');
const otra = opcion >= 0 ? args.splice(opcion, 2)[1] : null;
const [archivo, id] = args;
if (!archivo || !/^[a-z0-9]+$/.test(id ?? '') || (otra !== null && !/^[a-z0-9]+$/.test(otra))) {
  console.error('Uso: node herramientas/cifrar-version.mjs archivo.audiobible|archivo.json id [--clave-de otra]');
  process.exit(2);
}

// El .audiobible ya va comprimido; el JSON de una conversión se empaqueta igual.
let claro = fs.readFileSync(archivo);
if (archivo.endsWith('.json')) {
  const { version, libros } = JSON.parse(claro.toString('utf8'));
  claro = zlib.gzipSync(JSON.stringify({ formato: 'audiobible', v: 1, version, libros }));
}

const clave = otra ? leerClave(otra) : crypto.randomBytes(16);
const { iv, cifrado } = cifrar(claro, clave);
fs.mkdirSync(CARPETA, { recursive: true });
fs.writeFileSync(path.join(CARPETA, `${id}.bin`), Buffer.concat([Buffer.from('AB1'), iv, cifrado]));

const indicePath = path.join(CARPETA, 'indice.json');
const indice = fs.existsSync(indicePath) ? JSON.parse(fs.readFileSync(indicePath, 'utf8')) : [];
if (!indice.includes(id)) indice.push(id);
fs.writeFileSync(indicePath, JSON.stringify(indice));
console.log(`privado/${id}.bin: ${(cifrado.length / 1e6).toFixed(2)} MB cifrados`);

if (otra) {
  // La clave común, cifrada con una llave que solo puede calcular quien ya
  // tiene <otra> abierta: la huella de uno de sus libros tal como se guardó.
  const paquete = JSON.parse(zlib.gunzipSync(descifrar(fs.readFileSync(path.join(CARPETA, `${otra}.bin`)), clave)).toString('utf8'));
  const libro = paquete.libros.find((l) => l.id === LIBRO_LLAVE);
  const llave = crypto.createHash('sha256').update(JSON.stringify(libro.caps)).digest().subarray(0, 16);
  const envuelta = cifrar(clave, llave);
  const llavesPath = path.join(CARPETA, 'llaves.json');
  const llaves = fs.existsSync(llavesPath) ? JSON.parse(fs.readFileSync(llavesPath, 'utf8')) : {};
  llaves[otra] = Buffer.concat([envuelta.iv, envuelta.cifrado]).toString('base64');
  fs.writeFileSync(llavesPath, JSON.stringify(llaves));
  console.log(`misma clave que «${otra}»; privado/llaves.json actualizado`);
} else {
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
  console.log(`clave guardada en ${path.relative(RAIZ, destino)} (no se muestra aquí)`);
}
