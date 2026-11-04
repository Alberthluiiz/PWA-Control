# Control de Cuadres

Aplicación web progresiva (PWA) que funciona sin conexión para registrar los cuadres de caja de cada turno, ver la eficiencia del mes y exportar el historial. Pensada para los **auxiliares de venta**.

**Versión actual:** 1.4.11

> 🔒 **Estado:** uso privado de prueba mientras la propuesta se revisa y se autoriza de forma institucional. No está publicada para uso general.

Proyecto personal hecho con HTML, CSS y JavaScript puro (sin frameworks ni servidor propio).

---

## ✨ Funcionalidades

### 👥 Personas y perfil

- **Varias personas en el mismo celular**: cada auxiliar se registra con su nombre o nickname (sin correo ni contraseña) y ve **solo sus turnos**, su eficiencia y su reporte.
- **Avatar como en WhatsApp**: las iniciales sobre un color, o una **foto opcional** que se recorta y se achica sola para no llenar la memoria. La foto se puede **tomar con la cámara** en ese momento o elegir de la **galería**.
- **Carátula de inicio**: la lista de personas para entrar, la versión de la app y el autor.
- **Cerrar sesión** para volver a la pantalla "¿Quién va a registrar?".
- **Eliminar perfil**: borra un perfil que ya no se use. Si tiene turnos, **primero se pasan a otro perfil** para no perderlos. Si es el único perfil, pide confirmar dos veces.
- **Modo claro y modo oscuro** con el botón del sol/luna. La elección se recuerda. Si no eliges ninguno, la app usa el modo del celular.

### 📝 Registro de turnos

- **Registrar turnos** con fecha, estación, tipo de turno (Fijo / Reserva), resultado (Cuadrada / No cuadrada) y un código OT u observación opcional.
- **Foto del comprobante de depósito** (opcional) en cada turno: con **Tomar foto** se abre la cámara del celular para fotografiarlo al instante, o se elige de la **Galería**. Se achica sola y se guarda en el celular, sin internet. Se puede ver y descargar desde el historial.
- **Editar o eliminar registros**: el lápiz carga el turno en el formulario para corregirlo, y la papelera lo elimina después de pedir confirmación.
- **Fecha en formato dd/mm/aaaa** en cualquier celular, sin importar su idioma.

### 📊 Eficiencia e historial

- **Eficiencia del mes**: un anillo de progreso muestra el porcentaje de turnos cuadrados (cuadrados ÷ total × 100), redondeado y **sin decimales** (12 de 13 = 92,31 → **92%**), junto con los contadores de turnos, cuadrados y descuadres.
- **Área de recaudo**: un gráfico de columnas con los turnos de cada estación en el mes. Muestra sus siglas (QU, MV, SO…), los cuadrados en verde y los descuadres en naranja, de mayor a menor.
- **Navegar entre meses** con las flechas ‹ › para revisar meses anteriores.
- **Historial por mes**: muestra solo los turnos del mes elegido, con sus propias flechas ‹ ›, del más reciente al más antiguo.
- **Filtros**: Todos, Cuadres y Descuadres.
- **Exportar a Excel (.xlsx)** el mes seleccionado como una tabla lista para imprimir: título de color, encabezados con filtros, bordes, filas alternadas, resultado en verde o naranja, la **foto del comprobante** en cada fila y un resumen al final. Se arma en el celular, sin internet. El archivo se guarda directo en **Descargas**.

### 🔔 Recordatorios (opcionales)

- Cada persona puede agregar a su calendario un **aviso diario de turno a las 12:00** y otro para **registrar el turno a las 23:50**, durante 1 semana o 1 mes.
- Con **Google** se abre Google Calendar con el aviso listo. Con **Otro (iPhone)** se descarga un archivo de calendario.
- Avisan aunque la app esté cerrada y sin internet.

### 💾 Copia de seguridad

- **Guardar copia** descarga un archivo `.json` con los turnos, las personas y las fotos de los comprobantes.
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
3. Si hubo novedad, escribe el código OT o una observación corta. También puedes adjuntar la foto del comprobante.
4. Pulsa **Guardar turno**: el registro aparece en el historial y la eficiencia se actualiza.
5. Al cerrar el mes, pulsa **Exportar Excel** para descargar el reporte.
6. De vez en cuando, entra a tu perfil y toca **Guardar copia** para tener un respaldo.

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
- **Excel sin fórmulas**: los datos van como texto o número, así que una observación no puede ejecutarse como fórmula al abrir el archivo.
- **Cabeceras de seguridad en Netlify** (archivo `_headers`): política de contenido (CSP), protección contra marcos (`frame-ancestors`), `nosniff` y política de referencia. La conexión va siempre por HTTPS.
- **Perfiles**: identifican quién registra, pero **no tienen contraseña**. Cualquiera con el celular desbloqueado puede entrar a un perfil; por eso se recomienda el bloqueo de pantalla del celular. (Un PIN por persona está en las próximas mejoras.)

---

## 🛠️ Tecnologías

| Tecnología        | Uso                                                              |
| ----------------- | ---------------------------------------------------------------- |
| HTML5             | Estructura y formulario con validación nativa                    |
| CSS3              | Diseño con variables, Flexbox y Grid; anillo de progreso con SVG |
| JavaScript (ES6+) | Lógica, manejo del DOM y delegación de eventos                   |
| localStorage      | Guardado de turnos, usuarios y preferencias en el navegador      |
| IndexedDB         | Guardado de las fotos de comprobantes en el navegador            |
| Service Worker    | Funcionar sin internet (PWA)                                     |
| Netlify           | Publicación de prueba                                            |

---

## 📁 Estructura del proyecto

```
Control-de-Cuadres-Info/
├── index.html            # Estructura de la página
├── manifest.webmanifest  # Nombre, iconos y colores para instalar la app
├── sw.js                 # Service worker: funcionar sin internet
├── _headers              # Cabeceras de seguridad para Netlify
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   ├── normalize.css     # Reinicio de estilos del navegador
│   └── styles.css        # Estilos de la app
└── js/
    └── app.js            # Toda la lógica (con comentarios en español)
```

---

## 💻 Ejecutarla en tu computadora

No necesita instalación:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Alberthluiiz/Control-de-Cuadres-Info.git
   ```
2. Abre `index.html` en el navegador.

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

---

## 🗺️ Próximas mejoras

- [x] **Funcionar sin conexión (PWA)**: instalarla en el celular y usarla sin internet.
- [x] **Perfil del auxiliar**: varias personas por celular, foto, cerrar sesión y eliminar perfil.
- [x] **Editar un turno** ya guardado.
- [x] **Foto del comprobante de depósito** en cada turno.
- [x] **Copia de seguridad**: guardar y restaurar turnos, perfiles y fotos en un archivo.
- [ ] **Meta mensual del 80%**: mostrar si el mes cumple o no la meta.
- [ ] **PIN opcional por persona**, para que nadie más entre a tu perfil en un celular compartido.

---

## 👤 Autor

**Luis Alberto Guillén Yaucan**

GitHub: [@Alberthluiiz](https://github.com/Alberthluiiz)
