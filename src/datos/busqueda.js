// Búsqueda de palabras o frases en una versión entera. Funciones puras: el
// índice se construye una vez a partir de los libros y se consulta en memoria.

// Sin tildes ni mayúsculas, y con la puntuación fuera: «¡Jehová!» ≡ «jehova».
export const plano = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const textoDe = (x) => x.map((t) => (typeof t === 'string' ? t : t.j ?? t.d ?? ' ')).join('').replace(/\s+/g, ' ').trim();

// libros: [{id, caps}] → [{libro, cap, n, f?, texto, plano}]
export function construirIndice(libros) {
  const indice = [];
  for (const libro of libros) {
    libro.caps.forEach((elementos, c) => {
      for (const e of elementos) {
        if (e.t !== 'v') continue;
        const texto = textoDe(e.x);
        indice.push({ libro: libro.id, cap: c + 1, n: e.n, texto, plano: ` ${plano(texto)} ` });
      }
    });
  }
  return indice;
}

// «amor de dios» busca versículos con las tres palabras; "amor de Dios", entre
// comillas, la frase exacta. Las palabras se buscan enteras.
export function analizarConsulta(consulta) {
  const frases = [];
  const resto = consulta.replace(/["“«]([^"”»]+)["”»]/g, (_, f) => { frases.push(plano(f)); return ' '; });
  const palabras = plano(resto).split(' ').filter(Boolean);
  return [...frases.filter(Boolean), ...palabras];
}

export function buscar(indice, consulta, { libros = null, limite = Infinity } = {}) {
  const terminos = analizarConsulta(consulta);
  if (!terminos.length) return { terminos, resultados: [], total: 0 };
  const agujas = terminos.map((t) => ` ${t} `);
  const resultados = [];
  let total = 0;
  for (const v of indice) {
    if (libros && !libros.has(v.libro)) continue;
    if (!agujas.every((a) => v.plano.includes(a))) continue;
    total++;
    if (resultados.length < limite) resultados.push(v);
  }
  return { terminos, resultados, total };
}

// Trozos del texto original para pintar: [{texto, hallado}]. Compara sin
// tildes ni mayúsculas, pero devuelve el texto tal como está escrito.
export function resaltar(texto, terminos) {
  const marcas = new Array(texto.length).fill(false);
  // Texto plano carácter a carácter, guardando a qué posición original corresponde.
  let llano = '';
  const origen = [];
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const util = /[\p{L}\p{N}]/u.test(c) ? c : ' ';
    for (const ch of util) { llano += ch; origen.push(i); }
  }
  for (const termino of terminos) {
    const partes = termino.split(' ').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${partes.join(' +')}(?![\\p{L}\\p{N}])`, 'gu');
    let m;
    while ((m = re.exec(llano)) !== null) {
      for (let k = origen[m.index]; k <= origen[m.index + m[0].length - 1]; k++) marcas[k] = true;
    }
  }
  const trozos = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = trozos[trozos.length - 1];
    if (ultimo && ultimo.hallado === marcas[i]) ultimo.texto += texto[i];
    else trozos.push({ texto: texto[i], hallado: marcas[i] });
  }
  return trozos;
}
