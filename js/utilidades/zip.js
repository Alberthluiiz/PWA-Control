/* =========================================================
   ZIP MÍNIMO (sin comprimir)
   =========================================================
   Un archivo .xlsx es en realidad un ZIP con varios archivos de texto
   (XML) adentro. Aquí se arma ese ZIP a mano, sin internet y sin
   librerías. No se comprime: las fotos JPEG ya vienen comprimidas.
   ========================================================= */

// CRC32 = "huella" de cada archivo que el formato ZIP exige
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = TABLA_CRC[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Recibe [{ nombre, datos }] (datos = texto o bytes) y devuelve un Blob
export function crearZip(archivos, tipo = "application/zip") {
  const codificador = new TextEncoder();
  const partes = []; // pedazos del archivo final, en orden
  const central = []; // índice que va al final del ZIP
  let posicion = 0;

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.nombre);
    const datos = typeof archivo.datos === "string" ? codificador.encode(archivo.datos) : archivo.datos;
    const crc = crc32(datos);

    // Cabecera de cada archivo (30 bytes + nombre)
    const cabecera = new DataView(new ArrayBuffer(30));
    cabecera.setUint32(0, 0x04034b50, true); // firma "PK.."
    cabecera.setUint16(4, 20, true); // versión necesaria
    cabecera.setUint16(6, 0x0800, true); // nombres en UTF-8
    cabecera.setUint16(8, 0, true); // 0 = sin comprimir
    cabecera.setUint16(12, 0x21, true); // fecha fija 01/01/1980
    cabecera.setUint32(14, crc, true);
    cabecera.setUint32(18, datos.length, true);
    cabecera.setUint32(22, datos.length, true);
    cabecera.setUint16(26, nombre.length, true);
    partes.push(cabecera, nombre, datos);

    // Entrada del índice central (46 bytes + nombre)
    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true);
    entrada.setUint16(6, 20, true);
    entrada.setUint16(8, 0x0800, true);
    entrada.setUint16(10, 0, true);
    entrada.setUint16(14, 0x21, true);
    entrada.setUint32(16, crc, true);
    entrada.setUint32(20, datos.length, true);
    entrada.setUint32(24, datos.length, true);
    entrada.setUint16(28, nombre.length, true);
    entrada.setUint32(42, posicion, true); // dónde empieza este archivo
    central.push(entrada, nombre);

    posicion += 30 + nombre.length + datos.length;
  }

  const tamanoCentral = central.reduce((suma, p) => suma + p.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22)); // "fin del ZIP"
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, posicion, true);

  return new Blob([...partes, ...central, fin], { type: tipo });
}
