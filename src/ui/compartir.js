// La pestaña Compartir: compone un versículo sobre una foto o un fondo liso y
// lo entrega como imagen. Todo se dibuja en el dispositivo, en un <canvas>; de
// internet solo viene la foto de fondo, y solo si se elige una.
import { t } from '../i18n/textos.js';
import { FOTOS, LISOS, fotosPara, urlFoto } from '../datos/fondos.js';
import { el, pastillas } from './hoja.js';

const ANCHO = 1080;
const FORMATOS = { cuadrado: 1080, vertical: 1350, historia: 1920 };
const FUENTES = {
  clasica: { familia: '"Gentium Book Plus", Georgia, serif', peso: 400, estilo: 'normal', alto: 1.34 },
  elegante: { familia: '"Cormorant Garamond", Georgia, serif', peso: 600, estilo: 'italic', alto: 1.22 },
  moderna: { familia: '"Instrument Sans", system-ui, sans-serif', peso: 500, estilo: 'normal', alto: 1.3 },
};
const SANS = '"Instrument Sans", system-ui, sans-serif';
const MARGEN = 104;
const VISIBLES = 12;                 // miniaturas de foto que se muestran de entrada

// Parte un texto en renglones que quepan en el ancho dado.
function renglones(ctx, texto, ancho) {
  const salida = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(prueba).width > ancho) { salida.push(actual); actual = palabra; } else actual = prueba;
  }
  if (actual) salida.push(actual);
  return salida;
}

