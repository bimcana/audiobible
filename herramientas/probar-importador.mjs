// Prueba el importador contra PDF reales, fuera del navegador.
//
//   node herramientas/probar-importador.mjs NVI/*.pdf
//
// Los PDF son del usuario y no están en el repositorio: esta prueba solo se
// puede ejecutar en la máquina que los tiene. No escribe nada.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { crearLector } from '../src/importar/perfil.js';
import { abrirPdf } from '../src/importar/pdf.js';
import { validarImportada } from '../src/importar/validar.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfjs = await import(pathToFileURL(path.join(RAIZ, 'vendor/pdfjs/pdf.min.mjs')).href);
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(RAIZ, 'vendor/pdfjs/pdf.worker.min.mjs')).href;

const archivos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const muestras = process.argv.includes('--muestras');
if (!archivos.length) { console.error('Uso: node herramientas/probar-importador.mjs archivo.pdf …'); process.exit(2); }

const lector = crearLector({ idioma: 'es' });
const inicio = Date.now();
for (const archivo of archivos) {
  const pdf = await abrirPdf(pdfjs, new Uint8Array(fs.readFileSync(archivo)));
  for (let n = 1; n <= pdf.paginas; n++) {
    const { trozos, estilo } = await pdf.pagina(n);
    lector.pagina(trozos, estilo);
  }
  await pdf.cerrar();
  console.log(`leído ${path.basename(archivo)} (${pdf.paginas} páginas)`);
}

const { libros, incidencias, hayRojo } = lector.terminar();
const { errores, avisos, faltan, cifras } = validarImportada(libros);
console.log(`\n${((Date.now() - inicio) / 1000).toFixed(1)} s · ${JSON.stringify(cifras)} · palabras en rojo: ${hayRojo}`);
console.log(`faltan ${faltan.length} libros: ${faltan.join(' ')}`);
console.log(`\nincidencias (${incidencias.length}):`); incidencias.slice(0, 25).forEach((x) => console.log('  ', x));
console.log(`\nerrores (${errores.length}):`); errores.slice(0, 25).forEach((x) => console.log('  ', x));
console.log(`\navisos (${avisos.length}):`); avisos.slice(0, 25).forEach((x) => console.log('  ', x));

if (muestras) {
  const ver = (id, cap, desde, hasta) => {
    const l = libros.find((x) => x.id === id);
    if (!l) return;
    console.log(`\n=== ${id} ${cap} ===`);
    for (const e of l.caps[cap - 1].slice(desde, hasta)) console.log(JSON.stringify(e).slice(0, 400));
  };
  const pedidas = process.argv.filter((a) => a.startsWith('--ver=')).map((a) => a.slice(6).split('.'));
  for (const [id, cap, desde = 0, hasta] of pedidas) ver(id, Number(cap), Number(desde), hasta === undefined ? undefined : Number(hasta));
  if (!pedidas.length) { ver('MAT', 1, 0, 8); ver('JHN', 3, 0, 9); ver('PSA', 23, 0, 10); ver('GEN', 1, 0, 6); ver('REV', 22, -3); }
}
process.exit(errores.length ? 1 : 0);
