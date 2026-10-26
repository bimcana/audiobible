// Versiones privadas: Biblias propias alojadas junto a la app, pero cifradas.
// Una sola clave las abre todas. Una vez abierta, cada una se guarda en el
// dispositivo como cualquier otra versión importada.
//
// La clave se recuerda en el propio dispositivo para que, si más adelante se
// aloja otra versión con la misma clave, llegue sola al abrir la app.
import { desempaquetar, fichaDe } from './importador.js';
import { validarImportada } from './validar.js';
import { guardarPropia, leerLibroPropio, listarPropias } from '../almacen/propias.js';

const PRIVADO = new URL('../../privado/', import.meta.url);
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RECORDADA = 'audiobible-llave';
// El libro de una versión ya abierta del que sale la llave de las nuevas
// (lo mismo que usa herramientas/cifrar-version.mjs).
const LIBRO_LLAVE = 'JHN';

const fallo = (codigo) => Object.assign(new Error(codigo), { codigo });

// «k7qf-2mxa…» → los 16 bytes de la clave, o null si no tiene la forma debida.
export function leerClave(texto) {
  const limpia = (texto ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  if (limpia.length !== 26) return null;
  let bits = '';
  for (const c of limpia) bits += ALFABETO.indexOf(c).toString(2).padStart(5, '0');
  return Uint8Array.from({ length: 16 }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2));
}

const aBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

function recordar(bytes) {
  try { localStorage.setItem(RECORDADA, aBase64(bytes)); } catch { /* sin almacenamiento: se pedirá otra vez */ }
}

function recordada() {
  try {
    const guardada = localStorage.getItem(RECORDADA);
    return guardada ? deBase64(guardada) : null;
  } catch {
    return null;
  }
}

async function pedir(nombre, como = 'json') {
  let r;
  try {
    r = await fetch(new URL(nombre, PRIVADO), { cache: 'no-cache' });
  } catch {
    throw fallo('red');
  }
  if (r.status === 404 && como === 'json') return null;
  if (!r.ok) throw fallo('red');
  return como === 'json' ? r.json() : new Uint8Array(await r.arrayBuffer());
}

// Descifra privado/<id>.bin y lo guarda. null si la clave no es la suya.
async function abrir(id, clave) {
  const datos = await pedir(`${id}.bin`, 'bytes');
  let claro;
  try {
    claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.subarray(3, 15) }, clave, datos.subarray(15));
  } catch {
    return null;
  }
  const paquete = await desempaquetar(new Blob([claro]));
  const informe = validarImportada(paquete.libros);
  const meta = fichaDe({
    id: `propia-${id}`,
    nombre: paquete.version.nombre ?? id.toUpperCase(),
    sigla: paquete.version.sigla ?? id.toUpperCase(),
    idioma: paquete.version.idioma ?? 'es',
  }, informe);
  try {
    await guardarPropia(meta, paquete.libros);
  } catch {
    throw fallo('guardar');
  }
  return meta;
}

const importar = (bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);

// Prueba la clave con todas las versiones privadas alojadas y guarda las que
// abre. Devuelve sus fichas. Lanza Error con .codigo: 'forma' (clave mal
// escrita), 'red', 'clave' (no abre ninguna) o 'guardar'.
export async function desbloquear(texto) {
  const bytes = leerClave(texto);
  if (!bytes) throw fallo('forma');
  const ids = await pedir('indice.json');
  if (!Array.isArray(ids)) throw fallo('red');
  const clave = await importar(bytes);
  const abiertas = [];
  for (const id of ids) {
    const meta = await abrir(id, clave);
    if (meta) abiertas.push(meta);
  }
  if (!abiertas.length) throw fallo('clave');
  recordar(bytes);
  return abiertas;
}

// Un dispositivo que abrió una versión antes de que se recordara la clave no
// la tiene guardada. La recupera de privado/llaves.json: ahí va la clave
// cifrada con la huella de un libro de esa versión, que solo puede calcular
// quien ya la tiene abierta.
async function llaveDesdeLaInstalada(instaladas) {
  const llaves = await pedir('llaves.json').catch(() => null);
  if (!llaves) return null;
  for (const [id, envuelta] of Object.entries(llaves)) {
    if (!instaladas.has(`propia-${id}`)) continue;
    const libro = await leerLibroPropio(`propia-${id}`, LIBRO_LLAVE).catch(() => null);
    if (!libro) continue;
    const huella = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(libro.caps)));
    try {
      const llave = await importar(new Uint8Array(huella).subarray(0, 16));
      const datos = deBase64(envuelta);
      const bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.subarray(0, 12) }, llave, datos.subarray(12)));
      recordar(bytes);
      return bytes;
    } catch { /* el libro guardado no es el mismo: se probará otra */ }
  }
  return null;
}

// Al abrir la app: si hay versiones privadas alojadas que este dispositivo aún
// no tiene y conoce la clave, las descarga. Devuelve las fichas añadidas. No
// lanza: sin red o sin clave, simplemente no añade nada.
export async function sincronizarPrivadas() {
  try {
    const ids = await pedir('indice.json');
    if (!Array.isArray(ids)) return [];
    const instaladas = new Set((await listarPropias()).map((v) => v.id));
    const faltan = ids.filter((id) => !instaladas.has(`propia-${id}`));
    if (!faltan.length) return [];
    const bytes = recordada() ?? await llaveDesdeLaInstalada(instaladas);
    if (!bytes) return [];
    const clave = await importar(bytes);
    const nuevas = [];
    for (const id of faltan) {
      const meta = await abrir(id, clave);
      if (meta) nuevas.push(meta);
    }
    return nuevas;
  } catch {
    return [];
  }
}
