/* =========================================================
   PUNTO DE ENTRADA DE LA APP
   =========================================================
   index.html carga SOLO este archivo (<script type="module">). Desde
   aquí se importan todos los demás. Orden de arranque:
     1. Convertir los datos viejos (migración), ANTES que todo
     2. Cargar cada pantalla (al importarse, cada una se registra)
     3. Cosas comunes: selector de mes, versión, contador de OT
     4. Mostrar la persona con la sesión abierta y su vista
   OJO: los módulos (import/export) NO funcionan abriendo el archivo
   con doble clic (file://). Hay que usar un servidor: Live Server en
   VS Code, o "npx serve" (ver README).
   ========================================================= */
import { migrarDatos } from "./datos/migraciones.js";

// 1. Migración. Va primero, y por eso las pantallas se importan DESPUÉS
//    con import() (los "import" de arriba se ejecutan antes que el código).
migrarDatos();

// 2. Pantallas. Cada archivo, al cargarse, llama a registrarVista()
//    o conecta sus botones.
const { iniciarNavegacion, refrescar } = await import("./pantallas/navegacion.js");
const { cambiarMes } = await import("./pantallas/estado.js");
const { mostrarUsuario, abrirEntrar } = await import("./pantallas/usuarios.js");
const { usuarioActivo } = await import("./servicios/usuarios.js");
const { misOT } = await import("./servicios/ot.js");
const { VERSION_APP } = await import("./config.js");
await Promise.all([
  import("./pantallas/inicio.js"),
  import("./pantallas/turnos.js"),
  import("./pantallas/ot.js"),
  import("./pantallas/descuentos.js"),
  import("./pantallas/excel.js"),
  import("./pantallas/copia.js"),
  import("./pantallas/recordatorios.js"),
  import("./pantallas/tema.js"),
  import("./pantallas/pwa.js"),
]);

// 3a. Flechas ‹ › de mes. Están en varias vistas; un solo "escuchador"
//     en el documento atiende a todas (delegación de eventos).
document.addEventListener("click", (evento) => {
  const flecha = evento.target.closest("[data-mes]");
  if (!flecha || flecha.disabled) return;
  cambiarMes(Number(flecha.dataset.mes));
  refrescar();
});

// 3b. Versión (carátula y pie) y año del "© 2026"
document.querySelectorAll(".version-app").forEach((elemento) => {
  elemento.textContent = VERSION_APP;
});
document.querySelector("#anio-actual").textContent = new Date().getFullYear();

// 3c. Numerito rojo en "OT" de la barra de abajo: OT pendientes
async function contarPendientes() {
  const contador = document.querySelector("#nav-ot-contador");
  const pendientes = usuarioActivo() ? (await misOT()).filter((ot) => ot.estado === "pendiente").length : 0;
  contador.textContent = pendientes;
  contador.hidden = pendientes === 0;
}
document.addEventListener("vista-mostrada", contarPendientes);

// 4. Arrancar: escuchar los cambios de "#" y dibujar la primera vista.
//    Si nadie tiene la sesión abierta, preguntar quién va a registrar.
iniciarNavegacion();
await mostrarUsuario();
if (!usuarioActivo()) abrirEntrar();
