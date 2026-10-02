// La base de datos del dispositivo (IndexedDB). Aquí vive todo lo que no cabe
// en localStorage: las Biblias que el lector importa, el audio guardado, sus
// subrayados y notas, y el avance de los planes de lectura.
const NOMBRE = 'audiobible';
const VERSION = 3;

let abierta = null;

function abrir() {
  abierta ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(NOMBRE, VERSION);
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      const falta = (nombre) => !db.objectStoreNames.contains(nombre);
      if (falta('versiones')) db.createObjectStore('versiones', { keyPath: 'id' });
      if (falta('libros')) db.createObjectStore('libros');           // clave "version/LIBRO"
      // El audio va en dos almacenes con la misma clave: el sonido, que pesa,
      // y su ficha, que es lo único que se lee para saber qué hay guardado.
      if (falta('audio')) db.createObjectStore('audio');
      if (falta('audioFichas')) {
        const fichas = db.createObjectStore('audioFichas', { keyPath: 'clave' });
        fichas.createIndex('vozTexto', 'vozTexto');
        fichas.createIndex('libro', 'libro');                         // "version/LIBRO"
      }
      if (falta('marcas')) db.createObjectStore('marcas', { keyPath: 'cap' });     // "JHN.3"
      if (falta('planes')) db.createObjectStore('planes', { keyPath: 'id' });
    };
    peticion.onsuccess = () => {
      const db = peticion.result;
      db.onversionchange = () => { db.close(); abierta = null; };
      resolver(db);
    };
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
