// Hojas de voz, velocidad, temporizador, texto y ajustes generales. Cada una
// recibe el estado actual y avisa de los cambios; ninguna guarda nada.
import { t } from '../i18n/textos.js';
import { VELOCIDAD_MINIMA, VELOCIDAD_MAXIMA } from '../voz/velocidad.js';
import { abrirHoja, cerrarHoja, el, pastillas, interruptor } from './hoja.js';

const ALTAVOZ = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

// --- voz ---

export function abrirVoces({ voces, idioma, actual, alElegir, alProbar }) {
  const delIdioma = voces.filter((v) => v.lang === idioma);
  const regiones = [...new Set(delIdioma.map((v) => v.region))];
  let region = delIdioma.find((v) => v.id === actual)?.region ?? '';

  const lista = el('div', { class: 'lista' });
  const pintar = () => {
    lista.replaceChildren();
    for (const v of delIdioma.filter((x) => !region || x.region === region)) {
      const elegir = el('button', {
        type: 'button', class: 'opcion', role: 'radio', 'aria-checked': String(v.id === actual),
        onclick: () => { actual = v.id; alElegir(v); pintar(); },
      }, el('span', {},
        el('strong', { text: v.name.replace(/Multilingual$/, '') }),
        el('small', { text: [v.region, t(v.gender === 'F' ? 'voz.mujer' : 'voz.hombre'), /Multilingual$/.test(v.name) ? t('voz.multi') : null].filter(Boolean).join(' · ') })));
      const probar = el('button', {
        type: 'button', class: 'icono', 'aria-label': t('voz.probar', { nombre: v.name.replace(/Multilingual$/, '') }),
        onclick: () => alProbar(v),
      });
      probar.innerHTML = ALTAVOZ;
      lista.append(el('div', { class: 'fila-voz' }, elegir, probar));
    }
  };

  const filtro = pastillas([['', t('voz.todas')], ...regiones.map((r) => [r, r])], region, (r) => { region = r; pintar(); });
  pintar();
  abrirHoja({
    titulo: t('voz.titulo'),
    contenido: el('div', {}, el('p', { class: 'nota', text: t('voz.nota') }), el('div', { class: 'aire' }), filtro, el('div', { class: 'aire' }), lista),
  });
}

// --- velocidad ---

const etiquetaVelocidad = (v) => `${v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}×`;
export { etiquetaVelocidad };

export function abrirVelocidad({ actual, alCambiar }) {
  const salida = el('output', { text: etiquetaVelocidad(actual) });
  const rango = el('input', {
    type: 'range', min: VELOCIDAD_MINIMA, max: VELOCIDAD_MAXIMA, step: 0.05, value: actual, 'aria-label': t('velocidad'),
  });
  const atajos = pastillas(
    [0.75, 1, 1.25, 1.5, 2].map((v) => [v, v === 1 ? t('vel.normal') : etiquetaVelocidad(v)]),
    actual,
    (v) => { rango.value = v; salida.textContent = etiquetaVelocidad(Number(v)); alCambiar(Number(v)); },
  );
  rango.addEventListener('input', () => { salida.textContent = etiquetaVelocidad(Number(rango.value)); });
  rango.addEventListener('change', () => {
    alCambiar(Number(rango.value));
    for (const b of atajos.children) b.setAttribute('aria-pressed', String(Number(b.dataset.valor) === Number(rango.value)));
  });
  abrirHoja({
    titulo: t('velocidad'),
    contenido: el('div', {}, el('div', { class: 'deslizador' }, el('span', { text: '0,5×', class: 'chica' }), rango, salida), el('div', { class: 'aire' }), atajos),
  });
}

// --- temporizador ---

export function abrirTemporizador({ actual, alElegir }) {
  const opciones = [
    [null, t('temp.apagado')],
    [15, t('temp.minutos', { n: 15 })],
    [30, t('temp.minutos', { n: 30 })],
    [60, t('temp.minutos', { n: 60 })],
    ['capitulo', t('temp.capitulo')],
  ];
  const lista = el('div', { class: 'lista', role: 'radiogroup', 'aria-label': t('temporizador') });
  for (const [valor, texto] of opciones) {
    lista.append(el('button', {
      type: 'button', class: 'opcion', role: 'radio', 'aria-checked': String(valor === actual),
      onclick: () => { cerrarHoja(); alElegir(valor); },
    }, el('span', {}), el('span', {}, el('strong', { text: texto }))));
  }
  abrirHoja({ titulo: t('temporizador'), contenido: lista });
}

