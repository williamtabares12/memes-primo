import "./App.css";

// Página de arranque. Las pantallas reales (Revisar, Por armar,
// Guardadas y descartadas, Páginas, Subir lote) se construyen
// tarea por tarea siguiendo docs/plan-tecnico.md.
//
// Cada persona entra con su propio enlace privado, algo como:
//   /revisar?codigo=<LINK_CODE_DAVID>
//   /armar?codigo=<LINK_CODE_ALEJANDRO>
// La función que valida esos códigos todavía no existe (tarea
// "Generar los dos enlaces privados y la función que los valida").

function App() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>App de memes</h1>
      <p>Proyecto base. Todavía no hay pantallas funcionales.</p>
      <p>
        Ver <code>docs/especificacion.md</code> y{" "}
        <code>docs/plan-tecnico.md</code> para el detalle de lo que se va a
        construir.
      </p>
    </main>
  );
}

export default App;
