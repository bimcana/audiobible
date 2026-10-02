// Cliente del motor de voz (el mismo servicio de Lyrio): texto → audio MP3 y
// los tiempos de cada palabra. Guarda en memoria los últimos clips.
const MAXIMO_EN_MEMORIA = 14;
export const TEXTO_MAXIMO = 4000;

export class ErrorDeRed extends Error {}

const limpiar = (url) => (url || '').trim().replace(/\/+$/, '');

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
      url: URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })),
      palabras: datos.words,
      // El MP3 es de tasa constante (48 kbps): la duración sale del tamaño.
      segundos: (bytes.length * 8) / 48000,
    };
  }

  return {
    cambiarUrl(nueva) { base = limpiar(nueva); },

    async voces() {
      const res = await fetch(`${base}/voices`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    clip({ texto, voz, velocidad }) {
      const clave = `${voz}|${velocidad}|${texto}`;
      if (clips.has(clave)) {
        const p = clips.get(clave);
        clips.delete(clave);
        clips.set(clave, p);              // lo más reciente, al final
        return p;
      }
      const p = pedir(texto, voz, velocidad);
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
  };
}
