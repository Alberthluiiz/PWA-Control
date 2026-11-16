/* =========================================================
   VISTA: INICIO
   Eficiencia del mes con la meta, descuadres permitidos, OT
   pendientes, descuentos del mes y gráfico por estación.
   =========================================================
   Patrón de TODAS las vistas: primero se piden los datos (await) y
   DESPUÉS se escribe en el HTML de una sola vez. Así, si la vista se
   dibuja dos veces seguidas, no quedan registros repetidos.
   ========================================================= */
import { registrarVista } from "./navegacion.js";
import { mesVisible, pintarSelectoresMes, textoMes } from "./estado.js";
import { turnosDelMes, resumenMes, formatoPorcentaje, ESTACIONES } from "../servicios/turnos.js";
import { misOT, ordenarOT } from "../servicios/ot.js";
import { calcularMes } from "../servicios/descuentos.js";
import { formatoDinero } from "../utilidades/dinero.js";
import { fechaCorta, mesesCompletos } from "../utilidades/fechas.js";
import { META_EFICIENCIA } from "../config.js";

const $ = (selector) => document.querySelector(selector);
const CIRCUNFERENCIA = 264; // 2·π·42, el mismo número que está en el CSS

// Rayita de la meta sobre el anillo. El SVG está girado -90° (empieza
// arriba), así que el ángulo de la meta es simplemente meta × 360°.
//   Seno y coseno dan la posición en el círculo (radio 36 → 48).
function pintarMeta() {
  const angulo = (META_EFICIENCIA / 100) * 2 * Math.PI;
  const punto = (radio) => [50 + radio * Math.cos(angulo), 50 + radio * Math.sin(angulo)];
  const [x1, y1] = punto(35);
  const [x2, y2] = punto(49);
  const linea = $("#anillo-meta");
  linea.setAttribute("x1", x1);
  linea.setAttribute("y1", y1);
  linea.setAttribute("x2", x2);
  linea.setAttribute("y2", y2);
}
pintarMeta();

function pintarEficiencia(r) {
  $("#porcentaje").textContent = formatoPorcentaje(r.porcentaje);
  $("#total-turnos").textContent = r.total;
  $("#total-cuadrados").textContent = r.cuadrados;
  $("#total-descuadres").textContent = r.descuadres;

  // Rellenar el anillo: lo que se OCULTA es la parte que falta para el 100 %
  const anillo = $(".anillo-progreso");
  anillo.style.strokeDashoffset = CIRCUNFERENCIA * (1 - r.porcentaje / 100);
  anillo.style.opacity = r.porcentaje === 0 ? 0 : 1;
  anillo.classList.toggle("bajo-meta", r.total > 0 && !r.cumpleMeta);

  // Etiqueta de la meta y mensaje
  const etiqueta = $("#meta-etiqueta");
  etiqueta.hidden = r.total === 0;
  etiqueta.textContent = r.cumpleMeta ? `Sobre la meta del ${META_EFICIENCIA} %` : `Bajo la meta del ${META_EFICIENCIA} %`;
  etiqueta.className = `etiqueta ${r.cumpleMeta ? "etiqueta-verde" : "etiqueta-roja"}`;

  let mensaje = "Hay que mejorar";
  if (r.total === 0) mensaje = "Sin registros";
  else if (r.porcentaje >= 90) mensaje = "Excelente";
  else if (r.porcentaje >= META_EFICIENCIA) mensaje = "Buen ritmo";
  $("#mensaje").textContent = mensaje;

  // Descuadres permitidos: un cuadrito por cada uno; los usados en naranja
  $("#permitidos-texto").textContent = `${r.descuadres} de ${r.permitidos}`;
  const barra = $("#permitidos-barra");
  barra.innerHTML = "";
  const cuadritos = Math.max(r.permitidos, r.descuadres);
  for (let i = 0; i < cuadritos; i++) {
    const cuadrito = document.createElement("span");
    if (i < r.descuadres) cuadrito.className = i < r.permitidos ? "usado" : "pasado";
    barra.appendChild(cuadrito);
  }
  $("#permitidos-ayuda").textContent =
    r.total === 0
      ? "Registra tus turnos para ver cuántos descuadres te quedan."
      : r.descuadres > r.permitidos
        ? `Pasaste el límite: con ${r.total} turnos caben ${r.permitidos} descuadres para estar sobre el ${META_EFICIENCIA} %.`
        : `Te ${r.restantes === 1 ? "queda" : "quedan"} ${r.restantes} descuadre(s) antes de bajar del ${META_EFICIENCIA} % (con ${r.total} turnos).`;
}

