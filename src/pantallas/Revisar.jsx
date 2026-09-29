import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import SelectorHoraProgramada from "../componentes/SelectorHoraProgramada.jsx";
import AvisoDeshacer from "../componentes/AvisoDeshacer.jsx";
import { horaProgramadaISO } from "../componentes/horasFijas.js";
import { FUENTES } from "../componentes/fuentes.js";
import {
  IconoDescartar,
  IconoElegir,
  IconoGuardar,
} from "../componentes/Iconos.jsx";

// Umbral de arrastre (en px) para que un swipe cuente como decisión,
// y qué tan lejos se anima la tarjeta al salir volando.
const UMBRAL_SWIPE = 90;
const DISTANCIA_SALIDA = 500;

// Pantalla Revisar (David, celular). Una imagen a la vez, con la
// fuente arriba, el texto editable y tres botones grandes: Descartar,
// Guardar, Elegir. H3, H4, H5 (guardar/descartar en detalle vive en
// la pantalla de Guardadas y descartadas).

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
  const [filtroFuente, setFiltroFuente] = useState("");
  const [cargandoDecision, setCargandoDecision] = useState(false);
  const [error, setError] = useState("");

  const [mostrarPaginas, setMostrarPaginas] = useState(false);
  // Mapa id de página -> { fecha, hora } (hora programada, obligatoria
  // por página desde que David lo pidió).
  const [paginasMarcadas, setPaginasMarcadas] = useState(new Map());

  // Deshacer: guarda qué imagen y qué decisión se acaba de tomar, para
  // poder revertirla mientras el aviso sigue visible.
  const [deshacer, setDeshacer] = useState(null); // { imagenId, mensaje } | null

  // Swipe: arrastreX es el desplazamiento horizontal actual de la
  // tarjeta; arrastrando controla si se anima el resorte/salida.
  const [arrastreX, setArrastreX] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const inicioArrastreRef = useRef(null);
  // Se pone en true apenas un swipe cruza el umbral, para no dejar
  // empezar otro arrastre mientras la tarjeta sale volando y se pide
  // la decisión (cargandoDecision solo se activa un poco después).
  const bloqueadoRef = useRef(false);

  const cargarSiguiente = useCallback(async () => {
    const qs = new URLSearchParams({ codigo });
    if (filtroFuente) qs.set("fuente", filtroFuente);
    const respuesta = await fetch(`/.netlify/functions/siguiente-imagen?${qs}`);
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
    setArrastreX(0);
    setArrastrando(false);
    setEstado(ESTADO_LISTO);
  }, [codigo, filtroFuente]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargarSiguiente();
  }, [codigo, cargarSiguiente]);

  const ETIQUETAS_DECISION = {
    descartada: "Descartada",
    guardada: "Guardada",
    elegida: "Elegida",
  };

  async function enviarDecision(decision, extra = {}) {
    setCargandoDecision(true);
    setError("");
    const imagenDecidida = imagen.id;
    try {
      const respuesta = await fetch("/.netlify/functions/decidir-imagen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo,
          imagen_id: imagenDecidida,
          decision,
          texto,
          ...extra,
        }),
      });

      if (respuesta.status === 409) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo guardar.");
        setCargandoDecision(false);
        setArrastreX(0);
        bloqueadoRef.current = false;
        return;
      }

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo guardar.");
        setCargandoDecision(false);
        setArrastreX(0);
        bloqueadoRef.current = false;
        return;
      }

      setMostrarPaginas(false);
      setDeshacer({ imagenId: imagenDecidida, mensaje: ETIQUETAS_DECISION[decision] });
      await cargarSiguiente();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setArrastreX(0);
    }
    setCargandoDecision(false);
    bloqueadoRef.current = false;
  }

  async function deshacerDecision() {
    if (!deshacer) return;
    const { imagenId } = deshacer;
    setDeshacer(null);
    await fetch("/.netlify/functions/deshacer-decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, imagen_id: imagenId }),
    });
    await cargarSiguiente();
  }

  // --- Swipe: izquierda descarta, derecha guarda. "Elegir" solo por
  // botón, porque necesita abrir el selector de páginas y hora. ---
  function alPresionar(evento) {
    if (cargandoDecision || mostrarPaginas || bloqueadoRef.current) return;
    inicioArrastreRef.current = evento.clientX;
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    setArrastrando(true);
  }

  function alMover(evento) {
    if (inicioArrastreRef.current === null) return;
    setArrastreX(evento.clientX - inicioArrastreRef.current);
  }

  function alSoltar() {
    if (inicioArrastreRef.current === null) return;
    inicioArrastreRef.current = null;

    if (arrastreX <= -UMBRAL_SWIPE) {
      bloqueadoRef.current = true;
      setArrastreX(-DISTANCIA_SALIDA);
      setTimeout(() => enviarDecision("descartada"), 160);
    } else if (arrastreX >= UMBRAL_SWIPE) {
      bloqueadoRef.current = true;
      setArrastreX(DISTANCIA_SALIDA);
      setTimeout(() => enviarDecision("guardada"), 160);
    } else {
      setArrastreX(0);
    }
    setArrastrando(false);
  }

  function alternarPagina(id) {
    setPaginasMarcadas((previo) => {
      const nuevo = new Map(previo);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.set(id, { fecha: "", hora: "" });
      return nuevo;
    });
  }

  function ponerHoraPagina(id, valor) {
    setPaginasMarcadas((previo) => new Map(previo).set(id, valor));
  }

  // Obligatorio: cada página marcada necesita fecha y hora antes de
  // poder confirmar (pedido de David, para no terminar con horas al
  // azar sin querer).
  const faltaHoraProgramada =
    paginasMarcadas.size === 0 ||
    Array.from(paginasMarcadas.values()).some((v) => !v.fecha || !v.hora);

  function confirmarElegir() {
    const paginas = Array.from(paginasMarcadas, ([id, { fecha, hora }]) => ({
      id,
      hora_programada: horaProgramadaISO(fecha, hora),
    }));
    enviarDecision("elegida", { paginas });
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

  const selectorFuente = (
    <select
      value={filtroFuente}
      onChange={(evento) => setFiltroFuente(evento.target.value)}
      style={{ fontSize: 14 }}
    >
      <option value="">Todas las fuentes</option>
      {FUENTES.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );

  if (!imagen) {
    return (
      <Pantalla>
        <h1>Revisar</h1>
        {selectorFuente}
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

      {selectorFuente}

      <div className="tarjeta" style={{ padding: 10, overflow: "hidden" }}>
        <p style={estiloFuente}>{imagen.fuente}</p>

        <div
          style={estiloZonaSwipe(arrastreX, arrastrando)}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          <img
            src={imagen.url_ver}
            alt="Imagen a revisar"
            draggable={false}
            style={{ width: "100%", display: "block", touchAction: "pan-y" }}
          />
          <span style={estiloEtiquetaSwipe("descartar", arrastreX)}>Descartar</span>
          <span style={estiloEtiquetaSwipe("guardar", arrastreX)}>Guardar</span>
        </div>

        <p style={{ fontSize: 12, opacity: 0.6, textAlign: "center", margin: "8px 0 0" }}>
          Desliza la imagen para decidir rápido, o usa los botones de abajo
        </p>

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
            <p style={{ fontSize: 13, opacity: 0.75, marginTop: -6 }}>
              La hora programada es obligatoria para cada página que marques.
            </p>
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
                  <SelectorHoraProgramada
                    valor={paginasMarcadas.get(pagina.id)}
                    onCambiar={(valor) => ponerHoraPagina(pagina.id, valor)}
                  />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setMostrarPaginas(false)}
                className="btn btn-chico btn-secundario"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarElegir}
                disabled={faltaHoraProgramada || cargandoDecision}
                className="btn btn-chico btn-primario"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {deshacer && (
        <AvisoDeshacer
          mensaje={deshacer.mensaje}
          onDeshacer={deshacerDecision}
          onExpirar={() => setDeshacer(null)}
        />
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

function estiloZonaSwipe(arrastreX, arrastrando) {
  const rotacion = arrastreX / 22;
  const opacidad = Math.max(0, 1 - Math.abs(arrastreX) / 600);
  return {
    position: "relative",
    touchAction: "pan-y",
    cursor: arrastrando ? "grabbing" : "grab",
    transform: `translateX(${arrastreX}px) rotate(${rotacion}deg)`,
    opacity: opacidad,
    transition: arrastrando ? "none" : "transform 220ms ease, opacity 220ms ease",
  };
}

function estiloEtiquetaSwipe(tipo, arrastreX) {
  const esGuardar = tipo === "guardar";
  const activo = esGuardar ? arrastreX > 0 : arrastreX < 0;
  const opacidad = activo ? Math.min(Math.abs(arrastreX) / UMBRAL_SWIPE, 1) : 0;
  return {
    position: "absolute",
    top: 12,
    [esGuardar ? "right" : "left"]: 12,
    padding: "6px 12px",
    borderRadius: 8,
    border: `2px solid ${esGuardar ? "var(--exito)" : "var(--error)"}`,
    color: esGuardar ? "var(--exito)" : "var(--error)",
    background: "var(--bg)",
    fontWeight: 800,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    opacity: opacidad,
    pointerEvents: "none",
    transform: `rotate(${esGuardar ? -8 : 8}deg)`,
  };
}
