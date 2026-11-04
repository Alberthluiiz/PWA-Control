// Mensaje de prueba: confirma en la consola que app.js está conectado
console.log("Proyecto cuadre de cajas Auxiliares de ventas");

/* ===== FECHA ACTUAL (se usa en varias partes) ===== */
// Fecha y hora del dispositivo AL ABRIR la página.
// Se usa para saber en qué mes arranca el selector.
const fechaActual = new Date();

// Fecha de HOY como texto AAAA-MM-DD, calculada en el momento.
//   Es una función (no una constante) para que, si la app queda abierta
//   y pasa la medianoche, siempre devuelva el día correcto.
//   "en-CA" (inglés de Canadá) escribe la fecha justo en ese formato,
//   que es el único que acepta un <input type="date">.
//   OJO: NO usar valueAsDate ni toISOString(): usan hora UTC y
//   después de las 19:00 en Ecuador mostrarían el día siguiente.
function fechaDeHoy() {
  return new Date().toLocaleDateString("en-CA");
}

/* ===== DATOS GUARDADOS (localStorage) ===== */
// localStorage es una "cajita" del navegador que guarda TEXTO con un nombre (clave).
// Los datos siguen ahí aunque cierres la página o apagues el celular.
// Solo se borran si limpias los datos del navegador.
const CLAVE_STORAGE = "cuadres-turnos";

// Leer los turnos guardados.
// localStorage solo guarda texto, por eso:
//   - al GUARDAR convertimos el arreglo a texto con JSON.stringify
//   - al LEER convertimos el texto a arreglo con JSON.parse
// Si no hay nada guardado (primera vez) o el texto está dañado, empezamos con [].
function cargarTurnos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
  } catch {
    return [];
  }
}

// Guardar el arreglo completo de turnos
function guardarTurnos() {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(turnos));
}

// Arreglo con TODOS los turnos. "let" porque al eliminar lo reemplazamos.
let turnos = cargarTurnos();

/* ===== USUARIOS (varias personas en el mismo celular) ===== */
// No es un login con contraseña: es para saber QUIÉN está registrando.
// Cada persona tiene su nombre (o nickname), una foto opcional y SUS turnos.
// Todo se guarda en una clave aparte de los turnos:
//   {
//     activo: 1729612345678,      ← id de quien tiene la sesión abierta (o null)
//     lista: [
//       { id: 1729612345678, nombre: "Luis Guillén",
//         creado: "2026-10-22", foto: "data:image/jpeg;base64,..." o "" }
//     ]
//   }
const CLAVE_USUARIOS = "cuadres-usuarios";

function cargarUsuarios() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_USUARIOS));
    if (datos && Array.isArray(datos.lista)) return datos;
  } catch {
    // Texto dañado: empezamos de cero (los turnos NO se tocan)
  }
  return { activo: null, lista: [] };
}

// Devuelve true si se guardó. Puede fallar si la memoria del navegador
// está llena (por ejemplo, con muchas fotos).
function guardarUsuarios() {
  try {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios));
    return true;
  } catch {
    alert("No hay espacio para guardar. Prueba con una foto más pequeña.");
    return false;
  }
}

let usuarios = cargarUsuarios();

// Usuario con la sesión abierta (o undefined si nadie la tiene)
function usuarioActivo() {
  return usuarios.lista.find((u) => u.id === usuarios.activo);
}

// Turnos SOLO de la persona con la sesión abierta.
// La eficiencia, el historial y el Excel usan esta función, no "turnos".
function misTurnos() {
  return turnos.filter((turno) => turno.usuarioId === usuarios.activo);
}

/* ===== VERSIÓN DE LOS DATOS (migración) ===== */
// Cada vez que cambia la FORMA en que se guardan los datos, sube este número
// y se agrega un paso en migrarDatos(). Así una actualización de la app
// convierte los datos viejos en vez de perderlos.
//   1 → turnos sin dueño (versión original)
//   2 → cada turno tiene "usuarioId" y hay lista de usuarios
const CLAVE_VERSION = "cuadres-version-datos";
const VERSION_DATOS = 2;

function migrarDatos() {
  const version = Number(localStorage.getItem(CLAVE_VERSION)) || 1;

  if (version < 2) {
    // Perfil de la vista previa anterior (una sola persona): pasarlo a la lista
    try {
      const perfilViejo = JSON.parse(localStorage.getItem("cuadres-perfil"));
      if (perfilViejo && perfilViejo.nombre && usuarios.lista.length === 0) {
        const id = Date.now();
        usuarios.lista.push({
          id,
          nombre: perfilViejo.nombre,
          creado: perfilViejo.creado || fechaDeHoy(),
          foto: "",
        });
        usuarios.activo = id;
        // Sus turnos sin dueño pasan a ser suyos
        turnos.forEach((turno) => {
          if (!turno.usuarioId) turno.usuarioId = id;
        });
        guardarUsuarios();
        guardarTurnos();
      }
      localStorage.removeItem("cuadres-perfil");
    } catch {
      // Si el perfil viejo está dañado, se ignora
    }
    // Los turnos que sigan sin dueño se asignan a la primera persona
    // que se registre (función asignarTurnosSinDueño).
  }

  localStorage.setItem(CLAVE_VERSION, VERSION_DATOS);
}

// Turnos guardados ANTES de que existieran los usuarios: pasan a ser
// de la primera persona que se registra en este celular.
function asignarTurnosSinDueño(id) {
  let cambiados = 0;
  turnos.forEach((turno) => {
    if (!turno.usuarioId) {
      turno.usuarioId = id;
      cambiados++;
    }
  });
  if (cambiados > 0) guardarTurnos();
}

migrarDatos();

/* ===== AVATAR (iniciales o foto) ===== */
// "Luis Alberto Guillén" → "LA" · "luchito" → "L"
//   Como WhatsApp/Google: primera letra de las 2 primeras palabras.
//   Array.from separa bien letras con tilde y emojis (un emoji es "1 letra").
function iniciales(nombre) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => Array.from(palabra)[0])
    .join("")
    .toUpperCase();
}

// Color del avatar según el nombre: el mismo nombre siempre da el mismo color.
//   Se suma el código de cada letra y se usa el resto (%) para elegir
//   uno de los colores de la lista.
const coloresAvatar = [
  "#2563eb", // azul
  "#7c3aed", // morado
  "#db2777", // rosado
  "#ea580c", // naranja
  "#0d9488", // verde azulado
  "#16a34a", // verde
  "#ca8a04", // mostaza
  "#0891b2", // celeste
];

function colorDelNombre(nombre) {
  let suma = 0;
  for (const letra of nombre.toLowerCase()) suma += letra.codePointAt(0);
  return coloresAvatar[suma % coloresAvatar.length];
}

// Pintar un avatar (<span class="avatar">): la foto si hay,
// si no, las iniciales sobre el color del nombre.
function pintarAvatar(elemento, nombre, foto) {
  const limpio = nombre.trim();
  // Solo fotos "data:image/..." (las que hace la app): ver esFotoTexto()
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

/* ===== SEGURIDAD: REVISAR ARCHIVOS ANTES DE USARLOS ===== */
// Antes de abrir una foto o una copia se revisa el TIPO y el TAMAÑO.
// Así un archivo equivocado (un PDF, un video) o gigante no traba el celular.
const MAXIMO_FOTO_MB = 30; // las fotos de celular pesan entre 2 y 12 MB
const MAXIMO_COPIA_MB = 100; // una copia con muchas fotos pesa unos 20-50 MB

// Devuelve true si el archivo es una imagen de tamaño razonable.
// Si no, avisa a la persona y devuelve false.
function esImagenValida(archivo) {
  // archivo.type lo pone el celular: "image/jpeg", "image/png", "image/heic"...
  // (algunos celulares lo dejan vacío; en ese caso se deja intentar
  // y, si no es imagen, achicarFoto() avisa que no se pudo abrir)
  if (archivo.type && !archivo.type.startsWith("image/")) {
    alert("Ese archivo no es una imagen. Elige una foto.");
    return false;
  }
  if (archivo.size > MAXIMO_FOTO_MB * 1024 * 1024) {
    alert(`La foto pesa más de ${MAXIMO_FOTO_MB} MB. Elige una más liviana.`);
    return false;
  }
  return true;
}

// Una foto guardada como texto SOLO se acepta si es una imagen "data:"
// (la que crea la propia app). Así una copia modificada no puede meter
// una dirección de internet ni otro tipo de contenido.
function esFotoTexto(texto) {
  return (
    typeof texto === "string" &&
    /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(texto)
  );
}

/* ===== FOTO DE PERFIL ===== */
// Una foto del celular pesa varios MB y localStorage solo tiene ~5 MB.
// Por eso se recorta en cuadrado y se achica a 160×160 px (unos 10 KB).
const TAMANO_FOTO = 160;

function achicarFoto(archivo) {
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
      lienzo
        .getContext("2d")
        .drawImage(imagen, x, y, lado, lado, 0, 0, TAMANO_FOTO, TAMANO_FOTO);

      URL.revokeObjectURL(url);
      // JPEG al 80 %: buena calidad y poco peso. Se guarda como texto (data URL)
      resolver(lienzo.toDataURL("image/jpeg", 0.8));
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar();
    };
    imagen.src = url;
  });
}

/* ===== PANTALLAS DE USUARIO ===== */
// 1. Buscar en el HTML todo lo de los usuarios
const botonPerfil = document.querySelector("#boton-perfil");
const avatarEncabezado = document.querySelector("#avatar-encabezado");
const nombreEncabezado = document.querySelector("#nombre-encabezado");

const dialogoEntrar = document.querySelector("#dialogo-entrar");
const listaUsuarios = document.querySelector("#lista-usuarios");

const dialogoRegistro = document.querySelector("#dialogo-registro");
const formRegistro = document.querySelector("#form-registro");
const inputNombre = document.querySelector("#input-nombre");
const inputFoto = document.querySelector("#input-foto");
const avatarPrevia = document.querySelector("#avatar-previa");
const botonElegirFoto = document.querySelector("#elegir-foto");
const inputCamaraFoto = document.querySelector("#camara-input-foto");
const botonQuitarFoto = document.querySelector("#quitar-foto");
const registroTitulo = document.querySelector("#registro-titulo");
const registroTexto = document.querySelector("#registro-texto");
const botonRegistro = document.querySelector("#boton-registro");
const botonCancelarRegistro = document.querySelector("#cancelar-registro");

const dialogoPerfil = document.querySelector("#dialogo-perfil");
const avatarPerfil = document.querySelector("#avatar-perfil");
const perfilTitulo = document.querySelector("#perfil-titulo");
const perfilDesde = document.querySelector("#perfil-desde");

// Usuario que se está editando (null = se está creando uno nuevo)
// y foto elegida en la ventana de registro (todavía sin guardar)
let usuarioEditando = null;
let fotoElegida = "";

// 2. Mostrar en el encabezado a la persona con la sesión abierta
//    y dibujar SUS datos (eficiencia e historial)
function mostrarUsuario() {
  const usuario = usuarioActivo();
  if (usuario) {
    pintarAvatar(avatarEncabezado, usuario.nombre, usuario.foto);
    // Solo el primer nombre, para que quepa en el celular
    // (el nombre completo se ve al tocar el avatar)
    nombreEncabezado.textContent = usuario.nombre.split(" ")[0];
    botonPerfil.setAttribute("aria-label", `Perfil de ${usuario.nombre}`);
  } else {
    pintarAvatar(avatarEncabezado, "", "");
    nombreEncabezado.textContent = "";
    botonPerfil.setAttribute("aria-label", "Perfil");
  }
  // Si se estaba editando un turno y cambia la persona, se cancela la edición
  // (así nadie guarda cambios en el turno de otra persona)
  if (turnoEditando) limpiarFormulario();
  mostrarMes();
  activarFiltro("todos");
}

