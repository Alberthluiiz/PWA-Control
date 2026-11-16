/* =========================================================
   VISTA: DESCUENTOS
   Cuánto se te va a descontar en el mes, por qué, y los descuentos
   que ya te aplicaron en el rol de pagos.
   ========================================================= */
import { registrarVista, refrescar } from "./navegacion.js";
import { mesVisible, pintarSelectoresMes, textoMes } from "./estado.js";
import { calcularMes, registrarDescuento, eliminarDescuento } from "../servicios/descuentos.js";
import { ESTADOS_OT } from "../servicios/ot.js";
import { aCentavos, formatoDinero } from "../utilidades/dinero.js";
import { fechaDeHoy, fechaCorta, formatearFecha, mesesCompletos } from "../utilidades/fechas.js";

const $ = (selector) => document.querySelector(selector);

function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// Qué color y qué texto lleva cada fila del detalle
const CLASES = {
  descontar: { color: "rojo", texto: "A descontar" },
  revision: { color: "amarillo", texto: "En revisión" },
  justificado: { color: "verde", texto: "Justificado" },
  "sin-monto": { color: "texto-suave", texto: "Falta el monto" },
};

/* ---------- 1. Saldo grande y ayuda ---------- */
function pintarSaldo(r) {
  $("#desc-saldo").textContent = formatoDinero(r.saldo);
  $("#desc-saldo").className = `monto-gigante ${r.saldo > 0 ? "rojo" : "verde"}`;
  let ayuda = "No tienes descuentos pendientes este mes.";
  if (r.saldo > 0 && r.enRevision > 0) {
    ayuda = `Si las OT pendientes salen no válidas, podría llegar a ${formatoDinero(r.maximo)}.`;
  } else if (r.saldo > 0) {
    ayuda = "Es lo que falta que te descuenten de este mes.";
  } else if (r.enRevision > 0) {
    ayuda = `Hay ${formatoDinero(r.enRevision)} en revisión: depende de que tus OT salgan válidas.`;
  }
  $("#desc-saldo-ayuda").textContent = ayuda;
}

/* ---------- 2. Barra de partes y las 4 cajitas ---------- */
function pintarResumen(r) {
  $("#desc-descontar").textContent = formatoDinero(r.aDescontar);
  $("#desc-revision").textContent = formatoDinero(r.enRevision);
  $("#desc-justificado").textContent = formatoDinero(r.justificado);
  $("#desc-aplicado").textContent = formatoDinero(r.yaDescontado);

  // Cada parte ocupa el % que le toca del total. flex-grow hace la cuenta.
  const barra = $("#desc-barra");
  barra.innerHTML = "";
  const partes = [
    ["rojo", r.aDescontar],
    ["amarillo", r.enRevision],
    ["verde", r.justificado],
  ];
  const total = partes.reduce((s, [, valor]) => s + valor, 0);
  barra.hidden = total === 0;
  partes.forEach(([color, valor]) => {
    if (!valor) return;
    const parte = crear("span", `parte-${color}`);
    parte.style.flexGrow = valor;
    barra.appendChild(parte);
  });

  const aviso = $("#desc-sin-monto");
  aviso.hidden = r.sinMonto === 0;
  aviso.textContent = `${r.sinMonto} descuadre(s) no tienen monto. Edítalos en Turnos para que el cálculo sea exacto.`;
}

