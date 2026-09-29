import { useEffect, useRef, useState } from "react";
import { IconoDescargar, IconoImagen } from "./Iconos.jsx";

// Herramienta "Preparar imagen" (Por armar, H10-bis): reemplaza el
// paso manual de InShot. Alejandro sube el PANTALLAZO COMPLETO del
// celular (con barra de estado, barra de navegación, fecha/hora,
// fila de íconos, todo) y esta herramienta:
//   1. Recorta arriba la barra de estado + la barra de navegación
//      (miden siempre lo mismo, sin importar el tuit).
//   2. Detecta automáticamente dónde termina el texto del tuit
//      (buscando franjas con letras vs. huecos en blanco) para
//      recortar abajo antes de la fecha, los íconos y todo lo demás.
//   3. Arma el cuadrado 1:1 con franjas blancas, sin deformar nada.
//   4. Tapa el logo "X.com", que siempre cae en la misma posición
//      relativa del encabezado.
// Todo corre en el navegador con <canvas>, no se sube a ningún
// servidor ni se guarda en la base de datos.
//
// La calibración de abajo está medida sobre pantallazos reales de
// Alejandro (mismo celular, misma app de X). Si algún día cambia de
// celular o la app le cambia el diseño, hay que volver a medir estos
// números con un pantallazo nuevo.

const LADO_CANVAS = 1080;

// Recorte superior fijo: barra de estado + barra de navegación,
// como fracción del alto TOTAL del pantallazo (esa parte de arriba
// siempre mide lo mismo, así el tuit tenga poco o mucho texto).
const RECORTE_SUPERIOR_FRAC = 0.1228;

// Para encontrar dónde termina el texto del tuit: se recorre fila
// por fila buscando cuáles tienen letras (píxeles oscuros) y cuáles
// están en blanco, y se agrupan en "bandas" de contenido.
const UMBRAL_OSCURO = 200; // luminancia por debajo de esto = "pixel oscuro" (letra)
const MIN_OSCUROS_FRAC = 0.0041; // fracción del ancho que debe ser oscura para que la fila cuente
const HUECO_MAX_FRAC = 0.019; // hueco entre bandas (fracción del alto) que todavía es "mismo párrafo"
const RELLENO_INFERIOR_FRAC = 0.0053; // margen que se deja después de la última línea de texto

// Posición del logo "X.com": X como fracción del ancho (no cambia
// con el largo del texto). Y como fracción del ANCHO (no del alto
// del recorte, que sí varía según cuánto texto tenga el tuit),
// porque el tamaño del encabezado escala con el ancho de la
// pantalla, no con la cantidad de texto.
const LOGO_X0_FRAC = 0.76;
const LOGO_X1_FRAC = 0.98;
const LOGO_Y0_FRAC_ANCHO = 0.0124;
const LOGO_Y1_FRAC_ANCHO = 0.0746;

