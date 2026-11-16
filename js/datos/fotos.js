/* =========================================================
   FOTOS DE COMPROBANTES (IndexedDB)
   =========================================================
   Las fotos NO van en localStorage: ahí solo caben ~5 MB. IndexedDB es
   otra "bodega" del navegador, mucho más grande y hecha para archivos.
   Cada foto se guarda con la llave = id del turno; en el turno solo se
   marca "comprobante: true".
   ========================================================= */
const BASE_FOTOS = "cuadres-fotos";
const ALMACEN_FOTOS = "comprobantes";
let baseFotos = null; // se abre una sola vez y se reutiliza

// 1. Abrir (o crear la primera vez) la base de datos de fotos
function abrirBaseFotos() {
  if (!baseFotos) {
    baseFotos = new Promise((resolver, rechazar) => {
      const pedido = indexedDB.open(BASE_FOTOS, 1);
      // Solo la primera vez: crear el "cajón" donde van las fotos
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN_FOTOS);
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rechazar(pedido.error);
    });
  }
  return baseFotos;
}

// 2. Hacer una operación en el cajón de fotos y esperar a que termine.
//    modo = "readonly" (leer) o "readwrite" (guardar o borrar)
async function usarFotos(modo, operacion) {
  const base = await abrirBaseFotos();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(ALMACEN_FOTOS, modo);
    const pedido = operacion(transaccion.objectStore(ALMACEN_FOTOS));
    transaccion.oncomplete = () => resolver(pedido.result);
    transaccion.onerror = () => rechazar(transaccion.error);
    transaccion.onabort = () => rechazar(transaccion.error);
  });
}

export const guardarFoto = (id, foto) => usarFotos("readwrite", (cajon) => cajon.put(foto, id));
export const leerFoto = (id) => usarFotos("readonly", (cajon) => cajon.get(id));
export const borrarFoto = (id) => usarFotos("readwrite", (cajon) => cajon.delete(id));

// 3. Pedir al navegador que NO borre estos datos aunque falte espacio.
//    Algunos celulares lo aceptan sin preguntar; si no, no pasa nada.
export function pedirGuardadoPermanente() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
