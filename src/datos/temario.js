// Temario: pasajes reunidos por situación o necesidad del lector. Cada cita es
// «LIBRO.capítulo.versículo» o un tramo dentro de un capítulo («PSA.23.1-4»).
// Sirve para cualquier versión: son solo referencias.
//
// Es una selección de pasajes conocidos sobre cada tema, no un comentario ni
// un consejo: se ofrece el texto y nada más.

export const TEMARIO = [
  {
    id: 'espiritual',
    nombre: { es: 'Vida espiritual', en: 'Spiritual life' },
    temas: [
      { id: 'salvacion', nombre: { es: 'Salvación', en: 'Salvation' }, citas: ['JHN.3.16-17', 'ROM.10.9-10', 'EPH.2.8-9', 'ACT.4.12', 'ROM.6.23', 'JHN.14.6', 'TIT.3.5', '1JN.5.11-13'] },
      { id: 'fe', nombre: { es: 'Fe', en: 'Faith' }, citas: ['HEB.11.1', 'HEB.11.6', 'ROM.10.17', 'MRK.11.22-24', '2CO.5.7', 'JAS.1.5-6', 'MAT.17.20', 'PRO.3.5-6'] },
      { id: 'oracion', nombre: { es: 'Oración', en: 'Prayer' }, citas: ['MAT.6.6-13', 'PHP.4.6-7', '1TH.5.16-18', 'JAS.5.16', 'MAT.7.7-8', '1JN.5.14-15', 'JER.33.3', 'PSA.145.18'] },
      { id: 'perdon-de-dios', nombre: { es: 'El perdón de Dios', en: 'God’s forgiveness' }, citas: ['1JN.1.9', 'PSA.103.10-12', 'ISA.1.18', 'PSA.51.1-4', 'EPH.1.7', 'MIC.7.18-19', 'ROM.8.1', 'PSA.32.5'] },
      { id: 'arrepentimiento', nombre: { es: 'Arrepentimiento', en: 'Repentance' }, citas: ['ACT.3.19', '2CH.7.14', 'LUK.15.7', '2CO.7.10', 'PRO.28.13', 'JOL.2.12-13', 'ACT.2.38', 'ISA.55.6-7'] },
      { id: 'espiritu-santo', nombre: { es: 'El Espíritu Santo', en: 'The Holy Spirit' }, citas: ['JHN.14.26', 'ACT.1.8', 'GAL.5.22-23', 'ROM.8.26', 'JHN.16.13', 'EPH.5.18', '1CO.6.19', 'ROM.8.14'] },
      { id: 'gratitud', nombre: { es: 'Gratitud y alabanza', en: 'Gratitude and praise' }, citas: ['PSA.100.1-5', '1TH.5.18', 'PSA.103.1-5', 'COL.3.15-17', 'PSA.136.1', 'PSA.34.1-3', 'HEB.13.15', 'PSA.150.6'] },
      { id: 'direccion', nombre: { es: 'Dirección de Dios', en: 'God’s guidance' }, citas: ['PRO.3.5-6', 'PSA.32.8', 'ROM.12.2', 'ISA.30.21', 'PSA.119.105', 'JER.29.11', 'PRO.16.9', 'PSA.37.23-24'] },
      { id: 'tentacion', nombre: { es: 'Tentación', en: 'Temptation' }, citas: ['1CO.10.13', 'JAS.1.12-15', 'MAT.26.41', 'HEB.4.15-16', 'HEB.2.18', 'JAS.4.7', 'PSA.119.11', 'GAL.5.16'] },
      { id: 'crecimiento', nombre: { es: 'Crecer en la fe', en: 'Growing in faith' }, citas: ['2PE.3.18', 'PHP.1.6', 'ROM.12.1-2', '1PE.1.15-16', 'JHN.15.4-5', 'COL.2.6-7', '2TI.3.16-17', 'PSA.1.1-3'] },
    ],
  },
  {
    id: 'emociones',
    nombre: { es: 'Emociones y ánimo', en: 'Emotions and state of mind' },
    temas: [
      { id: 'ansiedad', nombre: { es: 'Ansiedad y preocupación', en: 'Anxiety and worry' }, citas: ['PHP.4.6-7', 'MAT.6.25-34', '1PE.5.7', 'PSA.94.19', 'ISA.41.10', 'PSA.55.22', 'JHN.14.27', 'PRO.12.25'] },
      { id: 'miedo', nombre: { es: 'Miedo', en: 'Fear' }, citas: ['2TI.1.7', 'PSA.27.1', 'PSA.56.3-4', 'JOS.1.9', 'PSA.23.4', 'DEU.31.6', '1JN.4.18', 'ISA.43.1-2'] },
      { id: 'tristeza', nombre: { es: 'Tristeza y depresión', en: 'Sadness and depression' }, citas: ['PSA.34.17-18', 'PSA.42.11', 'PSA.30.5', 'ISA.61.1-3', 'MAT.5.4', 'PSA.147.3', '2CO.1.3-4', 'PSA.40.1-3'] },
      { id: 'soledad', nombre: { es: 'Soledad', en: 'Loneliness' }, citas: ['DEU.31.8', 'HEB.13.5', 'MAT.28.20', 'PSA.139.7-10', 'PSA.68.5-6', 'PSA.27.10', 'JHN.14.18', 'PSA.25.16'] },
      { id: 'ira', nombre: { es: 'Ira', en: 'Anger' }, citas: ['EPH.4.26-27', 'JAS.1.19-20', 'PRO.15.1', 'PRO.14.29', 'PRO.29.11', 'ECC.7.9', 'COL.3.8', 'PSA.37.8'] },
      { id: 'culpa', nombre: { es: 'Culpa y vergüenza', en: 'Guilt and shame' }, citas: ['ROM.8.1', 'PSA.32.1-5', '1JN.1.9', 'ISA.43.25', 'HEB.10.22', 'PSA.103.12', '2CO.5.17', 'ISA.54.4'] },
      { id: 'cansancio', nombre: { es: 'Cansancio y agotamiento', en: 'Weariness and burnout' }, citas: ['MAT.11.28-30', 'ISA.40.29-31', 'PSA.23.1-3', 'GAL.6.9', '2CO.12.9-10', 'PSA.62.1-2', 'EXO.33.14', 'PSA.127.2'] },
      { id: 'duelo', nombre: { es: 'Duelo y pérdida', en: 'Grief and loss' }, citas: ['PSA.34.18', 'MAT.5.4', 'REV.21.4', '1TH.4.13-14', 'JHN.11.25-26', 'PSA.116.15', 'JHN.14.1-3', 'PSA.23.4'] },
      { id: 'desanimo', nombre: { es: 'Desánimo', en: 'Discouragement' }, citas: ['JOS.1.9', 'PSA.42.5', 'ISA.40.31', '2CO.4.16-18', 'PSA.27.13-14', 'ROM.8.28', 'PHP.4.13', 'PSA.73.26'] },
      { id: 'esperanza', nombre: { es: 'Esperanza', en: 'Hope' }, citas: ['ROM.15.13', 'JER.29.11', 'LAM.3.21-24', 'ROM.8.24-25', 'HEB.6.19', 'PSA.71.5', '1PE.1.3', 'ROM.5.3-5'] },
      { id: 'paz', nombre: { es: 'Paz interior', en: 'Inner peace' }, citas: ['JHN.14.27', 'ISA.26.3', 'COL.3.15', 'PSA.4.8', 'ROM.5.1', 'JHN.16.33', 'NUM.6.24-26', 'PSA.29.11'] },
      { id: 'identidad', nombre: { es: 'Identidad y valor propio', en: 'Identity and self-worth' }, citas: ['PSA.139.13-16', 'GEN.1.27', 'EPH.2.10', '1PE.2.9', 'JHN.1.12', '2CO.5.17', 'ROM.8.15-17', 'MAT.10.29-31'] },
    ],
  },
  {
    id: 'relaciones',
    nombre: { es: 'Relaciones', en: 'Relationships' },
    temas: [
      { id: 'matrimonio', nombre: { es: 'Matrimonio', en: 'Marriage' }, citas: ['GEN.2.24', 'EPH.5.25-33', '1CO.13.4-7', 'COL.3.18-19', 'ECC.4.9-12', 'PRO.18.22', 'HEB.13.4', 'MRK.10.6-9'] },
      { id: 'hijos', nombre: { es: 'Hijos y crianza', en: 'Children and parenting' }, citas: ['PRO.22.6', 'DEU.6.6-7', 'PSA.127.3-5', 'EPH.6.4', 'COL.3.21', 'PRO.29.17', '3JN.1.4', 'MRK.10.14-16'] },
      { id: 'padres', nombre: { es: 'Honrar a los padres', en: 'Honoring parents' }, citas: ['EXO.20.12', 'EPH.6.1-3', 'PRO.1.8-9', 'PRO.23.22', 'COL.3.20', 'LEV.19.3', '1TI.5.4', 'PRO.6.20-22'] },
      { id: 'amistad', nombre: { es: 'Amistad', en: 'Friendship' }, citas: ['PRO.17.17', 'PRO.27.17', 'JHN.15.12-15', 'ECC.4.9-10', 'PRO.18.24', 'PRO.27.9', '1SA.18.1-3', 'PRO.13.20'] },
      { id: 'perdonar', nombre: { es: 'Perdonar a otros', en: 'Forgiving others' }, citas: ['MAT.6.14-15', 'EPH.4.31-32', 'COL.3.13', 'MAT.18.21-22', 'LUK.6.37', 'MRK.11.25', 'ROM.12.17-21', 'LUK.17.3-4'] },
      { id: 'conflictos', nombre: { es: 'Conflictos', en: 'Conflict' }, citas: ['MAT.18.15-17', 'ROM.12.18', 'MAT.5.9', 'MAT.5.23-24', 'JAS.3.17-18', 'PHP.2.3-4', 'PRO.17.14', 'PRO.15.18'] },
      { id: 'amor', nombre: { es: 'Amor al prójimo', en: 'Loving others' }, citas: ['1CO.13.1-13', 'JHN.13.34-35', '1JN.4.7-12', 'MAT.22.37-39', 'ROM.13.8-10', 'LUK.10.30-37', 'GAL.6.2', '1JN.3.18'] },
      { id: 'pureza', nombre: { es: 'Noviazgo y pureza', en: 'Dating and purity' }, citas: ['1CO.6.18-20', '1TH.4.3-5', '2CO.6.14', 'PSA.119.9', 'SNG.8.4', '1TI.4.12', 'PRO.4.23', '2TI.2.22'] },
    ],
  },
  {
    id: 'pruebas',
    nombre: { es: 'Pruebas y necesidades', en: 'Trials and needs' },
    temas: [
      { id: 'enfermedad', nombre: { es: 'Enfermedad y sanidad', en: 'Illness and healing' }, citas: ['JAS.5.14-16', 'ISA.53.4-5', 'PSA.103.2-3', 'JER.17.14', 'PSA.41.3', 'EXO.15.26', 'MAT.8.16-17', 'PSA.30.2'] },
      { id: 'provision', nombre: { es: 'Dinero y provisión', en: 'Money and provision' }, citas: ['PHP.4.19', 'MAT.6.31-33', 'PSA.37.25', 'PRO.3.9-10', 'MAL.3.10', '1TI.6.6-10', 'PRO.22.7', 'LUK.12.15'] },
      { id: 'trabajo', nombre: { es: 'Trabajo', en: 'Work' }, citas: ['COL.3.23-24', 'PRO.16.3', 'PSA.90.17', 'ECC.9.10', 'PRO.14.23', '2TH.3.10-12', 'PRO.12.24', '1CO.15.58'] },
      { id: 'decisiones', nombre: { es: 'Decisiones y sabiduría', en: 'Decisions and wisdom' }, citas: ['JAS.1.5', 'PRO.2.6', 'PRO.11.14', 'PSA.37.5', 'PRO.15.22', 'COL.1.9-10', 'PRO.19.21', 'PSA.25.4-5'] },
      { id: 'sufrimiento', nombre: { es: 'Sufrimiento y pruebas', en: 'Suffering and trials' }, citas: ['JAS.1.2-4', 'ROM.8.28', '1PE.1.6-7', '2CO.4.17-18', 'ROM.8.18', 'PSA.46.1-3', '1PE.5.10', 'JHN.16.33'] },
      { id: 'proteccion', nombre: { es: 'Protección', en: 'Protection' }, citas: ['PSA.91.1-16', 'PSA.121.1-8', 'PSA.46.1', 'ISA.54.17', '2TH.3.3', 'PRO.18.10', 'PSA.34.7', 'NAM.1.7'] },
      { id: 'paciencia', nombre: { es: 'Paciencia y espera', en: 'Patience and waiting' }, citas: ['PSA.27.14', 'ISA.40.31', 'LAM.3.25-26', 'PSA.37.7', 'ROM.12.12', 'HAB.2.3', 'JAS.5.7-8', 'PSA.40.1'] },
      { id: 'ataduras', nombre: { es: 'Adicciones y ataduras', en: 'Addiction and bondage' }, citas: ['1CO.10.13', 'JHN.8.34-36', 'ROM.6.12-14', 'GAL.5.1', '1CO.6.12', '2CO.5.17', 'ROM.13.14', 'PSA.107.13-14'] },
    ],
  },
  {
    id: 'caracter',
    nombre: { es: 'Carácter', en: 'Character' },
    temas: [
      { id: 'humildad', nombre: { es: 'Humildad', en: 'Humility' }, citas: ['PHP.2.3-8', 'JAS.4.6', 'JAS.4.10', 'PRO.11.2', '1PE.5.5-6', 'MIC.6.8', 'MAT.23.12', 'PRO.22.4'] },
      { id: 'honestidad', nombre: { es: 'Honestidad', en: 'Honesty' }, citas: ['PRO.12.22', 'EPH.4.25', 'COL.3.9', 'PRO.11.3', 'LUK.16.10', 'PSA.15.1-2', 'PRO.19.1', 'EXO.20.16'] },
      { id: 'generosidad', nombre: { es: 'Generosidad', en: 'Generosity' }, citas: ['2CO.9.6-8', 'ACT.20.35', 'PRO.11.24-25', 'LUK.6.38', 'PRO.19.17', '1TI.6.17-19', 'MAT.6.2-4', 'HEB.13.16'] },
      { id: 'dominio-propio', nombre: { es: 'Dominio propio', en: 'Self-control' }, citas: ['PRO.25.28', 'GAL.5.22-23', '1CO.9.25-27', '2PE.1.5-7', 'TIT.2.11-12', 'PRO.16.32', '2TI.1.7', '1PE.5.8'] },
      { id: 'perseverancia', nombre: { es: 'Perseverancia', en: 'Perseverance' }, citas: ['HEB.12.1-3', 'GAL.6.9', 'JAS.1.12', 'PHP.3.13-14', '2TI.4.7-8', 'ROM.5.3-4', 'HEB.10.35-36', '1CO.15.58'] },
      { id: 'palabras', nombre: { es: 'Lo que decimos', en: 'What we say' }, citas: ['PRO.18.21', 'EPH.4.29', 'JAS.3.5-10', 'PRO.15.4', 'PSA.19.14', 'COL.4.6', 'PRO.10.19', 'PSA.141.3'] },
      { id: 'contentamiento', nombre: { es: 'Envidia y contentamiento', en: 'Envy and contentment' }, citas: ['PHP.4.11-13', '1TI.6.6-8', 'HEB.13.5', 'PRO.14.30', 'JAS.3.16', 'EXO.20.17', 'GAL.5.26', 'PSA.37.1-4'] },
    ],
  },
];

// "PSA.23.1-4" → {libro:'PSA', cap:23, vers:1, hasta:4}
export function leerCita(cita) {
  const m = /^([0-9A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(cita);
  if (!m) return null;
  return { libro: m[1], cap: Number(m[2]), vers: Number(m[3]), hasta: Number(m[4] ?? m[3]) };
}
