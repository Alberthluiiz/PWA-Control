/* =========================================================
   ADAPTADOR LOCAL: los datos viven en el celular (localStorage)
   =========================================================
   Un "adaptador" es la ÚNICA pieza que sabe DÓNDE están los datos.
   Tiene siempre las mismas 5 funciones (el "contrato"), que corresponden
   a los métodos HTTP de una API REST:

     listar(coleccion, filtros)        →  GET    /coleccion?campo=valor
     obtener(coleccion, id)            →  GET    /coleccion/id
     crear(coleccion, datos)           →  POST   /coleccion
     actualizar(coleccion, id, datos)  →  PUT    /coleccion/id
     eliminar(coleccion, id)           →  DELETE /coleccion/id

   adaptador-api.js tiene las MISMAS funciones pero con fetch().
   Por eso los servicios y pantallas no cambian cuando llegue la API.

   Todas son "async" (devuelven una Promesa) aunque localStorage sea
   instantáneo: así quien las usa ya escribe "await", igual que con fetch.
   ========================================================= */
import { CLAVES, leerJSON, guardarJSON } from "./almacen-local.js";
import { nuevoId, mismoId } from "../utilidades/ids.js";
import { ahoraISO } from "../utilidades/fechas.js";

// Colecciones que maneja este adaptador (nombre → clave de localStorage)
const COLECCIONES = {
  turnos: CLAVES.turnos,
  ot: CLAVES.ot,
  descuentos: CLAVES.descuentos,
};

// Copia en memoria de cada colección: se lee de localStorage UNA vez
const memoria = {};

function lista(coleccion) {
  const clave = COLECCIONES[coleccion];
  if (!clave) throw new Error(`Colección desconocida: ${coleccion}`);
  if (!memoria[coleccion]) {
    const leida = leerJSON(clave, []);
    memoria[coleccion] = Array.isArray(leida) ? leida : [];
  }
  return memoria[coleccion];
}

function guardar(coleccion) {
  if (!guardarJSON(COLECCIONES[coleccion], memoria[coleccion])) {
    throw new Error("No hay espacio para guardar en este celular.");
  }
}

// structuredClone hace una COPIA: quien recibe el dato no puede cambiar
// la lista guardada "por accidente" (igual que con una API real).
const copia = (dato) => structuredClone(dato);

// ¿El registro cumple todos los filtros? { usuarioId: 5 } → registro.usuarioId == 5
function cumple(registro, filtros) {
  return Object.entries(filtros).every(([campo, valor]) => mismoId(registro[campo], valor));
}

export async function listar(coleccion, filtros = {}) {
  return copia(lista(coleccion).filter((r) => cumple(r, filtros)));
}

export async function obtener(coleccion, id) {
  const registro = lista(coleccion).find((r) => mismoId(r.id, id));
  return registro ? copia(registro) : null;
}

export async function crear(coleccion, datos) {
  const ahora = ahoraISO();
  const registro = {
    id: nuevoId(),
    idExterno: null, // el id que le dé la API (cuando exista)
    origen: "manual", // "manual" = escrito en la app · "api" = vino de la API
    ...datos,
    creado: ahora,
    actualizado: ahora,
  };
  lista(coleccion).push(registro);
  guardar(coleccion);
  return copia(registro);
}

// Un campo con valor "undefined" en "cambios" se BORRA del registro
// (ej: { comprobante: undefined } quita la marca de foto).
export async function actualizar(coleccion, id, cambios) {
  const registro = lista(coleccion).find((r) => mismoId(r.id, id));
  if (!registro) throw new Error("No se encontró el registro.");
  for (const [campo, valor] of Object.entries(cambios)) {
    if (valor === undefined) delete registro[campo];
    else registro[campo] = valor;
  }
  registro.actualizado = ahoraISO();
  guardar(coleccion);
  return copia(registro);
}

export async function eliminar(coleccion, id) {
  memoria[coleccion] = lista(coleccion).filter((r) => !mismoId(r.id, id));
  guardar(coleccion);
}

// Extra (no es parte del contrato REST): agregar muchos registros que ya
// traen su id, al restaurar una copia de seguridad.
export async function agregarVarios(coleccion, registros) {
  lista(coleccion).push(...copia(registros));
  guardar(coleccion);
}

// Extra: cambiar un campo en muchos registros a la vez (ej: pasar los
// turnos de un perfil a otro). "condicion" es una función que elige cuáles.
export async function actualizarVarios(coleccion, condicion, cambios) {
  let cuantos = 0;
  lista(coleccion).forEach((r) => {
    if (condicion(r)) {
      Object.assign(r, cambios, { actualizado: ahoraISO() });
      cuantos++;
    }
  });
  if (cuantos) guardar(coleccion);
  return cuantos;
}
