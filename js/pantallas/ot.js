/* =========================================================
   VISTAS DE OT: lista, formulario (nueva/editar) y detalle
   =========================================================
   Direcciones:
     #ot                    → lista del mes
     #ot/nueva              → OT nueva
     #ot/nueva/<idTurno>    → OT nueva ya ligada a un turno
     #ot/editar/<idOT>      → editar los datos de una OT
     #ot/<idOT>             → detalle + respuesta del coordinador
   ========================================================= */
import { registrarVista, refrescar, ir } from "./navegacion.js";
import { mesVisible, pintarSelectoresMes, textoMes } from "./estado.js";
import {
  ESTADOS_OT, TIPOS_OT, misOT, obtenerOT, otDelTurno, ordenarOT, normalizarNumero,
  validarOT, crearOT, editarOT, eliminarOT, cambiarEstado,
} from "../servicios/ot.js";
import { misTurnos, obtenerTurno } from "../servicios/turnos.js";
import { aCentavos, centavosATexto, formatoDinero } from "../utilidades/dinero.js";
import { esDelMes, fechaDeHoy, fechaCorta, formatearFecha, diasDesde } from "../utilidades/fechas.js";
import { mismoId } from "../utilidades/ids.js";

const $ = (selector) => document.querySelector(selector);

// Crear un elemento con clase y texto en una línea:
//   crear("strong", "rojo", "$0,45") → <strong class="rojo">$0,45</strong>
//   El texto va con textContent: nunca se interpreta como HTML.
function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

const etiquetaEstado = (ot) => crear("span", `etiqueta etiqueta-${ESTADOS_OT[ot.estado].clase}`, ESTADOS_OT[ot.estado].texto);
const claseMonto = { pendiente: "amarillo", valida: "verde", "no-valida": "rojo" };

/* =================== 1. LISTA =================== */
let filtro = "todas";

$("#filtros-ot").addEventListener("click", (evento) => {
  const boton = evento.target.closest(".filtro");
  if (!boton) return;
  filtro = boton.dataset.filtro;
  refrescar();
});

function pintarResumen(otMes) {
  const caja = $("#ot-resumen");
  caja.innerHTML = "";
  Object.entries(ESTADOS_OT).forEach(([estado, info]) => {
    const deEste = otMes.filter((ot) => ot.estado === estado);
    const suma = deEste.reduce((s, ot) => s + ot.montoCentavos, 0);
    const tarjeta = crear("div", "resumen-caja");
    tarjeta.append(
      crear("span", "", info.texto === "Pendiente" ? "Pendientes" : `${info.texto}s`),
      crear("strong", claseMonto[estado], deEste.length),
      crear("span", "", formatoDinero(suma)),
    );
    caja.appendChild(tarjeta);
  });
}

function itemOT(ot) {
  const li = document.createElement("li");
  const enlace = crear("a", `item-ot item-ot-${ESTADOS_OT[ot.estado].clase}`);
  enlace.href = `#ot/${encodeURIComponent(ot.id)}`;
  const arriba = crear("div", "fila-separada");
  arriba.append(crear("strong", "", ot.numero), etiquetaEstado(ot));
  const abajo = crear("div", "fila-separada");
  const diferencia = ot.tipoDiferencia === "sobrante" ? "Sobrante" : "Faltante";
  abajo.append(
    crear("small", "", `${formatearFecha(ot.fecha)} · ${ot.estacion || "Sin turno"} · ${diferencia}`),
    crear("strong", claseMonto[ot.estado], formatoDinero(ot.montoCentavos)),
  );
  enlace.append(arriba, crear("p", "", ot.motivo), abajo);
  li.appendChild(enlace);
  return li;
}

