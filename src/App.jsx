import { BrowserRouter, Routes, Route } from "react-router-dom";
import SubirLote from "./pantallas/SubirLote.jsx";
import Revisar from "./pantallas/Revisar.jsx";
import GuardadasDescartadas from "./pantallas/GuardadasDescartadas.jsx";

// Cada persona entra con su propio enlace privado, algo como:
//   /subir?codigo=<LINK_CODE_ALEJANDRO>
//   /revisar?codigo=<LINK_CODE_DAVID>
// Las pantallas que faltan (Revisar, Guardadas y descartadas, Por
// armar, Páginas) se construyen tarea por tarea siguiendo
// docs/plan-tecnico.md.

function Inicio() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
      <h1>App de memes</h1>
      <p>Este enlace no lleva a ninguna pantalla. Pídele a Alejandro el tuyo.</p>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/subir" element={<SubirLote />} />
        <Route path="/revisar" element={<Revisar />} />
        <Route path="/guardadas" element={<GuardadasDescartadas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
