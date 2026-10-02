// Lee los archivos que el lector entrega y devuelve una Biblia lista para
// guardar. Todo ocurre en el dispositivo: ningún archivo sale de él.
import { crearLector } from './perfil.js';
import { abrirPdf } from './pdf.js';
import { validarImportada } from './validar.js';
import { LIBROS } from '../referencia/canon.js';

let pdfjsCargado = null;

// pdf.js pesa 1,7 MB: solo se carga cuando alguien importa un PDF.
function cargarPdfjs() {
  pdfjsCargado ??= import('../../vendor/pdfjs/pdf.min.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    return pdfjs;
  });
  return pdfjsCargado;
}

const esTraspaso = (archivo) => /\.audiobible$/i.test(archivo.name);

// --- archivo de traspaso: una versión ya convertida, comprimida ---

export async function empaquetar(meta, libros) {
  const json = JSON.stringify({ formato: 'audiobible', v: 1, version: meta, libros });
  const flujo = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Blob([await new Response(flujo).arrayBuffer()], { type: 'application/octet-stream' });
}

async function desempaquetar(archivo) {
  const flujo = archivo.stream().pipeThrough(new DecompressionStream('gzip'));
  const datos = JSON.parse(await new Response(flujo).text());
  if (datos?.formato !== 'audiobible' || !Array.isArray(datos.libros)) throw new Error('formato');
  const validos = new Set(LIBROS.map((l) => l.id));
  const libros = datos.libros.filter((l) => validos.has(l?.id) && Array.isArray(l.caps));
  return { version: datos.version ?? {}, libros };
}

// --- importación ---

// alAvanzar({archivo, indice, total, pagina, paginas})
// Devuelve {libros, informe, sugerencia} o lanza Error con .codigo.
export async function importarArchivos(archivos, { alAvanzar = () => {} } = {}) {
  const lista = [...archivos];
  const fallo = (codigo) => Object.assign(new Error(codigo), { codigo });
  if (!lista.length) throw fallo('vacio');

  if (lista.some(esTraspaso)) {
    if (lista.length > 1) throw fallo('mezcla');
    let paquete;
    try { paquete = await desempaquetar(lista[0]); } catch { throw fallo('traspaso'); }
    return { libros: paquete.libros, informe: validarImportada(paquete.libros), sugerencia: paquete.version, incidencias: [] };
  }

  if (!lista.every((a) => /\.pdf$/i.test(a.name) || a.type === 'application/pdf')) throw fallo('tipo');

  const pdfjs = await cargarPdfjs();
  const lector = crearLector({ idioma: 'es' });
  for (const [indice, archivo] of lista.entries()) {
    let pdf;
    try {
      pdf = await abrirPdf(pdfjs, new Uint8Array(await archivo.arrayBuffer()));
    } catch {
      throw fallo('pdf');
    }
    for (let n = 1; n <= pdf.paginas; n++) {
      const { trozos, estilo } = await pdf.pagina(n);
      lector.pagina(trozos, estilo);
      if (n % 8 === 0 || n === pdf.paginas) {
        alAvanzar({ archivo: archivo.name, indice, total: lista.length, pagina: n, paginas: pdf.paginas });
        await new Promise((r) => setTimeout(r));           // deja respirar a la pantalla
      }
    }
    await pdf.cerrar();
  }

  const { libros, incidencias } = lector.terminar();
  // Un libro del que no se leyó ningún capítulo no se guarda.
  const utiles = libros.filter((l) => l.caps.some((c) => c.length));
  return { libros: utiles, informe: validarImportada(utiles), sugerencia: {}, incidencias };
}

// Datos de catálogo de una versión importada.
export function fichaDe({ id, nombre, sigla, idioma }, informe, existente = null) {
  const c = informe.cifras;
  return {
    id,
    sigla: sigla.trim().toUpperCase().slice(0, 8) || 'MÍA',
    nombre: nombre.trim() || 'Mi Biblia',
    idioma: idioma === 'en' ? 'en' : 'es',
    propia: true,
    creada: existente?.creada ?? new Date().toISOString(),
    versiculos: c.versiculos,
    libros: c.libros,
    rasgos: { titulos: c.titulos > 0, jesus: c.jesus > 0, poesia: c.lineas > 0, parrafos: c.parrafos > 0 },
  };
}
