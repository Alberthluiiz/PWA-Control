/* =========================================================
   CONFIGURACIÓN GENERAL DE LA APP
   =========================================================
   Todo lo que se "ajusta" sin tocar la lógica vive aquí.
   Los demás archivos lo importan con:
     import { VERSION_APP } from "./config.js";
   ========================================================= */

// Número de versión que se muestra en la carátula y en el pie.
//   1.4.11 → 1.5.0 porque es una mejora grande (OT, descuentos y código
//   ordenado en módulos). OJO: sube también VERSION en sw.js.
export const VERSION_APP = "1.5.0";

// ¿De dónde salen los datos?
//   "local" → del celular (localStorage), como hasta ahora.
//   "api"   → de nuestra API (cuando exista). Solo se cambia esta línea:
//             las pantallas y los servicios NO se tocan.
export const FUENTE_DATOS = "local";

// Dirección de la API (se usará cuando FUENTE_DATOS sea "api")
export const URL_API = "";

// Meta de eficiencia del mes (KPI): turnos cuadrados sobre el total.
export const META_EFICIENCIA = 80; // en %
