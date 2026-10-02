// La base de datos del dispositivo (IndexedDB). Aquí vive todo lo que no cabe
// en localStorage: de momento, las Biblias que el lector importa.
const NOMBRE = 'audiobible';
const VERSION = 1;

let abierta = null;

function abrir() {
  abierta ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(NOMBRE, VERSION);
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains('versiones')) db.createObjectStore('versiones', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('libros')) db.createObjectStore('libros');      // clave "version/LIBRO"
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => { abierta = null; rechazar(peticion.error); };
  });
  return abierta;
}

const promesa = (peticion) => new Promise((resolver, rechazar) => {
  peticion.onsuccess = () => resolver(peticion.result);
  peticion.onerror = () => rechazar(peticion.error);
});

// Ejecuta `obra` dentro de una transacción y espera a que se confirme.
export async function transaccion(almacenes, modo, obra) {
  const db = await abrir();
  const tx = db.transaction(almacenes, modo);
  const hecho = new Promise((resolver, rechazar) => {
    tx.oncomplete = resolver;
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
  const resultado = await obra((nombre) => tx.objectStore(nombre), promesa);
  await hecho;
  return resultado;
}
