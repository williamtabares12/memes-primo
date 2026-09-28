-- Esquema inicial: paginas, lotes, imagenes, publicaciones.
-- Ver docs/plan-tecnico.md (Modelo de datos) y docs/especificacion.md
-- (Flujo y estados, Datos que se guardan) para el detalle de cada campo.
--
-- Las funciones de Netlify usan la service_role key, que salta RLS,
-- así que no hace falta política de RLS para que la app funcione.
-- Se deja RLS activado igual, sin políticas, para que nadie pueda
-- leer estas tablas con la llave pública (anon) por error.

create table if not exists paginas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  visible boolean not null default true,
  creada_en timestamptz not null default now()
);

create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  subido_por text not null, -- 'alejandro' o 'david', según el enlace usado
  fecha_subida timestamptz not null default now()
);

create table if not exists imagenes (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes(id) on delete cascade,
  ruta_archivo text not null, -- ruta del objeto en el bucket R2
  texto text, -- opcional, lo escribe David o Alejandro
  estado text not null default 'nueva'
    check (estado in ('nueva', 'guardada', 'descartada', 'elegida', 'armada')),
  fecha_decision timestamptz, -- cuándo pasó de Nueva a Guardada/Descartada/Elegida
  fecha_caducidad timestamptz, -- solo para Guardada/Descartada: fecha_decision + 30 días
  ruta_captura text, -- opcional, la sube Alejandro cuando arma la pieza
  creada_en timestamptz not null default now()
);

create index if not exists imagenes_lote_id_idx on imagenes(lote_id);
create index if not exists imagenes_estado_idx on imagenes(estado);
create index if not exists imagenes_fecha_caducidad_idx on imagenes(fecha_caducidad);

create table if not exists publicaciones (
  id uuid primary key default gen_random_uuid(),
  imagen_id uuid not null references imagenes(id) on delete cascade,
  pagina_id uuid not null references paginas(id) on delete cascade,
  publicada boolean not null default false,
  marcada_por text, -- 'alejandro' o 'david'
  fecha_publicacion timestamptz,
  creada_en timestamptz not null default now(),
  unique (imagen_id, pagina_id) -- una sola fila por imagen y página
);

create index if not exists publicaciones_imagen_id_idx on publicaciones(imagen_id);
create index if not exists publicaciones_pagina_id_idx on publicaciones(pagina_id);

alter table paginas enable row level security;
alter table lotes enable row level security;
alter table imagenes enable row level security;
alter table publicaciones enable row level security;
