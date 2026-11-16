/* =========================================================
   FECHAS
   ========================================================= */

// Fecha de HOY como texto AAAA-MM-DD, calculada en el momento.
//   "en-CA" (inglés de Canadá) escribe la fecha justo en ese formato,
//   que es el único que acepta un <input type="date">.
//   OJO: NO usar toISOString(): usa hora UTC y después de las 19:00 en
//   Ecuador mostraría el día siguiente.
export function fechaDeHoy() {
  return new Date().toLocaleDateString("en-CA");
}

// Fecha y hora exacta (con zona UTC) para los campos "creado" y
// "actualizado". Aquí SÍ se usa toISOString(): sirve para ordenar y
// comparar versiones, no para mostrar.
export function ahoraISO() {
  return new Date().toISOString();
}

// "2026-10-08" → "08/10/2026"
export function formatearFecha(fecha) {
  return String(fecha || "").split("-").reverse().join("/");
}

// "2026-10-08" → "08/10"  (para listas donde no entra el año)
export function fechaCorta(fecha) {
  return formatearFecha(fecha).slice(0, 5);
}

// getMonth() devuelve 0 = enero ... 11 = diciembre
export const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const mesesCompletos = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ¿La fecha "2026-10-08" es del mes (0-11) y año indicados?
export function esDelMes(fecha, anio, mes) {
  const [a, m] = String(fecha).split("-").map(Number);
  return a === anio && m - 1 === mes;
}

// Período "2026-11" (año-mes) para agrupar descuentos
export function periodo(anio, mes) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}`;
}

// Días entre una fecha AAAA-MM-DD y hoy (para "Esperando respuesta")
export function diasDesde(fecha) {
  const inicio = new Date(`${fecha}T00:00:00`);
  const hoy = new Date(`${fechaDeHoy()}T00:00:00`);
  return Math.max(0, Math.round((hoy - inicio) / 86400000));
}
