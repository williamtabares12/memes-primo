import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Pantalla Guardadas y descartadas (David, H5). Dos pilas en pestañas;
// cada tarjeta permite recuperar (vuelve a Nueva) o elegir (mismo
// flujo de páginas y aviso de repetido que en Revisar, H4/H8).

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

export default function GuardadasDescartadas() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [pestana, setPestana] = useState("guardada");
  const [imagenes, setImagenes] = useState([]);
  const [paginas, setPaginas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [imagenEligiendo, setImagenEligiendo] = useState(null);
  const [paginasMarcadas, setPaginasMarcadas] = useState(new Set());
  const [aviso, setAviso] = useState(null);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    setError("");
    const respuesta = await fetch(
      `/.netlify/functions/listar-imagenes?codigo=${encodeURIComponent(codigo)}&estado=${pestana}`
    );
    if (!respuesta.ok) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    const datos = await respuesta.json();
    setImagenes(datos.imagenes);
    setPaginas(datos.paginas);
    setEstado(ESTADO_LISTO);
    setCargando(false);
  }, [codigo, pestana]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargarLista();
  }, [codigo, cargarLista]);

  async function recuperar(imagenId) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/recuperar-imagen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo recuperar.");
      return;
    }
    setImagenes((previo) => previo.filter((imagen) => imagen.id !== imagenId));
  }

  function abrirElegir(imagen) {
    setImagenEligiendo(imagen);
    setPaginasMarcadas(new Set());
    setAviso(null);
  }

  function alternarPagina(id) {
    setPaginasMarcadas((previo) => {
      const nuevo = new Set(previo);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function confirmarElegir(confirmarRepetidas = false) {
    const respuesta = await fetch("/.netlify/functions/decidir-imagen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo,
        imagen_id: imagenEligiendo.id,
        decision: "elegida",
        texto: imagenEligiendo.texto,
        paginas_ids: Array.from(paginasMarcadas),
        confirmar_repetidas: confirmarRepetidas,
      }),
    });

    if (respuesta.status === 409) {
      const datos = await respuesta.json();
      if (datos.aviso === "repetida") {
        setAviso(datos.paginas_repetidas);
        return;
      }
      setError(datos.error ?? "No se pudo elegir.");
      return;
    }
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo elegir.");
      return;
    }

    setImagenes((previo) => previo.filter((imagen) => imagen.id !== imagenEligiendo.id));
    setImagenEligiendo(null);
  }

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }
  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona.</p>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Guardadas y descartadas</h1>
        <Link
          to={`/revisar?codigo=${encodeURIComponent(codigo)}`}
          style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
        >
          Revisar
        </Link>
      </div>

      <div style={estiloPestanas}>
        <button
          onClick={() => setPestana("guardada")}
          style={{ ...estiloPestana, ...(pestana === "guardada" ? estiloPestanaActiva : {}) }}
        >
          Guardadas
        </button>
        <button
          onClick={() => setPestana("descartada")}
          style={{ ...estiloPestana, ...(pestana === "descartada" ? estiloPestanaActiva : {}) }}
        >
          Descartadas
        </button>
      </div>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      {cargando && <p>Cargando…</p>}

      {!cargando && imagenes.length === 0 && <p>No hay nada acá.</p>}

      {!cargando &&
        imagenes.map((imagen) => (
          <div key={imagen.id} style={estiloTarjeta}>
            <img
              src={imagen.url_ver}
              alt="Miniatura"
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <p style={{ fontWeight: 600, color: "var(--text-h)", margin: "8px 0 2px" }}>
              {imagen.fuente}
            </p>
            {imagen.texto && <p style={{ margin: "0 0 8px" }}>{imagen.texto}</p>}
            <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 8px" }}>
              Se borra el {new Date(imagen.fecha_caducidad).toLocaleDateString("es-CO")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => recuperar(imagen.id)} style={estiloBotonTarjeta}>
                Recuperar
              </button>
              <button
                onClick={() => abrirElegir(imagen)}
                style={{ ...estiloBotonTarjeta, background: "var(--accent)", color: "#fff" }}
              >
                Elegir
              </button>
            </div>
          </div>
        ))}

      {imagenEligiendo && (
        <div style={estiloModal}>
          <div style={estiloModalContenido}>
            <h2>¿Para qué páginas?</h2>
            {paginas.map((pagina) => (
              <label key={pagina.id} style={estiloOpcionPagina}>
                <input
                  type="checkbox"
                  checked={paginasMarcadas.has(pagina.id)}
                  onChange={() => alternarPagina(pagina.id)}
                />
                {pagina.nombre}
              </label>
            ))}

            {aviso && (
              <div style={estiloAviso}>
                <p>Ya salió en: {aviso.map((p) => p.nombre).join(", ")}. ¿Elegir de todas formas?</p>
                <button onClick={() => confirmarElegir(true)} style={estiloBotonPequeno}>
                  Sí, elegir igual
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setImagenEligiendo(null)}
                style={{ ...estiloBotonPequeno, background: "var(--bg-suave)", color: "var(--text-h)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmarElegir(false)}
                disabled={paginasMarcadas.size === 0}
                style={{ ...estiloBotonPequeno, background: "var(--accent)", color: "#fff" }}
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

const estiloPestanas = { display: "flex", gap: 8 };
const estiloPestana = {
  flex: 1,
  padding: "10px 8px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
};
const estiloPestanaActiva = { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" };

const estiloTarjeta = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
};

const estiloBotonTarjeta = {
  flex: 1,
  padding: "10px 8px",
  borderRadius: 8,
  border: "none",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
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
  gap: 8,
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloBotonPequeno = {
  flex: 1,
  padding: "12px 8px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const estiloAviso = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  background: "var(--error-bg)",
  color: "var(--error)",
};
