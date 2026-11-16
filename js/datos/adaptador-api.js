/* =========================================================
   ADAPTADOR API (todavía NO se usa)
   =========================================================
   Es el "gemelo" de adaptador-local.js: las mismas funciones, pero los
   datos viajan a un servidor con fetch(). Se activa cambiando
   FUENTE_DATOS a "api" en config.js, cuando la API exista.

   Cada función arma un pedido HTTP:
     GET    → leer           POST → crear
     PUT    → actualizar     DELETE → borrar
   y la respuesta llega en JSON.
   ========================================================= */
import { URL_API } from "../config.js";

// Token de sesión que entregará la API al iniciar sesión (más adelante)
let token = "";
export function usarToken(nuevo) {
  token = nuevo;
}

// Función común: hace el pedido, revisa errores y devuelve el JSON
async function pedir(metodo, ruta, cuerpo) {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  // respuesta.ok es true con códigos 200-299 (todo bien)
  if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}`);
  return respuesta.status === 204 ? null : respuesta.json();
}

export function listar(coleccion, filtros = {}) {
  // { usuarioId: 5 } → "?usuarioId=5"
  const consulta = new URLSearchParams(filtros).toString();
  return pedir("GET", `/${coleccion}${consulta ? `?${consulta}` : ""}`);
}
export const obtener = (coleccion, id) => pedir("GET", `/${coleccion}/${encodeURIComponent(id)}`);
export const crear = (coleccion, datos) => pedir("POST", `/${coleccion}`, datos);
export const actualizar = (coleccion, id, cambios) => pedir("PUT", `/${coleccion}/${encodeURIComponent(id)}`, cambios);
export const eliminar = (coleccion, id) => pedir("DELETE", `/${coleccion}/${encodeURIComponent(id)}`);

export async function agregarVarios(coleccion, registros) {
  for (const registro of registros) await crear(coleccion, registro);
}
export async function actualizarVarios() {
  throw new Error("Pendiente: se definirá con la API.");
}