async function mostrarLista() {
  const otMes = ordenarOT((await misOT()).filter((ot) => esDelMes(ot.fecha, mesVisible.anio, mesVisible.mes)));
  pintarSelectoresMes();
  pintarResumen(otMes);

  document.querySelectorAll("#filtros-ot .filtro").forEach((boton) => {
    const elegido = boton.dataset.filtro === filtro;
    boton.classList.toggle("activo", elegido);
    boton.setAttribute("aria-pressed", elegido);
  });

  const lista = $("#lista-ot");
  lista.innerHTML = "";
  const visibles = otMes.filter((ot) => filtro === "todas" || ot.estado === filtro);
  if (visibles.length === 0) {
    lista.appendChild(
      crear("li", "historial-vacio", otMes.length === 0 ? `No hay OT registradas en ${textoMes()}.` : "No hay OT con este filtro."),
    );
  }
  visibles.forEach((ot) => lista.appendChild(itemOT(ot)));
}

/* =================== 2. FORMULARIO =================== */
const formOT = $("#form-ot");
let otEditando = null; // OT que se edita (null = nueva)

// Chips del tipo de incidencia: radios ocultos con estilo de "píldora"
Object.entries(TIPOS_OT).forEach(([clave, texto]) => {
  const label = crear("label", "chip");
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "tipo";
  radio.value = clave;
  label.append(radio, crear("span", "", texto));
  $("#chips-tipo-ot").appendChild(label);
});

function errorOT(mensaje) {
  $("#error-ot").textContent = mensaje || "";
  $("#error-ot").hidden = !mensaje;
}

// Opciones del select "Turno": los descuadres del mes de la fecha elegida
// (y los cuadrados al final, por si acaso), más "Sin turno".
async function llenarTurnos(fecha, elegido) {
  const [anio, mes] = fecha.split("-").map(Number);
  const turnos = (await misTurnos())
    .filter((t) => esDelMes(t.fecha, anio, mes - 1) || mismoId(t.id, elegido))
    .sort((a, b) => (a.resultado === "cuadrada") - (b.resultado === "cuadrada") || b.fecha.localeCompare(a.fecha));
  const select = formOT.elements.turnoId;
  select.innerHTML = "";
  select.appendChild(new Option("Sin turno ligado", ""));
  turnos.forEach((t) => {
    const detalle = t.resultado === "cuadrada"
      ? "Cuadrada"
      : `${t.tipoDiferencia === "sobrante" ? "Sobrante" : "Faltante"} ${t.montoCentavos ? formatoDinero(t.montoCentavos) : ""}`;
    select.appendChild(new Option(`${fechaCorta(t.fecha)} · ${t.estacion} · ${detalle}`, t.id));
  });
  select.value = elegido ?? "";
  if (select.value === "" && elegido) select.value = String(elegido);
  await ayudaTurno();
}

// Debajo del select: cuántas OT tiene ya ese turno
async function ayudaTurno() {
  const id = formOT.elements.turnoId.value;
  if (!id) {
    $("#ot-turno-ayuda").textContent = "Puedes dejarla sin turno, pero ligada se calcula mejor el descuento.";
    return;
  }
  const otras = (await otDelTurno(id)).filter((o) => !mismoId(o.id, otEditando?.id));
  $("#ot-turno-ayuda").textContent = otras.length ? `Este turno ya tiene ${otras.length} OT: ${otras.map((o) => o.numero).join(", ")}.` : "Este turno todavía no tiene OT.";
}

formOT.elements.fecha.addEventListener("change", () => {
  if (formOT.elements.fecha.value) llenarTurnos(formOT.elements.fecha.value, formOT.elements.turnoId.value);
});

// Al elegir un turno se copian su diferencia y lo que falta cubrir
formOT.elements.turnoId.addEventListener("change", async () => {
  await ayudaTurno();
  const turno = formOT.elements.turnoId.value ? await obtenerTurno(formOT.elements.turnoId.value) : null;
  if (turno && turno.resultado === "no-cuadrada") await copiarDelTurno(turno);
});

async function copiarDelTurno(turno) {
  if (turno.tipoDiferencia) formOT.elements.tipoDiferencia.value = turno.tipoDiferencia;
  if (!turno.montoCentavos || formOT.elements.monto.value) return;
  // Monto sugerido = monto del turno − lo que ya cubren sus otras OT
  const cubierto = (await otDelTurno(turno.id)).reduce((s, o) => s + o.montoCentavos, 0);
  const resto = turno.montoCentavos - cubierto;
  if (resto > 0) formOT.elements.monto.value = centavosATexto(resto);
}

