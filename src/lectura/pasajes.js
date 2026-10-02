// Agrupa los elementos de un capítulo en pasajes: la unidad que se envía a la
// voz. Un pasaje es texto corrido, sin números de versículo, y recuerda dónde
// empieza y termina cada versículo dentro de él.

const CIERRA_ORACION = /[.!?…]["'»”’)\]]*$/;

const largoDe = (tramos) => tramos.reduce(
  (n, t) => n + (typeof t === 'string' ? t.length : (t.j ?? t.d ?? ' ').length), 0);

function nuevo(tipo, titulos) {
  return { tipo, titulos, texto: '', versos: [], jesus: [], acotaciones: [], lineas: [] };
}

export function construirPasajes(elementos, { objetivo = 600, maximo = 1100 } = {}) {
  const pasajes = [];
  let titulos = [];
  let actual = null;
  let lineaPendiente = false;

  const cerrar = () => {
    if (actual && actual.texto) pasajes.push(actual);
    actual = null;
    lineaPendiente = false;
  };
  const abrir = () => {
    actual = nuevo('texto', titulos);
    titulos = [];
  };
  // Los tramos tras una marca de línea no traen espacio delante: se pone aquí.
  const separar = () => {
    if (actual.texto && !actual.texto.endsWith(' ')) actual.texto += ' ';
  };

  for (const e of elementos) {
    if (e.t === 'h') { cerrar(); titulos.push(e.x); continue; }
    if (e.t === 'p') { cerrar(); continue; }
    if (e.t === 's') {
      cerrar();
      const s = nuevo('sobrescrito', titulos);
      titulos = [];
      s.texto = e.x;
      pasajes.push(s);
      continue;
    }
    if (e.t !== 'v') continue;

    if (actual && actual.texto.length + 1 + largoDe(e.x) > maximo) cerrar();
    if (!actual) abrir();

    separar();
    const verso = { n: e.n, cs: actual.texto.length, ce: 0 };
    // Un salto de línea que cerraba el versículo anterior abre este.
    if (lineaPendiente && !(typeof e.x[0] === 'object' && 'l' in e.x[0])) {
      actual.lineas.push({ c: verso.cs, n: 0 });
    }
    lineaPendiente = false;
    for (const t of e.x) {
      if (typeof t === 'string') { actual.texto += t; continue; }
      if ('l' in t) {
        separar();
        actual.lineas.push({ c: actual.texto.length, n: t.l });
        continue;
      }
      const texto = t.j ?? t.d;
      const rangos = 'j' in t ? actual.jesus : actual.acotaciones;
      // El espacio inicial del tramo queda fuera del rango marcado.
      const inicio = actual.texto.length + (texto.length - texto.trimStart().length);
      actual.texto += texto;
      rangos.push([inicio, actual.texto.length]);
    }
    actual.texto = actual.texto.trimEnd();
    verso.ce = actual.texto.length;
    // Una marca de línea al final del versículo pertenece al siguiente.
    const antes = actual.lineas.length;
    actual.lineas = actual.lineas.filter((l) => l.c < verso.ce);
    lineaPendiente = actual.lineas.length < antes;
    if (verso.cs < verso.ce) actual.versos.push(verso);

    if (actual.texto.length >= objetivo && CIERRA_ORACION.test(actual.texto)) cerrar();
  }
  cerrar();
  return pasajes;
}
