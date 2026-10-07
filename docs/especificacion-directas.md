# Especificación: publicaciones directas con aviso por notificación

Oct 7, 2026 · @Alejandro Tabares

## Contexto

Programar una publicación desde Facebook a veces la marca como spam y le baja la monetización a la página, sobre todo cuando se publica en grupos grandes. Por eso hay memes que Alejandro prefiere subir directo, a mano, a una hora puntual. El problema es que hoy esa decisión vive en su cabeza: qué meme era y a qué hora tocaba subirlo se olvida.

La app ya guarda una hora por página (`hora_programada`, la que David escribe al elegir). Falta marcar cuáles de esas publicaciones se suben directo y que algo avise cuando se acerca la hora.

## Decisiones tomadas

- Alejandro es quien marca una publicación como directa, desde Por armar, porque es quien arma la tarjeta final. David no marca nada ni ve la etiqueta.
- El aviso llega como notificación por ntfy (ntfy.sh): gratis, sin cuenta, con app para iPhone que suena con la app cerrada. Se eligió Telegram primero, pero el 7 de octubre la app pidió un SMS de verificación que en Colombia se cobra (4.900 COP por una semana de Telegram Premium), así que se descartó.
- El aviso por ntfy en iPhone depende de que iOS despierte la app en segundo plano y el 7 de octubre no llegó al teléfono aunque ntfy aceptó el mensaje. Se agrega el calendario como aviso principal; ntfy queda de respaldo.
- Marcar la publicación como subida reutiliza el campo que ya existe (`publicada`, con quién la marcó y cuándo).
- La hora de la directa es la que David ya escribió. Alejandro puede cambiarla al marcarla, con el mismo selector de horas en punto.

## Historias de usuario

| N.º | Historia | Criterio de aceptación |
| --- | --- | --- |
| D1 | Alejandro marca una publicación de Por armar como directa. | En cada página de una pieza aparece un interruptor "Subir directo". Al activarlo la fila muestra la etiqueta Directa y deja cambiar la hora. David no ve ni el interruptor ni la etiqueta. |
| D2 | Alejandro ve en un solo lugar qué directas le faltan por subir. | La pestaña Directas lista las directas pendientes ordenadas por hora, cada una con imagen, página, hora, cuánto falta (o cuánto lleva de atraso), el texto con botón de copiar y el botón Generar tarjeta, para armar y descargar la tarjeta sin pasar por Por armar. |
| D3 | Alejandro recibe un aviso antes de la hora, con el meme. | Entre 5 y 10 minutos antes de la hora le llega una notificación con la página, la hora, el texto y la imagen. Cada directa avisa una sola vez. |
| D4 | Alejandro tacha la directa cuando ya la subió. | El botón "Ya la subí" marca la publicación como publicada y sale de Directas y deja de avisar. |
| D5 | Alejandro se arrepiente y la deja como publicación normal. | "Dejar de ser directa" la quita de Directas y cancela el aviso pendiente. |
| D6 | Alejandro comprueba que el aviso funciona, sin esperar a un meme real. | El botón Probar notificación de la pestaña Directas manda una notificación de prueba y muestra un diagnóstico: si la función ve el tema, qué contesta ntfy y en qué estado está cada directa pendiente. Nunca muestra el tema. |
| D7 | Alejandro recibe la alarma de cada directa en el calendario del iPhone, que suena aunque la app esté cerrada. | Cada directa en Directas tiene el botón Agregar al calendario, y arriba hay uno para agregar todas. Descarga un archivo .ics con un evento a la hora de la directa (página y texto en el título y la descripción) y dos alarmas: 10 minutos antes y a la hora. Si se vuelve a agregar la misma directa, el calendario actualiza el evento en vez de duplicarlo. Si la hora cambia, se vuelve a agregar y se corrige. |

## Datos que cambian

Dos columnas nuevas en `publicaciones`:

| Campo | Detalle |
| --- | --- |
| `directa` | Verdadero si se sube a mano a la hora indicada. Por defecto falso. |
| `aviso_enviado_en` | Cuándo se mandó el aviso. Vacío mientras no se haya mandado. Se vacía de nuevo si cambia la hora o se vuelve a marcar como directa, para que avise otra vez. |

## Cómo funciona el aviso

Una función programada de Netlify corre cada 5 minutos. Busca publicaciones directas, no publicadas, sin aviso enviado, de piezas que siguen en Por armar (no archivadas), cuya hora cae dentro de los próximos 10 minutos o se pasó hace menos de 30. Para cada una publica una notificación en ntfy (título con la página, mensaje con hora y texto, imagen adjunta por enlace temporal de 6 horas) y, si ntfy responde bien, anota `aviso_enviado_en`. Si falla, no anota nada y lo reintenta en la corrida siguiente.

Como corre cada 5 minutos, el aviso llega entre 5 y 10 minutos antes de la hora, no a la hora exacta. Si se marca una directa cuando faltan menos de 10 minutos, avisa en la corrida siguiente. Si se marca cuando ya pasaron más de 30 minutos de la hora, no avisa: se ve en Directas como atrasada.

Variable de entorno nueva: `NTFY_TOPIC`, el nombre del tema al que se suscribe Alejandro en la app. Sin ella, o si tiene menos de 16 caracteres, la función no manda nada y lo deja en el log.

## Aviso por calendario

Todo ocurre en el navegador, sin servidor: el botón arma un archivo .ics con los datos que Directas ya tiene cargados y el iPhone ofrece agregarlo al Calendario. El evento no lleva el enlace de la imagen, porque ese enlace es temporal y daría acceso al archivo. Cada evento usa un identificador fijo (`directa-<id>@memes-primo`), así que importarlo otra vez lo actualiza. El calendario no se entera si Alejandro marca la directa como subida o deja de ser directa: el evento queda y hay que borrarlo a mano. No se probó en el iPhone desde el entorno de desarrollo; la primera prueba real es abrir el archivo en Safari.

## Pantallas

- Por armar (Alejandro): cada página de una pieza suma el interruptor "Subir directo", la etiqueta y el selector de hora cuando está activa.
- Directas (Alejandro): pestaña nueva, solo para él, con la lista descrita en D2 y los botones "Ya la subí" y "Dejar de ser directa".

## Fuera de esta versión

- Aviso a la hora exacta o varios avisos por publicación.
- Avisos para David.
- Enlace dentro de la notificación para abrir la app: llevaría el código privado de Alejandro a un servicio externo, y el aviso ya trae todo lo que hace falta.
- Subir a Facebook desde la app.

## Riesgos y preguntas abiertas

- [ ] En el ntfy público el nombre del tema es lo único que protege las notificaciones: quien lo sepa puede leerlas y escribirlas. Por eso va solo en las variables de entorno de Netlify y en la app, largo y al azar. Si se filtra, se cambia en los dos lados. Los memes no son información sensible, pero el enlace temporal de la imagen sí viaja por ahí durante 6 horas.
- [ ] Las funciones programadas de Netlify solo corren en el deploy de producción y pueden retrasarse un par de minutos. Con la ventana de 10 minutos eso no debería hacerle perder un aviso, pero no está medido.
- [ ] Hay que confirmar con un meme de prueba que la app de ntfy muestra la imagen adjunta desde el enlace temporal de R2. Si no la muestra, el aviso igual llega con página, hora y texto, y la imagen está en Directas.
