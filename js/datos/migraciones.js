/* =========================================================
   VERSIÓN DE LOS DATOS (migración)
   =========================================================
   Cada vez que cambia la FORMA en que se guardan los datos, sube
   VERSION_DATOS y se agrega un paso aquí. Así una actualización de la
   app convierte los datos viejos en vez de perderlos.
     1 → turnos sin dueño (versión original)
     2 → cada turno tiene "usuarioId" y hay lista de usuarios
     3 → turnos con monto del descuadre, "origen", "creado" y "actualizado"
         (y aparecen las colecciones "ot" y "descuentos")
   Se ejecuta UNA vez al abrir la app, antes que todo lo demás.
   ========================================================= */
import { CLAVES, leerJSON, guardarJSON } from "./almacen-local.js";
import { montoEnTexto } from "../utilidades/dinero.js";
import { fechaDeHoy } from "../utilidades/fechas.js";

const VERSION_DATOS = 3;

// Paso 2 → 3 para UN turno. También se usa al restaurar copias viejas.
//   - "creado": de un id viejo (Date.now) se saca la fecha en que se guardó
//   - si el turno es "no cuadrada" y la observación tiene un monto con
//     signo ("-0.45", "-20,20 Error..."), se pasa al campo nuevo y se marca
//     "montoRevisar" para que la persona lo confirme.
export function completarTurno(turno) {
  if (!turno.creado) {
    const fecha = Number.isSafeInteger(turno.id) ? new Date(turno.id) : new Date();
    turno.creado = fecha.toISOString();
    turno.actualizado = turno.creado;
  }
  if (!turno.origen) turno.origen = "manual";
  if (turno.idExterno === undefined) turno.idExterno = null;

  if (turno.resultado === "no-cuadrada" && turno.montoCentavos === undefined) {
    const detectado = montoEnTexto(turno.observacion);
    if (detectado) {
      turno.tipoDiferencia = detectado.tipo;
      turno.montoCentavos = detectado.centavos;
      turno.montoRevisar = true;
    }
  }
  return turno;
}

export function migrarDatos() {
  const version = Number(localStorage.getItem(CLAVES.version)) || 1;
  if (version >= VERSION_DATOS) return;

  const turnos = leerJSON(CLAVES.turnos, []);
  const usuarios = leerJSON(CLAVES.usuarios, { activo: null, lista: [] });

  if (version < 2) {
    // Perfil de la vista previa anterior (una sola persona): pasarlo a la lista
    const perfilViejo = leerJSON("cuadres-perfil", null);
    if (perfilViejo && perfilViejo.nombre && usuarios.lista.length === 0) {
      const id = Date.now();
      usuarios.lista.push({ id, nombre: perfilViejo.nombre, creado: perfilViejo.creado || fechaDeHoy(), foto: "" });
      usuarios.activo = id;
      // Sus turnos sin dueño pasan a ser suyos
      turnos.forEach((turno) => {
        if (!turno.usuarioId) turno.usuarioId = id;
      });
      guardarJSON(CLAVES.usuarios, usuarios);
    }
    localStorage.removeItem("cuadres-perfil");
    // Los que sigan sin dueño se asignan a la primera persona que se
    // registre (servicios/usuarios.js → crearUsuario)
  }

  if (version < 3) {
    turnos.forEach(completarTurno);
  }

  guardarJSON(CLAVES.turnos, turnos);
  localStorage.setItem(CLAVES.version, VERSION_DATOS);
}
