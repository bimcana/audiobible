// Respaldo sin conexión: la voz del propio dispositivo.
const sintesis = globalThis.speechSynthesis;

let voces = [];
const refrescar = () => { voces = sintesis?.getVoices() ?? []; };
if (sintesis) {
  refrescar();
  sintesis.addEventListener?.('voiceschanged', refrescar);
}

// Entre las voces del idioma, la mejor que haya: las «mejoradas» o «naturales»
// suenan mucho más humanas que las básicas.
const CALIDAD = /premium|enhanced|mejorada|natural|neural|online/i;
const vozPara = (idioma) => {
  const delIdioma = voces.filter((v) => v.lang.toLowerCase().startsWith(idioma));
  return delIdioma.find((v) => CALIDAD.test(v.name)) ?? delIdioma.find((v) => v.default) ?? delIdioma[0] ?? null;
};

// iOS solo deja hablar al navegador si la primera vez fue dentro de un toque.
// Se «estrena» con un texto vacío al pulsar Leer, para que el respaldo pueda
// arrancar más tarde, cuando el motor falle sin que nadie esté tocando.
let estrenada = false;
export function desbloquearVoz() {
  if (estrenada || !sintesis) return;
  estrenada = true;
  try { sintesis.speak(new SpeechSynthesisUtterance('')); } catch { /* sin síntesis */ }
}

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