async function mostrarFormulario([accion, id]) {
  formOT.reset();
  errorOT("");
  formOT.elements.fecha.max = fechaDeHoy();
  otEditando = accion === "editar" ? await obtenerOT(id) : null;

  if (otEditando) {
    const ot = otEditando;
    $("#titulo-form-ot").textContent = `Editar ${ot.numero}`;
    formOT.elements.numero.value = ot.numero.replace(/^OT-/, "");
    formOT.elements.fecha.value = ot.fecha;
    formOT.elements.tipo.value = ot.tipo;
    formOT.elements.tipoDiferencia.value = ot.tipoDiferencia;
    formOT.elements.monto.value = centavosATexto(ot.montoCentavos);
    formOT.elements.motivo.value = ot.motivo;
    $("#aviso-ot-nueva").hidden = true;
    $("#guardar-ot").textContent = "Guardar cambios";
    $("#cancelar-ot").href = `#ot/${encodeURIComponent(ot.id)}`;
    await llenarTurnos(ot.fecha, ot.turnoId);
    return;
  }

  $("#titulo-form-ot").textContent = "Nueva OT";
  $("#aviso-ot-nueva").hidden = false;
  $("#guardar-ot").textContent = "Guardar OT";
  $("#cancelar-ot").href = "#ot";
  // ¿Viene desde un turno? (#ot/nueva/<idTurno>)
  const turno = id ? await obtenerTurno(id) : null;
  formOT.elements.fecha.value = turno ? turno.fecha : fechaDeHoy();
  await llenarTurnos(formOT.elements.fecha.value, turno ? turno.id : "");
  if (turno) {
    $("#cancelar-ot").href = `#turnos/editar/${encodeURIComponent(turno.id)}`;
    await copiarDelTurno(turno);
  }
}

formOT.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = new FormData(formOT);
  const textoMonto = String(datos.get("monto") || "").trim();
  const montoCentavos = aCentavos(textoMonto);
  if (textoMonto && montoCentavos === null) return errorOT("El monto no es válido. Escríbelo así: 0,45");

  const turnoId = datos.get("turnoId") || null;
  const turno = turnoId ? await obtenerTurno(turnoId) : null;
  const campos = {
    numero: normalizarNumero(datos.get("numero")),
    fecha: datos.get("fecha"),
    turnoId: turno ? turno.id : null, // el id con su tipo original (número o texto)
    estacion: turno ? turno.estacion : "",
    tipo: datos.get("tipo"),
    tipoDiferencia: datos.get("tipoDiferencia"),
    montoCentavos,
    motivo: String(datos.get("motivo") || "").trim(),
  };
  const error = await validarOT(campos, otEditando?.id);
  if (error) return errorOT(error);

  try {
    const ot = otEditando ? await editarOT(otEditando.id, campos) : await crearOT(campos);
    ir(`#ot/${encodeURIComponent(ot.id)}`);
  } catch (e) {
    errorOT(e.message);
  }
});

/* =================== 3. DETALLE =================== */
const formEstado = $("#form-estado");
let otDetalle = null;

function dato(lista, titulo, valor) {
  const caja = document.createElement("div");
  caja.append(crear("dt", "", titulo), crear("dd", "", valor));
  lista.appendChild(caja);
}

