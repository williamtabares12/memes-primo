import { BrowserRouter, Routes, Route } from "react-router-dom";
import SubirLote from "./pantallas/SubirLote.jsx";
import Revisar from "./pantallas/Revisar.jsx";
import GuardadasDescartadas from "./pantallas/GuardadasDescartadas.jsx";
import PorArmar from "./pantallas/PorArmar.jsx";
import Preseleccion from "./pantallas/Preseleccion.jsx";
import TarjetaLibre from "./pantallas/TarjetaLibre.jsx";
import Directas from "./pantallas/Directas.jsx";
import Pantalla from "./componentes/Pantalla.jsx";

// Cada persona entra con su propio enlace privado, algo como:
//   /subir?codigo=<LINK_CODE_ALEJANDRO>
//   /revisar?codigo=<LINK_CODE_DAVID>
// /armar la ven ambos con su propio código. La pantalla que falta
// (Páginas) se construye en una tarea aparte.

function Inicio() {
  return (
    <Pantalla>
      <h1>Gconted</h1>
      <p>Este enlace no lleva a ninguna pantalla. Pídele a Alejandro el tuyo.</p>
    </Pantalla>
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
        <Route path="/armar" element={<PorArmar />} />
        <Route path="/preseleccion" element={<Preseleccion />} />
        <Route path="/tarjeta-libre" element={<TarjetaLibre />} />
        <Route path="/directas" element={<Directas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
