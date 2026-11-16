/* =========================================================
   PANTALLAS DE USUARIO: carátula, registro, perfil
   ========================================================= */
import {
  listaUsuarios, usuarioActivo, entrar, salir, nombreRepetido,
  crearUsuario, editarUsuario, eliminarUsuario,
} from "../servicios/usuarios.js";
import { misTurnos } from "../servicios/turnos.js";
import { pintarAvatar } from "../utilidades/avatar.js";
import { esImagenValida } from "../utilidades/seguridad.js";
import { achicarFoto } from "../utilidades/imagenes.js";
import { formatearFecha } from "../utilidades/fechas.js";
import { refrescar } from "./navegacion.js";

// 1. Buscar en el HTML todo lo de los usuarios
const $ = (selector) => document.querySelector(selector);
const botonPerfil = $("#boton-perfil");
const avatarEncabezado = $("#avatar-encabezado");
const nombreEncabezado = $("#nombre-encabezado");
const dialogoEntrar = $("#dialogo-entrar");
const listaBotones = $("#lista-usuarios");
const botonAgregarUsuario = $("#agregar-usuario");
const dialogoRegistro = $("#dialogo-registro");
const formRegistro = $("#form-registro");
const inputNombre = $("#input-nombre");
const inputFoto = $("#input-foto");
const inputCamaraFoto = $("#camara-input-foto");
const avatarPrevia = $("#avatar-previa");
const botonQuitarFoto = $("#quitar-foto");
const dialogoPerfil = $("#dialogo-perfil");

// Persona que se está editando (null = se está creando una nueva)
// y foto elegida en la ventana de registro (todavía sin guardar)
let usuarioEditando = null;
let fotoElegida = "";

// 2. Pintar el encabezado y avisar al resto de la app que cambió la
//    persona (turnos.js escucha "cambio-usuario" para cancelar una edición)
export function mostrarUsuario() {
  const usuario = usuarioActivo();
  if (usuario) {
    pintarAvatar(avatarEncabezado, usuario.nombre, usuario.foto);
    // Solo el primer nombre, para que quepa en el celular
    nombreEncabezado.textContent = usuario.nombre.split(" ")[0];
    botonPerfil.setAttribute("aria-label", `Perfil de ${usuario.nombre}`);
  } else {
    pintarAvatar(avatarEncabezado, "", "");
    nombreEncabezado.textContent = "";
    botonPerfil.setAttribute("aria-label", "Perfil");
  }
  document.dispatchEvent(new Event("cambio-usuario"));
  return refrescar();
}

// 3. Carátula "¿Quién va a registrar?": un botón por persona
export function abrirEntrar() {
  botonAgregarUsuario.textContent = listaUsuarios().length === 0 ? "Crear mi perfil" : "+ Agregar persona";
  listaBotones.innerHTML = "";
  listaUsuarios().forEach((usuario) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "usuario-opcion";
    boton.dataset.id = usuario.id;
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    pintarAvatar(avatar, usuario.nombre, usuario.foto);
    const nombre = document.createElement("span");
    nombre.textContent = usuario.nombre; // textContent: lo escribió el usuario
    boton.append(avatar, nombre);
    listaBotones.appendChild(boton);
  });
  if (!dialogoEntrar.open) dialogoEntrar.showModal();
}

listaBotones.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".usuario-opcion");
  if (!boton) return;
  entrar(boton.dataset.id);
  dialogoEntrar.close();
  mostrarUsuario();
});

botonAgregarUsuario.addEventListener("click", () => abrirRegistro(null));

// La tecla Esc (o "atrás") NO cierra la carátula: hay que saber quién registra
dialogoEntrar.addEventListener("cancel", (evento) => evento.preventDefault());

// 4. Ventana de registro / editar perfil
function abrirRegistro(usuario) {
  usuarioEditando = usuario;
  fotoElegida = usuario ? usuario.foto : "";
  inputNombre.value = usuario ? usuario.nombre : "";
  actualizarPrevia();
  $("#registro-titulo").textContent = usuario ? "Editar perfil" : listaUsuarios().length === 0 ? "Bienvenido" : "Nueva persona";
  $("#registro-texto").textContent = usuario ? "Tus turnos guardados no cambian." : "Escribe tu nombre o un nickname. La foto es opcional.";
  $("#boton-registro").textContent = usuario ? "Guardar" : "Empezar";
  dialogoRegistro.showModal();
}

function actualizarPrevia() {
  pintarAvatar(avatarPrevia, inputNombre.value, fotoElegida);
  botonQuitarFoto.hidden = !fotoElegida;
}
inputNombre.addEventListener("input", actualizarPrevia);

// Foto: "Tomar foto" abre la cámara y "Galería" las fotos guardadas
$("#tomar-foto").addEventListener("click", () => inputCamaraFoto.click());
$("#elegir-foto").addEventListener("click", () => inputFoto.click());
avatarPrevia.addEventListener("click", () => inputFoto.click());

