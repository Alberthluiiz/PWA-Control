/* =========================================================
   SERVICIO DE TURNOS
   =========================================================
   Reglas del negocio de los turnos: qué se guarda, cómo se valida y
   cómo se calcula la eficiencia. NO toca el HTML (eso es de pantallas/)
   ni sabe si los datos están en el celular o en la API (eso es de datos/).

   Un turno:
   {
     id, fecha: "2026-11-10", estacion: "Quitumbe",
     turno: "fijo" | "reserva",
     resultado: "cuadrada" | "no-cuadrada",
     tipoDiferencia: "faltante" | "sobrante",   ← solo si no cuadró
     montoCentavos: 45,                          ← solo si no cuadró
     montoRevisar: true,     ← el monto se sacó de la observación (migración)
     observacion: "", comprobante: true, usuarioId,
     origen: "manual", idExterno: null, creado, actualizado
   }
   ========================================================= */
import { datos } from "../datos/index.js";
import { guardarFoto, borrarFoto, pedirGuardadoPermanente } from "../datos/fotos.js";
import { idActivo } from "./usuarios.js";
import { esDelMes, fechaDeHoy } from "../utilidades/fechas.js";
import { META_EFICIENCIA } from "../config.js";

// Lista única de estaciones: aquí se agrega, cambia o quita una estación.
// Cada una con su sigla para el gráfico "Por estación".
export const ESTACIONES = {
  Quitumbe: "QU",
  "Morán Valverde": "MV",
  Solanda: "SO",
  "Cardenal de la Torre": "CA",
  Recreo: "RE",
  Magdalena: "MA",
  "San Francisco": "SF",
  Alameda: "AL",
  Ejido: "EJ",
  "Universidad Central": "UC",
  Pradera: "PR",
  Carolina: "LC",
  Iñaquito: "IN",
  Jipijapa: "JI",
  Labrador: "LA",
};

// Turnos SOLO de la persona con la sesión abierta
export function misTurnos() {
  return datos.listar("turnos", { usuarioId: idActivo() });
}

export async function turnosDelMes(anio, mes) {
  return (await misTurnos()).filter((t) => esDelMes(t.fecha, anio, mes));
}

export const obtenerTurno = (id) => datos.obtener("turnos", id);

// Del más reciente al más antiguo. Con la misma fecha, va primero el
// último guardado ("creado" es una fecha ISO: se compara como texto).
export function ordenarRecientes(lista) {
  return [...lista].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || String(b.creado).localeCompare(String(a.creado)),
  );
}

// Revisar los campos antes de guardar. Devuelve un mensaje de error
// (texto) o null si todo está bien.
export function validarTurno(campos) {
  if (!campos.fecha) return "Elige la fecha del turno.";
  if (campos.fecha > fechaDeHoy()) return "La fecha no puede ser futura.";
  if (!campos.estacion) return "Elige la estación.";
  if (campos.resultado === "no-cuadrada") {
    if (!campos.tipoDiferencia) return "Indica si fue faltante o sobrante.";
    if (!campos.montoCentavos) return "Escribe el monto del descuadre (ej: 0,45).";
  }
  return null;
}

// Guardar un turno nuevo o editado.
//   foto = { nueva: Blob | null, quitada: true/false }
// Devuelve { turno, errorFoto } (errorFoto = true si el turno se guardó
// pero la foto no).
export async function guardarTurno(campos, idEditando, foto) {
  // Si cuadró, no lleva monto (undefined = borrar el campo si existía)
  const cambios = { ...campos };
  if (campos.resultado === "cuadrada") {
    cambios.tipoDiferencia = undefined;
    cambios.montoCentavos = undefined;
  }
  cambios.montoRevisar = undefined; // la persona ya lo revisó al guardar

  let turno = idEditando
    ? await datos.actualizar("turnos", idEditando, cambios)
    : await datos.crear("turnos", { ...cambios, usuarioId: idActivo() });

  let errorFoto = false;
  try {
    if (foto.nueva) {
      await guardarFoto(turno.id, foto.nueva);
      turno = await datos.actualizar("turnos", turno.id, { comprobante: true });
      pedirGuardadoPermanente();
    } else if (foto.quitada && turno.comprobante) {
      await borrarFoto(turno.id);
      turno = await datos.actualizar("turnos", turno.id, { comprobante: undefined });
    }
  } catch {
    errorFoto = true;
  }
  return { turno, errorFoto };
}

// Eliminar un turno: también su foto. Sus OT NO se borran: quedan
// "sin turno" para no perder el registro de la incidencia.
export async function eliminarTurno(turno) {
  await datos.eliminar("turnos", turno.id);
  const susOT = await datos.listar("ot", { turnoId: turno.id });
  for (const ot of susOT) await datos.actualizar("ot", ot.id, { turnoId: null });
  if (turno.comprobante) borrarFoto(turno.id).catch(() => {});
}

// Eficiencia del mes (KPI).
//   porcentaje = cuadrados ÷ total × 100
//   permitidos = cuántos descuadres caben sin bajar de la meta:
//     con 20 turnos y meta 80 % → 20 × 0,20 = 4 descuadres.
//     Math.floor redondea hacia abajo (4,8 → 4) para no pasarse.
export function resumenMes(turnosMes) {
  const total = turnosMes.length;
  const cuadrados = turnosMes.filter((t) => t.resultado === "cuadrada").length;
  const descuadres = total - cuadrados;
  const porcentaje = total === 0 ? 0 : (cuadrados / total) * 100;
  const permitidos = Math.floor((total * (100 - META_EFICIENCIA)) / 100);
  return {
    total,
    cuadrados,
    descuadres,
    porcentaje,
    permitidos,
    restantes: Math.max(0, permitidos - descuadres),
    cumpleMeta: total > 0 && porcentaje >= META_EFICIENCIA,
  };
}

// Porcentaje SIN decimales: 12 de 13 = 92,31… → "92%"
export const formatoPorcentaje = (numero) => `${Math.round(numero)}%`;
