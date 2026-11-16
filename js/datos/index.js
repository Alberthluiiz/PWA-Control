/* =========================================================
   ¿QUÉ ADAPTADOR SE USA?
   =========================================================
   "import * as nombre" junta todas las funciones exportadas de un
   archivo en un objeto. Así "datos.listar(...)" llama a la versión
   local o a la de la API según config.js.
   ========================================================= */
import { FUENTE_DATOS } from "../config.js";
import * as adaptadorLocal from "./adaptador-local.js";
import * as adaptadorApi from "./adaptador-api.js";

export const datos = FUENTE_DATOS === "api" ? adaptadorApi : adaptadorLocal;
