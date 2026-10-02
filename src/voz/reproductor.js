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
      relevo.src = siguienteClip.url;
      relevo.load();
      enRelevo = { unidad: sig, clave, clip: siguienteClip };
      // Una unidad breve (un anuncio) dura un par de segundos: no da tiempo a
      // pedir lo que le sigue mientras suena. Se pide ya, para que esté listo.
      if (sig.breve) {
        const despues = await siguiente(sig);
        if (despues && f === ficha) clipDe(despues).catch(() => {});
      }
    } catch { /* sin relevo: se cargará al llegar */ }
  }

  async function reproducir(u, { desdeCaracter = null } = {}) {
    const f = ++ficha;
    olvidarRelevo();
    actual.pause();
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
      sonando = false;
      al.estado('pausa');
      al.error(err, u);
    }
  }

  async function alTerminar() {
    if (!sonando) return;
    const listo = enRelevo.unidad
      && enRelevo.clave === claveDe(enRelevo.unidad)
      && relevo.readyState >= 2;

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
        if (f === ficha) reproducir(unidad);
      }
      return;
    }

    const f = ficha;
    let sig = null;
    try { sig = await siguiente(unidad); } catch { /* se trata como final */ }
    if (f !== ficha) return;
    if (!sig) {
      sonando = false;
      cancelAnimationFrame(raf);
      al.estado('pausa');
      al.fin();
      return;
    }
    reproducir(sig);
  }

  return {
    reproducir,

    pausar() {
      if (!sonando) { ficha++; al.estado('pausa'); return; }
      actual.pause();
      sonando = false;
      cancelAnimationFrame(raf);
      al.estado('pausa');
    },

    // Reanuda donde quedó; false si no hay nada cargado que reanudar.
    reanudar() {
      if (!unidad || !actual.src || !palabras.length || actual.ended) return false;
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
