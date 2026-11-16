/* =========================================================
   EXPORTAR A EXCEL (.xlsx)
   =========================================================
   Un .xlsx es un ZIP con varios XML adentro: uno con las celdas, otro
   con los colores, otro con las fotos... Aquí armamos esos XML a mano
   y los metemos en un ZIP (utilidades/zip.js), sin internet y sin
   librerías. El reporte sale como TABLA: título, encabezados de color,
   bordes, filas alternadas, filtros, la foto del comprobante y, al
   final, el resumen de eficiencia y de descuentos.
   ========================================================= */
import { mesVisible } from "./estado.js";
import { turnosDelMes, resumenMes, formatoPorcentaje } from "../servicios/turnos.js";
import { misOT, ESTADOS_OT } from "../servicios/ot.js";
import { calcularMes } from "../servicios/descuentos.js";
import { usuarioActivo } from "../servicios/usuarios.js";
import { leerFoto } from "../datos/fotos.js";
import { crearZip } from "../utilidades/zip.js";
import { descargarArchivo } from "../utilidades/descargar.js";
import { fechaDeHoy, formatearFecha, mesesCompletos } from "../utilidades/fechas.js";
import { mismoId } from "../utilidades/ids.js";

/* ---------- 1. Ayudas para escribir XML ---------- */
// Escapar texto: "<", "&" y comillas romperían el XML
function textoXML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // invisibles no válidos
}

// Letra de la columna: 0 → "A", 8 → "I"
const letraColumna = (indice) => String.fromCharCode(65 + indice);

// Una celda. Los números van como número (Excel puede sumarlos);
// el texto va "en línea" (inlineStr) para no necesitar otra tabla.
function celdaXML(fila, columna, valor, estilo) {
  const ref = `${letraColumna(columna)}${fila}`;
  if (valor === null || valor === undefined || valor === "") return `<c r="${ref}" s="${estilo}"/>`;
  if (typeof valor === "number") return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${textoXML(valor)}</t></is></c>`;
}

/* ---------- 2. Colores y formatos ("Formato de celdas") ----------
   Cada número de ESTILO apunta a una fila de <cellXfs>. */
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
  dinero: 12, // número con 2 decimales: 0.45
  dineroAlterna: 13,
};
const alternar = (estilo, alterna) => (alterna ? ESTILO[`${estilo}Alterna`] : ESTILO[estilo]);

function estilosExcel() {
  const borde = '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>';
  const relleno = (color) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`;
  // xf(letra, relleno, borde, alineación, formato de número)
  //   numFmtId 2 es un formato que Excel ya trae: "0.00"
  const xf = (font, fill, border, alineacion = "", numero = 0) =>
    `<xf numFmtId="${numero}" fontId="${font}" fillId="${fill}" borderId="${border}" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${numero ? ' applyNumberFormat="1"' : ""}><alignment vertical="center" wrapText="1"${alineacion}/></xf>`;
  const centro = ' horizontal="center"';
  const derecha = ' horizontal="right"';
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
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
${xf(1, 2, 1, centro)}${xf(2, 3, 1, centro)}${xf(0, 0, 1)}${xf(0, 4, 1)}
${xf(3, 0, 1, centro)}${xf(3, 4, 1, centro)}${xf(4, 0, 1, centro)}${xf(4, 4, 1, centro)}
${xf(2, 5, 1)}${xf(0, 0, 1, centro)}${xf(0, 4, 1, centro)}
${xf(0, 0, 1, derecha, 2)}${xf(0, 4, 1, derecha, 2)}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/* ---------- 3. Foto del comprobante, pequeña ----------
   640 px: se ve bien al agrandarla y pesa unos 40-60 KB.
   Devuelve { bytes, ancho, alto } o null si no hay foto. */
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
    return { bytes: new Uint8Array(await blob.arrayBuffer()), ancho: lienzo.width, alto: lienzo.height };
  } catch {
    return null; // si una foto falla, el reporte sale igual sin ella
  }
}

// Texto de la columna "Código OT / Observación":
//   "OT-123456 (válida) · Error operativo"
function textoOTyObservacion(turno, susOT) {
  const ots = susOT.map((ot) => `${ot.numero} (${ESTADOS_OT[ot.estado].texto.toLowerCase()})`).join(", ");
  return [ots, turno.observacion].filter(Boolean).join(" · ");
}

