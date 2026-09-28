// Envoltorio compartido por las 4 pantallas: ancho máximo para
// verse bien en celular, con algo de aire arriba/abajo.
export default function Pantalla({ children }) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "20px 16px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: "100svh",
      }}
    >
      {children}
    </main>
  );
}
