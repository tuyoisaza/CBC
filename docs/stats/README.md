# Estadísticas de redes de Coffee Bunn Café

Esta carpeta conserva la evidencia mensual y las decisiones para ajustar cantidad, estilo, frecuencia y horarios. Los datos faltantes se dejan vacíos; no se convierten en cero.

- [Base de octubre de 2026](2026-10/REPORT.md): resultados, fuentes y límites.
- [Experimento de noviembre](2026-11/EXPERIMENT.md): calendario y criterio de evaluación.
- [Estado real de programación](2026-11/SCHEDULING_STATUS.md): 44 piezas programadas y 16 borradores pendientes por la ventana de Meta.
- [Calendario por publicación y red](2026-11/schedule.csv): 60 piezas, 120 destinos previstos.
- [Registro de medición](2026-11/measurement.csv): completar con resultados a siete días.

La programación efectiva se acredita con los estados e identificadores de la plataforma, no con la existencia del calendario. No hay una tarea automática de seguimiento: el próximo análisis se realizará cuando se solicite.

Para recalcular la comparación de octubre sin dependencias externas: `python docs/stats/analyze.py`. El script lee los CSV y escribe el resultado en stdout; no consulta servicios ni cambia archivos.
