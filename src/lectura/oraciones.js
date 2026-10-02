// División de un texto en oraciones. Es la unidad que se resalta y a la que se
// salta con un toque. Traído de Lyrio.

const MINIMO = 12;
const CIERRES = '"\'»”’)\\]';

// Abreviaturas tras las que un punto no termina la oración.
const ABREVIATURAS = new Set([
  'sr', 'sra', 'srta', 'dr', 'dra', 'etc', 'ej', 'vs', 'núm', 'num', 'pág', 'cap', 'vol', 'ed',
  'mr', 'mrs', 'ms', 'st', 'jr',
]);

const FRONTERA = new RegExp(`[.!?…]+(?=[${CIERRES}]*(\\s|$))`, 'g');
const ES_CIERRE = new RegExp(`[${CIERRES}]`);
const EMPIEZA_ORACION = /^[A-ZÁÉÍÓÚÜÑ¿¡"'«“‘(\[—―–-]/;

function acabaEnAbreviatura(antes) {
  const m = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)$/.exec(antes);
  if (!m) return false;
  const palabra = m[1].toLowerCase();
  return palabra.length === 1 || ABREVIATURAS.has(palabra);
}

export function dividirOraciones(texto) {
  const salida = [];
  let inicio = 0;
  let m;
  FRONTERA.lastIndex = 0;

  while ((m = FRONTERA.exec(texto)) !== null) {
    let fin = m.index + m[0].length;
    while (fin < texto.length && ES_CIERRE.test(texto[fin])) fin++;

    const antes = texto.slice(0, m.index);
    const despues = texto.slice(fin);
    const siguiente = despues.trimStart()[0];

    const esDecimal = /\d$/.test(antes) && /^\d/.test(despues);
    const muyCorta = fin - inicio < MINIMO;
    const sigueEnMinuscula = siguiente && !EMPIEZA_ORACION.test(siguiente);
    if (esDecimal || muyCorta || sigueEnMinuscula || acabaEnAbreviatura(antes)) continue;

    salida.push({ cs: inicio, ce: fin });
    inicio = fin + (despues.length - despues.trimStart().length);
  }

  if (inicio < texto.length) {
    if (salida.length && texto.length - inicio < MINIMO) salida[salida.length - 1].ce = texto.length;
    else salida.push({ cs: inicio, ce: texto.length });
  }
  return salida.length ? salida : [{ cs: 0, ce: texto.length }];
}