// 3. Carátula de inicio: un botón por persona + "Agregar persona".
//    Si todavía no hay nadie, solo se ve el botón "Crear mi perfil".
const botonAgregarUsuario = document.querySelector("#agregar-usuario");

function abrirEntrar() {
  botonAgregarUsuario.textContent =
    usuarios.lista.length === 0 ? "Crear mi perfil" : "+ Agregar persona";

  listaUsuarios.innerHTML = "";
  usuarios.lista.forEach((usuario) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "usuario-opcion";
    boton.dataset.id = usuario.id;

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    pintarAvatar(avatar, usuario.nombre, usuario.foto);

    // El nombre va con textContent: lo escribió el usuario
    const nombre = document.createElement("span");
    nombre.textContent = usuario.nombre;

    boton.append(avatar, nombre);
    listaUsuarios.appendChild(boton);
  });

  dialogoEntrar.showModal();
}

// 4. Tocar una persona de la lista: abrir su sesión
listaUsuarios.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".usuario-opcion");
  if (!boton) return;
  usuarios.activo = Number(boton.dataset.id);
  guardarUsuarios();
  dialogoEntrar.close();
  mostrarUsuario();
});

// La carátula se queda abierta DETRÁS de la ventana de registro:
// si se cancela, se vuelve a ella.
botonAgregarUsuario.addEventListener("click", () => abrirRegistro(null));

// 5. Ventana de registro / editar perfil
//    usuario = null → persona nueva · usuario = {...} → editar su nombre y foto
function abrirRegistro(usuario) {
  usuarioEditando = usuario;
  fotoElegida = usuario ? usuario.foto : "";
  inputNombre.value = usuario ? usuario.nombre : "";
  inputFoto.value = "";
  actualizarPrevia();

  registroTitulo.textContent = usuario
    ? "Editar perfil"
    : usuarios.lista.length === 0
      ? "Bienvenido"
      : "Nueva persona";
  registroTexto.textContent = usuario
    ? "Tus turnos guardados no cambian."
    : "Escribe tu nombre o un nickname. La foto es opcional.";
  botonRegistro.textContent = usuario ? "Guardar" : "Empezar";
  dialogoRegistro.showModal();
}

// Avatar de vista previa + botones de foto según haya foto o no
function actualizarPrevia() {
  pintarAvatar(avatarPrevia, inputNombre.value, fotoElegida);
  botonQuitarFoto.hidden = !fotoElegida;
}

inputNombre.addEventListener("input", actualizarPrevia);

// 6. Foto: "Tomar foto" abre la cámara y "Galería" las fotos guardadas.
//    Tocar el avatar abre la galería. Los dos campos usan la misma función.
document
  .querySelector("#tomar-foto")
  .addEventListener("click", () => inputCamaraFoto.click());
botonElegirFoto.addEventListener("click", () => inputFoto.click());
avatarPrevia.addEventListener("click", () => inputFoto.click());

async function usarFotoPerfil(evento) {
  const input = evento.target;
  const archivo = input.files[0];
  input.value = ""; // para poder elegir la misma foto otra vez
  if (!archivo || !esImagenValida(archivo)) return;
  try {
    fotoElegida = await achicarFoto(archivo);
  } catch {
    alert("No se pudo abrir esa imagen. Prueba con otra.");
  }
  actualizarPrevia();
}
inputFoto.addEventListener("change", usarFotoPerfil);
inputCamaraFoto.addEventListener("change", usarFotoPerfil);

botonQuitarFoto.addEventListener("click", () => {
  fotoElegida = "";
  inputFoto.value = "";
  actualizarPrevia();
});

// 7. Guardar la persona (nueva o editada)
formRegistro.addEventListener("submit", (evento) => {
  evento.preventDefault();

  // Quitar espacios de sobra: "  Luis   Guillén " → "Luis Guillén"
  const nombre = inputNombre.value.trim().replace(/\s+/g, " ");
  if (nombre.length < 2) {
    inputNombre.setCustomValidity("Escribe al menos 2 letras.");
    inputNombre.reportValidity();
    inputNombre.setCustomValidity("");
    return;
  }

  // No repetir nombres: si no, en la lista no se sabría quién es quién
  const repetido = usuarios.lista.some(
    (u) =>
      u !== usuarioEditando && u.nombre.toLowerCase() === nombre.toLowerCase(),
  );
  if (repetido) {
    inputNombre.setCustomValidity("Ya hay una persona con ese nombre.");
    inputNombre.reportValidity();
    inputNombre.setCustomValidity("");
    return;
  }

  if (usuarioEditando) {
    usuarioEditando.nombre = nombre;
    usuarioEditando.foto = fotoElegida;
  } else {
    const nuevo = { id: Date.now(), nombre, creado: fechaDeHoy(), foto: fotoElegida };
    usuarios.lista.push(nuevo);
    usuarios.activo = nuevo.id;
    // La primera persona se queda con los turnos de antes de esta versión
    if (usuarios.lista.length === 1) asignarTurnosSinDueño(nuevo.id);
  }

  if (!guardarUsuarios()) return;
  dialogoRegistro.close();
  if (dialogoEntrar.open) dialogoEntrar.close();
  mostrarUsuario();
});

// 8. Cancelar: solo cerrar la ventana (si se estaba creando una persona,
//    la carátula sigue abierta detrás)
botonCancelarRegistro.addEventListener("click", () => dialogoRegistro.close());

// La tecla Esc (o "atrás" en algunos celulares) NO cierra la carátula:
// la app no se puede usar sin saber quién registra
dialogoEntrar.addEventListener("cancel", (evento) => evento.preventDefault());

// 9. Tocar el avatar del encabezado abre el menú de perfil
botonPerfil.addEventListener("click", () => {
  const usuario = usuarioActivo();
  if (!usuario) {
    abrirEntrar();
    return;
  }
  pintarAvatar(avatarPerfil, usuario.nombre, usuario.foto);
  perfilTitulo.textContent = usuario.nombre;
  perfilDesde.textContent = `Registrado desde el ${formatearFecha(usuario.creado)}`;
  dialogoPerfil.showModal();
});

document.querySelector("#editar-perfil").addEventListener("click", () => {
  dialogoPerfil.close();
  abrirRegistro(usuarioActivo());
});

// 10. Cerrar sesión: los turnos quedan guardados; solo se deja de mostrar
//     a esta persona y se vuelve a la pantalla "¿Quién va a registrar?"
document.querySelector("#cerrar-sesion").addEventListener("click", () => {
  usuarios.activo = null;
  guardarUsuarios();
  dialogoPerfil.close();
  mostrarUsuario();
  abrirEntrar();
});

// "Eliminar perfil": borra el perfil con la sesión abierta.
// Si tiene turnos, primero se ofrece pasarlos a otro perfil, así no se
// pierde nada. Solo si es el ÚNICO perfil se pueden borrar sus turnos,
// y se pide confirmar dos veces.
document.querySelector("#eliminar-perfil").addEventListener("click", async () => {
  const perfil = usuarioActivo();
  if (!perfil) return;
  const susTurnos = misTurnos();
  const otros = usuarios.lista.filter((u) => u.id !== perfil.id);
  let destino = null; // perfil que recibe los turnos (si hay)

  if (susTurnos.length && otros.length === 1) {
    // a) Hay un solo perfil más: los turnos pasan a ese
    if (
      !confirm(
        `¿Eliminar el perfil "${perfil.nombre}"?\n` +
          `Sus ${susTurnos.length} turno(s) pasarán a "${otros[0].nombre}".`,
      )
    )
      return;
    destino = otros[0];
  } else if (susTurnos.length && otros.length > 1) {
    // b) Hay varios: se elige con un número
    const lista = otros.map((u, i) => `${i + 1}. ${u.nombre}`).join("\n");
    const respuesta = prompt(
      `¿Eliminar el perfil "${perfil.nombre}"?\n` +
        `Escribe el número del perfil que recibirá sus ${susTurnos.length} turno(s):\n${lista}`,
    );
    if (respuesta === null) return;
    destino = otros[Number(respuesta) - 1];
    if (!destino) {
      alert("Ese número no está en la lista. No se eliminó nada.");
      return;
    }
  } else if (susTurnos.length) {
    // c) Es el único perfil: sus turnos se borrarían. Doble confirmación.
    if (
      !confirm(
        `"${perfil.nombre}" es el único perfil y tiene ${susTurnos.length} turno(s).\n` +
          "Si lo eliminas, esos turnos SE BORRAN. Te conviene tocar " +
          "\"Guardar copia\" antes. ¿Eliminar de todas formas?",
      ) ||
      !confirm("Último aviso: se borran el perfil y sus turnos. ¿Seguro?")
    )
      return;
  } else if (!confirm(`¿Eliminar el perfil "${perfil.nombre}"? No tiene turnos.`)) {
    // d) Sin turnos: una sola confirmación
    return;
  }

  // Pasar los turnos al otro perfil, o borrarlos (solo en el caso c)
  if (destino) {
    susTurnos.forEach((t) => (t.usuarioId = destino.id));
  } else if (susTurnos.length) {
    for (const t of susTurnos) {
      if (t.comprobante) await borrarFoto(t.id).catch(() => {});
    }
    turnos = turnos.filter((t) => t.usuarioId !== perfil.id);
  }
  guardarTurnos();

  // Quitar el perfil. Si los turnos pasaron a otro, se entra con ese.
  usuarios.lista = usuarios.lista.filter((u) => u.id !== perfil.id);
  usuarios.activo = destino ? destino.id : null;
  guardarUsuarios();
  dialogoPerfil.close();
  mostrarUsuario();
  if (!usuarios.activo) abrirEntrar();
});

document
  .querySelector("#cerrar-perfil")
  .addEventListener("click", () => dialogoPerfil.close());

/* ===== ESTACIONES ===== */
// Lista única de estaciones: aquí se agrega, cambia o quita una estación
const estaciones = [
  "Quitumbe",
  "Morán Valverde",
  "Solanda",
  "Cardenal de la Torre",
  "Recreo",
  "Magdalena",
  "San Francisco",
  "Alameda",
  "Ejido",
  "Universidad Central",
  "Pradera",
  "Carolina",
  "Iñaquito",
  "Jipijapa",
  "Labrador",
];

// Siglas de cada estación para el gráfico "Por estación" (ahí no entra el
// nombre completo). Si se agrega una estación arriba, agregar su sigla aquí;
// si falta, el gráfico muestra las 2 primeras letras del nombre.
const siglasEstaciones = {
  Quitumbe: "QU",
  "Morán Valverde": "MV",
  Solanda: "SO",
  "Cardenal de la Torre": "CA",
  Recreo: "RE",
  Magdalena: "MA",
  "San Francisco": "SF",
  Alameda: "AL",
  Ejido: "EJ",
  "Universidad Central": "UC",
  Pradera: "PR",
  Carolina: "LC",
  Iñaquito: "IN",
  Jipijapa: "JI",
  Labrador: "LA",
};

/* ===== LLENAR EL SELECT CON LAS ESTACIONES ===== */
// 1. Buscar en el HTML el <select class="estaciones"> (el contenedor)
const selectEstaciones = document.querySelector(".estaciones");