async function usarFotoPerfil(evento) {
  const input = evento.target;
  const archivo = input.files[0];
  input.value = ""; // para poder elegir la misma foto otra vez
  if (!archivo || !esImagenValida(archivo)) return;
  try {
    fotoElegida = await achicarFoto(archivo);
  } catch {
    alert("No se pudo abrir esa imagen. Prueba con otra.");
  }
  actualizarPrevia();
}
inputFoto.addEventListener("change", usarFotoPerfil);
inputCamaraFoto.addEventListener("change", usarFotoPerfil);

botonQuitarFoto.addEventListener("click", () => {
  fotoElegida = "";
  actualizarPrevia();
});

// 5. Guardar la persona (nueva o editada)
function avisarCampo(mensaje) {
  inputNombre.setCustomValidity(mensaje);
  inputNombre.reportValidity();
  inputNombre.setCustomValidity("");
}

formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  // "  Luis   Guillén " → "Luis Guillén"
  const nombre = inputNombre.value.trim().replace(/\s+/g, " ");
  if (nombre.length < 2) return avisarCampo("Escribe al menos 2 letras.");
  if (nombreRepetido(nombre, usuarioEditando)) return avisarCampo("Ya hay una persona con ese nombre.");

  const listo = usuarioEditando
    ? editarUsuario(usuarioEditando, nombre, fotoElegida)
    : await crearUsuario(nombre, fotoElegida);
  if (!listo) return;

  dialogoRegistro.close();
  if (dialogoEntrar.open) dialogoEntrar.close();
  mostrarUsuario();
});

$("#cancelar-registro").addEventListener("click", () => dialogoRegistro.close());

// 6. Menú de perfil (avatar del encabezado o botón "Perfil" de abajo)
function abrirPerfil() {
  const usuario = usuarioActivo();
  if (!usuario) return abrirEntrar();
  pintarAvatar($("#avatar-perfil"), usuario.nombre, usuario.foto);
  $("#perfil-titulo").textContent = usuario.nombre;
  $("#perfil-desde").textContent = `Registrado desde el ${formatearFecha(usuario.creado)}`;
  dialogoPerfil.showModal();
}
botonPerfil.addEventListener("click", abrirPerfil);
$("#nav-perfil").addEventListener("click", abrirPerfil);

$("#editar-perfil").addEventListener("click", () => {
  dialogoPerfil.close();
  abrirRegistro(usuarioActivo());
});

$("#cerrar-perfil").addEventListener("click", () => dialogoPerfil.close());

// 7. Cerrar sesión: los datos quedan guardados; se vuelve a la carátula
$("#cerrar-sesion").addEventListener("click", () => {
  salir();
  dialogoPerfil.close();
  mostrarUsuario();
  abrirEntrar();
});

// 8. Eliminar perfil. Si tiene turnos, primero se ofrece pasarlos a otro
//    perfil. Solo si es el ÚNICO perfil se borran, con doble confirmación.
$("#eliminar-perfil").addEventListener("click", async () => {
  const perfil = usuarioActivo();
  if (!perfil) return;
  const cuantos = (await misTurnos()).length;
  const otros = listaUsuarios().filter((u) => u !== perfil);
  let destino = null;

  if (cuantos && otros.length === 1) {
    if (!confirm(`¿Eliminar el perfil "${perfil.nombre}"?\nSus ${cuantos} turno(s), OT y descuentos pasarán a "${otros[0].nombre}".`)) return;
    destino = otros[0];
  } else if (cuantos && otros.length > 1) {
    const lista = otros.map((u, i) => `${i + 1}. ${u.nombre}`).join("\n");
    const respuesta = prompt(`¿Eliminar el perfil "${perfil.nombre}"?\nEscribe el número del perfil que recibirá sus ${cuantos} turno(s):\n${lista}`);
    if (respuesta === null) return;
    destino = otros[Number(respuesta) - 1];
    if (!destino) return alert("Ese número no está en la lista. No se eliminó nada.");
  } else if (cuantos) {
    if (
      !confirm(`"${perfil.nombre}" es el único perfil y tiene ${cuantos} turno(s).\nSi lo eliminas, esos turnos SE BORRAN. Te conviene tocar "Guardar copia" antes. ¿Eliminar de todas formas?`) ||
      !confirm("Último aviso: se borran el perfil, sus turnos, OT y descuentos. ¿Seguro?")
    ) return;
  } else if (!confirm(`¿Eliminar el perfil "${perfil.nombre}"? No tiene turnos.`)) {
    return;
  }

  await eliminarUsuario(perfil, destino);
  dialogoPerfil.close();
  await mostrarUsuario();
  if (!usuarioActivo()) abrirEntrar();
});

export function cerrarPerfil() {
  if (dialogoPerfil.open) dialogoPerfil.close();
}
