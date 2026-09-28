// Función programada (ver netlify.toml y docs/plan-tecnico.md).
// Por ahora es un esqueleto: solo confirma que la función corre.
// Tarea pendiente ("Función de limpieza programada" en el plan técnico):
//   1. Conectar Supabase y buscar imágenes Guardada/Descartada
//      cuya fecha de caducidad ya pasó -> borrar archivo en R2 + fila.
//   2. Buscar imágenes con captura y todas sus páginas Publicadas
//      hace más de 7 días -> borrar solo el archivo de la captura.
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const { next_run } = await req.json();
  console.log("Limpieza diaria ejecutada. Próxima corrida:", next_run);

  // TODO: borrar Guardada/Descartada caducadas (30 días) y
  // capturas de imágenes publicadas en todas sus páginas (7 días).

  return new Response("ok");
};

export const config: Config = {
  schedule: "@daily",
};
