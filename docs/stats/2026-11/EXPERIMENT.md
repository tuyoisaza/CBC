# Noviembre de 2026 — experimento de horarios

Autorización: el 25 de octubre el propietario pidió ejecutar la programación recomendada y guardar los resultados en CBC/docs/stats. Esta solicitud reemplaza la fase anterior de borradores sin autorización. No cambia por sí sola los estados de programación: deben verificarse en Meta.

## Diseño

Instagram y Facebook reciben las mismas 60 piezas del 1 al 30 de noviembre: dos por día y por red. Una publicación diaria permanece a las 11:00; la segunda se reparte entre 15 días a las 16:00 y 15 a las 19:00. Zona: America/Mexico_City, UTC−06:00 durante noviembre.

Los días a las 16:00 son 2, 4, 6, 7, 8, 10, 11, 14, 15, 17, 19, 25, 26, 27 y 30. Los demás días, la segunda pieza va a las 19:00. La asignación distribuye ambos bloques por semana, día de la semana, tema, producto y fondo; no sigue una alternancia par/impar que confundiría el horario con el fondo.

| Bloque / red | Piezas | Fondos |
| --- | ---: | --- |
| 11:00 | 30 | 15 crema, 15 gris |
| 16:00 | 15 | 8 crema, 7 carbón |
| 19:00 | 15 | 7 crema, 8 carbón |

El catálogo fuente está en el repositorio CBCbrief, docs/campaigns/2026-11. Aquí se registran ID, fecha, hora, zona, instante UTC, tema, producto, fondo, imagen y texto para cruzar resultados. La categoría de producto «Video» describe la tarjeta con QR a video: el contenido a publicar sigue siendo una imagen PNG.

## Medición

Completar measurement.csv con una fila por pieza/red y horizonte de siete días. Anotar la fecha y hora de captura, edad real del post, ID y enlace, publicación efectiva, promoción pagada, vistas, alcance o viewers cuando existan, likes, comentarios, compartidos, guardados, clics, visitas, consultas calificadas y cotizaciones atribuibles cuando haya evidencia. Dejar vacías las métricas no disponibles o no atribuibles; no duplicar totales de cuenta en cada post.

Comparar 16:00 contra 19:00 dentro de cada red, mostrando n, media, mediana y dispersión. Revisar por semana/día de la semana y fondo crema compartido entre bloques. Las 11:00 son referencia observacional, no un control de contenido idéntico. Las piezas de gris solo están por la mañana y las de carbón solo por la tarde/noche: no atribuir causalidad al color usando esa comparación.

Prioridad comercial: cotizaciones y consultas calificadas atribuibles, después clics/visitas cuando sean medibles, y finalmente vistas e interacción por publicación. Una ventaja de vistas sin intención comercial no basta para eliminar otra red. Con pocos eventos comerciales, declarar evidencia insuficiente y mantener o ampliar el experimento.

## Decisiones del siguiente mes

- Horario: mantener el bloque que muestre una ventaja consistente por publicación y semana, sin depender de un solo pico. Si los resultados son mixtos o escasos, continuar la prueba.
- Estilo: comparar tema/producto/fondo dentro de horarios comparables; separar tendencias de evidencia causal. No confundir la estacionalidad de Navidad con calidad creativa.
- Cantidad y frecuencia: este mes mantiene dos publicaciones diarias, por lo que no prueba que dos sea óptimo. Usar carga de producción, resultados diarios, rendimiento por post, consultas y bajas de seguidores para formular una prueba posterior de una frente a dos publicaciones en bloques equilibrados.
- Red: revisar eficiencia por pieza y consultas, además del total de audiencia.

No se crea una automatización, tarea recurrente ni seguimiento en segundo plano. YouTube permanece fuera de esta programación mientras no exista acceso al canal CBC.

## Límite de programación observado el 25 de octubre

El compositor masivo mostró: “Scheduled posts need to be shared between 20 minutes and 29 days from when you create them.” La fecha del 23 de noviembre a las 11:00 fue rechazada; en el compositor individual las fechas finales tampoco son elegibles. El plan completo sigue autorizado, pero los destinos fuera de rango no deben contarse como programados. Volver a programar las piezas 045–060 a partir del 2 de noviembre permite incluir hasta el día 30 dentro de la ventana, sin cambiar sus horarios. No se creó un agente ni recordatorio para hacerlo automáticamente.
