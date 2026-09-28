// GET /.netlify/functions/quien-soy?codigo=...
//
// El frontend llama esto al abrir /revisar o /armar, antes de
// mostrar nada. Si el código no es válido, muestra "enlace no
// válido" en vez de la pantalla. Es también el ejemplo de cómo
// cualquier otra función debe validar el código primero.

import { identificarUsuario, respuestaNoAutorizado } from "./_lib/auth.mts";

export default async (req: Request) => {
  const codigo = new URL(req.url).searchParams.get("codigo");
  const usuario = identificarUsuario(codigo);

  if (!usuario) return respuestaNoAutorizado();

  return new Response(JSON.stringify({ usuario }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
