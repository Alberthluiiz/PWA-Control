# Control de Cuadres

Aplicación web progresiva (PWA) que funciona sin conexión para registrar los cuadres de caja de cada turno, ver la eficiencia del mes y exportar el historial. Pensada para los **auxiliares de venta**.

**Versión actual:** 1.5.0

> 🔒 **Estado:** uso privado de prueba mientras la propuesta se revisa y se autoriza de forma institucional. No está publicada para uso general.

Proyecto personal hecho con HTML, CSS y JavaScript puro (sin frameworks ni servidor propio).

---

## ✨ Funcionalidades

### 🧭 Navegación (nuevo en 1.5.0)

- **Barra inferior como una app**: Inicio, Turnos, OT, Descuentos y Perfil. Cada sección es una "vista" con su propia dirección (`#inicio`, `#turnos`, `#ot`, `#descuentos`), así el botón **atrás** del celular funciona.
- **Un solo mes para todas las vistas**: si cambias el mes en una, cambia en todas.

### 🧾 Órdenes de trabajo (OT) (nuevo en 1.5.0)

- **Registrar una OT** con número (OT-123456), fecha, turno al que pertenece, tipo de incidencia, faltante o sobrante, monto y motivo. Un turno puede tener **varias OT**.
- Toda OT nueva queda **Pendiente**. Desde su detalle se marca **Válida** o **No válida** con el nombre del coordinador y una nota.
- La respuesta **puede cambiar**: cada cambio queda en el **historial** de la OT.
- Al guardar un turno con descuadre, la app ofrece registrar la OT en ese momento.
- El número rojo en **OT** de la barra inferior muestra cuántas siguen pendientes.

### 💸 Descuentos (nuevo en 1.5.0)

- **Saldo a descontar del mes** con las reglas del área:
  - un descuadre (faltante **o sobrante**) se descuenta;
  - la parte cubierta por una OT **válida** queda **justificada** (no se descuenta);
  - la parte con OT **pendiente** queda **en revisión**;
  - sin OT, o con OT **no válida**, va **a descontar**.
- Lista de los descuadres del mes con lo que pasa con cada uno.
- **Registrar el descuento aplicado** en el rol de pagos para ver el saldo que falta.


### 👥 Personas y perfil

- **Varias personas en el mismo celular**: cada auxiliar se registra con su nombre o nickname (sin correo ni contraseña) y ve **solo sus turnos**, su eficiencia y su reporte.
- **Avatar como en WhatsApp**: las iniciales sobre un color, o una **foto opcional** que se recorta y se achica sola para no llenar la memoria. La foto se puede **tomar con la cámara** en ese momento o elegir de la **galería**.
- **Carátula de inicio**: la lista de personas para entrar, la versión de la app y el autor.
- **Cerrar sesión** para volver a la pantalla "¿Quién va a registrar?".
- **Eliminar perfil**: borra un perfil que ya no se use. Si tiene turnos, **primero se pasan a otro perfil** para no perderlos. Si es el único perfil, pide confirmar dos veces.
- **Modo claro y modo oscuro** con el botón del sol/luna. La elección se recuerda. Si no eliges ninguno, la app usa el modo del celular.

### 📝 Registro de turnos

- **Registrar turnos** con fecha, estación, tipo de turno (Fijo / Reserva), resultado (Cuadrada / No cuadrada) y una observación opcional.
- **Monto del descuadre** (nuevo en 1.5.0): si no cuadró, se indica si fue **Faltante o Sobrante** y el **monto**. Los turnos viejos que tenían el monto escrito en la observación ("-0.45") se pasan solos al campo nuevo con la etiqueta **Revisar monto**, para que los confirmes.
- **Foto del comprobante de depósito** (opcional) en cada turno: con **Tomar foto** se abre la cámara del celular para fotografiarlo al instante, o se elige de la **Galería**. Se achica sola y se guarda en el celular, sin internet. Se puede ver y descargar desde el historial.
- **Editar o eliminar registros**: el lápiz carga el turno en el formulario para corregirlo, y la papelera lo elimina después de pedir confirmación.
- **Fecha en formato dd/mm/aaaa** en cualquier celular, sin importar su idioma.

### 📊 Eficiencia e historial

