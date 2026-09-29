// Cliente mínimo para la API oficial de Reddit (OAuth "client
// credentials", pensado justo para leer contenido público sin
// necesitar una cuenta de usuario). Nada de esto scrapea la página:
// es el mismo mecanismo que usa cualquier app registrada en
// https://www.reddit.com/prefs/apps (tipo "script").

const USER_AGENT = "memes-primo-importer/1.0 (uso personal, por Alejandro)";

interface TokenCache {
  token: string;
  expiraEn: number; // epoch ms
}

let cache: TokenCache | null = null;

async function obtenerToken(): Promise<string> {
  if (cache && cache.expiraEn > Date.now() + 5000) {
    return cache.token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.");
  }

  const respuesta = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo autenticar con Reddit (${respuesta.status}).`);
  }

  const datos = await respuesta.json();
  cache = {
    token: datos.access_token,
    expiraEn: Date.now() + (datos.expires_in ?? 3600) * 1000,
  };
  return cache.token;
}

export interface PostReddit {
  id: string;
  titulo: string;
  url: string;
  puntaje: number;
  esImagen: boolean;
  esNsfw: boolean;
  fijado: boolean;
}

const EXTENSIONES_IMAGEN = [".jpg", ".jpeg", ".png", ".gif"];

function pareceImagen(post: any): boolean {
  if (post.post_hint === "image") return true;
  const url: string = post.url ?? "";
  return EXTENSIONES_IMAGEN.some((ext) => url.toLowerCase().endsWith(ext));
}

// Trae los posts más votados de un subreddit en las últimas 24h
// (t=day), que es justo la señal de "ya es viral" que hoy Alejandro
// intenta adivinar a ojo scrolleando Facebook.
export async function topDelDia(subreddit: string, limite = 100): Promise<PostReddit[]> {
  const token = await obtenerToken();
  const respuesta = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/top?t=day&limit=${limite}`,
    { headers: { Authorization: `Bearer ${token}`, "user-agent": USER_AGENT } }
  );

  if (!respuesta.ok) {
    throw new Error(`Reddit devolvió ${respuesta.status} para r/${subreddit}.`);
  }

  const datos = await respuesta.json();
  const hijos = datos?.data?.children ?? [];

  return hijos.map((hijo: any) => {
    const post = hijo.data;
    return {
      id: post.id,
      titulo: post.title ?? "",
      url: post.url ?? "",
      puntaje: post.score ?? 0,
      esImagen: pareceImagen(post),
      esNsfw: Boolean(post.over_18),
      fijado: Boolean(post.stickied),
    };
  });
}
