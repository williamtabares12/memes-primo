// Iconos SVG simples, en línea (sin librería aparte) para las
// acciones principales de la app. Todos heredan color y tamaño de
// la clase .icono en index.css.

export function IconoDescartar(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconoGuardar(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function IconoElegir(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="m12 3 2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.2-5.3 3.2 1.3-6-4.6-4.1 6.1-.6Z" />
    </svg>
  );
}

export function IconoCopiar(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function IconoSubir(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function IconoDescargar(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export function IconoRecuperar(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="M4 4v6h6" />
      <path d="M20 13a8 8 0 1 1-2.6-6.9L20 10" />
    </svg>
  );
}

export function IconoReloj(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function IconoCheck(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <path d="m4 12 6 6L20 6" />
    </svg>
  );
}

export function IconoImagen(props) {
  return (
    <svg viewBox="0 0 24 24" className="icono" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5.5-5.5L4 21" />
    </svg>
  );
}