- **Meta del 80 %** (nuevo en 1.5.0): una rayita en el anillo marca la meta, el anillo se pone rojo si estás debajo, y la tarjeta **Descuadres permitidos** dice cuántos te quedan en el mes.
- **Eficiencia del mes**: un anillo de progreso muestra el porcentaje de turnos cuadrados (cuadrados ÷ total × 100), redondeado y **sin decimales** (12 de 13 = 92,31 → **92%**), junto con los contadores de turnos, cuadrados y descuadres.
- **Área de recaudo**: un gráfico de columnas con los turnos de cada estación en el mes. Muestra sus siglas (QU, MV, SO…), los cuadrados en verde y los descuadres en naranja, de mayor a menor.
- **Navegar entre meses** con las flechas ‹ › para revisar meses anteriores.
- **Historial por mes**: muestra solo los turnos del mes elegido, con sus propias flechas ‹ ›, del más reciente al más antiguo.
- **Filtros**: Todos, Cuadres y Descuadres.
- **Exportar a Excel (.xlsx)** el mes seleccionado como una tabla lista para imprimir: título de color, encabezados con filtros, bordes, filas alternadas, resultado en verde o naranja, las columnas **Diferencia** y **Monto ($)** (número, se puede sumar), las OT de cada turno, la **foto del comprobante** en cada fila y, al final, el resumen de eficiencia y de **descuentos**. Se arma en el celular, sin internet. El archivo se guarda directo en **Descargas**.

### 🔔 Recordatorios (opcionales)

- Cada persona puede agregar a su calendario un **aviso diario de turno a las 12:00** y otro para **registrar el turno a las 23:50**, durante 1 semana o 1 mes.
- Con **Google** se abre Google Calendar con el aviso listo. Con **Otro (iPhone)** se descarga un archivo de calendario.
- Avisan aunque la app esté cerrada y sin internet.

### 💾 Copia de seguridad

- **Guardar copia** descarga un archivo `.json` con los turnos, las **OT**, los **descuentos**, las personas y las fotos de los comprobantes. Las copias viejas (1.4.x) se siguen pudiendo restaurar.
- **Restaurar copia** lo carga en otro celular o en otra dirección de la app y **solo agrega lo que falta**: nunca borra ni cambia lo que ya existe.
  - Si la copia es de la misma persona con un nombre algo distinto, la app pregunta si es la misma persona, para juntar los turnos en un solo perfil.
  - Antes de agregar, muestra cuántos turnos y perfiles va a sumar.

### 📱 Funciona como una app

- **Funciona sin internet** y se puede **instalar en el celular** como una app (PWA).
- **Guardado automático**: los datos se conservan aunque cierres la página.
- **Diseño pensado para celular**.

---

## 🚀 Cómo usarla

1. Abre la app en el navegador del celular. La primera vez escribe tu nombre o nickname y, si quieres, agrega una foto.
2. En **Registrar turno**, elige la fecha, la estación, el tipo de turno y el resultado del cuadre.
3. Si no cuadró, marca **Faltante** o **Sobrante** y escribe el **monto**. Puedes adjuntar la foto del comprobante.
4. Pulsa **Guardar turno**. Si fue descuadre, la app te ofrece registrar la **OT** que te dio el OR.
5. Cuando tu coordinador responda, abre la OT y márcala **Válida** o **No válida**.
6. En **Descuentos** ves cuánto se te va a descontar en el mes.
7. Al cerrar el mes, pulsa **Exportar Excel** para descargar el reporte.
8. De vez en cuando, entra a tu perfil y toca **Guardar copia** para tener un respaldo.

### 🔄 Pasar los datos a otro celular

1. En el celular viejo: **Mi perfil → Guardar copia**. Guarda el archivo en Drive o envíatelo por WhatsApp.
2. En el celular nuevo: abre la app y crea tu perfil.
3. **Mi perfil → Restaurar copia** y elige el archivo. Acepta las preguntas y tus turnos aparecen en tu perfil.

---

## 🔒 Privacidad: ¿dónde se guardan los datos?

Los turnos se guardan **solo en tu dispositivo**: los datos en el `localStorage` del navegador y las fotos de comprobantes en `IndexedDB`. **No se envían a ningún servidor** y la app no tiene base de datos en internet.

