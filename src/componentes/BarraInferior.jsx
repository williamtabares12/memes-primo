import { Link, useLocation } from "react-router-dom";
import {
  IconoElegir,
  IconoGuardar,
  IconoLista,
  IconoSubir,
} from "./Iconos.jsx";

// Barra de navegación fija abajo, como en una app de celular, para
// no depender de que cada quien recuerde/escriba la URL de cada
// pantalla. Las pestañas dependen del usuario: Alejandro sube y
// arma, David revisa, guarda y arma.

const PESTANAS_POR_USUARIO = {
  alejandro: [
    { ruta: "/subir", etiqueta: "Subir", Icono: IconoSubir },
    { ruta: "/armar", etiqueta: "Por armar", Icono: IconoLista },
  ],
  david: [
    { ruta: "/revisar", etiqueta: "Revisar", Icono: IconoElegir },
    { ruta: "/guardadas", etiqueta: "Guardadas", Icono: IconoGuardar },
    { ruta: "/armar", etiqueta: "Por armar", Icono: IconoLista },
  ],
};

export default function BarraInferior({ usuario, codigo }) {
  const location = useLocation();
  const pestanas = PESTANAS_POR_USUARIO[usuario];
  if (!pestanas || !codigo) return null;

  return (
    <nav style={estiloBarra}>
      {pestanas.map(({ ruta, etiqueta, Icono }) => {
        const activa = location.pathname === ruta;
        return (
          <Link
            key={ruta}
            to={`${ruta}?codigo=${encodeURIComponent(codigo)}`}
            style={{ ...estiloPestana, color: activa ? "var(--accent)" : "var(--text)" }}
          >
            <Icono style={{ opacity: activa ? 1 : 0.75 }} />
            <span style={{ fontSize: 11, fontWeight: activa ? 700 : 600 }}>{etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const estiloBarra = {
  position: "fixed",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 480,
  display: "flex",
  background: "var(--bg-elevada)",
  borderTop: "1px solid var(--border)",
  boxShadow: "var(--sombra-flotante)",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
  zIndex: 10,
};

const estiloPestana = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "10px 0 8px",
  textDecoration: "none",
};
