export default function BarraProgreso({ hechas, total }) {
  const porcentaje = total > 0 ? Math.round((hechas / total) * 100) : 0;
  return (
    <div
      style={{
        height: 8,
        borderRadius: 999,
        background: "var(--bg-elevada)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${porcentaje}%`,
          background: "var(--accent)",
          borderRadius: 999,
          transition: "width 160ms ease",
        }}
      />
    </div>
  );
}
