// Herramientas de estudio: selección de versículos y su menú (subrayar, nota,
// marcador, copiar, referencias cruzadas, comparar), búsqueda y «Mis notas».
//
// Recibe de la app lo que necesita y no toca nada más:
//   ctx.estado      el estado de la app (version, libro, cap, pasajes, vista, catalogo, ajustes)
//   ctx.irA(libro, cap, {vers})
//   ctx.aviso(texto)
//   ctx.cargarLibro(version, libro)
import { t } from './i18n/textos.js';
import { LIBROS, libro as datosLibro } from './referencia/canon.js';
import { nombreLibro, tituloCapitulo } from './referencia/nombres.js';
import { analizarReferencia } from './referencia/analizar.js';
import { construirIndice, buscar, resaltar } from './datos/busqueda.js';
import { TEMARIO, leerCita } from './datos/temario.js';
import {
  COLORES, leerMarcas, marcar, todasLasMarcas, exportarMarcas, importarMarcas,
} from './almacen/marcas.js';
import { pintarMarcas, pintarSeleccion } from './ui/lector.js';
import { abrirHoja, cerrarHoja, el, pastillas } from './ui/hoja.js';

const $ = (id) => document.getElementById(id);
const PULSACION_LARGA = 450;

const textoDeTramos = (x) => x.map((tr) => (typeof tr === 'string' ? tr : tr.j ?? tr.d ?? ' ')).join('').replace(/\s+/g, ' ').trim();

// «3:16», «3:16-18» o «3:16, 19» según lo seleccionado.
function rangoDe(versos) {
  const ns = [...versos].sort((a, b) => a - b);
  const tramos = [];
  for (const n of ns) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && ultimo[1] === n - 1) ultimo[1] = n; else tramos.push([n, n]);
  }
  return tramos.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');
}