// --- texto: cómo se ve la página ---

const TEMAS = [
  ['papel', '#F6F5F1', '#1C1B18'],
  ['sepia', '#EFE6D2', '#33291A'],
  ['noche', '#15171B', '#E6E3DC'],
  ['negro', '#000000', '#E2DFD8'],
];
export const COLOR_DE_TEMA = Object.fromEntries(TEMAS.map(([id, fondo]) => [id, fondo]));

function seccionPagina(ajustes, cambiar) {
  const temas = el('div', { class: 'temas', role: 'group', 'aria-label': t('aj.tema') });
  for (const [id, fondo, tinta] of TEMAS) {
    const muestra = el('span', { class: 'muestra', text: 'Aa', 'aria-hidden': 'true' });
    muestra.style.background = fondo;
    muestra.style.color = tinta;
    temas.append(el('button', {
      type: 'button', 'aria-pressed': String(ajustes.tema === id),
      onclick: (e) => {
        for (const b of temas.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
        cambiar({ tema: id });
      },
    }, muestra, el('span', { text: t(`tema.${id}`) })));
  }

  const salida = el('output', { text: `${ajustes.tamano}` });
  const rango = el('input', { type: 'range', min: 15, max: 40, step: 1, value: ajustes.tamano, 'aria-label': t('aj.tamano') });
  rango.addEventListener('input', () => { salida.textContent = rango.value; cambiar({ tamano: Number(rango.value) }); });

  return [
    el('h3', { text: t('aj.tema') }), temas,
    el('h3', { text: t('aj.tamano') }),
    el('div', { class: 'deslizador' }, el('span', { class: 'chica', text: 'A', 'aria-hidden': 'true' }), rango, el('span', { class: 'grande', text: 'A', 'aria-hidden': 'true' })),
    el('h3', { text: t('aj.fuente') }),
    pastillas(['clasica', 'moderna', 'legible'].map((f) => [f, t(`fuente.${f}`)]), ajustes.fuente, (fuente) => cambiar({ fuente })),
    el('h3', { text: t('aj.interlineado') }),
    pastillas(['junto', 'medio', 'amplio'].map((i) => [i, t(`inter.${i}`)]), ajustes.interlineado, (interlineado) => cambiar({ interlineado })),
    el('h3', { text: t('aj.ancho') }),
    pastillas(['angosto', 'medio', 'ancho'].map((a) => [a, t(`ancho.${a}`)]), ajustes.ancho, (ancho) => cambiar({ ancho })),
    el('h3', { text: t('aj.disposicion') }),
    pastillas(['parrafos', 'versiculos'].map((d) => [d, t(`disp.${d}`)]), ajustes.disposicion, (disposicion) => cambiar({ disposicion })),
    el('div', { class: 'aire' }),
    interruptor(t('aj.numeros'), t('aj.numerosNota'), ajustes.numeros, (numeros) => cambiar({ numeros })),
    interruptor(t('aj.jesus'), t('aj.jesusNota'), ajustes.jesus, (jesus) => cambiar({ jesus })),
  ];
}

export function abrirTexto({ ajustes, cambiar }) {
  abrirHoja({ titulo: t('texto'), contenido: el('div', {}, ...seccionPagina(ajustes, cambiar)) });
}

// --- audio guardado ---

const PAPELERA = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

const tamano = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(bytes >= 104857600 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
function tiempo(segundos) {
  const m = Math.round(segundos / 60);
  return m >= 60 ? t('alm.horas', { h: Math.floor(m / 60), m: m % 60 }) : t('alm.minutos', { m: Math.max(1, m) });
}

// uso() → Promise<[{version, libro, bytes, clips, segundos}]>
// nombre(version, libro) → «Juan · RVG»; borrar({libro}) → Promise
function seccionAlmacen({ uso, nombre, borrar }) {
  const caja = el('div', {});
  async function pintar() {
    const grupos = (await uso()).sort((a, b) => b.bytes - a.bytes);
    caja.replaceChildren();
    if (!grupos.length) { caja.append(el('p', { class: 'nota', text: t('alm.vacio') })); return; }

    const total = grupos.reduce((n, g) => n + g.bytes, 0);
    const segundos = grupos.reduce((n, g) => n + g.segundos, 0);
    caja.append(el('p', { class: 'resumen', text: t('alm.total', { tamano: tamano(total), tiempo: tiempo(segundos) }) }));

    const lista = el('div', { class: 'lista' });
    for (const g of grupos) {
      const rotulo = nombre(g.version, g.libro);
      const quitar = el('button', {
        type: 'button', class: 'icono', 'aria-label': t('alm.borrar', { libro: rotulo }),
        onclick: async () => { await borrar({ libro: `${g.version}/${g.libro}` }); pintar(); },
      });
      quitar.innerHTML = PAPELERA;
      lista.append(el('div', { class: 'fila-voz' },
        el('div', { class: 'opcion quieta' }, el('span', {}, el('strong', { text: rotulo }), el('small', { text: t('alm.fila', { tamano: tamano(g.bytes), tiempo: tiempo(g.segundos) }) }))),
        quitar));
    }
    let seguro = false;
    const todo = el('button', {
      type: 'button', class: 'opcion peligro',
      onclick: async () => {
        if (!seguro) { seguro = true; todo.querySelector('strong').textContent = t('alm.borrarTodoSeguro'); return; }
        await borrar({});
        pintar();
      },
    }, el('span', {}, el('strong', { text: t('alm.borrarTodo') })));
    caja.append(lista, todo);
  }
  pintar();
  return caja;
}

// --- ajustes generales ---

// Campo para escribir la clave de una versión privada.
// desbloquear(texto) → Promise<ficha>; lanza Error con .codigo
function seccionPrivada({ desbloquear, alDesbloquear }) {
  const campo = el('input', {
    class: 'campo', type: 'text', placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX', 'aria-label': t('priv.clave'),
    autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
  });
  const estado = el('p', { class: 'nota', role: 'status' });
  const boton = el('button', { class: 'boton', text: t('priv.abrir') });
  return el('div', {},
    el('form', {
      class: 'fila-campo',
      onsubmit: async (e) => {
        e.preventDefault();
        boton.disabled = true;
        estado.classList.remove('campo-error');
        estado.textContent = t('priv.abriendo');
        try {
          const ficha = await desbloquear(campo.value);
          campo.value = '';
          alDesbloquear(ficha);
        } catch (err) {
          estado.classList.add('campo-error');
          estado.textContent = t({ forma: 'priv.error.forma', red: 'priv.error.red', clave: 'priv.error.clave', guardar: 'imp.error.guardar' }[err.codigo] ?? 'imp.error.general');
        }
        boton.disabled = false;
      },
    }, campo, boton),
    estado);
}

export function abrirAjustes({ ajustes, cambiar, alGuardarMotor, almacen, alVerLicencias, privada }) {
  const campo = el('input', { class: 'campo', type: 'url', value: ajustes.motor, 'aria-label': t('aj.motor'), autocomplete: 'off', spellcheck: 'false' });
  const cuerpo = el('div', {},
    el('h3', { text: t('aj.idioma') }),
    pastillas([['es', 'Español'], ['en', 'English']], ajustes.idioma, (idioma) => cambiar({ idioma })),
    el('p', { class: 'nota', text: t('aj.idiomaNota') }),
    el('h3', { text: t('aj.lectura') }),
    interruptor(t('aj.continuar'), t('aj.continuarNota'), ajustes.continuar, (continuar) => cambiar({ continuar })),
    el('h3', { text: t('priv.titulo') }),
    el('p', { class: 'nota', text: t('priv.nota') }),
    el('div', { class: 'aire' }),
    seccionPrivada(privada),
    el('h3', { text: t('alm.titulo') }),
    el('p', { class: 'nota', text: t('alm.nota') }),
    el('div', { class: 'aire' }),
    seccionAlmacen(almacen),
    el('h3', { text: t('aj.instalar') }),
    el('p', { class: 'nota', text: t('aj.instalarNota') }),
    el('h3', { text: t('aj.motor') }),
    el('form', { class: 'fila-campo', onsubmit: (e) => { e.preventDefault(); alGuardarMotor(campo.value); } },
      campo, el('button', { class: 'boton', text: t('aj.guardar') })),
    el('p', { class: 'nota', text: t('aj.motorNota') }),
    el('div', { class: 'aire' }),
    el('button', { type: 'button', class: 'opcion sola', onclick: alVerLicencias },
      el('span', {}, el('strong', { text: t('lic.titulo') }), el('small', { text: t('lic.entrada') }))),
  );
  abrirHoja({ titulo: t('aj.titulo'), contenido: cuerpo });
}
