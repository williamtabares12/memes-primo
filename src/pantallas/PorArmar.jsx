import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import { IconoCheck, IconoCopiar, IconoReloj } from "../componentes/Iconos.jsx";
import { ZONA_BOGOTA } from "../componentes/horasFijas.js";

// Pantalla Por armar (H2, H6, H10). La ven Alejandro y David: lista
// de imágenes Elegidas o Armadas con páginas pendientes. Cada fila
// trae el texto (editable, con copiar), la hora programada por
// página, el botón Armada y Publicada por página.

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
      <h1>Por armar</h1>

      {paginas.length > 0 && (
        <select value={filtroPagina} onChange={(evento) => setFiltroPagina(evento.target.value)}>
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
        />
      ))}
      <BarraInferior usuario={usuario} codigo={codigo} />
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
}) {
  const [texto, setTexto] = useState(pieza.texto);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await onCopiarTexto();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="tarjeta">
      <div style={{ position: "relative" }}>
        <img src={pieza.url_ver} alt="Imagen" style={{ width: "100%" }} />
        <span style={estiloBadgeEstado(pieza.estado)}>
          {pieza.estado === "armada" ? "Armada" : "Elegida"}
        </span>
      </div>
      <p style={{ fontWeight: 700, color: "var(--text-h)", margin: "10px 0 6px" }}>
        {pieza.fuente}
      </p>

      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <textarea
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={() => onGuardarTexto(texto)}
          rows={2}
          style={{ flex: 1 }}
        />
        <button onClick={copiar} className="btn btn-chico btn-secundario" style={{ height: 42 }}>
          {copiado ? <IconoCheck /> : <IconoCopiar />}
        </button>
      </div>

      <div style={{ margin: "12px 0" }}>
        {pieza.publicaciones.map((p) => (
          <div key={p.id} style={estiloFilaPagina}>
            <div>
              <strong>{p.pagina_nombre}</strong>
              {p.hora_programada && (
                <div style={estiloHora}>
                  <IconoReloj style={{ width: 14, height: 14 }} />
                  {new Date(p.hora_programada).toLocaleString("es-CO", {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: ZONA_BOGOTA,
                  })}
                </div>
              )}
              {p.publicada && (
                <div style={{ fontSize: 13, color: "var(--exito)", marginTop: 2 }}>
                  Publicada por {p.marcada_por}
                </div>
              )}
            </div>
            {!p.publicada && (
              <button
                onClick={() => onMarcarPublicada(p.id)}
                className="btn btn-chico btn-exito"
              >
                Publicada
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {pieza.estado === "elegida" && usuario === "alejandro" && (
          <button onClick={onMarcarArmada} className="btn btn-chico btn-primario">
            Armada
          </button>
        )}
      </div>
    </div>
  );
}

function estiloBadgeEstado(estado) {
  return {
    position: "absolute",
    top: 8,
    left: 8,
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    background: estado === "armada" ? "var(--exito-bg)" : "var(--accent-bg)",
    color: estado === "armada" ? "var(--exito)" : "var(--accent)",
    backdropFilter: "blur(4px)",
  };
}

const estiloFilaPagina = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloHora = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  opacity: 0.75,
  marginTop: 2,
};
