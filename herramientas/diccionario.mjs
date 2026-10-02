// Prepara el diccionario bíblico de la app a partir del de Easton (1897,
// dominio público), tal como lo ofrece el conjunto de datos de NEUU (CC BY 4.0).
//
//   node herramientas/diccionario.mjs
//
// Escribe data/diccionario/en/{letra}.json: {"shepherd": {"n": "Shepherd", "x": "…"}}
// Solo existe en inglés: no se encontró un diccionario libre en español.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(RAIZ, 'herramientas', '.cache', 'easton');
const DESTINO = path.join(RAIZ, 'data', 'diccionario', 'en');
const FUENTE = 'https://raw.githubusercontent.com/neuu-org/bible-dictionary-dataset/main/data/02_sources/easton';

// La clave de búsqueda: minúsculas, sin tildes ni signos.
const clave = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

fs.mkdirSync(CACHE, { recursive: true });
fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });

let entradas = 0;
let bytes = 0;
for (const letra of 'abcdefghijklmnopqrstuvwxyz') {
  const local = path.join(CACHE, `${letra}.json`);
  if (!fs.existsSync(local)) {
    const r = await fetch(`${FUENTE}/${letra}.json`);
    if (r.status === 404) continue;                       // no hay entradas con esa letra
    if (!r.ok) throw new Error(`${letra}: HTTP ${r.status}`);
    fs.writeFileSync(local, await r.text());
  }
  const salida = {};
  for (const e of Object.values(JSON.parse(fs.readFileSync(local, 'utf8')))) {
    const texto = (e.definitions ?? []).map((d) => d.text.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
    const k = clave(e.name ?? '');
    if (!k || !texto) continue;
    if (salida[k]) salida[k].x += `\n\n${texto}`; else salida[k] = { n: e.name, x: texto };
    entradas++;
  }
  const archivo = path.join(DESTINO, `${letra}.json`);
  fs.writeFileSync(archivo, JSON.stringify(salida));
  bytes += fs.statSync(archivo).size;
}
console.log(`✔ Diccionario de Easton: ${entradas} entradas, ${(bytes / 1e6).toFixed(2)} MB`);
if (entradas < 3500) process.exit(1);
