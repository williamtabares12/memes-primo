import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import SelectorHoraProgramada from "../componentes/SelectorHoraProgramada.jsx";
import { horaProgramadaISO } from "../componentes/horasFijas.js";
import { IconoElegir, IconoRecuperar } from "../componentes/Iconos.jsx";

// Pantalla Guardadas y descartadas (David, H5). Dos pilas en pestañas;
// cada tarjeta permite recuperar (vuelve a Nueva) o elegir (mismo
// flujo de páginas y hora que en Revisar, H4).

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
  const [paginasMarcadas, setPaginasMarcadas] = useState(new Map());

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
    setPaginasMarcadas(new Map());
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

  async function confirmarElegir() {
    const paginas = Array.from(paginasMarcadas, ([id, { fecha, hora }]) => ({
      id,
      hora_programada: horaProgramadaISO(fecha, hora),
    }));
    const respuesta = await fetch("/.netlify/functions/decidir-imagen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo,
        imagen_id: imagenEligiendo.id,
        decision: "elegida",
        texto: imagenEligiendo.texto,
        paginas,
      }),
    });

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
      <h1>Guardadas y descartadas</h1>

      <div style={estiloPestanas}>
        <button
          onClick={() => setPestana("guardada")}
          className={`btn btn-chico ${pestana === "guardada" ? "btn-primario" : "btn-secundario"}`}
          style={{ flex: 1 }}
        >
          Guardadas
        </button>
        <button
          onClick={() => setPestana("descartada")}
          className={`btn btn-chico ${pestana === "descartada" ? "btn-primario" : "btn-secundario"}`}
          style={{ flex: 1 }}
        >
          Descartadas
        </button>
      </div>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      {cargando && <p>Cargando…</p>}

      {!cargando && imagenes.length === 0 && <p>No hay nada acá.</p>}

      {!cargando &&
        imagenes.map((imagen) => (
          <div key={imagen.id} className="tarjeta">
            <img src={imagen.url_ver} alt="Miniatura" style={{ width: "100%" }} />
            <p style={{ fontWeight: 700, color: "var(--text-h)", margin: "10px 0 2px" }}>
              {imagen.fuente}
            </p>
            {imagen.texto && <p style={{ margin: "0 0 8px" }}>{imagen.texto}</p>}
            <p style={{ fontSize: 13, opacity: 0.7, margin: "0 0 10px" }}>
              Se borra el {new Date(imagen.fecha_caducidad).toLocaleDateString("es-CO")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => recuperar(imagen.id)}
                className="btn btn-chico btn-secundario"
                style={{ flex: 1 }}
              >
                <IconoRecuperar /> Recuperar
              </button>
              <button
                onClick={() => abrirElegir(imagen)}
                className="btn btn-chico btn-primario"
                style={{ flex: 1 }}
              >
                <IconoElegir /> Elegir
              </button>
            </div>
          </div>
        ))}

      {imagenEligiendo && (
        <div style={estiloModal}>
          <div style={estiloModalContenido}>
            <h2>¿Para qué páginas?</h2>
            <p style={{ fontSize: 13, opacity: 0.75, marginTop: -6 }}>
              La hora programada es obligatoria para cada página que marques.
            </p>
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
                onClick={() => setImagenEligiendo(null)}
                className="btn btn-chico btn-secundario"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarElegir}
                disabled={faltaHoraProgramada}
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

const estiloPestanas = { display: "flex", gap: 8 };

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
