# AstroSessionDoctor (ASD) 🩺✨

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-38bdf8?style=for-the-badge&logo=github)](https://lorenhey.github.io/astro-session-doctor/)
[![Version](https://img.shields.io/badge/Version-2.0.0-10b981?style=for-the-badge)](https://github.com/lorenhey/astro-session-doctor/releases/tag/v2.0.0)
[![CI](https://img.shields.io/badge/CI-Passing-10b981?style=for-the-badge&logo=githubactions)](https://github.com/lorenhey/astro-session-doctor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Forensic Astronomical Acquisition Session Autopsy, PSF/FWHM Timeline, PHD2 Guiding RMS Diagnosis & Optical Quality Assurance Workbench.**

---

## 🌐 Live Interactive Web Workbench

Test and run full forensic autopsies directly in your web browser with zero installation:  
👉 **[https://lorenhey.github.io/astro-session-doctor/](https://lorenhey.github.io/astro-session-doctor/)**

- **Zero-Backend Architecture**: 100% client-side HTML5, CSS3, Vanilla JS, and Canvas 2D.
- **Cross-Evidence Diagnostic Rules**: Distinguishes thermal focus drift, seeing collapse, mount tracking errors, optical sensor tilt, wind buffeting, and cloud extinction.
- **High-DPI Multi-Panel Visualizers**:
  - **FWHM Timeline vs Ambient Temperature**: Dual-axis subframe sequence with moving median and outlier alerts.
  - **PHD2 Guiding Scatter**: Polar / Cartesian RA vs Dec tracking errors with $1\sigma$ and $2\sigma$ error ellipses.
  - **5-Zone Sensor Plane Tilt**: Top-Left, Top-Right, Center, Bottom-Left, and Bottom-Right PSF and elongation vector field.
  - **Sky Transparency & Background**: Sky median ADU vs detected star counts.
- **In-Browser Terminal (`asd:~$`)**: Run forensic commands (`autopsy`, `metrics`, `tilt`, `guiding`, `filter <fwhm> <rms>`, `export json|csv`).
- **Drag-and-Drop Ingestion**: Upload custom JSON/CSV acquisition sessions or PHD2 guide logs.

---

## 🔭 The Forensic Autopsy Engine

A bloated star image doesn't explain itself: is it bad seeing, focus drift, cable snag, optical tilt, or mount oscillation? **AstroSessionDoctor** applies cross-evidence temporal forensic rules:

```
Acquisition + Optics + Sensor + Focus + Guiding + Wind + Sky Transparency = Point Spread Function (PSF)
```

| Pathological Symptom | Cross-Evidence Signature | Root Cause Forensic Diagnosis |
| :--- | :--- | :--- |
| **Monotonic FWHM Growth** | FWHM rises $> 20\%$ as $|\Delta T| > 1.0^\circ\text{C}$ while guiding RMS is stable | **Thermal Focus Drift** (Optical tube contraction) |
| **Stellar Elongation** ($e > 0.45$) | Dec RMS $\gg$ RA RMS or periodic sinusoidal excursion | **Declination Backlash / Tracking Failure** |
| **Transient Trailing Spikes** | Isolated subframes with $e > 0.55$ and total RMS $> 2.0''$ | **Wind Buffeting / Cable Snag** |
| **Corner-to-Corner Defocus** | FWHM diagonally asymmetric between opposing corners ($> 20\%$) | **Sensor Plane Orthogonal Tilt / Collimation Error** |
| **Star Count Extinction** | Star count falls $> 40\%$ while sky background ADU surges $> 80\%$ | **High Cirrus Clouds / Moon Glow Intrusion** |

---

## 📚 Mathematical Foundations

### 1. Point Spread Function (PSF) & FWHM
For an astrophotographic stellar image fitted with a 2D Gaussian flux distribution:
$$\text{FWHM} = 2 \sqrt{2 \ln 2} \cdot \sigma \approx 2.35482 \cdot \sigma$$

### 2. Stellar Eccentricity & Ellipticity
Given semi-major axis $a$ and semi-minor axis $b$:
$$e = \sqrt{1 - \frac{b^2}{a^2}} = \sqrt{1 - \frac{\sigma_{\min}^2}{\sigma_{\max}^2}}$$
- $e < 0.35$: Diffraction-limited, circular stars.
- $e > 0.45$: Measurable optical astigmatism or tracking elongation.

### 3. Total Guiding RMS Vector
$$\text{RMS}_{\text{total}} = \sqrt{\text{RMS}_{\text{RA}}^2 + \text{RMS}_{\text{Dec}}^2}$$
Optimal integration requires $\text{RMS}_{\text{total}} \le 0.5 \times \text{PixelScale}$.

### 4. Critical Focus Zone (CFZ)
$$\text{CFZ} = \pm 4.88 \cdot \lambda \cdot f_{\#}^2 \quad (\mu\text{m})$$
Determines allowable focal plane displacement before Strehl ratio drops below 0.80.

---

## 🧪 6 Injected Benchmark Sessions

1. **`NGC 6960` (Western Veil Nebula)**: Severe thermal focus drift ($\Delta T = -3.9^\circ\text{C}$, FWHM climbing from $2.1''$ to $4.2''$).
2. **`M51` (Whirlpool Galaxy)**: Declination axis backlash and periodic tracking failure ($\text{RMS}_{\text{Dec}} = 1.48''$, $e = 0.62$).
3. **`IC 405` (Flaming Star Nebula)**: Sensor plane tilt across optical diagonal (Center $2.15''$, Bottom-Right $4.25''$).
4. **`B33` (Horsehead Nebula)**: High-altitude observatory wind buffeting & cable snag spikes.
5. **`M31` (Andromeda Core)**: Cirrus cloud extinction and moon rise background surge.
6. **`NGC 253` (Sculptor Galaxy)**: Golden master pristine session (Score 96/100, PASS, sub-arcsecond seeing).

---

## 🐍 Python Package & CLI

Install locally in a Python 3.10+ virtual environment:

```bash
git clone https://github.com/lorenhey/astro-session-doctor.git
cd astro-session-doctor
pip install -e .[dev]
```

### CLI Commands
```bash
# Analyze an acquisition folder
asd analyze /path/to/session_folder

# Generate synthetic benchmark dataset
asd demo

# Launch local Streamlit GUI
asd gui /path/to/session_folder
```

### Run Tests
```bash
pytest tests/ -v
```

---

## 📜 License
MIT License &bull; Copyright &copy; 2026 Loren.
