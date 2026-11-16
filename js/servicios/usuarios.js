/* =========================================================
   SERVICIO DE USUARIOS (varias personas en el mismo celular)
   =========================================================
   No es un login con contraseña: es para saber QUIÉN está registrando.
   Se guarda en el celular aunque los turnos vengan de la API, porque
   es una preferencia de ESTE dispositivo:
     {
       activo: "id de quien tiene la sesión abierta" (o null),
       lista: [{ id, nombre, creado: "2026-10-22", foto: "data:..." o "" }]
     }
   ========================================================= */
import { CLAVES, leerJSON, guardarJSON } from "../datos/almacen-local.js";
import { datos } from "../datos/index.js";
import { borrarFoto } from "../datos/fotos.js";
import { nuevoId, mismoId } from "../utilidades/ids.js";
import { fechaDeHoy } from "../utilidades/fechas.js";

function cargar() {
  const leidos = leerJSON(CLAVES.usuarios, null);
  if (leidos && Array.isArray(leidos.lista)) return leidos;
  return { activo: null, lista: [] };
}

const usuarios = cargar();

// Devuelve true si se guardó (puede fallar si la memoria está llena,
// por ejemplo con una foto de perfil muy grande)
function guardar() {
  if (guardarJSON(CLAVES.usuarios, usuarios)) return true;
  alert("No hay espacio para guardar. Prueba con una foto más pequeña.");
  return false;
}

export const listaUsuarios = () => usuarios.lista;
export const idActivo = () => usuarios.activo;
export const usuarioActivo = () => usuarios.lista.find((u) => mismoId(u.id, usuarios.activo));

export function entrar(id) {
  const usuario = usuarios.lista.find((u) => mismoId(u.id, id));
  if (!usuario) return;
  usuarios.activo = usuario.id; // se guarda el id con su tipo original
  guardar();
}

export function salir() {
  usuarios.activo = null;
  guardar();
}

// ¿Ya hay otra persona con ese nombre? (sin importar mayúsculas)
export function nombreRepetido(nombre, excepto = null) {
  return usuarios.lista.some((u) => u !== excepto && u.nombre.toLowerCase() === nombre.toLowerCase());
}

// Crear persona nueva y abrir su sesión. La PRIMERA persona del celular
// se queda con los turnos que no tienen dueño (de la versión original).
export async function crearUsuario(nombre, foto) {
  const nuevo = { id: nuevoId(), nombre, creado: fechaDeHoy(), foto };
  usuarios.lista.push(nuevo);
  usuarios.activo = nuevo.id;
  if (!guardar()) {
    usuarios.lista.pop();
    return null;
  }
  if (usuarios.lista.length === 1) {
    await datos.actualizarVarios("turnos", (t) => !t.usuarioId, { usuarioId: nuevo.id });
  }
  return nuevo;
}

export function editarUsuario(usuario, nombre, foto) {
  const antes = { nombre: usuario.nombre, foto: usuario.foto };
  usuario.nombre = nombre;
  usuario.foto = foto;
  if (guardar()) return true;
  Object.assign(usuario, antes); // no se pudo: volver a como estaba
  return false;
}

// Eliminar un perfil. Si "destino" es otro perfil, sus turnos, OT y
// descuentos pasan a ese; si es null, se BORRAN (solo cuando es el único).
export async function eliminarUsuario(perfil, destino) {
  const esSuyo = (r) => mismoId(r.usuarioId, perfil.id);
  if (destino) {
    for (const coleccion of ["turnos", "ot", "descuentos"]) {
      await datos.actualizarVarios(coleccion, esSuyo, { usuarioId: destino.id });
    }
  } else {
    for (const coleccion of ["turnos", "ot", "descuentos"]) {
      const suyos = await datos.listar(coleccion, { usuarioId: perfil.id });
      for (const r of suyos) {
        if (coleccion === "turnos" && r.comprobante) await borrarFoto(r.id).catch(() => {});
        await datos.eliminar(coleccion, r.id);
      }
    }
  }
  usuarios.lista = usuarios.lista.filter((u) => u !== perfil);
  usuarios.activo = destino ? destino.id : null;
  guardar();
}

// Al restaurar una copia: agregar personas nuevas (ya revisadas)
export function agregarUsuarios(personas) {
  usuarios.lista.push(...personas);
  return guardar();
}
