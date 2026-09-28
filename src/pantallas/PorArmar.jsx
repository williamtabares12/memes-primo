import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Pantalla Por armar (H2, H6, H10). La ven Alejandro y David: lista
// de imágenes Elegidas o Armadas con páginas pendientes. Cada fila
// trae el texto (editable, con copiar), la hora programada por
// página, el botón Armada, subir captura y Publicada por página.

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

export default function PorArmar() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [usuario, setUsuario] = useState(null);
  const [piezas, setPiezas] = useState([]);
  const [paginas, setPaginas] = useState([]);
  const [filtroPagina, setFiltroPagina] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const qs = new URLSearchParams({ codigo });
    if (filtroPagina) qs.set("pagina_id", filtroPagina);
    const respuesta = await fetch(`/.netlify/functions/imagenes-por-armar?${qs}`);
    if (!respuesta.ok) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    const datos = await respuesta.json();
    setPiezas(datos.piezas);
    setUsuario(datos.usuario);
    setEstado(ESTADO_LISTO);
  }, [codigo, filtroPagina]);

  // Las páginas para el filtro solo hace falta traerlas una vez;
  // se sacan de las piezas ya cargadas.
  useEffect(() => {
    const vistas = new Map();
    piezas.forEach((pieza) =>
      pieza.publicaciones.forEach((p) => {
        if (p.pagina_id) vistas.set(p.pagina_id, p.pagina_nombre);
      })
    );
    if (vistas.size > 0) {
      setPaginas((previo) => {
        const combinado = new Map(previo.map((p) => [p.id, p.nombre]));
        vistas.forEach((nombre, id) => combinado.set(id, nombre));
        return Array.from(combinado, ([id, nombre]) => ({ id, nombre }));
      });
    }
  }, [piezas]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargar();
  }, [codigo, cargar]);

  async function marcarArmada(imagenId) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/marcar-armada", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo marcar Armada.");
      return;
    }
    await cargar();
  }

  async function marcarPublicada(publicacionId) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/marcar-publicada", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, publicacion_id: publicacionId }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo marcar Publicada.");
      return;
    }
    await cargar();
  }

  async function guardarTexto(imagenId, texto) {
    await fetch("/.netlify/functions/actualizar-texto", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId, texto }),
    });
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Si el navegador no deja copiar (poco común), no pasa nada
      // grave: el texto sigue visible para copiarlo a mano.
    }
  }

  async function subirCaptura(imagenId, archivo) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/firmar-captura", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId, tipo: archivo.type }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo preparar la subida.");
      return;
    }
    const { url_subida } = await respuesta.json();
    const subida = await fetch(url_subida, {
      method: "PUT",
      headers: { "content-type": archivo.type || "application/octet-stream" },
      body: archivo,
    });
    if (!subida.ok) {
      setError("La captura no se pudo subir.");
      return;
    }
    await cargar();
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
        <h1 style={{ margin: 0 }}>Por armar</h1>
        {usuario === "david" && (
          <Link
            to={`/revisar?codigo=${encodeURIComponent(codigo)}`}
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            Revisar
          </Link>
        )}
      </div>

      {paginas.length > 0 && (
        <select
          value={filtroPagina}
          onChange={(evento) => setFiltroPagina(evento.target.value)}
          style={estiloSelect}
        >
          <option value="">Todas las páginas</option>
          {paginas.map((pagina) => (
            <option key={pagina.id} value={pagina.id}>
              {pagina.nombre}
            </option>
          ))}
        </select>
      )}

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}

      {piezas.length === 0 && <p>No hay nada pendiente de armar o publicar.</p>}

      {piezas.map((pieza) => (
        <TarjetaPorArmar
          key={pieza.id}
          pieza={pieza}
          usuario={usuario}
          onMarcarArmada={() => marcarArmada(pieza.id)}
          onMarcarPublicada={marcarPublicada}
          onGuardarTexto={(texto) => guardarTexto(pieza.id, texto)}
          onCopiarTexto={() => copiarTexto(pieza.texto)}
          onSubirCaptura={(archivo) => subirCaptura(pieza.id, archivo)}
        />
      ))}
    </Pantalla>
  );
}

function TarjetaPorArmar({
  pieza,
  usuario,
  onMarcarArmada,
  onMarcarPublicada,
  onGuardarTexto,
  onCopiarTexto,
  onSubirCaptura,
}) {
  const [texto, setTexto] = useState(pieza.texto);
  const inputCapturaRef = useRef(null);

  return (
    <div style={estiloTarjeta}>
      <img
        src={pieza.url_ver}
        alt="Imagen"
        style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }}
      />
      <p style={{ fontWeight: 600, color: "var(--text-h)", margin: "8px 0 4px" }}>
        {pieza.fuente}
      </p>

      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <textarea
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={() => onGuardarTexto(texto)}
          rows={2}
          style={estiloTextarea}
        />
        <button onClick={onCopiarTexto} style={estiloBotonTarjeta}>
          Copiar
        </button>
      </div>

      <div style={{ margin: "10px 0" }}>
        {pieza.publicaciones.map((p) => (
          <div key={p.id} style={estiloFilaPagina}>
            <div>
              <strong>{p.pagina_nombre}</strong>
              {p.hora_programada && (
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  {new Date(p.hora_programada).toLocaleString("es-CO", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              )}
              {p.publicada && (
                <div style={{ fontSize: 13, color: "var(--exito)" }}>
                  Publicada por {p.marcada_por}
                </div>
              )}
            </div>
            {!p.publicada && (
              <button onClick={() => onMarcarPublicada(p.id)} style={estiloBotonPublicada}>
                Publicada
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {pieza.estado === "elegida" && usuario === "alejandro" && (
          <button onClick={onMarcarArmada} style={estiloBotonPrincipal}>
            Armada
          </button>
        )}

        {usuario === "alejandro" && (
          <>
            <input
              ref={inputCapturaRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                if (archivo) onSubirCaptura(archivo);
                evento.target.value = "";
              }}
            />
            <button
              onClick={() => inputCapturaRef.current?.click()}
              style={estiloBotonTarjeta}
            >
              {pieza.url_captura ? "Cambiar captura" : "Subir captura"}
            </button>
          </>
        )}

        {pieza.url_captura && (
          <a
            href={pieza.url_captura}
            download
            style={{ ...estiloBotonTarjeta, textDecoration: "none", textAlign: "center" }}
          >
            Descargar captura
          </a>
        )}
      </div>
    </div>
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

const estiloSelect = {
  font: "inherit",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
};

const estiloTarjeta = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 12,
};

const estiloTextarea = {
  flex: 1,
  font: "inherit",
  padding: 8,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
  resize: "vertical",
};

const estiloBotonTarjeta = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const estiloBotonPrincipal = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const estiloFilaPagina = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloBotonPublicada = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "var(--exito-bg)",
  color: "var(--exito)",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
