# Especificación: un tercer usuario (Wilson) con sus propias páginas

Oct 9, 2026 · @Alejandro Tabares

## Contexto

Un primo, Wilson, se suma al trabajo y hará lo mismo que Alejandro, pero para otras dos páginas de otros influencers: Jordan Hurtado y Hillary. Hoy la app asume dos personas, con permisos fijos por nombre ("alejandro" y "david") repartidos por unas 14 funciones. Las páginas de Wilson no deben mezclarse con las de Alejandro en lo que Wilson ve, pero Alejandro y David sí pueden usar el contenido de él.

## Decisiones tomadas

- Wilson entra con su propio enlace privado, igual que los otros dos: un código largo en una variable de entorno nueva, `LINK_CODE_WILSON`. Sin usuario ni clave. Su nombre interno es `wilson`.
- Wilson sube sus imágenes, arma las tarjetas de sus páginas y las marca como publicadas.
- David sigue revisando todo en Revisar (Descartar, Guardar, Elegir), también lo que sube Wilson. Al elegir una imagen puede marcar cualquier página, de Alejandro o de Wilson. Si una imagen de Wilson le gusta para El Chanty o El Traveler, la elige para esas páginas.
- Lo que cada persona ve se decide por página, no por quién subió la imagen: cada página tiene un dueño (`paginas.asignada_a`). `lotes.subido_por` solo dice quién la subió.
- Por armar de Alejandro muestra todo, incluido lo de Wilson, para poder cubrirlo si a Wilson le pasa algo. Por armar de Wilson muestra solo las filas de sus dos páginas.
- David crea las páginas nuevas solo si existe una pantalla para eso. Hoy no existe (ver Páginas más abajo), así que se crean con una migración.

## Historias de usuario

| N.º | Historia | Criterio de aceptación |
| --- | --- | --- |
| T1 | Wilson entra con su enlace privado. | Con su código ve solo las pestañas Subir, Por armar y Tarjeta. Con un código incorrecto ve Enlace no válido, igual que hoy. |
| T2 | Wilson sube lotes de imágenes. | La subida funciona igual que la de Alejandro. Las imágenes quedan registradas como suyas. |
| T3 | David elige cualquier imagen para cualquier página. | En Revisar, la lista de páginas al elegir muestra todas las visibles, sin importar quién subió la imagen. Una imagen de Wilson puede ir a El Chanty o El Traveler, y una de Alejandro a las de Wilson. |
| T4 | Wilson ve y arma lo de sus páginas. | En Por armar ve las imágenes elegidas para Jordan Hurtado o Hillary, mostrando solo las filas de esas dos páginas. Puede generar la tarjeta y editar el texto. Marcar una página como publicada está permitido en el servidor solo para sus páginas, pero Por armar no tiene hoy ese botón para nadie: la marca se hace desde Directas (solo Alejandro). Si se quiere el botón, es una mejora aparte. No ve filas de El Chanty ni de El Traveler. |
| T5 | Alejandro cubre a Wilson si hace falta. | Por armar de Alejandro muestra todas las filas, incluidas las de Jordan Hurtado y Hillary, y puede marcarlas como publicadas. Se marca quién la publicó. |
| T6 | Wilson genera tarjetas para sus páginas. | La pestaña Tarjeta lista solo Jordan Hurtado y Hillary, con su identidad de tuit (nombre, usuario, avatar). La de Alejandro las lista todas. |
| T7 | Wilson no puede tocar lo que no es suyo. | Todas las funciones comprueban en el servidor que la página sea suya. No basta con esconderlo en pantalla: un enlace de Wilson no puede leer ni cambiar filas de otras páginas. |

## Datos que cambian

| Campo | Detalle |
| --- | --- |
| `paginas.asignada_a` | Texto, vacío por defecto. Vale `wilson` para Jordan Hurtado y Hillary. Vacío significa de Alejandro y David. |
| `lotes.subido_por` | Ya existe. Acepta también `wilson`. |
| `publicaciones.marcada_por` | Ya existe. Acepta también `wilson`. |

## Páginas

No existe una pantalla Páginas. La historia H9 (David agrega, renombra y oculta páginas) estaba en la especificación original, pero no se construyó: las páginas de hoy se cargaron con migraciones de Supabase. Por eso David no puede crearlas desde la app. Cada página nueva necesita, además del nombre, su identidad de tuit para armar las tarjetas: nombre que se ve, usuario con @ y foto de perfil cuadrada. Con esos datos se arma una migración que crea la página y la asigna a Wilson. Construir la pantalla para David queda como mejora aparte.

## Reglas de acceso

| Pantalla o acción | Alejandro | David | Wilson |
| --- | --- | --- | --- |
| Subir lote | sí | no | sí |
| Preselección | sí | no | no |
| Revisar y decidir | no | sí, todo | no |
| Por armar | todo | todo | solo sus páginas |
| Tarjeta libre | todas las páginas | no | solo sus páginas |
| Marcar publicada | cualquier página | cualquier página | solo sus páginas |
| Directas, aviso y calendario | sí | no | no |
| Archivar una pieza | sí | no | no |

## Pantallas

- Inicio y barra inferior: Wilson ve las tres pestañas de arriba. Se reutilizan las pantallas de Alejandro, filtradas por usuario.
- Revisar (David): al elegir, aparece la lista completa de páginas.
- Por armar: Alejandro ve todo. Wilson ve solo filas de sus páginas, sin controles de directa.

## Fuera de esta versión

- Preselección para Wilson: depende del importador de Reddit, que es de Alejandro.
- Directas, aviso por ntfy y calendario para Wilson: la función de directas está en pausa por lo de Facebook.
- Que Wilson revise y elija sin David. Se descartó porque David quiere decidir todo.
- Archivar piezas por Wilson: lo hace Alejandro.
- La pantalla Páginas para David (H9).
- Más de un usuario nuevo. Si llega otro, el diseño por `asignada_a` sirve, pero la lista de usuarios habría que moverla a la base.

## Riesgos y preguntas abiertas

- [x] Hecho el 9 de oct: se revisaron todas las funciones y se probó con datos simulados (28 comprobaciones). La tarjeta y su letra no se tocaron: Wilson usa el mismo `GenerarTarjeta`.
- [ ] Hay que tocar unas 14 funciones. El riesgo es olvidar una comprobación y dejar que Wilson vea algo de las otras páginas. Por eso T7 exige revisión en cada función, no solo en pantalla.
- [ ] Si David elige una imagen de Alejandro para las páginas de Wilson, Wilson la ve y tiene que armarla. Si no se quiere eso, se limita la lista de páginas por quién subió la imagen.
- [ ] Una imagen elegida para páginas de los dos recibe una sola captura y un solo estado Armada. Cualquiera de los dos puede marcarla.
- [ ] Las páginas de otros influencers dependen de que trabajen con ellos. Lo de El Chantyy es un recordatorio de que Facebook mira la originalidad del contenido, y eso no se puede comprobar desde la app.
