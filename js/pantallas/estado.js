/* =========================================================
   ESTADO COMPARTIDO DE LAS PANTALLAS: el MES que se está viendo
   =========================================================
   Inicio, Turnos, OT y Descuentos tienen su propio selector ‹ mes ›,
   pero todos muestran el MISMO mes: si cambias uno, cambian todos.
   Por eso el mes vive aquí, en un solo lugar.
   ========================================================= */
import { nombresMeses } from "../utilidades/fechas.js";

const hoy = new Date();
export const mesVisible = { mes: hoy.getMonth(), anio: hoy.getFullYear() };

// Avanzar (+1) o retroceder (-1) un mes. Si pasamos de diciembre (11)
// a 12, saltamos a enero (0) del año siguiente, y al revés.
export function cambiarMes(paso) {
  mesVisible.mes += paso;
  if (mesVisible.mes > 11) {
    mesVisible.mes = 0;
    mesVisible.anio++;
  } else if (mesVisible.mes < 0) {
    mesVisible.mes = 11;
    mesVisible.anio--;
  }
}

// Ir directo a un mes (ej: al guardar un turno de otro mes)
export function irAlMes(fecha) {
  const [anio, mes] = fecha.split("-").map(Number);
  mesVisible.anio = anio;
  mesVisible.mes = mes - 1;
}

export const textoMes = () => `${nombresMeses[mesVisible.mes]} ${mesVisible.anio}`;

// Escribir el mes en TODOS los selectores y bloquear la flecha › si ya
// estamos en el mes actual (no hay meses futuros que ver).
export function pintarSelectoresMes() {
  const ahora = new Date();
  const esMesActual = mesVisible.mes === ahora.getMonth() && mesVisible.anio === ahora.getFullYear();
  document.querySelectorAll(".selector-mes").forEach((selector) => {
    selector.querySelector(".mes-texto").textContent = textoMes();
    selector.querySelector('[data-mes="1"]').disabled = esMesActual;
  });
}
