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
  // Ampliación de octubre de 2026: el resto del catálogo, mirado foto a foto.
  { id: 1010, temas: ['libro'] }, { id: 1073, temas: ['libro'] }, { id: 11, temas: ['agua', 'montana'] }, { id: 15, temas: ['agua', 'roca'] },
  { id: 44, temas: ['agua'] }, { id: 47, temas: ['agua'] }, { id: 71, temas: ['agua', 'campo'] }, { id: 77, temas: ['agua', 'camino'] },
  { id: 87, temas: ['agua'] }, { id: 125, temas: ['agua', 'campo'] }, { id: 131, temas: ['agua'] }, { id: 144, temas: ['agua'] },
  { id: 154, temas: ['agua'] }, { id: 172, temas: ['agua'] }, { id: 176, temas: ['agua'] }, { id: 199, temas: ['agua'] },
  { id: 217, temas: ['agua', 'bosque'] }, { id: 228, temas: ['agua'] }, { id: 230, temas: ['agua', 'bosque'] }, { id: 244, temas: ['agua'] },
  { id: 266, temas: ['agua'] }, { id: 267, temas: ['agua'] }, { id: 271, temas: ['agua', 'cielo'] }, { id: 275, temas: ['agua', 'cielo'] },
  { id: 279, temas: ['agua'] }, { id: 280, temas: ['agua', 'roca'] }, { id: 293, temas: ['agua', 'montana'] }, { id: 295, temas: ['agua', 'roca'] },
  { id: 302, temas: ['agua'] }, { id: 313, temas: ['agua'] }, { id: 317, temas: ['agua', 'camino'] }, { id: 323, temas: ['agua', 'montana'] },
  { id: 347, temas: ['agua', 'campo'] }, { id: 350, temas: ['agua', 'roca'] }, { id: 356, temas: ['agua'] }, { id: 362, temas: ['agua', 'luz'] },
  { id: 374, temas: ['agua', 'montana'] }, { id: 381, temas: ['agua', 'montana'] }, { id: 384, temas: ['agua'] }, { id: 385, temas: ['agua', 'cielo'] },
  { id: 404, temas: ['agua', 'roca'] }, { id: 412, temas: ['agua', 'bosque'] }, { id: 421, temas: ['agua'] }, { id: 426, temas: ['montana', 'agua'] },
  { id: 434, temas: ['agua', 'montana'] }, { id: 440, temas: ['agua', 'roca'] }, { id: 450, temas: ['agua', 'montana'] }, { id: 456, temas: ['agua', 'campo'] },
  { id: 457, temas: ['agua'] }, { id: 461, temas: ['agua', 'montana'] }, { id: 466, temas: ['agua', 'bosque'] }, { id: 467, temas: ['agua'] },
  { id: 477, temas: ['agua', 'bosque'] }, { id: 481, temas: ['agua', 'bosque'] }, { id: 482, temas: ['montana', 'agua'] }, { id: 483, temas: ['agua', 'roca'] },
  { id: 485, temas: ['agua', 'roca'] }, { id: 499, temas: ['luz', 'agua'] }, { id: 501, temas: ['agua'] }, { id: 506, temas: ['agua', 'roca'] },
  { id: 507, temas: ['agua', 'montana'] }, { id: 509, temas: ['agua', 'roca'] }, { id: 516, temas: ['agua', 'roca'] }, { id: 521, temas: ['agua', 'camino'] },
  { id: 552, temas: ['agua'] }, { id: 557, temas: ['agua', 'roca'] }, { id: 569, temas: ['agua', 'camino'] }, { id: 573, temas: ['agua', 'roca'] },
  { id: 574, temas: ['agua', 'roca'] }, { id: 575, temas: ['agua', 'montana'] }, { id: 577, temas: ['agua', 'bosque'] }, { id: 588, temas: ['agua', 'camino'] },
  { id: 594, temas: ['agua', 'noche'] }, { id: 603, temas: ['agua', 'roca'] }, { id: 606, temas: ['camino', 'agua'] }, { id: 607, temas: ['cielo', 'agua'] },
  { id: 609, temas: ['roca', 'agua'] }, { id: 610, temas: ['agua'] }, { id: 612, temas: ['agua', 'roca'] }, { id: 614, temas: ['agua'] },
  { id: 615, temas: ['agua'] }, { id: 626, temas: ['agua', 'roca'] }, { id: 638, temas: ['agua'] }, { id: 640, temas: ['agua'] },
  { id: 641, temas: ['agua', 'luz'] }, { id: 643, temas: ['agua', 'luz'] }, { id: 653, temas: ['agua', 'luz'] }, { id: 657, temas: ['agua'] },
  { id: 658, temas: ['roca', 'agua'] }, { id: 661, temas: ['agua', 'cielo'] }, { id: 675, temas: ['agua'] }, { id: 689, temas: ['agua', 'luz'] },
  { id: 700, temas: ['agua'] }, { id: 702, temas: ['agua', 'montana'] }, { id: 715, temas: ['agua', 'luz'] }, { id: 716, temas: ['agua'] },
  { id: 717, temas: ['agua', 'campo'] }, { id: 732, temas: ['agua', 'roca'] }, { id: 756, temas: ['agua'] }, { id: 773, temas: ['agua', 'montana'] },
  { id: 774, temas: ['agua', 'cielo'] }, { id: 787, temas: ['agua', 'roca'] }, { id: 788, temas: ['agua', 'luz'] }, { id: 813, temas: ['agua', 'montana'] },
  { id: 827, temas: ['noche', 'agua'] }, { id: 842, temas: ['agua', 'camino'] }, { id: 848, temas: ['agua'] }, { id: 849, temas: ['agua', 'montana'] },
  { id: 851, temas: ['agua'] }, { id: 852, temas: ['agua'] }, { id: 853, temas: ['agua', 'roca'] }, { id: 865, temas: ['agua', 'roca'] },
  { id: 871, temas: ['agua', 'roca'] }, { id: 875, temas: ['agua', 'cielo'] }, { id: 883, temas: ['agua', 'montana'] }, { id: 890, temas: ['agua', 'roca'] },
  { id: 894, temas: ['montana', 'agua'] }, { id: 896, temas: ['agua', 'luz'] }, { id: 907, temas: ['agua', 'noche'] }, { id: 909, temas: ['agua'] },
  { id: 912, temas: ['agua'] }, { id: 913, temas: ['agua', 'roca'] }, { id: 914, temas: ['agua', 'noche'] }, { id: 916, temas: ['agua', 'montana'] },
  { id: 921, temas: ['bosque', 'agua'] }, { id: 928, temas: ['agua', 'roca'] }, { id: 938, temas: ['agua', 'roca'] }, { id: 941, temas: ['agua'] },
  { id: 950, temas: ['agua', 'luz'] }, { id: 962, temas: ['agua', 'luz'] }, { id: 969, temas: ['agua', 'roca'] }, { id: 970, temas: ['agua', 'cielo'] },
  { id: 973, temas: ['agua', 'luz'] }, { id: 980, temas: ['agua', 'montana'] }, { id: 986, temas: ['agua', 'roca'] }, { id: 989, temas: ['agua', 'bosque'] },
  { id: 990, temas: ['agua', 'luz'] }, { id: 994, temas: ['agua', 'luz'] }, { id: 1015, temas: ['agua', 'montana'] }, { id: 1035, temas: ['agua', 'roca'] },
  { id: 1038, temas: ['agua'] }, { id: 1039, temas: ['agua', 'bosque'] }, { id: 1041, temas: ['agua'] }, { id: 1043, temas: ['agua', 'montana'] },
  { id: 1044, temas: ['agua', 'montana'] }, { id: 1049, temas: ['agua', 'roca'] }, { id: 1050, temas: ['agua', 'roca'] }, { id: 1051, temas: ['agua', 'camino'] },
  { id: 1052, temas: ['roca', 'agua'] }, { id: 1053, temas: ['agua'] }, { id: 1055, temas: ['agua', 'desierto'] }, { id: 1057, temas: ['agua', 'montana'] },
  { id: 1061, temas: ['agua', 'roca'] }, { id: 66, temas: ['montana', 'campo'] }, { id: 67, temas: ['montana', 'bosque'] }, { id: 118, temas: ['montana', 'flores'] },
  { id: 166, temas: ['montana'] }, { id: 204, temas: ['camino', 'montana'] }, { id: 241, temas: ['montana', 'camino'] }, { id: 260, temas: ['montana', 'bosque'] },
  { id: 272, temas: ['cielo', 'montana'] }, { id: 278, temas: ['montana', 'camino'] }, { id: 287, temas: ['montana', 'campo'] }, { id: 294, temas: ['montana', 'luz'] },
  { id: 296, temas: ['montana'] }, { id: 327, temas: ['montana'] }, { id: 353, temas: ['bosque', 'montana'] }, { id: 368, temas: ['montana', 'luz'] },
  { id: 377, temas: ['montana', 'noche'] }, { id: 379, temas: ['camino', 'montana'] }, { id: 386, temas: ['montana', 'cielo'] }, { id: 393, temas: ['montana'] },
  { id: 406, temas: ['montana', 'cielo'] }, { id: 416, temas: ['luz', 'montana'] }, { id: 432, temas: ['luz', 'montana'] }, { id: 443, temas: ['montana', 'bosque'] },
  { id: 458, temas: ['montana', 'camino'] }, { id: 465, temas: ['montana', 'cielo'] }, { id: 474, temas: ['camino', 'montana'] }, { id: 475, temas: ['montana'] },
  { id: 479, temas: ['camino', 'montana'] }, { id: 484, temas: ['montana'] }, { id: 510, temas: ['montana', 'campo'] }, { id: 511, temas: ['roca', 'montana'] },
  { id: 519, temas: ['montana', 'camino'] }, { id: 523, temas: ['montana', 'desierto'] }, { id: 538, temas: ['montana', 'cielo'] }, { id: 544, temas: ['montana', 'luz'] },
  { id: 547, temas: ['montana', 'luz'] }, { id: 558, temas: ['montana'] }, { id: 563, temas: ['camino', 'montana'] }, { id: 565, temas: ['montana', 'cielo'] },
  { id: 566, temas: ['montana', 'campo'] }, { id: 572, temas: ['montana'] }, { id: 586, temas: ['montana', 'cielo'] }, { id: 599, temas: ['montana'] },
  { id: 651, temas: ['montana'] }, { id: 664, temas: ['montana'] }, { id: 665, temas: ['montana'] }, { id: 667, temas: ['camino', 'luz'] },
  { id: 676, temas: ['montana'] }, { id: 678, temas: ['montana', 'bosque'] }, { id: 684, temas: ['montana'] }, { id: 685, temas: ['cielo', 'montana'] },
  { id: 688, temas: ['camino', 'montana'] }, { id: 731, temas: ['montana'] }, { id: 769, temas: ['noche', 'montana'] }, { id: 772, temas: ['camino', 'montana'] },
  { id: 780, temas: ['montana'] }, { id: 794, temas: ['luz', 'montana'] }, { id: 806, temas: ['montana'] }, { id: 809, temas: ['montana', 'cielo'] },
  { id: 814, temas: ['montana'] }, { id: 830, temas: ['montana'] }, { id: 866, temas: ['montana'] }, { id: 872, temas: ['montana'] },
  { id: 873, temas: ['montana'] }, { id: 902, temas: ['montana', 'luz'] }, { id: 905, temas: ['montana'] }, { id: 906, temas: ['montana'] },
  { id: 908, temas: ['montana'] }, { id: 910, temas: ['montana', 'bosque'] }, { id: 918, temas: ['montana', 'luz'] }, { id: 927, temas: ['montana'] },
  { id: 930, temas: ['montana'] }, { id: 931, temas: ['montana'] }, { id: 961, temas: ['montana'] }, { id: 966, temas: ['montana'] },
  { id: 982, temas: ['montana', 'luz'] }, { id: 984, temas: ['montana', 'campo'] }, { id: 987, temas: ['montana', 'luz'] }, { id: 988, temas: ['campo', 'montana'] },
  { id: 991, temas: ['luz', 'montana'] }, { id: 1000, temas: ['montana', 'cielo'] }, { id: 1016, temas: ['montana', 'desierto'] }, { id: 1018, temas: ['montana', 'campo'] },
  { id: 1036, temas: ['montana'] }, { id: 1045, temas: ['montana'] }, { id: 1064, temas: ['montana', 'cielo'] }, { id: 130, temas: ['cielo'] },
  { id: 151, temas: ['luz', 'cielo'] }, { id: 258, temas: ['cielo'] }, { id: 583, temas: ['cielo', 'luz'] }, { id: 705, temas: ['cielo', 'luz'] },
  { id: 733, temas: ['cielo'] }, { id: 741, temas: ['cielo'] }, { id: 793, temas: ['cielo', 'luz'] }, { id: 847, temas: ['cielo'] },
  { id: 888, temas: ['cielo'] }, { id: 1056, temas: ['cielo', 'agua'] }, { id: 1019, temas: ['lluvia', 'agua'] }, { id: 69, temas: ['camino', 'bosque'] },
  { id: 132, temas: ['camino', 'luz'] }, { id: 186, temas: ['camino', 'bosque'] }, { id: 197, temas: ['camino'] }, { id: 254, temas: ['camino', 'bosque'] },
  { id: 314, temas: ['camino', 'desierto'] }, { id: 316, temas: ['camino'] }, { id: 324, temas: ['bosque', 'camino'] }, { id: 335, temas: ['camino', 'bosque'] },
  { id: 339, temas: ['camino', 'noche'] }, { id: 387, temas: ['camino', 'campo'] }, { id: 478, temas: ['camino', 'bosque'] }, { id: 480, temas: ['campo', 'camino'] },
  { id: 518, temas: ['camino', 'bosque'] }, { id: 559, temas: ['camino', 'bosque'] }, { id: 560, temas: ['camino', 'bosque'] }, { id: 650, temas: ['camino', 'bosque'] },
  { id: 767, temas: ['camino', 'bosque'] }, { id: 923, temas: ['camino', 'bosque'] }, { id: 944, temas: ['camino', 'bosque'] }, { id: 964, temas: ['camino'] },
  { id: 18, temas: ['campo'] }, { id: 33, temas: ['campo', 'luz'] }, { id: 89, temas: ['campo'] }, { id: 93, temas: ['campo', 'cielo'] },
  { id: 116, temas: ['campo'] }, { id: 170, temas: ['campo'] }, { id: 187, temas: ['campo'] }, { id: 277, temas: ['campo', 'cielo'] },
  { id: 337, temas: ['campo'] }, { id: 388, temas: ['luz', 'campo'] }, { id: 413, temas: ['luz', 'campo'] }, { id: 459, temas: ['luz', 'campo'] },
  { id: 468, temas: ['campo', 'bosque'] }, { id: 487, temas: ['campo'] }, { id: 517, temas: ['campo', 'bosque'] }, { id: 542, temas: ['campo', 'lluvia'] },
  { id: 584, temas: ['campo'] }, { id: 649, temas: ['campo'] }, { id: 674, temas: ['campo'] }, { id: 695, temas: ['campo', 'luz'] },
  { id: 699, temas: ['campo'] }, { id: 75, temas: ['campo'] }, { id: 784, temas: ['campo'] }, { id: 807, temas: ['campo'] },
  { id: 808, temas: ['campo'] }, { id: 915, temas: ['campo'] }, { id: 943, temas: ['luz', 'campo'] }, { id: 955, temas: ['campo'] },
  { id: 960, temas: ['campo'] }, { id: 127, temas: ['bosque'] }, { id: 167, temas: ['bosque'] }, { id: 227, temas: ['bosque', 'camino'] },
  { id: 243, temas: ['bosque', 'montana'] }, { id: 282, temas: ['bosque'] }, { id: 340, temas: ['bosque', 'roca'] }, { id: 400, temas: ['bosque'] },
  { id: 423, temas: ['bosque'] }, { id: 424, temas: ['bosque'] }, { id: 471, temas: ['bosque'] }, { id: 472, temas: ['bosque'] },
  { id: 476, temas: ['bosque', 'luz'] }, { id: 502, temas: ['bosque', 'luz'] }, { id: 543, temas: ['bosque'] }, { id: 553, temas: ['bosque'] },
  { id: 562, temas: ['bosque', 'cielo'] }, { id: 568, temas: ['bosque'] }, { id: 571, temas: ['bosque'] }, { id: 600, temas: ['bosque', 'luz'] },
  { id: 630, temas: ['bosque', 'cielo'] }, { id: 634, temas: ['bosque'] }, { id: 648, temas: ['bosque'] }, { id: 652, temas: ['bosque'] },
  { id: 666, temas: ['bosque'] }, { id: 698, temas: ['bosque', 'cielo'] }, { id: 704, temas: ['bosque'] }, { id: 722, temas: ['bosque'] },
  { id: 730, temas: ['bosque'] }, { id: 805, temas: ['bosque', 'campo'] }, { id: 876, temas: ['bosque'] }, { id: 877, temas: ['bosque'] },
  { id: 880, temas: ['bosque'] }, { id: 919, temas: ['bosque'] }, { id: 922, temas: ['bosque'] }, { id: 924, temas: ['bosque'] },
  { id: 925, temas: ['bosque'] }, { id: 932, temas: ['bosque'] }, { id: 933, temas: ['bosque'] }, { id: 957, temas: ['bosque'] },
  { id: 997, temas: ['bosque'] }, { id: 1021, temas: ['bosque'] }, { id: 1037, temas: ['bosque', 'luz'] }, { id: 265, temas: ['luz'] },
  { id: 330, temas: ['luz', 'campo'] }, { id: 427, temas: ['luz'] }, { id: 719, temas: ['luz', 'campo'] }, { id: 721, temas: ['luz', 'noche'] },
  { id: 765, temas: ['noche', 'luz'] }, { id: 992, temas: ['noche', 'luz'] }, { id: 505, temas: ['noche', 'luz'] }, { id: 306, temas: ['flores', 'agua'] },
  { id: 360, temas: ['flores'] }, { id: 492, temas: ['flores', 'campo'] }, { id: 696, temas: ['flores'] }, { id: 701, temas: ['flores', 'campo'] },
  { id: 976, temas: ['flores'] }, { id: 215, temas: ['desierto'] }, { id: 525, temas: ['desierto'] }, { id: 564, temas: ['desierto', 'roca'] },
  { id: 645, temas: ['desierto', 'cielo'] }, { id: 727, temas: ['desierto'] }, { id: 789, temas: ['desierto'] }, { id: 791, temas: ['desierto'] },
  { id: 796, temas: ['desierto'] }, { id: 829, temas: ['desierto', 'roca'] }, { id: 884, temas: ['desierto', 'noche'] }, { id: 886, temas: ['desierto'] },
  { id: 993, temas: ['desierto', 'campo'] }, { id: 1028, temas: ['desierto'] }, { id: 496, temas: ['noche'] }, { id: 537, temas: ['noche'] },
  { id: 654, temas: ['noche'] }, { id: 681, temas: ['noche'] }, { id: 683, temas: ['noche'] }, { id: 723, temas: ['noche'] },
  { id: 724, temas: ['noche', 'bosque'] }, { id: 825, temas: ['noche'] }, { id: 831, temas: ['noche', 'desierto'] }, { id: 869, temas: ['noche'] },
  { id: 901, temas: ['noche'] }, { id: 903, temas: ['noche'] }, { id: 974, temas: ['noche'] }, { id: 981, temas: ['noche', 'roca'] },
  { id: 1022, temas: ['noche'] }, { id: 236, temas: ['roca'] }, { id: 329, temas: ['roca'] }, { id: 591, temas: ['roca', 'cielo'] },
  { id: 735, temas: ['roca'] }, { id: 929, temas: ['roca'] }, { id: 631, temas: ['lluvia'] },
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
