// Estado de la app y cableado entre los datos, la voz y la pantalla.
import { LIBROS, libro as datosLibro } from './referencia/canon.js';
import { nombreLibro, tituloCapitulo, anuncioCapitulo } from './referencia/nombres.js';
import { construirPasajes } from './lectura/pasajes.js';
import { textoParaVoz, reubicarPalabras } from './lectura/pronunciacion.js';
import { repartoVelocidad } from './voz/velocidad.js';
import { crearMotor, ErrorDeRed } from './voz/motor.js';
import { crearReproductor } from './voz/reproductor.js';
import { hablar, callar, hayVozDeDispositivo } from './voz/dispositivo.js';
import { cargarCatalogo, cargarLibro, olvidarVersion, LibroAusente } from './datos/biblia.js';
import { cargarAjustes, guardarAjustes, cargarPosicion, guardarPosicion } from './almacen/ajustes.js';
import { t, fijarIdioma } from './i18n/textos.js';
import {
  pintarCapitulo, mensajeCarga, palabraEn, iluminar, activarPasaje, mantenerALaVista,
} from './ui/lector.js';
import { prepararHoja, hojaAbierta, el } from './ui/hoja.js';
import { abrirNavegador } from './ui/navegador.js';
import { abrirVersiones } from './ui/versiones.js';
import { abrirImportador, abrirGestion } from './ui/importar.js';
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
  cargando: false,         // hay un capítulo pidiéndose
  desplazadoEn: 0,         // última vez que el lector movió la página a mano
};

const motor = crearMotor({ url: estado.ajustes.motor });

/* ---------- utilidades ---------- */

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
  $('btnAnterior').setAttribute('aria-label', t('anterior'));
  $('btnAnterior').title = t('anterior');
  $('btnSiguiente').setAttribute('aria-label', t('siguiente'));
  $('btnSiguiente').title = t('siguiente');
  $('btnTemporizador').setAttribute('aria-label', t('temporizador'));
  $('btnTemporizador').title = t('temporizador');
  $('btnTemporizador').setAttribute('aria-pressed', String(estado.temporizador !== null));
  $('btnAjustes').setAttribute('aria-label', t('ajustes'));
  $('btnTexto').setAttribute('aria-label', t('texto'));
  $('btnVoz').setAttribute('aria-label', `${t('voz')}: ${nombreDeVoz()}`);
  $('btnVelocidad').setAttribute('aria-label', `${t('velocidad')}: ${etiquetaVelocidad(estado.ajustes.velocidad)}`);
  $('vozNombre').textContent = nombreDeVoz();
  $('btnVelocidad').textContent = etiquetaVelocidad(estado.ajustes.velocidad);
  if (estado.version) {
    $('refTexto').textContent = tituloCapitulo(estado.libro, estado.cap, estado.ajustes.idioma);
    $('btnVersion').textContent = estado.version.sigla;
    $('btnVersion').setAttribute('aria-label', `${t('ver.titulo')}: ${estado.version.nombre}`);
    document.title = `${tituloCapitulo(estado.libro, estado.cap, estado.ajustes.idioma)} · ${estado.version.sigla} · AudioBible`;
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
  if (antes.idioma !== estado.ajustes.idioma) { rotular(); pintar(); }
}

/* ---------- pintar el capítulo ---------- */

function pieDeCapitulo() {
  const idioma = estado.ajustes.idioma;
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
  const idioma = estado.ajustes.idioma;
  const unSoloCapitulo = datosLibro(estado.libro).caps === 1;
  estado.vista = pintarCapitulo($('capitulo'), {
    nombreLibro: nombreLibro(estado.libro, idioma),
    numero: unSoloCapitulo ? null : estado.cap,
    pasajes: estado.pasajes,
    pie: pieDeCapitulo(),
  });
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
  } catch (err) {
    if (mia !== peticion) return;
    estado.cargando = false;
    aviso(err instanceof LibroAusente
      ? t('aviso.libroAusente', { libro: nombreLibro(libro, estado.ajustes.idioma), version: version.nombre })
      : t('aviso.cargaLibro'));
    if (estado.pasajes.length) pintar();
    return;
  }
  if (mia !== peticion) return;          // llegó tarde: ya se pidió otro capítulo
  estado.cargando = false;
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
  } else {
    escena.scrollTo({ top: 0, behavior: 'instant' });
  }
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
  if (!estado.ajustes.continuar || estado.temporizador === 'capitulo') return null;
  const sig = vecino(u.libro, u.cap, 1);
  if (!sig) return null;
  const pasajes = await modeloDe(estado.version.id, sig.libro, sig.cap);
  // El capítulo solo se anuncia aquí: al pasar de uno al siguiente.
  return { tipo: 'anuncio', breve: true, libro: sig.libro, cap: sig.cap, conLibro: sig.libro !== u.libro, pasajes };
}

