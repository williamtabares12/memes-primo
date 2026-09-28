import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

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
        <Link to={`/guardadas?codigo=${encodeURIComponent(codigo)}`} style={estiloEnlace}>
          Ver guardadas y descartadas
        </Link>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <div style={estiloEncabezado}>
        <div style={estiloContador}>Faltan {restantes} nuevas</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to={`/guardadas?codigo=${encodeURIComponent(codigo)}`} style={estiloEnlace}>
            Guardadas y descartadas
          </Link>
          <Link to={`/armar?codigo=${encodeURIComponent(codigo)}`} style={estiloEnlace}>
            Por armar
          </Link>
        </div>
      </div>

      <p style={estiloFuente}>{imagen.fuente}</p>

      <img
        src={imagen.url_ver}
        alt="Imagen a revisar"
        style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
      />

      <textarea
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Texto de la imagen (opcional)"
        rows={3}
        disabled={cargandoDecision}
        style={estiloTextarea}
      />

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      <div style={estiloBotones}>
        <button
          onClick={() => enviarDecision("descartada")}
          disabled={cargandoDecision}
          style={{ ...estiloBoton, background: "var(--error-bg)", color: "var(--error)" }}
        >
          Descartar
        </button>
        <button
          onClick={() => enviarDecision("guardada")}
          disabled={cargandoDecision}
          style={{ ...estiloBoton, background: "var(--bg-suave)", color: "var(--text-h)" }}
        >
          Guardar
        </button>
        <button
          onClick={() => setMostrarPaginas(true)}
          disabled={cargandoDecision}
          style={{ ...estiloBoton, background: "var(--accent)", color: "#fff" }}
        >
          Elegir
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
                    style={estiloHoraProgramada}
                  />
                )}
              </div>
            ))}

            {aviso && (
              <div style={estiloAviso}>
                <p>
                  Ya salió en: {aviso.map((p) => p.nombre).join(", ")}. ¿Elegir de todas
                  formas?
                </p>
                <button onClick={() => confirmarElegir(true)} style={estiloBotonPequeno}>
                  Sí, elegir igual
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  setMostrarPaginas(false);
                  setAviso(null);
                }}
                style={{ ...estiloBotonPequeno, background: "var(--bg-suave)", color: "var(--text-h)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmarElegir(false)}
                disabled={paginasMarcadas.size === 0 || cargandoDecision}
                style={{
                  ...estiloBotonPequeno,
                  background: "var(--accent)",
                  color: "#fff",
                  ...(paginasMarcadas.size === 0 || cargandoDecision
                    ? estiloBotonDeshabilitado
                    : {}),
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Pantalla>
  );
}

function Pantalla({ children }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "16px 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {children}
    </main>
  );
}

const estiloEncabezado = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const estiloContador = {
  fontSize: 14,
  padding: "4px 12px",
  borderRadius: 999,
  background: "var(--bg-suave)",
  color: "var(--text)",
  whiteSpace: "nowrap",
};

const estiloEnlace = {
  fontSize: 13,
  color: "var(--accent)",
  textDecoration: "none",
};

const estiloFuente = {
  fontWeight: 600,
  color: "var(--text-h)",
  margin: 0,
};

const estiloTextarea = {
  font: "inherit",
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
  resize: "vertical",
};

const estiloBotones = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const estiloBoton = {
  flex: 1,
  padding: "16px 8px",
  borderRadius: 10,
  border: "none",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

const estiloBotonPequeno = {
  flex: 1,
  padding: "12px 8px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const estiloModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const estiloModalContenido = {
  background: "var(--bg)",
  width: "100%",
  maxWidth: 480,
  borderRadius: "16px 16px 0 0",
  padding: 20,
};

const estiloOpcionPagina = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloHoraProgramada = {
  font: "inherit",
  fontSize: 14,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
};

const estiloBotonDeshabilitado = {
  opacity: 0.45,
  cursor: "not-allowed",
};

const estiloAviso = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: "var(--error-bg)",
  color: "var(--error)",
};
