// Fondos generados con la API de Google (Gemini), opcional y con la clave del
// propio lector. La IA solo pinta el fondo: el texto del versículo lo escribe
// siempre la app, para que la Escritura salga exacta y bien compuesta.
//
// Los modelos no están escritos aquí: se piden a Google cada vez, así los
// nuevos aparecen solos.
const API = 'https://generativelanguage.googleapis.com/v1beta';

export class ErrorDeIA extends Error {
  constructor(codigo, detalle = '') { super(detalle || codigo); this.codigo = codigo; }
}

/* ---------- qué modelos ofrecer ---------- */

// «models/gemini-3.1-flash-image» → {version: 3.1, nivel: 2, …}
function ficha(modelo) {
  const id = (modelo.name ?? '').replace(/^models\//, '');
  const m = /(\d+(?:\.\d+)?)/.exec(id);
  const nivel = /ultra/.test(id) ? 4 : /pro/.test(id) ? 3 : /lite/.test(id) ? 1 : 2;
  return {
    id,
    nombre: modelo.displayName || id,
    descripcion: modelo.description ?? '',
    metodos: modelo.supportedGenerationMethods ?? [],
    version: m ? Number(m[1]) : 0,
    nivel,
    provisional: /preview|exp/.test(id),
  };
}

// De la lista completa de Google, los modelos que crean imágenes: los tres
// más recientes y capaces. Primero la generación más nueva; dentro de ella,
// el más capaz; ante empate, el estable antes que el provisional.
export function elegirModelos(lista, cuantos = 3) {
  const fichas = (lista ?? []).map(ficha)
    .filter((f) => /image/.test(f.id) && !/embedding|imagen-3|vision/.test(f.id));
  // Si existe la versión estable de un modelo, su provisional sobra.
  const estables = new Set(fichas.filter((f) => !f.provisional).map((f) => f.id));
  const utiles = fichas.filter((f) => !f.provisional || !estables.has(f.id.replace(/-(preview|exp)[\w.-]*$/, '')));
  utiles.sort((a, b) => b.version - a.version || b.nivel - a.nivel || Number(a.provisional) - Number(b.provisional) || a.id.localeCompare(b.id));
  return utiles.slice(0, cuantos);
}

export async function listarModelos(clave) {
  let res;
  try {
    res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': clave } });
  } catch {
    throw new ErrorDeIA('red');
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new ErrorDeIA('clave');
  if (!res.ok) throw new ErrorDeIA('servicio', `HTTP ${res.status}`);
  return elegirModelos((await res.json()).models);
}

/* ---------- qué pedirle ---------- */

const ESTILOS = {
  foto: 'a natural, realistic photograph with soft light and shallow depth of field',
  oleo: 'a classical oil painting with visible brushwork and warm, muted colours',
  acuarela: 'a delicate watercolour painting on textured paper, with soft washes',
  minimal: 'a minimal flat illustration with simple shapes and a restrained palette',
};
export const ESTILOS_IA = Object.keys(ESTILOS);

const ZONA = {
  arriba: 'the upper third',
  centro: 'the central area',
  abajo: 'the lower third',
};
export const PROPORCION = { cuadrado: '1:1', vertical: '4:5', historia: '9:16' };

// La petición describe el fondo y deja sitio para el texto que pondrá la app.
export function instruccion({ texto, estilo = 'foto', posicion = 'centro', formato = 'vertical' }) {
  return [
    `Create a background image inspired by this Bible verse: "${texto.replace(/\s+/g, ' ').trim()}"`,
    `Depict the scene, landscape or imagery the verse evokes, in a reverent and contemplative mood, as ${ESTILOS[estilo] ?? ESTILOS.foto}.`,
    `Composition: ${PROPORCION[formato] ?? '4:5'} aspect ratio. Keep ${ZONA[posicion] ?? ZONA.centro} calm, uncluttered and evenly toned, because text will be overlaid there afterwards.`,
    'Strict rules: no text, no letters, no numbers, no captions, no logos, no watermarks, no borders or frames. Do not depict God or the face of Jesus; if people appear, show them small, from behind or in silhouette.',
  ].join('\n');
}

/* ---------- pedirla y leer la respuesta ---------- */

// Busca la primera imagen en la respuesta, tenga la forma que tenga: Google
// ha cambiado el formato entre versiones de su API.
export function extraerImagen(respuesta) {
  const vistos = new Set();
  const buscar = (nodo) => {
    if (!nodo || typeof nodo !== 'object' || vistos.has(nodo)) return null;
    vistos.add(nodo);
    const tipo = nodo.mimeType ?? nodo.mime_type;
    const datos = nodo.data ?? nodo.bytesBase64Encoded;
    if (typeof datos === 'string' && datos.length > 200 && (!tipo || String(tipo).startsWith('image/'))) {
      return `data:${tipo || 'image/png'};base64,${datos}`;
    }
    for (const hijo of Array.isArray(nodo) ? nodo : Object.values(nodo)) {
      const hallada = buscar(hijo);
      if (hallada) return hallada;
    }
    return null;
  };
  return buscar(respuesta);
}

// Las dos formas de pedir una imagen que tiene la API. Se prueba primero la
// que el modelo declara y, si falla por la forma de la petición, la otra.
function peticiones(modelo, prompt, proporcion) {
  const clasica = {
    url: `${API}/models/${modelo.id}:generateContent`,
    cuerpo: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: proporcion } },
    },
  };
  const nueva = {
    url: `${API}/interactions`,
    cuerpo: {
      model: modelo.id,
      input: [{ type: 'text', text: prompt }],
      response_format: { type: 'image', aspect_ratio: proporcion },
    },
  };
  return (modelo.metodos ?? []).includes('generateContent') ? [clasica, nueva] : [nueva, clasica];
}

// Devuelve la imagen como «data:image/…;base64,…».
export async function generarFondo({ clave, modelo, prompt, proporcion }) {
  let ultimo = null;
  for (const { url, cuerpo } of peticiones(modelo, prompt, proporcion)) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(cuerpo),
      });
    } catch {
      throw new ErrorDeIA('red');
    }
    let datos = null;
    try { datos = await res.json(); } catch { /* respuesta sin cuerpo */ }
    const mensaje = datos?.error?.message ?? `HTTP ${res.status}`;

    if (res.status === 401 || res.status === 403) throw new ErrorDeIA('clave', mensaje);
    if (res.status === 429) throw new ErrorDeIA('cuota', mensaje);
    if (res.ok) {
      const imagen = extraerImagen(datos);
      if (imagen) return imagen;
      ultimo = new ErrorDeIA('sinImagen', 'La respuesta no trae imagen (puede haberla bloqueado un filtro).');
      continue;
    }
    // 400 o 404: puede ser que este modelo se pida de la otra forma.
    ultimo = new ErrorDeIA(res.status >= 500 ? 'servicio' : 'peticion', mensaje);
    if (res.status >= 500) break;
  }
  throw ultimo ?? new ErrorDeIA('servicio');
}
