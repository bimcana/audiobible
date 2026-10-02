// Historial de lectura: los últimos capítulos abiertos y, de cada libro, el
// último capítulo por el que se pasó. En localStorage: es poco y se lee al
// instante.
const CLAVE = 'audiobible-historial';
const MAXIMO = 30;

function leer() {
  try {
    const h = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    if (h && Array.isArray(h.recientes) && typeof h.porLibro === 'object') return h;
  } catch { /* sin almacenamiento */ }
  return { recientes: [], porLibro: {} };
}

// Anota que se abrió un capítulo. El más reciente queda el primero.
export function anotar(libro, cap, ahora = Date.now()) {
  const h = leer();
  h.recientes = [{ libro, cap, t: ahora }, ...h.recientes.filter((r) => r.libro !== libro || r.cap !== cap)].slice(0, MAXIMO);
  h.porLibro[libro] = cap;
  try { localStorage.setItem(CLAVE, JSON.stringify(h)); } catch { /* sin almacenamiento */ }
}

export const recientes = () => leer().recientes;
export const ultimoCapitulo = (libro) => leer().porLibro[libro] ?? null;

export function borrarHistorial() {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}
