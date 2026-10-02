// Fondos para compartir un versículo como imagen. Las fotos no están en la
// app: se piden a picsum.photos (fotos de Unsplash, de uso libre) solo cuando
// hacen falta. Cada una se eligió y etiquetó mirándola. Los fondos lisos se
// dibujan en el dispositivo y funcionan sin conexión.

export const FOTOS = [
  { id: 24, temas: ['libro'] },
  { id: 13, temas: ['agua'] }, { id: 14, temas: ['agua', 'roca'] }, { id: 16, temas: ['agua'] },
  { id: 37, temas: ['agua'] }, { id: 74, temas: ['agua'] }, { id: 124, temas: ['agua'] },
  { id: 147, temas: ['agua'] }, { id: 179, temas: ['agua', 'roca'] }, { id: 218, temas: ['agua', 'cielo'] },
  { id: 213, temas: ['agua', 'luz'] }, { id: 128, temas: ['agua', 'montana'] }, { id: 162, temas: ['agua'] },
  { id: 29, temas: ['montana'] }, { id: 79, temas: ['montana', 'camino'] }, { id: 121, temas: ['montana'] },
  { id: 177, temas: ['montana', 'camino'] }, { id: 231, temas: ['montana'] }, { id: 235, temas: ['montana'] },
  { id: 256, temas: ['montana'] }, { id: 198, temas: ['montana', 'campo'] }, { id: 54, temas: ['montana', 'cielo'] },
  { id: 38, temas: ['cielo'] }, { id: 51, temas: ['cielo', 'agua'] }, { id: 53, temas: ['cielo'] },
  { id: 114, temas: ['cielo'] }, { id: 222, temas: ['cielo', 'luz'] }, { id: 135, temas: ['cielo', 'agua'] },
  { id: 17, temas: ['camino'] }, { id: 142, temas: ['camino'] }, { id: 191, temas: ['camino', 'montana'] },
  { id: 202, temas: ['camino', 'luz'] }, { id: 216, temas: ['camino', 'bosque'] }, { id: 255, temas: ['camino'] },
  { id: 190, temas: ['camino', 'bosque'] }, { id: 81, temas: ['camino', 'bosque'] },
  { id: 107, temas: ['campo'] }, { id: 112, temas: ['campo'] }, { id: 98, temas: ['campo'] },
  { id: 165, temas: ['campo', 'cielo'] }, { id: 85, temas: ['campo'] }, { id: 62, temas: ['campo', 'luz'] },
  { id: 110, temas: ['campo', 'luz'] }, { id: 206, temas: ['campo', 'luz'] }, { id: 251, temas: ['campo', 'montana'] },
  { id: 10, temas: ['bosque'] }, { id: 28, temas: ['bosque'] }, { id: 83, temas: ['bosque'] },
  { id: 95, temas: ['bosque'] }, { id: 140, temas: ['bosque'] }, { id: 229, temas: ['bosque'] }, { id: 70, temas: ['bosque'] },
  { id: 109, temas: ['luz'] }, { id: 102, temas: ['luz'] }, { id: 173, temas: ['luz', 'camino'] },
  { id: 203, temas: ['luz'] }, { id: 232, temas: ['luz', 'noche'] }, { id: 137, temas: ['luz'] },
  { id: 25, temas: ['flores'] }, { id: 82, temas: ['flores'] }, { id: 106, temas: ['flores'] },
  { id: 152, temas: ['flores'] }, { id: 159, temas: ['flores', 'lluvia'] }, { id: 189, temas: ['flores', 'lluvia'] }, { id: 239, temas: ['flores'] },
  { id: 46, temas: ['desierto'] }, { id: 184, temas: ['desierto', 'noche'] }, { id: 185, temas: ['desierto'] },
  { id: 196, temas: ['desierto'] }, { id: 247, temas: ['desierto'] }, { id: 261, temas: ['desierto'] }, { id: 141, temas: ['desierto'] },
  { id: 149, temas: ['noche'] }, { id: 84, temas: ['noche'] }, { id: 120, temas: ['noche'] },
  { id: 136, temas: ['roca'] }, { id: 168, temas: ['roca', 'campo'] }, { id: 264, temas: ['roca', 'agua'] }, { id: 12, temas: ['roca', 'agua'] },
  { id: 41, temas: ['lluvia'] }, { id: 171, temas: ['lluvia', 'noche'] }, { id: 178, temas: ['lluvia'] },
];