const lectorQuieto = () => Date.now() - estado.desplazadoEn > 4000;

function alCambiarDeUnidad(u) {
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
    const clip = await motor.clip({ texto, voz: vozActual(), velocidad: reparto().motor });
    return { url: clip.url, palabras: reubicarPalabras(clip.palabras, mapa) };
  },

  siguiente: siguienteUnidad,

  ritmo: () => reparto().reproductor,

  al: {
    unidad: alCambiarDeUnidad,

    palabra(u, i, palabras) {
      if (u.tipo !== 'pasaje' || i < 0) return;
      const v = estado.vista[u.i];
      if (!v) return;
      const n = palabraEn(v, palabras[i].cs);
      const cambioDeOracion = iluminar(v, n);
      if (cambioDeOracion) {
        pintarAvance();
        if (lectorQuieto()) mantenerALaVista($('escena'), v.palabras[n]?.el);
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
      if (estado.temporizador === 'capitulo') { fijarTemporizador(null); aviso(t('temp.fin')); }
      else if (!vecino(estado.libro, estado.cap, 1)) aviso(t('aviso.finBiblia'));
    },

    error(err, u) {
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

function repetirCapitulo() {
  $('escena').scrollTo({ top: 0, behavior: 'instant' });
  leerDesde(0);
}

function saltarCapitulo(paso) {
  const destino = vecino(estado.libro, estado.cap, paso);
  if (destino) irA(destino.libro, destino.cap);
}

// Tras cambiar de voz o de velocidad: el audio ya cargado puede no valer.
function reajustarVoz(antes) {
  const cambioDeAudio = antes.voz !== vozActual() || antes.motor !== reparto().motor;
  if (!cambioDeAudio) { reproductor.ajustarRitmo(); return; }
  reproductor.olvidarRelevo();
  if (reproductor.sonando && reproductor.unidad?.tipo === 'pasaje') {
    leerDesde(reproductor.unidad.i, reproductor.caracter);
  } else if (reproductor.sonando) {
    reproductor.reproducir(reproductor.unidad);
  } else {
    reproductor.detener();
  }
}

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
    title: tituloCapitulo(estado.libro, estado.cap, estado.ajustes.idioma),
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
    if ((estado.sonando || estado.dispositivo) && !hojaAbierta()) raiz.classList.add('recogido');
  }, 3500);
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

/* ---------- versiones propias ---------- */

function verVersiones() {
  const idioma = estado.ajustes.idioma;
  abrirVersiones({
    catalogo: estado.catalogo, idioma, actual: estado.version.id, libro: estado.libro, cap: estado.cap,
    alElegir: cambiarVersion,
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
  $('btnRepetir').addEventListener('click', repetirCapitulo);
  $('btnAnterior').addEventListener('click', () => saltarCapitulo(-1));
  $('btnSiguiente').addEventListener('click', () => saltarCapitulo(1));

  $('btnReferencia').addEventListener('click', () => abrirNavegador({
    idioma: estado.ajustes.idioma,
    actual: { libro: estado.libro, cap: estado.cap },
    alIr: (libro, cap, vers) => irA(libro, cap, { vers }),
  }));

  $('btnVersion').addEventListener('click', verVersiones);

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
    cambiar: cambiarAjustes,
    alGuardarMotor(url) {
      cambiarAjustes({ motor: url.trim() });
      motor.cambiarUrl(url);
      aviso(t('aj.guardado'));
      cargarVoces();
    },
  }));

  // Un toque en cualquier palabra lleva la lectura al comienzo de su oración.
  $('capitulo').addEventListener('click', (e) => {
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
  for (const tipo of ['pointermove', 'pointerdown', 'keydown']) {
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
    else if (e.key.toLowerCase() === 'r') repetirCapitulo();
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
  await irA(destino.libro, destino.cap, { pasaje: enlace ? 0 : destino.pasaje ?? 0, leer: false });
  cargarVoces();
}

arrancar();