// 2. Opción vacía al inicio: obliga al usuario a elegir una estación.
//    value = "" → el atributo "required" del <select> la toma como "sin elegir"
//    disabled  → no se puede volver a seleccionar después
//    selected  → es la que aparece al cargar la página
const opcionVacia = document.createElement("option");
opcionVacia.value = "";
opcionVacia.textContent = "Elegir…"; // corto, para que no se corte en celular
opcionVacia.disabled = true;
opcionVacia.selected = true;
selectEstaciones.appendChild(opcionVacia);

// 3. Recorrer el arreglo: por cada estación se ejecuta este bloque
estaciones.forEach((estacion) => {
  const option = document.createElement("option"); // crear <option> (aún invisible)
  option.value = estacion; // valor que se enviará/guardará
  option.textContent = estacion; // texto que ve el usuario
  selectEstaciones.appendChild(option); // meterla dentro del <select>
});

/* ===== FECHA POR DEFECTO ===== */
// 1. Buscar en el HTML el <input class="fecha"> y el texto que va encima
const inputFecha = document.querySelector(".fecha");
const textoFecha = document.querySelector(".fecha-texto");

// 2. Escribir la fecha elegida como dd/mm/aaaa encima del input.
//    El celular muestra el formato de SU idioma (en inglés: mes/día/año);
//    con esto siempre se ve día/mes/año, sin importar el idioma del celular.
//    formatearFecha está más abajo, pero las funciones "function" se pueden
//    usar antes de la línea donde se escriben.
function mostrarFechaElegida() {
  textoFecha.textContent = inputFecha.value
    ? formatearFecha(inputFecha.value)
    : "dd/mm/aaaa";
}

// 3. Poner la fecha de hoy, no permitir fechas futuras y mostrarla
inputFecha.value = fechaDeHoy();
inputFecha.max = fechaDeHoy();
mostrarFechaElegida();

// 4. Al elegir otra fecha en el calendario, actualizar el texto
inputFecha.addEventListener("change", mostrarFechaElegida);
inputFecha.addEventListener("input", mostrarFechaElegida);

// 5. Al tocar el campo, recalcular el máximo.
//    Si la app quedó abierta y pasó la medianoche, así se puede elegir el día nuevo.
inputFecha.addEventListener("focus", () => {
  inputFecha.max = fechaDeHoy();
});

/* ===== EFICIENCIA DEL MES (anillo + contadores) ===== */
// 1. Buscar en el HTML todo lo que vamos a cambiar
const textoPorcentaje = document.querySelector("#porcentaje");
const textoMensaje = document.querySelector("#mensaje");
const textoTotalTurnos = document.querySelector("#total-turnos");
const textoTotalCuadrados = document.querySelector("#total-cuadrados");
const textoTotalDescuadres = document.querySelector("#total-descuadres");
const anilloProgreso = document.querySelector(".anillo-progreso");

// 2. Largo total del círculo (2·π·42 ≈ 264), el mismo número que está en el CSS
const CIRCUNFERENCIA = 264;

// 3. Calcular y mostrar la eficiencia del mes que se está viendo
function actualizarEficiencia() {
  // a) Quedarnos solo con los turnos del mes y año visibles.
  //    turno.fecha es "2026-10-08" → split("-") → ["2026", "10", "08"]
  //    map(Number) los convierte a números → [2026, 10, 8]
  const turnosDelMes = misTurnos().filter((turno) => {
    const [anio, mes] = turno.fecha.split("-").map(Number);
    // getMonth() cuenta desde 0, pero en la fecha octubre es 10 → por eso "mes - 1"
    return anio === anioVisible && mes - 1 === mesVisible;
  });

  // b) Contar
  const total = turnosDelMes.length;
  const cuadrados = turnosDelMes.filter(
    (turno) => turno.resultado === "cuadrada",
  ).length;
  const descuadres = total - cuadrados;

  // c) Porcentaje (si no hay turnos, 0% para no dividir entre 0).
  //    Se redondea al mostrarlo (formatoPorcentaje)
  const porcentaje = total === 0 ? 0 : (cuadrados / total) * 100;

  // d) Escribir los números en pantalla
  textoPorcentaje.textContent = formatoPorcentaje(porcentaje);
  textoTotalTurnos.textContent = total;
  textoTotalCuadrados.textContent = cuadrados;
  textoTotalDescuadres.textContent = descuadres;

  // e) Rellenar el anillo: lo que se OCULTA es la parte que falta para el 100%
  anilloProgreso.style.strokeDashoffset =
    CIRCUNFERENCIA * (1 - porcentaje / 100);
  // Con 0% el borde redondeado dejaría un puntito: lo escondemos
  anilloProgreso.style.opacity = porcentaje === 0 ? 0 : 1;

  // f) Mensaje según el resultado
  if (total === 0) {
    textoMensaje.textContent = "Sin registros";
  } else if (porcentaje >= 90) {
    textoMensaje.textContent = "Excelente";
  } else if (porcentaje >= 70) {
    textoMensaje.textContent = "Buen ritmo";
  } else {
    textoMensaje.textContent = "Hay que mejorar";
  }

  // g) Dibujar el gráfico por estación con los mismos turnos del mes
  mostrarPorEstacion(turnosDelMes);
}

// Porcentaje SIN decimales, redondeado al entero más cercano:
// 12 de 13 = 92,31… → 92%   ·   6 de 7 = 85,71… → 86%
function formatoPorcentaje(numero) {
  return `${Math.round(numero)}%`;
}

/* ===== CUADRES Y DESCUADRES POR ESTACIÓN ===== */
// Gráfico de barras VERTICALES (columnas) hecho solo con HTML y CSS (sin
// librerías, así funciona sin internet). Se llama desde actualizarEficiencia(),
// por eso se actualiza solo al guardar, eliminar o cambiar de mes.
// Cada columna es una estación: verde abajo (cuadrados) y naranja arriba
// (descuadres). La altura depende de cuántos turnos tiene.
const listaEstaciones = document.querySelector("#lista-estaciones");
const textoEstacionesMes = document.querySelector("#estaciones-mes");
const avisoDeslizar = document.querySelector("#aviso-deslizar");

function mostrarPorEstacion(turnosDelMes) {
  // a) Mes que se está mostrando, ej: "Oct 2026"
  textoEstacionesMes.textContent = `${nombresMeses[mesVisible]} ${anioVisible}`;
  listaEstaciones.innerHTML = "";
  avisoDeslizar.hidden = true;

  // b) Contar por estación. "resumen" queda así:
  //    { "Quitumbe": { total: 3, descuadres: 1 }, "Recreo": {...} }
  const resumen = {};
  turnosDelMes.forEach((turno) => {
    if (!resumen[turno.estacion]) {
      resumen[turno.estacion] = { total: 0, descuadres: 0 };
    }
    resumen[turno.estacion].total++;
    if (turno.resultado !== "cuadrada") resumen[turno.estacion].descuadres++;
  });

  // c) Pasar a una lista y ordenar: primero (a la izquierda) la estación
  //    con más turnos. Object.entries convierte { a: 1 } en [["a", 1]]
  const columnas = Object.entries(resumen).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
  );

  // d) Sin turnos en el mes: mensaje y salir
  if (columnas.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "historial-vacio";
    vacio.textContent = "No hay turnos registrados en este mes.";
    listaEstaciones.appendChild(vacio);
    return;
  }

  // e) La estación con más turnos ocupa toda la altura (100 %);
  //    las demás, proporcional. Ej: máximo 4 → una con 2 turnos = 50 %
  const maximo = columnas[0][1].total;

  columnas.forEach(([estacion, datos]) => {
    const cuadrados = datos.total - datos.descuadres;

    const li = document.createElement("li");
    li.className = "columna";
    // Estructura fija con innerHTML; el nombre va con textContent más abajo.
    // De arriba hacia abajo: número total (pegado a la barra), columna,
    // nombre y descuadres.
    li.innerHTML = `
      <div class="columna-area">
        <span class="columna-total">${datos.total}</span>
        <div class="columna-barra">
          <span class="parte-naranja"></span>
          <span class="parte-verde"></span>
        </div>
      </div>
      <span class="columna-nombre"></span>
      <span class="columna-descuadres">${datos.descuadres > 0 ? `${datos.descuadres}` : ""}</span>`;

    // Debajo de la columna va la sigla (ej: "QU"); al tocarla con el
    // dedo o pasar el mouse se ve el nombre completo (atributo title).
    const nombre = li.querySelector(".columna-nombre");
    nombre.textContent =
      siglasEstaciones[estacion] || estacion.slice(0, 2).toUpperCase();
    li.title = estacion;

    // Alto de la columna completa: una parte del área, dejando 1.5rem
    // arriba para el número. Ej: 2 de 4 turnos → la mitad de ese espacio.
    li.querySelector(".columna-barra").style.height =
      `calc((100% - 1.5rem) * ${datos.total / maximo})`;
    // Alto de cada color por dentro de la columna (en %)
    li.querySelector(".parte-verde").style.height =
      `${(cuadrados / datos.total) * 100}%`;
    li.querySelector(".parte-naranja").style.height =
      `${(datos.descuadres / datos.total) * 100}%`;

    // Texto para lectores de pantalla (personas con baja visión)
    li.setAttribute(
      "aria-label",
      `${estacion}: ${datos.total} turnos, ${cuadrados} cuadrados, ${datos.descuadres} con descuadre`,
    );

    listaEstaciones.appendChild(li);
  });

  // f) Si las columnas no entran en la pantalla, avisar que se puede deslizar.
  //    scrollWidth = ancho de todo el contenido; clientWidth = ancho visible.
  avisoDeslizar.hidden =
    listaEstaciones.scrollWidth <= listaEstaciones.clientWidth;
}

/* ===== SELECTOR DE MES (Eficiencia del mes) ===== */
// 1. Nombres cortos de los meses. getMonth() devuelve 0 = enero ... 11 = diciembre,
//    por eso la posición 0 del arreglo es "Ene".
const nombresMeses = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// 2. Buscar en el HTML el texto del mes y las dos flechas
const mesTexto = document.querySelector("#mes-texto");
const botonMesAnterior = document.querySelector("#mes-anterior");
const botonMesSiguiente = document.querySelector("#mes-siguiente");
// El mismo selector repetido en el Historial (para no tener que subir)
const textoHistorialMes = document.querySelector("#historial-mes");
const botonHistorialAnterior = document.querySelector("#historial-mes-anterior");
const botonHistorialSiguiente = document.querySelector("#historial-mes-siguiente");

// 3. Mes y año que se están mostrando. Empiezan en el mes actual.
//    Se usa "let" (no "const") porque cambian al pulsar las flechas.
let mesVisible = fechaActual.getMonth(); // número de 0 a 11
let anioVisible = fechaActual.getFullYear(); // ej: 2026

// 4. Escribir el mes en los DOS selectores (arriba y en el Historial),
//    bloquear la flecha › si ya estamos en el mes actual y recalcular la
//    eficiencia y el historial de ese mes.
function mostrarMes() {
  const nombreMes = `${nombresMeses[mesVisible]} ${anioVisible}`;
  mesTexto.textContent = nombreMes;
  textoHistorialMes.textContent = nombreMes;

  // Fecha de este momento (no la de cuando se abrió la página)
  const ahora = new Date();
  const esMesActual =
    mesVisible === ahora.getMonth() && anioVisible === ahora.getFullYear();
  botonMesSiguiente.disabled = esMesActual;
  botonHistorialSiguiente.disabled = esMesActual;

  actualizarEficiencia();
  mostrarHistorial(); // el historial también muestra solo este mes
}

