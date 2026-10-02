// Saca de un PDF, página a página, los trozos de texto con su posición, su
// tamaño, su tipo de letra y su color. Funciona igual en el navegador y
// en Node: recibe la biblioteca pdf.js ya cargada.

// 'rojo' (palabras de Jesús), 'azul' (enlaces del libro electrónico) o null.
function colorDe(c) {
  if (!c) return null;
  if (c[0] > 200 && c[1] < 90 && c[2] < 90) return 'rojo';
  if (c[2] > 200 && c[0] < 90 && c[1] < 90) return 'azul';
  return null;
}

// El color de cada carácter no blanco de la página. Sale de las órdenes de
// dibujo, que es donde el PDF guarda el color.
function coloresPorCaracter(pdfjs, operaciones) {
  const { OPS } = pdfjs;
  const colores = [];
  let color = null;
  for (let i = 0; i < operaciones.fnArray.length; i++) {
    const op = operaciones.fnArray[i];
    const args = operaciones.argsArray[i];
    if (op === OPS.setFillRGBColor) color = colorDe(args);
    else if (op === OPS.showText || op === OPS.showSpacedText) {
      for (const glifo of args[0]) {
        if (typeof glifo === 'number') continue;
        for (const ch of glifo.unicode ?? '') if (!/\s/.test(ch)) colores.push(color);
      }
    }
  }
  return colores;
}

function estiloDe(pagina, fuente) {
  let nombre = '';
  try { nombre = pagina.commonObjs.get(fuente)?.name ?? ''; } catch { /* fuente sin cargar */ }
  const negrita = /bold|black|heavy/i.test(nombre);
  const cursiva = /ital|oblique/i.test(nombre);
  return negrita && cursiva ? 'bi' : negrita ? 'b' : cursiva ? 'i' : 'r';
}

// Parte un trozo donde cambia el color, para que cada parte sea de uno solo.
function partirPorColor(trozo, colores, desde) {
  const partes = [];
  let k = desde;
  let actual = null;
  for (const ch of trozo.str) {
    const blanco = /\s/.test(ch);
    const color = blanco ? actual?.color ?? null : colores[k] ?? null;
    if (!blanco) k++;
    if (!actual || (!blanco && actual.color !== color)) {
      actual = { ...trozo, str: '', color, eol: false };
      partes.push(actual);
    }
    actual.str += ch;
  }
  if (!partes.length) partes.push({ ...trozo, color: null });
  partes[partes.length - 1].eol = trozo.eol;
  return { partes, hasta: k };
}

export async function abrirPdf(pdfjs, datos) {
  const doc = await pdfjs.getDocument({ data: datos, disableFontFace: true, useSystemFonts: false }).promise;

  return {
    paginas: doc.numPages,

    async pagina(n) {
      const pagina = await doc.getPage(n);
      const [contenido, operaciones] = await Promise.all([
        pagina.getTextContent({ disableNormalization: true }),
        pagina.getOperatorList(),
      ]);

      const base = contenido.items.filter((it) => typeof it.str === 'string').map((it) => ({
        str: it.str, x: it.transform[4], y: it.transform[5], h: it.height, fuente: it.fontName, eol: Boolean(it.hasEOL),
      }));

      // El color solo se usa si casa carácter a carácter con el texto.
      const colores = coloresPorCaracter(pdfjs, operaciones);
      const noBlancos = base.reduce((n2, t) => n2 + t.str.replace(/\s/g, '').length, 0);
      let trozos = base;
      if (colores.length === noBlancos && colores.some(Boolean)) {
        trozos = [];
        let k = 0;
        for (const t of base) {
          const { partes, hasta } = partirPorColor(t, colores, k);
          trozos.push(...partes);
          k = hasta;
        }
      }

      const estilos = new Map();
      const estilo = (fuente) => {
        if (!estilos.has(fuente)) estilos.set(fuente, estiloDe(pagina, fuente));
        return estilos.get(fuente);
      };
      for (const t of trozos) estilo(t.fuente);
      pagina.cleanup();
      return { trozos, estilo };
    },

    cerrar: () => doc.destroy(),
  };
}
