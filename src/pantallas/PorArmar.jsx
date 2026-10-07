import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import { IconoCheck, IconoCopiar, IconoReloj } from "../componentes/Iconos.jsx";
import { ZONA_BOGOTA, horaProgramadaISO, partesBogota } from "../componentes/horasFijas.js";
import GenerarTarjeta from "../componentes/GenerarTarjeta.jsx";
import SelectorHoraProgramada from "../componentes/SelectorHoraProgramada.jsx";

// Pantalla Por armar (H2, H6). La ven Alejandro y David: lista de
// imágenes Elegidas, de referencia mientras se postean a mano. Cada
// fila trae el texto (editable, con copiar) y la hora programada por
// página. Alejandro la quita de la lista cuando ya terminó con ella.
// Además, solo Alejandro puede marcar una página como "directa" (se
// sube a mano a esa hora, con aviso por Telegram; ver
// docs/especificacion-directas.md).

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

  async function archivar(imagenId) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/archivar-imagen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId }),
    });
    // 409 = la pieza ya no existe o ya estaba quitada: da igual, el
    // resultado que se buscaba (que no aparezca acá) ya se cumple,
    // así que no hace falta mostrar error, solo sacarla de la vista.
    if (!respuesta.ok && respuesta.status !== 409) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? "No se pudo quitar de la lista.");
      return;
    }
    setPiezas((previo) => previo.filter((pieza) => pieza.id !== imagenId));
  }

  // Marca o desmarca una publicación (una página de una pieza) como
  // directa. horaISO es opcional: si viene, también cambia la hora.
  async function marcarDirecta(publicacionId, directa, horaISO) {
    setError("");
    const respuesta = await fetch("/.netlify/functions/marcar-directa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo,
        publicacion_id: publicacionId,
        directa,
        ...(horaISO ? { hora_programada: horaISO } : {}),
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo cambiar la publicación directa.");
      return;
    }
    setPiezas((previo) =>
      previo.map((pieza) => ({
        ...pieza,
        publicaciones: pieza.publicaciones.map((p) =>
          p.id === publicacionId
            ? { ...p, directa: datos.directa, hora_programada: datos.hora_programada }
            : p
        ),
      }))
    );
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

      {piezas.length === 0 && <p>No hay nada pendiente.</p>}

      {piezas.map((pieza) => (
        <TarjetaPorArmar
          key={pieza.id}
          pieza={pieza}
          usuario={usuario}
          onGuardarTexto={(texto) => guardarTexto(pieza.id, texto)}
          onCopiarTexto={() => copiarTexto(pieza.texto)}
          onArchivar={() => archivar(pieza.id)}
          onMarcarDirecta={marcarDirecta}
        />
      ))}
      <BarraInferior usuario={usuario} codigo={codigo} />
    </Pantalla>
  );
}

function TarjetaPorArmar({
  pieza,
  usuario,
  onGuardarTexto,
  onCopiarTexto,
  onArchivar,
  onMarcarDirecta,
}) {
  const [texto, setTexto] = useState(pieza.texto);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await onCopiarTexto();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  function quitar() {
    if (window.confirm("¿Quitar esta pieza de Por armar? No se borra, solo deja de aparecer aquí.")) {
      onArchivar();
    }
  }

  return (
    <div className="tarjeta">
      <img src={pieza.url_ver} alt="Imagen" style={{ width: "100%" }} />
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
          <div key={p.id} style={estiloBloquePagina}>
            <div style={estiloFilaPagina}>
              <div>
                <strong style={estiloNombrePagina}>{p.pagina_nombre}</strong>
                {(p.hora_programada || p.publicada) && (
                  <div style={estiloHora}>
                    {p.hora_programada && (
                      <>
                        <IconoReloj style={{ width: 14, height: 14 }} />
                        {new Date(p.hora_programada).toLocaleString("es-CO", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: ZONA_BOGOTA,
                        })}
                      </>
                    )}
                    {p.directa && !p.publicada && (
                      <span className="contador" style={estiloEtiquetaDirecta}>
                        Directa
                      </span>
                    )}
                    {p.publicada && <span style={estiloSubida}>Ya subida</span>}
                  </div>
                )}
              </div>
              {usuario === "alejandro" && (
                <GenerarTarjeta
                  texto={texto}
                  nombreTuit={p.nombre_tuit}
                  usuarioTuit={p.usuario_tuit}
                  avatarUrl={p.avatar_url}
                  nombreArchivo={`meme-${pieza.id.slice(0, 8)}-${p.pagina_nombre}`}
                />
              )}
            </div>

            {usuario === "alejandro" && !p.publicada && (
              <div style={estiloDirecta}>
                {p.hora_programada ? (
                  <label style={estiloInterruptor}>
                    <input
                      type="checkbox"
                      checked={!!p.directa}
                      onChange={(evento) => onMarcarDirecta(p.id, evento.target.checked)}
                    />
                    Subir directo (te aviso por Telegram)
                  </label>
                ) : (
                  <span style={estiloHora}>Elige la hora para marcarla como directa:</span>
                )}
                {(p.directa || !p.hora_programada) && (
                  <SelectorHoraProgramada
                    valor={partesBogota(p.hora_programada)}
                    onCambiar={({ fecha, hora }) => {
                      if (fecha && hora) onMarcarDirecta(p.id, true, horaProgramadaISO(fecha, hora));
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {usuario === "alejandro" && (
          <button onClick={quitar} className="btn btn-chico btn-peligro">
            Quitar de la lista
          </button>
        )}
      </div>
    </div>
  );
}

const estiloBloquePagina = {
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
};

const estiloFilaPagina = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const estiloDirecta = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  marginTop: 10,
};

const estiloInterruptor = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  color: "var(--text-h)",
};

const estiloNombrePagina = {
  color: "var(--text-h)",
  whiteSpace: "nowrap",
};

const estiloEtiquetaDirecta = {
  marginLeft: 4,
  padding: "2px 10px",
  fontSize: 12,
};

const estiloSubida = {
  marginLeft: 4,
  fontSize: 12,
  color: "var(--exito)",
};

const estiloHora = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 4,
  fontSize: 13,
  opacity: 0.75,
};
