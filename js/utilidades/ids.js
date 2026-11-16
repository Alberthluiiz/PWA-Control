/* =========================================================
   IDENTIFICADORES ÚNICOS
   =========================================================
   Antes cada registro usaba Date.now() (milisegundos) como id. Si dos
   registros se crean en el mismo milisegundo, o en dos celulares, pueden
   chocar. Un UUID ("3f2a9c1e-5b7d-4e8a-...") es prácticamente imposible
   de repetir, y es lo que usará la API.
   Los registros viejos conservan su id numérico: la app acepta los dos.
   ========================================================= */

export function nuevoId() {
  // crypto.randomUUID solo existe en páginas seguras (https o localhost)
  if (crypto.randomUUID) return crypto.randomUUID();
  // Plan B: armarlo a mano con números aleatorios seguros
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Comparar ids sin importar si uno es número y el otro texto.
//   (los data-id del HTML siempre llegan como texto: "1792371253179")
export function mismoId(a, b) {
  return a !== null && a !== undefined && String(a) === String(b);
}

// ¿Es un id válido? Número entero positivo (viejo) o UUID (nuevo).
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function esId(valor) {
  return (Number.isSafeInteger(valor) && valor > 0) || (typeof valor === "string" && PATRON_UUID.test(valor));
}
