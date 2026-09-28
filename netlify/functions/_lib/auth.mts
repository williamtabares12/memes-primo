// Valida el código del enlace privado (ver "Acceso con enlace privado"
// en docs/plan-tecnico.md). Cada función que toca datos de Supabase o
// R2 debe llamar a identificarUsuario() antes de hacer nada y devolver
// 401 si viene null.
//
// No hay usuario ni clave: el código en la URL ES la credencial.
// LINK_CODE_ALEJANDRO y LINK_CODE_DAVID se guardan como variables de
// entorno (en .env local y en Netlify para producción) y nunca se
// escriben en el código.

import { timingSafeEqual } from "node:crypto";

export type Usuario = "alejandro" | "david";

// Compara con tiempo constante para no filtrar el código por cuánto
// tarda la respuesta. Si algún día se filtra igual, se rota el
// código en Netlify y se le pasa el enlace nuevo a la persona.
function coincide(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Recibe el código que viene en la URL (`?codigo=...`) y dice de
 * quién es, o null si no coincide con ninguno de los dos o si las
 * variables de entorno no están configuradas.
 */
export function identificarUsuario(codigo: string | null): Usuario | null {
  if (!codigo) return null;

  const deAlejandro = process.env.LINK_CODE_ALEJANDRO;
  const deDavid = process.env.LINK_CODE_DAVID;

  if (deAlejandro && coincide(codigo, deAlejandro)) return "alejandro";
  if (deDavid && coincide(codigo, deDavid)) return "david";
  return null;
}

/** Respuesta 401 lista para devolver cuando el código no es válido. */
export function respuestaNoAutorizado(): Response {
  return new Response(JSON.stringify({ error: "Enlace no válido." }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
