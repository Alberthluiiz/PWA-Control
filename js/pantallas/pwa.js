/* =========================================================
   PWA: FUNCIONAR SIN INTERNET
   =========================================================
   Registrar el service worker (sw.js): guarda una copia de la app para
   que abra aunque no haya internet.
   1. "serviceWorker" in navigator → solo si el navegador lo soporta
   2. Se registra después de que la página cargó ("load") para no
      hacerla más lenta
   ========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => console.error("No se pudo registrar sw.js:", error));
  });
}
