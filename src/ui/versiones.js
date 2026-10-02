// Hoja «Versión»: las incluidas, por idioma, y enlaces de salida a bible.com
// para las que tienen derechos de autor.
import { t } from '../i18n/textos.js';
import { abrirHoja, cerrarHoja, el } from './hoja.js';

// Identificadores de bible.com, comprobados uno a uno.
const FUERA = [
  { sigla: 'RVR1960', nombre: 'Reina-Valera 1960', id: 149, idioma: 'es' },
  { sigla: 'RVR95', nombre: 'Reina-Valera 1995', id: 150, idioma: 'es' },
  { sigla: 'NVI', nombre: 'Nueva Versión Internacional', id: 128, idioma: 'es' },
  { sigla: 'NTV', nombre: 'Nueva Traducción Viviente', id: 127, idioma: 'es' },
  { sigla: 'DHH94I', nombre: 'Dios Habla Hoy', id: 52, idioma: 'es', etiqueta: 'DHH' },
  { sigla: 'NIV', nombre: 'New International Version', id: 111, idioma: 'en' },
  { sigla: 'ESV', nombre: 'English Standard Version', id: 59, idioma: 'en' },
  { sigla: 'NKJV', nombre: 'New King James Version', id: 114, idioma: 'en' },
];

const FLECHA = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

export function abrirVersiones({ catalogo, idioma, actual, libro, cap, alElegir }) {
  const cuerpo = el('div');
  // Primero el idioma de la interfaz.
  const orden = idioma === 'en' ? ['en', 'es'] : ['es', 'en'];

  for (const lengua of orden) {
    cuerpo.append(el('h3', { text: t(`ver.${lengua}`) }));
    const lista = el('div', { class: 'lista' });
    for (const v of catalogo.filter((x) => x.idioma === lengua)) {
      lista.append(el('button', {
        type: 'button', class: 'opcion', 'aria-current': v.id === actual ? 'true' : null,
        onclick: () => { cerrarHoja(); alElegir(v.id); },
      },
      el('span', { class: 'sigla', text: v.sigla }),
      el('span', {}, el('strong', { text: v.nombre }), el('small', { text: v.descripcion[idioma] ?? v.descripcion.es }))));
    }
    cuerpo.append(lista);
  }

  cuerpo.append(el('h3', { text: t('ver.fuera') }), el('p', { class: 'nota', text: t('ver.fueraNota') }));
  const enlaces = el('div', { class: 'lista' });
  for (const v of FUERA.toSorted((a, b) => orden.indexOf(a.idioma) - orden.indexOf(b.idioma))) {
    const a = el('a', {
      class: 'opcion enlace', target: '_blank', rel: 'noopener',
      href: `https://www.bible.com/bible/${v.id}/${libro}.${cap}.${v.sigla}`,
      'aria-label': t('ver.abrir', { version: v.nombre }),
    }, el('span', { class: 'sigla', text: v.etiqueta ?? v.sigla }), el('span', {}, el('strong', { text: v.nombre })));
    a.insertAdjacentHTML('beforeend', FLECHA);
    enlaces.append(a);
  }
  cuerpo.append(enlaces);

  abrirHoja({ titulo: t('ver.titulo'), contenido: cuerpo });
  cuerpo.querySelector('[aria-current="true"]')?.focus();
}
