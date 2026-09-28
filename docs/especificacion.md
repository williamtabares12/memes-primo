# Especificación: app de memes para el primo

Sep 28, 2026 · @Alejandro Tabares

## Contexto

Hoy el material viaja por un chat de WhatsApp llamado MEMES-contenido, y ahí se pierde. Alejandro manda cada día una tanda de 70 a 75 imágenes (400 a 500 por semana) (capturas de cuentas como Cosquilla-Zona Farándula y Guarromántico), WhatsApp muestra tres y esconde el resto detrás de un "+22" o un "+47", y la fuente se avisa en un mensaje aparte que no queda pegada a cada imagen.

David, el primo, administra entre 3 y 5 páginas de Facebook de influencers, y Alejandro por ahora le busca contenido solo para dos. De cada tanda elige unas pocas imágenes por página, guarda otras para después y descarta el resto. No sigue un patrón fijo: el mismo chiste puede ir a varias páginas o a ninguna, y nada en el chat marca qué ya usó.

Después Alejandro escribe el texto como tuit en X, toma la captura, le da formato 1:1 en InShot y la sube a Facebook (casi siempre él, a veces David). Postear en X y capturar da el formato exacto de X. Una plantilla de Canva se probó y no convenció, así que queda fuera.

Esta especificación describe la app que reemplaza al chat: subir en lote, revisar desde el celular y seguir cada pieza hasta que se publica.

## Usuarios

Son dos personas con trabajos distintos. La app tiene que servirle a cada una sin estorbar a la otra, y la de David va pensada primero para el celular, porque revisa siempre desde ahí.

| Usuario | Qué hace en la app |
| --- | --- |
| Alejandro | Sube imágenes en lote e indica la fuente. Ve lo que David eligió para cada página, arma el tuit en X, toma la captura, la sube a la app y marca la pieza como armada y luego como publicada. |
| David | Revisa desde el celular, una imagen a la vez. Descarta, guarda para después o elige, y al elegir indica para qué páginas. También puede descargar la captura terminada y marcar la pieza como publicada cuando la sube él. |

## Flujo y estados

Cada imagen tiene dos etapas: primero David decide qué hacer con ella, y solo si la elige pasa a Alejandro, y una sola captura sirve para todas las páginas. Solo Publicada se marca por página.

Diagrama de estados (ver el documento original para la versión visual):

- David decide, por imagen: **Nueva** → **Guardada** / **Descartada** / **Elegida**.
- Guardada y Descartada caducan a los 30 días (se pueden recuperar antes de eso).
- Elegida crea una fila por cada página marcada. La imagen entera pasa por **Por armar** → **Armada** (con captura opcional).
- Por cada página de una imagen Armada: **Publicada** o pendiente, marcada por separado.
- La captura se borra 7 días después de que la imagen queda Publicada en todas sus páginas.

Descartada y Guardada duran 30 días: David puede recuperarlas en ese plazo y después se borra la imagen. Elegida crea una fila por cada página. La captura es una por imagen: Por armar y Armada valen para todas las filas, y Publicada se marca en cada una.

## Historias de usuario

Nueve historias cubren la primera versión. Cada una se da por cumplida cuando pasa su criterio.

| N.º | Historia | Criterio de aceptación |
| --- | --- | --- |
| H1 | Alejandro sube un lote de imágenes y pone la fuente una sola vez. | Una subida acepta al menos 75 imágenes. Todas quedan con la misma fuente y el texto sigue legible en cada una. |
| H2 | David o Alejandro escriben o pegan a mano el texto de una imagen. | La tarjeta tiene un campo de texto opcional, editable en Revisar y en Por armar. Si tiene texto, Por armar muestra un botón para copiarlo. Sin texto, la imagen se puede armar igual. |
| H3 | David pasa las imágenes nuevas una por una con el dedo, desde el celular. | Solo ve las Nuevas, una por pantalla, con las tres acciones al alcance del pulgar. Al decidir, aparece la siguiente sin recargar. |
| H4 | David elige una imagen y marca para qué páginas. | No puede elegir sin marcar al menos una página. Se crea una fila por cada página marcada. |
| H5 | David guarda para después o descarta. | Guardadas queda en una pila aparte que puede reabrir; a los 30 días se borra la imagen, igual que una descartada. Descartada se puede recuperar durante 30 días; después se borra la imagen. |
| H6 | Alejandro ve lo que debe armar, con las páginas de cada imagen. | La lista muestra imagen, texto y fuente, con filtro por página. Marcar Armada saca la imagen de Por armar y vale para todas sus páginas. |
| H7 | Alejandro o David marcan una pieza como publicada. | Publicada se marca por página, guarda quién la marcó y qué día, y la fila sale de las listas activas. |
| H8 | David ve si un chiste ya salió en una página antes de repetirlo. | Al elegir para una página donde esa imagen ya está Publicada, la app avisa antes de crear la fila. |
| H9 | David mantiene la lista de páginas que administra. | Puede agregar, renombrar y ocultar páginas desde una pantalla simple. Ocultar no borra el historial. |
| H10 | Alejandro sube la captura terminada de una imagen y cualquiera de los dos puede descargarla. | Armada acepta una captura opcional, guardada tal como se sube. David o Alejandro la ven y la descargan desde el celular. Marcar Armada no exige captura. La captura se borra 7 días después de que la imagen queda Publicada en todas sus páginas. |

## Datos que se guardan

Son tres cosas: la imagen, la fila que nace por cada página elegida, y la lista de páginas. Nada más entra en la primera versión.

