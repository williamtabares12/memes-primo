# App de memes para el primo

Proyecto hecho con Spec-Driven Development: primero la especificación,
luego el plan técnico, y de ahí las tareas de código.

- **Especificación** (qué hace la app, para quién, historias de usuario):
  [`docs/especificacion.md`](docs/especificacion.md)
- **Plan técnico** (arquitectura, modelo de datos, tareas en orden):
  [`docs/plan-tecnico.md`](docs/plan-tecnico.md)

## Stack

- React (Vite) desplegado en Netlify.
- Netlify Functions para firmar subidas/lecturas y validar los enlaces privados.
- Cloudflare R2 para las imágenes y capturas.
- Supabase (Postgres) para páginas, imágenes y publicaciones.

## Poner esto en GitHub

1. Crear un repositorio vacío en GitHub (sin README, sin .gitignore: ya los trae este proyecto).
2. Desde esta carpeta:

   ```bash
   git init
   git add .
   git commit -m "Proyecto base: especificación, plan técnico y scaffold de React"
   git branch -M main
   git remote add origin <URL_DE_TU_REPOSITORIO>
   git push -u origin main
   ```

## Desarrollo local

```bash
npm install
npm run dev
```

Copia `.env.example` a `.env` y llena las llaves de Supabase y R2 antes de
usar cualquier función (`netlify/functions/`). `.env` nunca se sube a git.

## Conectar a Netlify

1. En Netlify: **Add new site > Import an existing project**, y elige este repositorio de GitHub.
2. Build command: `npm run build` — Publish directory: `dist` (ya configurado en `netlify.toml`).
3. En **Site configuration > Environment variables**, agrega las mismas variables de `.env.example`.
4. El primer despliegue sale a una URL de Netlify; el dominio propio se configura después si hace falta.

## Estado

Proyecto recién creado: solo tiene una página vacía. Las tareas siguientes
están listadas, en orden, al final de `docs/plan-tecnico.md`.
