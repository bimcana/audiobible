// Estado de la app y cableado entre los datos, la voz y la pantalla.
import { LIBROS, libro as datosLibro } from './referencia/canon.js';
import { nombreLibro, tituloCapitulo, anuncioCapitulo } from './referencia/nombres.js';
import { construirPasajes } from './lectura/pasajes.js';
import { textoParaVoz, reubicarPalabras } from './lectura/pronunciacion.js';
import { repartoVelocidad } from './voz/velocidad.js';
import { crearMotor, ErrorDeRed } from './voz/motor.js';
import { crearReproductor } from './voz/reproductor.js';
import { crearDescargas } from './voz/descargas.js';
import { capituloGuardado, capitulosGuardados, textosDeVoz } from './voz/guardado.js';
import { usoDeAudio, borrarAudio } from './almacen/audio.js';
import { hablar, callar, hayVozDeDispositivo } from './voz/dispositivo.js';
import { cargarCatalogo, cargarLibro, olvidarVersion, LibroAusente } from './datos/biblia.js';
import { cargarAjustes, guardarAjustes, cargarPosicion, guardarPosicion } from './almacen/ajustes.js';
import { t, fijarIdioma } from './i18n/textos.js';
import {
  pintarCapitulo, mensajeCarga, palabraEn, iluminar, activarPasaje, mantenerALaVista, destellar,
} from './ui/lector.js';
import { prepararHoja, prepararRotulosDeHoja, abrirHoja, cerrarHoja, hojaAbierta, el } from './ui/hoja.js';
import { abrirNavegador } from './ui/navegador.js';
import { abrirVersiones } from './ui/versiones.js';
import { abrirImportador, abrirGestion } from './ui/importar.js';
import { crearEstudio } from './estudio.js';
import { desbloquear } from './importar/privada.js';
import { crearCompartir } from './ui/compartir.js';
import { versiculoDelDia } from './datos/versiculo-del-dia.js';
import { anotar } from './almacen/historial.js';
import { cuerpoPlanes } from './ui/planes.js';
import { abrirLicencias } from './ui/licencias.js';
import { PLANES, claveCapitulo } from './planes/planes.js';
import { marcarCapitulo } from './almacen/planes.js';
import {
  abrirVoces, abrirVelocidad, abrirTemporizador, abrirTexto, abrirAjustes, etiquetaVelocidad, COLOR_DE_TEMA,
} from './ui/paneles.js';

const $ = (id) => document.getElementById(id);
const raiz = document.documentElement;