export function crearCompartir({ contenedor, aviso }) {
  const estado = {
    texto: '', referencia: '', sigla: '',
    formato: 'vertical', alineacion: 'centro', posicion: 'centro', fuente: 'clasica',
    escala: 1, velo: 0.45, fondo: { tipo: 'liso', id: 'tinta' },
  };
  let propia = null;                // una foto del dispositivo elegida por el lector
  const lienzo = el('canvas', { class: 'lienzo', role: 'img' });
  const ctx = lienzo.getContext('2d');
  const fotos = new Map();           // "id/alto" → Promise<HTMLImageElement>
  let turno = 0;
  let todasLasFotos = false;

  function cargarFoto(id, alto) {
    const clave = `${id}/${alto}`;
    if (!fotos.has(clave)) {
      const p = new Promise((resolver, rechazar) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';           // sin esto el lienzo no deja exportar
        img.onload = () => resolver(img);
        img.onerror = () => rechazar(new Error('foto'));
        img.src = urlFoto(id, ANCHO, alto);
      });
      p.catch(() => fotos.delete(clave));
      fotos.set(clave, p);
    }
    return fotos.get(clave);
  }

  /* ---------- el dibujo ---------- */

  async function dibujar() {
    const mio = ++turno;
    const alto = FORMATOS[estado.formato];
    const f = FUENTES[estado.fuente];
    await Promise.all([
      document.fonts.load(`${f.estilo} ${f.peso} 64px ${f.familia}`),
      document.fonts.load(`600 32px ${SANS}`),
    ]).catch(() => {});

    let foto = null;
    let claro = true;
    if (estado.fondo.tipo === 'propia' && propia) foto = propia;
    if (estado.fondo.tipo === 'foto') {
      lienzo.classList.add('cargando');
      try {
        foto = await cargarFoto(estado.fondo.id, alto);
      } catch {
        if (mio !== turno) return;
        aviso(t('comp.sinFoto'));
        estado.fondo = { tipo: 'liso', id: 'tinta' };
        marcarFondo();
      }
    }
    if (mio !== turno) return;
    lienzo.classList.remove('cargando');
    lienzo.width = ANCHO;
    lienzo.height = alto;

    if (foto) {
      // Se recorta para cubrir el lienzo: una foto propia no tiene por qué tener su proporción.
      const escalaFoto = Math.max(ANCHO / foto.naturalWidth, alto / foto.naturalHeight);
      const w = foto.naturalWidth * escalaFoto;
      const h = foto.naturalHeight * escalaFoto;
      ctx.drawImage(foto, (ANCHO - w) / 2, (alto - h) / 2, w, h);
      ctx.fillStyle = `rgba(0, 0, 0, ${estado.velo})`;
      ctx.fillRect(0, 0, ANCHO, alto);
    } else {
      const [, arriba, abajo, esClaro] = LISOS.find((l) => l[0] === estado.fondo.id) ?? LISOS[2];
      const degradado = ctx.createLinearGradient(0, 0, 0, alto);
      degradado.addColorStop(0, arriba);
      degradado.addColorStop(1, abajo);
      ctx.fillStyle = degradado;
      ctx.fillRect(0, 0, ANCHO, alto);
      claro = esClaro;
    }
    const tinta = claro ? '#FFFFFF' : '#1C1B18';
    const acento = claro ? '#F0B8B0' : '#A1241B';

    // El cuerpo se achica hasta que el versículo quepa en el espacio previsto.
    const anchoTexto = ANCHO - MARGEN * 2;
    const espacio = alto * 0.66;
    let cuerpo = Math.round(74 * estado.escala);
    let lineas;
    for (;;) {
      ctx.font = `${f.estilo} ${f.peso} ${cuerpo}px ${f.familia}`;
      lineas = renglones(ctx, estado.texto, anchoTexto);
      if (lineas.length * cuerpo * f.alto <= espacio || cuerpo <= 30) break;
      cuerpo -= 2;
    }
    const altoLinea = cuerpo * f.alto;
    const altoPie = 26 + 14 + 40;                       // filete, aire y referencia
    const altoBloque = lineas.length * altoLinea + 44 + altoPie;
    const y0 = estado.posicion === 'arriba' ? MARGEN * 1.25
      : estado.posicion === 'abajo' ? alto - MARGEN * 1.6 - altoBloque
        : (alto - altoBloque) / 2 - 18;
    const x = estado.alineacion === 'izquierda' ? MARGEN : estado.alineacion === 'derecha' ? ANCHO - MARGEN : ANCHO / 2;
    ctx.textAlign = { izquierda: 'left', centro: 'center', derecha: 'right' }[estado.alineacion];
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = tinta;
    if (foto) { ctx.shadowColor = 'rgba(0, 0, 0, .45)'; ctx.shadowBlur = 18; }
    lineas.forEach((linea, i) => ctx.fillText(linea, x, y0 + cuerpo + i * altoLinea));
    ctx.shadowBlur = 0;

    // Filete y referencia.
    const yPie = y0 + lineas.length * altoLinea + 44;
    const filete = 72;
    const xFilete = estado.alineacion === 'izquierda' ? x : estado.alineacion === 'derecha' ? x - filete : x - filete / 2;
    ctx.fillStyle = acento;
    ctx.fillRect(xFilete, yPie, filete, 4);
    ctx.fillStyle = tinta;
    ctx.font = `600 30px ${SANS}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(`${estado.referencia}  ·  ${estado.sigla}`.toUpperCase(), x, yPie + 26 + 40);
    ctx.letterSpacing = '0px';

    lienzo.setAttribute('aria-label', `${estado.texto} — ${estado.referencia} (${estado.sigla})`);
  }

  /* ---------- entregar la imagen ---------- */

  const nombreDeArchivo = () => `${estado.referencia.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`;

  function comoArchivo() {
    return new Promise((resolver, rechazar) => {
      try {
        lienzo.toBlob((b) => (b ? resolver(new File([b], nombreDeArchivo(), { type: 'image/jpeg' })) : rechazar(new Error('lienzo'))), 'image/jpeg', 0.92);
      } catch (err) {
        rechazar(err);
      }
    });
  }

  async function guardar() {
    try {
      const archivo = await comoArchivo();
      const enlace = el('a', { href: URL.createObjectURL(archivo), download: archivo.name });
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 30000);
      aviso(t('comp.guardada'));
    } catch {
      aviso(t('comp.error'));
    }
  }

  async function compartir() {
    try {
      const archivo = await comoArchivo();
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: `${estado.referencia} (${estado.sigla})` });
      } else {
        await guardar();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') aviso(t('comp.error'));
    }
  }

  /* ---------- controles ---------- */

  const tira = el('div', { class: 'fondos', role: 'group', 'aria-label': t('comp.fondo') });

  function marcarFondo() {
    for (const b of tira.querySelectorAll('button[data-tipo]')) {
      b.setAttribute('aria-pressed', String(b.dataset.tipo === estado.fondo.tipo && b.dataset.id === String(estado.fondo.id)));
    }
  }

  function pintarFondos() {
    tira.replaceChildren();
    const sugeridas = fotosPara(estado.texto);
    for (const foto of todasLasFotos ? sugeridas : sugeridas.slice(0, VISIBLES)) {
      const b = el('button', { type: 'button', 'data-tipo': 'foto', 'data-id': foto.id, 'aria-label': t('comp.foto', { tema: t(`fondo.${foto.temas[0]}`) }), onclick: () => { estado.fondo = { tipo: 'foto', id: foto.id }; marcarFondo(); dibujar(); } },
        el('img', { src: urlFoto(foto.id, 120, 150), alt: '', loading: 'lazy', width: 60, height: 75 }));
      tira.append(b);
    }
    for (const [id, arriba, abajo] of LISOS) {
      const b = el('button', { type: 'button', class: 'liso', 'data-tipo': 'liso', 'data-id': id, 'aria-label': t('comp.liso'), onclick: () => { estado.fondo = { tipo: 'liso', id }; marcarFondo(); dibujar(); } });
      b.style.background = `linear-gradient(${arriba}, ${abajo})`;
      tira.append(b);
    }
    if (propia) {
      const b = el('button', { type: 'button', 'data-tipo': 'propia', 'data-id': 'propia', 'aria-label': t('comp.fotoPropia'), onclick: () => { estado.fondo = { tipo: 'propia', id: 'propia' }; marcarFondo(); dibujar(); } },
        el('img', { src: propia.src, alt: '', width: 60, height: 75 }));
      tira.prepend(b);
    }
    if (!todasLasFotos) {
      tira.append(el('button', { type: 'button', class: 'mas', text: t('comp.masFotos', { n: FOTOS.length - VISIBLES }), onclick: () => { todasLasFotos = true; pintarFondos(); } }));
    }
    marcarFondo();
  }

  /* ---------- una foto del dispositivo como fondo ---------- */

  // La foto se lee en el propio dispositivo: no se sube a ningún sitio.
  const entradaFoto = el('input', { type: 'file', accept: 'image/*', hidden: true });
  entradaFoto.addEventListener('change', () => {
    const archivo = entradaFoto.files[0];
    entradaFoto.value = '';
    if (!archivo) return;
    const img = new Image();
    img.onload = () => {
      if (propia) URL.revokeObjectURL(propia.src);
      propia = img;
      estado.fondo = { tipo: 'propia', id: 'propia' };
      pintarFondos();
      dibujar();
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); aviso(t('comp.fotoMala')); };
    img.src = URL.createObjectURL(archivo);
  });

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(`«${estado.texto}»\n— ${estado.referencia} (${estado.sigla})`);
      aviso(t('est.copiado'));
    } catch {
      aviso(t('est.sinCopiar'));
    }
  }

  const titulo = el('p', { class: 'comp-ref' });
  const velo = el('input', { type: 'range', min: 0, max: 0.8, step: 0.05, value: estado.velo, 'aria-label': t('comp.velo') });
  velo.addEventListener('input', () => { estado.velo = Number(velo.value); dibujar(); });
  const escala = el('input', { type: 'range', min: 0.6, max: 1.5, step: 0.05, value: estado.escala, 'aria-label': t('comp.tamano') });
  escala.addEventListener('input', () => { estado.escala = Number(escala.value); dibujar(); });

  const opcion = (campo, valores) => pastillas(valores.map((v) => [v, t(`comp.${campo}.${v}`)]), estado[campo], (v) => { estado[campo] = v; dibujar(); });

  const vacio = el('p', { class: 'nota', text: t('comp.vacio') });
  const taller = el('div', { class: 'taller' },
    el('div', { class: 'taller-vista' }, lienzo, titulo,
      el('div', { class: 'taller-acciones' },
        el('button', { type: 'button', class: 'boton', text: t('est.compartir'), onclick: compartir }),
        el('button', { type: 'button', class: 'boton secundario', text: t('comp.guardar'), onclick: guardar }),
        el('button', { type: 'button', class: 'boton secundario doble', text: t('comp.copiar'), onclick: copiarTexto }))),
    el('div', { class: 'taller-controles' },
      el('h3', { text: t('comp.fondo') }), tira,
      el('div', { class: 'aire' }),
      el('button', { type: 'button', class: 'boton secundario ancho', text: t('comp.misFotos'), onclick: () => entradaFoto.click() }),
      entradaFoto,
      el('p', { class: 'nota', text: t('comp.credito') }),
      el('h3', { text: t('comp.formato') }), opcion('formato', ['cuadrado', 'vertical', 'historia']),
      el('h3', { text: t('comp.alineacion') }), opcion('alineacion', ['izquierda', 'centro', 'derecha']),
      el('h3', { text: t('comp.posicion') }), opcion('posicion', ['arriba', 'centro', 'abajo']),
      el('h3', { text: t('aj.fuente') }), opcion('fuente', ['clasica', 'elegante', 'moderna']),
      el('h3', { text: t('comp.tamano') }),
      el('div', { class: 'deslizador' }, el('span', { class: 'chica', text: 'A', 'aria-hidden': 'true' }), escala, el('span', { class: 'grande', text: 'A', 'aria-hidden': 'true' })),
      el('h3', { text: t('comp.velo') }), velo));
  contenedor.replaceChildren(vacio, taller);
  taller.hidden = true;

  return {
    // Compone la imagen de un versículo. Sugiere una foto acorde con lo que dice.
    abrir({ texto, referencia, sigla }) {
      Object.assign(estado, { texto, referencia, sigla });
      estado.fondo = { tipo: 'foto', id: fotosPara(texto)[0].id };
      todasLasFotos = false;
      titulo.textContent = `${referencia} · ${sigla}`;
      vacio.hidden = true;
      taller.hidden = false;
      pintarFondos();
      dibujar();
    },
    get vacio() { return !estado.texto; },
  };
}