| Entidad | Campo | Detalle |
| --- | --- | --- |
| Imagen | Archivo | La imagen tal como se sube, sin recomprimir. |
| Imagen | Fuente | Cuenta de origen, escrita una vez por lote (por ejemplo, Cosquilla-Zona Farándula). |
| Imagen | Texto | Texto de la imagen, escrito o pegado a mano por David o Alejandro. Es opcional. |
| Imagen | Lote | Quién subió y en qué fecha. |
| Imagen | Estado de revisión | Nueva, Guardada, Descartada o Elegida, con la fecha de la decisión. Una Elegida pasa después por Por armar y Armada. |
| Fila por página | Página | La página de Facebook para la que David eligió la imagen. |
| Fila por página | Estado | Publicada o pendiente. Por armar y Armada son estados de la imagen entera, no de la página. |
| Fila por página | Publicación | Quién la marcó como publicada y qué día. |
| Imagen | Captura final | Una por imagen, sirve para todas sus páginas. Es opcional; la sube Alejandro y los dos pueden verla y descargarla. Se borra 7 días después de quedar publicada en todas sus páginas. |
| Página | Nombre y visibilidad | Nombre de la página y si está visible u oculta. |

## Almacenamiento

Con las reglas de limpieza acordadas (descartadas y guardadas a los 30 días, capturas publicadas a la semana), casi todo lo que se acumula son las imágenes que David elige. La tabla calcula el techo, suponiendo hasta 20 elegidas por día.

| Qué se guarda | Cuánto tiempo | Cantidad | Peso por archivo | Espacio ocupado |
| --- | --- | --- | --- | --- |
| Descartadas y Guardadas | Hasta 30 días | Hasta 2.250 | 15 a 200 KB | 34 a 450 MB |
| Elegidas (hasta 20 por día) | Se conservan | 7.300 al año | 15 a 200 KB | 110 MB a 1,5 GB por año |
| Capturas finales | 7 días después de publicadas | Unas 140 a la vez | Hasta 300 KB | Hasta 42 MB |
| Total al cerrar el primer año |  |  |  | Hasta 2,0 GB |

Tres servicios con capa gratuita, según sus páginas de precios consultadas el 28 de septiembre de 2026:

| Servicio | Gratis incluye | Al pasar el límite | Detalle |
| --- | --- | --- | --- |
| Supabase | 1 GB de archivos y 500 MB de base de datos | Plan Pro desde 25 USD al mes, con 100 GB de archivos | Trae archivos y base de datos juntos. El plan gratis pausa el proyecto tras una semana sin actividad. |
| Cloudflare R2 | 10 GB de almacenamiento al mes | 0,015 USD por GB al mes | Las descargas no se cobran. No incluye base de datos. |
| Backblaze B2 | Primeros 10 GB | 6,95 USD por TB al mes | Descargas gratis hasta 3 veces lo almacenado. No incluye base de datos. |

Con la limpieza, el peor caso crece unos 1,5 GB al año, solo por las imágenes elegidas. R2 gratis (10 GB) alcanza unos 6 años en ese caso, y pasado el límite el exceso cuesta 0,015 USD por GB al mes. Queda confirmado: R2 para imágenes y capturas, y Supabase gratis solo para la base de datos, que guarda texto y estados y cabe de sobra en 500 MB (estimación mía).

Fuentes: [Supabase](https://supabase.com/pricing), [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/), [Backblaze B2](https://www.backblaze.com/cloud-storage/pricing).

## Pantallas

Son cinco. La de revisar se diseña primero y para el celular, porque es donde se decide todo.

- Subir lote (Alejandro): elige las imágenes, escribe la fuente una vez y sube. Muestra el progreso y avisa cuando terminó.
- Revisar (David, celular): una imagen por pantalla, con la fuente arriba y debajo un campo para escribir o pegar el texto. Tres botones grandes abajo: Descartar, Guardar y Elegir. Al elegir se abre la lista de páginas con casillas. Un contador dice cuántas Nuevas faltan.
- Guardadas y descartadas (David): las dos pilas en una sola pantalla con pestañas. Cada tarjeta permite elegir o recuperar.
- Por armar (Alejandro): lista de imágenes elegidas, cada una con las páginas para las que se eligió. Cada fila trae la imagen, el texto con botón para copiarlo un botón para subir la captura terminada y el botón Armada y un botón Publicada por cada página. David también ve esta pantalla y puede descargar las capturas.
- Páginas (David): lista con agregar, renombrar y ocultar.

## Fuera de la primera versión

La idea es tener algo que David abra todos los días antes de agregarle más. Esto queda para después, y solo entra si el uso real lo pide.

- Lectura automática del texto de las imágenes con IA. Cuesta por cada imagen y los lotes son grandes, así que primero se mide cuánto rinde y cuánto sale.
- Usuario y clave. La primera versión entra con un enlace privado, porque solo la usan David y Alejandro. La seguridad se reevalúa si el uso crece.
- Recolección automática desde X, Instagram o TikTok. Choca con los términos de esas plataformas y se rompe seguido.
- Publicar en Facebook desde la app. Hoy la captura la sube una persona.
- Generar la imagen del tuit dentro de la app. La plantilla de Canva no convenció, y el formato sale de postear en X.
- Sugerir a qué página va cada chiste. David decide sin patrón fijo y la app no debe adivinar.
- Estadísticas de rendimiento por página o por chiste.
- Notificaciones al celular cuando llega un lote.

## Preguntas abiertas y riesgos

- [ ] Lectura automática de texto: queda fuera por el costo. Antes de sumarla, se prueba con 20 imágenes reales de la última tanda para ver cuánto acierta con letra decorativa (como el meme rosa de la captura de WhatsApp) y cuánto cuesta por imagen.

Riesgo de derechos: republicar memes de otras cuentas en páginas que monetizan puede traer reportes o bloqueos a la página. La app guarda la fuente de cada imagen para poder acreditar o responder a un reclamo, pero la decisión de publicar es de David.
