/* =========================================================
   COPIA DE SEGURIDAD (guardar y restaurar)
   =========================================================
   Guarda TODO lo de este celular (personas, turnos, OT, descuentos y
   fotos) en un archivo .json y lo puede volver a cargar en otro celular.
   Regla de oro: restaurar SOLO AGREGA lo que falta. Nunca borra ni
   cambia un registro o una foto que ya exista.

   Versiones del archivo:
     1 → personas, turnos y fotos (app 1.4.x)
     2 → además OT y descuentos (app 1.5.0)
   Las copias de versión 1 se siguen pudiendo restaurar: sus turnos
   pasan por completarTurno() (la misma migración del arranque).
   ========================================================= */
import { datos } from "../datos/index.js";
import { leerFoto, guardarFoto, pedirGuardadoPermanente } from "../datos/fotos.js";
import { completarTurno } from "../datos/migraciones.js";
import { listaUsuarios, usuarioActivo, idActivo, agregarUsuarios } from "../servicios/usuarios.js";
import { ESTADOS_OT, TIPOS_OT } from "../servicios/ot.js";
import { VERSION_APP } from "../config.js";
import { descargarArchivo } from "../utilidades/descargar.js";
import { fechaDeHoy } from "../utilidades/fechas.js";
import { nuevoId, mismoId, esId } from "../utilidades/ids.js";
import { MAXIMO_COPIA_MB, esFotoTexto, FECHA_VALIDA, esTexto, esCentavos } from "../utilidades/seguridad.js";
import { mostrarUsuario, cerrarPerfil } from "./usuarios.js";

const FORMATO_COPIA = "control-de-cuadres-copia"; // para reconocer el archivo
const VERSION_COPIA = 2;
const inputCopia = document.querySelector("#input-copia");

/* ---------- 1. Fotos ↔ texto ----------
   Una foto (Blob) se convierte en "data:image/jpeg;base64,..." para que
   quepa dentro del archivo de texto, y al revés. */
function fotoATexto(foto) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(foto);
  });
}

async function textoAFoto(texto) {
  // Seguridad: solo imágenes "data:" (nunca una dirección de internet)
  if (!esFotoTexto(texto)) throw new Error("foto no válida");
  return (await fetch(texto)).blob(); // fetch entiende las direcciones "data:"
}

