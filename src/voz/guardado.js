// ¿Qué capítulos tienen su audio guardado en el dispositivo? Un capítulo lo
// está cuando lo están todos sus pasajes con la voz en uso, a cualquier
// velocidad.
import { construirPasajes } from '../lectura/pasajes.js';
import { textoParaVoz } from '../lectura/pronunciacion.js';
import { claveVozTexto, guardadosDeLibro } from '../almacen/audio.js';

export const textosDeVoz = (pasajes, version) => pasajes.map((p) => textoParaVoz(p.texto, { version }).texto);

const completo = (pasajes, version, voz, guardados) =>
  pasajes.length > 0 && textosDeVoz(pasajes, version).every((t) => guardados.has(claveVozTexto(voz, t)));

export async function capituloGuardado({ version, libro, pasajes, voz }) {
  return completo(pasajes, version, voz, await guardadosDeLibro(version, libro));
}

// capitulos: los elementos de cada capítulo del libro. Devuelve los números guardados.
export async function capitulosGuardados({ version, libro, capitulos, voz }) {
  const guardados = await guardadosDeLibro(version, libro);
  const salida = new Set();
  if (!guardados.size) return salida;
  capitulos.forEach((elementos, i) => {
    if (completo(construirPasajes(elementos), version, voz, guardados)) salida.add(i + 1);
  });
  return salida;
}
