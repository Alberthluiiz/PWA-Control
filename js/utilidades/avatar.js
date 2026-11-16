/* =========================================================
   AVATAR (iniciales o foto, como en WhatsApp)
   ========================================================= */
import { esFotoTexto } from "./seguridad.js";

// "Luis Alberto Guillén" → "LA" · "luchito" → "L"
//   Array.from separa bien letras con tilde y emojis.
export function iniciales(nombre) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => Array.from(palabra)[0])
    .join("")
    .toUpperCase();
}

// Color según el nombre: el mismo nombre siempre da el mismo color.
//   Se suma el código de cada letra y el resto (%) elige un color.
const coloresAvatar = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0d9488", "#16a34a", "#ca8a04", "#0891b2"];

export function colorDelNombre(nombre) {
  let suma = 0;
  for (const letra of nombre.toLowerCase()) suma += letra.codePointAt(0);
  return coloresAvatar[suma % coloresAvatar.length];
}

// Pintar un <span class="avatar">: la foto si hay; si no, las iniciales
export function pintarAvatar(elemento, nombre, foto) {
  const limpio = (nombre || "").trim();
  if (foto && esFotoTexto(foto)) {
    elemento.textContent = "";
    elemento.style.backgroundImage = `url("${foto}")`;
    elemento.style.backgroundColor = "";
  } else {
    elemento.textContent = limpio ? iniciales(limpio) : "?";
    elemento.style.backgroundImage = "";
    elemento.style.backgroundColor = limpio ? colorDelNombre(limpio) : "";
  }
}