- ✅ Nadie más puede ver tus registros.
- ✅ La copia de seguridad es un archivo que queda en tu poder. Tú decides dónde guardarlo.
- ⚠️ Si cambias de celular o de navegador, o borras los datos de navegación, los registros **no se pasan solos**. Usa **Guardar copia** y **Restaurar copia**.
- ℹ️ La app solo se conecta a internet para:
  - descargarse a sí misma;
  - cargar la letra **Poppins** desde Google Fonts;
  - abrir **Google Calendar** si tú tocas un recordatorio.

  Ninguna de esas conexiones envía tus turnos.

### 🛡️ Seguridad

- **Sin claves ni secretos**: la app no usa claves de API, contraseñas ni servidores. Se revisó todo el historial de git y no hay secretos guardados.
- **Textos seguros (XSS)**: lo que escribe la persona (nombre, estación, observación) se muestra siempre como texto (`textContent`), nunca como código HTML.
- **Fotos revisadas**: solo se aceptan imágenes de hasta 30 MB. Además, la app vuelve a dibujar cada foto en JPEG, así que lo que se guarda es siempre una imagen limpia.
- **Copia de seguridad revisada**: antes de restaurar se revisa el tamaño (máximo 100 MB), el formato y cada turno y persona, campo por campo. Lo que está dañado o fuera de lugar no se agrega. Restaurar nunca borra ni cambia lo que ya tienes.
- **Sin código dentro del HTML**: todo el JavaScript está en archivos aparte, así la política de seguridad (CSP) solo permite scripts de la propia app (`script-src 'self'`).
- **Excel sin fórmulas**: los datos van como texto o número, así que una observación no puede ejecutarse como fórmula al abrir el archivo.
- **Cabeceras de seguridad en Netlify** (archivo `_headers`): política de contenido (CSP), protección contra marcos (`frame-ancestors`), `nosniff` y política de referencia. La conexión va siempre por HTTPS.
- **Perfiles**: identifican quién registra, pero **no tienen contraseña**. Cualquiera con el celular desbloqueado puede entrar a un perfil; por eso se recomienda el bloqueo de pantalla del celular. (Un PIN por persona está en las próximas mejoras.)

---

## 🛠️ Tecnologías

| Tecnología        | Uso                                                              |
| ----------------- | ---------------------------------------------------------------- |
| HTML5             | Estructura y formulario con validación nativa                    |
| CSS3              | Diseño con variables, Flexbox y Grid; anillo de progreso con SVG |
| JavaScript (ES6+) | Lógica en **módulos** (`import`/`export`), separada en capas     |
| localStorage      | Guardado de turnos, usuarios y preferencias en el navegador      |
| IndexedDB         | Guardado de las fotos de comprobantes en el navegador            |
| Service Worker    | Funcionar sin internet (PWA)                                     |
| Netlify           | Publicación de prueba                                            |

---

## 📁 Estructura del proyecto

El código está separado en **capas**. Cada capa solo habla con la de abajo:

```
pantallas  →  servicios  →  datos  →  (celular hoy · API mañana)
 (lo que      (reglas:       (dónde se
  se ve)       KPI, OT,       guarda)
               descuentos)
```

```
PWA-Control/
├── index.html              # Estructura de todas las vistas
├── manifest.webmanifest    # Nombre, iconos y colores para instalar la app
├── sw.js                   # Service worker: funcionar sin internet
├── _headers                # Cabeceras de seguridad para Netlify
├── icons/
├── css/
│   ├── normalize.css       # Reinicio de estilos del navegador
│   └── styles.css          # Estilos de la app
└── js/
    ├── main.js             # Punto de entrada: arranca todo en orden
    ├── config.js           # Versión, meta del 80 % y fuente de datos (local / api)
    ├── tema-inicial.js     # Aplica el modo claro/oscuro antes de pintar
    ├── datos/              # DÓNDE se guardan los datos
    │   ├── index.js            # Elige el adaptador: local o API
    │   ├── adaptador-local.js  # localStorage (listar, obtener, crear, actualizar, eliminar)
    │   ├── adaptador-api.js    # Las mismas 5 funciones con fetch() (para la API futura)
    │   ├── almacen-local.js    # Claves de localStorage
    │   ├── fotos.js            # Fotos de comprobantes (IndexedDB)
    │   └── migraciones.js      # Convierte los datos de versiones anteriores
    ├── servicios/          # REGLAS del negocio (no tocan el HTML)
    │   ├── usuarios.js
    │   ├── turnos.js           # Turnos y eficiencia (KPI)
    │   ├── ot.js               # OT y sus estados
    │   └── descuentos.js       # Cálculo de lo que se descuenta
    ├── pantallas/          # Lo que SE VE (una por vista)
    │   ├── navegacion.js       # Cambia de vista según el "#" de la dirección
    │   ├── estado.js           # El mes que se está viendo
    │   ├── inicio.js · turnos.js · ot.js · descuentos.js
    │   ├── usuarios.js         # Carátula, registro y perfil
    │   ├── excel.js · copia.js · recordatorios.js · tema.js · pwa.js
    └── utilidades/         # Ayudas pequeñas: fechas, dinero, ids, zip...
```

