/* =========================================================
   VISTA: TURNOS (formulario + historial del mes)
   =========================================================
   Direcciones:
     #turnos               → registrar un turno nuevo
     #turnos/editar/<id>   → cargar ese turno en el formulario
   ========================================================= */
import { registrarVista, refrescar, ir } from "./navegacion.js";
import { mesVisible, pintarSelectoresMes, textoMes, irAlMes } from "./estado.js";
import {
  ESTACIONES, turnosDelMes, obtenerTurno, ordenarRecientes,
  validarTurno, guardarTurno, eliminarTurno,
} from "../servicios/turnos.js";
import { misOT, otDelTurno, ESTADOS_OT } from "../servicios/ot.js";
import { leerFoto } from "../datos/fotos.js";
import { fechaDeHoy, formatearFecha } from "../utilidades/fechas.js";
import { aCentavos, centavosATexto, formatoDinero } from "../utilidades/dinero.js";
import { mismoId } from "../utilidades/ids.js";
import { esImagenValida } from "../utilidades/seguridad.js";
import { achicarComprobante } from "../utilidades/imagenes.js";

const $ = (selector) => document.querySelector(selector);
const form = $("#form-turno");
const selectEstaciones = form.elements.estacion;
const inputFecha = form.elements.fecha;
const textoFecha = $(".fecha-texto");
const bloqueDiferencia = $("#bloque-diferencia");
const errorTurno = $("#error-turno");
const botonGuardar = $("#boton-guardar");
const listaHistorial = $("#lista-historial");
const previa = $("#comprobante-previa");
const botonQuitarFoto = $("#quitar-comprobante");

// Estado del formulario
let turnoEditando = null; // id del turno que se edita (null = nuevo)
let fotoNueva = null; // foto elegida y achicada, aún sin guardar
let fotoQuitada = false; // se tocó "Quitar foto" al editar
let urlPrevia = ""; // dirección temporal de la miniatura
let filtro = "todos";

/* ---------- 1. Preparar el formulario ---------- */

// Opción vacía al inicio: obliga a elegir una estación
selectEstaciones.innerHTML = '<option value="" disabled selected>Elegir…</option>';
Object.keys(ESTACIONES).forEach((estacion) => {
  const opcion = document.createElement("option");
  opcion.value = estacion;
  opcion.textContent = estacion;
  selectEstaciones.appendChild(opcion);
});

// Fecha: hoy por defecto, sin fechas futuras, y escrita como dd/mm/aaaa
// encima del input en celular (el celular usa el formato de SU idioma)
function mostrarFechaElegida() {
  textoFecha.textContent = inputFecha.value ? formatearFecha(inputFecha.value) : "dd/mm/aaaa";
}
inputFecha.addEventListener("change", mostrarFechaElegida);
inputFecha.addEventListener("input", mostrarFechaElegida);
inputFecha.addEventListener("focus", () => (inputFecha.max = fechaDeHoy()));

// "No cuadrada" muestra el bloque de diferencia (faltante/sobrante + monto)
function actualizarBloqueDiferencia() {
  bloqueDiferencia.hidden = form.elements.resultado.value !== "no-cuadrada";
}
form.addEventListener("change", (evento) => {
  if (evento.target.name === "resultado") actualizarBloqueDiferencia();
});

function mostrarError(mensaje) {
  errorTurno.textContent = mensaje || "";
  errorTurno.hidden = !mensaje;
}

// Miniatura del comprobante
function mostrarPrevia(foto) {
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  urlPrevia = foto ? URL.createObjectURL(foto) : "";
  previa.src = urlPrevia;
  previa.hidden = !foto;
  botonQuitarFoto.hidden = !foto;
}

// Dejar el formulario limpio, en modo "Registrar turno"
function limpiarFormulario() {
  form.reset();
  inputFecha.value = fechaDeHoy();
  inputFecha.max = fechaDeHoy();
  mostrarFechaElegida();
  selectEstaciones.value = "";
  turnoEditando = null;
  fotoNueva = null;
  fotoQuitada = false;
  mostrarPrevia(null);
  mostrarError("");
  actualizarBloqueDiferencia();
  $("#aviso-revisar").hidden = true;
  $("#ot-del-turno").hidden = true;
  $("#titulo-formulario").textContent = "Registrar turno";
  botonGuardar.textContent = "Guardar turno";
  $("#cancelar-edicion").hidden = true;
}
limpiarFormulario();

