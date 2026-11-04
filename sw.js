/* =========================================================
   SERVICE WORKER: hace que la app funcione SIN INTERNET
   =========================================================
   Un service worker es un archivo JavaScript que el navegador
   instala "por detrás" de la página. Se pone en medio de cada
   pedido de archivos (HTML, CSS, JS, imágenes) y decide:
     - si hay internet → traer la versión nueva y guardar una copia
     - si NO hay internet → entregar la copia guardada (caché)
   ========================================================= */

// 1. Nombre de la caché. Cambia el número (v1 → v2 → v3...) cada vez
//    que quieras forzar que todos los celulares borren la copia vieja.
const VERSION = "v18";
const CACHE = `cuadres-${VERSION}`;

// 2. Archivos de la app que se guardan apenas se instala.
//    Rutas RELATIVAS ("./") para que funcione aunque la app viva dentro
//    de una carpeta (como /Control-de-Cuadres-Info/) y no en la raíz.
const ARCHIVOS = [
  "./",
  "./index.html",
  "./css/normalize.css",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// 3. INSTALAR: descargar y guardar todos los archivos de la lista
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  // Activar esta versión nueva sin esperar a que se cierren las pestañas
  self.skipWaiting();
});

// 4. ACTIVAR: borrar las cachés de versiones anteriores (v1 si ya vamos en v2)
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE)
            .map((nombre) => caches.delete(nombre)),
        ),
      )
      .then(() => self.clients.claim()), // controlar la página ya mismo
  );
});

// 5. CADA PEDIDO de archivo pasa por aquí
self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;

  // Solo nos interesan las lecturas (GET). Otro tipo de pedido, tal cual.
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);

  // a) Fuente Poppins (Google Fonts): "primero la caché".
  //    Las fuentes no cambian nunca, así que si ya la tenemos guardada
  //    no vale la pena volver a descargarla.
  if (
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com"
  ) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardada) =>
          guardada ||
          fetch(pedido).then((respuesta) => {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
            return respuesta;
          }),
      ),
    );
    return;
  }

  // b) Archivos de la app: "primero internet, si falla la caché".
  //    Con internet siempre ves la última versión que subiste a GitHub;
  //    sin internet se usa la última copia guardada.
  if (url.origin === self.location.origin) {
    evento.respondWith(
      fetch(pedido)
        .then((respuesta) => {
          // Guardar/actualizar la copia para la próxima vez sin internet
          // (solo si llegó bien: no guardar una página de error 404)
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          }
          return respuesta;
        })
        .catch(() =>
          // Sin internet. ignoreSearch: "index.html?v=2" usa la copia de "index.html"
          caches.match(pedido, { ignoreSearch: true }),
        ),
    );
  }
});
