import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import {
  IconoDescartar,
  IconoElegir,
  IconoGuardar,
} from "../componentes/Iconos.jsx";

// Pantalla Revisar (David, celular). Una imagen a la vez, con la
// fuente arriba, el texto editable y tres botones grandes: Descartar,
// Guardar, Elegir. H3, H4, H5 (guardar/descartar en detalle vive en
// la pantalla de Guardadas y descartadas) y H8 (aviso de repetido).

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

export default function Revisar() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [imagen, setImagen] = useState(null);
  const [restantes, setRestantes] = useState(0);
  const [paginas, setPaginas] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargandoDecision, setCargandoDecision] = useState(false);
  const [error, setError] = useState("");

  const [mostrarPaginas, setMostrarPaginas] = useState(false);
  // Mapa id de página -> hora programada (string de <input type="datetime-local">
  // o "" si no se puso hora). Pedido de David: opcional y por página.
  const [paginasMarcadas, setPaginasMarcadas] = useState(new Map());
  const [aviso, setAviso] = useState(null); // { paginas_repetidas: [...] } | null

  const cargarSiguiente = useCallback(async () => {
    const respuesta = await fetch(
      `/.netlify/functions/siguiente-imagen?codigo=${encodeURIComponent(codigo)}`
    );
    if (!respuesta.ok) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    const datos = await respuesta.json();
    setImagen(datos.imagen);
    setRestantes(datos.restantes);
    setPaginas(datos.paginas);
    setTexto(datos.imagen?.texto ?? "");
    setPaginasMarcadas(new Map());
    setAviso(null);
    setEstado(ESTADO_LISTO);
  }, [codigo]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargarSiguiente();
  }, [codigo, cargarSiguiente]);

  async function enviarDecision(decision, extra = {}) {
    setCargandoDecision(true);
    setError("");
    try {
      const respuesta = await fetch("/.netlify/functions/decidir-imagen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo,
          imagen_id: imagen.id,
          decision,
          texto,
          ...extra,
        }),
      });

      if (respuesta.status === 409) {
        const datos = await respuesta.json();
        if (datos.aviso === "repetida") {
          setAviso(datos.paginas_repetidas);
          setCargandoDecision(false);
          return;
        }
        setError(datos.error ?? "No se pudo guardar.");
        setCargandoDecision(false);
        return;
      }

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo guardar.");
        setCargandoDecision(false);
        return;
      }

      setMostrarPaginas(false);
      await cargarSiguiente();
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
    setCargandoDecision(false);
  }

  function alternarPagina(id) {
    setPaginasMarcadas((previo) => {
      const nuevo = new Map(previo);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.set(id, "");
      return nuevo;
    });
  }

  function ponerHoraPagina(id, valorDatetimeLocal) {
    setPaginasMarcadas((previo) => new Map(previo).set(id, valorDatetimeLocal));
  }

  function confirmarElegir(confirmarRepetidas = false) {
    const paginas = Array.from(paginasMarcadas, ([id, hora]) => ({
      id,
      hora_programada: hora ? new Date(hora).toISOString() : null,
    }));
    enviarDecision("elegida", { paginas, confirmar_repetidas: confirmarRepetidas });
  }

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }

  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona o no es el de revisar.</p>
      </Pantalla>
    );
  }

  if (!imagen) {
    return (
      <Pantalla>
        <h1>Revisar</h1>
        <p>No hay imágenes nuevas por revisar.</p>
        <Link to={`/guardadas?codigo=${encodeURIComponent(codigo)}`} className="chip" style={{ alignSelf: "flex-start" }}>
          Ver guardadas y descartadas
        </Link>
        <BarraInferior usuario="david" codigo={codigo} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <div className="barra-superior">
        <h1>Revisar</h1>
        <div className="contador">{restantes} por revisar</div>
      </div>

      <div className="tarjeta" style={{ padding: 10 }}>
        <p style={estiloFuente}>{imagen.fuente}</p>

        <img
          src={imagen.url_ver}
          alt="Imagen a revisar"
          style={{ width: "100%" }}
        />

        <textarea
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Texto de la imagen (opcional)"
          rows={3}
          disabled={cargandoDecision}
          style={{ width: "100%", marginTop: 10 }}
        />
      </div>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      <div style={estiloBotones}>
        <button
          onClick={() => enviarDecision("descartada")}
          disabled={cargandoDecision}
          className="btn btn-grande btn-peligro"
        >
          <IconoDescartar /> Descartar
        </button>
        <button
          onClick={() => enviarDecision("guardada")}
          disabled={cargandoDecision}
          className="btn btn-grande btn-secundario"
        >
          <IconoGuardar /> Guardar
        </button>
        <button
          onClick={() => setMostrarPaginas(true)}
          disabled={cargandoDecision}
          className="btn btn-grande btn-primario"
        >
          <IconoElegir /> Elegir
        </button>
      </div>

      {mostrarPaginas && (
        <div style={estiloModal}>
          <div style={estiloModalContenido}>
            <h2>¿Para qué páginas?</h2>
            {paginas.length === 0 && <p>No hay páginas configuradas todavía.</p>}
            {paginas.map((pagina) => (
              <div key={pagina.id} style={estiloOpcionPagina}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={paginasMarcadas.has(pagina.id)}
                    onChange={() => alternarPagina(pagina.id)}
                  />
                  {pagina.nombre}
                </label>
                {paginasMarcadas.has(pagina.id) && (
                  <input
                    type="datetime-local"
                    value={paginasMarcadas.get(pagina.id)}
                    onChange={(evento) => ponerHoraPagina(pagina.id, evento.target.value)}
                    style={{ fontSize: 14 }}
                  />
                )}
              </div>
            ))}

            {aviso && (
              <div style={estiloAviso}>
                <p style={{ margin: "0 0 8px" }}>
                  Ya salió en: {aviso.map((p) => p.nombre).join(", ")}. ¿Elegir de todas
                  formas?
                </p>
                <button
                  onClick={() => confirmarElegir(true)}
                  className="btn btn-chico btn-primario"
                  style={{ width: "100%" }}
                >
                  Sí, elegir igual
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => {
                  setMostrarPaginas(false);
                  setAviso(null);
                }}
                className="btn btn-chico btn-secundario"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmarElegir(false)}
                disabled={paginasMarcadas.size === 0 || cargandoDecision}
                className="btn btn-chico btn-primario"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <BarraInferior usuario="david" codigo={codigo} />
    </Pantalla>
  );
}

const estiloFuente = {
  fontWeight: 700,
  color: "var(--text-h)",
  margin: "0 0 8px",
  fontSize: 14,
  opacity: 0.85,
};

const estiloBotones = {
  display: "flex",
  gap: 8,
};

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

const estiloOpcionPagina = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloAviso = {
  marginTop: 12,
  padding: 12,
  borderRadius: "var(--radio-chico)",
  background: "var(--error-bg)",
  color: "var(--error)",
};
