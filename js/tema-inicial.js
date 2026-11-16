/* =========================================================
   TEMA (claro/oscuro) ANTES DE PINTAR LA PÁGINA
   =========================================================
   Se carga en el <head> SIN "defer" ni "module", a propósito: así se
   ejecuta antes de que el navegador dibuje y la página no "parpadea"
   en oscuro para luego cambiar a claro.
   Antes este código estaba escrito dentro del index.html y había que
   recalcular su "sha256" en _headers cada vez que cambiaba. En un
   archivo aparte, la regla script-src 'self' ya lo permite.
   La lógica completa del botón está en js/pantallas/tema.js
   ========================================================= */
try {
  const temaGuardado = localStorage.getItem("cuadres-tema");
  const prefiereClaro = matchMedia("(prefers-color-scheme: light)").matches;
  if (temaGuardado === "claro" || (!temaGuardado && prefiereClaro)) {
    document.documentElement.dataset.tema = "claro";
  }
} catch {}
