# Contributing to astro-session-doctor

Agradecemos las contribuciones. Por favor, asegúrese de que el proyecto siga siendo una herramienta de diagnóstico técnico y no un procesador de imágenes ni un simple tablero de métricas.

## Desarrollo
1. Clone el repositorio.
2. Cree un entorno virtual e instale dependencias de desarrollo: `pip install -e .[dev]`
3. Ejecute tests: `pytest`

## Estilo de Código
Use `black` y `isort` para formatear el código. Las verificaciones estáticas son bienvenidas.

## Nuevas Reglas de Hallazgos (Findings)
Las reglas en `analyzer.py` deben basarse estrictamente en **evidencia medible**. Nunca reporte una causa única a partir de una sola métrica sin contexto. 

## Testing de Falsos Positivos
Al agregar nuevas heurísticas, asegúrese de escribir tests con sesiones sintéticas que produzcan tanto falsos positivos como negativos para calibrar los umbrales.
