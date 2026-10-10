import { Link, useLocation } from "react-router-dom";
import {
  IconoElegir,
  IconoGuardar,
  IconoImagen,
  IconoLista,
  IconoReloj,
  IconoSubir,
} from "./Iconos.jsx";

// Preselección reutiliza el ícono de "Elegir": ambas pantallas son
// "decidir sí/no sobre una imagen", solo que en momentos distintos
// del flujo.

// Barra de navegación fija abajo, como en una app de celular, para
// no depender de que cada quien recuerde/escriba la URL de cada
// pantalla. Las pestañas dependen del usuario: Alejandro sube y
// arma, David revisa, guarda y arma, Wilson sube y arma lo suyo.

const PESTANAS_POR_USUARIO = {
  alejandro: [
    { ruta: "/subir", etiqueta: "Subir", Icono: IconoSubir },
    { ruta: "/preseleccion", etiqueta: "Preselección", Icono: IconoElegir },
    { ruta: "/armar", etiqueta: "Por armar", Icono: IconoLista },
    { ruta: "/directas", etiqueta: "Directas", Icono: IconoReloj },
    { ruta: "/tarjeta-libre", etiqueta: "Tarjeta", Icono: IconoImagen },
  ],
  wilson: [
    { ruta: "/subir", etiqueta: "Subir", Icono: IconoSubir },
    { ruta: "/armar", etiqueta: "Por armar", Icono: IconoLista },
    { ruta: "/tarjeta-libre", etiqueta: "Tarjeta", Icono: IconoImagen },
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
            style={{ ...estiloPestana, color: activa ? "var(--enlace)" : "var(--text)" }}
          >
            <Icono style={{ opacity: activa ? 1 : 0.75 }} />
            <span style={{ fontSize: pestanas.length > 4 ? 10 : 11, fontWeight: activa ? 600 : 400 }}>
              {etiqueta}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Barra inferior traslúcida: vidrio esmerilado con filete fino arriba,
// sin sombra ni esquinas redondeadas.
const estiloBarra = {
  position: "fixed",
  left: "50%",
  bottom: 0,
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: 480,
  display: "flex",
  background: "color-mix(in srgb, var(--bg-elevada) 88%, transparent)",
  backdropFilter: "saturate(180%) blur(20px)",
  WebkitBackdropFilter: "saturate(180%) blur(20px)",
  borderTop: "1px solid var(--border-suave)",
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
