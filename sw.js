// Service worker de AudioBible: hace que la app abra y se lea sin conexión.
//
//   La app (HTML, estilos, módulos)  → red primero; si no hay red, lo guardado.
//                                      Así una versión nueva llega entera y no
//                                      se mezcla con módulos viejos en caché.
//   Los textos (data/)               → lo guardado primero: no cambian.
//   Las tipografías                  → lo guardado primero.
//
// El audio no pasa por aquí: se guarda aparte, en IndexedDB.
const APP = 'audiobible-app-v1';
const DATOS = 'audiobible-datos-v1';
const FUENTES = 'audiobible-fuentes-v1';
const VIGENTES = new Set([APP, DATOS, FUENTES]);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nombre of await caches.keys()) if (!VIGENTES.has(nombre)) await caches.delete(nombre);
    await self.clients.claim();
  })());
});

async function guardadoPrimero(peticion, almacen) {
  const cache = await caches.open(almacen);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok || respuesta.type === 'opaque') cache.put(peticion, respuesta.clone());
  return respuesta;
}

async function redPrimero(peticion, almacen) {
  const cache = await caches.open(almacen);
  try {
    const respuesta = await fetch(peticion, { cache: 'no-cache' });
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch (err) {
    const guardada = await cache.match(peticion, { ignoreSearch: peticion.mode === 'navigate' });
    if (guardada) return guardada;
    throw err;
  }
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    evento.respondWith(guardadoPrimero(peticion, FUENTES));
    return;
  }
  if (url.origin !== self.location.origin) return;       // el motor de voz va directo a la red

  if (url.pathname.includes('/data/')) evento.respondWith(guardadoPrimero(peticion, DATOS));
  else evento.respondWith(redPrimero(peticion, APP));
});