// "Luis Guillén" y "luis  guillen" cuentan como el mismo nombre
function nombreSimple(nombre) {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/* ---------- 2. Revisar cada registro de la copia ----------
   El archivo es texto que cualquiera podría modificar. Cada registro
   se REVISA y se arma de NUEVO solo con los campos que la app conoce,
   del tipo correcto. Lo que no cumple se deja fuera (null). */
const fechaHora = (valor) => (esTexto(valor, 40) && !Number.isNaN(Date.parse(valor)) ? valor : undefined);

// Campos comunes a turnos, OT y descuentos
function camposComunes(registro) {
  const limpio = {
    origen: registro.origen === "api" ? "api" : "manual",
    idExterno: esTexto(registro.idExterno, 100) ? registro.idExterno : null,
  };
  const creado = fechaHora(registro.creado);
  if (creado) {
    limpio.creado = creado;
    limpio.actualizado = fechaHora(registro.actualizado) || creado;
  }
  if (esId(registro.usuarioId)) limpio.usuarioId = registro.usuarioId;
  return limpio;
}

function limpiarPersona(persona) {
  if (!persona || !esId(persona.id)) return null;
  if (!esTexto(persona.nombre, 60) || persona.nombre.trim().length < 1) return null;
  return {
    id: persona.id,
    nombre: persona.nombre.trim().replace(/\s+/g, " "),
    creado: FECHA_VALIDA.test(persona.creado) ? persona.creado : fechaDeHoy(),
    foto: esFotoTexto(persona.foto) ? persona.foto : "",
  };
}

// Obligatorio: id, fecha, estación y resultado válidos
function limpiarTurno(turno) {
  if (!turno || !esId(turno.id)) return null;
  if (!esTexto(turno.fecha, 10) || !FECHA_VALIDA.test(turno.fecha)) return null;
  if (!esTexto(turno.estacion, 100) || !turno.estacion.trim()) return null;
  if (turno.resultado !== "cuadrada" && turno.resultado !== "no-cuadrada") return null;
  const limpio = {
    id: turno.id,
    fecha: turno.fecha,
    estacion: turno.estacion,
    turno: turno.turno === "fijo" ? "fijo" : "reserva",
    resultado: turno.resultado,
    observacion: esTexto(turno.observacion, 500) ? turno.observacion : "",
    ...camposComunes(turno),
  };
  if (turno.comprobante === true) limpio.comprobante = true;
  if (turno.resultado === "no-cuadrada") {
    if (turno.tipoDiferencia === "faltante" || turno.tipoDiferencia === "sobrante") limpio.tipoDiferencia = turno.tipoDiferencia;
    if (esCentavos(turno.montoCentavos)) limpio.montoCentavos = turno.montoCentavos;
    if (turno.montoRevisar === true) limpio.montoRevisar = true;
  }
  // Copias viejas (sin monto): se detecta el monto en la observación
  return completarTurno(limpio);
}

function limpiarOT(ot) {
  if (!ot || !esId(ot.id)) return null;
  if (!esTexto(ot.numero, 30) || !/^OT-[A-Z0-9]{3,20}$/.test(ot.numero)) return null;
  if (!esTexto(ot.fecha, 10) || !FECHA_VALIDA.test(ot.fecha)) return null;
  if (!ESTADOS_OT[ot.estado] || !esCentavos(ot.montoCentavos)) return null;
  const historial = Array.isArray(ot.historial)
    ? ot.historial
        .filter((h) => h && ESTADOS_OT[h.estado] && fechaHora(h.fecha))
        .slice(0, 100)
        .map((h) => ({
          estado: h.estado,
          fecha: h.fecha,
          coordinador: esTexto(h.coordinador, 60) ? h.coordinador : "",
          nota: esTexto(h.nota, 300) ? h.nota : "",
        }))
    : [];
  return {
    id: ot.id,
    numero: ot.numero,
    fecha: ot.fecha,
    turnoId: esId(ot.turnoId) ? ot.turnoId : null,
    estacion: esTexto(ot.estacion, 100) ? ot.estacion : "",
    tipo: TIPOS_OT[ot.tipo] ? ot.tipo : "otro",
    tipoDiferencia: ot.tipoDiferencia === "sobrante" ? "sobrante" : "faltante",
    montoCentavos: ot.montoCentavos,
    motivo: esTexto(ot.motivo, 300) ? ot.motivo : "",
    estado: ot.estado,
    coordinador: esTexto(ot.coordinador, 60) ? ot.coordinador : "",
    nota: esTexto(ot.nota, 300) ? ot.nota : "",
    fechaRespuesta: FECHA_VALIDA.test(ot.fechaRespuesta) ? ot.fechaRespuesta : null,
    historial,
    ...camposComunes(ot),
  };
}

function limpiarDescuento(d) {
  if (!d || !esId(d.id)) return null;
  if (!esTexto(d.periodo, 7) || !/^\d{4}-\d{2}$/.test(d.periodo)) return null;
  if (!esTexto(d.fecha, 10) || !FECHA_VALIDA.test(d.fecha)) return null;
  if (!esCentavos(d.montoCentavos) || !d.montoCentavos) return null;
  return {
    id: d.id,
    periodo: d.periodo,
    fecha: d.fecha,
    montoCentavos: d.montoCentavos,
    referencia: esTexto(d.referencia, 60) ? d.referencia : "",
    ...camposComunes(d),
  };
}

/* ---------- 3. "Guardar copia" ---------- */
document.querySelector("#guardar-copia").addEventListener("click", async () => {
  // Sin filtro: TODOS los registros de este celular (de todas las personas)
  const turnos = await datos.listar("turnos");
  const ot = await datos.listar("ot");
  const descuentos = await datos.listar("descuentos");

  // Fotos de los turnos con comprobante: { "id del turno": "data:..." }
  const fotos = {};
  for (const turno of turnos) {
    if (!turno.comprobante) continue;
    try {
      const foto = await leerFoto(turno.id);
      if (foto) fotos[turno.id] = await fotoATexto(foto);
    } catch {
      /* si una foto no se puede leer, la copia sigue sin ella */
    }
  }

  const copia = {
    formato: FORMATO_COPIA,
    version: VERSION_COPIA,
    versionApp: VERSION_APP,
    creada: new Date().toISOString(),
    usuarios: listaUsuarios(),
    turnos,
    ot,
    descuentos,
    fotos,
  };
  descargarArchivo(new Blob([JSON.stringify(copia)], { type: "application/json" }), `copia-cuadres-${fechaDeHoy()}.json`);
});

/* ---------- 4. "Restaurar copia" ---------- */
document.querySelector("#restaurar-copia").addEventListener("click", () => inputCopia.click());

// Registros de "lista" cuyo id NO está todavía en "existentes"
function soloNuevos(lista, existentes) {
  const ids = new Set(existentes.map((r) => String(r.id)));
  return lista.filter((r) => !ids.has(String(r.id)));
}

inputCopia.addEventListener("change", async () => {
  const archivo = inputCopia.files[0];
  inputCopia.value = ""; // para poder elegir el mismo archivo otra vez
  if (!archivo) return;

  // a) Seguridad: no abrir archivos gigantes (trabarían el celular)
  if (archivo.size > MAXIMO_COPIA_MB * 1024 * 1024) {
    alert(`Ese archivo pesa más de ${MAXIMO_COPIA_MB} MB: no parece una copia de Control de Cuadres.`);
    return;
  }

  // b) Leer y revisar que de verdad sea una copia de esta app
  let copia;
  try {
    copia = JSON.parse(await archivo.text());
  } catch {
    copia = null;
  }
  if (!copia || copia.formato !== FORMATO_COPIA || !Array.isArray(copia.turnos) || !Array.isArray(copia.usuarios)) {
    alert("Ese archivo no es una copia de seguridad de Control de Cuadres.");
    return;
  }

  // c) Revisar cada registro. Desde aquí solo se usan datos ya revisados.
  const enArchivo = (lista) => (Array.isArray(lista) ? lista : []);
  const totalEnArchivo = copia.usuarios.length + copia.turnos.length + enArchivo(copia.ot).length + enArchivo(copia.descuentos).length;
  const personas = copia.usuarios.map(limpiarPersona).filter(Boolean);
  const turnosCopia = copia.turnos.map(limpiarTurno).filter(Boolean);
  const otCopia = enArchivo(copia.ot).map(limpiarOT).filter(Boolean);
  const descuentosCopia = enArchivo(copia.descuentos).map(limpiarDescuento).filter(Boolean);
  const descartados = totalEnArchivo - personas.length - turnosCopia.length - otCopia.length - descuentosCopia.length;
  const fotos = copia.fotos && typeof copia.fotos === "object" ? copia.fotos : {};

  if (turnosCopia.length === 0 && otCopia.length === 0) {
    alert(
      "Esta copia no tiene turnos (está vacía).\n" +
        "Seguramente se guardó desde una app sin datos. Abre la app donde " +
        'tienes tus turnos, toca "Guardar copia" ahí y restaura ese archivo.',
    );
    return;
  }

  // d) PERSONAS. Si aquí ya hay alguien con el MISMO nombre (sin contar
  //    tildes ni mayúsculas), se usa esa persona (no se duplica).
  //    cambioDeId: id en la copia → id en este celular
  const cambioDeId = new Map();
  const personasNuevas = [];
  const activo = usuarioActivo();
  const lista = listaUsuarios();

  // Caso especial: la copia es de UNA persona y su nombre no es el de la
  // sesión abierta (ej. "Luis" y "Luis Guillén"). ¿Es la misma persona?
  const unica = personas.length === 1 ? personas[0] : null;
  if (
    unica && activo && nombreSimple(activo.nombre) !== nombreSimple(unica.nombre) &&
    confirm(`La copia es de "${unica.nombre}".\n¿Es la misma persona que "${activo.nombre}"? Si tocas Aceptar, sus turnos se ponen en tu perfil.`)
  ) {
    cambioDeId.set(String(unica.id), activo.id);
  }

  personas.forEach((persona) => {
    if (cambioDeId.has(String(persona.id))) return; // ya emparejada arriba
    const mismoNombre = lista
      .filter((u) => nombreSimple(u.nombre) === nombreSimple(persona.nombre))
      .sort((a, b) => mismoId(b.id, idActivo()) - mismoId(a.id, idActivo()))[0];
    if (mismoNombre) {
      cambioDeId.set(String(persona.id), mismoNombre.id);
      return;
    }
    // Si por casualidad el id ya lo usa otra persona, se le da uno nuevo
    const ocupado = lista.some((u) => mismoId(u.id, persona.id)) || personasNuevas.some((u) => mismoId(u.id, persona.id));
    const id = ocupado ? nuevoId() : persona.id;
    cambioDeId.set(String(persona.id), id);
    personasNuevas.push({ ...persona, id });
  });

  // Dueño en este celular. Sin dueño en la copia → la sesión abierta.
  const dueno = (registro) => cambioDeId.get(String(registro.usuarioId)) ?? idActivo();

  // e) Lo que falta (mismo id = mismo registro)
  const turnosAqui = await datos.listar("turnos");
  const turnosNuevos = soloNuevos(turnosCopia, turnosAqui).map((t) => ({ ...t, usuarioId: dueno(t) }));
  const otNuevas = soloNuevos(otCopia, await datos.listar("ot")).map((o) => ({ ...o, usuarioId: dueno(o) }));
  const descuentosNuevos = soloNuevos(descuentosCopia, await datos.listar("descuentos")).map((d) => ({ ...d, usuarioId: dueno(d) }));

  // f) Turnos de la copia que YA están aquí pero con OTRA persona (pasa
  //    si antes se restauró y se creó un perfil repetido). Se ofrece
  //    pasarlos a la persona correcta. No se borra nada.
  const duenoEnCopia = new Map(turnosCopia.map((t) => [String(t.id), t.usuarioId]));
  const correcto = (t) => cambioDeId.get(String(duenoEnCopia.get(String(t.id))));
  const turnosAMover = turnosAqui.filter((t) => duenoEnCopia.has(String(t.id)) && correcto(t) !== undefined && !mismoId(t.usuarioId, correcto(t)));
  let movidos = 0;
  if (turnosAMover.length && confirm(`${turnosAMover.length} turno(s) de esta copia están guardados con otro perfil.\n¿Pasarlos al perfil correcto para que se vean? No se borra nada.`)) {
    for (const t of turnosAMover) await datos.actualizar("turnos", t.id, { usuarioId: correcto(t) });
    movidos = turnosAMover.length;
  }

  const hayAlgo = turnosNuevos.length || otNuevas.length || descuentosNuevos.length || personasNuevas.length;
  if (!hayAlgo) {
    if (movidos) {
      cerrarPerfil();
      await mostrarUsuario();
      alert(`Listo: ${movidos} turno(s) ya se ven en tu perfil.`);
    } else {
      alert(`Los ${turnosCopia.length} turno(s) de esta copia ya están en este celular. No hay nada que agregar.`);
    }
    return;
  }

  // g) Preguntar antes de agregar
  const partes = [`${turnosNuevos.length} turno(s)`, `${otNuevas.length} OT`, `${descuentosNuevos.length} descuento(s)`, `${personasNuevas.length} persona(s)`];
  if (!confirm(
    `Se agregarán ${partes.join(", ")}.\n` +
      (descartados ? `${descartados} dato(s) del archivo están dañados y no se agregarán.\n` : "") +
      "No se borra ni se cambia nada de lo que ya tienes. ¿Continuar?",
  )) return;

  // h) Guardar
  try {
    if (personasNuevas.length && !agregarUsuarios(personasNuevas)) return;
    await datos.agregarVarios("turnos", turnosNuevos);
    await datos.agregarVarios("ot", otNuevas);
    await datos.agregarVarios("descuentos", descuentosNuevos);
  } catch (error) {
    alert(`No se pudo guardar la copia: ${error.message}`);
    return;
  }

  // i) Fotos de los turnos nuevos (si una falla, el turno queda sin foto)
  let fotosFallidas = 0;
  for (const turno of turnosNuevos) {
    if (!turno.comprobante) continue;
    try {
      if (!fotos[turno.id]) throw new Error("sin foto");
      await guardarFoto(turno.id, await textoAFoto(fotos[turno.id]));
    } catch {
      await datos.actualizar("turnos", turno.id, { comprobante: undefined });
      fotosFallidas++;
    }
  }
  if (turnosNuevos.some((t) => t.comprobante)) pedirGuardadoPermanente();

  // j) Actualizar la pantalla y avisar
  const revisar = turnosNuevos.filter((t) => t.montoRevisar).length;
  cerrarPerfil();
  await mostrarUsuario();
  alert(
    `Listo: se agregaron ${partes.join(", ")}.` +
      (fotosFallidas ? `\n${fotosFallidas} foto(s) no se pudieron recuperar.` : "") +
      (revisar ? `\n${revisar} descuadre(s) tenían el monto en la observación: revísalos en Turnos (etiqueta "Revisar monto").` : ""),
  );
});
