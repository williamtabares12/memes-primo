// Qué páginas puede ver y tocar cada usuario (docs/especificacion-
// tercer-usuario.md, T7). Alejandro y David ven todas. Wilson solo las
// que tienen asignada_a = 'wilson'. Se comprueba siempre en el
// servidor: esconder cosas en pantalla no protege nada.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Usuario } from "./auth.mts";

/**
 * null = sin restricción (ve todas las páginas). Una lista = solo esas.
 * Solo consulta la columna asignada_a cuando hace falta, o sea para
 * Wilson, así Alejandro y David no dependen de que la migración 0016
 * ya esté corrida.
 */
export async function idsDePaginasPermitidas(
  db: SupabaseClient,
  usuario: Usuario
): Promise<string[] | null> {
  if (usuario !== "wilson") return null;
  const { data, error } = await db.from("paginas").select("id").eq("asignada_a", "wilson");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => p.id as string);
}
