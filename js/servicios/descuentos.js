/* =========================================================
   SERVICIO DE DESCUENTOS
   =========================================================
   Calcula cuánto se te va a descontar en un mes, con las reglas que
   confirmaste:
     - Un descuadre (faltante O sobrante) se descuenta...
     - ...salvo la parte cubierta por una OT VÁLIDA (justificado).
     - La parte cubierta por una OT PENDIENTE está "en revisión".
     - Sin OT, o con OT NO VÁLIDA → a descontar.
   Además se registran a mano los descuentos que ya te aplicaron en el
   rol de pagos, para saber el SALDO pendiente.

   Un descuento aplicado:
   { id, periodo: "2026-11", fecha, montoCentavos, referencia, usuarioId, ... }
   ========================================================= */
import { datos } from "../datos/index.js";
import { idActivo } from "./usuarios.js";
import { turnosDelMes } from "./turnos.js";
import { misOT } from "./ot.js";
import { esDelMes, periodo } from "../utilidades/fechas.js";
import { mismoId } from "../utilidades/ids.js";

// Suma los montos de una lista de OT (en centavos)
const sumar = (lista) => lista.reduce((suma, ot) => suma + (ot.montoCentavos || 0), 0);

// Reparte el monto de UN turno descuadrado según sus OT.
//   Ej: faltante de 100 con una OT válida de 45:
//     justificado = 45 · revisión = 0 · a descontar = 55
//   Math.min evita justificar más de lo que faltó.
function repartir(monto, susOT) {
  let resto = monto;
  const justificado = Math.min(resto, sumar(susOT.filter((o) => o.estado === "valida")));
  resto -= justificado;
  const revision = Math.min(resto, sumar(susOT.filter((o) => o.estado === "pendiente")));
  resto -= revision;
  return { justificado, revision, descontar: resto };
}

// Clase que se muestra en la lista de detalle
function clase({ justificado, revision, descontar }) {
  if (descontar > 0) return "descontar";
  if (revision > 0) return "revision";
  if (justificado > 0) return "justificado";
  return "sin-monto";
}

export async function calcularMes(anio, mes) {
  const turnos = await turnosDelMes(anio, mes);
  const todasOT = await misOT();
  const aplicados = await descuentosAplicados(anio, mes);

  const detalle = [];

  // 1. Cada turno NO cuadrado del mes
  turnos
    .filter((t) => t.resultado === "no-cuadrada")
    .forEach((turno) => {
      const susOT = todasOT.filter((o) => mismoId(o.turnoId, turno.id));
      const montos = repartir(turno.montoCentavos || 0, susOT);
      detalle.push({ turno, ot: susOT, monto: turno.montoCentavos || 0, ...montos, clase: clase(montos) });
    });

  // 2. OT del mes que NO están ligadas a ningún turno: cuentan solas
  todasOT
    .filter((o) => !o.turnoId && esDelMes(o.fecha, anio, mes))
    .forEach((ot) => {
      const montos = {
        justificado: ot.estado === "valida" ? ot.montoCentavos : 0,
        revision: ot.estado === "pendiente" ? ot.montoCentavos : 0,
        descontar: ot.estado === "no-valida" ? ot.montoCentavos : 0,
      };
      detalle.push({ turno: null, ot: [ot], monto: ot.montoCentavos, ...montos, clase: clase(montos) });
    });

  // 3. Totales con reduce(): recorre la lista acumulando una suma
  const total = (campo) => detalle.reduce((suma, d) => suma + d[campo], 0);
  const aDescontar = total("descontar");
  const enRevision = total("revision");
  const justificado = total("justificado");
  const yaDescontado = aplicados.reduce((suma, d) => suma + d.montoCentavos, 0);
  const saldo = Math.max(0, aDescontar - yaDescontado);

  detalle.sort((a, b) => (b.turno?.fecha || b.ot[0].fecha).localeCompare(a.turno?.fecha || a.ot[0].fecha));

  return {
    detalle,
    aplicados,
    aDescontar,
    enRevision,
    justificado,
    yaDescontado,
    saldo,
    // Lo máximo que se podría descontar si las OT pendientes salen no válidas
    maximo: saldo + enRevision,
    sinMonto: detalle.filter((d) => d.turno && !d.turno.montoCentavos).length,
  };
}

// Descuentos que ya se aplicaron en el rol, de un mes
export async function descuentosAplicados(anio, mes) {
  const todos = await datos.listar("descuentos", { usuarioId: idActivo() });
  return todos.filter((d) => d.periodo === periodo(anio, mes));
}

export function registrarDescuento(anio, mes, campos) {
  return datos.crear("descuentos", { ...campos, periodo: periodo(anio, mes), usuarioId: idActivo() });
}

export const eliminarDescuento = (id) => datos.eliminar("descuentos", id);