// 5. Flecha ‹ : retroceder un mes. Si pasamos de enero (0) a -1,
//    saltamos a diciembre (11) del año anterior.
function mesAnterior() {
  mesVisible--;
  if (mesVisible < 0) {
    mesVisible = 11;
    anioVisible--;
  }
  mostrarMes();
}

// 6. Flecha › : avanzar un mes. Si pasamos de diciembre (11) a 12,
//    saltamos a enero (0) del año siguiente.
function mesSiguiente() {
  mesVisible++;
  if (mesVisible > 11) {
    mesVisible = 0;
    anioVisible++;
  }
  mostrarMes();
}

// 7. Las flechas de arriba y las del Historial hacen lo mismo
botonMesAnterior.addEventListener("click", mesAnterior);
botonMesSiguiente.addEventListener("click", mesSiguiente);
botonHistorialAnterior.addEventListener("click", mesAnterior);
botonHistorialSiguiente.addEventListener("click", mesSiguiente);

/* ===== HISTORIAL ===== */
// 1. Buscar en el HTML la lista <ul id="lista-historial">
const listaHistorial = document.querySelector("#lista-historial");

// 2. Filtro elegido. Puede ser "todos", "cuadrados" o "descuadrados"
//    (los mismos valores que el data-filtro de los botones en el HTML)
let filtroActivo = "todos";

// 3. Iconos: lápiz (editar), clip (comprobante) y papelera (eliminar)
const iconoLapiz = `
  <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>`;

const iconoClip = `
  <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
  </svg>`;

const iconoPapelera = `
  <svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>`;

// 4. "2026-10-08" → "08/10/2026" (se parte, se da la vuelta y se une con /)
function formatearFecha(fecha) {
  return fecha.split("-").reverse().join("/");
}

// 5. Dibujar la lista con los turnos DEL MES que se está viendo
//    (el mismo de "Eficiencia del mes"), respetando el filtro
function mostrarHistorial() {
  // a) Vaciar la lista para no duplicar registros
  listaHistorial.innerHTML = "";
  const nombreMes = `${nombresMeses[mesVisible]} ${anioVisible}`;

  // b) Solo los turnos del mes visible (igual que en actualizarEficiencia)
  const turnosDelMes = misTurnos().filter((turno) => {
    const [anio, mes] = turno.fecha.split("-").map(Number);
    return anio === anioVisible && mes - 1 === mesVisible;
  });

  // c) De esos, quedarnos con los que pasan el filtro
  const visibles = turnosDelMes.filter((turno) => {
    if (filtroActivo === "cuadrados") return turno.resultado === "cuadrada";
    if (filtroActivo === "descuadrados")
      return turno.resultado === "no-cuadrada";
    return true; // "todos"
  });

  // d) Si no hay nada que mostrar, un mensaje y salir de la función.
  //    El texto cambia si el mes está vacío o si solo es el filtro
  if (visibles.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "historial-vacio";
    vacio.textContent =
      turnosDelMes.length === 0
        ? `No hay turnos registrados en ${nombreMes}.`
        : "No hay turnos con este filtro.";
    listaHistorial.appendChild(vacio);
    return;
  }

  // e) Ordenar del más reciente al más antiguo.
  //    [...visibles] hace una COPIA para no desordenar el arreglo.
  //    Si dos turnos tienen la misma fecha, va primero el último guardado (id mayor).
  const ordenados = [...visibles].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id,
  );

  // f) Crear un <li> por cada turno
  ordenados.forEach((turno) => {
    const esCuadrada = turno.resultado === "cuadrada";
    const esFijo = turno.turno === "fijo";

    const li = document.createElement("li");
    li.className = "registro";
    li.dataset.id = turno.id; // guardamos el id: lo usamos para editar y eliminar
    if (turno.id === turnoEditando) li.classList.add("editando");

    // Estructura fija con innerHTML (aquí NO va nada que escriba el usuario).
    // Las 2 etiquetas van juntas: resultado arriba, tipo de turno abajo.
    li.innerHTML = `
      <span class="punto ${esCuadrada ? "punto-verde" : "punto-rojo"}"></span>
      <div class="registro-info">
        <strong></strong>
        <p></p>
      </div>
      <div class="registro-etiquetas">
        <span class="etiqueta ${esCuadrada ? "etiqueta-verde" : "etiqueta-roja"}">
          ${esCuadrada ? "Cuadrada" : "Descuadre"}
        </span>
        <span class="etiqueta ${esFijo ? "etiqueta-fijo" : "etiqueta-reserva"}">
          ${esFijo ? "Fijo" : "Reserva"}
        </span>
      </div>
      <div class="registro-acciones">
        <button type="button" class="editar" aria-label="Editar registro">
          ${iconoLapiz}
        </button>
        <button type="button" class="eliminar" aria-label="Eliminar registro">
          ${iconoPapelera}
        </button>
      </div>`;

    // Lo que escribe el usuario va con textContent (más seguro que innerHTML:
    // si alguien escribe código HTML en la observación, se muestra como texto)
    li.querySelector("strong").textContent = turno.estacion;
    li.querySelector("p").textContent = formatearFecha(turno.fecha);

    // La observación va en su PROPIA fila, debajo y con todo el ancho.
    //   Antes iba junto a la fecha y en celular quedaba muy apretada.
    //   Solo se crea si el turno tiene observación.
    if (turno.observacion) {
      const obs = document.createElement("p");
      obs.className = "registro-obs";
      obs.textContent = turno.observacion;
      li.appendChild(obs);
    }

    // Botón "Ver comprobante" solo si el turno tiene foto guardada
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

/* ===== FILTROS ===== */
// 1. Buscar los 3 botones de filtro (querySelectorAll devuelve TODOS)
const botonesFiltro = document.querySelectorAll(".filtro");

// 2. Cambiar el filtro: guardar cuál es, pintar el botón activo y redibujar
function activarFiltro(filtro) {
  filtroActivo = filtro;

  botonesFiltro.forEach((boton) => {
    const esElElegido = boton.dataset.filtro === filtro;
    // toggle(clase, true) la pone; toggle(clase, false) la quita
    boton.classList.toggle("activo", esElElegido);
    // aria-pressed le dice a los lectores de pantalla cuál está marcado
    boton.setAttribute("aria-pressed", esElElegido);
  });

  mostrarHistorial();
}

// 3. Al hacer clic en un filtro, activarlo usando su data-filtro
botonesFiltro.forEach((boton) => {
  boton.addEventListener("click", () => {
    activarFiltro(boton.dataset.filtro);
  });
});

/* ===== FOTOS DE COMPROBANTES (IndexedDB) ===== */
// Las fotos NO van en localStorage: ahí solo caben ~5 MB y se llenaría con
// unas pocas fotos. IndexedDB es otra "bodega" del navegador, mucho más
// grande y hecha para guardar archivos. Igual que localStorage, queda solo
// en este celular y funciona sin internet.
// Cada foto se guarda con la llave = id del turno; en el turno solo se marca
// "comprobante: true" para saber que tiene foto.
const BASE_FOTOS = "cuadres-fotos";
const ALMACEN_FOTOS = "comprobantes";
let baseFotos = null; // se abre una sola vez y se reutiliza

// 1. Abrir (o crear la primera vez) la base de datos de fotos
function abrirBaseFotos() {
  if (!baseFotos) {
    baseFotos = new Promise((resolver, rechazar) => {
      const pedido = indexedDB.open(BASE_FOTOS, 1);
      // Solo la primera vez: crear el "cajón" donde van las fotos
      pedido.onupgradeneeded = () =>
        pedido.result.createObjectStore(ALMACEN_FOTOS);
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rechazar(pedido.error);
    });
  }
  return baseFotos;
}

// 2. Hacer una operación en el cajón de fotos y esperar a que termine.
//    modo = "readonly" (leer) o "readwrite" (guardar o borrar)
async function usarFotos(modo, operacion) {
  const base = await abrirBaseFotos();
  return new Promise((resolver, rechazar) => {
    const transaccion = base.transaction(ALMACEN_FOTOS, modo);
    const pedido = operacion(transaccion.objectStore(ALMACEN_FOTOS));
    transaccion.oncomplete = () => resolver(pedido.result);
    transaccion.onerror = () => rechazar(transaccion.error);
    transaccion.onabort = () => rechazar(transaccion.error);
  });
}

const guardarFoto = (id, foto) =>
  usarFotos("readwrite", (cajon) => cajon.put(foto, id));
const leerFoto = (id) => usarFotos("readonly", (cajon) => cajon.get(id));
const borrarFoto = (id) => usarFotos("readwrite", (cajon) => cajon.delete(id));

// 3. Pedir al navegador que NO borre estos datos aunque falte espacio.
//    Algunos celulares lo aceptan sin preguntar; si no, no pasa nada.
function pedirGuardadoPermanente() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// 4. Achicar la foto del comprobante: el lado más largo queda en 1280 px
//    y JPEG al 70 %. Una foto de 4 MB queda en unos 150-300 KB y el texto
//    del comprobante se sigue leyendo bien.
const LADO_COMPROBANTE = 1280;

function achicarComprobante(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(
        1,
        LADO_COMPROBANTE / Math.max(imagen.width, imagen.height),
      );
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.width * escala);
      lienzo.height = Math.round(imagen.height * escala);
      lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      URL.revokeObjectURL(url);
      // toBlob entrega la foto como archivo (Blob), listo para IndexedDB
      lienzo.toBlob(
        (foto) => (foto ? resolver(foto) : rechazar()),
        "image/jpeg",
        0.7,
      );
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar();
    };
    imagen.src = url;
  });
}

/* ===== FORMULARIO: REGISTRAR O EDITAR ===== */
// El mismo formulario sirve para registrar un turno nuevo y para editar uno.
const formTurno = document.querySelector("#form-turno");
const tituloFormulario = document.querySelector("#titulo-formulario");
const botonGuardar = document.querySelector("#boton-guardar");
const botonCancelarEdicion = document.querySelector("#cancelar-edicion");
const inputComprobante = document.querySelector("#input-comprobante");
const previaComprobante = document.querySelector("#comprobante-previa");
const botonElegirComprobante = document.querySelector("#elegir-comprobante");
const inputCamaraComprobante = document.querySelector("#camara-input-comprobante");
const botonQuitarComprobante = document.querySelector("#quitar-comprobante");

// Estado del formulario:
let turnoEditando = null; // id del turno que se edita (null = turno nuevo)
let comprobanteNuevo = null; // foto elegida y achicada, aún sin guardar
let comprobanteQuitado = false; // true si se tocó "Quitar foto" al editar
let urlPrevia = ""; // dirección temporal de la miniatura

// 1. Mostrar u ocultar la miniatura del comprobante
function mostrarPreviaComprobante(foto) {
  if (urlPrevia) URL.revokeObjectURL(urlPrevia);
  urlPrevia = foto ? URL.createObjectURL(foto) : "";
  previaComprobante.src = urlPrevia;
  previaComprobante.hidden = !foto;
  botonQuitarComprobante.hidden = !foto;
}

// 2. Dejar el formulario limpio, en modo "Registrar turno".
//    reset() deja todo como al cargar la página, pero la fecha y la estación
//    las pusimos con JavaScript, así que las volvemos a poner a mano.
function limpiarFormulario() {
  formTurno.reset();
  inputFecha.value = fechaDeHoy();
  inputFecha.max = fechaDeHoy();
  mostrarFechaElegida(); // actualizar el texto dd/mm/aaaa
  selectEstaciones.value = "";

  turnoEditando = null;
  comprobanteNuevo = null;
  comprobanteQuitado = false;
  mostrarPreviaComprobante(null);

  tituloFormulario.textContent = "Registrar turno";
  botonGuardar.textContent = "Guardar turno";
  botonCancelarEdicion.hidden = true;
}

