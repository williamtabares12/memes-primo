import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import BarraProgreso from "../componentes/BarraProgreso.jsx";
import { IconoCheck, IconoSubir } from "../componentes/Iconos.jsx";
import { FUENTES } from "../componentes/fuentes.js";

// Pantalla "Subir lote" (Alejandro, H1). Elige las imágenes, escribe
// la fuente una sola vez y sube. Las imágenes van directo a R2 desde
// el navegador: esta pantalla solo habla con /subir-lote para pedir
// las URL firmadas, nunca sube el archivo a través de Netlify.

const ESTADO_VALIDANDO = "validando";
const ESTADO_LISTO = "listo";
const ESTADO_SUBIENDO = "subiendo";
const ESTADO_TERMINADO = "terminado";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";

export default function SubirLote() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [fuente, setFuente] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [errores, setErrores] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const inputArchivosRef = useRef(null);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    fetch(`/.netlify/functions/quien-soy?codigo=${encodeURIComponent(codigo)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((datos) => {
        const puedeSubir = datos.usuario === "alejandro" || datos.usuario === "wilson";
        setUsuario(puedeSubir ? datos.usuario : null);
        setEstado(puedeSubir ? ESTADO_LISTO : ESTADO_ENLACE_INVALIDO);
      })
      .catch(() => setEstado(ESTADO_ENLACE_INVALIDO));
  }, [codigo]);

  function elegirArchivos(evento) {
    setArchivos(Array.from(evento.target.files ?? []));
  }

  async function subirLote() {
    if (!fuente.trim() || archivos.length === 0) return;

    setEstado(ESTADO_SUBIENDO);
    setErrores([]);
    setProgreso({ hechas: 0, total: archivos.length });

    let respuesta;
    try {
      respuesta = await fetch("/.netlify/functions/subir-lote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo,
          fuente: fuente.trim(),
          archivos: archivos.map((archivo) => ({
            nombre: archivo.name,
            tipo: archivo.type,
          })),
        }),
      });
    } catch {
      setErrores(["No se pudo conectar con el servidor. Intenta de nuevo."]);
      setEstado(ESTADO_LISTO);
      return;
    }

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      setErrores([cuerpo.error ?? "No se pudo crear el lote."]);
      setEstado(ESTADO_LISTO);
      return;
    }

    let imagenes;
    try {
      ({ imagenes } = await respuesta.json());
    } catch {
      setErrores(["El servidor respondió con algo inesperado. Intenta de nuevo."]);
      setEstado(ESTADO_LISTO);
      return;
    }

    const erroresSubida = [];
    let hechas = 0;

    try {
      // Se suben de a poco en paralelo (5 a la vez) para no saturar la
      // conexión del celular con 75 subidas simultáneas.
      const TAMANO_LOTE_PARALELO = 5;
      for (let inicio = 0; inicio < imagenes.length; inicio += TAMANO_LOTE_PARALELO) {
        const tanda = imagenes.slice(inicio, inicio + TAMANO_LOTE_PARALELO);
        await Promise.all(
          tanda.map(async (imagen, indiceEnTanda) => {
            const archivo = archivos[inicio + indiceEnTanda];
            try {
              const subida = await fetch(imagen.url_subida, {
                method: "PUT",
                headers: { "content-type": archivo.type || "application/octet-stream" },
                body: archivo,
              });
              if (!subida.ok) {
                erroresSubida.push(`${imagen.nombre_original}: falló la subida.`);
              }
            } catch {
              erroresSubida.push(`${imagen.nombre_original}: falló la subida.`);
            }
            hechas += 1;
            setProgreso({ hechas, total: imagenes.length });
          })
        );
      }
    } catch {
      erroresSubida.push("Algo inesperado interrumpió la subida.");
    }

    setErrores(erroresSubida);
    setEstado(ESTADO_TERMINADO);
  }

  function subirOtroLote() {
    setFuente("");
    setArchivos([]);
    setErrores([]);
    setProgreso({ hechas: 0, total: 0 });
    if (inputArchivosRef.current) inputArchivosRef.current.value = "";
    setEstado(ESTADO_LISTO);
  }

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }

  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona o no es el de subir lotes.</p>
      </Pantalla>
    );
  }

  if (estado === ESTADO_TERMINADO) {
    const exitosas = progreso.total - errores.length;
    return (
      <Pantalla>
        <div className="tarjeta" style={{ textAlign: "center", padding: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--exito-bg)",
              color: "var(--exito)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <IconoCheck />
          </div>
          <h1>Listo</h1>
          <p style={{ marginTop: 6 }}>
            Se subieron {exitosas} de {progreso.total} imágenes.
          </p>
          {errores.length > 0 && (
            <ul style={{ color: "var(--error)", textAlign: "left", fontSize: 14 }}>
              {errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={subirOtroLote} className="btn btn-primario btn-grande">
          Subir otro lote
        </button>
        <Link
          to={`/armar?codigo=${encodeURIComponent(codigo)}`}
          className="chip"
          style={{ alignSelf: "center", padding: "8px 16px" }}
        >
          Ir a Por armar
        </Link>
        <BarraInferior usuario={usuario} codigo={codigo} />
      </Pantalla>
    );
  }

  const subiendo = estado === ESTADO_SUBIENDO;

  return (
    <Pantalla>
      <h1>Subir lote</h1>

      <label className="campo">
        Fuente
        <select
          value={fuente}
          onChange={(evento) => setFuente(evento.target.value)}
          disabled={subiendo}
        >
          <option value="" disabled>
            Elige una fuente
          </option>
          {FUENTES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        Imágenes
        <input
          ref={inputArchivosRef}
          type="file"
          accept="image/*"
          multiple
          onChange={elegirArchivos}
          disabled={subiendo}
        />
      </label>

      {archivos.length > 0 && !subiendo && (
        <p style={{ margin: 0, fontSize: 14 }}>{archivos.length} imágenes seleccionadas.</p>
      )}

      {subiendo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Subiendo… {progreso.hechas} de {progreso.total}
          </p>
          <BarraProgreso hechas={progreso.hechas} total={progreso.total} />
        </div>
      )}

      {errores.length > 0 && (
        <p style={{ color: "var(--error)", fontSize: 14, margin: 0 }}>{errores[0]}</p>
      )}

      {!subiendo && (!fuente.trim() || archivos.length === 0) && (
        <p style={{ color: "var(--text)", fontSize: 13, opacity: 0.75, margin: 0 }}>
          {!fuente.trim() && "Elige la fuente"}
          {!fuente.trim() && archivos.length === 0 && " y elige las imágenes"}
          {fuente.trim() && archivos.length === 0 && "Elige las imágenes"}
          {" para poder subir."}
        </p>
      )}

      <button
        onClick={subirLote}
        disabled={subiendo || !fuente.trim() || archivos.length === 0}
        className="btn btn-primario btn-grande"
      >
        {subiendo ? (
          "Subiendo…"
        ) : (
          <>
            <IconoSubir /> Subir {archivos.length || ""} imágenes
          </>
        )}
      </button>
      <BarraInferior usuario={usuario} codigo={codigo} />
    </Pantalla>
  );
}
