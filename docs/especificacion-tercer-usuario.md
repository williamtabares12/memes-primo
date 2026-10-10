# Especificación: un tercer usuario con sus propias páginas

Oct 9, 2026 · @Alejandro Tabares

## Contexto

Un primo se suma al trabajo y hará lo mismo que Alejandro, pero para otras dos páginas: Jordan Hurtado y Hillary. Hoy la app asume dos personas, con permisos fijos por nombre ("alejandro" y "david") repartidos por unas 14 funciones. Las dos páginas de Alejandro (El Chanty y El Traveler) no deben mezclarse con las del primo, ni en las listas ni en las tarjetas.

## Decisiones tomadas

- El primo entra con su propio enlace privado, igual que los otros dos: un código largo guardado en una variable de entorno nueva, `LINK_CODE_PRIMO`. Sin usuario ni clave.
- Sube sus imágenes, ve y arma lo suyo y marca como publicada, igual que Alejandro, pero solo de sus dos páginas.
- David sigue revisando todo en Revisar (Descartar, Guardar, Elegir), también lo que sube el primo. Al elegir una imagen del primo solo aparecen sus dos páginas, y al elegir una de Alejandro solo aparecen las de Alejandro.
- Alejandro y David siguen viendo todo lo demás, con una excepción: la pantalla Por armar de Alejandro muestra solo lo suyo, porque lo del primo lo arma el primo.
- Cada imagen se asocia a quien la subió con el campo que ya existe, `lotes.subido_por`. Cada página se asigna a un dueño con una columna nueva.

## Historias de usuario

| N.º | Historia | Criterio de aceptación |
| --- | --- | --- |
| T1 | El primo entra con su enlace privado. | Con su código ve solo las pestañas Subir, Por armar y Tarjeta. Con un código incorrecto ve Enlace no válido, igual que hoy. |
| T2 | El primo sube lotes de imágenes. | La subida funciona igual que la de Alejandro. Las imágenes quedan registradas como suyas. |
| T3 | David revisa lo que sube el primo. | Las imágenes del primo aparecen en Revisar mezcladas con las demás. Al elegir una, la lista de páginas muestra solo Jordan Hurtado y Hillary. Al elegir una de Alejandro, esas dos páginas no aparecen. |
| T4 | El primo ve y arma lo suyo en Por armar. | Ve solo las imágenes que subió y que David eligió, con sus dos páginas. Puede generar la tarjeta, marcarla como armada y como publicada. No ve nada de El Chanty ni de El Traveler. |
| T5 | Alejandro no se llena de lo del primo. | Por armar de Alejandro muestra solo lo que subió él. David sigue viendo todo en su pantalla, incluida la captura descargable. |
| T6 | El primo genera tarjetas para sus páginas. | La pestaña Tarjeta lista solo Jordan Hurtado y Hillary, con su identidad de tuit (nombre, usuario, avatar). |
| T7 | El primo no puede tocar lo que no es suyo. | Todas las funciones comprueban en el servidor que la imagen o la página sea suya. No basta con esconderlo en pantalla: un enlace del primo no puede leer ni cambiar nada de las otras páginas. |

## Datos que cambian

| Campo | Detalle |
| --- | --- |
| `paginas.asignada_a` | Texto, vacío por defecto. Vale `primo` para Jordan Hurtado y Hillary y queda vacío para El Chanty y El Traveler. |
| `lotes.subido_por` | Ya existe. Acepta también `primo`. |
| `publicaciones.marcada_por` | Ya existe. Acepta también `primo`. |

Las dos páginas del primo hay que crearlas antes, desde la pantalla Páginas de David, y después asignarlas con una migración. Hasta entonces la app no sabe a quién pertenecen.

## Reglas de acceso

| Pantalla o acción | Alejandro | David | Primo |
| --- | --- | --- | --- |
| Subir lote | sí | no | sí |
| Preselección | sí | no | no |
| Revisar y decidir | no | sí, todo | no |
| Por armar | solo lo suyo | todo | solo lo suyo |
| Tarjeta libre | páginas suyas | no | solo páginas suyas |
| Marcar publicada | sí | sí | solo lo suyo |
| Directas, aviso y calendario | sí | no | no |
| Archivar una pieza | sí | no | solo lo suyo |

## Pantallas

- Inicio y barra inferior: el primo ve las tres pestañas de arriba. Se reutilizan las pantallas de Alejandro, filtradas por el usuario.
- Revisar (David): al elegir, la lista de páginas depende de quién subió la imagen.
- Por armar (Alejandro): solo lo propio. Por armar (primo): solo lo propio, sin controles de directa.

## Fuera de esta versión

- Preselección para el primo: depende del importador de Reddit, que es de Alejandro.
- Directas, aviso por ntfy y calendario para el primo: la función de directas está en pausa por lo de Facebook.
- Que el primo revise y elija sus propias imágenes sin David. Se descartó porque David quiere decidir todo.
- Más de un usuario nuevo. Si llega otro, el diseño por columna `asignada_a` sirve, pero la lista de usuarios habría que moverla a la base.

## Riesgos y preguntas abiertas

- [ ] Hay que tocar unas 14 funciones. El riesgo es olvidar una comprobación y dejar que el primo vea algo de las otras páginas. Por eso T7 exige revisión en cada función, no solo en pantalla.
- [ ] No sé cómo se llama el primo en la app. Se propone `primo` como nombre interno y el nombre real solo como texto en pantalla, si se quiere.
- [ ] Las páginas de Facebook de Jordan Hurtado y Hillary tienen que ser del influencer o estar autorizadas, por lo que pasó con la monetización de El Chantyy. No se puede comprobar desde la app.