// Si cambia la persona, se cancela la edición (nadie guarda en un turno ajeno)
document.addEventListener("cambio-usuario", limpiarFormulario);

/* ---------- 2. Editar un turno ---------- */
async function empezarEdicion(id) {
  const turno = await obtenerTurno(id);
  if (!turno) {
    ir("#turnos");
    return;
  }
  const susOT = await otDelTurno(turno.id);
  limpiarFormulario();
  turnoEditando = turno.id;

  inputFecha.value = turno.fecha;
  mostrarFechaElegida();
  selectEstaciones.value = turno.estacion;
  form.elements.turno.value = turno.turno;
  form.elements.resultado.value = turno.resultado;
  form.elements.observacion.value = turno.observacion || "";
  form.elements.tipoDiferencia.value = turno.tipoDiferencia || "";
  form.elements.monto.value = centavosATexto(turno.montoCentavos);
  $("#aviso-revisar").hidden = !turno.montoRevisar;
  actualizarBloqueDiferencia();

  // OT de este turno + botón para agregar otra
  $("#ot-del-turno").hidden = false;
  pintarOTDelTurno(susOT);
  $("#agregar-ot-turno").href = `#ot/nueva/${encodeURIComponent(turno.id)}`;

  $("#titulo-formulario").textContent = "Editar turno";
  botonGuardar.textContent = "Guardar cambios";
  $("#cancelar-edicion").hidden = false;
  form.closest(".tarjeta").scrollIntoView({ behavior: "smooth" });

  if (turno.comprobante) {
    try {
      const foto = await leerFoto(turno.id);
      if (foto && mismoId(turnoEditando, turno.id)) mostrarPrevia(foto);
    } catch {
      /* si no se puede leer, se edita sin miniatura */
    }
  }
}

// Una "chapita" por OT: número + estado, con enlace a su detalle
function chipOT(ot) {
  const enlace = document.createElement("a");
  enlace.href = `#ot/${encodeURIComponent(ot.id)}`;
  enlace.className = `etiqueta etiqueta-${ESTADOS_OT[ot.estado].clase}`;
  enlace.textContent = `${ot.numero} · ${ESTADOS_OT[ot.estado].texto}`;
  return enlace;
}

function pintarOTDelTurno(susOT) {
  const lista = $("#lista-ot-turno");
  lista.innerHTML = "";
  if (susOT.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "campo-ayuda";
    vacio.textContent = "Este turno todavía no tiene OT.";
    lista.appendChild(vacio);
  }
  susOT.forEach((ot) => {
    const li = document.createElement("li");
    li.className = "item-simple";
    const textos = document.createElement("span");
    const motivo = document.createElement("small");
    motivo.textContent = `${ot.motivo} · ${formatoDinero(ot.montoCentavos)}`;
    textos.append(chipOT(ot), motivo);
    li.appendChild(textos);
    lista.appendChild(li);
  });
}

$("#cancelar-edicion").addEventListener("click", () => {
  limpiarFormulario();
  ir("#turnos");
});

/* ---------- 3. Foto del comprobante ---------- */
$("#camara-comprobante").addEventListener("click", () => $("#camara-input-comprobante").click());
$("#elegir-comprobante").addEventListener("click", () => $("#input-comprobante").click());

async function usarFoto(evento) {
  const input = evento.target;
  const archivo = input.files[0];
  input.value = "";
  if (!archivo || !esImagenValida(archivo)) return;
  try {
    fotoNueva = await achicarComprobante(archivo);
    fotoQuitada = false;
    mostrarPrevia(fotoNueva);
  } catch {
    alert("No se pudo leer esa imagen. Prueba con otra foto.");
  }
}
$("#input-comprobante").addEventListener("change", usarFoto);
$("#camara-input-comprobante").addEventListener("change", usarFoto);

botonQuitarFoto.addEventListener("click", () => {
  fotoNueva = null;
  fotoQuitada = true;
  mostrarPrevia(null);
});

