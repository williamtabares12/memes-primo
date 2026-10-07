# Especificación: publicaciones directas con aviso por Telegram

Oct 7, 2026 · @Alejandro Tabares

## Contexto

Programar una publicación desde Facebook a veces la marca como spam y le baja la monetización a la página, sobre todo cuando se publica en grupos grandes. Por eso hay memes que Alejandro prefiere subir directo, a mano, a una hora puntual. El problema es que hoy esa decisión vive en su cabeza: qué meme era y a qué hora tocaba subirlo se olvida.

La app ya guarda una hora por página (`hora_programada`, la que David escribe al elegir). Falta marcar cuáles de esas publicaciones se suben directo y que algo avise cuando se acerca la hora.

## Decisiones tomadas

- Alejandro es quien marca una publicación como directa, desde Por armar, porque es quien arma la tarjeta final. David no marca nada ni ve la etiqueta.
- El aviso llega por un bot de Telegram. Es lo más confiable en iPhone: suena con la app cerrada y no depende de instalar nada en la pantalla de inicio. Alejandro todavía no usa Telegram, así que se instala solo para esto.
- Marcar la publicación como subida reutiliza el campo que ya existe (`publicada`, con quién la marcó y cuándo).
- La hora de la directa es la que David ya escribió. Alejandro puede cambiarla al marcarla, con el mismo selector de horas en punto.

## Historias de usuario

| N.º | Historia | Criterio de aceptación |
| --- | --- | --- |
| D1 | Alejandro marca una publicación de Por armar como directa. | En cada página de una pieza aparece un interruptor "Subir directo". Al activarlo la fila muestra la etiqueta Directa y deja cambiar la hora. David no ve ni el interruptor ni la etiqueta. |
| D2 | Alejandro ve en un solo lugar qué directas le faltan por subir. | La pestaña Directas lista las directas pendientes ordenadas por hora, cada una con imagen, página, hora, cuánto falta (o cuánto lleva de atraso) y el texto con botón de copiar. |
| D3 | Alejandro recibe un aviso antes de la hora, con el meme. | Entre 5 y 10 minutos antes de la hora llega a su Telegram la imagen con página, hora y texto. Cada directa avisa una sola vez. |
| D4 | Alejandro tacha la directa cuando ya la subió. | El botón "Ya la subí" marca la publicación como publicada y sale de Directas y deja de avisar. |
| D5 | Alejandro se arrepiente y la deja como publicación normal. | "Dejar de ser directa" la quita de Directas y cancela el aviso pendiente. |

## Datos que cambian

Dos columnas nuevas en `publicaciones`:

| Campo | Detalle |
| --- | --- |
| `directa` | Verdadero si se sube a mano a la hora indicada. Por defecto falso. |
| `aviso_enviado_en` | Cuándo se mandó el aviso de Telegram. Vacío mientras no se haya mandado. Se vacía de nuevo si cambia la hora o se vuelve a marcar como directa, para que avise otra vez. |

## Cómo funciona el aviso

Una función programada de Netlify corre cada 5 minutos. Busca publicaciones directas, no publicadas, sin aviso enviado, de piezas que siguen en Por armar (no archivadas), cuya hora cae dentro de los próximos 10 minutos o se pasó hace menos de 30. Para cada una manda la foto con un texto corto por la API de Telegram y, si Telegram responde bien, anota `aviso_enviado_en`. Si falla, no anota nada y lo reintenta en la corrida siguiente.

Como corre cada 5 minutos, el aviso llega entre 5 y 10 minutos antes de la hora, no a la hora exacta. Si se marca una directa cuando faltan menos de 10 minutos, avisa en la corrida siguiente. Si se marca cuando ya pasaron más de 30 minutos de la hora, no avisa: se ve en Directas como atrasada.

Variables de entorno nuevas: `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Sin ellas la función no hace nada y deja un aviso en el log.

## Pantallas

- Por armar (Alejandro): cada página de una pieza suma el interruptor "Subir directo", la etiqueta y el selector de hora cuando está activa.
- Directas (Alejandro): pestaña nueva, solo para él, con la lista descrita en D2 y los botones "Ya la subí" y "Dejar de ser directa".

## Fuera de esta versión

- Aviso a la hora exacta o varios avisos por publicación.
- Avisos para David.
- Enlace dentro del mensaje de Telegram: llevaría el código privado de Alejandro a un servicio externo, y el mensaje ya trae todo lo que hace falta.
- Subir a Facebook desde la app.

## Riesgos y preguntas abiertas

- [ ] El token del bot es una credencial: va solo en las variables de entorno de Netlify, nunca en el código. Si se filtra, se revoca con BotFather y se genera otro.
- [ ] Las funciones programadas de Netlify solo corren en el deploy de producción y pueden retrasarse un par de minutos. Con la ventana de 10 minutos eso no debería hacerle perder un aviso, pero no está medido.
- [ ] Hay que confirmar con un meme de prueba que Telegram alcanza a descargar la imagen desde el enlace temporal de R2.
