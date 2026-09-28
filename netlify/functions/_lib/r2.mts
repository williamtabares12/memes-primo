// Cliente para Cloudflare R2 (API compatible con S3). Las imágenes
// nunca pasan por Netlify: el navegador sube directo a R2 con una
// URL firmada de corta duración. Ver "Arquitectura" en
// docs/plan-tecnico.md.

import { S3Client } from "@aws-sdk/client-s3";

export function clienteR2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Faltan las variables de entorno de R2.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function bucketR2(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Falta R2_BUCKET_NAME.");
  return bucket;
}
