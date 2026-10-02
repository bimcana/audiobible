// Lector mínimo de ZIP: extrae la primera entrada del archivo.
import { inflateRawSync } from 'node:zlib';

const FIN_DIRECTORIO = 0x06054b50;

export function extraerDeZip(buffer) {
  let fin = buffer.length - 22;
  while (fin >= 0 && buffer.readUInt32LE(fin) !== FIN_DIRECTORIO) fin--;
  if (fin < 0) throw new Error('No es un archivo ZIP');

  const directorio = buffer.readUInt32LE(fin + 16);
  const metodo = buffer.readUInt16LE(directorio + 10);
  const comprimido = buffer.readUInt32LE(directorio + 20);
  const cabecera = buffer.readUInt32LE(directorio + 42);

  const inicio = cabecera + 30 + buffer.readUInt16LE(cabecera + 26) + buffer.readUInt16LE(cabecera + 28);
  const datos = buffer.subarray(inicio, inicio + comprimido);
  if (metodo === 0) return Buffer.from(datos);
  if (metodo === 8) return inflateRawSync(datos);
  throw new Error(`Método de compresión no admitido: ${metodo}`);
}