**¿Y la API?** Cuando exista, se escribe su dirección en `js/config.js` (`URL_API`) y se cambia `FUENTE_DATOS` a `"api"`. Como `adaptador-api.js` tiene las mismas 5 funciones que el local, las pantallas y los servicios no cambian.

---

## 💻 Ejecutarla en tu computadora

Desde la 1.5.0 el JavaScript está en **módulos**, y los navegadores **no** cargan módulos si abres `index.html` con doble clic (`file://`). Hay que usar un servidor local:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Alberthluiiz/PWA-Control.git
   ```
2. Ábrelo con **Live Server** en VS Code (clic derecho en `index.html` → *Open with Live Server*), o en una terminal dentro de la carpeta:
   ```bash
   npx serve .
   ```
   y abre la dirección que te muestra (por ejemplo `http://localhost:3000`).

---

## 📌 Historial de versiones

| Versión | Cambios                                                                    |
| ------- | -------------------------------------------------------------------------- |
| 1.0.0   | Primera versión: registro de turnos, eficiencia del mes y exportar CSV     |
| 1.1.0   | Varias personas por celular y foto de perfil                               |
| 1.2.0   | Carátula de inicio y modo claro/oscuro                                     |
| 1.3.0   | Recordatorios opcionales de las 12:00 y las 23:50                          |
| 1.4.0   | Gráfico de cuadres y descuadres por estación                               |
| 1.4.1   | "Área de recaudo" y recordatorios con Google Calendar                      |
| 1.4.2   | Historial por mes, editar turno y foto del comprobante                     |
| 1.4.3   | Selector de mes en el historial y filtros Todos / Cuadres / Descuadres     |
| 1.4.4   | Copia de seguridad: guardar y restaurar                                    |
| 1.4.5   | Aviso claro cuando la copia está vacía                                     |
| 1.4.6   | Restaurar une los turnos con tu perfil y botón "Eliminar perfil"           |
| 1.4.7   | Botón "Tomar foto" con la cámara (perfil y comprobante)                    |
| 1.4.8   | Exportar a Excel con tabla de colores y fotos de los comprobantes          |
| 1.4.9   | Porcentaje con 2 decimales (se quitó en la 1.4.10)                         |
| 1.4.10  | Exportar Excel descarga directo y porcentaje sin decimales                 |
| 1.4.11  | Revisión de seguridad: fotos y copias revisadas, cabeceras en Netlify      |
| 1.5.0   | Código en módulos por capas, barra inferior, OT, descuentos, monto del descuadre y meta del 80 % |

---

## 🗺️ Próximas mejoras

- [x] **Funcionar sin conexión (PWA)**: instalarla en el celular y usarla sin internet.
- [x] **Perfil del auxiliar**: varias personas por celular, foto, cerrar sesión y eliminar perfil.
- [x] **Editar un turno** ya guardado.
- [x] **Foto del comprobante de depósito** en cada turno.
- [x] **Copia de seguridad**: guardar y restaurar turnos, perfiles y fotos en un archivo.
- [x] **Meta mensual del 80%**: mostrar si el mes cumple o no la meta.
- [x] **OT y descuentos** por descuadres.
- [ ] **API propia** para traer turnos, OT y descuentos sin escribirlos a mano.
- [ ] **PIN opcional por persona**, para que nadie más entre a tu perfil en un celular compartido.

---

## 👤 Autor

**Luis Alberto Guillén Yaucan**

GitHub: [@Alberthluiiz](https://github.com/Alberthluiiz)