export default function PrepararImagen({ nombreArchivo = "imagen-lista" }) {
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  function abrir() {
    setAbierto(true);
    setListo(false);
    // Se abre el selector de archivos apenas se muestra el panel.
    setTimeout(() => inputRef.current?.click(), 0);
  }

  // Mientras el panel está abierto, también acepta pegar una imagen
  // copiada (Ctrl+V, o "Pegar" del teclado), sin tener que abrir la
  // galería.
  useEffect(() => {
    if (!abierto) return;
    function alPegar(evento) {
      const items = evento.clipboardData?.items;
      if (!items) return;
      const item = Array.from(items).find((it) => it.type.startsWith("image/"));
      if (!item) return;
      evento.preventDefault();
      procesarArchivo(item.getAsFile());
    }
    window.addEventListener("paste", alPegar);
    return () => window.removeEventListener("paste", alPegar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    setListo(false);
  }

  function procesarArchivo(archivo) {
    if (!archivo) {
      setAbierto(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      dibujar(img);
      setListo(true);
    };
    img.src = URL.createObjectURL(archivo);
  }

  // Recorre las filas de una franja de la imagen y devuelve las
  // "bandas" de contenido: tramos [inicio, fin] donde hay filas con
  // suficientes píxeles oscuros seguidas, separados por huecos en
  // blanco.
  function detectarBandas(ctxOriginal, ancho, altoDesde, altoHasta) {
    const filas = altoHasta - altoDesde;
    if (filas <= 0) return [];
    const datos = ctxOriginal.getImageData(0, altoDesde, ancho, filas).data;
    const minOscuros = Math.max(3, Math.round(ancho * MIN_OSCUROS_FRAC));

    const conContenido = new Array(filas).fill(false);
    for (let fila = 0; fila < filas; fila++) {
      let oscuros = 0;
      const base = fila * ancho * 4;
      for (let col = 0; col < ancho; col++) {
        const i = base + col * 4;
        const luminancia = 0.299 * datos[i] + 0.587 * datos[i + 1] + 0.114 * datos[i + 2];
        if (luminancia < UMBRAL_OSCURO) {
          oscuros++;
          if (oscuros >= minOscuros) break;
        }
      }
      conContenido[fila] = oscuros >= minOscuros;
    }

    const bandas = [];
    let inicio = null;
    for (let fila = 0; fila < filas; fila++) {
      if (conContenido[fila] && inicio === null) {
        inicio = fila;
      } else if (!conContenido[fila] && inicio !== null) {
        bandas.push([inicio + altoDesde, fila - 1 + altoDesde]);
        inicio = null;
      }
    }
    if (inicio !== null) bandas.push([inicio + altoDesde, filas - 1 + altoDesde]);
    return bandas;
  }

  // A partir de las bandas detectadas, decide dónde recortar abajo:
  // la banda 0 es el encabezado (avatar + nombre + usuario + logo) y
  // la banda 1 es la primera línea de texto, esas dos siempre se
  // incluyen. De ahí en adelante se siguen sumando bandas mientras
  // el hueco con la anterior sea chico (más líneas del mismo
  // párrafo); apenas aparece un hueco grande (la fila de fecha e
  // íconos), se corta ahí.
  function calcularRecorteInferior(bandas, altoTotal, altoMaximo) {
    if (bandas.length === 0) return altoMaximo;
    if (bandas.length === 1) {
      return Math.min(altoMaximo, bandas[0][1] + Math.round(altoTotal * RELLENO_INFERIOR_FRAC));
    }
    let ultimaIncluida = bandas[1];
    const huecoMax = altoTotal * HUECO_MAX_FRAC;
    for (let i = 2; i < bandas.length; i++) {
      const hueco = bandas[i][0] - ultimaIncluida[1];
      if (hueco < huecoMax) {
        ultimaIncluida = bandas[i];
      } else {
        break;
      }
    }
    const conRelleno = ultimaIncluida[1] + Math.round(altoTotal * RELLENO_INFERIOR_FRAC);
    return Math.min(altoMaximo, conRelleno);
  }

  function dibujar(img) {
    // Canvas auxiliar (no se ve) con el pantallazo completo, para
    // poder leer sus píxeles y recortarlo.
    const canvasOriginal = document.createElement("canvas");
    canvasOriginal.width = img.width;
    canvasOriginal.height = img.height;
    const ctxOriginal = canvasOriginal.getContext("2d");
    ctxOriginal.drawImage(img, 0, 0);

    const recorteSuperior = Math.round(img.height * RECORTE_SUPERIOR_FRAC);
    const bandas = detectarBandas(ctxOriginal, img.width, recorteSuperior, img.height);
    const recorteInferior = calcularRecorteInferior(bandas, img.height, img.height);

    const anchoRecorte = img.width;
    const altoRecorte = Math.max(1, recorteInferior - recorteSuperior);

    const canvas = canvasRef.current;
    canvas.width = LADO_CANVAS;
    canvas.height = LADO_CANVAS;
    const ctx = canvas.getContext("2d");

    // Fondo blanco del cuadrado completo.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO_CANVAS, LADO_CANVAS);

    // Escala el recorte (ya sin barra de estado, sin fecha ni
    // íconos) para que quepa entero, centrado, con franjas blancas
    // donde sobre espacio.
    const escala = Math.min(LADO_CANVAS / anchoRecorte, LADO_CANVAS / altoRecorte);
    const anchoFinal = anchoRecorte * escala;
    const altoFinal = altoRecorte * escala;
    const offsetX = (LADO_CANVAS - anchoFinal) / 2;
    const offsetY = (LADO_CANVAS - altoFinal) / 2;

    ctx.drawImage(
      canvasOriginal,
      0,
      recorteSuperior,
      anchoRecorte,
      altoRecorte,
      offsetX,
      offsetY,
      anchoFinal,
      altoFinal
    );

    // Tapa el logo "X.com" del encabezado, ya trasladado a como
    // quedó dibujado el recorte.
    const x0 = offsetX + LOGO_X0_FRAC * anchoFinal;
    const x1 = offsetX + LOGO_X1_FRAC * anchoFinal;
    const y0 = offsetY + LOGO_Y0_FRAC_ANCHO * anchoFinal;
    const y1 = offsetY + LOGO_Y1_FRAC_ANCHO * anchoFinal;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  function descargar() {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${nombreArchivo}.png`;
      enlace.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <>
      <button onClick={abrir} className="btn btn-chico btn-secundario">
        <IconoImagen /> Preparar imagen
      </button>

      {abierto && (
        <div style={estiloModal}>
          <div style={estiloModalContenido}>
            <h2>Preparar imagen</h2>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(evento) => procesarArchivo(evento.target.files?.[0])}
            />

            {!listo && (
              <p style={{ fontSize: 14, opacity: 0.75 }}>
                Elige el pantallazo completo del tuit (tal como lo tomó el celular, sin
                recortar), o pégalo directo si ya lo copiaste (Ctrl+V, o "Pegar" del teclado)…
              </p>
            )}

            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                borderRadius: "var(--radio-chico)",
                display: listo ? "block" : "none",
                border: "1px solid var(--border)",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={cerrar} className="btn btn-chico btn-secundario" style={{ flex: 1 }}>
                Cerrar
              </button>
              {listo && (
                <button
                  onClick={descargar}
                  className="btn btn-chico btn-primario"
                  style={{ flex: 1 }}
                >
                  <IconoDescargar /> Descargar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const estiloModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,6,16,0.55)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  zIndex: 20,
};

const estiloModalContenido = {
  background: "var(--bg)",
  width: "100%",
  maxWidth: 480,
  borderRadius: "20px 20px 0 0",
  padding: 20,
  boxShadow: "var(--sombra-flotante)",
};
