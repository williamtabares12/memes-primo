import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import { IconoCheck, IconoCopiar, IconoReloj } from "../componentes/Iconos.jsx";
import { ZONA_BOGOTA } from "../componentes/horasFijas.js";
import GenerarTarjeta from "../componentes/GenerarTarjeta.jsx";
import { descargarIcs } from "../componentes/calendario.js";

// Pantalla Directas (solo Alejandro; docs/especificacion-directas.md,
// D2, D4 y D5). Las publicaciones que se suben a mano a una hora
// puntual en vez de programarlas en Facebook, ordenadas por hora, con
// la imagen y el texto a mano. "Ya la subí" las tacha; "Ya no es
// directa" las devuelve a ser una publicación normal.

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

const MS_RELOJ = 30 * 1000; // refresca el "en 12 min"
const MS_RECARGA = 5 * 60 * 1000; // las imágenes duran 10 min: se renuevan antes

export default function Directas() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [directas, setDirectas] = useState([]);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [prueba, setPrueba] = useState(null); // null | "probando" | resultado del diagnóstico

  const cargar = useCallback(async () => {
    const respuesta = await fetch(`/.netlify/functions/directas?codigo=${encodeURIComponent(codigo)}`);
    // Solo 401/403 significan "enlace no válido". Un error del servidor
    // (por ejemplo, una migración sin correr) se muestra como lo que es,
    // para no confundirlo con un enlace malo.
    if (respuesta.status === 401 || respuesta.status === 403) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudieron cargar las directas.");
      setEstado(ESTADO_LISTO);
      return;
    }
    setError("");
    setDirectas(datos.directas);
    setEstado(ESTADO_LISTO);
  }, [codigo]);

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    cargar();
  }, [codigo, cargar]);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), MS_RELOJ);
    const recarga = setInterval(() => cargar().catch(() => {}), MS_RECARGA);
    // Al volver desde la notificación o de otra app, que se vea lo último.
    function alVolver() {
      if (document.visibilityState === "visible") {
        setAhora(Date.now());
        cargar().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(reloj);
      clearInterval(recarga);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  async function enviar(funcion, cuerpo, mensajeError) {
    setError("");
    const respuesta = await fetch(`/.netlify/functions/${funcion}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codigo, ...cuerpo }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? mensajeError);
      return false;
    }
    return true;
  }

  async function yaLaSubi(id) {
    if (await enviar("marcar-publicada", { publicacion_id: id }, "No se pudo marcar como subida.")) {
      setDirectas((previo) => previo.filter((d) => d.id !== id));
    }
  }

  // Manda una notificación de prueba y trae el diagnóstico del aviso
  // (netlify/functions/probar-aviso.mts), para saber por qué no llega.
  async function probarNotificacion() {
    setPrueba("probando");
    try {
      const respuesta = await fetch("/.netlify/functions/probar-aviso", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      setPrueba(respuesta.ok ? datos : { resumen: datos.error ?? "No se pudo hacer la prueba." });
    } catch {
      setPrueba({ resumen: "No se pudo conectar para hacer la prueba." });
    }
  }

  async function yaNoEsDirecta(id) {
    if (!window.confirm("¿Dejar de tratarla como directa? Ya no te va a avisar.")) return;
    const ok = await enviar(
      "marcar-directa",
      { publicacion_id: id, directa: false },
      "No se pudo quitar de directas."
    );
    if (ok) setDirectas((previo) => previo.filter((d) => d.id !== id));
  }

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }
  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona o no es el de directas.</p>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h1>Directas</h1>
        {directas.length > 0 && <span className="contador">{directas.length} por subir</span>}
      </div>
      <p style={{ fontSize: 13, marginTop: -6 }}>
        Las que subes tú a mano. Te aviso con una notificación unos minutos antes de la hora; desde aquí mismo generas la tarjeta.
      </p>

      {error && <p style={{ color: "var(--error)" }}>{error}</p>}
      {directas.length > 1 && (
        <button
          onClick={() => descargarIcs(directas, "directas")}
          className="btn btn-chico btn-secundario"
          style={{ alignSelf: "flex-start" }}
        >
          <IconoReloj /> Agregar todas al calendario
        </button>
      )}
      {directas.length === 0 && (
        <p>No tienes directas pendientes. Márcalas desde Por armar con "Subir directo".</p>
      )}

      {directas.map((directa) => (
        <TarjetaDirecta
          key={directa.id}
          directa={directa}
          ahora={ahora}
          onSubida={() => yaLaSubi(directa.id)}
          onQuitar={() => yaNoEsDirecta(directa.id)}
        />
      ))}

      <div style={estiloPrueba}>
        <button
          onClick={probarNotificacion}
          disabled={prueba === "probando"}
          className="btn btn-chico btn-secundario"
          style={{ alignSelf: "flex-start" }}
        >
          {prueba === "probando" ? "Probando…" : "Probar notificación"}
        </button>
        {prueba && prueba !== "probando" && <ResultadoPrueba datos={prueba} />}
      </div>

      <BarraInferior usuario="alejandro" codigo={codigo} />
    </Pantalla>
  );
}

function ResultadoPrueba({ datos }) {
  return (
    <div style={estiloResultado}>
      <p style={{ margin: 0, color: "var(--text-h)" }}>{datos.resumen}</p>
      {datos.ntfy_error && <p style={{ margin: 0 }}>ntfy respondió: {datos.ntfy_error}</p>}
      {datos.directas_error && <p style={{ margin: 0 }}>Error leyendo directas: {datos.directas_error}</p>}
      {datos.directas_pendientes?.map((d, i) => (
        <p key={i} style={{ margin: 0 }}>
          {d.pagina}, {new Date(d.hora_programada).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: ZONA_BOGOTA })}: {d.estado}
        </p>
      ))}
    </div>
  );
}

// "en 12 min", "hace 5 min", "ahora"; pasadas 24 h solo queda la hora
// absoluta, que siempre se muestra al lado.
function cuando(horaISO, ahora) {
  const minutos = Math.round((new Date(horaISO).getTime() - ahora) / 60000);
  if (Math.abs(minutos) >= 24 * 60) return { texto: "", atrasada: minutos < 0 };
  if (minutos <= -60) return { texto: `hace ${Math.floor(-minutos / 60)} h`, atrasada: true };
  if (minutos < 0) return { texto: `hace ${-minutos} min`, atrasada: true };
  if (minutos === 0) return { texto: "ahora", atrasada: false };
  if (minutos >= 60) return { texto: `en ${Math.floor(minutos / 60)} h`, atrasada: false };
  return { texto: `en ${minutos} min`, atrasada: false };
}

function TarjetaDirecta({ directa, ahora, onSubida, onQuitar }) {
  const [copiado, setCopiado] = useState(false);
  const { texto: relativo, atrasada } = cuando(directa.hora_programada, ahora);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(directa.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Si el navegador no deja copiar, el texto sigue visible.
    }
  }

  return (
    <div className="tarjeta">
      <img src={directa.url_ver} alt="Imagen" style={{ width: "100%" }} />

      <div style={estiloEncabezado}>
        <strong style={{ color: "var(--text-h)" }}>{directa.pagina_nombre}</strong>
        {relativo && (
          <span
            className="contador"
            style={atrasada ? { color: "var(--error)", background: "var(--error-bg)" } : undefined}
          >
            {relativo}
          </span>
        )}
      </div>

      <div style={estiloHora}>
        <IconoReloj style={{ width: 14, height: 14 }} />
        {new Date(directa.hora_programada).toLocaleString("es-CO", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          timeZone: ZONA_BOGOTA,
        })}
      </div>

      {directa.texto && (
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 10 }}>
          <p style={estiloTexto}>{directa.texto}</p>
          <button onClick={copiar} className="btn btn-chico btn-secundario" style={{ height: 42 }}>
            {copiado ? <IconoCheck /> : <IconoCopiar />}
          </button>
        </div>
      )}

      <button
        onClick={() => descargarIcs([directa], `directa-${directa.id.slice(0, 8)}`)}
        className="btn btn-chico btn-secundario"
        style={{ width: "100%", marginTop: 12 }}
      >
        <IconoReloj /> Agregar al calendario (con alarma)
      </button>

      <div style={{ marginTop: 12 }}>
        <GenerarTarjeta
          texto={directa.texto}
          nombreTuit={directa.nombre_tuit}
          usuarioTuit={directa.usuario_tuit}
          avatarUrl={directa.avatar_url}
          nombreArchivo={`directa-${directa.id.slice(0, 8)}-${directa.pagina_nombre}`}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onQuitar} className="btn btn-chico btn-secundario" style={estiloBoton}>
          Ya no es directa
        </button>
        <button onClick={onSubida} className="btn btn-chico btn-primario" style={estiloBoton}>
          <IconoCheck /> Ya la subí
        </button>
      </div>
    </div>
  );
}

const estiloPrueba = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 8,
};

const estiloResultado = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  padding: 12,
  borderRadius: "var(--radio)",
  background: "var(--bg-elevada)",
  border: "1px solid var(--border-suave)",
};

const estiloEncabezado = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  margin: "10px 0 2px",
};

const estiloHora = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  opacity: 0.75,
};

const estiloTexto = {
  flex: 1,
  margin: 0,
  color: "var(--text-h)",
  whiteSpace: "pre-wrap",
};

const estiloBoton = {
  flex: 1,
  minWidth: 0,
  padding: "12px 8px",
};
