// Reproduce una cola de «unidades» (anuncios y pasajes) sin silencios entre
// ellas. No sabe qué es una Biblia ni toca la página: pide el audio de cada
// unidad, pregunta cuál es la siguiente y avisa de lo que va pasando.
//
//   clipDe(unidad)    → Promise<{url, palabras, velocidad}>
//   claveDe(unidad)   → cadena que cambia si cambia la voz o la velocidad
//   siguiente(unidad) → Promise<unidad | null>
//   ritmo(clip)       → velocidad del reproductor (playbackRate) para ese audio
//   al.unidad(u) · al.palabra(u, i, palabras) · al.estado(e) · al.fin() · al.error(err, u)
//
// Dos reproductores se turnan: cambiar el src de un <audio> obliga a cargar y
// decodificar, y ese trabajo era el silencio entre párrafos. Mientras uno
// suena, el otro ya tiene cargada la unidad siguiente.
//
// Con la pantalla bloqueada (sobre todo en iPhone) el sistema suspende la
// página en cuanto deja de sonar audio, y entonces ya no llega el párrafo
// siguiente: la lectura se cortaba al cabo de unos minutos. Por eso el audio
// nunca se calla del todo mientras se lee: si lo siguiente aún no está, suena
// un silencio en bucle hasta que llega; y lo siguiente se pide con dos
// unidades de adelanto.

// Un segundo de silencio (WAV, 8 kHz, 8 bits): relleno para los huecos.
const SILENCIO = (() => {
  const muestras = 8000;
  const b = new DataView(new ArrayBuffer(44 + muestras));
  const texto = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  texto(0, 'RIFF'); b.setUint32(4, 36 + muestras, true); texto(8, 'WAVE');
  texto(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true);
  texto(36, 'data'); b.setUint32(40, muestras, true);
  for (let i = 0; i < muestras; i++) b.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
})();

