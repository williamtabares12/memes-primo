// Función programada (ver netlify.toml, corre una vez al día).
//
// Dos limpiezas:
//   1. Imágenes Guardada/Descartada cuya fecha de caducidad ya pasó
//      -> se borra el archivo en R2 y la fila completa (ya no sirven).
//   2. Imágenes con captura donde TODAS sus páginas quedaron
//      Publicadas hace más de 7 días -> se borra solo el archivo de
//      la captura (la fila de la imagen se conserva como historial).
import type { Config } from "@netlify/functions";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

const DIAS_CAPTURA = 7;

export default async (req: Request) => {
  const { next_run } = await req.json();
  console.log("Limpieza diaria iniciada. Próxima corrida:", next_run);

  const db = clienteDb();
  const r2 = clienteR2();
  const bucket = bucketR2();

  let borradasCaducadas = 0;
  let borradasCapturas = 0;

  // 1) Guardada/Descartada caducadas.
  const { data: caducadas, error: errorCaducadas } = await db
    .from("imagenes")
    .select("id, ruta_archivo")
    .in("estado", ["guardada", "descartada"])
    .lte("fecha_caducidad", new Date().toISOString());

  if (errorCaducadas) {
    console.error("Error buscando caducadas:", errorCaducadas.message);
  } else if (caducadas && caducadas.length > 0) {
    for (const imagen of caducadas) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: imagen.ruta_archivo }));
      } catch (err) {
        console.error(`No se pudo borrar ${imagen.ruta_archivo} de R2:`, err);
        continue; // si no se pudo borrar el archivo, no se borra la fila
      }
      const { error } = await db.from("imagenes").delete().eq("id", imagen.id);
      if (error) {
        console.error(`No se pudo borrar la fila ${imagen.id}:`, error.message);
      } else {
        borradasCaducadas += 1;
      }
    }
  }

  // 2) Capturas de imágenes publicadas en todas sus páginas hace
  // más de 7 días. Se trae imagen + sus publicaciones y se filtra
  // en código porque el volumen diario es chico (decenas, no miles).
  const cortePublicacion = new Date();
  cortePublicacion.setDate(cortePublicacion.getDate() - DIAS_CAPTURA);

  const { data: conCaptura, error: errorConCaptura } = await db
    .from("imagenes")
    .select("id, ruta_captura, publicaciones(publicada, fecha_publicacion)")
    .not("ruta_captura", "is", null);

  if (errorConCaptura) {
    console.error("Error buscando capturas:", errorConCaptura.message);
  } else if (conCaptura) {
    for (const imagen of conCaptura) {
      const publicaciones = imagen.publicaciones ?? [];
      if (publicaciones.length === 0) continue;

      const todasPublicadas = publicaciones.every((p: any) => p.publicada);
      if (!todasPublicadas) continue;

      const fechas = publicaciones.map((p: any) => new Date(p.fecha_publicacion).getTime());
      const ultimaFecha = new Date(Math.max(...fechas));
      if (ultimaFecha > cortePublicacion) continue;

      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: imagen.ruta_captura }));
      } catch (err) {
        console.error(`No se pudo borrar la captura ${imagen.ruta_captura} de R2:`, err);
        continue;
      }
      const { error } = await db
        .from("imagenes")
        .update({ ruta_captura: null })
        .eq("id", imagen.id);
      if (error) {
        console.error(`No se pudo limpiar ruta_captura de ${imagen.id}:`, error.message);
      } else {
        borradasCapturas += 1;
      }
    }
  }

  console.log(
    `Limpieza diaria terminada. Caducadas borradas: ${borradasCaducadas}. Capturas borradas: ${borradasCapturas}.`
  );

  return new Response("ok");
};

export const config: Config = {
  schedule: "@daily",
};
