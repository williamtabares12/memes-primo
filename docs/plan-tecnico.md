# Plan técnico: app de memes para el primo

Este plan describe cómo se construye lo que dice la especificación (documento aparte). Los precios y límites se consultaron el 28 de septiembre de 2026.

## Arquitectura

La web corre en Netlify, las imágenes viven en R2 y los estados en Supabase. Las imágenes no pasan por Netlify: el navegador las sube y las lee directo de R2 con direcciones firmadas de corta duración. Así el tráfico de imágenes no consume créditos de ancho de banda de Netlify, que cobra 20 créditos por GB.

| Pieza | Qué hace | Servicio |
| --- | --- | --- |
| Web | Pantallas de David y de Alejandro, pensadas primero para el celular | React en Netlify |
| Funciones | Firman las subidas y lecturas, guardan estados y validan el acceso | Netlify Functions |
| Archivos | Imágenes y capturas, en un bucket privado | Cloudflare R2 |
| Base de datos | Páginas, imágenes y publicaciones | Supabase (Postgres) |
| Limpieza | Borra a diario lo que ya caducó | Función programada de Netlify |

Se compararon con Netlify Database y Netlify Blobs, y se descartaron. La base de datos de Netlify cobra 10 créditos por hora activa y comparte los 300 créditos del plan gratis con todo lo demás: si entre los dos usan la app 1,5 horas al día (supuesto mío), serían unos 450 créditos y se pausaría todo el sitio. Blobs no aparece como medidor de almacenamiento en la página de créditos ni tiene un tope publicado para el plan gratis, pero cada subida y lectura pasa por una función, que gasta cómputo y ancho de banda (unos 9 créditos al mes por ancho de banda en el peor caso, según mi cálculo). R2 permite subir y leer directo, sin pasar por Netlify. Detalle de límites: [Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/) y [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs).

## Acceso con enlace privado

Sin usuario ni clave, como se decidió. Cada persona tiene su propio enlace con un código largo e imposible de adivinar, y las funciones lo validan en cada llamada. Con dos enlaces la app sabe quién subió un lote y quién marcó algo como publicado, sin pedir contraseña. El bucket de R2 y la base de datos no tienen acceso público: solo las funciones pueden tocarlos.

El límite de este enfoque: cualquiera que tenga el enlace entra. Si se filtra, se cambia el código en Netlify y se le pasa el enlace nuevo a la persona.

## Modelo de datos

Son cuatro tablas. Por armar es la lista de imágenes en estado Elegida, así que no necesita un estado propio.

| Tabla | Campos principales |
| --- | --- |
| paginas | nombre, visible |
| lotes | fuente, quién subió, fecha de subida |
| imagenes | lote, ruta del archivo en R2, texto (opcional), estado (nueva, guardada, descartada, elegida o armada), fecha de decisión, fecha de caducidad, ruta de la captura (opcional) |
| publicaciones | imagen, página, si está publicada, quién la marcó, fecha |

## Limpieza automática

Una función programada corre una vez al día. Se propone las 3:00 de Colombia, que son las 8:00 UTC (`0 8 * * *`), porque Netlify usa hora UTC. Hace dos cosas:

- Borra el archivo y la fila de las imágenes Guardadas o Descartadas cuya fecha de caducidad (30 días desde la decisión) ya pasó.
- Borra la captura de las imágenes cuyas páginas están todas publicadas hace más de 7 días.

Cada día caducan unas 55 imágenes, muy por debajo del tope de 30 segundos que tienen estas funciones.

## Límites del plan gratis de Netlify

- El plan gratis es por créditos: 300 al mes, con tope duro. Al llegar al límite, el sitio se pausa hasta el mes siguiente, y según su FAQ se pausan todos los proyectos de la cuenta, incluidas tus otras apps. Las cuentas creadas antes del 4 de septiembre de 2025 conservan su plan anterior; conviene mirar en Usage & billing cuál aplica a la tuya.
- Cada despliegue a producción cuesta 15 créditos, así que caben unos 20 al mes si no se gasta nada más. Las vistas previas y los despliegues de rama no cuestan, por eso se desarrolla en una rama y se sube a producción solo cuando algo funciona.
- Cada 10.000 solicitudes cuestan 2 créditos, y el cómputo de funciones cuesta 10 créditos por GB-hora. Con unas 500 solicitudes diarias a Netlify (estimación mía), son unos 3 créditos al mes.
- Las funciones programadas están disponibles en todos los planes, pero solo corren en despliegues publicados.

## Tareas, en orden

Cada tarea es pequeña y se prueba antes de pasar a la siguiente. Entre paréntesis va la historia de la especificación que cumple.

- [ ] Crear el proyecto React, conectarlo a Netlify y desplegar una página vacía desde una rama.
- [ ] Crear el bucket privado en R2 y el proyecto en Supabase, y guardar sus llaves como variables de entorno en Netlify.
- [ ] Crear las cuatro tablas y cargar las páginas de David (H9).
- [ ] Generar los dos enlaces privados y la función que los valida.
- [ ] Subida en lote con la fuente puesta una vez, directo a R2 (H1).
- [ ] Pantalla Revisar en el celular: una imagen por pantalla, tres acciones y contador (H3).
- [ ] Elegir con casillas de páginas y aviso si el chiste ya salió ahí (H4, H8).
- [ ] Guardadas y descartadas en pestañas, con recuperar (H5).
- [ ] Por armar: campo de texto con botón de copiar, subir captura y marcar Armada (H2, H6, H10).
- [ ] Marcar Publicada por página, con quién y cuándo (H7).
- [ ] Función de limpieza programada, probada con el botón Run now.
- [ ] Prueba con una tanda real de 75 imágenes: medir tiempos de subida y de revisión, y revisar el consumo de créditos.

Fuentes: [Precios de Netlify](https://www.netlify.com/pricing/), [Funciones programadas de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/), [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/), [Supabase](https://supabase.com/pricing).
