/* =========================================================
   DINERO (siempre en CENTAVOS enteros)
   =========================================================
   En JavaScript 0.1 + 0.2 da 0.30000000000000004, porque los decimales
   se guardan "aproximados". Con dinero eso es peligroso, así que la app
   guarda CENTAVOS enteros: $0,45 → 45. Las sumas de enteros son exactas.
   Solo al MOSTRAR se divide entre 100.
   ========================================================= */

// Texto que escribe la persona → centavos.
//   "0,45" → 45 · "0.45" → 45 · "1" → 100 · "20,2" → 2020
//   Devuelve null si no es un monto válido (letras, más de 2 decimales...).
export function aCentavos(texto) {
  const limpio = String(texto ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  // Math.round evita errores como 0.29 * 100 = 28.999999999999996
  return Math.round(Number(limpio) * 100);
}

// Centavos → texto para mostrar: 45 → "$0,45" · 2020 → "$20,20"
export function formatoDinero(centavos) {
  const valor = (Number(centavos) || 0) / 100;
  return `$${valor.toFixed(2).replace(".", ",")}`;
}

// Centavos → texto para un <input>: 45 → "0,45"
export function centavosATexto(centavos) {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// Buscar un monto CON SIGNO dentro de un texto libre (las observaciones
// viejas): "-20,20 Error operativo" → { tipo: "faltante", centavos: 2020 }
//   El signo es obligatorio para no confundir otros números.
//   Acepta espacios raros como "-1 .00".
export function montoEnTexto(texto) {
  const encontrado = /([+-])\s*(\d+)\s*(?:[.,]\s*(\d{1,2}))?/.exec(String(texto || ""));
  if (!encontrado) return null;
  const [, signo, enteros, decimales = "0"] = encontrado;
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
  if (!centavos) return null;
  return { tipo: signo === "-" ? "faltante" : "sobrante", centavos };
}
