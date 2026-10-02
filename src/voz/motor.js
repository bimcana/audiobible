// Cliente del motor de voz (el mismo servicio de Lyrio): texto → audio MP3 y
// los tiempos de cada palabra. Busca primero en la memoria, luego en lo
// guardado en el dispositivo, y solo entonces pide a la red.
import { claveAudio, leerAudio, leerAudioAlterno, guardarAudio } from '../almacen/audio.js';

const MAXIMO_EN_MEMORIA = 14;
export const TEXTO_MAXIMO = 4000;

export class ErrorDeRed extends Error {}

const limpiar = (url) => (url || '').trim().replace(/\/+$/, '');

const clipDe = (registro) => ({
  url: URL.createObjectURL(registro.mp3),
  palabras: registro.palabras,
  segundos: registro.segundos,
  velocidad: registro.velocidad,        // la del audio, que puede no ser la pedida
});

export function crearMotor({ url }) {
  let base = limpiar(url);
  const clips = new Map();            // "voz|velocidad|texto" → Promise<clip>

  async function pedir(texto, voz, velocidad) {
    let res;
    try {
      res = await fetch(`${base}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto, voice: voz, speed: velocidad }),
      });
    } catch {
      throw new ErrorDeRed('sin-red');
    }
    if (!res.ok) {
      let detalle = `HTTP ${res.status}`;
      try { detalle = (await res.json()).detail || detalle; } catch { /* sin cuerpo */ }
      throw new Error(detalle);
    }
    const datos = await res.json();
    const bytes = Uint8Array.from(atob(datos.audio), (c) => c.charCodeAt(0));
    return {
      mp3: new Blob([bytes], { type: 'audio/mpeg' }),
      palabras: datos.words,
      // El MP3 es de tasa constante (48 kbps): la duración sale del tamaño.
      segundos: (bytes.length * 8) / 48000,
      velocidad,
    };
  }

  // origen: {version, libro, cap}. Si se da, el audio se guarda en el dispositivo.
  // objetivo: velocidad total a la que va a sonar; sirve para decidir si un
  // audio guardado a otra velocidad se puede aprovechar sin que suene forzado.
  async function obtener({ texto, voz, velocidad, objetivo = velocidad, origen }) {
    if (origen) {
      const exacto = await leerAudio(claveAudio(voz, velocidad, texto));
      if (exacto) return clipDe(exacto);
      const otro = await leerAudioAlterno(voz, texto);
      const estirado = otro ? objetivo / otro.velocidad : 0;
      if (estirado >= 0.6 && estirado <= 1.7) return clipDe(otro);
    }
    try {
      const nuevo = await pedir(texto, voz, velocidad);
      if (origen) guardarAudio({ voz, velocidad, texto, origen, ...nuevo });
      return clipDe(nuevo);
    } catch (err) {
      // Sin red: sirve el mismo pasaje grabado a otra velocidad, si lo hay.
      const alterno = err instanceof ErrorDeRed && origen ? await leerAudioAlterno(voz, texto) : null;
      if (alterno) return clipDe(alterno);
      throw err;
    }
  }

  return {
    cambiarUrl(nueva) { base = limpiar(nueva); },

    async voces() {
      const res = await fetch(`${base}/voices`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    clip(pedido) {
      const clave = `${pedido.voz}|${pedido.velocidad}|${pedido.texto}`;
      if (clips.has(clave)) {
        const p = clips.get(clave);
        clips.delete(clave);
        clips.set(clave, p);              // lo más reciente, al final
        return p;
      }
      const p = obtener(pedido);
      p.catch(() => clips.delete(clave));
      clips.set(clave, p);
      while (clips.size > MAXIMO_EN_MEMORIA) {
        const vieja = clips.keys().next().value;
        const q = clips.get(vieja);
        clips.delete(vieja);
        q.then((c) => URL.revokeObjectURL(c.url)).catch(() => {});
      }
      return p;
    },

    // Para las descargas: trae y guarda sin dejar nada en memoria.
    // Devuelve false si ya estaba guardado.
    async guardar({ texto, voz, velocidad, origen }) {
      if (await leerAudioAlterno(voz, texto)) return false;
      const nuevo = await pedir(texto, voz, velocidad);
      await guardarAudio({ voz, velocidad, texto, origen, ...nuevo });
      return true;
    },
  };
}
