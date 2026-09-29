import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import { IconoCheck, IconoDescartar } from "../componentes/Iconos.jsx";

// Pantalla Preselección (solo Alejandro). Lo que importa Reddit cae
// acá primero, escondido de David (ver importar-reddit-background.mts
// y triage-imagen.mts): una imagen a la vez, Descartar la borra del
// todo, Usar la manda a Revisar con fuente "Páginas varias".

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

export default function Preseleccion() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [imagen, setImagen] = useState(null);
  const [restantes, setRestantes] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarSiguiente = useCallback(async () => {
    const respuesta = await fetch(
      `/.netlify/functions/imagenes-pendientes-triage?codigo=${encodeURIComponent(codigo)}`
    );
    if (!respuesta.ok) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    const datos = await respuesta.json();
    setImagen(datos.imagen);
    setRestantes(datos.restantes);
    setEstado(ESTADO_LISTO);
  }, [codigo]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargarSiguiente();
  }, [codigo, cargarSiguiente]);

  async function decidir(accion) {
    if (!imagen) return;
    setCargando(true);
    setError("");
    const respuesta = await fetch("/.netlify/functions/triage-imagen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagen.id, accion }),
    });
    if (!respuesta.ok && respuesta.status !== 409) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo guardar.");
      setCargando(false);
      return;
    }
    await cargarSiguiente();
    setCargando(false);
  }

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }
  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona o no es el de preselección.</p>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <div className="barra-superior">
        <h1>Preselección</h1>
        <div className="contador">{restantes} por revisar</div>
      </div>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: -6 }}>
        Lo que apruebes acá pasa a Revisar como "Páginas varias". Lo que descartes
        se borra del todo, nadie más lo ve.
      </p>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      {!imagen && <p>No hay nada pendiente por ahora.</p>}

      {imagen && (
        <div className="tarjeta" style={{ padding: 10 }}>
          <img
            src={imagen.url_ver}
            alt="Candidato de Preselección"
            style={{ width: "100%", display: "block", borderRadius: "var(--radio-chico)" }}
          />
          {imagen.texto && (
            <p style={{ fontSize: 13, opacity: 0.7, margin: "8px 0 0" }}>{imagen.texto}</p>
          )}
        </div>
      )}

      {imagen && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => decidir("descartar")}
            disabled={cargando}
            className="btn btn-grande btn-peligro"
            style={{ flex: 1 }}
          >
            <IconoDescartar /> Descartar
          </button>
          <button
            onClick={() => decidir("aprobar")}
            disabled={cargando}
            className="btn btn-grande btn-primario"
            style={{ flex: 1 }}
          >
            <IconoCheck /> Usar
          </button>
        </div>
      )}

      <BarraInferior usuario="alejandro" codigo={codigo} />
    </Pantalla>
  );
}