// 3. Cargar un turno en el formulario para editarlo
async function empezarEdicion(turno) {
  limpiarFormulario();
  turnoEditando = turno.id;

  inputFecha.value = turno.fecha;
  mostrarFechaElegida();
  selectEstaciones.value = turno.estacion;
  // Para los radios, .value elige la opción que tenga ese value
  formTurno.elements.turno.value = turno.turno;
  formTurno.elements.resultado.value = turno.resultado;
  formTurno.elements.observacion.value = turno.observacion;

  tituloFormulario.textContent = "Editar turno";
  botonGuardar.textContent = "Guardar cambios";
  botonCancelarEdicion.hidden = false;

  // Subir hasta el formulario y marcar el turno en el historial
  formTurno.closest(".tarjeta").scrollIntoView({ behavior: "smooth" });
  mostrarHistorial();

  // Si tiene comprobante, mostrar su miniatura
  if (turno.comprobante) {
    try {
      const foto = await leerFoto(turno.id);
      // Solo si mientras tanto no se canceló la edición
      if (foto && turnoEditando === turno.id) mostrarPreviaComprobante(foto);
    } catch {
      /* si no se puede leer, se edita sin miniatura */
    }
  }
}

// 4. Botones del comprobante
//    "Tomar foto" abre la cámara; "Galería" las fotos guardadas.
document
  .querySelector("#camara-comprobante")
  .addEventListener("click", () => inputCamaraComprobante.click());
botonElegirComprobante.addEventListener("click", () => inputComprobante.click());

// Los dos campos (cámara y galería) usan la misma función
async function usarFotoComprobante(evento) {
  const input = evento.target;
  const archivo = input.files[0];
  input.value = ""; // para poder elegir la misma foto otra vez
  if (!archivo || !esImagenValida(archivo)) return;
  try {
    comprobanteNuevo = await achicarComprobante(archivo);
    comprobanteQuitado = false;
    mostrarPreviaComprobante(comprobanteNuevo);
  } catch {
    alert("No se pudo leer esa imagen. Prueba con otra foto.");
  }
}
inputComprobante.addEventListener("change", usarFotoComprobante);
inputCamaraComprobante.addEventListener("change", usarFotoComprobante);

botonQuitarComprobante.addEventListener("click", () => {
  comprobanteNuevo = null;
  comprobanteQuitado = true;
  mostrarPreviaComprobante(null);
});

botonCancelarEdicion.addEventListener("click", () => {
  limpiarFormulario();
  mostrarHistorial(); // quitar la marca del turno que se editaba
});

/* ===== ACCIONES DEL HISTORIAL: EDITAR, VER COMPROBANTE, ELIMINAR ===== */
// Los <li> se borran y se vuelven a crear cada vez que se dibuja la lista,
// así que NO ponemos un "click" en cada botón. Ponemos UNO SOLO en la <ul>
// y preguntamos dónde se hizo clic. Esto se llama "delegación de eventos".
listaHistorial.addEventListener("click", async (evento) => {
  // 1. closest() sube desde lo que se tocó (puede ser el <svg> o un <path>)
  //    hasta encontrar el botón. Si no hay ninguno, el clic fue en otra parte.
  const boton = evento.target.closest(".editar, .eliminar, .ver-comprobante");
  if (!boton) return;

  // 2. Subir hasta el <li> y leer su id.
  //    dataset siempre devuelve TEXTO → Number() lo convierte a número
  const id = Number(boton.closest(".registro").dataset.id);
  const turno = turnos.find((t) => t.id === id);

  // 3. Lápiz: cargar el turno en el formulario
  if (boton.classList.contains("editar")) {
    empezarEdicion(turno);
    return;
  }

  // 4. Clip: ver la foto del comprobante
  if (boton.classList.contains("ver-comprobante")) {
    abrirComprobante(turno);
    return;
  }

  // 5. Papelera: pedir confirmación (Aceptar = true, Cancelar = false)
  const confirmado = confirm(
    `¿Eliminar el turno de ${turno.estacion} del ${formatearFecha(turno.fecha)}?`,
  );
  if (!confirmado) return;

  // 6. Quedarnos con todos los turnos MENOS el que tiene ese id, y guardar
  turnos = turnos.filter((t) => t.id !== id);
  guardarTurnos();
  if (turnoEditando === id) limpiarFormulario(); // se borró el que se editaba

  // 7. Actualizar la pantalla
  mostrarHistorial();
  actualizarEficiencia();

  // 8. Borrar también su foto (si falla, solo queda una foto sin usar)
  if (turno.comprobante) borrarFoto(id).catch(() => {});
});

/* ===== VER COMPROBANTE ===== */
const dialogoComprobante = document.querySelector("#dialogo-comprobante");
const imagenComprobante = document.querySelector("#comprobante-imagen");
const detalleComprobante = document.querySelector("#comprobante-detalle");
const descargarComprobante = document.querySelector("#descargar-comprobante");
let urlComprobante = "";

async function abrirComprobante(turno) {
  let foto;
  try {
    foto = await leerFoto(turno.id);
  } catch {
    foto = null;
  }
  if (!foto) {
    alert("No se encontró la foto de este comprobante en este celular.");
    return;
  }
  urlComprobante = URL.createObjectURL(foto);
  imagenComprobante.src = urlComprobante;
  detalleComprobante.textContent = `${turno.estacion} · ${formatearFecha(turno.fecha)}`;
  // Nombre del archivo al descargar: comprobante-2026-10-22-Quitumbe.jpg
  descargarComprobante.href = urlComprobante;
  descargarComprobante.download = `comprobante-${turno.fecha}-${turno.estacion.replace(/\s+/g, "-")}.jpg`;
  dialogoComprobante.showModal();
}

// Al cerrar la ventana, liberar la memoria de la foto
document
  .querySelector("#cerrar-comprobante")
  .addEventListener("click", () => dialogoComprobante.close());
dialogoComprobante.addEventListener("close", () => {
  URL.revokeObjectURL(urlComprobante);
  imagenComprobante.removeAttribute("src");
});

/* ===== GUARDAR TURNO (nuevo o editado) ===== */
// "submit" ocurre al pulsar "Guardar turno" (solo si pasa los "required")
formTurno.addEventListener("submit", async (evento) => {
  // a) Evitar que la página se recargue (es lo que hace un formulario por defecto)
  evento.preventDefault();

  // b) FormData lee todos los campos usando su atributo "name"
  const datos = new FormData(formTurno);
  const campos = {
    fecha: datos.get("fecha"), // "2026-10-18"
    estacion: datos.get("estacion"), // "Quitumbe"
    turno: datos.get("turno"), // "fijo" o "reserva"
    resultado: datos.get("resultado"), // "cuadrada" o "no-cuadrada"
    observacion: datos.get("observacion").trim(), // trim() quita espacios sobrantes
  };

  // c) Editar: cambiar los datos del turno que ya existe (mismo id y dueño).
  //    Nuevo: armar el turno y agregarlo al arreglo.
  let turno = turnoEditando && turnos.find((t) => t.id === turnoEditando);
  if (turno) {
    Object.assign(turno, campos); // copia los campos nuevos encima
  } else {
    turno = {
      id: Date.now(), // número único: milisegundos desde 1970
      ...campos,
      usuarioId: usuarios.activo, // de quién es el turno
    };
    turnos.push(turno);
  }

  // d) Guardar YA en localStorage (el turno no depende de la foto)
  guardarTurnos();

  // e) Foto del comprobante: guardar la nueva o borrar la quitada.
  //    Mientras tanto se desactiva el botón para no guardar dos veces.
  botonGuardar.disabled = true;
  try {
    if (comprobanteNuevo) {
      await guardarFoto(turno.id, comprobanteNuevo);
      turno.comprobante = true;
      pedirGuardadoPermanente();
    } else if (comprobanteQuitado && turno.comprobante) {
      await borrarFoto(turno.id);
      delete turno.comprobante;
    }
    guardarTurnos();
  } catch {
    alert("El turno se guardó, pero no se pudo guardar la foto del comprobante.");
  }
  botonGuardar.disabled = false;

  // f) Limpiar el formulario para el siguiente registro
  limpiarFormulario();

  // g) Mostrar el mes del turno guardado
  //    (por si registraste o editaste un turno de otro mes)
  const [anio, mes] = turno.fecha.split("-").map(Number);
  anioVisible = anio;
  mesVisible = mes - 1;

  // h) Actualizar la pantalla.
  //    Volvemos al filtro "Todos" para que el turno SIEMPRE se vea
  //    (si estabas en "Cuadres" y guardas un descuadre, no aparecería)
  mostrarMes();
  activarFiltro("todos");
});

/* ===== EXPORTAR A EXCEL (.xlsx) ===== */
// Un archivo .xlsx es en realidad un ZIP con varios archivos de texto (XML)
// adentro: uno con las celdas, otro con los colores, otro con las fotos...
// Aquí armamos esos archivos a mano y los metemos en un ZIP, sin internet
// y sin librerías. Así el reporte sale como TABLA: título, encabezados de
// color, bordes, filas alternadas, filtros y la foto del comprobante.

const botonExportar = document.querySelector("#exportar-excel");

// 1. ZIP mínimo (sin comprimir: las fotos JPEG ya vienen comprimidas)
// 1a. CRC32 = "huella" de cada archivo que el formato ZIP exige
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = TABLA_CRC[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// 1b. Recibe [{ nombre, datos }] (datos = texto o bytes) y devuelve un Blob .zip
function crearZip(archivos) {
  const codificador = new TextEncoder();
  const partes = []; // pedazos del archivo final, en orden
  const central = []; // índice que va al final del ZIP
  let posicion = 0;

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.nombre);
    const datos =
      typeof archivo.datos === "string"
        ? codificador.encode(archivo.datos)
        : archivo.datos;
    const crc = crc32(datos);

    // Cabecera de cada archivo (30 bytes + nombre)
    const cabecera = new DataView(new ArrayBuffer(30));
    cabecera.setUint32(0, 0x04034b50, true); // firma "PK.."
    cabecera.setUint16(4, 20, true); // versión necesaria
    cabecera.setUint16(6, 0x0800, true); // nombres en UTF-8
    cabecera.setUint16(8, 0, true); // 0 = sin comprimir
    cabecera.setUint16(12, 0x21, true); // fecha fija 01/01/1980
    cabecera.setUint32(14, crc, true);
    cabecera.setUint32(18, datos.length, true);
    cabecera.setUint32(22, datos.length, true);
    cabecera.setUint16(26, nombre.length, true);
    partes.push(cabecera, nombre, datos);

    // Entrada del índice central (46 bytes + nombre)
    const entrada = new DataView(new ArrayBuffer(46));
    entrada.setUint32(0, 0x02014b50, true);
    entrada.setUint16(4, 20, true);
    entrada.setUint16(6, 20, true);
    entrada.setUint16(8, 0x0800, true);
    entrada.setUint16(10, 0, true);
    entrada.setUint16(14, 0x21, true);
    entrada.setUint32(16, crc, true);
    entrada.setUint32(20, datos.length, true);
    entrada.setUint32(24, datos.length, true);
    entrada.setUint16(28, nombre.length, true);
    entrada.setUint32(42, posicion, true); // dónde empieza este archivo
    central.push(entrada, nombre);

    posicion += 30 + nombre.length + datos.length;
  }

  const tamanoCentral = central.reduce((suma, p) => suma + p.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22)); // "fin del ZIP"
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, posicion, true);

  return new Blob([...partes, ...central, fin], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// 2. Ayudas para escribir XML
// 2a. Escapar texto: "<", "&" y comillas romperían el XML
function textoXML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // invisibles no válidos
}