export function crearEstudio(ctx) {
  const { estado } = ctx;
  const seleccion = new Set();
  let palabra = null;                 // la palabra sobre la que se mantuvo el dedo
  let marcas = {};
  const idioma = () => estado.ajustes.idioma;

  const referencia = (libro, cap, versos) => {
    const base = tituloCapitulo(libro, cap, idioma());
    const rango = versos && versos.size ? rangoDe(versos) : '';
    if (!rango) return base;
    return datosLibro(libro).caps === 1 ? `${base} ${rango}` : `${base}:${rango}`;
  };

  // Texto de unos versículos del capítulo en pantalla.
  function textoDe(versos) {
    const quiero = new Set(versos);
    const partes = [];
    for (const p of estado.pasajes) {
      for (const v of p.versos) if (quiero.has(v.n)) partes.push(p.texto.slice(v.cs, v.ce));
    }
    return partes.join(' ');
  }

  /* ---------- marcas en pantalla ---------- */

  async function refrescar() {
    const { libro, cap } = estado;
    const leidas = await leerMarcas(libro, cap);
    if (libro !== estado.libro || cap !== estado.cap) return;
    marcas = leidas;
    pintarMarcas(estado.vista, marcas);
  }

  /* ---------- selección ---------- */

  const barra = el('div', { id: 'menuVerso', role: 'toolbar', hidden: true });
  document.body.append(barra);

  function limpiar() {
    if (!seleccion.size) return;
    palabra = null;
    seleccion.clear();
    pintarSeleccion(estado.vista, seleccion);
    barra.hidden = true;
    document.documentElement.classList.remove('seleccionando');
  }

  function alternar(n) {
    if (n === null || n === undefined) return;
    if (seleccion.has(n)) seleccion.delete(n); else seleccion.add(n);
    pintarSeleccion(estado.vista, seleccion);
    if (!seleccion.size) { limpiar(); return; }
    document.documentElement.classList.add('seleccionando');
    pintarBarra();
  }

  const ICONO = {
    nota: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    marcador: '<path d="M7 4h10v16l-5-4-5 4z"/>',
    copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    compartir: '<path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    referencias: '<path d="M9 7H6a3 3 0 0 0 0 6h3M15 7h3a3 3 0 0 1 0 6h-3M8 10h8"/><path d="M12 14v6M9 17l3 3 3-3"/>',
    versiones: '<rect x="3.5" y="5" width="7" height="14" rx="1.5"/><rect x="13.5" y="5" width="7" height="14" rx="1.5"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    imagen: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>',
    palabra: '<path d="M5 5h9a4 4 0 0 1 4 4v10H9a4 4 0 0 1-4-4z"/><path d="M9 10h5M9 14h3"/>',
  };
  const boton = (icono, clave, hacer, pulsado = null) => {
    const b = el('button', { type: 'button', class: 'icono', 'aria-label': t(clave), title: t(clave), onclick: hacer });
    if (pulsado !== null) b.setAttribute('aria-pressed', String(pulsado));
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${ICONO[icono]}</svg>`;
    return b;
  };

  function pintarBarra() {
    const primero = Math.min(...seleccion);
    const colorActual = [...seleccion].every((n) => marcas[n]?.c === marcas[primero]?.c) ? marcas[primero]?.c : null;
    const colores = el('div', { class: 'colores', role: 'group', 'aria-label': t('est.subrayar') });
    for (const c of COLORES) {
      colores.append(el('button', {
        type: 'button', class: 'color', 'data-color': c, 'aria-label': t(`color.${c}`), 'aria-pressed': String(colorActual === c),
        onclick: () => aplicar({ c: colorActual === c ? null : c }),
      }));
    }
    barra.replaceChildren(
      el('div', { class: 'menu-fila' },
        el('strong', { class: 'menu-ref', text: referencia(estado.libro, estado.cap, seleccion) }),
        boton('cerrar', 'cerrar', limpiar)),
      el('div', { class: 'menu-fila' },
        colores,
        boton('nota', 'est.nota', abrirNota, Boolean(marcas[primero]?.nota)),
        boton('marcador', 'est.marcador', () => aplicar({ m: !marcas[primero]?.m }), Boolean(marcas[primero]?.m))),
      el('div', { class: 'menu-fila' },
        boton('copiar', 'est.copiar', copiar),
        navigator.share ? boton('compartir', 'est.compartir', compartir) : null,
        boton('referencias', 'est.referencias', abrirReferencias),
        boton('versiones', 'est.enVersiones', abrirEnVersiones),
        boton('imagen', 'est.abrirCompartir', abrirEnCompartir)),
      ...(palabra ? [el('button', { type: 'button', class: 'menu-palabra', onclick: () => abrirPalabra(palabra) },
        el('span', { text: t('est.palabra') }), el('strong', { text: palabra }))] : []));
    barra.hidden = false;
  }

  async function aplicar(parche) {
    try {
      marcas = await marcar(estado.libro, estado.cap, [...seleccion], parche);
    } catch {
      ctx.aviso(t('est.sinGuardar'));
      return;
    }
    pintarMarcas(estado.vista, marcas);
    pintarBarra();
  }

  function abrirEnCompartir() {
    ctx.compartir({ texto: textoDe(seleccion), referencia: referencia(estado.libro, estado.cap, seleccion), sigla: estado.version.sigla });
    limpiar();
  }

  const cita = () => `«${textoDe(seleccion)}»\n— ${referencia(estado.libro, estado.cap, seleccion)} (${estado.version.sigla})`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cita());
      ctx.aviso(t('est.copiado'));
    } catch {
      ctx.aviso(t('est.sinCopiar'));
    }
    limpiar();
  }

  function compartir() {
    navigator.share({ text: cita() }).catch(() => {});
  }

  /* ---------- nota ---------- */

  function abrirNota() {
    const versos = new Set(seleccion);
    const primero = Math.min(...versos);
    const { libro, cap } = estado;
    const campo = el('textarea', { class: 'campo nota-campo', rows: 6, 'aria-label': t('est.nota'), placeholder: t('est.notaEj') });
    campo.value = marcas[primero]?.nota ?? '';
    const guardar = async () => {
      try {
        marcas = await marcar(libro, cap, [primero], { nota: campo.value.trim() || null });
      } catch {
        ctx.aviso(t('est.sinGuardar'));
        return;
      }
      cerrarHoja();
      if (libro === estado.libro && cap === estado.cap) pintarMarcas(estado.vista, marcas);
      limpiar();
    };
    abrirHoja({
      titulo: referencia(libro, cap, new Set([primero])),
      contenido: el('form', { onsubmit: (e) => { e.preventDefault(); guardar(); } },
        el('p', { class: 'cita', text: textoDe([primero]) }),
        campo,
        el('div', { class: 'aire' }),
        el('button', { class: 'boton ancho', text: t('est.guardarNota') })),
    });
    campo.focus();
  }

  /* ---------- referencias cruzadas ---------- */

  const refs = new Map();                 // libro → Promise<{cap: {vers: [destinos]}}>
  function refsDe(libro) {
    if (!refs.has(libro)) {
      const p = fetch(new URL(`../data/refs/${libro}.json`, import.meta.url)).then((r) => (r.ok ? r.json() : {}));
      p.catch(() => refs.delete(libro));
      refs.set(libro, p);
    }
    return refs.get(libro);
  }

  // "PRO.8.22-PRO.8.30" → {libro, cap, vers, hasta}
  function leerDestino(destino) {
    const [a, b] = destino.split('-').map((x) => x.split('.'));
    return { libro: a[0], cap: Number(a[1]), vers: Number(a[2]), hasta: b && b[0] === a[0] && b[1] === a[1] ? Number(b[2]) : Number(a[2]) };
  }

  async function textoDelDestino(version, d) {
    const datos = await ctx.cargarLibro(version, d.libro);
    return (datos.caps[d.cap - 1] ?? []).filter((e) => e.t === 'v' && e.n >= d.vers && e.n <= d.hasta).map((e) => textoDeTramos(e.x)).join(' ');
  }

  async function abrirReferencias() {
    const { libro, cap } = estado;
    const n = Math.min(...seleccion);
    const version = estado.version.id;
    const lista = el('div', { class: 'lista' }, el('p', { class: 'nota', text: t('est.cargando') }));
    abrirHoja({ titulo: `${t('est.referencias')} · ${referencia(libro, cap, new Set([n]))}`, contenido: lista });

    let destinos = [];
    try { destinos = (await refsDe(libro))[cap]?.[n] ?? []; } catch { /* sin red */ }
    lista.replaceChildren();
    if (!destinos.length) { lista.append(el('p', { class: 'nota', text: t('est.sinReferencias') })); return; }

    for (const destino of destinos) {
      const d = leerDestino(destino);
      const versos = new Set(Array.from({ length: d.hasta - d.vers + 1 }, (_, i) => d.vers + i));
      const previo = el('small', { text: '…' });
      lista.append(el('button', {
        type: 'button', class: 'opcion sola', onclick: () => { cerrarHoja(); limpiar(); ctx.irA(d.libro, d.cap, { vers: d.vers }); },
      }, el('span', {}, el('strong', { text: referencia(d.libro, d.cap, versos) }), previo)));
      textoDelDestino(version, d).then((x) => { previo.textContent = x || '—'; }).catch(() => { previo.textContent = '—'; });
    }
  }

  /* ---------- el versículo en todas las versiones ---------- */

  function abrirEnVersiones() {
    const { libro, cap } = estado;
    const versos = [...seleccion].sort((a, b) => a - b);
    const d = { libro, cap, vers: versos[0], hasta: versos[versos.length - 1] };
    const lista = el('div', { class: 'lista' });
    const orden = [...estado.catalogo].sort((a, b) => Number(b.idioma === estado.version.idioma) - Number(a.idioma === estado.version.idioma));
    for (const v of orden) {
      const texto = el('small', { class: 'cita-version', text: '…' });
      texto.lang = v.idioma;
      lista.append(el('div', { class: 'opcion quieta' }, el('span', { class: 'sigla', text: v.sigla }), el('span', {}, texto)));
      textoDelDestino(v.id, d).then((x) => { texto.textContent = x || t('est.noEsta'); }).catch(() => { texto.textContent = t('est.noEsta'); });
    }
    abrirHoja({ titulo: referencia(libro, cap, new Set(versos)), contenido: lista });
  }

  /* ---------- búsqueda ---------- */

  let indice = { version: null, datos: null };
  async function indiceDe(version) {
    if (indice.version !== version) {
      const libros = await Promise.all(LIBROS.map((l) => ctx.cargarLibro(version, l.id).catch(() => null)));
      indice = { version, datos: construirIndice(libros.filter(Boolean)) };
    }
    return indice.datos;
  }

  const TESTAMENTOS = {
    todo: null,
    at: new Set(LIBROS.filter((l) => l.t === 'AT').map((l) => l.id)),
    nt: new Set(LIBROS.filter((l) => l.t === 'NT').map((l) => l.id)),
  };
  const MAXIMO = 200;

  // La pestaña Buscar. Con el campo vacío muestra el temario; al escribir,
  // los resultados. Se monta una vez por versión y conserva lo escrito.
  let montada = { version: null, contenedor: null };

  function montarBusqueda(contenedor) {
    const version = estado.version;
    if (montada.version === version.id && montada.contenedor === contenedor && contenedor.childElementCount) return;
    montada = { version: version.id, contenedor };

    let ambito = 'todo';
    let turno = 0;
    const campo = el('input', {
      class: 'campo', type: 'search', placeholder: t('bus.campo'), 'aria-label': t('bus.campo'),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
    });
    const estadoBusqueda = el('p', { class: 'nota', role: 'status' });
    const resultados = el('div', { class: 'resultados' });
    const filtro = pastillas([['todo', t('bus.todo')], ['at', t('nav.at')], ['nt', t('nav.nt')]], ambito, (x) => { ambito = x; ejecutar(); });
    const temario = el('div', { class: 'temario' });

    const ir = (libro, cap, vers) => ctx.irA(libro, cap, { vers });

    /* ----- temario ----- */

    function pintarTemario() {
      temario.replaceChildren(el('p', { class: 'nota', text: t('tema.intro') }));
      for (const categoria of TEMARIO) {
        temario.append(el('h3', { text: categoria.nombre[idioma()] ?? categoria.nombre.es }));
        const grupo = el('div', { class: 'pastillas temas' });
        for (const tema of categoria.temas) {
          grupo.append(el('button', { type: 'button', text: tema.nombre[idioma()] ?? tema.nombre.es, onclick: () => pintarTema(categoria, tema) }));
        }
        temario.append(grupo);
      }
    }

    function pintarTema(categoria, tema) {
      const lista = el('div', { class: 'lista citas' });
      for (const cita of tema.citas) {
        const d = leerCita(cita);
        const versos = new Set(Array.from({ length: d.hasta - d.vers + 1 }, (_, i) => d.vers + i));
        const texto = el('p', { class: 'cita-texto', text: '…' });
        texto.lang = version.idioma;
        lista.append(el('button', { type: 'button', class: 'opcion sola cita-tema', 'aria-label': `${referencia(d.libro, d.cap, versos)}. ${t('tema.leer')}`, onclick: () => ir(d.libro, d.cap, d.vers) },
          el('span', {}, texto, el('strong', { text: `${referencia(d.libro, d.cap, versos)} · ${version.sigla}` }))));
        textoDelDestino(version.id, d).then((x) => { texto.textContent = x || t('est.noEsta'); }).catch(() => { texto.textContent = t('est.noEsta'); });
      }
      const volver = el('button', { type: 'button', class: 'enlace volver', text: `← ${t('tema.volver')}`, onclick: () => { pintarTemario(); contenedor.closest('.pagina-cuerpo')?.scrollTo({ top: 0 }); } });
      temario.replaceChildren(
        volver,
        el('p', { class: 'cap-libro', text: categoria.nombre[idioma()] ?? categoria.nombre.es }),
        el('h2', { class: 'tema-titulo', text: tema.nombre[idioma()] ?? tema.nombre.es }),
        lista);
      contenedor.closest('.pagina-cuerpo')?.scrollTo({ top: 0 });
    }

    /* ----- búsqueda ----- */

    async function ejecutar() {
      const consulta = campo.value.trim();
      const mio = ++turno;
      resultados.replaceChildren();
      const vacia = !consulta;
      temario.hidden = !vacia;
      filtro.hidden = vacia;
      if (vacia) { estadoBusqueda.textContent = t('bus.ayuda', { version: version.sigla }); return; }

      // Si lo escrito es una referencia, se ofrece ir directamente.
      const ref = analizarReferencia(consulta, idioma());
      if (ref) {
        resultados.append(el('button', {
          type: 'button', class: 'opcion sola ir', onclick: () => ir(ref.libro, ref.cap ?? 1, ref.vers),
        }, el('span', {}, el('strong', { text: t('bus.irA', { referencia: referencia(ref.libro, ref.cap ?? 1, ref.vers ? new Set([ref.vers]) : null) }) }))));
      }

      if (indice.version !== version.id) estadoBusqueda.textContent = t('bus.preparando', { version: version.sigla });
      let datos;
      try { datos = await indiceDe(version.id); } catch { estadoBusqueda.textContent = t('aviso.cargaLibro'); return; }
      if (mio !== turno) return;

      const r = buscar(datos, consulta, { libros: TESTAMENTOS[ambito], limite: MAXIMO });
      estadoBusqueda.textContent = r.total === 0 ? (ref ? '' : t('bus.nada', { consulta }))
        : r.total > MAXIMO ? t('bus.muchos', { total: r.total.toLocaleString(idioma()), n: MAXIMO })
          : t(r.total === 1 ? 'bus.uno' : 'bus.varios', { total: r.total });

      let libroActual = null;
      let grupo = null;
      for (const v of r.resultados) {
        if (v.libro !== libroActual) {
          libroActual = v.libro;
          resultados.append(el('h3', { text: nombreLibro(v.libro, idioma()) }));
          grupo = el('div', { class: 'lista' });
          resultados.append(grupo);
        }
        const texto = el('small', {});
        for (const trozo of resaltar(v.texto, r.terminos)) texto.append(trozo.hallado ? el('mark', { text: trozo.texto }) : trozo.texto);
        grupo.append(el('button', {
          type: 'button', class: 'opcion sola', onclick: () => ir(v.libro, v.cap, v.n),
        }, el('span', {}, el('strong', { text: `${v.cap}:${v.n}` }), texto)));
      }
    }

    let reloj = 0;
    campo.addEventListener('input', () => { clearTimeout(reloj); reloj = setTimeout(ejecutar, 250); });

    pintarTemario();
    contenedor.replaceChildren(
      el('form', { class: 'buscador', onsubmit: (e) => { e.preventDefault(); clearTimeout(reloj); campo.blur(); ejecutar(); } }, campo),
      filtro, estadoBusqueda, resultados, temario);
    ejecutar();
  }

  /* ---------- mis notas ---------- */

  // El contenido de «Mis notas»; alCerrar se llama cuando hay que repintar la hoja.
  async function cuerpoNotas() {
    const todas = await todasLasMarcas();
    let filtro = 'todo';
    const lista = el('div', {});

    const pasa = (m) => filtro === 'todo' || (filtro === 'notas' && m.nota) || (filtro === 'marcadores' && m.m) || (filtro === 'subrayados' && m.c);

    function pintar() {
      lista.replaceChildren();
      const visibles = todas.filter(pasa);
      if (!visibles.length) { lista.append(el('p', { class: 'nota', text: t(todas.length ? 'notas.nadaFiltro' : 'notas.vacio') })); return; }
      const grupo = el('div', { class: 'lista' });
      for (const m of visibles) {
        const cabeza = el('strong', { text: referencia(m.libro, m.cap, new Set([m.n])) });
        if (m.c) cabeza.dataset.color = m.c;
        grupo.append(el('button', {
          type: 'button', class: 'opcion sola', onclick: () => { cerrarHoja(); ctx.irA(m.libro, m.cap, { vers: m.n }); },
        }, el('span', {}, cabeza, m.nota ? el('small', { text: m.nota }) : null, m.m ? el('small', { class: 'etiqueta', text: t('est.marcador') }) : null)));
      }
      lista.append(grupo);
    }

    async function guardarCopia() {
      const datos = { formato: 'audiobible-notas', v: 1, marcas: await exportarMarcas() };
      const enlace = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(datos)], { type: 'application/json' })), download: 'audiobible-notas.json' });
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
    }

    async function comoTexto() {
      const lineas = todas.map((m) => `${referencia(m.libro, m.cap, new Set([m.n]))}${m.c ? ` [${t(`color.${m.c}`)}]` : ''}${m.m ? ` ★` : ''}${m.nota ? `\n${m.nota}` : ''}`);
      try {
        await navigator.clipboard.writeText(lineas.join('\n\n'));
        ctx.aviso(t('est.copiado'));
      } catch {
        ctx.aviso(t('est.sinCopiar'));
      }
    }

    const entrada = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    entrada.addEventListener('change', async () => {
      try {
        const datos = JSON.parse(await entrada.files[0].text());
        if (datos?.formato !== 'audiobible-notas' || !Array.isArray(datos.marcas)) throw new Error('formato');
        const n = await importarMarcas(datos.marcas);
        ctx.aviso(t('notas.restauradas', { n }));
        cerrarHoja();
        refrescar();
      } catch {
        ctx.aviso(t('notas.archivoMalo'));
      }
    });

    pintar();
    return el('div', {},
        pastillas([['todo', t('bus.todo')], ['notas', t('notas.notas')], ['subrayados', t('notas.subrayados')], ['marcadores', t('notas.marcadores')]], filtro, (f) => { filtro = f; pintar(); }),
        el('div', { class: 'aire' }),
        lista,
        el('h3', { text: t('notas.copia') }),
        el('p', { class: 'nota', text: t('notas.copiaNota') }),
        el('div', { class: 'aire' }),
        el('div', { class: 'pastillas' },
          el('button', { type: 'button', text: t('notas.guardarCopia'), onclick: guardarCopia, disabled: !todas.length }),
          el('button', { type: 'button', text: t('notas.restaurar'), onclick: () => entrada.click() }),
          el('button', { type: 'button', text: t('notas.comoTexto'), onclick: comoTexto, disabled: !todas.length })),
        entrada);
  }

  /* ---------- una palabra: definición y concordancia ---------- */

  const diccionario = new Map();          // letra → Promise<{clave: {n, x}}>
  function letraDe(letra) {
    if (!diccionario.has(letra)) {
      const p = fetch(new URL(`../data/diccionario/en/${letra}.json`, import.meta.url)).then((r) => (r.ok ? r.json() : {}));
      p.catch(() => diccionario.delete(letra));
      diccionario.set(letra, p);
    }
    return diccionario.get(letra);
  }

  // El diccionario está en inglés: se prueba la palabra y sus formas simples.
  async function definir(palabraInglesa) {
    const base = palabraInglesa.toLowerCase().replace(/[^a-z]/g, '');
    if (!base) return null;
    const formas = [base, base.replace(/'?s$/, ''), base.replace(/es$/, ''), base.replace(/ies$/, 'y'), base.replace(/eth$/, ''), base.replace(/ed$/, '')];
    for (const forma of new Set(formas)) {
      if (!forma) continue;
      const entrada = (await letraDe(forma[0]))[forma];
      if (entrada) return entrada;
    }
    return null;
  }

  async function abrirPalabra(p) {
    const version = estado.version;
    const cuerpo = el('div', {});
    const definicion = el('div', {});
    const apariciones = el('div', { class: 'resultados' }, el('p', { class: 'nota', text: t('bus.preparando', { version: version.sigla }) }));
    cuerpo.append(definicion, el('h3', { text: t('pal.apariciones', { version: version.sigla }) }), apariciones);
    abrirHoja({ titulo: p, contenido: cuerpo, ancha: true });
    limpiar();

    if (version.idioma === 'en') {
      definir(p).then((entrada) => {
        if (!entrada) return;
        definicion.append(el('h3', { text: t('pal.definicion') }));
        for (const parrafo of entrada.x.split('\n\n')) definicion.append(el('p', { class: 'definicion', lang: 'en', text: parrafo }));
        definicion.append(el('p', { class: 'nota', text: t('pal.fuente') }));
      }).catch(() => {});
    } else {
      definicion.append(el('p', { class: 'nota', text: t('pal.sinDiccionario') }));
    }

    let datos;
    try { datos = await indiceDe(version.id); } catch { apariciones.replaceChildren(el('p', { class: 'nota', text: t('aviso.cargaLibro') })); return; }
    const r = buscar(datos, p, { limite: 150 });
    apariciones.replaceChildren(el('p', { class: 'nota', text: r.total > 150 ? t('bus.muchos', { total: r.total.toLocaleString(idioma()), n: 150 }) : t(r.total === 1 ? 'bus.uno' : 'bus.varios', { total: r.total }) }));
    let libroActual = null;
    let grupo = null;
    for (const v of r.resultados) {
      if (v.libro !== libroActual) {
        libroActual = v.libro;
        apariciones.append(el('h4', { text: nombreLibro(v.libro, idioma()) }));
        grupo = el('div', { class: 'lista' });
        apariciones.append(grupo);
      }
      const texto = el('small', {});
      for (const trozo of resaltar(v.texto, r.terminos)) texto.append(trozo.hallado ? el('mark', { text: trozo.texto }) : trozo.texto);
      grupo.append(el('button', { type: 'button', class: 'opcion sola', onclick: () => { cerrarHoja(); ctx.irA(v.libro, v.cap, { vers: v.n }); } },
        el('span', {}, el('strong', { text: `${v.cap}:${v.n}` }), texto)));
    }
  }

  /* ---------- gestos sobre el texto ---------- */

  const versoDe = (objetivo) => {
    const sup = objetivo.closest('sup.vn');
    if (sup?.dataset.v) return Number(sup.dataset.v);
    const w = objetivo.closest('.w');
    if (!w) return null;
    const pasaje = estado.vista[Number(w.closest('.pasaje').dataset.i)];
    return pasaje.palabras[Number(w.dataset.w)].verso;
  };

  // Tras una pulsación larga llega un «click» que no debe mover la lectura.
  let ultimaLarga = 0;
  const acabaDeSerLarga = () => Date.now() - ultimaLarga < 700;
  const seleccionarLargo = (n, objetivo = null) => {
    ultimaLarga = Date.now();
    // La palabra pulsada, sin los signos que la rodean.
    const w = objetivo?.closest('.w');
    palabra = w ? w.textContent.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') || null : null;
    alternar(n);
  };

  // Con el dedo, pulsación larga; con el ratón, botón derecho. En ambos, un
  // toque en el número del versículo.
  function conectar(capitulo) {
    let reloj = 0;
    let origen = null;
    capitulo.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !e.target.closest('.w')) return;
      origen = { x: e.clientX, y: e.clientY };
      const n = versoDe(e.target);
      clearTimeout(reloj);
      const objetivo = e.target;
      reloj = setTimeout(() => { navigator.vibrate?.(12); seleccionarLargo(n, objetivo); }, PULSACION_LARGA);
    });
    capitulo.addEventListener('pointermove', (e) => {
      if (origen && Math.hypot(e.clientX - origen.x, e.clientY - origen.y) > 10) clearTimeout(reloj);
    });
    for (const tipo of ['pointerup', 'pointercancel', 'pointerleave']) {
      capitulo.addEventListener(tipo, () => { clearTimeout(reloj); origen = null; });
    }
    capitulo.addEventListener('contextmenu', (e) => {
      const n = versoDe(e.target);
      if (n === null) return;
      e.preventDefault();
      if (!acabaDeSerLarga()) seleccionarLargo(n, e.target);
    });
  }

  // Devuelve true si el toque lo ha gastado el estudio y no debe mover la lectura.
  function alTocar(e) {
    if (acabaDeSerLarga()) return true;
    const sup = e.target.closest('sup.vn');
    if (sup?.dataset.v) { alternar(Number(sup.dataset.v)); return true; }
    if (seleccion.size && e.target.closest('.w')) { alternar(versoDe(e.target)); return true; }
    return false;
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && seleccion.size && !$('hoja').open) limpiar(); });

  return { conectar, alTocar, refrescar, limpiar, montarBusqueda, cuerpoNotas, referencia, textoDelDestino };
}