// Dirección de una foto al tamaño pedido. El servicio permite usarla en un lienzo.
export const urlFoto = (id, ancho, alto) => `https://picsum.photos/id/${id}/${ancho}/${alto}`;

// Fondos lisos: [id, color de arriba, color de abajo, ¿texto claro?]
export const LISOS = [
  ['papel', '#F6F5F1', '#ECE9E0', false],
  ['sepia', '#EFE6D2', '#E2D3B4', false],
  ['tinta', '#26241F', '#12110F', true],
  ['rubrica', '#A1241B', '#6E1711', true],
  ['noche', '#1E2A44', '#0E1526', true],
  ['bosque', '#2F4A3A', '#182A20', true],
];

// Palabras que apuntan a un tema, en español y en inglés, ya sin tildes.
const PISTAS = {
  agua: 'mar mares agua aguas rio rios fuente fuentes olas sed bebe beba arroyo arroyos sea seas water waters river rivers thirst thirsty fountain stream streams waves',
  montana: 'monte montes montana montanas collado collados altura alturas cumbre mountain mountains hill hills mount heights',
  cielo: 'cielo cielos nube nubes alas aguilas firmamento heaven heavens sky cloud clouds wings eagles',
  camino: 'camino caminos senda sendas pasos pies andar guiara guia vereda veredas way ways path paths steps walk guide feet',
  campo: 'pastor ovejas pastos pasto campo campos siembra sembrador trigo fruto frutos cosecha mies rebano shepherd sheep pasture pastures field fields harvest fruit sow sower flock',
  bosque: 'arbol arboles rama ramas raiz raices vid sarmiento sarmientos tree trees branch branches vine root roots',
  luz: 'luz lampara lumbrera sol alba manana amanecer gloria resplandor light lamp sun morning glory dawn shine',
  flores: 'flor flores lirio lirios hierba flower flowers lily lilies grass',
  desierto: 'desierto soledad arena sequedal yermo wilderness desert sand',
  noche: 'noche noches tinieblas oscuridad estrellas night darkness stars',
  roca: 'roca refugio fortaleza castillo escudo torre amparo penasco rock refuge fortress stronghold shield tower',
  lluvia: 'lluvia lluvias rocio rain dew',
};
const TEMA_DE = new Map(Object.entries(PISTAS).flatMap(([tema, palabras]) => palabras.split(' ').map((p) => [p, tema])));

const llano = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\s]/gu, ' ');

// Los temas que sugiere un texto, del más mencionado al menos.
export function temasDe(texto) {
  const cuenta = new Map();
  for (const palabra of llano(texto).split(/\s+/)) {
    const tema = TEMA_DE.get(palabra);
    if (tema) cuenta.set(tema, (cuenta.get(tema) ?? 0) + 1);
  }
  return [...cuenta].sort((a, b) => b[1] - a[1]).map(([tema]) => tema);
}

// Las fotos, con las que mejor acompañan al texto primero. El orden es estable:
// para un mismo versículo siempre salen las mismas sugerencias.
export function fotosPara(texto) {
  const temas = temasDe(texto);
  const peso = (foto) => {
    let p = 0;
    foto.temas.forEach((t, i) => {
      const lugar = temas.indexOf(t);
      if (lugar >= 0) p += (temas.length - lugar) * (i === 0 ? 2 : 1);
    });
    return p;
  };
  // Sin pistas en el texto: un surtido tranquilo, empezando por el libro abierto.
  if (!temas.length) {
    const calmas = ['libro', 'luz', 'cielo', 'campo', 'agua', 'montana'];
    return [...FOTOS].sort((a, b) => {
      const ia = calmas.indexOf(a.temas[0]);
      const ib = calmas.indexOf(b.temas[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }
  return FOTOS.map((foto, i) => ({ foto, p: peso(foto), i })).sort((a, b) => b.p - a.p || a.i - b.i).map((x) => x.foto);
}
