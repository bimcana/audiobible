// Hojas para añadir una Biblia propia y para gestionar las ya añadidas.
import { t } from '../i18n/textos.js';
import { nombreLibro } from '../referencia/nombres.js';
import { importarArchivos, empaquetar, fichaDe } from '../importar/importador.js';
import { validarImportada } from '../importar/validar.js';
import { guardarPropia, borrarPropia, leerLibrosPropios } from '../almacen/propias.js';
import { abrirHoja, cerrarHoja, el, pastillas } from './hoja.js';

const SUBIR = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

const mensajeDe = (codigo) => t({
  vacio: 'imp.error.vacio', mezcla: 'imp.error.mezcla', traspaso: 'imp.error.traspaso', tipo: 'imp.error.tipo', pdf: 'imp.error.pdf',
}[codigo] ?? 'imp.error.general');

// existente: ficha de una versión propia a la que se añaden más archivos.
export function abrirImportador({ idioma, existente = null, alTerminar, volver = null }) {
  const titulo = existente ? t('imp.anadirA', { version: existente.nombre }) : t('imp.titulo');

  function pedirArchivos(error = '') {
    const entrada = el('input', { type: 'file', accept: '.pdf,.audiobible,application/pdf', multiple: true, hidden: true });
    const zona = el('button', { type: 'button', class: 'soltar', onclick: () => entrada.click() });
    zona.innerHTML = SUBIR;
    zona.append(el('strong', { text: t('imp.elegir') }), el('span', { text: t('imp.formatos') }));
    entrada.addEventListener('change', () => { if (entrada.files.length) leer(entrada.files); });
    for (const tipo of ['dragenter', 'dragover']) {
      zona.addEventListener(tipo, (e) => { e.preventDefault(); zona.classList.add('encima'); });
    }
    zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
    zona.addEventListener('drop', (e) => {
      e.preventDefault();
      zona.classList.remove('encima');
      if (e.dataTransfer.files.length) leer(e.dataTransfer.files);
    });

    abrirHoja({
      titulo,
      volver,
      contenido: el('div', {},
        el('p', { class: 'nota', text: t('imp.explica') }),
        el('div', { class: 'aire' }),
        zona, entrada,
        error ? el('p', { class: 'nota campo-error', role: 'alert', text: error }) : null,
        el('p', { class: 'nota', text: t('imp.privado') })),
    });
  }

  async function leer(archivos) {
    const barra = el('div', { class: 'progreso' }, el('div'));
    const estado = el('p', { class: 'nota', role: 'status', text: t('imp.preparando') });
    abrirHoja({ titulo, contenido: el('div', {}, estado, barra) });

    let resultado;
    try {
      resultado = await importarArchivos(archivos, {
        alAvanzar({ archivo, indice, total, pagina, paginas }) {
          estado.textContent = t('imp.leyendo', { archivo, n: indice + 1, total, pagina, paginas });
          barra.firstChild.style.width = `${((indice + pagina / paginas) / total) * 100}%`;
        },
      });
    } catch (err) {
      pedirArchivos(mensajeDe(err.codigo));
      return;
    }
    if (!resultado.libros.length) { pedirArchivos(t('imp.error.nada')); return; }

    // Si se añade a una versión que ya existe, el informe es el del conjunto.
    let libros = resultado.libros;
    if (existente) {
      const nuevos = new Set(libros.map((l) => l.id));
      const previos = (await leerLibrosPropios(existente.id)).filter((l) => !nuevos.has(l.id));
      libros = [...previos, ...libros];
    }
    revisar(resultado, libros, validarImportada(libros));
  }

  function revisar(resultado, libros, informe) {
    const c = informe.cifras;
    const sugerida = existente ?? resultado.sugerencia ?? {};
    const nombre = el('input', { class: 'campo', value: sugerida.nombre ?? '', placeholder: t('imp.nombreEj'), 'aria-label': t('imp.nombre'), maxlength: 60 });
    const sigla = el('input', { class: 'campo', value: sugerida.sigla ?? '', placeholder: t('imp.siglaEj'), 'aria-label': t('imp.sigla'), maxlength: 8 });
    let lengua = sugerida.idioma ?? idioma;

    const cuerpo = el('div', {},
      el('p', { class: 'resumen', text: t('imp.resumen', { libros: c.libros, capitulos: c.capitulos, versiculos: c.versiculos.toLocaleString(idioma) }) }));

    if (informe.faltan.length && informe.faltan.length < 66) {
      cuerpo.append(el('p', { class: 'nota', text: t('imp.faltan', { n: informe.faltan.length, lista: informe.faltan.map((id) => nombreLibro(id, idioma)).join(', ') }) }));
    }
    if (informe.errores.length) {
      cuerpo.append(
        el('p', { class: 'nota campo-error', role: 'alert', text: t('imp.conErrores', { n: informe.errores.length }) }),
        el('details', {}, el('summary', { text: t('imp.verDetalle') }), el('pre', { text: informe.errores.slice(0, 60).join('\n') })));
    } else if (informe.avisos.length) {
      cuerpo.append(
        el('p', { class: 'nota', text: t('imp.conAvisos', { n: informe.avisos.length }) }),
        el('details', {}, el('summary', { text: t('imp.verDetalle') }), el('pre', { text: informe.avisos.slice(0, 60).join('\n') })));
    }

    const guardar = el('button', { class: 'boton', type: 'submit', text: t(existente ? 'imp.guardarCambios' : 'imp.guardar') });
    cuerpo.append(
      el('form', {
        class: 'ficha-version',
        onsubmit: async (e) => {
          e.preventDefault();
          guardar.disabled = true;
          const meta = fichaDe({
            id: existente?.id ?? `propia-${Date.now().toString(36)}`,
            nombre: nombre.value, sigla: sigla.value, idioma: lengua,
          }, informe, existente);
          try {
            await guardarPropia(meta, resultado.libros);
          } catch {
            guardar.disabled = false;
            cuerpo.append(el('p', { class: 'nota campo-error', role: 'alert', text: t('imp.error.guardar') }));
            return;
          }
          cerrarHoja();
          alTerminar(meta);
        },
      },
      el('h3', { text: t('imp.nombre') }), nombre,
      el('h3', { text: t('imp.sigla') }), sigla,
      el('h3', { text: t('imp.idioma') }),
      pastillas([['es', 'Español'], ['en', 'English']], lengua, (v) => { lengua = v; }),
      el('div', { class: 'aire' }),
      guardar));

    abrirHoja({ titulo, contenido: cuerpo });
    nombre.focus();
  }

  pedirArchivos();
}

