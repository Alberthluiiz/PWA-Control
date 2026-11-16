/* =========================================================
   DESCARGAR UN ARCHIVO
   =========================================================
   El navegador no tiene un "guardar archivo" directo. El truco:
   1. URL.createObjectURL crea una dirección temporal para el Blob
   2. un enlace <a download> invisible apunta a esa dirección
   3. se le hace clic con JavaScript y se borra
   Se usa para el Excel, la copia de seguridad y los recordatorios.
   ========================================================= */
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Liberar la memoria un segundo después (ya empezó la descarga)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
