// Del texto que se ve al texto que se envía a la voz. La pantalla nunca
// cambia: aquí solo se corrige lo que el motor pronunciaría mal, y se guarda
// un mapa para devolver los tiempos de cada palabra al texto original.

/* Con separador de miles («603,550») el motor deletrea cifra por cifra. Se le
   envía el número sin separadores, conservando el decimal si lo hay. */
function separadoresDeMiles(token) {
  const seps = [];
  for (let i = 0; i < token.length; i++) if (token[i] === '.' || token[i] === ',') seps.push(i);
  if (!seps.length) return [];
  const partes = token.split(/[.,]/);
  if (partes[0].length > 3) return [];
  const cola = partes.slice(1);
  if (cola.every((p) => p.length === 3)) return seps;
  const ultimo = cola[cola.length - 1];
  if (ultimo.length <= 2 && cola.slice(0, -1).every((p) => p.length === 3)) return seps.slice(0, -1);
  return [];
}

const SUELTA = (letras) => new RegExp(`(?<![\\p{L}\\p{M}])(${letras})(?![\\p{L}\\p{M}])`, 'giu');
const sinTilde = (s) => s.normalize('NFD').replace(/́/g, '').normalize('NFC');

// Cada regla: [expresión, sustituto]. El sustituto puede ser una función.
const REGLAS = {
  // Ortografía anterior a 1959: tildes que hoy la voz acentúa de más.
  rv1909: [
    [SUELTA('á|é|ó|ú'), sinTilde],
    [SUELTA('fué|fuí|dió|vió|dí|ví|vé|fé'), sinTilde],
  ],
  lsv: [
    [/\bYHWH\b/g, () => 'Yahweh'],
  ],
};

export function textoParaVoz(texto, { version } = {}) {
  // Sustituciones: [inicio, fin, nuevo]
  const cambios = [];
  const numeros = /\d[\d.,]*\d/g;
  let m;
  while ((m = numeros.exec(texto)) !== null) {
    for (const p of separadoresDeMiles(m[0])) cambios.push([m.index + p, m.index + p + 1, '']);
  }
  for (const [expresion, sustituto] of REGLAS[version] ?? []) {
    expresion.lastIndex = 0;
    while ((m = expresion.exec(texto)) !== null) {
      const nuevo = sustituto(m[0]);
      if (nuevo !== m[0]) cambios.push([m.index, m.index + m[0].length, nuevo]);
    }
  }
  if (!cambios.length) return { texto, mapa: null };

  cambios.sort((a, b) => a[0] - b[0]);
  let salida = '';
  const mapa = [];
  let cursor = 0;
  for (const [inicio, fin, nuevo] of cambios) {
    if (inicio < cursor) continue;                       // solapado con el anterior
    for (let i = cursor; i < inicio; i++) { mapa.push(i); salida += texto[i]; }
    for (let k = 0; k < nuevo.length; k++) {
      mapa.push(Math.min(fin - 1, inicio + k));
      salida += nuevo[k];
    }
    cursor = fin;
  }
  for (let i = cursor; i < texto.length; i++) { mapa.push(i); salida += texto[i]; }

  const identidad = salida.length === texto.length && mapa.every((v, i) => v === i);
  return { texto: salida, mapa: identidad ? null : mapa };
}

// Devuelve los tiempos con las posiciones referidas al texto que se ve.
export function reubicarPalabras(palabras, mapa) {
  if (!mapa) return palabras;
  return palabras.map((p) => ({
    ...p,
    cs: mapa[p.cs] ?? p.cs,
    ce: (mapa[p.ce - 1] ?? p.ce - 1) + 1,
  }));
}
