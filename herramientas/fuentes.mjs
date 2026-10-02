// Catálogo de las versiones incluidas: de dónde sale cada una y bajo qué
// licencia. La licencia de cada versión se comprobó en su página de eBible.org.

const CAMBIOS = 'Se omiten las notas al pie. El texto no se ha modificado.';
const DOMINIO = 'Dominio público';
const ebible = (id) => `https://ebible.org/${id}/copr.htm`;

export const VERSIONES = [
  {
    id: 'rv1909', helloao: 'spa_r09', sigla: 'RV1909', nombre: 'Reina-Valera 1909', idioma: 'es',
    descripcion: {
      es: 'La Reina-Valera clásica. Lenguaje solemne y ortografía de su época.',
      en: 'The classic Reina-Valera. Solemn language in period spelling.',
    },
    licencia: DOMINIO, licenciaUrl: ebible('spaRV1909'),
    aviso: 'Reina-Valera 1909. Dominio público.',
  },
  {
    id: 'rvg', helloao: 'spa_rvg', sigla: 'RVG', nombre: 'Reina Valera Gómez', idioma: 'es',
    descripcion: {
      es: 'Revisión moderna de la Reina-Valera, fiel a su estilo tradicional.',
      en: 'A modern revision of the Reina-Valera in its traditional style.',
    },
    licencia: 'Distribución gratuita permitida sin modificar el texto', licenciaUrl: ebible('sparvg'),
    aviso: 'Santa Biblia Reina Valera Gómez. Copyright © 2004, 2010, 2023 Dr. Humberto Gómez Caballero. '
      + 'Derechos reservados. Prohibida su reproducción con fines de lucro. Se reproduce aquí para su '
      + 'distribución gratuita, sin cambiar ninguna de sus palabras.',
  },
  {
    id: 'nbv', helloao: 'spa_onbv', sigla: 'NBV', nombre: 'Nueva Biblia Viva', idioma: 'es',
    descripcion: {
      es: 'Lenguaje actual y fluido, pensada para entenderse a la primera.',
      en: 'Contemporary, flowing Spanish meant to be understood at first reading.',
    },
    licencia: 'CC BY-SA 4.0', licenciaUrl: ebible('spaonbv'),
    aviso: 'Biblica® Open Nueva Biblia Viva™. Copyright © 2006, 2008 by Biblica, Inc. '
      + '«Biblica» es una marca registrada en la oficina de Patentes y Marcas de los Estados Unidos por '
      + 'Biblica, Inc. Usado con permiso. Licencia Creative Commons Atribución-CompartirIgual 4.0 '
      + '(https://creativecommons.org/licenses/by-sa/4.0). The original Work by its copyright holders '
      + 'is available for free at www.biblica.com and open.bible.',
  },
  {
    id: 'vbl', helloao: 'spa_vbl', sigla: 'VBL', nombre: 'Versión Biblia Libre', idioma: 'es',
    descripcion: {
      es: 'Traducción reciente en español claro y directo.',
      en: 'A recent translation in clear, direct Spanish.',
    },
    licencia: 'CC BY-SA 4.0', licenciaUrl: ebible('spavbl'),
    aviso: 'Versión Biblia Libre. Copyright © 2018-2020 Jonathan Gallagher y Shelly Barrios de Avila. '
      + 'Licencia Creative Commons Atribución-CompartirIgual 4.0 '
      + '(https://creativecommons.org/licenses/by-sa/4.0).',
  },
  {
    id: 'pddpt', helloao: 'spa_pdt', sigla: 'PDDPT', nombre: 'Palabra de Dios para ti', idioma: 'es',
    descripcion: {
      es: 'Traducción literal latinoamericana, con títulos y poesía en verso.',
      en: 'A literal Latin American translation with headings and verse layout.',
    },
    licencia: 'CC BY 4.0', licenciaUrl: ebible('spapddpt'),
    aviso: 'Palabra de Dios para ti. Copyright © 2020 Asociación Bíblica Latinoamericana. '
      + 'Licencia Creative Commons Atribución 4.0 (https://creativecommons.org/licenses/by/4.0).',
  },
  {
    id: 'kjv', helloao: 'eng_kjv', sigla: 'KJV', nombre: 'King James Version', idioma: 'en',
    descripcion: {
      es: 'La versión inglesa clásica de 1611, en su texto de 1769.',
      en: 'The classic English Bible of 1611, in its 1769 text.',
    },
    licencia: DOMINIO, licenciaUrl: ebible('eng-kjv2006'),
    aviso: 'King James (Authorized) Version. Public domain.',
  },
  {
    id: 'bsb', helloao: 'BSB', sigla: 'BSB', nombre: 'Berean Standard Bible', idioma: 'en',
    descripcion: {
      es: 'Inglés moderno, equilibrado entre fidelidad y claridad.',
      en: 'Modern English, balanced between accuracy and clarity.',
    },
    licencia: DOMINIO, licenciaUrl: 'https://berean.bible/licensing.htm',
    aviso: 'Berean Standard Bible. Public domain since April 30, 2023.',
  },
  {
    id: 'web', helloao: 'ENGWEBP', sigla: 'WEB', nombre: 'World English Bible', idioma: 'en',
    descripcion: {
      es: 'Actualización en inglés moderno de la American Standard Version.',
      en: 'A modern English update of the American Standard Version.',
    },
    licencia: DOMINIO, licenciaUrl: ebible('engwebp'),
    aviso: 'World English Bible. Public domain. «World English Bible» is a trademark of eBible.org.',
  },
  {
    id: 'asv', helloao: 'eng_asv', sigla: 'ASV', nombre: 'American Standard Version', idioma: 'en',
    descripcion: {
      es: 'Traducción literal de 1901, muy apreciada para el estudio.',
      en: 'The literal translation of 1901, long valued for study.',
    },
    licencia: DOMINIO, licenciaUrl: ebible('eng-asv'),
    aviso: 'American Standard Version (1901). Public domain.',
  },
  {
    id: 'lsv', helloao: 'eng_lsv', sigla: 'LSV', nombre: 'Literal Standard Version', idioma: 'en',
    descripcion: {
      es: 'Traducción muy literal en inglés actual.',
      en: 'A highly literal translation in present-day English.',
    },
    licencia: 'CC BY-SA 4.0', licenciaUrl: ebible('englsv'),
    aviso: 'Literal Standard Version. Copyright © 2020 Covenant Press. '
      + 'Creative Commons Attribution-ShareAlike 4.0 license '
      + '(https://creativecommons.org/licenses/by-sa/4.0).',
  },
].map((v) => ({ ...v, cambios: CAMBIOS, fuente: `https://bible.helloao.org/api/${v.helloao}/complete.json` }));

export const REFS = {
  url: 'https://a.openbible.info/data/cross-references.zip',
  aviso: 'Referencias cruzadas de OpenBible.info, licencia CC BY 4.0 (https://www.openbible.info/labs/cross-references/).',
  minVotos: 3,
  maxPorVersiculo: 12,
};