// Gestión de una versión propia: añadir archivos, llevarla a otro dispositivo, quitarla.
export function abrirGestion({ version, idioma, alCambiar, alQuitar, volver }) {
  const aviso = el('p', { class: 'nota', role: 'status' });

  async function exportar(boton) {
    boton.disabled = true;
    aviso.textContent = t('imp.empaquetando');
    try {
      const paquete = await empaquetar(version, await leerLibrosPropios(version.id));
      const enlace = el('a', { href: URL.createObjectURL(paquete), download: `${version.sigla}.audiobible` });
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 30000);
      aviso.textContent = t('imp.empaquetado');
    } catch {
      aviso.textContent = t('imp.error.general');
    }
    boton.disabled = false;
  }

  let confirmar = false;
  const quitar = el('button', {
    type: 'button', class: 'opcion peligro',
    onclick: async () => {
      if (!confirmar) {
        confirmar = true;
        quitar.querySelector('strong').textContent = t('imp.quitarSeguro', { version: version.nombre });
        return;
      }
      await borrarPropia(version.id);
      cerrarHoja();
      alQuitar(version);
    },
  }, el('span', {}), el('span', {}, el('strong', { text: t('imp.quitar') }), el('small', { text: t('imp.quitarNota') })));

  const cuerpo = el('div', {},
    el('p', { class: 'resumen', text: t('imp.resumenCorto', { libros: version.libros ?? '—', versiculos: (version.versiculos ?? 0).toLocaleString(idioma) }) }),
    el('div', { class: 'lista' },
      el('button', {
        type: 'button', class: 'opcion',
        onclick: () => abrirImportador({ idioma, existente: version, alTerminar: alCambiar, volver: () => abrirGestion({ version, idioma, alCambiar, alQuitar, volver }) }),
      }, el('span', {}), el('span', {}, el('strong', { text: t('imp.masArchivos') }), el('small', { text: t('imp.masArchivosNota') }))),
      el('button', {
        type: 'button', class: 'opcion', onclick: (e) => exportar(e.currentTarget),
      }, el('span', {}), el('span', {}, el('strong', { text: t('imp.llevar') }), el('small', { text: t('imp.llevarNota') }))),
      quitar),
    aviso);

  abrirHoja({ titulo: version.nombre, contenido: cuerpo, volver });
}
