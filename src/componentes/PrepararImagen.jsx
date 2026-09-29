import { useRef, useState } from "react";
import { IconoDescargar, IconoImagen } from "./Iconos.jsx";

// Herramienta "Preparar imagen" (Por armar, H10-bis): reemplaza el
// paso manual de InShot. Alejandro toma el pantallazo del tuit ya
// publicado y esta herramienta arma el cuadrado 1:1 (con franjas
// blancas, sin recortar nada) y tapa el logo "X.com" que ponen las
// capturas de tuit, siempre en la misma posición relativa arriba a
// la derecha. Todo corre en el navegador con <canvas>, no se sube a
// ningún servidor ni se guarda en la base de datos.

const LADO_CANVAS = 1080;

// Posición del logo "X.com", como fracción del ancho/alto de la
// captura ORIGINAL (medida sobre un pantallazo real de referencia,
// con margen de sobra porque el logo siempre cae en el mismo sitio
// de la plantilla que usa el primo para las capturas de tuit).
const LOGO_FRACCION = { x0: 0.76, y0: 0.05, x1: 0.98, y1: 0.2 };

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

  function dibujar(img) {
    const canvas = canvasRef.current;
    canvas.width = LADO_CANVAS;
    canvas.height = LADO_CANVAS;
    const ctx = canvas.getContext("2d");

    // Fondo blanco del cuadrado completo.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO_CANVAS, LADO_CANVAS);

    // Escala la captura completa para que quepa entera (sin
    // recortar), centrada, con franjas blancas donde sobre espacio.
    const escala = Math.min(LADO_CANVAS / img.width, LADO_CANVAS / img.height);
    const anchoFinal = img.width * escala;
    const altoFinal = img.height * escala;
    const offsetX = (LADO_CANVAS - anchoFinal) / 2;
    const offsetY = (LADO_CANVAS - altoFinal) / 2;
    ctx.drawImage(img, offsetX, offsetY, anchoFinal, altoFinal);

    // Tapa el logo "X.com", en la misma posición relativa de la
    // captura original, ya trasladada a como quedó dibujada.
    const x0 = offsetX + LOGO_FRACCION.x0 * anchoFinal;
    const y0 = offsetY + LOGO_FRACCION.y0 * altoFinal;
    const x1 = offsetX + LOGO_FRACCION.x1 * anchoFinal;
    const y1 = offsetY + LOGO_FRACCION.y1 * altoFinal;
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
              <p style={{ fontSize: 14, opacity: 0.75 }}>Elige el pantallazo del tuit…</p>
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
