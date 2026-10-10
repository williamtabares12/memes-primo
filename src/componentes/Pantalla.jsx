// Envoltorio compartido por todas las pantallas: ancho máximo para
// verse bien en celular, con algo de aire arriba/abajo y la marca de
// la app (Gconted - El Queru S.A.S) arriba.
export default function Pantalla({ children }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "20px 16px 84px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: "100svh",
      }}
    >
      <header className="marca">
        <span className="marca-nombre">Gconted</span>
        <span className="marca-empresa">El Queru S.A.S</span>
      </header>
      {children}
    </main>
  );
}
