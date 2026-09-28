// Cliente de Supabase para las funciones de Netlify. Usa la
// service_role key, que salta RLS, así que cada función es
// responsable de validar el código del enlace antes de tocar datos
// (ver _lib/auth.mts).

import { createClient } from "@supabase/supabase-js";

export function clienteDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Faltan las variables de entorno de Supabase.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
