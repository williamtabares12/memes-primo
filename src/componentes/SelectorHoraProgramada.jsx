import { HORAS_FIJAS, fechaHoyLocal } from "./horasFijas.js";

// Fecha (libre) + hora (franja fija) para cuando David elige una
// página al armar una pieza. Obligatorio: no se puede confirmar
// "Elegir" sin las dos, ver el botón Confirmar en Revisar/Guardadas.
export default function SelectorHoraProgramada({ valor, onCambiar }) {
  const fecha = valor?.fecha || fechaHoyLocal();
  const hora = valor?.hora || "";

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        type="date"
        value={fecha}
        min={fechaHoyLocal()}
        onChange={(evento) => onCambiar({ fecha: evento.target.value, hora })}
        style={{ fontSize: 14 }}
      />
      <select
        value={hora}
        onChange={(evento) => onCambiar({ fecha, hora: evento.target.value })}
        style={{ fontSize: 14, color: hora ? "var(--text-h)" : "var(--text)" }}
      >
        <option value="" disabled>
          Hora
        </option>
        {HORAS_FIJAS.map((h) => (
          <option key={h.valor} value={h.valor}>
            {h.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
