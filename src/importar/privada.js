// Versiones privadas: una Biblia propia alojada junto a la app, pero cifrada.
// Solo quien escribe su clave puede abrirla; una vez abierta se guarda en el
// dispositivo como cualquier otra versión importada y la clave ya no hace falta.
import { desempaquetar, fichaDe } from './importador.js';
import { validarImportada } from './validar.js';
import { guardarPropia } from '../almacen/propias.js';

const PRIVADO = new URL('../../privado/', import.meta.url);
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const fallo = (codigo) => Object.assign(new Error(codigo), { codigo });

// «k7qf-2mxa…» → los 16 bytes de la clave, o null si no tiene la forma debida.
export function leerClave(texto) {
  const limpia = (texto ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  if (limpia.length !== 26) return null;
  let bits = '';
  for (const c of limpia) bits += ALFABETO.indexOf(c).toString(2).padStart(5, '0');
  return Uint8Array.from({ length: 16 }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2));
}

// Prueba la clave con cada versión privada alojada. Devuelve la ficha de la
// que abre, ya guardada en el dispositivo. Lanza Error con .codigo:
// 'forma' (clave mal escrita), 'red', 'clave' (no abre ninguna) o 'guardar'.
export async function desbloquear(texto) {
  const bytes = leerClave(texto);
  if (!bytes) throw fallo('forma');

  let ids;
  try {
    const r = await fetch(new URL('indice.json', PRIVADO));
    if (!r.ok) throw new Error();
    ids = await r.json();
  } catch {
    throw fallo('red');
  }

  const clave = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
  for (const id of ids) {
    let datos;
    try {
      const r = await fetch(new URL(`${id}.bin`, PRIVADO));
      if (!r.ok) throw new Error();
      datos = new Uint8Array(await r.arrayBuffer());
    } catch {
      throw fallo('red');
    }

    let claro;
    try {
      claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: datos.subarray(3, 15) }, clave, datos.subarray(15));
    } catch {
      continue;                                   // esta clave no es de esta versión
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
  throw fallo('clave');
}
