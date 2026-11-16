/* =========================================================
   RECORDATORIOS (calendario del celular)
   =========================================================
   Una página web sin servidor no puede mandar notificaciones a una hora
   fija con la app cerrada. Por eso usamos el CALENDARIO del celular:
   creamos un evento que se repite cada día y tiene alarma. El calendario
   avisa solo, aunque la app esté cerrada y no haya internet.
   ========================================================= */
import { descargarArchivo } from "../utilidades/descargar.js";

// 1. Los avisos que se pueden crear. Para cambiar una hora o un texto,
//    edita SOLO aquí. La clave ("turno", "registro") es la misma que el
//    data-recordatorio de cada botón en el HTML.
const tiposRecordatorio = {
  turno: {
    hora: 12,
    minuto: 0,
    titulo: "⏰ Recordatorio: turno de hoy",
    descripcion: "Revisa tu turno de hoy en Control de Cuadres.",
  },
  registro: {
    hora: 23,
    minuto: 50,
    titulo: "📝 Registra tu turno en Control de Cuadres",
    descripcion: "Antes de terminar el día, registra el cuadre de tu turno.",
  },
};

// 2. Fecha y hora en el formato del calendario: 20261023T120000
//    Sin "Z" al final = hora LOCAL del celular.
function fechaCalendario(fecha) {
  const dos = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}T${dos(fecha.getHours())}${dos(fecha.getMinutes())}00`;
}

// 3. Primer aviso: HOY si todavía no pasó la hora; si ya pasó, MAÑANA.
//    El evento dura 9 minutos (23:50 → 23:59, así no pasa al día siguiente).
function horarioAviso(aviso) {
  const inicio = new Date();
  inicio.setHours(aviso.hora, aviso.minuto, 0, 0);
  if (inicio <= new Date()) inicio.setDate(inicio.getDate() + 1);
  const fin = new Date(inicio.getTime() + 9 * 60 * 1000);
  return { inicio, fin };
}

// 4. Archivo .ics (formato estándar de calendario). dias = 7 o 30.
//    RRULE = repetir todos los días (DAILY), COUNT veces.
//    VALARM con TRIGGER:PT0M = la alarma suena a la hora exacta.
//    UID fijo por tipo: muchos calendarios reemplazan el anterior en vez
//    de duplicarlo.
function crearICS(tipo, dias) {
  const aviso = tiposRecordatorio[tipo];
  const { inicio, fin } = horarioAviso(aviso);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Control de Cuadres//Recordatorios//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:recordatorio-${tipo}@control-de-cuadres`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${fechaCalendario(inicio)}`,
    `DTEND:${fechaCalendario(fin)}`,
    `RRULE:FREQ=DAILY;COUNT=${dias}`,
    `SUMMARY:${aviso.titulo}`,
    `DESCRIPTION:${aviso.descripcion.replace(/,/g, "\\,")}`, // en .ics la coma se escribe "\,"
    "TRANSP:TRANSPARENT", // no marca la hora como "ocupado"
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${aviso.titulo}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

// 5. Enlace de Google Calendar con el evento ya lleno. La persona solo
//    toca "Guardar". ctz = zona horaria del celular (America/Guayaquil).
function enlaceGoogleCalendar(tipo, dias) {
  const aviso = tiposRecordatorio[tipo];
  const { inicio, fin } = horarioAviso(aviso);
  const datos = new URLSearchParams({
    action: "TEMPLATE",
    text: aviso.titulo,
    details: aviso.descripcion,
    dates: `${fechaCalendario(inicio)}/${fechaCalendario(fin)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recur: `RRULE:FREQ=DAILY;COUNT=${dias}`,
  });
  return `https://calendar.google.com/calendar/render?${datos}`;
}

// 6. Al tocar un botón: Google → abrir Google Calendar; Otro → descargar .ics
document.querySelectorAll("[data-recordatorio]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const tipo = boton.dataset.recordatorio;
    const dias = Number(document.querySelector('input[name="duracion-recordatorio"]:checked').value);
    const calendario = document.querySelector('input[name="calendario-recordatorio"]:checked').value;

    if (calendario === "google") {
      // "noopener": la página de Google no puede tocar esta app
      window.open(enlaceGoogleCalendar(tipo, dias), "_blank", "noopener");
      return;
    }
    descargarArchivo(new Blob([crearICS(tipo, dias)], { type: "text/calendar;charset=utf-8" }), `recordatorio-${tipo}.ics`);
  });
});
