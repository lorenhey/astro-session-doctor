# astro-session-doctor

`astro-session-doctor` correlaciona imágenes, guiding, foco y condiciones de adquisición para explicar qué limitó una sesión astronómica.

## ¿Qué es?
No es otro selector de subs, ni un simple visor FITS. Es un motor de diagnóstico que analiza la sesión como un sistema completo:

```text
acquisition + optics + camera + focus + guiding + tracking + sky + temperature + calibration + image quality
```

Una mala imagen no dice por sí sola por qué es mala. Un FWHM alto puede deberse al seeing, al tracking, al viento, o al foco. Este motor busca **evidencia cruzada** a lo largo del tiempo.

## Uso Rápido (CLI)

```bash
# Analizar una sesión
asd analyze /path/to/session

# Generar y diagnosticar una sesión sintética de prueba
asd demo

# Lanzar la interfaz interactiva de línea de tiempo
asd gui /path/to/session
```

## Características (v1.0)
* Descubrimiento automático de sesión (Lights, Darks, Flats, Bias, logs)
* Extracción robusta de metadata FITS (con normalización para N.I.N.A., SGP, etc.)
* Análisis PSF por subframe (FWHM, Eccentricity) basado en `photutils`
* Parser integrado de PHD2 para estadísticas de guiding y dithering
* Correlación temporal (focus drift, degradation de tracking, drops de temperatura)
* Motor de Hallazgos (Findings) basado en reglas con niveles de evidencia.
* Interfaz web interactiva (`Streamlit`) con *Session Timeline* y cruce de datos.

## Evidencia, no adivinanzas
Si el foco se degradó, la herramienta mostrará:
```text
FOCUS DRIFT — MAJOR
10 affected frames
Evidence:
- Median FWHM increased by 15.0%
- Temperature dropped by 1.2 °C
- Guiding RMS remained stable
```

## Privacidad y Filosofía
Totalmente offline. Sin telemetría. Escrito en Python (Astropy, Photutils, Pandas).

## Instalación
Recomendado usar entorno virtual:
```bash
git clone https://github.com/lorenhey/astro-session-doctor
cd astro-session-doctor
pip install -e .
```
