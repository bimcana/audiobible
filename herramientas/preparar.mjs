// Descarga, convierte, valida y escribe los datos de la app en data/.
//
//   node herramientas/preparar.mjs            todo
//   node herramientas/preparar.mjs --solo kjv una versión
//   node herramientas/preparar.mjs --refs     solo las referencias cruzadas
//
// Una versión con errores de validación no se escribe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBROS, esNT } from '../src/referencia/canon.js';
import { convertirLibro } from './convertir.mjs';
import { validarVersion } from './validar.mjs';
import { agruparRefs } from './refs.mjs';
import { extraerDeZip } from './zip.mjs';
import { VERSIONES, REFS } from './fuentes.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(RAIZ, 'herramientas', '.cache');
const DATA = path.join(RAIZ, 'data');

async function descargar(url, nombre) {
  const destino = path.join(CACHE, nombre);
  if (!fs.existsSync(destino)) {
    process.stdout.write(`  descargando ${url}\n`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(destino);
}

function escribirJson(archivo, valor) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(valor));
}

async function prepararVersion(v) {
  const fuente = JSON.parse(await descargar(v.fuente, `${v.helloao}.json`));
  let omitidos = 0;
  const libros = fuente.books.map((b) => {
    const r = convertirLibro(b, { jesus: esNT(b.id) });
    omitidos += r.vacios;
    return r.libro;
  });

  const { errores, cifras } = validarVersion(fuente, libros);
  if (errores.length) {
    console.error(`✖ ${v.sigla}: ${errores.length} errores`);
    errores.slice(0, 20).forEach((e) => console.error(`    ${e}`));
    return null;
  }

  const carpeta = path.join(DATA, v.id);
  fs.rmSync(carpeta, { recursive: true, force: true });
  let bytes = 0;
  for (const lib of libros) {
    escribirJson(path.join(carpeta, `${lib.id}.json`), lib);
    bytes += fs.statSync(path.join(carpeta, `${lib.id}.json`)).size;
  }
  console.log(`✔ ${v.sigla.padEnd(7)} ${cifras.versiculos} versículos, ${omitidos} omitidos, ${(bytes / 1e6).toFixed(2)} MB`);

  const { helloao, ...publico } = v;
  return {
    ...publico,
    versiculos: cifras.versiculos,
    rasgos: {
      titulos: cifras.titulos > 0, jesus: cifras.jesus > 0, poesia: cifras.lineas > 0, parrafos: cifras.parrafos > 0,
    },
  };
}

async function prepararRefs() {
  const tsv = extraerDeZip(await descargar(REFS.url, 'cross-references.zip')).toString('utf8');
  const porLibro = agruparRefs(tsv, REFS);
  const carpeta = path.join(DATA, 'refs');
  fs.rmSync(carpeta, { recursive: true, force: true });
  let total = 0;
  let bytes = 0;
  for (const { id } of LIBROS) {
    const caps = porLibro.get(id) ?? {};
    for (const vers of Object.values(caps)) for (const lista of Object.values(vers)) total += lista.length;
    escribirJson(path.join(carpeta, `${id}.json`), caps);
    bytes += fs.statSync(path.join(carpeta, `${id}.json`)).size;
  }
  console.log(`✔ Referencias: ${total} en ${LIBROS.length} libros, ${(bytes / 1e6).toFixed(2)} MB`);
}

const args = process.argv.slice(2);
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
const soloRefs = args.includes('--refs');
let fallos = 0;

if (!soloRefs) {
  const catalogoPath = path.join(DATA, 'versiones.json');
  const previo = fs.existsSync(catalogoPath) ? JSON.parse(fs.readFileSync(catalogoPath, 'utf8')) : [];
  const catalogo = [];
  for (const v of VERSIONES) {
    if (solo && v.id !== solo) {
      const anterior = previo.find((p) => p.id === v.id);
      if (anterior) catalogo.push(anterior);
      continue;
    }
    const entrada = await prepararVersion(v);
    if (entrada) catalogo.push(entrada);
    else fallos++;
  }
  escribirJson(catalogoPath, catalogo);
}
if (!solo) await prepararRefs();

process.exit(fallos ? 1 : 0);
