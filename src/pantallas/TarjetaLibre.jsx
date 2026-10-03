import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pantalla from "../componentes/Pantalla.jsx";
import BarraInferior from "../componentes/BarraInferior.jsx";
import GenerarTarjeta from "../componentes/GenerarTarjeta.jsx";

// Pantalla Tarjeta libre (solo Alejandro). Para cuando David manda un
// texto o una imagen por fuera de la cola normal de Por armar y
// Alejandro solo necesita la tarjeta con formato de tuit, sin tener
// que esperar a que exista una pieza "elegida" en la base de datos.
// Reutiliza GenerarTarjeta tal cual: ese componente ya es 100%
// controlado por props y no depende de ninguna imagen guardada.

const ESTADO_VALIDANDO = "validando";
const ESTADO_ENLACE_INVALIDO = "enlace_invalido";
const ESTADO_LISTO = "listo";

export default function TarjetaLibre() {
  const [searchParams] = useSearchParams();
  const codigo = searchParams.get("codigo");

  const [estado, setEstado] = useState(ESTADO_VALIDANDO);
  const [paginas, setPaginas] = useState([]);
  const [paginaId, setPaginaId] = useState("");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (!codigo) {
      setEstado(ESTADO_ENLACE_INVALIDO);
      return;
    }
    fetch(`/.netlify/functions/paginas-identidad?codigo=${encodeURIComponent(codigo)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((datos) => {
        setPaginas(datos.paginas);
        if (datos.paginas.length > 0) setPaginaId(datos.paginas[0].id);
        setEstado(ESTADO_LISTO);
      })
      .catch(() => setEstado(ESTADO_ENLACE_INVALIDO));
  }, [codigo]);

  if (estado === ESTADO_VALIDANDO) {
    return <Pantalla><p>Comprobando el enlace…</p></Pantalla>;
  }
  if (estado === ESTADO_ENLACE_INVALIDO) {
    return (
      <Pantalla>
        <h1>Enlace no válido</h1>
        <p>Este enlace no funciona o no es el de tarjeta libre.</p>
      </Pantalla>
    );
  }

  const pagina = paginas.find((p) => p.id === paginaId);

  return (
    <Pantalla>
      <h1>Tarjeta libre</h1>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: -6 }}>
        Para cuando David te manda el texto o una imagen por fuera de Por armar:
        elige la página y escribe el texto, sin esperar a que exista una pieza.
      </p>

      {paginas.length === 0 && <p>No hay páginas configuradas todavía.</p>}

      {paginas.length > 0 && (
        <>
          <select value={paginaId} onChange={(evento) => setPaginaId(evento.target.value)}>
            {paginas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Texto del meme…"
            rows={4}
            style={{ width: "100%", marginTop: 10 }}
          />

          {pagina && (
            <div style={{ marginTop: 12 }}>
              <GenerarTarjeta
                texto={texto}
                nombreTuit={pagina.nombre_tuit}
                usuarioTuit={pagina.usuario_tuit}
                avatarUrl={pagina.avatar_url}
                nombreArchivo={`tarjeta-libre-${pagina.nombre}`}
              />
            </div>
          )}
        </>
      )}

      <BarraInferior usuario="alejandro" codigo={codigo} />
    </Pantalla>
  );
}
