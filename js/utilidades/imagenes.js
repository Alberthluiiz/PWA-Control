/* =========================================================
   ACHICAR FOTOS (perfil y comprobantes)
   =========================================================
   Una foto del celular pesa varios MB. Se dibuja en un <canvas> más
   pequeño y se vuelve a guardar en JPEG: pesa poco y, de paso, queda
   una imagen "limpia" (sin nada raro escondido en el archivo).
   ========================================================= */

// Foto de perfil: cuadrado del centro, 160×160 px (unos 10 KB).
// Devuelve texto "data:image/jpeg;base64,..." para guardarlo en localStorage.
const TAMANO_FOTO = 160;

export function achicarFoto(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      // Recortar el cuadrado del centro (como la foto de WhatsApp)
      const lado = Math.min(imagen.width, imagen.height);
      const x = (imagen.width - lado) / 2;
      const y = (imagen.height - lado) / 2;

      const lienzo = document.createElement("canvas");
      lienzo.width = TAMANO_FOTO;
      lienzo.height = TAMANO_FOTO;
      lienzo.getContext("2d").drawImage(imagen, x, y, lado, lado, 0, 0, TAMANO_FOTO, TAMANO_FOTO);

      URL.revokeObjectURL(url);
      resolver(lienzo.toDataURL("image/jpeg", 0.8)); // JPEG al 80 %
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar();
    };
    imagen.src = url;
  });
}

// Comprobante: el lado más largo queda en 1280 px y JPEG al 70 %.
// Una foto de 4 MB queda en unos 150-300 KB y el texto se sigue leyendo.
// Devuelve un Blob (archivo) listo para IndexedDB.
const LADO_COMPROBANTE = 1280;

export function achicarComprobante(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(1, LADO_COMPROBANTE / Math.max(imagen.width, imagen.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.width * escala);
      lienzo.height = Math.round(imagen.height * escala);
      lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      lienzo.toBlob((foto) => (foto ? resolver(foto) : rechazar()), "image/jpeg", 0.7);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar();
    };
    imagen.src = url;
  });
}