/* ---------- 4. Armar el libro ---------- */
async function exportarExcel(boton) {
  const { anio, mes } = mesVisible;
  const nombreMes = `${mesesCompletos[mes]} ${anio}`;

  // a) Turnos del mes, del MÁS ANTIGUO al más reciente
  const turnos = (await turnosDelMes(anio, mes)).sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || String(a.creado).localeCompare(String(b.creado)),
  );
  if (turnos.length === 0) {
    alert(`No hay turnos registrados en ${nombreMes}.`);
    return;
  }

  boton.disabled = true; // mientras se preparan las fotos
  try {
    const resumen = resumenMes(turnos);
    const descuentos = await calcularMes(anio, mes);
    const todasOT = await misOT();
    const fotos = await Promise.all(turnos.map(fotoParaExcel));

    // b) Filas de la hoja. Cada fila: { numero, alto?, celdas: [xml...] }
    const filas = [];
    const combinadas = []; // celdas unidas, ej. "A1:I1"
    const ULTIMA = "I"; // 9 columnas: A..I
    const COLUMNA_FOTO = 8; // I

    // Título (fila 1) y datos del reporte (filas 2 a 4)
    filas.push({ numero: 1, alto: 30, celdas: [celdaXML(1, 0, `CONTROL DE CUADRES DE CAJA · ${nombreMes.toUpperCase()}`, ESTILO.titulo)] });
    combinadas.push(`A1:${ULTIMA}1`);
    [
      ["Auxiliar", usuarioActivo()?.nombre ?? ""],
      ["Mes", nombreMes],
      ["Generado", formatearFecha(fechaDeHoy())],
    ].forEach(([etiqueta, valor], i) => {
      const n = 2 + i;
      filas.push({ numero: n, celdas: [celdaXML(n, 0, etiqueta, ESTILO.etiqueta), celdaXML(n, 1, valor, ESTILO.texto), celdaXML(n, 2, "", ESTILO.texto)] });
      combinadas.push(`B${n}:C${n}`);
    });

    // Encabezados de la tabla (fila 6)
    const FILA_ENCABEZADO = 6;
    const titulos = ["N°", "Fecha", "Estación", "Tipo de turno", "Resultado", "Diferencia", "Monto ($)", "Código OT / Observación", "Comprobante"];
    filas.push({ numero: FILA_ENCABEZADO, alto: 22, celdas: titulos.map((t, c) => celdaXML(FILA_ENCABEZADO, c, t, ESTILO.encabezado)) });

    // Una fila por turno; las pares llevan fondo
    const dibujos = []; // fotos a colocar: { fila, foto, ancho, alto, margen }
    turnos.forEach((turno, i) => {
      const n = FILA_ENCABEZADO + 1 + i;
      const alterna = i % 2 === 1;
      const cuadrada = turno.resultado === "cuadrada";
      const foto = fotos[i];
      const observacion = textoOTyObservacion(turno, todasOT.filter((ot) => mismoId(ot.turnoId, turno.id)));

      // Alto de la fila (en puntos). Se fija siempre: si Excel lo calculara
      // solo, las fotos de abajo quedarían corridas.
      //   ~34 letras por línea en la columna de observación, 15 pt por línea.
      const lineas = Math.max(1, Math.ceil(observacion.length / 34));
      let alto = Math.max(20, lineas * 15 + 5);

      // Foto dentro de la celda: máximo 120 x 90 píxeles, centrada
      // (la columna del comprobante mide unos 131 píxeles)
      if (foto) {
        const escala = Math.min(120 / foto.ancho, 90 / foto.alto);
        const ancho = Math.round(foto.ancho * escala);
        const altoFoto = Math.round(foto.alto * escala);
        const margen = Math.max(4, Math.round((131 - ancho) / 2));
        dibujos.push({ fila: n, foto, ancho, alto: altoFoto, margen });
        alto = Math.max(alto, Math.round((altoFoto + 8) * 0.75)); // px → puntos
      }

      const diferencia = cuadrada ? "" : turno.tipoDiferencia === "sobrante" ? "Sobrante" : turno.tipoDiferencia === "faltante" ? "Faltante" : "";
      // El monto va como NÚMERO en dólares (0.45) para poder sumarlo en Excel
      const monto = !cuadrada && turno.montoCentavos ? turno.montoCentavos / 100 : "";

      filas.push({
        numero: n,
        alto,
        celdas: [
          celdaXML(n, 0, i + 1, alternar("centrado", alterna)),
          celdaXML(n, 1, formatearFecha(turno.fecha), alternar("centrado", alterna)),
          celdaXML(n, 2, turno.estacion, alternar("texto", alterna)),
          celdaXML(n, 3, turno.turno === "fijo" ? "Fijo" : "Reserva", alternar("centrado", alterna)),
          celdaXML(n, 4, cuadrada ? "Cuadrada" : "Descuadre", alternar(cuadrada ? "cuadrada" : "descuadre", alterna)),
          celdaXML(n, 5, diferencia, alternar("centrado", alterna)),
          celdaXML(n, 6, monto, alternar("dinero", alterna)),
          celdaXML(n, 7, observacion, alternar("texto", alterna)),
          celdaXML(n, 8, foto ? "" : "Sin foto", alternar("centrado", alterna)),
        ],
      });
    });
    const ultimaFilaDatos = FILA_ENCABEZADO + turnos.length;

    // c) Resúmenes al final, uno al lado del otro:
    //    eficiencia en A..C y descuentos en E..G
    const FILA_RESUMEN = ultimaFilaDatos + 2;
    const eficiencia = [
      ["Turnos", resumen.total],
      ["Cuadrados", resumen.cuadrados],
      ["Descuadres", resumen.descuadres],
      ["Eficiencia", formatoPorcentaje(resumen.porcentaje)],
    ];
    const dinero = [
      ["A descontar", descuentos.aDescontar],
      ["En revisión (OT pendiente)", descuentos.enRevision],
      ["Justificado (OT válida)", descuentos.justificado],
      ["Ya descontado en rol", descuentos.yaDescontado],
      ["Saldo a descontar", descuentos.saldo],
    ];
    const encabezadoResumen = [
      celdaXML(FILA_RESUMEN, 0, "EFICIENCIA", ESTILO.encabezado),
      celdaXML(FILA_RESUMEN, 1, "", ESTILO.encabezado),
      celdaXML(FILA_RESUMEN, 2, "", ESTILO.encabezado),
      celdaXML(FILA_RESUMEN, 4, "DESCUENTOS", ESTILO.encabezado),
      celdaXML(FILA_RESUMEN, 5, "", ESTILO.encabezado),
      celdaXML(FILA_RESUMEN, 6, "", ESTILO.encabezado),
    ];
    filas.push({ numero: FILA_RESUMEN, celdas: encabezadoResumen });
    combinadas.push(`A${FILA_RESUMEN}:C${FILA_RESUMEN}`, `E${FILA_RESUMEN}:G${FILA_RESUMEN}`);

    for (let i = 0; i < Math.max(eficiencia.length, dinero.length); i++) {
      const n = FILA_RESUMEN + 1 + i;
      const celdas = [];
      if (eficiencia[i]) {
        celdas.push(celdaXML(n, 0, eficiencia[i][0], ESTILO.etiqueta), celdaXML(n, 1, "", ESTILO.etiqueta), celdaXML(n, 2, eficiencia[i][1], ESTILO.centrado));
        combinadas.push(`A${n}:B${n}`);
      }
      if (dinero[i]) {
        celdas.push(celdaXML(n, 4, dinero[i][0], ESTILO.etiqueta), celdaXML(n, 5, "", ESTILO.etiqueta), celdaXML(n, 6, dinero[i][1] / 100, ESTILO.dinero));
        combinadas.push(`E${n}:F${n}`);
      }
      filas.push({ numero: n, celdas });
    }

    // d) La hoja (sheet1.xml)
    const anchos = [6, 12, 22, 13, 13, 11, 11, 36, 18]; // ancho de cada columna (A..I)
    const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${FILA_ENCABEZADO}" topLeftCell="A${FILA_ENCABEZADO + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18" customHeight="1"/>
<cols>${anchos.map((a, c) => `<col min="${c + 1}" max="${c + 1}" width="${a}" customWidth="1"/>`).join("")}</cols>
<sheetData>${filas.map((f) => `<row r="${f.numero}"${f.alto ? ` ht="${f.alto}" customHeight="1"` : ""}>${f.celdas.join("")}</row>`).join("")}</sheetData>
<autoFilter ref="A${FILA_ENCABEZADO}:${ULTIMA}${ultimaFilaDatos}"/>
<mergeCells count="${combinadas.length}">${combinadas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
${dibujos.length ? '<drawing r:id="rId1"/>' : ""}
</worksheet>`;

    // e) Las fotos: cada una se "ancla" en la columna del comprobante.
    //    Excel mide en EMU: 1 píxel = 9525 EMU.
    const EMU = 9525;
    const dibujo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${dibujos
      .map(
        (d, i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${COLUMNA_FOTO}</xdr:col><xdr:colOff>${d.margen * EMU}</xdr:colOff><xdr:row>${d.fila - 1}</xdr:row><xdr:rowOff>${4 * EMU}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${COLUMNA_FOTO}</xdr:col><xdr:colOff>${(d.margen + d.ancho) * EMU}</xdr:colOff><xdr:row>${d.fila - 1}</xdr:row><xdr:rowOff>${(4 + d.alto) * EMU}</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Comprobante ${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${d.ancho * EMU}" cy="${d.alto * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`,
      )
      .join("")}</xdr:wsDr>`;

    // f) Todos los archivos del .xlsx
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
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL}"><sheets><sheet name="Cuadres" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Cuadres!$A$${FILA_ENCABEZADO}:$${ULTIMA}$${ultimaFilaDatos}</definedName></definedNames></workbook>`,
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

    // g) Descargar: cuadres-2026-10.xlsx
    const libro = crearZip(archivos, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    descargarArchivo(libro, `cuadres-${anio}-${String(mes + 1).padStart(2, "0")}.xlsx`);
  } finally {
    boton.disabled = false;
  }
}

// Hay dos botones "Exportar Excel" (Turnos y Descuentos): los dos
// exportan el mes que se está viendo.
document.querySelectorAll("[data-exportar-excel]").forEach((boton) => {
  boton.addEventListener("click", () => exportarExcel(boton));
});
