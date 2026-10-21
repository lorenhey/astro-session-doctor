/**
 * AstroSessionDoctor Plotter v2.0.0
 * High-DPI Canvas 2D Multi-Panel Astronomical Visualizers
 * (c) 2026 Loren - MIT License
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ASDPlotter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Setup canvas for high-DPI (Retina) displays
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (canvas.width || 600);
    const height = rect.height > 0 ? rect.height : (canvas.height || 300);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.resetTransform && ctx.resetTransform();
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }

  // Draw dark observatory grid
  function drawGrid(ctx, x, y, w, h, xSteps = 5, ySteps = 5) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    // Horizontal grid
    for (let i = 0; i <= ySteps; i++) {
      const gy = y + (h / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // Vertical grid
    for (let j = 0; j <= xSteps; j++) {
      const gx = x + (w / xSteps) * j;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 1. TIMELINE CHART: FWHM / HFD vs Frame Index & Temperature
   */
  function drawTimeline(canvas, session, options = {}) {
    if (!canvas || !session || !session.frames) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const frames = session.frames;
    const n = frames.length;
    if (n === 0) return;

    // Clear background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 35, right: 55, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    drawGrid(ctx, padding.left, padding.top, chartW, chartH, 6, 4);

    // Compute bounds
    const fwhmArr = frames.map(f => f.fwhm_arcsec || f.fwhm_px || 0);
    const tempArr = frames.map(f => f.temperature !== undefined ? f.temperature : 0);
    const minFwhm = Math.max(0, Math.floor((Math.min(...fwhmArr) - 0.4) * 2) / 2);
    const maxFwhm = Math.ceil((Math.max(...fwhmArr) + 0.5) * 2) / 2;

    const minTemp = Math.floor(Math.min(...tempArr) - 1);
    const maxTemp = Math.ceil(Math.max(...tempArr) + 1);

    const getX = (idx) => padding.left + (idx / (n - 1 || 1)) * chartW;
    const getYFwhm = (val) => padding.top + chartH - ((val - minFwhm) / (maxFwhm - minFwhm || 1)) * chartH;
    const getYTemp = (val) => padding.top + chartH - ((val - minTemp) / (maxTemp - minTemp || 1)) * chartH;

    // 1. Temperature curve (orange dotted)
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    frames.forEach((f, i) => {
      const x = getX(i);
      const y = getYTemp(f.temperature !== undefined ? f.temperature : minTemp);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // 2. FWHM curve (cyan with glow)
    ctx.save();
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    frames.forEach((f, i) => {
      const x = getX(i);
      const y = getYFwhm(f.fwhm_arcsec || f.fwhm_px || 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // 3. Dots for subframes (red if outlier / high ecc)
    frames.forEach((f, i) => {
      const x = getX(i);
      const y = getYFwhm(f.fwhm_arcsec || f.fwhm_px || 0);
      const isOutlier = (f.eccentricity || 0) > 0.5 || (f.guide_rms_total || 0) > 1.4;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, isOutlier ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isOutlier ? '#ef4444' : '#38bdf8';
      ctx.fill();
      if (isOutlier) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    });

    // Axis Labels and Ticks
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';

    // Left Y Axis (FWHM)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let step = 0; step <= 4; step++) {
      const val = minFwhm + (step / 4) * (maxFwhm - minFwhm);
      const y = getYFwhm(val);
      ctx.fillText(val.toFixed(2) + '"', padding.left - 8, y);
    }
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('FWHM (")', padding.left - 8, padding.top - 14);

    // Right Y Axis (Temp)
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    for (let step = 0; step <= 4; step++) {
      const val = minTemp + (step / 4) * (maxTemp - minTemp);
      const y = getYTemp(val);
      ctx.fillText(val.toFixed(1) + '°C', width - padding.right + 8, y);
    }
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('Temp (°C)', width - padding.right + 8, padding.top - 14);

    // X Axis (Frame numbers)
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const numXTicks = 6;
    for (let i = 0; i <= numXTicks; i++) {
      const frameIdx = Math.round((i / numXTicks) * (n - 1));
      const x = getX(frameIdx);
      ctx.fillText('#' + (frameIdx + 1), x, height - padding.bottom + 8);
    }
    ctx.fillText('Subframe Sequence Timeline', padding.left + chartW / 2, height - padding.bottom + 24);

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(padding.left + 10, 10, 14, 3);
    ctx.fillText('FWHM (arcsec)', padding.left + 28, 13);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(padding.left + 140, 10, 14, 3);
    ctx.fillText('Ambient Temp (°C)', padding.left + 158, 13);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(padding.left + 290, 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Guiding/Elongation Alert', padding.left + 298, 13);
    ctx.restore();
  }

  /**
   * 2. GUIDING SCATTER: PHD2 RA vs Dec Scatter with Error Ellipse
   */
  function drawGuidingScatter(canvas, session) {
    if (!canvas || !session) return;
    const { ctx, width, height } = setupCanvas(canvas);

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    const samples = session.guiding_samples || [];
    const stats = session.guiding_stats || { ra_rms: 0.5, dec_rms: 0.5, total_rms: 0.71 };

    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) / 5.2; // 1 arcsec radius in pixels

    // Target concentric circles (0.5", 1.0", 1.5", 2.0")
    ctx.save();
    const rings = [0.5, 1.0, 1.5, 2.0];
    rings.forEach((r, idx) => {
      const radius = r * scale;
      ctx.strokeStyle = idx === 1 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = idx === 1 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(r.toFixed(1) + '"', cx + radius + 3, cy - 3);
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2.2 * scale, cy);
    ctx.lineTo(cx + 2.2 * scale, cy);
    ctx.moveTo(cx, cy - 2.2 * scale);
    ctx.lineTo(cx, cy + 2.2 * scale);
    ctx.stroke();

    // 1-sigma & 2-sigma Error Ellipse
    const raRms = stats.ra_rms || 0.5;
    const decRms = stats.dec_rms || 0.5;

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Green 1-sigma
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, raRms * scale, decRms * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)'; // Amber 2-sigma
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, (raRms * 2) * scale, (decRms * 2) * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scatter points
    samples.forEach(s => {
      const sx = cx + (s.ra_err * scale);
      const sy = cy - (s.dec_err * scale); // Inverted Y for sky Dec
      const dist = Math.sqrt(s.ra_err ** 2 + s.dec_err ** 2);

      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = dist > 1.2 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(56, 189, 248, 0.55)';
      ctx.fill();
    });

    // Badge Overlay with Guiding Stats
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(10, 10, 175, 75);
    ctx.strokeRect(10, 10, 175, 75);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('PHD2 GUIDING STATS', 18, 26);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`RA RMS:   ${raRms.toFixed(2)}"`, 18, 42);
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`Dec RMS:  ${decRms.toFixed(2)}"`, 18, 57);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Tot RMS:  ${stats.total_rms.toFixed(2)}"`, 18, 72);

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('+RA (West)', cx + 1.6 * scale, cy + 14);
    ctx.fillText('+Dec (North)', cx + 5, cy - 1.9 * scale);
    ctx.restore();
  }

  /**
   * 3. SENSOR TILT & VECTOR FIELD: 5-zone quadrant PSF & Elongation
   */
  function drawTiltVectorField(canvas, session) {
    if (!canvas || !session) return;
    const { ctx, width, height } = setupCanvas(canvas);

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    const quad = session.quadrant_metrics || {
      center: { fwhm: 2.2, ecc: 0.15 },
      top_left: { fwhm: 2.3, ecc: 0.2 },
      top_right: { fwhm: 2.3, ecc: 0.2 },
      bottom_left: { fwhm: 2.3, ecc: 0.2 },
      bottom_right: { fwhm: 2.3, ecc: 0.2 }
    };

    const pad = 30;
    const boxW = width - pad * 2;
    const boxH = height - pad * 2;

    // Draw sensor outer rectangle (simulating camera sensor border)
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, boxW, boxH);

    // Draw sensor diagonals & cross dividing lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad + boxW, pad + boxH);
    ctx.moveTo(pad + boxW, pad);
    ctx.lineTo(pad, pad + boxH);
    ctx.moveTo(pad + boxW / 2, pad);
    ctx.lineTo(pad + boxW / 2, pad + boxH);
    ctx.moveTo(pad, pad + boxH / 2);
    ctx.lineTo(pad + boxW, pad + boxH / 2);
    ctx.stroke();

    const zones = [
      { name: 'Top-Left', x: pad + boxW * 0.2, y: pad + boxH * 0.2, m: quad.top_left, angle: Math.PI / 4 },
      { name: 'Top-Right', x: pad + boxW * 0.8, y: pad + boxH * 0.2, m: quad.top_right, angle: -Math.PI / 4 },
      { name: 'Center', x: pad + boxW * 0.5, y: pad + boxH * 0.5, m: quad.center, angle: 0 },
      { name: 'Bottom-Left', x: pad + boxW * 0.2, y: pad + boxH * 0.8, m: quad.bottom_left, angle: -Math.PI / 4 },
      { name: 'Bottom-Right', x: pad + boxW * 0.8, y: pad + boxH * 0.8, m: quad.bottom_right, angle: Math.PI / 4 }
    ];

    const cFwhm = quad.center ? quad.center.fwhm : 2.5;

    zones.forEach(z => {
      const fwhm = z.m ? z.m.fwhm : cFwhm;
      const ecc = z.m ? z.m.ecc : 0.2;
      const deltaRatio = (fwhm - cFwhm) / (cFwhm || 1);

      // Color coding: green if near center, amber if +20%, red if +40%
      let fillColor = 'rgba(16, 185, 129, 0.25)';
      let strokeColor = '#10b981';
      if (deltaRatio > 0.45) {
        fillColor = 'rgba(239, 68, 68, 0.35)';
        strokeColor = '#ef4444';
      } else if (deltaRatio > 0.20) {
        fillColor = 'rgba(245, 158, 11, 0.3)';
        strokeColor = '#f59e0b';
      }

      // Draw star PSF profile ellipse
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle);

      const major = 14 * (fwhm / cFwhm);
      const minor = major * Math.sqrt(Math.max(0.1, 1 - ecc ** 2));

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, major, minor, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // If elongated, draw vector arrow indicating direction
      if (ecc > 0.3) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-major * 1.3, 0);
        ctx.lineTo(major * 1.3, 0);
        ctx.stroke();
      }
      ctx.restore();

      // Zone text label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(z.name, z.x, z.y - 24);

      ctx.font = '10px monospace';
      ctx.fillStyle = strokeColor;
      ctx.fillText(`${fwhm.toFixed(2)}" (e=${ecc.toFixed(2)})`, z.x, z.y + 26);
    });

    // Tilt Diagnostic Footer Text
    const tl = quad.top_left ? quad.top_left.fwhm : cFwhm;
    const br = quad.bottom_right ? quad.bottom_right.fwhm : cFwhm;
    const tiltPct = ((Math.abs(tl - br)) / cFwhm) * 100;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Diagonal Tilt Asymmetry (TL ↔ BR): ${tiltPct.toFixed(1)}%`, pad + 6, height - 10);
    ctx.restore();
  }

  /**
   * 4. SKY TRANSPARENCY & BACKGROUND GRADIENT
   */
  function drawSkyTransparency(canvas, session) {
    if (!canvas || !session || !session.frames) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const frames = session.frames;
    const n = frames.length;
    if (n === 0) return;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 35, right: 55, bottom: 40, left: 55 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    drawGrid(ctx, pad.left, pad.top, chartW, chartH, 6, 4);

    const bgArr = frames.map(f => f.background_median || 0);
    const starsArr = frames.map(f => f.stars_detected || 0);

    const minBg = Math.max(0, Math.floor(Math.min(...bgArr) * 0.8));
    const maxBg = Math.ceil(Math.max(...bgArr) * 1.15);

    const minStars = 0;
    const maxStars = Math.ceil(Math.max(...starsArr) * 1.2);

    const getX = (idx) => pad.left + (idx / (n - 1 || 1)) * chartW;
    const getYBg = (val) => pad.top + chartH - ((val - minBg) / (maxBg - minBg || 1)) * chartH;
    const getYStars = (val) => pad.top + chartH - ((val - minStars) / (maxStars - minStars || 1)) * chartH;

    // 1. Star count bars (gold/amber semi-transparent bars)
    const barW = Math.max(2, (chartW / n) * 0.65);
    ctx.save();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
    frames.forEach((f, i) => {
      const x = getX(i) - barW / 2;
      const y = getYStars(f.stars_detected || 0);
      const h = pad.top + chartH - y;
      ctx.fillRect(x, y, barW, h);
    });
    ctx.restore();

    // 2. Sky Background line (purple glowing line)
    ctx.save();
    ctx.shadowColor = 'rgba(168, 85, 247, 0.5)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    frames.forEach((f, i) => {
      const x = getX(i);
      const y = getYBg(f.background_median || 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // Axis Labels
    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Sky BG (ADU)', pad.left - 8, pad.top - 14);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    for (let s = 0; s <= 4; s++) {
      const val = minBg + (s / 4) * (maxBg - minBg);
      const y = getYBg(val);
      ctx.fillText(Math.round(val), pad.left - 8, y + 3);
    }

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'left';
    ctx.fillText('Star Count', width - pad.right + 8, pad.top - 14);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    for (let s = 0; s <= 4; s++) {
      const val = minStars + (s / 4) * (maxStars - minStars);
      const y = getYStars(val);
      ctx.fillText(Math.round(val), width - pad.right + 8, y + 3);
    }

    // X Axis Ticks
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const frameIdx = Math.round((i / 6) * (n - 1));
      const x = getX(frameIdx);
      ctx.fillText('#' + (frameIdx + 1), x, height - pad.bottom + 8);
    }
    ctx.fillText('Subframe Sequence Timeline', pad.left + chartW / 2, height - pad.bottom + 24);

    // Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(pad.left + 10, 10, 14, 3);
    ctx.fillText('Background Median (ADU)', pad.left + 28, 13);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(pad.left + 200, 10, 14, 8);
    ctx.fillText('Detected Stars Count', pad.left + 220, 17);
    ctx.restore();
  }

  return {
    drawTimeline,
    drawGuidingScatter,
    drawTiltVectorField,
    drawSkyTransparency
  };
});
