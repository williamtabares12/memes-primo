import { useRef, useState } from "react";
import { IconoDescargar, IconoImagen } from "./Iconos.jsx";

// Herramienta "Generar tarjeta" (Por armar, H10-ter): reemplaza a
// "Preparar imagen". Ya no hace falta publicar en X para conseguir la
// tarjetita con formato de tuit (avatar, nombre, usuario, texto):
// esta herramienta la dibuja directo con <canvas>, usando la
// identidad de tuit guardada en la página (nombre_tuit, usuario_tuit,
// avatar_url), en cuadrado 1:1 con franjas blancas. Todo corre en el
// navegador, no se sube a ningún servidor ni se guarda en la base de
// datos.

const LADO_CANVAS = 1080;
const ANCHO_CONTENIDO = 1000;
const PADDING = 44;
const AVATAR_DIAM = 96;
const ALTO_LINEA_TEXTO = 58;

const FUENTE_NOMBRE = "700 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FUENTE_USUARIO = "36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FUENTE_TEXTO = "44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function envolverTexto(ctx, texto, maxAncho) {
  if (texto.trim() === "") return [""];
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(prueba).width > maxAncho) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function cargarImagen(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function GenerarTarjeta({ texto, nombreTuit, usuarioTuit, avatarUrl, nombreArchivo = "tarjeta" }) {
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);
  const [textoEditado, setTextoEditado] = useState(texto || "");
  const canvasRef = useRef(null);
  const avatarImgRef = useRef(null);

  async function abrir() {
    setAbierto(true);
    setListo(false);
    setTextoEditado(texto || "");
    avatarImgRef.current = await cargarImagen(avatarUrl);
    dibujar(avatarImgRef.current, texto || "");
    setListo(true);
  }

  function cambiarTexto(valor) {
    setTextoEditado(valor);
    dibujar(avatarImgRef.current, valor);
  }

  function cerrar() {
    setAbierto(false);
    setListo(false);
  }

  function dibujar(avatarImg, textoAUsar) {
    const medidor = document.createElement("canvas").getContext("2d");
    medidor.font = FUENTE_TEXTO;
    const maxAnchoTexto = ANCHO_CONTENIDO - PADDING * 2;
    const lineas = [];
    (textoAUsar || "").split("\n").forEach((parrafo) => {
      lineas.push(...envolverTexto(medidor, parrafo, maxAnchoTexto));
    });

    const anchoHeaderTexto = ANCHO_CONTENIDO - PADDING - (PADDING + AVATAR_DIAM + 20);
    const nombreCorto = medidor.measureText(nombreTuit || "").width > anchoHeaderTexto;

    const altoHeader = PADDING + AVATAR_DIAM + 36;
    const altoTexto = lineas.length * ALTO_LINEA_TEXTO;
    const altoContenido = altoHeader + altoTexto + PADDING;

    const contenido = document.createElement("canvas");
    contenido.width = ANCHO_CONTENIDO;
    contenido.height = altoContenido;
    const cctx = contenido.getContext("2d");
    cctx.fillStyle = "#ffffff";
    cctx.fillRect(0, 0, contenido.width, contenido.height);

    const cx = PADDING + AVATAR_DIAM / 2;
    const cy = PADDING + AVATAR_DIAM / 2;
    if (avatarImg) {
      cctx.save();
      cctx.beginPath();
      cctx.arc(cx, cy, AVATAR_DIAM / 2, 0, Math.PI * 2);
      cctx.closePath();
      cctx.clip();
      cctx.drawImage(avatarImg, PADDING, PADDING, AVATAR_DIAM, AVATAR_DIAM);
      cctx.restore();
    } else {
      cctx.fillStyle = "#cbd5e1";
      cctx.beginPath();
      cctx.arc(cx, cy, AVATAR_DIAM / 2, 0, Math.PI * 2);
      cctx.fill();
    }

    const textoHeaderX = PADDING + AVATAR_DIAM + 20;
    cctx.textBaseline = "top";
    cctx.fillStyle = "#0f1419";
    cctx.font = FUENTE_NOMBRE;
    cctx.fillText(nombreTuit || "", textoHeaderX, PADDING - 2, nombreCorto ? anchoHeaderTexto : undefined);
    cctx.fillStyle = "#536471";
    cctx.font = FUENTE_USUARIO;
    cctx.fillText(usuarioTuit || "", textoHeaderX, PADDING + 48);

    cctx.fillStyle = "#0f1419";
    cctx.font = FUENTE_TEXTO;
    let y = altoHeader;
    lineas.forEach((linea) => {
      cctx.fillText(linea, PADDING, y);
      y += ALTO_LINEA_TEXTO;
    });

    const canvas = canvasRef.current;
    canvas.width = LADO_CANVAS;
    canvas.height = LADO_CANVAS;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO_CANVAS, LADO_CANVAS);

    const escala = Math.min(LADO_CANVAS / contenido.width, LADO_CANVAS / contenido.height);
    const anchoFinal = contenido.width * escala;
    const altoFinal = contenido.height * escala;
    const offsetX = (LADO_CANVAS - anchoFinal) / 2;
    const offsetY = (LADO_CANVAS - altoFinal) / 2;
    ctx.drawImage(contenido, offsetX, offsetY, anchoFinal, altoFinal);
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
        <IconoImagen /> Generar tarjeta
      </button>

      {abierto && (
        <div style={estiloModal}>
          <div style={estiloModalContenido}>
            <h2>Generar tarjeta</h2>

            {!listo && <p style={{ fontSize: 14, opacity: 0.75 }}>Armando la tarjeta…</p>}
            {listo && !nombreTuit && !usuarioTuit && (
              <p style={{ fontSize: 13, color: "var(--error)" }}>
                A esta página aún no se le cargó nombre_tuit / usuario_tuit / avatar_url en
                Supabase, así que sale sin esos datos.
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

            {listo && (
              <textarea
                value={textoEditado}
                onChange={(evento) => cambiarTexto(evento.target.value)}
                rows={3}
                placeholder="Texto del meme…"
                style={{ width: "100%", marginTop: 10 }}
              />
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={cerrar} className="btn btn-chico btn-secundario" style={{ flex: 1 }}>
                Cerrar
              </button>
              {listo && (
                <button onClick={descargar} className="btn btn-chico btn-primario" style={{ flex: 1 }}>
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
