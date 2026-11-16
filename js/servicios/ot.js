/* =========================================================
   SERVICIO DE OT (órdenes de trabajo)
   =========================================================
   Una OT la genera el Operador de Recaudo (OR) cuando reportas una
   incidencia. Queda PENDIENTE hasta que el coordinador dice si es
   VÁLIDA (no se descuenta) o NO VÁLIDA (se descuenta). La respuesta
   puede cambiar después: cada cambio queda en "historial".

   Una OT:
   {
     id, numero: "OT-123456", fecha: "2026-11-14",
     turnoId: id del turno (o null), estacion: "Recreo",
     tipo: "cashtoday", tipoDiferencia: "faltante" | "sobrante",
     montoCentavos: 5, motivo: "Error de depósito CashToday...",
     estado: "pendiente" | "valida" | "no-valida",
     coordinador: "", nota: "", fechaRespuesta: "2026-11-15" | null,
     historial: [{ estado, fecha, coordinador, nota }],
     usuarioId, origen, idExterno, creado, actualizado
   }
   ========================================================= */
import { datos } from "../datos/index.js";
import { idActivo } from "./usuarios.js";
import { mismoId } from "../utilidades/ids.js";
import { ahoraISO, fechaDeHoy } from "../utilidades/fechas.js";

export const ESTADOS_OT = {
  pendiente: { texto: "Pendiente", clase: "pendiente" },
  valida: { texto: "Válida", clase: "valida" },
  "no-valida": { texto: "No válida", clase: "no-valida" },
};

// Tipos de incidencia (la clave se guarda; el texto se muestra)
export const TIPOS_OT = {
  apertura: "Apertura de turno",
  recarga: "Error de recarga",
  cashtoday: "Depósito CashToday",
  "no-autorizada": "Operación no autorizada",
  anulacion: "Anulación",
  otro: "Otro",
};

// "123456", "ot-123456", "OT 123456" → "OT-123456"
export function normalizarNumero(texto) {
  const digitos = String(texto || "").replace(/^\s*ot[\s-]*/i, "").trim();
  return digitos ? `OT-${digitos.toUpperCase()}` : "";
}

export const misOT = () => datos.listar("ot", { usuarioId: idActivo() });
export const obtenerOT = (id) => datos.obtener("ot", id);
export const otDelTurno = (turnoId) => datos.listar("ot", { turnoId });

// Las más recientes primero
export function ordenarOT(lista) {
  return [...lista].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || String(b.creado).localeCompare(String(a.creado)),
  );
}

// Revisar una OT antes de guardarla. Devuelve un mensaje o null.
export async function validarOT(campos, idEditando = null) {
  if (!/^OT-[A-Z0-9]{3,20}$/.test(campos.numero)) return "Escribe el número de la OT (ej: 123456).";
  if (!campos.fecha) return "Elige la fecha de la OT.";
  if (campos.fecha > fechaDeHoy()) return "La fecha no puede ser futura.";
  if (!TIPOS_OT[campos.tipo]) return "Elige el tipo de incidencia.";
  if (!campos.tipoDiferencia) return "Indica si fue faltante o sobrante.";
  if (!campos.montoCentavos) return "Escribe el monto de la OT (ej: 0,45).";
  if (!campos.motivo) return "Escribe el motivo que puso el OR.";
  // El número no se repite para la misma persona
  const repetida = (await misOT()).some((ot) => ot.numero === campos.numero && !mismoId(ot.id, idEditando));
  if (repetida) return `Ya registraste la ${campos.numero}.`;
  return null;
}

// Crear: siempre empieza PENDIENTE
export function crearOT(campos) {
  return datos.crear("ot", {
    ...campos,
    estado: "pendiente",
    coordinador: "",
    nota: "",
    fechaRespuesta: null,
    historial: [{ estado: "pendiente", fecha: ahoraISO(), coordinador: "", nota: "Creada" }],
    usuarioId: idActivo(),
  });
}

export const editarOT = (id, campos) => datos.actualizar("ot", id, campos);
export const eliminarOT = (id) => datos.eliminar("ot", id);

// Cambiar el estado con la respuesta del coordinador.
// Se AGREGA al historial (nunca se borra lo anterior).
export async function cambiarEstado(ot, estado, coordinador, nota) {
  if (!ESTADOS_OT[estado]) throw new Error("Estado no válido");
  const historial = [...(ot.historial || []), { estado, fecha: ahoraISO(), coordinador, nota }];
  return datos.actualizar("ot", ot.id, {
    estado,
    coordinador,
    nota,
    fechaRespuesta: estado === "pendiente" ? null : fechaDeHoy(),
    historial,
  });
}