/* ---------- 4. Guardar ---------- */
form.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // que la página no se recargue

  // FormData lee todos los campos usando su atributo "name"
  const datos = new FormData(form);
  const noCuadro = datos.get("resultado") === "no-cuadrada";
  const textoMonto = String(datos.get("monto") || "").trim();
  const campos = {
    fecha: datos.get("fecha"),
    estacion: datos.get("estacion"),
    turno: datos.get("turno"),
    resultado: datos.get("resultado"),
    observacion: String(datos.get("observacion") || "").trim(),
  };
  if (!campos.resultado) return mostrarError("Elige si la caja cuadró o no.");
  if (noCuadro) {
    campos.tipoDiferencia = datos.get("tipoDiferencia");
    campos.montoCentavos = aCentavos(textoMonto);
    if (textoMonto && campos.montoCentavos === null) return mostrarError("El monto no es válido. Escríbelo así: 0,45");
  }
  const error = validarTurno(campos);
  if (error) return mostrarError(error);
  mostrarError("");

  botonGuardar.disabled = true;
  try {
    const eraNuevo = !turnoEditando;
    const { turno, errorFoto } = await guardarTurno(campos, turnoEditando, { nueva: fotoNueva, quitada: fotoQuitada });
    if (errorFoto) alert("El turno se guardó, pero no se pudo guardar la foto del comprobante.");

    limpiarFormulario();
    irAlMes(turno.fecha); // mostrar el mes del turno guardado
    filtro = "todos";

    // Un descuadre nuevo: ¿registrar su OT de una vez?
    if (eraNuevo && noCuadro && confirm("Turno guardado.\n¿El Operador de Recaudo te dio una OT por este descuadre? Toca Aceptar para registrarla ahora.")) {
      ir(`#ot/nueva/${encodeURIComponent(turno.id)}`);
      return;
    }
    // Quitar "/editar/..." de la dirección sin agregar un paso al "atrás"
    history.replaceState(null, "", "#turnos");
    await refrescar();
  } catch (e) {
    mostrarError(e.message);
  } finally {
    botonGuardar.disabled = false;
  }
});

/* ---------- 5. Historial del mes ---------- */
const iconoLapiz = `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>`;
const iconoPapelera = `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>`;
const iconoClip = `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>`;

function pintarHistorial(turnosMes, todasOT) {
  listaHistorial.innerHTML = "";
  const visibles = turnosMes.filter((t) => {
    if (filtro === "cuadrados") return t.resultado === "cuadrada";
    if (filtro === "descuadrados") return t.resultado === "no-cuadrada";
    return true;
  });

  if (visibles.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "historial-vacio";
    vacio.textContent = turnosMes.length === 0 ? `No hay turnos registrados en ${textoMes()}.` : "No hay turnos con este filtro.";
    listaHistorial.appendChild(vacio);
    return;
  }

  ordenarRecientes(visibles).forEach((turno) => {
    const cuadrada = turno.resultado === "cuadrada";
    const li = document.createElement("li");
    li.className = "registro";
    li.dataset.id = turno.id;
    if (mismoId(turno.id, turnoEditando)) li.classList.add("editando");

    // Estructura fija con innerHTML (aquí NO va nada que escriba el usuario)
    li.innerHTML = `
      <span class="punto ${cuadrada ? "punto-verde" : "punto-naranja"}"></span>
      <div class="registro-info"><strong></strong><p></p></div>
      <div class="registro-etiquetas">
        <span class="etiqueta ${cuadrada ? "etiqueta-verde" : "etiqueta-roja"}">${cuadrada ? "Cuadrada" : "Descuadre"}</span>
        <span class="etiqueta ${turno.turno === "fijo" ? "etiqueta-fijo" : "etiqueta-reserva"}">${turno.turno === "fijo" ? "Fijo" : "Reserva"}</span>
      </div>
      <div class="registro-acciones">
        <button type="button" class="editar" aria-label="Editar registro">${iconoLapiz}</button>
        <button type="button" class="eliminar" aria-label="Eliminar registro">${iconoPapelera}</button>
      </div>`;
    // Lo que escribe el usuario va con textContent (más seguro que innerHTML)
    li.querySelector("strong").textContent = turno.estacion;
    li.querySelector("p").textContent = formatearFecha(turno.fecha);

    // Monto del descuadre: "−$0,45 Faltante" en su propia fila
    if (!cuadrada) {
      const fila = document.createElement("div");
      fila.className = "registro-fila";
      const monto = document.createElement("strong");
      if (turno.montoCentavos) {
        const faltante = turno.tipoDiferencia === "faltante";
        monto.className = faltante ? "rojo" : "amarillo";
        monto.textContent = `${faltante ? "−" : "+"}${formatoDinero(turno.montoCentavos)} ${faltante ? "faltante" : "sobrante"}`;
      } else {
        monto.className = "texto-suave";
        monto.textContent = "Sin monto";
      }
      fila.appendChild(monto);
      if (turno.montoRevisar || !turno.montoCentavos) {
        const revisar = document.createElement("span");
        revisar.className = "etiqueta etiqueta-pendiente";
        revisar.textContent = turno.montoCentavos ? "Revisar monto" : "Falta el monto";
        fila.appendChild(revisar);
      }
      todasOT.filter((ot) => mismoId(ot.turnoId, turno.id)).forEach((ot) => fila.appendChild(chipOT(ot)));
      li.appendChild(fila);
    }

    if (turno.observacion) {
      const obs = document.createElement("p");
      obs.className = "registro-obs";
      obs.textContent = turno.observacion;
      li.appendChild(obs);
    }
    if (turno.comprobante) {
      const ver = document.createElement("button");
      ver.type = "button";
      ver.className = "ver-comprobante";
      ver.innerHTML = `${iconoClip} Ver comprobante`;
      li.appendChild(ver);
    }
    listaHistorial.appendChild(li);
  });
}

