/* =========================================================
   NAVEGACIÓN ENTRE VISTAS (un "router" muy simple)
   =========================================================
   La app es UNA sola página. Lo que cambia es la parte después del "#"
   en la dirección:
     #inicio · #turnos · #ot · #ot/nueva · #ot/nueva/<idTurno>
     #ot/editar/<idOT> · #ot/<idOT> · #descuentos
   Cambiar el "#" no recarga la página: solo dispara el evento
   "hashchange". Aquí lo escuchamos y mostramos la <section> que toca.
   Ventaja: el botón "atrás" del celular funciona solo.
   ========================================================= */

const vistas = {}; // nombre → { titulo, mostrar(parametros) }
let actual = { nombre: "inicio", parametros: [] };

// Cada pantalla se registra con su nombre, su título y su función mostrar
export function registrarVista(nombre, titulo, mostrar) {
  vistas[nombre] = { titulo, mostrar };
}

// "#ot/editar/abc" → { nombre: "ot-form", parametros: ["editar", "abc"] }
function leerDireccion() {
  const partes = decodeURIComponent(location.hash.slice(1)).split("/").filter(Boolean);
  const [primera = "inicio", ...resto] = partes;
  if (primera === "ot" && resto.length) {
    if (resto[0] === "nueva" || resto[0] === "editar") return { nombre: "ot-form", parametros: resto };
    return { nombre: "ot-detalle", parametros: resto };
  }
  return { nombre: vistas[primera] ? primera : "inicio", parametros: resto };
}

async function mostrarVistaActual(subir = true) {
  actual = leerDireccion();
  const vista = vistas[actual.nombre];

  // Mostrar solo la <section> de esta vista
  document.querySelectorAll(".vista").forEach((seccion) => {
    seccion.hidden = seccion.dataset.vista !== actual.nombre;
  });

  // Marcar el botón de la barra inferior (ot-form y ot-detalle son "ot")
  const grupo = actual.nombre.split("-")[0];
  document.querySelectorAll("[data-nav]").forEach((enlace) => {
    const activo = enlace.dataset.nav === grupo;
    enlace.classList.toggle("activo", activo);
    if (activo) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });

  document.querySelector("#titulo-vista").textContent = vista.titulo;
  if (subir) window.scrollTo({ top: 0 });
  await vista.mostrar(actual.parametros);
  // Avisar que se dibujó una vista (main.js actualiza el contador de OT)
  document.dispatchEvent(new Event("vista-mostrada"));
}

// Volver a dibujar la vista que se está viendo (después de guardar,
// eliminar, cambiar de mes o de persona), sin subir al inicio.
export function refrescar() {
  return mostrarVistaActual(false);
}

export function ir(direccion) {
  if (location.hash === direccion) refrescar();
  else location.hash = direccion;
}

// Empezar a escuchar los cambios de "#". La primera vista la dibuja
// mostrarUsuario() (pantallas/usuarios.js) al arrancar.
export function iniciarNavegacion() {
  window.addEventListener("hashchange", () => mostrarVistaActual());
}
