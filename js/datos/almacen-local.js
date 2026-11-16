/* =========================================================
   localStorage: LEER Y GUARDAR JSON
   =========================================================
   localStorage es una "cajita" del navegador que guarda TEXTO con un
   nombre (clave). Los datos siguen ahí aunque cierres la página.
   Como solo guarda texto:
     - al GUARDAR convertimos a texto con JSON.stringify
     - al LEER convertimos el texto de vuelta con JSON.parse
   ========================================================= */

// Nombres (claves) de todo lo que la app guarda en localStorage
export const CLAVES = {
  turnos: "cuadres-turnos",
  usuarios: "cuadres-usuarios",
  ot: "cuadres-ot",
  descuentos: "cuadres-descuentos",
  version: "cuadres-version-datos",
  tema: "cuadres-tema",
};

// Leer una clave. Si no existe o el texto está dañado, devuelve "porDefecto".
export function leerJSON(clave, porDefecto) {
  try {
    const texto = localStorage.getItem(clave);
    return texto === null ? porDefecto : JSON.parse(texto) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

// Guardar. Devuelve true si se pudo; false si la memoria está llena.
export function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
