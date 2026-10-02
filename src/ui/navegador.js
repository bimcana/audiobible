// Hoja «Ir a»: campo que entiende referencias escritas, libros por grupo y
// rejilla de capítulos.
import { GRUPOS, nombreLibro } from '../referencia/nombres.js';
import { libro as datosLibro } from '../referencia/canon.js';
import { analizarReferencia } from '../referencia/analizar.js';
import { t } from '../i18n/textos.js';
import { abrirHoja, cerrarHoja, el } from './hoja.js';

export function abrirNavegador({ idioma, actual, alIr }) {
  const ir = (libro, cap, vers = null) => { cerrarHoja(); alIr(libro, cap, vers); };

  function campoDeReferencia() {
    const error = el('p', { class: 'nota campo-error', role: 'alert' });
    const campo = el('input', {
      class: 'campo', type: 'search', placeholder: t('nav.buscar'), 'aria-label': t('nav.buscar'),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go',
    });
    const formulario = el('form', {
      onsubmit: (e) => {
        e.preventDefault();
        const r = analizarReferencia(campo.value, idioma);
        if (!r) { error.textContent = t('nav.noEncontrado'); return; }
        if (r.cap === null && datosLibro(r.libro).caps > 1) verCapitulos(r.libro);
        else ir(r.libro, r.cap ?? 1, r.vers);
      },
    }, campo, el('p', { class: 'nota', text: t('nav.ejemplo') }), error);
    campo.addEventListener('input', () => { error.textContent = ''; });
    return formulario;
  }

  function verLibros() {
    const cuerpo = el('div', {}, campoDeReferencia());
    let testamento = null;
    for (const grupo of GRUPOS) {
      if (grupo.t !== testamento) {
        testamento = grupo.t;
        cuerpo.append(el('h3', { text: t(testamento === 'AT' ? 'nav.at' : 'nav.nt') }));
      }
      cuerpo.append(el('h4', { text: t(`grupo.${grupo.id}`) }));
      const rejilla = el('div', { class: 'rejilla', role: 'group', 'aria-label': t(`grupo.${grupo.id}`) });
      for (const id of grupo.libros) {
        rejilla.append(el('button', {
          type: 'button', text: nombreLibro(id, idioma), 'aria-current': id === actual.libro ? 'true' : null,
          onclick: () => (datosLibro(id).caps === 1 ? ir(id, 1) : verCapitulos(id)),
        }));
      }
      cuerpo.append(rejilla);
    }
    abrirHoja({ titulo: t('nav.titulo'), contenido: cuerpo, ancha: true });
    cuerpo.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
  }

  function verCapitulos(id) {
    const rejilla = el('div', { class: 'rejilla numeros', role: 'group', 'aria-label': t('nav.capitulos', { libro: nombreLibro(id, idioma) }) });
    for (let cap = 1; cap <= datosLibro(id).caps; cap++) {
      rejilla.append(el('button', {
        type: 'button', text: String(cap),
        'aria-current': id === actual.libro && cap === actual.cap ? 'true' : null,
        onclick: () => ir(id, cap),
      }));
    }
    abrirHoja({
      titulo: nombreLibro(id, idioma), ancha: true, volver: verLibros,
      contenido: el('div', {}, campoDeReferencia(), el('h3', { text: t('nav.capitulos', { libro: nombreLibro(id, idioma) }) }), rejilla),
    });
    (rejilla.querySelector('[aria-current="true"]') ?? rejilla.firstElementChild).focus();
  }

  // Con varios capítulos, lo habitual es moverse dentro del libro abierto.
  if (datosLibro(actual.libro).caps > 1) verCapitulos(actual.libro);
  else verLibros();
}
