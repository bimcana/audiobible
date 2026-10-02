// Ajustes y posición de lectura, en localStorage. Todo acceso va protegido:
// en modo privado el almacenamiento puede no estar disponible.
const CLAVE = 'audiobible-ajustes';
const CLAVE_POSICION = 'audiobible-posicion';

const idiomaDelDispositivo = () => (/^en\b/i.test(globalThis.navigator?.language ?? '') ? 'en' : 'es');
const prefiereOscuro = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function ajustesIniciales() {
  return {
    idioma: idiomaDelDispositivo(),       // idioma de la interfaz
    versionEs: 'rvg',
    versionEn: 'kjv',
    comparar: null,                       // id de la versión que se muestra al lado
    tema: prefiereOscuro() ? 'noche' : 'papel',
    fuente: 'clasica',                    // clasica | moderna | legible
    tamano: 21,
    interlineado: 'medio',                // junto | medio | amplio
    ancho: 'medio',                       // angosto | medio | ancho
    disposicion: 'parrafos',              // parrafos | versiculos
    numeros: true,
    jesus: true,
    continuar: true,                      // seguir con el capítulo siguiente
    velocidad: 1,
    vozEs: 'es-MX-JorgeNeural',
    vozEn: 'en-US-AndrewMultilingualNeural',
    motor: 'https://lyrio-voz.onrender.com',
  };
}

function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave) ?? 'null'); } catch { return null; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

export const cargarAjustes = () => ({ ...ajustesIniciales(), ...(leer(CLAVE) ?? {}) });
export const guardarAjustes = (ajustes) => escribir(CLAVE, ajustes);

// {version, libro, cap, pasaje}
export const cargarPosicion = () => leer(CLAVE_POSICION);
export const guardarPosicion = (posicion) => escribir(CLAVE_POSICION, posicion);
