// Función programada (ver netlify.toml, corre una vez al día).
//
// Imágenes Guardada/Descartada cuya fecha de caducidad ya pasó
// -> se borra el archivo en R2 y la fila completa (ya no sirven).
import type { Config } from "@netlify/functions";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { clienteDb } from "./_lib/db.mts";
import { bucketR2, clienteR2 } from "./_lib/r2.mts";

export default async (req: Request) => {
  const { next_run } = await req.json();
  console.log("Limpieza diaria iniciada. Próxima corrida:", next_run);

  const db = clienteDb();
  const r2 = clienteR2();
  const bucket = bucketR2();

  let borradasCaducadas = 0;

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

  console.log(`Limpieza diaria terminada. Caducadas borradas: ${borradasCaducadas}.`);

  return new Response("ok");
};

export const config: Config = {
  schedule: "@daily",
};
