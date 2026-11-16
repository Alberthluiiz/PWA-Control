/* =========================================================
   SEGURIDAD: REVISAR ARCHIVOS Y TEXTOS ANTES DE USARLOS
   =========================================================
   Antes de abrir una foto o una copia se revisa el TIPO y el TAMAÑO.
   Así un archivo equivocado (un PDF, un video) o gigante no traba el celular.
   ========================================================= */

export const MAXIMO_FOTO_MB = 30; // las fotos de celular pesan entre 2 y 12 MB
export const MAXIMO_COPIA_MB = 100; // una copia con muchas fotos pesa unos 20-50 MB

// Devuelve true si el archivo es una imagen de tamaño razonable.
// Si no, avisa a la persona y devuelve false.
export function esImagenValida(archivo) {
  // archivo.type lo pone el celular: "image/jpeg", "image/png", "image/heic"...
  // (algunos celulares lo dejan vacío; en ese caso se deja intentar)
  if (archivo.type && !archivo.type.startsWith("image/")) {
    alert("Ese archivo no es una imagen. Elige una foto.");
    return false;
  }
  if (archivo.size > MAXIMO_FOTO_MB * 1024 * 1024) {
    alert(`La foto pesa más de ${MAXIMO_FOTO_MB} MB. Elige una más liviana.`);
    return false;
  }
  return true;
}

// Una foto guardada como texto SOLO se acepta si es una imagen "data:"
// (la que crea la propia app). Así una copia modificada no puede meter
// una dirección de internet ni otro tipo de contenido.
export function esFotoTexto(texto) {
  return (
    typeof texto === "string" &&
    /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(texto)
  );
}

// Ayudas pequeñas para revisar datos de una copia de seguridad:
//   FECHA_VALIDA → "2026-10-22" (4 números - 2 - 2)
//   esTexto(valor, maximo) → true si es texto y no pasa de "maximo" letras
//   esCentavos(valor) → número entero entre 0 y $100.000
export const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
export const esTexto = (valor, maximo) => typeof valor === "string" && valor.length <= maximo;
export const esCentavos = (valor) => Number.isSafeInteger(valor) && valor >= 0 && valor <= 10000000;