/* Catálogo mínimo de voces hasta que el motor responda con el completo. */
const VOCES_BASE = [
  { id: 'es-MX-JorgeNeural', name: 'Jorge', region: 'México', gender: 'M', lang: 'es' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia', region: 'México', gender: 'F', lang: 'es' },
  { id: 'en-US-AndrewMultilingualNeural', name: 'AndrewMultilingual', region: 'EE.UU.', gender: 'M', lang: 'en' },
  { id: 'en-US-AvaMultilingualNeural', name: 'AvaMultilingual', region: 'EE.UU.', gender: 'F', lang: 'en' },
];

const estado = {
  ajustes: cargarAjustes(),
  catalogo: [],
  version: null,           // entrada del catálogo
  libro: 'JHN',
  cap: 1,
  pasajes: [],
  vista: [],
  pasaje: 0,               // pasaje donde está la lectura
  voces: VOCES_BASE,
  temporizador: null,      // null | minutos | 'capitulo'
  relojTemporizador: 0,
  dispositivo: false,      // leyendo con la voz del dispositivo
  sonando: false,
  repetir: false,          // al terminar el capítulo, volver a empezarlo
  cargando: false,         // hay un capítulo pidiéndose
  desplazadoEn: 0,         // última vez que el lector movió la página a mano
};

const motor = crearMotor({ url: estado.ajustes.motor });

/* ---------- utilidades ---------- */

// El idioma de la versión que se lee. Los nombres de los libros lo siguen a
// él y no al de la interfaz: con la KJV se lee «John 3» aunque los menús estén
// en español.
const idiomaTexto = () => estado.version?.idioma ?? estado.ajustes.idioma;
const vozActual = () => (idiomaTexto() === 'en' ? estado.ajustes.vozEn : estado.ajustes.vozEs);
const reparto = () => repartoVelocidad(estado.ajustes.velocidad);

let relojAviso = 0;
function aviso(texto, ms = 4500) {
  const caja = $('aviso');
  caja.textContent = texto;
  caja.hidden = false;
  clearTimeout(relojAviso);
  relojAviso = setTimeout(() => { caja.hidden = true; }, ms);
}

/* ---------- modelos de capítulo ---------- */

const modelos = new Map();          // "rvg/JHN/3" → pasajes

async function modeloDe(version, libro, cap) {
  const clave = `${version}/${libro}/${cap}`;
  if (!modelos.has(clave)) {
    const datos = await cargarLibro(version, libro);
    modelos.set(clave, construirPasajes(datos.caps[cap - 1]));
    if (modelos.size > 12) modelos.delete(modelos.keys().next().value);
  }
  return modelos.get(clave);
}

/* La versión con la que se compara: sus versículos, por número. */
const paralelos = new Map();        // "kjv/JHN/3" → {idioma, versos: Map}

const versionParalela = () => {
  const id = estado.ajustes.comparar;
  return id && id !== estado.version?.id ? estado.catalogo.find((v) => v.id === id) ?? null : null;
};

async function cargarParalelo(libro, cap) {
  const v = versionParalela();
  if (!v) return null;
  const clave = `${v.id}/${libro}/${cap}`;
  if (!paralelos.has(clave)) {
    const versos = new Map();
    try {
      const datos = await cargarLibro(v.id, libro);
      for (const e of datos.caps[cap - 1] ?? []) {
        if (e.t !== 'v') continue;
        const texto = e.x.map((t2) => (typeof t2 === 'string' ? t2 : t2.j ?? t2.d ?? ' ')).join('').replace(/\s+/g, ' ').trim();
        versos.set(e.n, { texto, f: e.f });
      }
    } catch { /* esa versión no tiene el libro: se compara con nada */ }
    paralelos.set(clave, { idioma: v.idioma, versos });
    if (paralelos.size > 6) paralelos.delete(paralelos.keys().next().value);
  }
  return paralelos.get(clave);
}

const paraleloListo = (libro, cap) => {
  const v = versionParalela();
  return v ? paralelos.get(`${v.id}/${libro}/${cap}`) ?? null : null;
};

function vecino(libro, cap, paso) {
  const l = datosLibro(libro);
  const c = cap + paso;
  if (c >= 1 && c <= l.caps) return { libro, cap: c };
  const otro = LIBROS[l.orden + paso];
  if (!otro) return null;
  return { libro: otro.id, cap: paso > 0 ? 1 : otro.caps };
}

/* ---------- apariencia ---------- */

function aplicarAjustes() {
  const a = estado.ajustes;
  fijarIdioma(a.idioma);
  raiz.lang = a.idioma;
  raiz.dataset.tema = a.tema;
  raiz.dataset.fuente = a.fuente;
  raiz.dataset.ancho = a.ancho;
  raiz.dataset.interlineado = a.interlineado;
  raiz.dataset.disposicion = a.disposicion;
  raiz.dataset.numeros = a.numeros ? '1' : '0';
  raiz.dataset.jesus = a.jesus ? '1' : '0';
  raiz.style.setProperty('--tamano', `${a.tamano}px`);
  document.querySelector('meta[name="theme-color"]').content = COLOR_DE_TEMA[a.tema];
}

function rotular() {
  const leer = $('btnLeer');
  const e = leer.dataset.estado;
  leer.setAttribute('aria-label', t(e === 'sonando' ? 'pausar' : e === 'cargando' ? 'cargando' : 'leer'));
  $('btnRepetir').setAttribute('aria-label', t('repetir'));
  $('btnRepetir').title = t('repetir');
  $('btnRepetir').setAttribute('aria-pressed', String(estado.repetir));
  $('btnAnterior').setAttribute('aria-label', t('anterior'));
  $('btnAnterior').title = t('anterior');
  $('btnSiguiente').setAttribute('aria-label', t('siguiente'));
  $('btnSiguiente').title = t('siguiente');
  $('btnTemporizador').setAttribute('aria-label', t('temporizador'));
  $('btnTemporizador').title = t('temporizador');
  $('btnTemporizador').setAttribute('aria-pressed', String(estado.temporizador !== null));
  $('btnAjustes').setAttribute('aria-label', t('ajustes'));
  $('btnNotas').setAttribute('aria-label', t('notas.titulo'));
  $('btnNotas').title = t('notas.titulo');
  const rotulos = { biblia: t('tab.biblia'), planes: t('plan.titulo'), buscar: t('bus.titulo'), compartir: t('est.compartir') };
  $('compartirTitulo').textContent = t('comp.titulo');
  for (const b of $('pestanas').children) b.querySelector('span').textContent = rotulos[b.dataset.vista];
  $('planesTitulo').textContent = t('plan.tituloLargo');
  $('buscarTitulo').textContent = t('bus.titulo');
  $('btnTexto').setAttribute('aria-label', t('texto'));
  $('btnVoz').setAttribute('aria-label', `${t('voz')}: ${nombreDeVoz()}`);
  $('btnVelocidad').setAttribute('aria-label', `${t('velocidad')}: ${etiquetaVelocidad(estado.ajustes.velocidad)}`);
  $('vozNombre').textContent = nombreDeVoz();
  $('btnVelocidad').textContent = etiquetaVelocidad(estado.ajustes.velocidad);
  if (estado.version) {
    $('refTexto').textContent = tituloCapitulo(estado.libro, estado.cap, idiomaTexto());
    $('btnVersion').textContent = versionParalela() ? `${estado.version.sigla} · ${versionParalela().sigla}` : estado.version.sigla;
    $('btnVersion').setAttribute('aria-label', `${t('ver.titulo')}: ${estado.version.nombre}`);
    document.title = `${tituloCapitulo(estado.libro, estado.cap, idiomaTexto())} · ${estado.version.sigla} · AudioBible`;
  }
}

function nombreDeVoz() {
  const v = estado.voces.find((x) => x.id === vozActual());
  return (v?.name ?? vozActual().split('-')[2] ?? '').replace(/Multilingual|Neural/g, '');
}

function cambiarAjustes(parche) {
  const antes = { ...estado.ajustes };
  Object.assign(estado.ajustes, parche);
  guardarAjustes(estado.ajustes);
  aplicarAjustes();
  if (antes.idioma !== estado.ajustes.idioma) alCambiarDeIdioma();
}

function alCambiarDeIdioma() {
  prepararRotulosDeHoja({ cerrar: t('cerrar'), volver: t('volver') });
  rotular();
  pintar();
  pintarDelDia();
  // Las pestañas montadas se rehacen en el idioma nuevo la próxima vez que se abran.
  tallerCreado = null;
  $('compartirCuerpo').replaceChildren();
  estudio.olvidarBusqueda();
  if (vistaActual !== 'biblia') irAVista(vistaActual);
}

/* ---------- pintar el capítulo ---------- */

function pieDeCapitulo() {
  const idioma = idiomaTexto();
  const antes = vecino(estado.libro, estado.cap, -1);
  const despues = vecino(estado.libro, estado.cap, 1);
  const pie = el('nav', { class: 'pie-cap', 'aria-label': t('fin.capitulo') });
  if (antes) {
    pie.append(el('button', { type: 'button', text: `← ${tituloCapitulo(antes.libro, antes.cap, idioma)}`, onclick: () => irA(antes.libro, antes.cap) }));
  }
  if (despues) {
    pie.append(el('button', { type: 'button', class: 'sig', text: `${tituloCapitulo(despues.libro, despues.cap, idioma)} →`, onclick: () => irA(despues.libro, despues.cap) }));
  }
  return pie;
}

function pintar() {
  const idioma = idiomaTexto();
  const unSoloCapitulo = datosLibro(estado.libro).caps === 1;
  estado.vista = pintarCapitulo($('capitulo'), {
    nombreLibro: nombreLibro(estado.libro, idioma),
    numero: unSoloCapitulo ? null : estado.cap,
    pasajes: estado.pasajes,
    pie: pieDeCapitulo(),
    accion: botonDescarga,
    paralelo: paraleloListo(estado.libro, estado.cap),
  });
  raiz.classList.toggle('comparando', Boolean(paraleloListo(estado.libro, estado.cap)));
  pintarDescarga();
  estudio.limpiar();
  estudio.refrescar();
  $('capitulo').lang = idiomaTexto();
  activarPasaje(estado.vista, estado.pasaje);
  pintarAvance();
}

function pintarAvance() {
  const total = estado.pasajes.reduce((n, p) => n + p.texto.length, 0) || 1;
  let leido = 0;
  for (let i = 0; i < estado.pasaje; i++) leido += estado.pasajes[i].texto.length;
  if (estado.sonando || estado.dispositivo) leido += reproductor.unidad?.tipo === 'pasaje' ? reproductor.caracter : 0;
  $('avanceLleno').style.width = `${Math.min(100, (leido / total) * 100)}%`;
}

// Muestra un capítulo cuyo modelo ya está cargado.
function mostrar(libro, cap, pasajes, { pasaje = 0 } = {}) {
  estado.libro = libro;
  estado.cap = cap;
  estado.pasajes = pasajes;
  estado.pasaje = Math.min(pasaje, pasajes.length - 1);
  pintar();
  rotular();
  recordarPosicion();
  anotar(libro, cap);
  history.replaceState(null, '', `#/${estado.version.id}/${libro}/${cap}`);
}

function recordarPosicion() {
  guardarPosicion({ version: estado.version.id, libro: estado.libro, cap: estado.cap, pasaje: estado.pasaje });
}

// Abre un capítulo por petición del lector. Si se estaba leyendo, sigue leyendo.
// La versión solo cambia cuando su texto ya está cargado: así el estado nunca
// mezcla una versión con los pasajes de otra.
let peticion = 0;
async function irA(libro, cap, {
  vers = null, pasaje = 0, version = estado.version, leer = estado.sonando || estado.dispositivo,
} = {}) {
  const mia = ++peticion;
  detenerLectura();
  estado.cargando = true;
  if (libro !== estado.libro || cap !== estado.cap || version !== estado.version) mensajeCarga($('capitulo'), '…');
  let pasajes;
  try {
    pasajes = await modeloDe(version.id, libro, cap);
    await cargarParalelo(libro, cap);
  } catch (err) {
    if (mia !== peticion) return;
    estado.cargando = false;
    aviso(err instanceof LibroAusente
      ? t('aviso.libroAusente', { libro: nombreLibro(libro, idiomaTexto()), version: version.nombre })
      : t('aviso.cargaLibro'));
    if (estado.pasajes.length) pintar();
    return;
  }
  if (mia !== peticion) return;          // llegó tarde: ya se pidió otro capítulo
  estado.cargando = false;
  const otraVersion = version !== estado.version;
  if (version !== estado.version) {
    estado.version = version;
    cambiarAjustes(version.idioma === 'en' ? { versionEn: version.id } : { versionEs: version.id });
  }
  if (vers !== null) {
    const i = pasajes.findIndex((p) => p.versos.some((v) => v.n >= vers));
    if (i >= 0) pasaje = i;
  }
  mostrar(libro, cap, pasajes, { pasaje });

  const escena = $('escena');
  if (vers !== null || pasaje > 0) {
    const v = estado.vista[estado.pasaje];
    const palabra = vers !== null ? v.palabras.find((p) => p.verso >= vers) : v.palabras[0];
    mantenerALaVista(escena, palabra?.el ?? v.el, { forzar: true, instantaneo: true });
    if (vers !== null) destellar(estado.vista, palabra?.verso ?? vers);
  } else {
    escena.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (otraVersion && estado.catalogo.length) pintarDelDia();
  if (leer) leerDesde(estado.pasaje);
}

/* ---------- la voz ---------- */

function textoDeUnidad(u) {
  if (u.tipo === 'anuncio') {
    return { texto: anuncioCapitulo(u.libro, u.cap, idiomaTexto(), { conLibro: u.conLibro }), mapa: null };
  }
  return textoParaVoz(u.pasajes[u.i].texto, { version: estado.version.id });
}

async function siguienteUnidad(u) {
  if (u.tipo === 'anuncio') return { tipo: 'pasaje', libro: u.libro, cap: u.cap, i: 0, pasajes: u.pasajes };
  if (u.i + 1 < u.pasajes.length) return { ...u, i: u.i + 1 };
  if (estado.temporizador === 'capitulo') return null;
  // Repetir capítulo: al llegar al final se vuelve a empezar el mismo, sin anuncio.
  if (estado.repetir) return { ...u, i: 0, vuelta: (u.vuelta ?? 0) + 1 };
  if (!estado.ajustes.continuar) return null;
  const sig = vecino(u.libro, u.cap, 1);
  if (!sig) return null;
  const pasajes = await modeloDe(estado.version.id, sig.libro, sig.cap);
  await cargarParalelo(sig.libro, sig.cap);
  // El capítulo solo se anuncia aquí: al pasar de uno al siguiente.
  return { tipo: 'anuncio', breve: true, libro: sig.libro, cap: sig.cap, conLibro: sig.libro !== u.libro, pasajes };
}

const lectorQuieto = () => Date.now() - estado.desplazadoEn > 4000;

// Un capítulo oído hasta el final cuenta como leído en los planes que lo incluyen.
function darPorLeido(u) {
  if (!u || u.tipo !== 'pasaje' || u.i + 1 < u.pasajes.length) return;
  const planes = PLANES.filter((p) => p.libros.has(u.libro)).map((p) => p.id);
  marcarCapitulo(claveCapitulo(u.libro, u.cap), { planes }).catch(() => {});
}

let unidadAnterior = null;

function alCambiarDeUnidad(u) {
  const otraVuelta = unidadAnterior && (u.vuelta ?? 0) !== (unidadAnterior.vuelta ?? 0);
  if (unidadAnterior && (otraVuelta || unidadAnterior.libro !== u.libro || unidadAnterior.cap !== u.cap)) darPorLeido(unidadAnterior);
  if (otraVuelta) $('escena').scrollTo({ top: 0, behavior: 'smooth' });
  unidadAnterior = u;
  if (u.libro !== estado.libro || u.cap !== estado.cap) {
    mostrar(u.libro, u.cap, u.pasajes);
    $('escena').scrollTo({ top: 0, behavior: 'instant' });
  }
  if (u.tipo === 'pasaje') {
    estado.pasaje = u.i;
    activarPasaje(estado.vista, u.i);
    recordarPosicion();
    if (lectorQuieto()) mantenerALaVista($('escena'), estado.vista[u.i].el.querySelector('.texto'));
  } else {
    activarPasaje(estado.vista, -1);
  }
  pintarAvance();
  sesionDeMedios();
}

const reproductor = crearReproductor({
  claveDe: (u) => `${estado.version.id}|${u.libro}|${u.cap}|${u.tipo}|${u.i ?? ''}|${vozActual()}|${reparto().motor}`,

  async clipDe(u) {
    const { texto, mapa } = textoDeUnidad(u);
    const { motor: velocidad, total: objetivo } = reparto();
    const clip = await motor.clip({
      texto, voz: vozActual(), velocidad, objetivo,
      origen: { version: estado.version.id, libro: u.libro, cap: u.tipo === 'anuncio' ? 0 : u.cap },
    });
    return { url: clip.url, palabras: reubicarPalabras(clip.palabras, mapa), velocidad: clip.velocidad };
  },

  siguiente: siguienteUnidad,

  // El audio puede venir de lo guardado, grabado a otra velocidad.
  ritmo: (clip) => reparto().total / clip.velocidad,

  al: {
    unidad: alCambiarDeUnidad,

    palabra(u, i, palabras) {
      if (u.tipo !== 'pasaje' || i < 0) return;
      const v = estado.vista[u.i];
      if (!v) return;
      const n = palabraEn(v, palabras[i].cs);
      const cambioDeOracion = iluminar(v, n);
      if (cambioDeOracion) pintarAvance();
      if (!lectorQuieto()) return;
      if (cambioDeOracion) {
        // Se mira hasta dónde llega la oración que empieza, no solo dónde empieza.
        let fin = n;
        while (fin + 1 < v.palabras.length && v.palabras[fin + 1].k === v.palabras[n].k) fin++;
        mantenerALaVista($('escena'), v.palabras[n]?.el, { hasta: v.palabras[fin]?.el });
      } else {
        mantenerALaVista($('escena'), v.palabras[n]?.el);      // solo actúa si la voz llegó al límite
      }
    },

    estado(e) {
      estado.sonando = e === 'sonando';
      pintarEstado(e);
      clearTimeout(relojDespertar);
      if (e === 'cargando') relojDespertar = setTimeout(() => aviso(t('aviso.despertando'), 12000), 4500);
      else if (!$('aviso').hidden && $('aviso').textContent === t('aviso.despertando')) $('aviso').hidden = true;
    },

    fin() {
      darPorLeido(unidadAnterior);
      unidadAnterior = null;
      if (estado.temporizador === 'capitulo') { fijarTemporizador(null); aviso(t('temp.fin')); }
      else if (!vecino(estado.libro, estado.cap, 1)) aviso(t('aviso.finBiblia'));
    },

    error(err, u) {
      // Sin red y sin el anuncio guardado: se salta y sigue con el capítulo,
      // que sí puede estar descargado.
      if (err instanceof ErrorDeRed && u.tipo === 'anuncio') {
        siguienteUnidad(u).then((sig) => sig && reproductor.reproducir(sig));
        return;
      }
      if (err instanceof ErrorDeRed && hayVozDeDispositivo(idiomaTexto())) {
        aviso(t('aviso.dispositivo'));
        leerConDispositivo(u);
      } else if (err instanceof ErrorDeRed) {
        aviso(t('aviso.sinRed'));
      } else if (err?.name !== 'AbortError') {
        aviso(t('aviso.error', { detalle: err?.message ?? '' }));
      }
    },
  },
});

let relojDespertar = 0;

function pintarEstado(e) {
  $('btnLeer').dataset.estado = e;
  raiz.classList.toggle('leyendo', e !== 'pausa');
  if (e === 'pausa') raiz.classList.remove('recogido');
  rotular();
  if (e === 'sonando') { pedirPantallaDespierta(); programarRecogida(); } else if (e === 'pausa') soltarPantalla();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = e === 'pausa' ? 'paused' : 'playing';
}

const unidadPasaje = (i) => ({ tipo: 'pasaje', libro: estado.libro, cap: estado.cap, i, pasajes: estado.pasajes });

function leerDesde(i, desdeCaracter = null) {
  if (estado.cargando || !estado.pasajes[i]) return;
  callar();
  estado.dispositivo = false;
  reproductor.reproducir(unidadPasaje(i), { desdeCaracter });
}

function detenerLectura() {
  callar();
  estado.dispositivo = false;
  reproductor.detener();
  estado.sonando = false;
  pintarEstado('pausa');
}

function alternarLectura() {
  if (estado.dispositivo) { detenerLectura(); return; }
  if (reproductor.sonando || $('btnLeer').dataset.estado === 'cargando') { reproductor.pausar(); return; }
  if (reproductor.unidad && reproductor.reanudar()) return;
  leerDesde(estado.pasaje);
}

// No interrumpe la lectura: solo decide qué pasa al llegar al final del capítulo.
function alternarRepeticion() {
  estado.repetir = !estado.repetir;
  rotular();
  aviso(t(estado.repetir ? 'repetir.activado' : 'repetir.desactivado', { capitulo: tituloCapitulo(estado.libro, estado.cap, idiomaTexto()) }), 3200);
  // Lo que ya estaba precargado como «lo siguiente» deja de valer.
  reproductor.olvidarRelevo();
  reproductor.rehacerRelevo();
}

function saltarCapitulo(paso) {
  const destino = vecino(estado.libro, estado.cap, paso);
  if (destino) irA(destino.libro, destino.cap);
}

// Tras cambiar de voz o de velocidad: el audio ya cargado puede no valer.
function reajustarVoz(antes) {
  pintarDescarga();
  reproductor.olvidarRelevo();
  // Misma voz y un cambio de velocidad moderado: basta acelerar o frenar el
  // audio que ya suena, sin pedir otro.
  const estirado = reproductor.velocidadDelAudio ? reparto().total / reproductor.velocidadDelAudio : 0;
  if (antes.voz === vozActual() && estirado >= 0.6 && estirado <= 1.7) {
    reproductor.ajustarRitmo();
    reproductor.rehacerRelevo();
    return;
  }
  if (reproductor.sonando && reproductor.unidad?.tipo === 'pasaje') {
    leerDesde(reproductor.unidad.i, reproductor.caracter);
  } else if (reproductor.sonando) {
    reproductor.reproducir(reproductor.unidad);
  } else {
    reproductor.detener();
  }
}

/* ---------- audio sin conexión ---------- */

const ICONOS_DESCARGA = {
  nada: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg>',
  bajando: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect class="lleno" x="9" y="9" width="6" height="6" rx="1"/></svg>',
  guardado: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>',
  confirmar: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
};

const botonDescarga = el('button', { type: 'button', class: 'icono descarga', onclick: alternarDescarga });

// La descarga va ligada al capítulo y a la voz: otra voz es otro audio.
const grupoDescarga = (libro = estado.libro, cap = estado.cap) => `${estado.version.id}/${libro}/${cap}/${vozActual()}`;

function ponerDescarga(modo, valores = {}) {
  botonDescarga.dataset.estado = modo;
  botonDescarga.innerHTML = ICONOS_DESCARGA[modo];
  const clave = { nada: 'desc.descargar', bajando: 'desc.bajando', guardado: 'desc.guardado', confirmar: 'desc.confirmar' }[modo];
  botonDescarga.setAttribute('aria-label', t(clave, valores));
  botonDescarga.title = t(clave, valores);
  botonDescarga.style.setProperty('--hecho', valores.total ? `${(valores.n / valores.total) * 100}%` : '0%');
}

async function pintarDescarga() {
  if (!estado.version || !estado.pasajes.length) return;
  const grupo = grupoDescarga();
  const enCurso = descargas.estado(grupo);
  if (enCurso) { ponerDescarga('bajando', { n: enCurso.hechos, total: enCurso.total }); return; }
  const guardado = await capituloGuardado({ version: estado.version.id, libro: estado.libro, pasajes: estado.pasajes, voz: vozActual() });
  if (grupo === grupoDescarga() && !descargas.estado(grupo)) ponerDescarga(guardado ? 'guardado' : 'nada');
}

const descargas = crearDescargas({
  guardar: (pedido) => motor.guardar(pedido),
  alAvanzar(grupo, d) {
    if (grupo !== grupoDescarga()) return;
    if (d) ponerDescarga('bajando', { n: d.hechos, total: d.total });
  },
});

async function alternarDescarga() {
  const grupo = grupoDescarga();
  const { libro, cap } = estado;
  const version = estado.version.id;
  const titulo = tituloCapitulo(libro, cap, idiomaTexto());
  const modo = botonDescarga.dataset.estado;

  if (modo === 'bajando') { descargas.cancelar(grupo); return; }
  if (modo === 'guardado') {
    ponerDescarga('confirmar');
    setTimeout(() => { if (botonDescarga.dataset.estado === 'confirmar') pintarDescarga(); }, 4000);
    return;
  }
  if (modo === 'confirmar') {
    await borrarAudio({ libro: `${version}/${libro}`, cap });
    aviso(t('desc.quitada', { capitulo: titulo }));
    pintarDescarga();
    return;
  }

  navigator.storage?.persist?.().catch(() => {});      // que el navegador no lo borre por su cuenta
  const voz = vozActual();
  const { motor: velocidad } = reparto();
  const pedidos = textosDeVoz(estado.pasajes, version).map((texto) => ({ texto, voz, velocidad, origen: { version, libro, cap } }));
  // También el anuncio del capítulo, para que la lectura continua llegue a él sin red.
  const anuncios = new Set([false, cap === 1].map((conLibro) => anuncioCapitulo(libro, cap, idiomaTexto(), { conLibro })));
  for (const texto of anuncios) pedidos.push({ texto, voz, velocidad, origen: { version, libro, cap: 0 } });
  try {
    const fin = await descargas.descargar(grupo, pedidos);
    if (fin === 'hecha') aviso(t('desc.lista', { capitulo: titulo }));
    if (fin === 'cancelada') aviso(t('desc.cancelada'));
  } catch {
    aviso(t('desc.error'));
  }
  pintarDescarga();
}

// Para el navegador de libros: qué capítulos de un libro tienen el audio guardado.
async function capitulosConAudio(libro) {
  const datos = await cargarLibro(estado.version.id, libro);
  return capitulosGuardados({ version: estado.version.id, libro, capitulos: datos.caps, voz: vozActual() });
}

const nombreDeGrupo = (version, libro) => {
  const v = estado.catalogo.find((x) => x.id === version);
  return `${nombreLibro(libro, idiomaTexto()) || t('voz.titulo')} · ${v?.sigla ?? version}`;
};

/* ---------- respaldo: voz del dispositivo ---------- */

function leerConDispositivo(u) {
  estado.dispositivo = true;
  reproductor.detener();
  pintarEstado('sonando');
  alCambiarDeUnidad(u);
  const { texto, mapa } = textoDeUnidad(u);
  hablar({
    texto,
    idioma: idiomaTexto(),
    ritmo: Math.min(2, reparto().total),
    alLimite(c) {
      if (u.tipo !== 'pasaje') return;
      const v = estado.vista[u.i];
      const cambio = iluminar(v, palabraEn(v, mapa ? (mapa[c] ?? c) : c));
      if (cambio) mantenerALaVista($('escena'), v.palabras[v.iluminada]?.el);
    },
    async alFin() {
      let sig = null;
      try { sig = await siguienteUnidad(u); } catch { /* fin */ }
      if (!estado.dispositivo) return;
      if (sig) leerConDispositivo(sig);
      else detenerLectura();
    },
  });
}

/* ---------- temporizador ---------- */

function fijarTemporizador(valor) {
  clearTimeout(estado.relojTemporizador);
  estado.temporizador = valor;
  if (typeof valor === 'number') {
    estado.relojTemporizador = setTimeout(() => {
      fijarTemporizador(null);
      if (estado.sonando || estado.dispositivo) { detenerLectura(); aviso(t('temp.fin')); }
    }, valor * 60000);
    aviso(t('temp.activo', { n: valor }));
  } else if (valor === 'capitulo') {
    reproductor.olvidarRelevo();
    aviso(t('temp.activoCapitulo'));
  }
  rotular();
}

/* ---------- pantalla despierta, controles del sistema ---------- */

let cerrojo = null;
async function pedirPantallaDespierta() {
  try { cerrojo ??= await navigator.wakeLock?.request('screen'); } catch { /* no disponible */ }
}
function soltarPantalla() {
  cerrojo?.release().catch(() => {});
  cerrojo = null;
}

function sesionDeMedios() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: tituloCapitulo(estado.libro, estado.cap, idiomaTexto()),
    artist: estado.version.nombre,
    album: 'AudioBible',
    artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
}

/* Leyendo, la barra superior se retira tras unos segundos sin actividad. */
let relojRecogida = 0;
function programarRecogida() {
  clearTimeout(relojRecogida);
  raiz.classList.remove('recogido');
  relojRecogida = setTimeout(() => {
    // Con una hoja abierta o una selección de versículos en curso, los controles se quedan.
    const ocupado = hojaAbierta() || vistaActual !== 'biblia' || raiz.classList.contains('seleccionando');
    if ((estado.sonando || estado.dispositivo) && !ocupado) raiz.classList.add('recogido');
  }, 3000);
}

/* ---------- voces ---------- */

async function cargarVoces() {
  try {
    const lista = await motor.voces();
    if (Array.isArray(lista) && lista.length) {
      estado.voces = lista;
      try { localStorage.setItem('audiobible-voces', JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
    }
  } catch {
    try {
      const guardadas = JSON.parse(localStorage.getItem('audiobible-voces') ?? 'null');
      if (Array.isArray(guardadas) && guardadas.length) estado.voces = guardadas;
    } catch { /* queda el catálogo mínimo */ }
  }
  rotular();
}

const muestra = new Audio();
async function probarVoz(v) {
  try {
    const clip = await motor.clip({ texto: t(`voz.muestra.${v.lang}`), voz: v.id, velocidad: reparto().motor });
    muestra.src = clip.url;
    await muestra.play();
  } catch (err) {
    aviso(t(err instanceof ErrorDeRed ? 'aviso.sinRed' : 'aviso.error', { detalle: err?.message ?? '' }));
  }
}

/* ---------- cambio de versión ---------- */

async function cambiarVersion(id) {
  const nueva = estado.catalogo.find((v) => v.id === id);
  if (!nueva || nueva.id === estado.version.id) return;
  const leia = estado.sonando || estado.dispositivo;
  // Se conserva el lugar por versículo, no por pasaje: cada versión agrupa distinto.
  const vers = estado.pasajes[estado.pasaje]?.versos[0]?.n ?? null;
  await irA(estado.libro, estado.cap, { version: nueva, vers: estado.pasaje > 0 ? vers : null, leer: leia });
}

/* ---------- estudio ---------- */

const estudio = crearEstudio({ estado, irA: (libro, cap, o) => irDesdeFuera(libro, cap, o), aviso, cargarLibro, compartir: (datos) => abrirEnCompartir(datos) });

async function cambiarComparacion(id) {
  cambiarAjustes({ comparar: id });
  paralelos.clear();
  await cargarParalelo(estado.libro, estado.cap);
  pintar();
  rotular();
}

/* ---------- pestañas: Biblia, Planes, Buscar ---------- */

let vistaActual = 'biblia';

function irAVista(vista) {
  vistaActual = vista;
  for (const id of ['biblia', 'planes', 'buscar', 'compartir']) {
    $(`vista${id[0].toUpperCase()}${id.slice(1)}`).hidden = id !== vista;
  }
  for (const b of $('pestanas').children) {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  estudio.limpiar();
  if (vista === 'planes') {
    $('planesCuerpo').replaceChildren(cuerpoPlanes({ idioma: idiomaTexto(), irA: irDesdeFuera, aviso }));
  }
  if (vista === 'buscar') estudio.montarBusqueda($('buscarCuerpo'));
  // Sin nada elegido, Compartir empieza con el versículo del día.
  if (vista === 'compartir' && taller.vacio) compartirDelDia();
}

/* ---------- compartir y versículo del día ---------- */

// Se crea al primer uso, cuando el idioma de la interfaz ya está fijado.
let tallerCreado = null;
function tallerDe() {
  tallerCreado ??= crearCompartir({ contenedor: $('compartirCuerpo'), aviso });
  return tallerCreado;
}
const taller = { get vacio() { return tallerDe().vacio; }, abrir: (datos) => tallerDe().abrir(datos) };

function abrirEnCompartir(datos) {
  taller.abrir(datos);
  irAVista('compartir');
  $('vistaCompartir').querySelector('.pagina-cuerpo').scrollTo({ top: 0 });
}

const versosDe = (d) => new Set(Array.from({ length: d.hasta - d.vers + 1 }, (_, i) => d.vers + i));

async function datosDelDia() {
  const d = versiculoDelDia();
  const texto = await estudio.textoDelDestino(estado.version.id, d);
  return { d, texto, referencia: estudio.referencia(d.libro, d.cap, versosDe(d)), sigla: estado.version.sigla };
}

async function compartirDelDia() {
  try {
    const { texto, referencia, sigla } = await datosDelDia();
    if (texto) taller.abrir({ texto, referencia, sigla });
  } catch { /* sin el libro a mano, Compartir queda vacío hasta elegir un versículo */ }
}

const CLAVE_DEL_DIA = 'audiobible-del-dia';

// La tarjeta del versículo del día, sobre el capítulo. Se quita con su aspa y vuelve mañana.
async function pintarDelDia() {
  const caja = $('delDia');
  const { clave } = versiculoDelDia();
  let visto = null;
  try { visto = localStorage.getItem(CLAVE_DEL_DIA); } catch { /* sin almacenamiento */ }
  if (visto === clave) { caja.hidden = true; return; }
  let datos;
  try { datos = await datosDelDia(); } catch { caja.hidden = true; return; }
  if (!datos.texto) { caja.hidden = true; return; }
  const { d, texto, referencia, sigla } = datos;
  const cerrar = el('button', {
    type: 'button', class: 'icono', 'aria-label': t('dia.quitar'),
    onclick: () => { caja.hidden = true; try { localStorage.setItem(CLAVE_DEL_DIA, clave); } catch { /* sin almacenamiento */ } },
  });
  cerrar.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const cita = el('p', { class: 'dia-texto', text: texto });
  cita.lang = estado.version.idioma;
  caja.replaceChildren(
    el('div', { class: 'dia-cabeza' }, el('p', { class: 'cap-libro', text: t('dia.titulo') }), cerrar),
    cita,
    el('p', { class: 'dia-ref', text: `${referencia} · ${sigla}` }),
    el('div', { class: 'pastillas' },
      el('button', { type: 'button', text: t('dia.escuchar'), onclick: () => escucharSuelto(texto) }),
      el('button', { type: 'button', text: t('est.compartir'), onclick: () => abrirEnCompartir({ texto, referencia, sigla }) }),
      el('button', { type: 'button', text: t('dia.leer'), onclick: () => irA(d.libro, d.cap, { vers: d.vers }) })));
  caja.hidden = false;
}

// Lee en voz alta un texto suelto, sin mover la lectura del capítulo.
async function escucharSuelto(texto) {
  if (estado.sonando) reproductor.pausar();
  try {
    const { motor: velocidad } = reparto();
    const clip = await motor.clip({ texto: textoParaVoz(texto, { version: estado.version.id }).texto, voz: vozActual(), velocidad });
    muestra.src = clip.url;
    await muestra.play();
  } catch (err) {
    aviso(t(err instanceof ErrorDeRed ? 'aviso.sinRed' : 'aviso.error', { detalle: err?.message ?? '' }));
  }
}

// Abrir un pasaje desde Planes o Buscar: se vuelve a la Biblia.
function irDesdeFuera(libro, cap, opciones = {}) {
  irAVista('biblia');
  return irA(libro, cap, opciones);
}

async function abrirNotas() {
  abrirHoja({ titulo: t('notas.titulo'), contenido: await estudio.cuerpoNotas() });
}

/* ---------- versiones propias ---------- */

function verVersiones() {
  const idioma = estado.ajustes.idioma;
  abrirVersiones({
    catalogo: estado.catalogo, idioma, actual: estado.version.id, libro: estado.libro, cap: estado.cap,
    alElegir: cambiarVersion,
    comparar: estado.ajustes.comparar ?? null,
    alComparar: cambiarComparacion,
    alImportar: () => abrirImportador({ idioma, alTerminar: alGuardarPropia, volver: verVersiones }),
    alGestionar: (version) => abrirGestion({ version, idioma, alCambiar: alGuardarPropia, alQuitar: alQuitarPropia, volver: verVersiones }),
  });
}

async function alGuardarPropia(meta) {
  olvidarVersion(meta.id);
  for (const clave of [...modelos.keys()]) if (clave.startsWith(`${meta.id}/`)) modelos.delete(clave);
  estado.catalogo = await cargarCatalogo();
  aviso(t('imp.guardada', { version: meta.nombre }));
  const nueva = estado.catalogo.find((v) => v.id === meta.id);
  if (estado.version.id === meta.id) estado.version = nueva;       // misma versión, ficha actualizada
  await irA(estado.libro, estado.cap, { version: nueva, leer: false });
}

async function alQuitarPropia(version) {
  olvidarVersion(version.id);
  estado.catalogo = await cargarCatalogo();
  aviso(t('imp.quitada', { version: version.nombre }));
  if (estado.version.id !== version.id) return;
  const porDefecto = estado.catalogo.find((v) => v.id === (version.idioma === 'en' ? 'kjv' : 'rvg')) ?? estado.catalogo[0];
  await irA(estado.libro, estado.cap, { version: porDefecto, leer: false });
}

/* ---------- eventos ---------- */

function conectar() {
  prepararHoja({ cerrar: t('cerrar'), volver: t('volver') });

  $('btnLeer').addEventListener('click', alternarLectura);
  $('btnRepetir').addEventListener('click', alternarRepeticion);
  $('btnAnterior').addEventListener('click', () => saltarCapitulo(-1));
  $('btnSiguiente').addEventListener('click', () => saltarCapitulo(1));

  $('btnReferencia').addEventListener('click', () => abrirNavegador({
    idioma: idiomaTexto(),
    actual: { libro: estado.libro, cap: estado.cap },
    alIr: (libro, cap, vers) => irA(libro, cap, { vers }),
    guardados: capitulosConAudio,
  }));

  $('btnVersion').addEventListener('click', verVersiones);
  $('btnNotas').addEventListener('click', abrirNotas);
  for (const b of $('pestanas').children) b.addEventListener('click', () => irAVista(b.dataset.vista));
  estudio.conectar($('capitulo'));

  $('btnVoz').addEventListener('click', () => abrirVoces({
    voces: estado.voces, idioma: idiomaTexto(), actual: vozActual(), alProbar: probarVoz,
    alElegir(v) {
      const antes = { voz: vozActual(), motor: reparto().motor };
      cambiarAjustes(v.lang === 'en' ? { vozEn: v.id } : { vozEs: v.id });
      rotular();
      reajustarVoz(antes);
    },
  }));

  $('btnVelocidad').addEventListener('click', () => abrirVelocidad({
    actual: estado.ajustes.velocidad,
    alCambiar(velocidad) {
      const antes = { voz: vozActual(), motor: reparto().motor };
      cambiarAjustes({ velocidad });
      rotular();
      reajustarVoz(antes);
    },
  }));

  $('btnTemporizador').addEventListener('click', () => abrirTemporizador({ actual: estado.temporizador, alElegir: fijarTemporizador }));
  $('btnTexto').addEventListener('click', () => abrirTexto({ ajustes: estado.ajustes, cambiar: cambiarAjustes }));
  $('btnAjustes').addEventListener('click', () => abrirAjustes({
    ajustes: estado.ajustes,
    cambiar(parche) {
      const idiomaAntes = estado.ajustes.idioma;
      cambiarAjustes(parche);
      if (estado.ajustes.idioma !== idiomaAntes) $('btnAjustes').click();     // la hoja, en el idioma nuevo
    },
    privada: { desbloquear, alDesbloquear: (ficha) => { cerrarHoja(); alGuardarPropia(ficha); } },
    alVerLicencias: () => abrirLicencias({ catalogo: estado.catalogo, volver: () => $('btnAjustes').click() }),
    almacen: {
      uso: usoDeAudio,
      nombre: nombreDeGrupo,
      borrar: async (que) => { await borrarAudio(que); pintarDescarga(); },
    },
    alGuardarMotor(url) {
      cambiarAjustes({ motor: url.trim() });
      motor.cambiarUrl(url);
      aviso(t('aj.guardado'));
      cargarVoces();
    },
  }));

  // Con los controles ocultos, el primer toque solo los trae de vuelta: no mueve la lectura.
  let tocoOculto = false;
  document.addEventListener('pointerdown', () => { tocoOculto = raiz.classList.contains('recogido'); }, { capture: true, passive: true });

  // Un toque en cualquier palabra lleva la lectura al comienzo de su oración.
  $('capitulo').addEventListener('click', (e) => {
    if (tocoOculto) { tocoOculto = false; return; }
    if (estudio.alTocar(e)) return;
    const w = e.target.closest('.w');
    if (!w || getSelection()?.toString()) return;
    const i = Number(w.closest('.pasaje').dataset.i);
    const v = estado.vista[i];
    const oracion = v.oraciones[v.palabras[Number(w.dataset.w)].k];
    estado.desplazadoEn = 0;
    leerDesde(i, oracion.cs);
  });

  const escena = $('escena');
  for (const tipo of ['wheel', 'touchmove']) {
    escena.addEventListener(tipo, () => { estado.desplazadoEn = Date.now(); }, { passive: true });
  }
  for (const tipo of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchmove']) {
    document.addEventListener(tipo, () => { if (estado.sonando || estado.dispositivo) programarRecogida(); }, { passive: true });
  }

  document.addEventListener('keydown', (e) => {
    if (hojaAbierta() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); alternarLectura(); }
    else if (e.key === 'ArrowRight' && e.shiftKey) saltarCapitulo(1);
    else if (e.key === 'ArrowLeft' && e.shiftKey) saltarCapitulo(-1);
    else if (e.key === 'ArrowRight' && estado.pasaje + 1 < estado.pasajes.length) irAlPasaje(estado.pasaje + 1);
    else if (e.key === 'ArrowLeft' && estado.pasaje > 0) irAlPasaje(estado.pasaje - 1);
    else if (e.key.toLowerCase() === 'r') alternarRepeticion();
  });

  if ('mediaSession' in navigator) {
    const acciones = {
      play: alternarLectura,
      pause: alternarLectura,
      previoustrack: () => saltarCapitulo(-1),
      nexttrack: () => saltarCapitulo(1),
    };
    for (const [accion, hacer] of Object.entries(acciones)) {
      try { navigator.mediaSession.setActionHandler(accion, hacer); } catch { /* acción no admitida */ }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && estado.sonando) pedirPantallaDespierta();
  });

  addEventListener('hashchange', () => {
    const destino = leerHash();
    if (!destino) return;
    const otraVersion = estado.catalogo.find((v) => v.id === destino.version && v.id !== estado.version.id);
    if (otraVersion) {
      irA(destino.libro, destino.cap, { version: otraVersion, leer: false });
    } else if (destino.libro !== estado.libro || destino.cap !== estado.cap) {
      irA(destino.libro, destino.cap);
    }
  });
}

function irAlPasaje(i) {
  if (estado.sonando || estado.dispositivo) { leerDesde(i); return; }
  reproductor.detener();
  estado.pasaje = i;
  activarPasaje(estado.vista, i);
  recordarPosicion();
  pintarAvance();
  mantenerALaVista($('escena'), estado.vista[i].el, { forzar: true });
}

/* ---------- arranque ---------- */

function leerHash() {
  const m = /^#\/([a-z0-9-]+)\/([0-9A-Z]{3})\/(\d+)$/.exec(location.hash);
  if (!m) return null;
  const l = datosLibro(m[2]);
  const cap = Number(m[3]);
  if (!l || cap < 1 || cap > l.caps) return null;
  return { version: m[1], libro: m[2], cap };
}

async function arrancar() {
  aplicarAjustes();
  conectar();
  rotular();
  mensajeCarga($('capitulo'), '…');

  try {
    estado.catalogo = await cargarCatalogo();
  } catch {
    mensajeCarga($('capitulo'), t('aviso.cargaLibro'));
    return;
  }

  const enlace = leerHash();
  const guardada = cargarPosicion();
  const a = estado.ajustes;
  const porDefecto = a.idioma === 'en' ? a.versionEn : a.versionEs;
  const buscar = (id) => estado.catalogo.find((v) => v.id === id);
  estado.version = buscar(enlace?.version) ?? buscar(guardada?.version) ?? buscar(porDefecto) ?? estado.catalogo[0];

  const destino = enlace ?? (guardada && datosLibro(guardada.libro) ? guardada : { libro: 'JHN', cap: 1 });
  // El enlace de la barra de direcciones es el del último capítulo abierto: si
  // coincide con lo guardado, se vuelve al pasaje exacto y no al principio.
  const mismoSitio = guardada && destino.libro === guardada.libro && destino.cap === guardada.cap;
  await irA(destino.libro, destino.cap, { pasaje: mismoSitio ? guardada.pasaje ?? 0 : 0, leer: false });
  // Idioma, versión y apariencia quedan guardados desde el primer uso.
  guardarAjustes(estado.ajustes);
  pintarDelDia();
  cargarVoces();
  // El service worker deja la app y los textos abiertos disponibles sin conexión.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

arrancar();