function pintarOT(pendientes) {
  $("#inicio-ot").hidden = pendientes.length === 0;
  const suma = pendientes.reduce((s, ot) => s + ot.montoCentavos, 0);
  $("#inicio-ot-cuantas").textContent = `${pendientes.length} · ${formatoDinero(suma)}`;
  const lista = $("#inicio-ot-lista");
  lista.innerHTML = "";
  pendientes.slice(0, 3).forEach((ot) => {
    const li = document.createElement("li");
    const enlace = document.createElement("a");
    enlace.href = `#ot/${encodeURIComponent(ot.id)}`;
    enlace.className = "item-simple";
    const textos = document.createElement("span");
    const numero = document.createElement("strong");
    numero.textContent = ot.numero;
    const detalle = document.createElement("small");
    detalle.textContent = `${fechaCorta(ot.fecha)} · ${ot.estacion || "Sin turno"} · ${ot.motivo}`;
    textos.append(numero, detalle);
    const monto = document.createElement("strong");
    monto.className = "amarillo";
    monto.textContent = formatoDinero(ot.montoCentavos);
    enlace.append(textos, monto);
    li.appendChild(enlace);
    lista.appendChild(li);
  });
}

function pintarDescuentos(d) {
  $("#inicio-desc-titulo").textContent = `Descuentos de ${mesesCompletos[mesVisible.mes].toLowerCase()}`;
  $("#inicio-desc-saldo").textContent = formatoDinero(d.saldo);
  $("#inicio-desc-revision").textContent = formatoDinero(d.enRevision);
  $("#inicio-desc-justificado").textContent = formatoDinero(d.justificado);
}

// Gráfico de columnas por estación, hecho solo con HTML y CSS
function mostrarPorEstacion(turnos) {
  const lista = $("#lista-estaciones");
  const aviso = $("#aviso-deslizar");
  $("#estaciones-mes").textContent = textoMes();
  lista.innerHTML = "";
  aviso.hidden = true;

  // Contar por estación: { "Quitumbe": { total: 3, descuadres: 1 }, ... }
  const resumen = {};
  turnos.forEach((turno) => {
    resumen[turno.estacion] ??= { total: 0, descuadres: 0 }; // ??= crea si no existe
    resumen[turno.estacion].total++;
    if (turno.resultado !== "cuadrada") resumen[turno.estacion].descuadres++;
  });

  // Primero (a la izquierda) la estación con más turnos
  const columnas = Object.entries(resumen).sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]));
  if (columnas.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "historial-vacio";
    vacio.textContent = "No hay turnos registrados en este mes.";
    lista.appendChild(vacio);
    return;
  }

  const maximo = columnas[0][1].total; // la más alta ocupa el 100 %
  columnas.forEach(([estacion, datos]) => {
    const cuadrados = datos.total - datos.descuadres;
    const li = document.createElement("li");
    li.className = "columna";
    li.innerHTML = `
      <div class="columna-area">
        <span class="columna-total">${datos.total}</span>
        <div class="columna-barra">
          <span class="parte-naranja"></span>
          <span class="parte-verde"></span>
        </div>
      </div>
      <span class="columna-nombre"></span>
      <span class="columna-descuadres">${datos.descuadres > 0 ? datos.descuadres : ""}</span>`;
    // El nombre lo escribió alguien: va con textContent
    li.querySelector(".columna-nombre").textContent = ESTACIONES[estacion] || estacion.slice(0, 2).toUpperCase();
    li.title = estacion;
    li.querySelector(".columna-barra").style.height = `calc((100% - 1.5rem) * ${datos.total / maximo})`;
    li.querySelector(".parte-verde").style.height = `${(cuadrados / datos.total) * 100}%`;
    li.querySelector(".parte-naranja").style.height = `${(datos.descuadres / datos.total) * 100}%`;
    li.setAttribute("aria-label", `${estacion}: ${datos.total} turnos, ${cuadrados} cuadrados, ${datos.descuadres} con descuadre`);
    lista.appendChild(li);
  });
  aviso.hidden = lista.scrollWidth <= lista.clientWidth;
}

async function mostrar() {
  // a) Pedir todos los datos
  const turnos = await turnosDelMes(mesVisible.anio, mesVisible.mes);
  const pendientes = ordenarOT((await misOT()).filter((ot) => ot.estado === "pendiente"));
  const descuentos = await calcularMes(mesVisible.anio, mesVisible.mes);

  // b) Pintar
  pintarSelectoresMes();
  pintarEficiencia(resumenMes(turnos));
  pintarOT(pendientes);
  pintarDescuentos(descuentos);
  mostrarPorEstacion(turnos);
}

registrarVista("inicio", "Control de Cuadres", mostrar);
