/* =========================================================
   MODO CLARO / OSCURO
   =========================================================
   El tema se elige con el botón del sol/luna y se guarda en el celular
   (para todas las personas de ese celular). Si nadie eligió todavía,
   se usa el modo del celular. js/tema-inicial.js lo aplica ANTES de
   pintar para que la pantalla no parpadee.
   ========================================================= */
import { CLAVES } from "../datos/almacen-local.js";

const metaColorTema = document.querySelector('meta[name="theme-color"]');

// Tema actual: "claro" u "oscuro"
function temaActual() {
  return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

// Aplicar un tema: cambia data-tema en <html> (el CSS hace el resto)
// y el color de la barra del navegador en el celular
function aplicarTema(tema) {
  if (tema === "claro") document.documentElement.dataset.tema = "claro";
  else delete document.documentElement.dataset.tema;
  // naranja de la empresa en claro, azul noche en oscuro
  metaColorTema.content = tema === "claro" ? "#ec6608" : "#0f172a";
}

aplicarTema(temaActual());

// Hay 2 botones de tema (encabezado y carátula): los dos hacen lo mismo
document.querySelectorAll(".boton-tema").forEach((boton) => {
  boton.addEventListener("click", () => {
    const nuevo = temaActual() === "claro" ? "oscuro" : "claro";
    aplicarTema(nuevo);
    try {
      localStorage.setItem(CLAVES.tema, nuevo);
    } catch {
      // Si no se puede guardar, igual cambia mientras la app esté abierta
    }
  });
});
