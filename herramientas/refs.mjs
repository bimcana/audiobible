// Convierte las referencias cruzadas de OpenBible.info (ids OSIS) a un mapa
// por libro con ids USFM. Funciones puras.
import { libro } from '../src/referencia/canon.js';

const OSIS = {
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Num: 'NUM', Deut: 'DEU', Josh: 'JOS', Judg: 'JDG', Ruth: 'RUT',
  '1Sam': '1SA', '2Sam': '2SA', '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH', Ezra: 'EZR',
  Neh: 'NEH', Esth: 'EST', Job: 'JOB', Ps: 'PSA', Prov: 'PRO', Eccl: 'ECC', Song: 'SNG', Isa: 'ISA',
  Jer: 'JER', Lam: 'LAM', Ezek: 'EZK', Dan: 'DAN', Hos: 'HOS', Joel: 'JOL', Amos: 'AMO', Obad: 'OBA',
  Jonah: 'JON', Mic: 'MIC', Nah: 'NAM', Hab: 'HAB', Zeph: 'ZEP', Hag: 'HAG', Zech: 'ZEC', Mal: 'MAL',
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM', '1Cor': '1CO',
  '2Cor': '2CO', Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL', '1Thess': '1TH', '2Thess': '2TH',
  '1Tim': '1TI', '2Tim': '2TI', Titus: 'TIT', Phlm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE',
  '2Pet': '2PE', '1John': '1JN', '2John': '2JN', '3John': '3JN', Jude: 'JUD', Rev: 'REV',
};

// "Prov.8.22" → {id:'PRO', cap:8, vers:22}; null si no es del canon.
function leerPunto(punto) {
  const [osis, cap, vers] = punto.split('.');
  const id = OSIS[osis];
  const c = Number(cap);
  const v = Number(vers);
  if (!id || !Number.isInteger(c) || !Number.isInteger(v) || c < 1 || v < 1) return null;
  if (c > libro(id).caps) return null;
  return { id, cap: c, vers: v };
}

const escribir = (p) => `${p.id}.${p.cap}.${p.vers}`;

// "Prov.8.22-Prov.8.30" → "PRO.8.22-PRO.8.30"
export function convertirRef(ref) {
  const puntos = ref.split('-').map(leerPunto);
  if (puntos.length > 2 || puntos.includes(null)) return null;
  return puntos.map(escribir).join('-');
}

export function agruparRefs(tsv, { minVotos, maxPorVersiculo }) {
  const porVersiculo = new Map();          // "GEN.1.1" → [{destino, votos}]
  for (const linea of tsv.split('\n')) {
    const [desde, hasta, votos] = linea.trim().split('\t');
    const origen = desde && !desde.includes('-') ? leerPunto(desde) : null;
    const destino = hasta ? convertirRef(hasta) : null;
    const n = Number(votos);
    if (!origen || !destino || !Number.isFinite(n) || n < minVotos) continue;
    const clave = escribir(origen);
    if (!porVersiculo.has(clave)) porVersiculo.set(clave, []);
    porVersiculo.get(clave).push({ destino, votos: n });
  }

  const porLibro = new Map();
  for (const [clave, lista] of porVersiculo) {
    const [id, cap, vers] = clave.split('.');
    lista.sort((a, b) => b.votos - a.votos);
    if (!porLibro.has(id)) porLibro.set(id, {});
    const caps = porLibro.get(id);
    (caps[cap] ??= {})[vers] = lista.slice(0, maxPorVersiculo).map((r) => r.destino);
  }
  return porLibro;
}