async function mostrarDetalle([id]) {
  const ot = await obtenerOT(id);
  if (!ot) {
    ir("#ot");
    return;
  }
  const turno = ot.turnoId ? await obtenerTurno(ot.turnoId) : null;
  otDetalle = ot;
  document.querySelector("#titulo-vista").textContent = ot.numero;

  const estado = $("#detalle-estado");
  estado.className = `etiqueta etiqueta-${ESTADOS_OT[ot.estado].clase}`;
  estado.textContent = ESTADOS_OT[ot.estado].texto;
  const monto = $("#detalle-monto");
  monto.className = `monto-grande ${claseMonto[ot.estado]}`;
  monto.textContent = formatoDinero(ot.montoCentavos);
  $("#detalle-motivo").textContent = ot.motivo;

  const lista = $("#detalle-datos");
  lista.innerHTML = "";
  dato(lista, "Fecha", formatearFecha(ot.fecha));
  dato(lista, "Estación", ot.estacion || "Sin turno");
  dato(lista, "Tipo", TIPOS_OT[ot.tipo] || ot.tipo);
  dato(lista, "Diferencia", ot.tipoDiferencia === "sobrante" ? "Sobrante" : "Faltante");
  dato(lista, "Origen", ot.origen === "api" ? "Recaudo (API)" : "Registro manual");
  if (ot.estado === "pendiente") {
    const dias = diasDesde(ot.fecha);
    dato(lista, "Esperando respuesta", dias === 1 ? "1 día" : `${dias} días`);
  } else {
    dato(lista, "Respondió", ot.coordinador || "—");
  }

  const enlaceTurno = $("#detalle-turno");
  enlaceTurno.innerHTML = "";
  if (turno) {
    enlaceTurno.href = `#turnos/editar/${encodeURIComponent(turno.id)}`;
    const textos = crear("span");
    textos.append(crear("small", "", "Turno ligado"), crear("strong", "", `${formatearFecha(turno.fecha)} · ${turno.estacion} · ${turno.turno === "fijo" ? "Fijo" : "Reserva"}`));
    enlaceTurno.append(textos, crear("span", "", "›"));
    enlaceTurno.hidden = false;
  } else {
    enlaceTurno.hidden = true;
  }
  $("#detalle-editar").href = `#ot/editar/${encodeURIComponent(ot.id)}`;

  // Formulario de respuesta: se llena con la última respuesta (si hay)
  formEstado.reset();
  formEstado.elements.coordinador.value = ot.coordinador || "";
  $("#error-estado").hidden = true;
  $("#volver-pendiente").hidden = ot.estado === "pendiente";

  // Historial: lo más nuevo arriba
  const historial = $("#detalle-historial");
  historial.innerHTML = "";
  [...(ot.historial || [])].reverse().forEach((paso) => {
    const li = crear("li", `paso paso-${ESTADOS_OT[paso.estado]?.clase || "pendiente"}`);
    const fecha = new Date(paso.fecha).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
    const quien = paso.coordinador ? ` · ${paso.coordinador}` : "";
    li.append(crear("strong", "", ESTADOS_OT[paso.estado]?.texto || paso.estado), crear("small", "", `${fecha}${quien}`));
    if (paso.nota) li.appendChild(crear("p", "", paso.nota));
    historial.appendChild(li);
  });
}

// Los 3 botones del formulario son "submit" con un value distinto.
// evento.submitter dice cuál se tocó.
formEstado.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nuevo = evento.submitter?.value;
  const coordinador = formEstado.elements.coordinador.value.trim();
  const nota = formEstado.elements.nota.value.trim();
  if (nuevo !== "pendiente" && coordinador.length < 2) {
    $("#error-estado").textContent = "Escribe el nombre del coordinador que respondió.";
    $("#error-estado").hidden = false;
    return;
  }
  if (nuevo === otDetalle.estado && nota === "") {
    $("#error-estado").textContent = `La OT ya está como "${ESTADOS_OT[nuevo].texto}".`;
    $("#error-estado").hidden = false;
    return;
  }
  await cambiarEstado(otDetalle, nuevo, nuevo === "pendiente" ? "" : coordinador, nota);
  refrescar();
});

$("#detalle-eliminar").addEventListener("click", async () => {
  if (!otDetalle || !confirm(`¿Eliminar la ${otDetalle.numero}? Se borra también su historial.`)) return;
  await eliminarOT(otDetalle.id);
  ir("#ot");
});

registrarVista("ot", "Órdenes de trabajo", mostrarLista);
registrarVista("ot-form", "Órdenes de trabajo", mostrarFormulario);
registrarVista("ot-detalle", "Detalle de OT", mostrarDetalle);
