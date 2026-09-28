import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

// Pantalla "Subir lote" (Alejandro, H1). Elige las imágenes, escribe
// la fuente una sola vez y sube. Las imágenes van directo a R2 desde
// el navegador: esta pantalla solo habla con /subir-lote para pedir
// las URL firmadas, nunca sube el archivo a través de Netlify.

const ESTADO_INICIAL = "inicial";
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
  const inputArchivosRef = useRef(null);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    fetch(`/.netlify/functions/quien-soy?codigo=${encodeURIComponent(codigo)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((datos) => {
        setEstado(datos.usuario === "alejandro" ? ESTADO_LISTO : ESTADO_ENLACE_INVALIDO);
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

    const { imagenes } = await respuesta.json();
    const erroresSubida = [];
    let hechas = 0;

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
        <h1>Listo</h1>
        <p>
          Se subieron {exitosas} de {progreso.total} imágenes.
        </p>
        {errores.length > 0 && (
          <ul style={{ color: "var(--error)", textAlign: "left" }}>
            {errores.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <button onClick={subirOtroLote} style={estiloBotonPrincipal}>
          Subir otro lote
        </button>
        <Link
          to={`/armar?codigo=${encodeURIComponent(codigo)}`}
          style={{ textAlign: "center", color: "var(--accent)", textDecoration: "none" }}
        >
          Ir a Por armar
        </Link>
      </Pantalla>
    );
  }

  const subiendo = estado === ESTADO_SUBIENDO;

  return (
    <Pantalla>
      <h1>Subir lote</h1>

      <label style={estiloCampo}>
        Fuente
        <input
          type="text"
          value={fuente}
          onChange={(evento) => setFuente(evento.target.value)}
          placeholder="Ej. Cosquilla-Zona Farándula"
          disabled={subiendo}
          style={estiloInput}
        />
      </label>

      <label style={estiloCampo}>
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
        <p>{archivos.length} imágenes seleccionadas.</p>
      )}

      {subiendo && (
        <p>
          Subiendo… {progreso.hechas} de {progreso.total}
        </p>
      )}

      {errores.length > 0 && (
        <p style={{ color: "var(--error)" }}>{errores[0]}</p>
      )}

      <button
        onClick={subirLote}
        disabled={subiendo || !fuente.trim() || archivos.length === 0}
        style={estiloBotonPrincipal}
      >
        {subiendo ? "Subiendo…" : `Subir ${archivos.length || ""} imágenes`}
      </button>
    </Pantalla>
  );
}

function Pantalla({ children }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {children}
    </main>
  );
}

const estiloCampo = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 600,
  color: "var(--text-h)",
};

const estiloInput = {
  font: "inherit",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-suave)",
  color: "var(--text-h)",
};

const estiloBotonPrincipal = {
  padding: "14px 20px",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer",
};
