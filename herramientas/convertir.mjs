// Convierte un libro del formato de helloao.org al formato de AudioBible.
// Funciones puras: no leen ni escriben archivos.
//
// Elementos de un capítulo:
//   {t:'h', x}      título de sección
//   {t:'s', x}      sobrescrito de salmo
//   {t:'p'}         salto de párrafo
//   {t:'v', n, x}   versículo; x es una lista de tramos
// Tramos de un versículo:
//   'texto'         texto corriente
//   {j:'texto'}     palabras de Jesús
//   {d:'texto'}     texto descriptivo (acotaciones)
//   {l:n}           comienza una línea nueva con sangría n
// Los espacios entre tramos ya van dentro del texto: concatenar los tramos de
// texto de una misma línea da esa línea exacta.

const CIERRE = /^[,.;:!?)\]”’]/;
const SOLO_CIERRE = /^[,.;:!?)\]”’]+$/;

const soloTexto = (partes) =>
  partes.filter((p) => typeof p === 'string').join(' ').trim();

const esLinea = (t) => typeof t === 'object' && 'l' in t;

export function convertirVersiculo(partes, { jesus }) {
  const tramos = [];
  let hayTexto = false;          // ¿ya hubo texto en la línea actual?
  let parrafoAntes = false;

  const ponerLinea = (n) => {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && esLinea(ultimo)) ultimo.l = n;
    else tramos.push({ l: n });
    hayTexto = false;
  };

  for (const parte of partes) {
    const objeto = typeof parte !== 'string';
    if (objeto && 'noteId' in parte) continue;
    if (objeto && parte.lineBreak) { ponerLinea(0); continue; }

    let texto = objeto ? parte.text : parte;
    if (typeof texto !== 'string') throw new Error(`Tramo desconocido: ${JSON.stringify(parte)}`);

    if (tramos.length === 0 && texto.startsWith('¶')) {
      parrafoAntes = true;
      texto = texto.slice(1).trimStart();
    }
    if (texto === '') continue;
    // Una comilla de cierre suelta no abre línea: se pega a la anterior.
    if (objeto && parte.poem && !(hayTexto && SOLO_CIERRE.test(texto))) ponerLinea(parte.poem);
    if (hayTexto && !CIERRE.test(texto)) texto = ' ' + texto;
    hayTexto = true;

    if (objeto && parte.wordsOfJesus && jesus) tramos.push({ j: texto });
    else if (objeto && parte.descriptive) tramos.push({ d: texto });
    else if (typeof tramos[tramos.length - 1] === 'string') tramos[tramos.length - 1] += texto;
    else tramos.push(texto);
  }
  return { tramos, parrafoAntes, vacio: tramos.every(esLinea) };
}

export function convertirCapitulo(contenido, { jesus }) {
  const salida = [];
  let vacios = 0;
  const ponerParrafo = () => {
    if (salida.length && salida[salida.length - 1].t !== 'p') salida.push({ t: 'p' });
  };

  for (const item of contenido) {
    if (item.type === 'heading') salida.push({ t: 'h', x: soloTexto(item.content) });
    else if (item.type === 'hebrew_subtitle') salida.push({ t: 's', x: soloTexto(item.content) });
    else if (item.type === 'line_break') ponerParrafo();
    else if (item.type === 'verse') {
      const { tramos, parrafoAntes, vacio } = convertirVersiculo(item.content, { jesus });
      if (vacio) { vacios++; continue; }
      if (parrafoAntes) ponerParrafo();
      salida.push({ t: 'v', n: item.number, x: tramos });
    } else throw new Error(`Elemento desconocido: ${item.type}`);
  }
  while (salida.length && salida[salida.length - 1].t === 'p') salida.pop();
  return { elementos: salida, vacios };
}

export function convertirLibro(libroFuente, { jesus }) {
  let vacios = 0;
  const caps = libroFuente.chapters.map((c) => {
    const r = convertirCapitulo(c.chapter.content, { jesus });
    vacios += r.vacios;
    return r.elementos;
  });
  return { libro: { id: libroFuente.id, caps }, vacios };
}

// Texto de un versículo ya convertido; cada salto de línea se da como '\n'.
export const textoDeTramos = (tramos) =>
  tramos.map((t) => (typeof t === 'string' ? t : t.j ?? t.d ?? '\n')).join('');
