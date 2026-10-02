// La pestaña de planes de lectura: los que el lector sigue, con el día que
// le toca, y los que puede empezar.
import { t } from '../i18n/textos.js';
import { tituloCapitulo } from '../referencia/nombres.js';
import { PLANES, construirPlan, avance, racha, claveCapitulo } from '../planes/planes.js';
import { planesActivos, empezarPlan, dejarPlan, marcarCapitulo } from '../almacen/planes.js';
import { cerrarHoja, el } from './hoja.js';

const VISTO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

// {idioma, irA(libro, cap), aviso(texto)}
export function cuerpoPlanes({ idioma, irA, aviso }) {
  const caja = el('div', {});

  function filaCapitulo(planId, c, hecho, repintar) {
    const marca = el('button', {
      type: 'button', class: 'visto', role: 'checkbox', 'aria-checked': String(hecho),
      'aria-label': t(hecho ? 'plan.desmarcar' : 'plan.marcar', { capitulo: tituloCapitulo(c.libro, c.cap, idioma) }),
      onclick: async () => { await marcarCapitulo(claveCapitulo(c.libro, c.cap), { leido: !hecho, planes: [planId] }); repintar(); },
    });
    marca.innerHTML = VISTO;
    return el('div', { class: 'fila-voz' },
      el('button', { type: 'button', class: 'opcion sola', onclick: () => { cerrarHoja(); irA(c.libro, c.cap); } },
        el('span', {}, el('strong', { class: hecho ? 'leido' : '', text: tituloCapitulo(c.libro, c.cap, idioma) }))),
      marca);
  }

  function tarjeta(registro, repintar) {
    const plan = construirPlan(registro.id);
    const a = avance(plan, registro.hechos);
    const dias = racha(registro.hechos);
    const tarjetaEl = el('section', { class: 'plan' },
      el('h3', { text: t(`plan.${registro.id}`) }),
      el('div', { class: 'progreso' }, el('div')),
      el('p', { class: 'nota', text: [
        t('plan.avance', { leidos: a.leidos, total: a.total, pct: Math.round((a.leidos / a.total) * 100) }),
        dias > 1 ? t('plan.racha', { n: dias }) : null,
      ].filter(Boolean).join(' · ') }));
    tarjetaEl.querySelector('.progreso div').style.width = `${(a.leidos / a.total) * 100}%`;

    if (a.terminado) {
      tarjetaEl.append(el('p', { class: 'resumen', text: t('plan.terminado') }));
    } else {
      tarjetaEl.append(el('h4', { text: t('plan.dia', { n: a.hoy + 1, total: plan.dias.length }) }));
      const lista = el('div', { class: 'lista' });
      for (const c of plan.dias[a.hoy]) lista.append(filaCapitulo(registro.id, c, Boolean(registro.hechos[claveCapitulo(c.libro, c.cap)]), repintar));
      tarjetaEl.append(lista);
    }

    // Todos los días, plegados: para adelantar, repasar o corregir.
    const todos = el('details', {}, el('summary', { text: t('plan.todos') }));
    todos.addEventListener('toggle', () => {
      if (!todos.open || todos.childElementCount > 1) return;
      plan.dias.forEach((dia, d) => {
        const completo = dia.every((c) => registro.hechos[claveCapitulo(c.libro, c.cap)]);
        todos.append(el('h4', { class: completo ? 'leido' : '', text: t('plan.diaCorto', { n: d + 1 }) }));
        const lista = el('div', { class: 'lista' });
        for (const c of dia) lista.append(filaCapitulo(registro.id, c, Boolean(registro.hechos[claveCapitulo(c.libro, c.cap)]), repintar));
        todos.append(lista);
      });
    });

    let seguro = false;
    const dejar = el('button', {
      type: 'button', class: 'enlace', text: t('plan.dejar'),
      onclick: async () => {
        if (!seguro) { seguro = true; dejar.textContent = t('plan.dejarSeguro'); return; }
        await dejarPlan(registro.id);
        repintar();
      },
    });
    tarjetaEl.append(todos, dejar);
    return tarjetaEl;
  }

  async function pintar() {
    const activos = await planesActivos();
    const seguidos = new Set(activos.map((p) => p.id));
    caja.replaceChildren();

    if (!activos.length) caja.append(el('p', { class: 'nota', text: t('plan.intro') }));
    for (const registro of activos) if (construirPlan(registro.id)) caja.append(tarjeta(registro, pintar));

    const disponibles = PLANES.filter((p) => !seguidos.has(p.id));
    if (disponibles.length) {
      caja.append(el('h3', { text: t(activos.length ? 'plan.otros' : 'plan.elegir') }));
      const lista = el('div', { class: 'lista' });
      for (const p of disponibles) {
        lista.append(el('button', {
          type: 'button', class: 'opcion sola',
          onclick: async () => {
            try { await empezarPlan(p.id); } catch { aviso(t('est.sinGuardar')); return; }
            pintar();
          },
        }, el('span', {}, el('strong', { text: t(`plan.${p.id}`) }), el('small', { text: t(`plan.${p.id}.nota`) }))));
      }
      caja.append(lista);
    }
  }

  pintar();
  return caja;
}