// Filtros Todos / Cuadres / Descuadres
$("#filtros-turnos").addEventListener("click", (evento) => {
  const boton = evento.target.closest(".filtro");
  if (!boton) return;
  filtro = boton.dataset.filtro;
  refrescar();
});

function pintarFiltros() {
  document.querySelectorAll("#filtros-turnos .filtro").forEach((boton) => {
    const elegido = boton.dataset.filtro === filtro;
    boton.classList.toggle("activo", elegido);
    boton.setAttribute("aria-pressed", elegido);
  });
}

// Delegación de eventos: UN solo "click" en la lista para todos los botones
listaHistorial.addEventListener("click", async (evento) => {
  const boton = evento.target.closest(".editar, .eliminar, .ver-comprobante");
  if (!boton) return;
  const id = boton.closest(".registro").dataset.id;
  const turno = await obtenerTurno(id);
  if (!turno) return;

  if (boton.classList.contains("editar")) {
    ir(`#turnos/editar/${encodeURIComponent(turno.id)}`);
  } else if (boton.classList.contains("ver-comprobante")) {
    abrirComprobante(turno);
  } else if (confirm(`¿Eliminar el turno de ${turno.estacion} del ${formatearFecha(turno.fecha)}?\nSus OT se conservan, pero quedan sin turno.`)) {
    await eliminarTurno(turno);
    if (mismoId(turnoEditando, turno.id)) {
      limpiarFormulario();
      history.replaceState(null, "", "#turnos");
    }
    refrescar();
  }
});

/* ---------- 6. Ver comprobante ---------- */
const dialogoComprobante = $("#dialogo-comprobante");
let urlComprobante = "";

async function abrirComprobante(turno) {
  let foto = null;
  try {
    foto = await leerFoto(turno.id);
  } catch {
    foto = null;
  }
  if (!foto) return alert("No se encontró la foto de este comprobante en este celular.");
  urlComprobante = URL.createObjectURL(foto);
  $("#comprobante-imagen").src = urlComprobante;
  $("#comprobante-detalle").textContent = `${turno.estacion} · ${formatearFecha(turno.fecha)}`;
  const descargar = $("#descargar-comprobante");
  descargar.href = urlComprobante;
  descargar.download = `comprobante-${turno.fecha}-${turno.estacion.replace(/\s+/g, "-")}.jpg`;
  dialogoComprobante.showModal();
}
$("#cerrar-comprobante").addEventListener("click", () => dialogoComprobante.close());
dialogoComprobante.addEventListener("close", () => {
  URL.revokeObjectURL(urlComprobante);
  $("#comprobante-imagen").removeAttribute("src");
});

/* ---------- 7. Mostrar la vista ---------- */
async function mostrar(parametros) {
  const [accion, id] = parametros;
  if (accion === "editar" && id && !mismoId(id, turnoEditando)) await empezarEdicion(id);

  const turnosMes = await turnosDelMes(mesVisible.anio, mesVisible.mes);
  const todasOT = await misOT();
  pintarSelectoresMes();
  pintarFiltros();
  pintarHistorial(turnosMes, todasOT);
}

registrarVista("turnos", "Turnos", mostrar);
