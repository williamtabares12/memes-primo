// Endpoint temporal de diagnóstico: dice si las variables de entorno
// llegaron a la función y cuántos caracteres tienen, sin revelar su
// valor. Se borra en cuanto quede confirmado que todo está bien.

export default async () => {
  const vars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "LINK_CODE_ALEJANDRO",
    "LINK_CODE_DAVID",
  ];

  const estado = Object.fromEntries(
    vars.map((nombre) => {
      const valor = process.env[nombre];
      return [
        nombre,
        valor ? `presente (${valor.length} caracteres)` : "AUSENTE",
      ];
    })
  );

  return new Response(JSON.stringify(estado, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