export function crearReproductor({ clipDe, claveDe, siguiente, ritmo, al }) {
  let actual = crearAudio();
  let relevo = crearAudio();
  let enRelevo = { unidad: null, clave: '', clip: null };

  let clip = null;                // el audio que suena
  let unidad = null;
  let palabras = [];
  let iluminada = -1;
  let sonando = false;
  let ficha = 0;                 // invalida las respuestas que llegan tarde
  let raf = 0;

  function crearAudio() {
    const a = new Audio();
    a.setAttribute('playsinline', '');
    a.preload = 'auto';
    // rAF se detiene con la pantalla apagada; timeupdate mantiene el resaltado.
    a.addEventListener('timeupdate', () => { if (sonando && a === actual) sincronizar(); });
    a.addEventListener('ended', () => { if (a === actual) alTerminar(); });
    return a;
  }

  const olvidarRelevo = () => { enRelevo = { unidad: null, clave: '', clip: null }; };

  // Mientras se espera lo siguiente, el reproductor no se calla: suena silencio.
  function rellenar() {
    palabras = [];
    iluminada = -1;
    actual.loop = true;
    actual.src = SILENCIO;
    actual.play().catch(() => {});
  }

  // Algunos navegadores (Safari en iPhone) solo dejan sonar un <audio> sin un
  // toque si ya sonó una vez tras un toque. Se «estrenan» los dos al pulsar Leer.
  function estrenar() {
    for (const a of [actual, relevo]) {
      if (a.estrenado) continue;
      a.estrenado = true;
      if (a.src && a.src !== SILENCIO) continue;      // ya tiene audio cargado: no se toca
      a.src = SILENCIO;
      a.play().then(() => { if (a.src === SILENCIO && !a.loop) a.pause(); }).catch(() => {});
    }
  }

  function aplicarRitmo(a) {
    a.preservesPitch = true;
    if (clip) a.playbackRate = ritmo(clip);
  }

  function sincronizar() {
    if (!palabras.length) return;
    const t = actual.currentTime * 1000;
    let i = -1;
    for (let k = 0; k < palabras.length; k++) {
      if (t >= palabras[k].s) i = k; else break;
    }
    if (i === iluminada) return;
    iluminada = i;
    al.palabra(unidad, i, palabras);
  }

  function vigilar() {
    cancelAnimationFrame(raf);
    const paso = () => {
      if (!sonando) return;
      sincronizar();
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  }

  // Momento en que empieza la palabra que cubre el carácter pedido.
  function tiempoDe(caracter) {
    const p = palabras.find((x) => x.ce > caracter);
    return p ? Math.max(0, p.s / 1000 - 0.06) : 0;
  }

  async function prepararRelevo(desde) {
    const f = ficha;
    try {
      const sig = await siguiente(desde);
      if (!sig || f !== ficha) return;
      const clave = claveDe(sig);
      const siguienteClip = await clipDe(sig);
      if (f !== ficha || claveDe(sig) !== clave) return;
      relevo.loop = false;
      relevo.src = siguienteClip.url;
      relevo.load();
      enRelevo = { unidad: sig, clave, clip: siguienteClip };
      // Y la que viene después, para que una respuesta lenta del motor no deje
      // un hueco (un anuncio dura un par de segundos: sin esto no daría tiempo).
      const despues = await siguiente(sig);
      if (despues && f === ficha) clipDe(despues).catch(() => {});
    } catch { /* sin relevo: se cargará al llegar */ }
  }

  // continuo: viene de terminar la unidad anterior; el silencio de relleno
  // sigue sonando hasta que el audio nuevo está listo.
  async function reproducir(u, { desdeCaracter = null, continuo = false } = {}) {
    const f = ++ficha;
    olvidarRelevo();
    if (continuo) rellenar(); else actual.pause();
    unidad = u;
    palabras = [];
    iluminada = -1;
    al.unidad(u);
    al.estado('cargando');
    try {
      const nuevo = await clipDe(u);
      if (f !== ficha) return;
      clip = nuevo;
      palabras = clip.palabras;
      actual.loop = false;
      if (actual.src !== clip.url) actual.src = clip.url;
      aplicarRitmo(actual);
      if (desdeCaracter !== null && desdeCaracter > 0) {
        await new Promise((listo) => {
          if (actual.readyState >= 1) return listo();
          actual.addEventListener('loadedmetadata', listo, { once: true });
          setTimeout(listo, 1500);
        });
        if (f !== ficha) return;
        actual.currentTime = tiempoDe(desdeCaracter);
      } else {
        try { actual.currentTime = 0; } catch { /* aún sin metadatos */ }
      }
      await actual.play();
      if (f !== ficha) { actual.pause(); return; }
      sonando = true;
      al.estado('sonando');
      vigilar();
      prepararRelevo(u);
    } catch (err) {
      if (f !== ficha) return;
      if (actual.loop) { actual.pause(); actual.loop = false; }
      sonando = false;
      al.estado('pausa');
      al.error(err, u);
    }
  }

  async function alTerminar() {
    if (!sonando) return;
    // El audio del relevo está en el dispositivo (blob): aunque el navegador no
    // lo haya precargado (Safari no lo hace en segundo plano), se carga al momento.
    const listo = enRelevo.unidad
      && enRelevo.clave === claveDe(enRelevo.unidad)
      && relevo.src === enRelevo.clip?.url;

    if (listo) {
      [actual, relevo] = [relevo, actual];
      unidad = enRelevo.unidad;
      clip = enRelevo.clip;
      palabras = clip.palabras || [];
      olvidarRelevo();
      iluminada = -1;
      const f = ++ficha;
      aplicarRitmo(actual);
      try { actual.currentTime = 0; } catch { /* aún sin metadatos */ }
      al.unidad(unidad);
      try {
        await actual.play();
        if (f !== ficha) return;
        vigilar();
        prepararRelevo(unidad);
      } catch {
        if (f === ficha) reproducir(unidad, { continuo: true });
      }
      return;
    }

    // Lo siguiente aún no está: silencio mientras se averigua y se pide.
    rellenar();
    const f = ficha;
    let sig = null;
    try { sig = await siguiente(unidad); } catch { /* se trata como final */ }
    if (f !== ficha) return;
    if (!sig) {
      actual.pause();
      actual.loop = false;
      sonando = false;
      cancelAnimationFrame(raf);
      al.estado('pausa');
      al.fin();
      return;
    }
    reproducir(sig, { continuo: true });
  }

  return {
    reproducir,

    estrenar,

    // Deja de sonar lo que suena, pero mantiene vivo el audio con silencio
    // hasta la próxima llamada a reproducir (o pausar/detener).
    esperar() {
      ficha++;
      olvidarRelevo();
      rellenar();
    },

    pausar() {
      // Siempre invalida lo que esté en camino: un audio que llegue después
      // de pausar no debe sonar.
      ficha++;
      if (!sonando) { actual.pause(); actual.loop = false; al.estado('pausa'); return; }
      actual.pause();
      sonando = false;
      cancelAnimationFrame(raf);
      al.estado('pausa');
    },

    // Reanuda donde quedó; false si no hay nada cargado que reanudar.
    reanudar() {
      if (!unidad || !actual.src || actual.loop || !palabras.length || actual.ended) return false;
      aplicarRitmo(actual);
      const f = ficha;
      actual.play().then(() => {
        if (f !== ficha) { actual.pause(); return; }
        sonando = true;
        al.estado('sonando');
        vigilar();
        if (!enRelevo.unidad) prepararRelevo(unidad);
      }).catch((err) => al.error(err, unidad));
      return true;
    },

    detener() {
      ficha++;
      actual.pause();
      actual.loop = false;
      sonando = false;
      cancelAnimationFrame(raf);
      olvidarRelevo();
      unidad = null;
      clip = null;
      palabras = [];
    },

    // Tras cambiar solo el ritmo del reproductor (el audio sigue valiendo).
    ajustarRitmo() { aplicarRitmo(actual); },

    olvidarRelevo,
    // Tras olvidar el relevo sin interrumpir la lectura, se prepara otro.
    rehacerRelevo() { if (sonando && unidad) prepararRelevo(unidad); },
    get velocidadDelAudio() { return clip?.velocidad ?? null; },
    get sonando() { return sonando; },
    get unidad() { return unidad; },
    // Carácter (del texto en pantalla) por el que va la voz.
    get caracter() { return iluminada >= 0 ? palabras[iluminada].cs : 0; },
  };
}
