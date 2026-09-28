import { useEffect, useRef } from "react";
import { IconoRecuperar } from "./Iconos.jsx";

// Aviso flotante tipo "snackbar" con botón Deshacer, que se cierra
// solo después de `duracionMs`. Se usa justo después de una decisión
// en Revisar, para poder arrepentirse sin ir hasta Guardadas.
export default function AvisoDeshacer({ mensaje, onDeshacer, onExpirar, duracionMs = 6000 }) {
  const temporizadorRef = useRef(null);

  useEffect(() => {
    temporizadorRef.current = setTimeout(onExpirar, duracionMs);
    return () => clearTimeout(temporizadorRef.current);
    // Un aviso nuevo (mensaje distinto) reinicia su propio temporizador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensaje]);

  return (
    <div style={estiloAviso}>
      <span>{mensaje}</span>
      <button
        onClick={() => {
          clearTimeout(temporizadorRef.current);
          onDeshacer();
        }}
        className="btn btn-chico"
        style={estiloBoton}
      >
        <IconoRecuperar style={{ width: 16, height: 16 }} /> Deshacer
      </button>
    </div>
  );
}

const estiloAviso = {
  position: "fixed",
  left: "50%",
  bottom: 76,
  transform: "translateX(-50%)",
  width: "calc(100% - 32px)",
  maxWidth: 448,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px 10px 16px",
  borderRadius: "var(--radio)",
  background: "var(--text-h)",
  color: "var(--bg)",
  boxShadow: "var(--sombra-flotante)",
  zIndex: 15,
  fontSize: 14,
  fontWeight: 600,
};

const estiloBoton = {
  background: "rgba(255,255,255,0.16)",
  color: "inherit",
  flex: "none",
};
