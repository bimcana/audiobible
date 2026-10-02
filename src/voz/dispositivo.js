// Respaldo sin conexión: la voz del propio dispositivo.
const sintesis = globalThis.speechSynthesis;

let voces = [];
const refrescar = () => { voces = sintesis?.getVoices() ?? []; };
if (sintesis) {
  refrescar();
  sintesis.addEventListener?.('voiceschanged', refrescar);
}

const vozPara = (idioma) => voces.find((v) => v.lang.toLowerCase().startsWith(idioma)) ?? null;

export const hayVozDeDispositivo = (idioma) => Boolean(sintesis && vozPara(idioma));

let ficha = 0;
let latido = 0;

// alLimite(caracter) avisa de cada palabra; alFin() al terminar el texto.
export function hablar({ texto, idioma, ritmo, alLimite, alFin }) {
  const f = ++ficha;
  const u = new SpeechSynthesisUtterance(texto);
  const voz = vozPara(idioma);
  if (voz) { u.voice = voz; u.lang = voz.lang; }
  u.rate = ritmo;
  u.onboundary = (e) => { if (f === ficha && typeof e.charIndex === 'number') alLimite(e.charIndex); };
  u.onend = () => { if (f === ficha) alFin(); };
  sintesis.cancel();
  sintesis.speak(u);
  // Algunos navegadores cortan la síntesis larga si no se la reanima.
  clearInterval(latido);
  latido = setInterval(() => { if (sintesis.speaking) sintesis.resume(); }, 10000);
}

export function callar() {
  ficha++;
  clearInterval(latido);
  sintesis?.cancel();
}
