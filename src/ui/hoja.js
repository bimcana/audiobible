// La hoja: un único panel modal que cada pantalla rellena. Usa <dialog>, que
// ya trae foco atrapado, cierre con Escape y fondo.
const $ = (id) => document.getElementById(id);

let alVolver = null;

export function abrirHoja({ titulo, contenido, ancha = false, volver = null }) {
  const hoja = $('hoja');
  $('hojaTitulo').textContent = titulo;
  $('hojaCuerpo').replaceChildren(contenido);
  $('hojaCuerpo').scrollTop = 0;
  hoja.classList.toggle('ancha', ancha);
  alVolver = volver;
  $('hojaVolver').hidden = !volver;
  if (!hoja.open) hoja.showModal();
}

export function cerrarHoja() {
  const hoja = $('hoja');
  if (hoja.open) hoja.close();
}

export const hojaAbierta = () => $('hoja').open;

export function prepararHoja({ cerrar, volver }) {
  const hoja = $('hoja');
  $('hojaCerrar').setAttribute('aria-label', cerrar);
  $('hojaVolver').setAttribute('aria-label', volver);
  $('hojaCerrar').addEventListener('click', cerrarHoja);
  $('hojaVolver').addEventListener('click', () => alVolver?.());
  // Un toque en el fondo cierra.
  hoja.addEventListener('click', (e) => { if (e.target === hoja) cerrarHoja(); });
}

// --- piezas pequeñas que comparten las hojas ---

export function el(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'text') nodo.textContent = v;
    else if (k.startsWith('on')) nodo.addEventListener(k.slice(2), v);
    else nodo.setAttribute(k, v === true ? '' : v);
  }
  nodo.append(...hijos.filter((h) => h !== null && h !== undefined && h !== false));
  return nodo;
}

export function pastillas(opciones, actual, alElegir) {
  const grupo = el('div', { class: 'pastillas', role: 'group' });
  const pintar = (valor) => {
    for (const b of grupo.children) b.setAttribute('aria-pressed', String(b.dataset.valor === String(valor)));
  };
  for (const [valor, texto] of opciones) {
    const b = el('button', { type: 'button', text: texto, onclick: () => { pintar(valor); alElegir(valor); } });
    b.dataset.valor = valor;
    grupo.append(b);
  }
  pintar(actual);
  return grupo;
}

export function interruptor(titulo, nota, activo, alCambiar) {
  const b = el('button', { type: 'button', class: 'interruptor', role: 'switch', 'aria-checked': String(activo) },
    el('span', {}, el('b', { text: titulo }), nota ? el('small', { text: nota }) : null),
    el('i', { 'aria-hidden': 'true' }));
  b.addEventListener('click', () => {
    const nuevo = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(nuevo));
    alCambiar(nuevo);
  });
  return b;
}