/* ---------- 3. Lista de descuadres del mes ---------- */
function filaDetalle(d) {
  const li = document.createElement("li");
  const enlace = crear("a", "item-simple");
  const textos = crear("span");
  const info = CLASES[d.clase];

  if (d.turno) {
    // Turno descuadrado: va a editar el turno (ahí se ven sus OT)
    enlace.href = `#turnos/editar/${encodeURIComponent(d.turno.id)}`;
    const diferencia = d.turno.tipoDiferencia === "sobrante" ? "Sobrante" : "Faltante";
    textos.append(
      crear("strong", "", `${fechaCorta(d.turno.fecha)} · ${d.turno.estacion}`),
      crear("small", "", d.ot.length
        ? `${diferencia} · ${d.ot.map((ot) => `${ot.numero} (${ESTADOS_OT[ot.estado].texto.toLowerCase()})`).join(", ")}`
        : `${diferencia} · sin OT`),
    );
  } else {
    // OT suelta (sin turno): va al detalle de la OT
    const ot = d.ot[0];
    enlace.href = `#ot/${encodeURIComponent(ot.id)}`;
    textos.append(
      crear("strong", "", `${fechaCorta(ot.fecha)} · ${ot.numero}`),
      crear("small", "", `Sin turno · ${ESTADOS_OT[ot.estado].texto}`),
    );
  }

  // A la derecha: lo que se descuenta (o lo que está en juego)
  const derecha = crear("span", "monto-derecha");
  const valor = d.clase === "descontar" ? d.descontar : d.clase === "revision" ? d.revision : d.monto;
  derecha.append(
    crear("strong", info.color, d.clase === "sin-monto" ? "—" : formatoDinero(valor)),
    crear("small", "", info.texto),
  );
  enlace.append(textos, derecha);
  li.appendChild(enlace);
  return li;
}

function pintarDetalle(r) {
  const lista = $("#desc-detalle");
  lista.innerHTML = "";
  if (r.detalle.length === 0) {
    lista.appendChild(crear("li", "historial-vacio", "No hay descuadres en este mes. ¡Bien!"));
    return;
  }
  r.detalle.forEach((d) => lista.appendChild(filaDetalle(d)));
}

/* ---------- 4. Descuentos ya aplicados en el rol ---------- */
function pintarAplicados(r) {
  const lista = $("#desc-aplicados");
  lista.innerHTML = "";
  if (r.aplicados.length === 0) {
    lista.appendChild(crear("li", "historial-vacio", "Todavía no registras descuentos de este mes."));
    return;
  }
  r.aplicados
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .forEach((d) => {
      const li = crear("li", "item-simple");
      const textos = crear("span");
      textos.append(
        crear("strong", "", formatoDinero(d.montoCentavos)),
        crear("small", "", `${formatearFecha(d.fecha)}${d.referencia ? ` · ${d.referencia}` : ""}`),
      );
      const borrar = crear("button", "boton-enlace boton-peligro-texto", "Eliminar");
      borrar.type = "button";
      borrar.dataset.eliminar = d.id;
      li.append(textos, borrar);
      lista.appendChild(li);
    });
}

$("#desc-aplicados").addEventListener("click", async (evento) => {
  const boton = evento.target.closest("[data-eliminar]");
  if (!boton) return;
  if (!confirm("¿Eliminar este descuento registrado?")) return;
  await eliminarDescuento(boton.dataset.eliminar);
  refrescar();
});

/* ---------- 5. Ventana "Registrar descuento aplicado" ---------- */
const dialogo = $("#dialogo-descuento");
const form = $("#form-descuento");
const error = $("#error-descuento");

$("#registrar-descuento").addEventListener("click", () => {
  form.reset();
  error.hidden = true;
  form.elements.fecha.value = fechaDeHoy();
  $("#descuento-periodo").textContent = `Descuento por los descuadres de ${mesesCompletos[mesVisible.mes].toLowerCase()} ${mesVisible.anio}.`;
  dialogo.showModal();
});

$("#cancelar-descuento").addEventListener("click", () => dialogo.close());

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const montoCentavos = aCentavos(form.elements.monto.value);
  const fecha = form.elements.fecha.value;
  let problema = "";
  if (!montoCentavos) problema = "Escribe el monto descontado, por ejemplo 0,45.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) problema = "Elige la fecha del descuento.";
  if (problema) {
    error.textContent = problema;
    error.hidden = false;
    return;
  }
  await registrarDescuento(mesVisible.anio, mesVisible.mes, {
    montoCentavos,
    fecha,
    referencia: form.elements.referencia.value.trim().slice(0, 60),
  });
  dialogo.close();
  refrescar();
});

/* ---------- Mostrar la vista ---------- */
async function mostrar() {
  const r = await calcularMes(mesVisible.anio, mesVisible.mes);
  pintarSelectoresMes();
  $("#desc-saldo-titulo").textContent = `Saldo a descontar · ${textoMes()}`;
  pintarSaldo(r);
  pintarResumen(r);
  pintarDetalle(r);
  pintarAplicados(r);
}

registrarVista("descuentos", "Descuentos", mostrar);
