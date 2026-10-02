// Audio guardado en el dispositivo: cada pasaje que se escucha o se descarga
// queda aquí, con los tiempos de sus palabras, para oírlo sin red y sin espera.
// Posible porque el texto bíblico no cambia.
import { transaccion } from './base.js';

// Huella corta de un texto (FNV-1a de 32 bits, dos pasadas) más su longitud.
export function huella(texto) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b + c, 0x85ebca6b) ^ (b >>> 13);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}${texto.length.toString(36)}`;
}

// Un mismo texto con una misma voz, a cualquier velocidad.
export const claveVozTexto = (voz, texto) => `${voz}|${huella(texto)}`;
export const claveAudio = (voz, velocidad, texto) => `${claveVozTexto(voz, texto)}|${velocidad}`;

const callado = async (obra, porDefecto) => {
  try { return await obra(); } catch { return porDefecto; }       // sin IndexedDB no hay caché
};

export function leerAudio(clave) {
  return callado(() => transaccion(['audio', 'audioFichas'], 'readonly', async (almacen, p) => {
    const [mp3, ficha] = await Promise.all([p(almacen('audio').get(clave)), p(almacen('audioFichas').get(clave))]);
    return mp3 && ficha ? { ...ficha, mp3 } : null;
  }), null);
}

// El mismo pasaje con la misma voz, grabado a otra velocidad.
export function leerAudioAlterno(voz, texto) {
  return callado(() => transaccion(['audio', 'audioFichas'], 'readonly', async (almacen, p) => {
    const ficha = await p(almacen('audioFichas').index('vozTexto').get(claveVozTexto(voz, texto)));
    if (!ficha) return null;
    const mp3 = await p(almacen('audio').get(ficha.clave));
    return mp3 ? { ...ficha, mp3 } : null;
  }), null);
}

// origen: {version, libro, cap} para poder listar y borrar por libro.
export function guardarAudio({ voz, velocidad, texto, mp3, palabras, segundos, origen }) {
  const clave = claveAudio(voz, velocidad, texto);
  const ficha = {
    clave,
    vozTexto: claveVozTexto(voz, texto),
    voz,
    velocidad,
    palabras,
    segundos,
    bytes: mp3.size,
    version: origen?.version ?? '',
    libro: origen ? `${origen.version}/${origen.libro}` : '',
    cap: origen?.cap ?? 0,
  };
  return callado(() => transaccion(['audio', 'audioFichas'], 'readwrite', (almacen) => {
    almacen('audio').put(mp3, clave);
    almacen('audioFichas').put(ficha);
  }));
}

// Los pasajes guardados de un libro: conjunto de claves voz+texto.
export function guardadosDeLibro(version, libro) {
  return callado(() => transaccion(['audioFichas'], 'readonly', async (almacen, p) => {
    const fichas = await p(almacen('audioFichas').index('libro').getAll(`${version}/${libro}`));
    return new Set(fichas.map((f) => f.vozTexto));
  }), new Set());
}

// Resumen de lo guardado: [{version, libro, bytes, clips, segundos}]
export function usoDeAudio() {
  return callado(() => transaccion(['audioFichas'], 'readonly', async (almacen, p) => {
    const fichas = await p(almacen('audioFichas').getAll());
    const grupos = new Map();
    for (const f of fichas) {
      const g = grupos.get(f.libro) ?? { version: f.version, libro: f.libro.split('/')[1] ?? '', bytes: 0, clips: 0, segundos: 0 };
      g.bytes += f.bytes;
      g.clips += 1;
      g.segundos += f.segundos;
      grupos.set(f.libro, g);
    }
    return [...grupos.values()];
  }), []);
}

// Borra el audio de un libro ("version/LIBRO"), de un capítulo, o todo.
export function borrarAudio({ libro = null, cap = null } = {}) {
  return callado(() => transaccion(['audio', 'audioFichas'], 'readwrite', async (almacen, p) => {
    if (libro === null) {
      almacen('audio').clear();
      almacen('audioFichas').clear();
      return;
    }
    const fichas = await p(almacen('audioFichas').index('libro').getAll(libro));
    for (const f of fichas) {
      if (cap !== null && f.cap !== cap) continue;
      almacen('audio').delete(f.clave);
      almacen('audioFichas').delete(f.clave);
    }
  }));
}
