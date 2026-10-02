// Hoja de licencias y créditos: el aviso de cada versión incluida y de lo
// demás que la app usa. Varias licencias obligan a mostrarlo.
import { t } from '../i18n/textos.js';
import { abrirHoja, el } from './hoja.js';

const OTROS = [
  ['Referencias cruzadas · Cross-references', 'OpenBible.info · CC BY 4.0', 'https://www.openbible.info/labs/cross-references/'],
  ['Catálogo de textos · Text catalogue', 'eBible.org · Free Use Bible API (helloao.org)', 'https://ebible.org/'],
  ['Voces · Voices', 'Microsoft Edge neural voices', null],
  ['pdf.js', 'Mozilla Foundation · Apache License 2.0', 'https://mozilla.github.io/pdf.js/'],
  ['Gentium Book Plus', 'SIL International · SIL Open Font License 1.1', 'https://software.sil.org/gentium/'],
  ['Cormorant Garamond', 'Christian Thalmann · SIL Open Font License 1.1', null],
  ['Instrument Sans', 'Instrument · SIL Open Font License 1.1', null],
  ['Atkinson Hyperlegible Next', 'Braille Institute · SIL Open Font License 1.1', null],
];

export function abrirLicencias({ catalogo, volver }) {
  const cuerpo = el('div', {}, el('p', { class: 'nota', text: t('lic.intro') }));

  cuerpo.append(el('h3', { text: t('lic.versiones') }));
  for (const v of catalogo.filter((x) => !x.propia)) {
    const enlace = el('a', { href: v.licenciaUrl, target: '_blank', rel: 'noopener', text: t('lic.fuente') });
    cuerpo.append(el('section', { class: 'licencia' },
      el('strong', { text: `${v.nombre} (${v.sigla})` }),
      el('p', { class: 'nota', text: v.licencia }),
      el('p', { class: 'aviso-legal', text: v.aviso }),
      el('p', { class: 'nota' }, v.cambios, ' ', enlace)));
  }

  cuerpo.append(el('h3', { text: t('lic.otros') }));
  for (const [nombre, credito, url] of OTROS) {
    cuerpo.append(el('section', { class: 'licencia' },
      el('strong', { text: nombre }),
      el('p', { class: 'nota' }, credito, url ? ' · ' : null, url ? el('a', { href: url, target: '_blank', rel: 'noopener', text: new URL(url).hostname }) : null)));
  }

  cuerpo.append(el('h3', { text: t('lic.app') }), el('p', { class: 'nota', text: t('lic.appNota') }));
  abrirHoja({ titulo: t('lic.titulo'), contenido: cuerpo, volver });
}