// 2b. Letra de la columna: 0 → "A", 6 → "G"
const letraColumna = (indice) => String.fromCharCode(65 + indice);

// 2c. Una celda. Los números van como número (Excel puede sumarlos);
//     el texto va "en línea" (inlineStr) para no necesitar otra tabla.
//     "estilo" es el número de formato definido en estilosExcel() (más abajo).
function celdaXML(fila, columna, valor, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  if (valor === null || valor === undefined || valor === "") {
    return `<c r="${ref}" s="${estilo}"/>`;
  }
  if (typeof valor === "number") {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${textoXML(valor)}</t></is></c>`;
}

// 3. Colores y formatos (como "Formato de celdas" en Excel).
//    Cada número de la lista ESTILO apunta a una fila de <cellXfs>.
const ESTILO = {
  titulo: 1, // naranja con letra blanca
  encabezado: 2, // naranja claro, negrita, centrado
  texto: 3, // celda normal con borde
  textoAlterna: 4, // igual, con fondo para filas alternadas
  cuadrada: 5, // "Cuadrada" en verde
  cuadradaAlterna: 6,
  descuadre: 7, // "Descuadre" en naranja oscuro
  descuadreAlterna: 8,
  etiqueta: 9, // "Auxiliar", "Mes"... en gris, negrita
  centrado: 10, // N° y fecha centrados
  centradoAlterna: 11,
};
function estilosExcel() {
  const borde = '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>';
  const relleno = (color) =>
    `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`;
  // xf(letra, relleno, borde, alineación)
  const xf = (font, fill, border, alineacion = "") =>
    `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"${alineacion}/></xf>`;
  const centro = ' horizontal="center"';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFC2410C"/><name val="Calibri"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
${relleno("EC6608")}${relleno("FDBA74")}${relleno("FFF4EC")}${relleno("F3F4F6")}
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${borde}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
${xf(1, 2, 1, centro)}${xf(2, 3, 1, centro)}${xf(0, 0, 1)}${xf(0, 4, 1)}
${xf(3, 0, 1, centro)}${xf(3, 4, 1, centro)}${xf(4, 0, 1, centro)}${xf(4, 4, 1, centro)}
${xf(2, 5, 1)}${xf(0, 0, 1, centro)}${xf(0, 4, 1, centro)}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

// 4. Foto del comprobante en tamaño pequeño para el Excel
//    (640 px: se ve bien al agrandarla y no pesa casi nada, unos 40-60 KB).
//    Devuelve { bytes, ancho, alto } o null si no hay foto.
const LADO_FOTO_EXCEL = 640;
async function fotoParaExcel(turno) {
  if (!turno.comprobante) return null;
  try {
    const foto = await leerFoto(turno.id);
    if (!foto) return null;
    const imagen = await createImageBitmap(foto);
    const escala = Math.min(1, LADO_FOTO_EXCEL / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise((resolver) => lienzo.toBlob(resolver, "image/jpeg", 0.7));
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      ancho: lienzo.width,
      alto: lienzo.height,
    };
  } catch {
    return null; // si una foto falla, el reporte sale igual sin ella
  }
}

// 5. Al pulsar "Exportar Excel"
botonExportar.addEventListener("click", async () => {
  // a) Turnos del mes visible, del MÁS ANTIGUO al más reciente
  const turnosDelMes = misTurnos()
    .filter((turno) => {
      const [anio, mes] = turno.fecha.split("-").map(Number);
      return anio === anioVisible && mes - 1 === mesVisible;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);

  // En el reporte el mes va con su nombre completo: "Octubre 2026"
  const mesesCompletos = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const nombreMes = `${mesesCompletos[mesVisible]} ${anioVisible}`;
  if (turnosDelMes.length === 0) {
    alert(`No hay turnos registrados en ${nombreMes}.`);
    return;
  }

  // Mientras se preparan las fotos el botón queda "ocupado"
  botonExportar.disabled = true;
  try {
    // b) Resumen (igual que la tarjeta de eficiencia)
    const total = turnosDelMes.length;
    const cuadrados = turnosDelMes.filter((t) => t.resultado === "cuadrada").length;
    const descuadres = total - cuadrados;
    const porcentaje = (cuadrados / total) * 100;

    // c) Fotos de los comprobantes (una por turno, si tiene)
    const fotos = await Promise.all(turnosDelMes.map(fotoParaExcel));

    // d) Filas de la hoja. Cada fila: { numero, alto?, celdas: [xml...] }
    const filas = [];
    const combinadas = []; // celdas unidas, ej. "A1:G1"
    const COLUMNAS = 7; // A..G

    // Título (fila 1) y datos del reporte (filas 2 a 4)
    filas.push({ numero: 1, alto: 30, celdas: [celdaXML(1, 0, `CONTROL DE CUADRES DE CAJA · ${nombreMes.toUpperCase()}`, ESTILO.titulo)] });
    combinadas.push("A1:G1");
    [
      ["Auxiliar", usuarioActivo()?.nombre ?? ""],
      ["Mes", nombreMes],
      ["Generado", formatearFecha(fechaDeHoy())],
    ].forEach(([etiqueta, valor], i) => {
      const n = 2 + i;
      filas.push({ numero: n, celdas: [celdaXML(n, 0, etiqueta, ESTILO.etiqueta), celdaXML(n, 1, valor, ESTILO.texto), celdaXML(n, 2, "", ESTILO.texto)] });
      combinadas.push(`B${n}:C${n}`); // el valor ocupa B y C
    });

    // Encabezados de la tabla (fila 6)
    const FILA_ENCABEZADO = 6;
    const titulos = ["N°", "Fecha", "Estación", "Tipo de turno", "Resultado", "Código OT / Observación", "Comprobante"];
    filas.push({ numero: FILA_ENCABEZADO, alto: 22, celdas: titulos.map((t, c) => celdaXML(FILA_ENCABEZADO, c, t, ESTILO.encabezado)) });

    // Una fila por turno. Las filas pares llevan fondo (como en la imagen de ejemplo).
    const dibujos = []; // fotos a colocar: { fila, foto, ancho, alto }
    turnosDelMes.forEach((turno, i) => {
      const n = FILA_ENCABEZADO + 1 + i;
      const alterna = i % 2 === 1;
      const cuadrada = turno.resultado === "cuadrada";
      const foto = fotos[i];

      // Alto de la fila (en puntos). Se fija siempre, porque si Excel lo
      // calculara solo, las fotos de abajo quedarían corridas.
      // Texto: ~34 letras por línea en la columna de observación, 15 pt por línea.
      const lineas = Math.max(1, Math.ceil(String(turno.observacion || "").length / 34));
      let alto = Math.max(20, lineas * 15 + 5);

      // Tamaño de la foto dentro de la celda: máximo 120 x 90 píxeles
      if (foto) {
        const escala = Math.min(120 / foto.ancho, 90 / foto.alto);
        const ancho = Math.round(foto.ancho * escala);
        const altoFoto = Math.round(foto.alto * escala);
        // margen = espacio a la izquierda para que la foto quede centrada
        // (la columna G mide unos 131 píxeles)
        const margen = Math.max(4, Math.round((131 - ancho) / 2));
        dibujos.push({ fila: n, foto, ancho, alto: altoFoto, margen });
        alto = Math.max(alto, Math.round((altoFoto + 8) * 0.75)); // px → puntos
      }

      filas.push({
        numero: n,
        alto,
        celdas: [
          celdaXML(n, 0, i + 1, alterna ? ESTILO.centradoAlterna : ESTILO.centrado),
          celdaXML(n, 1, formatearFecha(turno.fecha), alterna ? ESTILO.centradoAlterna : ESTILO.centrado),
          celdaXML(n, 2, turno.estacion, alterna ? ESTILO.textoAlterna : ESTILO.texto),
          celdaXML(n, 3, turno.turno === "fijo" ? "Fijo" : "Reserva", alterna ? ESTILO.centradoAlterna : ESTILO.centrado),
          celdaXML(n, 4, cuadrada ? "Cuadrada" : "Descuadre",
            cuadrada
              ? alterna ? ESTILO.cuadradaAlterna : ESTILO.cuadrada
              : alterna ? ESTILO.descuadreAlterna : ESTILO.descuadre),
          celdaXML(n, 5, turno.observacion, alterna ? ESTILO.textoAlterna : ESTILO.texto),
          celdaXML(n, 6, foto ? "" : "Sin foto", alterna ? ESTILO.centradoAlterna : ESTILO.centrado),
        ],
      });
    });
    const ultimaFilaDatos = FILA_ENCABEZADO + total;

    // Resumen al final (dejando una fila vacía)
    const FILA_RESUMEN = ultimaFilaDatos + 2;
    filas.push({ numero: FILA_RESUMEN, celdas: [celdaXML(FILA_RESUMEN, 0, "RESUMEN", ESTILO.encabezado), celdaXML(FILA_RESUMEN, 1, "", ESTILO.encabezado), celdaXML(FILA_RESUMEN, 2, "", ESTILO.encabezado)] });
    combinadas.push(`A${FILA_RESUMEN}:C${FILA_RESUMEN}`);
    [
      ["Turnos", total],
      ["Cuadrados", cuadrados],
      ["Descuadres", descuadres],
      ["Eficiencia", formatoPorcentaje(porcentaje)],
    ].forEach(([etiqueta, valor], i) => {
      const n = FILA_RESUMEN + 1 + i;
      filas.push({ numero: n, celdas: [celdaXML(n, 0, etiqueta, ESTILO.etiqueta), celdaXML(n, 1, "", ESTILO.etiqueta), celdaXML(n, 2, valor, ESTILO.centrado)] });
      combinadas.push(`A${n}:B${n}`);
    });

    // e) La hoja (sheet1.xml)
    const anchos = [11, 12, 22, 14, 13, 36, 18]; // ancho de cada columna (A..G)
    const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${FILA_ENCABEZADO}" topLeftCell="A${FILA_ENCABEZADO + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18" customHeight="1"/>
<cols>${anchos.map((a, c) => `<col min="${c + 1}" max="${c + 1}" width="${a}" customWidth="1"/>`).join("")}</cols>
<sheetData>${filas
      .map((f) => `<row r="${f.numero}"${f.alto ? ` ht="${f.alto}" customHeight="1"` : ""}>${f.celdas.join("")}</row>`)
      .join("")}</sheetData>
<autoFilter ref="A${FILA_ENCABEZADO}:G${ultimaFilaDatos}"/>
<mergeCells count="${combinadas.length}">${combinadas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
${dibujos.length ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;

    // f) Las fotos: cada una se "ancla" en la columna G de su fila.
    //    "from" y "to" = esquina de arriba-izquierda y de abajo-derecha de la
    //    foto, las dos dentro de la misma celda. Excel mide en EMU: 1 píxel = 9525 EMU.
    const EMU = 9525;
    const dibujo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${dibujos
      .map(
        (d, i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>6</xdr:col><xdr:colOff>${d.margen * EMU}</xdr:colOff><xdr:row>${d.fila - 1}</xdr:row><xdr:rowOff>${4 * EMU}</xdr:rowOff></xdr:from><xdr:to><xdr:col>6</xdr:col><xdr:colOff>${(d.margen + d.ancho) * EMU}</xdr:colOff><xdr:row>${d.fila - 1}</xdr:row><xdr:rowOff>${(4 + d.alto) * EMU}</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Comprobante ${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${d.ancho * EMU}" cy="${d.alto * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`,
      )
      .join("")}</xdr:wsDr>`;

    // g) Todos los archivos del .xlsx
    const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const archivos = [
      {
        nombre: "[Content_Types].xml",
        datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${dibujos.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>`,
      },
      {
        nombre: "_rels/.rels",
        datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      },
      {
        nombre: "xl/workbook.xml",
        datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="Cuadres" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Cuadres!$A$${FILA_ENCABEZADO}:$G$${ultimaFilaDatos}</definedName></definedNames></workbook>`,
      },
      {
        nombre: "xl/_rels/workbook.xml.rels",
        datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
      },
      { nombre: "xl/styles.xml", datos: estilosExcel() },
      { nombre: "xl/worksheets/sheet1.xml", datos: hoja },
    ];
    if (dibujos.length) {
      archivos.push(
        {
          nombre: "xl/worksheets/_rels/sheet1.xml.rels",
          datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
        },
        { nombre: "xl/drawings/drawing1.xml", datos: dibujo },
        {
          nombre: "xl/drawings/_rels/drawing1.xml.rels",
          datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${dibujos
            .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/image" Target="../media/foto${i + 1}.jpeg"/>`)
            .join("")}</Relationships>`,
        },
        ...dibujos.map((d, i) => ({ nombre: `xl/media/foto${i + 1}.jpeg`, datos: d.foto.bytes })),
      );
    }

    // h) Descargar: cuadres-2026-10.xlsx (mismo truco que la copia de seguridad)
    const nombreArchivo = `cuadres-${anioVisible}-${String(mesVisible + 1).padStart(2, "0")}.xlsx`;
    const libro = crearZip(archivos);
    const url = URL.createObjectURL(libro);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    botonExportar.disabled = false;
  }
});

/* ===== PWA: FUNCIONAR SIN INTERNET ===== */
// Registrar el service worker (sw.js). Es el archivo que guarda una copia
// de la app para que abra aunque no haya internet.
// 1. "serviceWorker" in navigator → solo si el navegador lo soporta
// 2. Se registra después de que la página cargó ("load") para no hacerla más lenta
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((error) => console.error("No se pudo registrar sw.js:", error));
  });
}

/* ===== MODO CLARO / OSCURO ===== */
// El tema se elige con el botón del sol/luna y se guarda en el celular
// (para todas las personas de ese celular). Si nadie eligió todavía,
// se usa el modo del celular. Un pequeño script en el <head> del HTML
// lo aplica ANTES de pintar para que la pantalla no parpadee.
const CLAVE_TEMA = "cuadres-tema";
const metaColorTema = document.querySelector('meta[name="theme-color"]');

// Tema actual: "claro" u "oscuro"
function temaActual() {
  return document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro";
}

// Aplicar un tema: cambia data-tema en <html> (el CSS hace el resto)
// y el color de la barra del navegador en el celular
function aplicarTema(tema) {
  if (tema === "claro") {
    document.documentElement.dataset.tema = "claro";
  } else {
    delete document.documentElement.dataset.tema;
  }
  // (naranja de la empresa en claro, azul noche en oscuro)
  metaColorTema.content = tema === "claro" ? "#ec6608" : "#0f172a";
}

aplicarTema(temaActual());

// Hay 2 botones de tema (encabezado y carátula): los dos hacen lo mismo
document.querySelectorAll(".boton-tema").forEach((boton) => {
  boton.addEventListener("click", () => {
    const nuevo = temaActual() === "claro" ? "oscuro" : "claro";
    aplicarTema(nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      // Si no se puede guardar, igual cambia mientras la app esté abierta
    }
  });
});

/* ===== RECORDATORIOS (calendario del celular) ===== */
// Una página web sin servidor no puede mandar notificaciones a una hora fija
// con la app cerrada. Por eso usamos el CALENDARIO del celular: creamos un
// archivo .ics (el formato estándar de eventos de calendario) con un evento
// que se repite cada día y tiene alarma. El calendario avisa solo, aunque
// la app esté cerrada y no haya internet.

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
//    (año, mes, día, "T", hora, minutos, segundos). Sin "Z" al final =
//    hora LOCAL del celular, así en Ecuador siempre es la hora de Ecuador.
//    padStart(2, "0") convierte 9 en "09".
function fechaCalendario(fecha) {
  const dos = (n) => String(n).padStart(2, "0");
  return (
    `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}${dos(fecha.getMinutes())}00`
  );
}

// 3. Armar el texto del archivo .ics
//    dias = 7 (1 semana) o 30 (1 mes)
function crearICS(tipo, dias) {
  const aviso = tiposRecordatorio[tipo];

  // Primer aviso y fin del evento (ver horarioAviso, más abajo)
  const { inicio, fin } = horarioAviso(aviso);

  // RRULE = regla de repetición: todos los días (DAILY), COUNT veces en total.
  const repetir = `FREQ=DAILY;COUNT=${dias}`;

  // Cada línea del formato .ics es "NOMBRE:valor". Se unen con \r\n (lo pide
  // el estándar). VALARM con TRIGGER:PT0M = la alarma suena a la hora exacta.
  // UID fijo por tipo: si la persona vuelve a agregarlo, muchos calendarios
  // reemplazan el anterior en vez de duplicarlo.
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
    `RRULE:${repetir}`,
    `SUMMARY:${aviso.titulo}`,
    // En .ics la coma es especial: se escribe "\,"
    `DESCRIPTION:${aviso.descripcion.replace(/,/g, "\\,")}`,
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

// 4. Primer aviso: HOY si todavía no pasó la hora; si ya pasó, MAÑANA.
//    Devuelve { inicio, fin } (el evento dura 9 minutos: 23:50 → 23:59,
//    así no pasa al día siguiente).
function horarioAviso(aviso) {
  const inicio = new Date();
  inicio.setHours(aviso.hora, aviso.minuto, 0, 0);
  if (inicio <= new Date()) inicio.setDate(inicio.getDate() + 1);
  const fin = new Date(inicio.getTime() + 9 * 60 * 1000);
  return { inicio, fin };
}

// 5. Enlace de Google Calendar con el evento ya lleno (título, hora,
//    repetición). Google lo abre listo y la persona solo toca "Guardar".
//    ctz = zona horaria del celular (ej: "America/Guayaquil"), para que
//    las 12:00 sean las 12:00 de aquí.
//    URLSearchParams arma el "?a=1&b=2" y codifica tildes, emojis y espacios.
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

// 6. Al tocar un botón de recordatorio: leer la duración y el calendario
//    elegidos.
//    - Google: abrir Google Calendar en una pestaña nueva (o la app).
//    - Otro: crear el archivo .ics y descargarlo con el mismo truco que en
//      Exportar Excel: un enlace <a download> temporal.
document.querySelectorAll("[data-recordatorio]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const tipo = boton.dataset.recordatorio;
    const dias = Number(
      document.querySelector('input[name="duracion-recordatorio"]:checked')
        .value,
    );
    const calendario = document.querySelector(
      'input[name="calendario-recordatorio"]:checked',
    ).value;

    if (calendario === "google") {
      // "noopener": la página de Google no puede tocar esta app
      window.open(enlaceGoogleCalendar(tipo, dias), "_blank", "noopener");
      return;
    }

    const archivo = new Blob([crearICS(tipo, dias)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `recordatorio-${tipo}.ics`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
});

/* ===== COPIA DE SEGURIDAD ===== */
// Guarda TODO lo de este celular en un archivo .json (texto) y lo puede
// volver a cargar en otro celular o en otra dirección de la app.
// Regla de oro: restaurar SOLO AGREGA lo que falta. Nunca borra ni cambia
// un turno, una persona o una foto que ya exista.
const FORMATO_COPIA = "control-de-cuadres-copia"; // para reconocer el archivo
const inputCopia = document.querySelector("#input-copia");

// 1. Convertir una foto (Blob) a texto "data:image/jpeg;base64,..." y al revés.
//    Así las fotos caben dentro del archivo de texto.
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
  const respuesta = await fetch(texto); // fetch entiende las direcciones "data:"
  return respuesta.blob();
}

// Para comparar nombres sin fijarse en tildes, mayúsculas ni espacios de más:
// "Luis Guillén" y "luis  guillen" cuentan como el mismo nombre.
function nombreSimple(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita las tildes
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Seguridad: el archivo de copia es texto que cualquiera podría modificar.
// Por eso, al restaurar, cada persona y cada turno se REVISA y se arma de
// nuevo SOLO con los campos que la app conoce, del tipo correcto.
// Lo que no cumple se deja fuera (no se agrega) y se avisa cuántos fueron.
// Ayudas pequeñas para revisar cada dato:
//   FECHA_VALIDA → patrón de una fecha "2026-10-22" (4 números - 2 - 2)
//   esId(valor)  → true si es un número entero y positivo (como Date.now())
//   esTexto(valor, maximo) → true si es texto y no pasa de "maximo" letras
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/; // "2026-10-22"
const esId = (valor) => Number.isSafeInteger(valor) && valor > 0;
const esTexto = (valor, maximo) =>
  typeof valor === "string" && valor.length <= maximo;

// Revisa UNA persona de la copia. Devuelve la persona limpia, o null si
// está dañada (sin id válido o sin nombre). null = "no se agrega".
function limpiarPersona(persona) {
  // Sin id numérico no se puede saber de quién son los turnos
  if (!persona || !esId(persona.id)) return null;
  // El nombre debe ser texto (la app permite 30 letras; se deja margen)
  if (!esTexto(persona.nombre, 60) || persona.nombre.trim().length < 1) return null;
  // Se arma un objeto NUEVO solo con los campos que la app usa.
  // Si el archivo traía otros campos inventados, se quedan fuera.
  return {
    id: persona.id,
    nombre: persona.nombre.trim().replace(/\s+/g, " "),
    creado: FECHA_VALIDA.test(persona.creado) ? persona.creado : fechaDeHoy(),
    foto: esFotoTexto(persona.foto) ? persona.foto : "",
  };
}

// Revisa UN turno de la copia. Devuelve el turno limpio, o null si está
// dañado. Lo obligatorio: id, fecha, estación y resultado válidos.
function limpiarTurno(turno) {
  // El id es la "cédula" del turno: sin él no se puede comparar ni editar
  if (!turno || !esId(turno.id)) return null;
  // La fecha debe tener la forma "AAAA-MM-DD"
  if (!esTexto(turno.fecha, 10) || !FECHA_VALIDA.test(turno.fecha)) return null;
  // La estación debe ser texto con algo escrito
  if (!esTexto(turno.estacion, 100) || !turno.estacion.trim()) return null;
  // El resultado solo puede ser uno de los dos que tiene la app
  if (turno.resultado !== "cuadrada" && turno.resultado !== "no-cuadrada") return null;
  // Igual que con las personas: objeto NUEVO solo con los campos conocidos.
  // El tipo de turno, si viene raro, queda como "reserva".
  const limpio = {
    id: turno.id,
    fecha: turno.fecha,
    estacion: turno.estacion,
    turno: turno.turno === "fijo" ? "fijo" : "reserva",
    resultado: turno.resultado,
    // La app permite 100 letras; se deja margen para no cortar nada viejo
    observacion: esTexto(turno.observacion, 500) ? turno.observacion : "",
  };
  // Dueño del turno (si falta, más abajo pasa a la sesión abierta)
  if (esId(turno.usuarioId)) limpio.usuarioId = turno.usuarioId;
  // Marca de "tiene foto": su foto se revisa aparte con esFotoTexto()
  if (turno.comprobante === true) limpio.comprobante = true;
  return limpio;
}

// 2. "Guardar copia": armar el archivo y descargarlo
document.querySelector("#guardar-copia").addEventListener("click", async () => {
  // a) Fotos de los turnos que tienen comprobante: { "id del turno": "data:..." }
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

  // b) Todo junto en un objeto. "creada" sirve para saber de cuándo es.
  const copia = {
    formato: FORMATO_COPIA,
    version: 1,
    versionApp: VERSION_APP,
    creada: new Date().toISOString(),
    turnos: turnos,
    usuarios: usuarios.lista,
    fotos: fotos,
  };

  // c) Descargar (mismo truco que en Exportar Excel)
  //    Nombre: copia-cuadres-2026-10-23.json
  const archivo = new Blob([JSON.stringify(copia)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `copia-cuadres-${fechaDeHoy()}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// 3. "Restaurar copia": abrir el selector de archivos
document
  .querySelector("#restaurar-copia")
  .addEventListener("click", () => inputCopia.click());

inputCopia.addEventListener("change", async () => {
  const archivo = inputCopia.files[0];
  inputCopia.value = ""; // para poder elegir el mismo archivo otra vez
  if (!archivo) return;

  // a0) Seguridad: no abrir archivos gigantes (trabarían el celular)
  if (archivo.size > MAXIMO_COPIA_MB * 1024 * 1024) {
    alert(`Ese archivo pesa más de ${MAXIMO_COPIA_MB} MB: no parece una copia de Control de Cuadres.`);
    return;
  }

  // a) Leer y revisar que de verdad sea una copia de esta app
  let copia;
  try {
    copia = JSON.parse(await archivo.text());
  } catch {
    copia = null;
  }
  if (
    !copia ||
    copia.formato !== FORMATO_COPIA ||
    !Array.isArray(copia.turnos) ||
    !Array.isArray(copia.usuarios)
  ) {
    alert("Ese archivo no es una copia de seguridad de Control de Cuadres.");
    return;
  }

  // a2) Revisar cada persona y cada turno (ver limpiarTurno y limpiarPersona).
  //     Desde aquí se trabaja solo con los datos ya revisados.
  const totalEnArchivo = copia.turnos.length + copia.usuarios.length;
  copia.usuarios = copia.usuarios.map(limpiarPersona).filter(Boolean);
  copia.turnos = copia.turnos.map(limpiarTurno).filter(Boolean);
  const descartados = totalEnArchivo - copia.turnos.length - copia.usuarios.length;
  if (!copia.fotos || typeof copia.fotos !== "object") copia.fotos = {};

  // b) PERSONAS. Si en este celular ya hay alguien con el MISMO nombre
  //    (sin contar tildes ni mayúsculas), se usa esa persona (no se duplica).
  //    Si hay varias con ese nombre, gana la que tiene la sesión abierta.
  //    "cambioDeId" recuerda: id de la copia → id en este celular.
  const cambioDeId = {};
  const personasNuevas = [];
  const activo = usuarioActivo();

  // Caso especial: la copia es de UNA sola persona y su nombre no es el de
  // la sesión abierta (ej. "Luis" y "Luis Guillén"). Se pregunta si es la
  // misma persona, para que sus turnos se vean en tu perfil.
  const unicaPersona = copia.usuarios.length === 1 ? copia.usuarios[0] : null;
  if (
    unicaPersona &&
    activo &&
    nombreSimple(activo.nombre) !== nombreSimple(unicaPersona.nombre) &&
    confirm(
      `La copia es de "${unicaPersona.nombre}".\n` +
        `¿Es la misma persona que "${activo.nombre}"? ` +
        "Si tocas Aceptar, sus turnos se ponen en tu perfil.",
    )
  ) {
    cambioDeId[unicaPersona.id] = activo.id;
  }

  copia.usuarios.forEach((persona) => {
    if (cambioDeId[persona.id] !== undefined) return; // ya emparejada arriba
    const mismoNombre = usuarios.lista
      .filter((u) => nombreSimple(u.nombre) === nombreSimple(persona.nombre))
      .sort((a, b) => (b.id === usuarios.activo) - (a.id === usuarios.activo))[0];
    if (mismoNombre) {
      cambioDeId[persona.id] = mismoNombre.id;
    } else {
      // Si por casualidad el id ya está usado, se le da uno nuevo
      let id = persona.id;
      while (
        usuarios.lista.some((u) => u.id === id) ||
        personasNuevas.some((u) => u.id === id)
      ) {
        id++;
      }
      cambioDeId[persona.id] = id;
      personasNuevas.push({ ...persona, id });
    }
  });

  // c) TURNOS. Solo los que no existen (mismo id = mismo turno).
  //    Turnos sin dueño en la copia pasan a la persona con la sesión abierta.
  const idsExistentes = new Set(turnos.map((t) => t.id));
  const turnosNuevos = copia.turnos
    .filter((t) => !idsExistentes.has(t.id))
    .map((t) => ({
      ...t,
      usuarioId: cambioDeId[t.usuarioId] ?? usuarios.activo,
    }));

  // c2) Turnos de la copia que YA están en este celular pero guardados con
  //     OTRA persona (pasa si antes se restauró y el nombre no coincidió, y
  //     se creó un perfil repetido). Se ofrece pasarlos a la persona correcta.
  //     No se borra nada: solo cambia de quién es el turno.
  const duenoEnCopia = new Map(copia.turnos.map((t) => [t.id, t.usuarioId]));
  const turnosAMover = turnos.filter((t) => {
    if (!duenoEnCopia.has(t.id)) return false;
    const duenoCorrecto = cambioDeId[duenoEnCopia.get(t.id)];
    return duenoCorrecto !== undefined && t.usuarioId !== duenoCorrecto;
  });
  if (
    turnosAMover.length &&
    confirm(
      `${turnosAMover.length} turno(s) de esta copia están guardados con otro perfil.\n` +
        "¿Pasarlos al perfil correcto para que se vean? No se borra nada.",
    )
  ) {
    turnosAMover.forEach((t) => {
      t.usuarioId = cambioDeId[duenoEnCopia.get(t.id)];
    });
    guardarTurnos();
    if (turnosNuevos.length === 0 && personasNuevas.length === 0) {
      dialogoPerfil.close();
      mostrarUsuario();
      alert(`Listo: ${turnosAMover.length} turno(s) ya se ven en tu perfil.`);
      return;
    }
  }

  // d) Si no hay nada nuevo, avisar y salir.
  //    Primero el caso de una copia SIN turnos: casi siempre pasa cuando la
  //    copia se guardó desde una dirección de la app que todavía estaba vacía.
  if (copia.turnos.length === 0) {
    alert(
      "Esta copia no tiene turnos (está vacía).\n" +
        "Seguramente se guardó desde una app sin datos. Abre la app donde " +
        "tienes tus turnos, toca \"Guardar copia\" ahí y restaura ese archivo.",
    );
    return;
  }
  if (turnosNuevos.length === 0 && personasNuevas.length === 0) {
    alert(
      `Los ${copia.turnos.length} turno(s) de esta copia ya están en este celular. ` +
        "No hay nada que agregar.",
    );
    return;
  }

  // e) Preguntar antes de agregar
  const confirmado = confirm(
    `Se agregarán ${turnosNuevos.length} turno(s) y ${personasNuevas.length} persona(s).\n` +
      (descartados
        ? `${descartados} dato(s) del archivo están dañados y no se agregarán.\n`
        : "") +
      "No se borra ni se cambia nada de lo que ya tienes. ¿Continuar?",
  );
  if (!confirmado) return;

  // f) Guardar personas y turnos
  usuarios.lista.push(...personasNuevas);
  guardarUsuarios();
  turnos.push(...turnosNuevos);
  guardarTurnos();

  // g) Fotos de los turnos nuevos (si una falla, el turno queda sin foto)
  const fotos = copia.fotos || {};
  let fotosFallidas = 0;
  for (const turno of turnosNuevos) {
    if (!turno.comprobante) continue;
    try {
      if (!fotos[turno.id]) throw new Error("sin foto");
      await guardarFoto(turno.id, await textoAFoto(fotos[turno.id]));
    } catch {
      delete turno.comprobante;
      fotosFallidas++;
    }
  }
  if (fotosFallidas) guardarTurnos();
  if (turnosNuevos.some((t) => t.comprobante)) pedirGuardadoPermanente();

  // h) Actualizar la pantalla y avisar
  dialogoPerfil.close();
  mostrarUsuario();
  alert(
    `Listo: se agregaron ${turnosNuevos.length} turno(s) y ${personasNuevas.length} persona(s).` +
      (fotosFallidas ? `\n${fotosFallidas} foto(s) no se pudieron recuperar.` : ""),
  );
});

/* ===== VERSIÓN DE LA APP ===== */
// Número que se muestra en la carátula y en el pie de página.
// Súbelo en cada mejora que se publique:
//   1.2.0 → 1.2.1  arreglo pequeño
//   1.2.0 → 1.3.0  mejora nueva
//   1.2.0 → 2.0.0  cambio grande
// Historial: 1.0.0 primera versión · 1.1.0 usuarios y foto ·
//            1.2.0 carátula de inicio y modo claro/oscuro ·
//            1.3.0 recordatorios opcionales 12:00 y 23:50 (calendario),
//                  por 1 semana o 1 mes ·
//            1.4.0 gráfico de cuadres y descuadres por estación ·
//            1.4.1 "Área de recaudo" y recordatorios con Google Calendar ·
//            1.4.2 historial por mes, editar turno y foto del comprobante ·
//            1.4.3 selector de mes también en el Historial ·
//            1.4.4 copia de seguridad (guardar y restaurar) ·
//            1.4.5 aviso claro cuando la copia está vacía ·
//            1.4.6 restaurar une los turnos con tu perfil aunque el nombre cambie,
//                  y botón "Eliminar perfil" ·
//            1.4.7 botón "Tomar foto" con la cámara (perfil y comprobante) ·
//            1.4.8 exportar a Excel (.xlsx) con tabla de colores y fotos ·
//            1.4.9 porcentaje con 2 decimales (se quitó en 1.4.10) ·
//            1.4.10 se quita la ventana "Excel listo"; porcentaje sin decimales ·
//            1.4.11 revisión de seguridad: se revisan fotos y copias antes de
//                   usarlas, y cabeceras de seguridad en Netlify (_headers)
// OJO: también sube VERSION en sw.js para que los celulares descarguen lo nuevo.
const VERSION_APP = "1.4.11";

document.querySelectorAll(".version-app").forEach((elemento) => {
  elemento.textContent = VERSION_APP;
});

/* ===== PIE DE PÁGINA ===== */
// Año actual en el "© 2026". Así el 1 de enero cambia solo a 2027.
document.querySelector("#anio-actual").textContent = new Date().getFullYear();

/* ===== INICIO ===== */
// Al cargar la página: mostrar a la persona con la sesión abierta y SUS datos.
// Si nadie la tiene abierta, preguntar quién va a registrar.
// Va AL FINAL porque usa todo lo de arriba.
mostrarUsuario();
if (!usuarioActivo()) abrirEntrar();
