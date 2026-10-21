/**
 * AstroSessionDoctor Main App Controller v2.0.0
 * (c) 2026 Loren - MIT License
 */

(function () {
  'use strict';

  let currentSession = null;
  let currentReport = null;
  let cliInstance = null;

  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  function initApp() {
    // Populate session dropdown
    const select = document.getElementById('sessionSelect');
    if (select && window.ASDCatalog) {
      select.innerHTML = '';
      const list = window.ASDCatalog.getAllSessions();
      list.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        loadSession(e.target.value);
      });
    }

    // Initialize CLI
    const termElem = document.getElementById('cliTerminal');
    if (termElem && window.ASDCLI) {
      cliInstance = new window.ASDCLI.CLI(termElem, (action, data) => {
        if (action === 'load') {
          currentSession = data;
          if (select) select.value = data.id;
          updateUI();
        } else if (action === 'export') {
          handleExport(data.format, data.session);
        }
      });
    }

    // Tab navigation
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchTab(target);
      });
    });

    // File Drag and Drop
    initFileDrop();

    // Export buttons
    const btnExportJson = document.getElementById('btnExportJson');
    if (btnExportJson) btnExportJson.addEventListener('click', () => handleExport('json', currentSession));

    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) btnExportCsv.addEventListener('click', () => handleExport('csv', currentSession));

    const btnCopySummary = document.getElementById('btnCopySummary');
    if (btnCopySummary) btnCopySummary.addEventListener('click', copySummaryToClipboard);

    // Initial load: First benchmark session (NGC 6960)
    if (window.ASDCatalog) {
      loadSession('ngc-6960');
    }

    // Resize listener for sharp canvas re-rendering
    window.addEventListener('resize', debounce(() => {
      renderAllCharts();
    }, 150));
  }

  function switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `pane-${tabId}`);
    });
    renderAllCharts();
  }

  function loadSession(id) {
    if (!window.ASDCatalog) return;
    currentSession = window.ASDCatalog.getSessionById(id);
    if (cliInstance) cliInstance.setSession(currentSession);
    updateUI();
  }

  function updateUI() {
    if (!currentSession) return;

    // Run diagnosis engine
    if (window.ASDEngine) {
      currentReport = window.ASDEngine.diagnoseSession(currentSession);
    }

    // Update Header & Equipment Badges
    const titleEl = document.getElementById('sessionTitle');
    if (titleEl) titleEl.textContent = currentSession.target;

    const infoEl = document.getElementById('sessionInfo');
    if (infoEl) {
      infoEl.innerHTML = `
        <span>🔭 <b>Scope:</b> ${currentSession.telescope}</span>
        <span>📷 <b>Camera:</b> ${currentSession.camera}</span>
        <span>📐 <b>Focal Length:</b> ${currentSession.focalLength_mm}mm (${currentSession.pixelScale_arcsec}"/px)</span>
        <span>🎯 <b>Filter:</b> ${currentSession.filter} (${currentSession.exposure_sec}s x ${currentSession.frames.length} frames)</span>
      `;
    }

    // Update Autopsy Verdict Card
    if (currentReport) {
      const badge = document.getElementById('verdictBadge');
      if (badge) {
        badge.textContent = currentReport.verdictLabel;
        badge.style.backgroundColor = currentReport.verdictColor + '25';
        badge.style.borderColor = currentReport.verdictColor;
        badge.style.color = currentReport.verdictColor;
      }

      const scoreEl = document.getElementById('autopsyScoreVal');
      if (scoreEl) {
        scoreEl.textContent = currentReport.score;
        scoreEl.style.color = currentReport.verdictColor;
      }

      // Breakdown bars
      const bd = currentReport.breakdown;
      updateSubScore('scoreSeeing', bd.seeingFocus, 25);
      updateSubScore('scoreGuiding', bd.trackingGuiding, 25);
      updateSubScore('scoreTilt', bd.sensorTilt, 25);
      updateSubScore('scoreSky', bd.skyTransparency, 25);

      // Render findings in Autopsy tab and side preview
      renderFindings(currentReport.findings, currentReport.prescriptions);

      // Render KPI cards
      const stats = currentReport.stats;
      setVal('kpiFwhm', `${stats.fwhm.median}"`);
      setVal('kpiFwhmStd', `±${stats.fwhm.std}"`);
      setVal('kpiEcc', stats.eccentricity.median.toFixed(2));
      setVal('kpiRms', `${stats.guiding.median.toFixed(2)}"`);
      setVal('kpiTemp', `${stats.temperature.median}°C (Δ${(stats.temperature.max - stats.temperature.min).toFixed(1)}°C)`);
      setVal('kpiStars', stats.stars.median);
    }

    // Render Canvas Charts
    renderAllCharts();

    // Trigger KaTeX rendering if available
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  }

  function updateSubScore(id, val, max) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.round((val / max) * 100);
    const fill = el.querySelector('.subscore-fill');
    const text = el.querySelector('.subscore-val');
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${val}/${max}`;
  }

  function renderFindings(findings, prescriptions) {
    const container = document.getElementById('findingsList');
    if (!container) return;

    if (!findings || findings.length === 0) {
      container.innerHTML = `
        <div class="finding-card optimal">
          <div class="finding-header">
            <span class="finding-title text-emerald">✓ CERTIFIED OPTIMAL SESSION</span>
            <span class="finding-badge badge-pass">PASS</span>
          </div>
          <p class="finding-desc">No optical or tracking pathologies detected. Stars maintain diffraction-limited symmetry, guiding is stable, and sky transparency is pristine.</p>
        </div>
      `;
    } else {
      container.innerHTML = findings.map(f => {
        const badgeClass = f.severity === 'CRITICAL' ? 'badge-fail' : (f.severity === 'MAJOR' ? 'badge-warn' : 'badge-info');
        return `
          <div class="finding-card ${f.severity.toLowerCase()}">
            <div class="finding-header">
              <span class="finding-title">${f.title} <span class="finding-category">(${f.category})</span></span>
              <span class="finding-badge ${badgeClass}">${f.severity}</span>
            </div>
            <p class="finding-desc">${f.impact}</p>
            <div class="finding-evidence-title">Observed Forensics:</div>
            <ul class="finding-evidence">
              ${f.evidence.map(e => `<li>${e}</li>`).join('')}
            </ul>
            <div class="finding-remedy">
              <b>Recommended Protocol:</b> ${f.remedy}
            </div>
          </div>
        `;
      }).join('');
    }

    const presContainer = document.getElementById('prescriptionsList');
    if (presContainer && prescriptions) {
      presContainer.innerHTML = prescriptions.map(p => `<li>${p}</li>`).join('');
    }
  }

  function renderAllCharts() {
    if (!currentSession || !window.ASDPlotter) return;

    const timelineCanvas = document.getElementById('canvasTimeline');
    if (timelineCanvas) window.ASDPlotter.drawTimeline(timelineCanvas, currentSession);

    const guidingCanvas = document.getElementById('canvasGuiding');
    if (guidingCanvas) window.ASDPlotter.drawGuidingScatter(guidingCanvas, currentSession);

    const tiltCanvas = document.getElementById('canvasTilt');
    if (tiltCanvas) window.ASDPlotter.drawTiltVectorField(tiltCanvas, currentSession);

    const skyCanvas = document.getElementById('canvasSky');
    if (skyCanvas) window.ASDPlotter.drawSkyTransparency(skyCanvas, currentSession);
  }

  function setVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function handleExport(format, session) {
    if (!session) return;
    let dataStr = '';
    let filename = `ASD_${session.id}_${Date.now()}`;

    if (format === 'json') {
      filename += '.json';
      const exportObj = {
        session,
        autopsy_report: currentReport,
        generator: 'AstroSessionDoctor v2.0.0 (https://lorenhey.github.io/astro-session-doctor/)'
      };
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    } else {
      filename += '.csv';
      const headers = ['frame_number', 'timestamp', 'fwhm_arcsec', 'fwhm_px', 'hfd_px', 'eccentricity', 'temperature', 'background_median', 'stars_detected', 'guide_rms_total'];
      const rows = session.frames.map(f => [
        f.frame_number,
        f.timestamp,
        f.fwhm_arcsec,
        f.fwhm_px,
        f.hfd_px,
        f.eccentricity,
        f.temperature,
        f.background_median,
        f.stars_detected,
        f.guide_rms_total
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function copySummaryToClipboard() {
    if (!currentSession || !currentReport) return;
    const text = `AstroSessionDoctor Autopsy Summary:
Session: ${currentSession.name}
Target: ${currentSession.target}
Verdict: ${currentReport.verdictLabel} (Score: ${currentReport.score}/100)
Seeing & Focus: ${currentReport.breakdown.seeingFocus}/25
Guiding & Mount: ${currentReport.breakdown.trackingGuiding}/25
Sensor Tilt: ${currentReport.breakdown.sensorTilt}/25
Sky & Transparency: ${currentReport.breakdown.skyTransparency}/25
Detected Pathologies: ${currentReport.findings.length}
${currentReport.findings.map(f => `- [${f.severity}] ${f.title}: ${f.remedy}`).join('\n')}
`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Autopsy summary copied to clipboard!');
    }).catch(() => {
      prompt('Copy autopsy summary manually:', text);
    });
  }

  function initFileDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
  }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const session = parsed.session || parsed;
          if (session && session.frames) {
            currentSession = session;
            if (cliInstance) cliInstance.setSession(currentSession);
            updateUI();
            alert(`Loaded custom session '${currentSession.name || file.name}' with ${currentSession.frames.length} frames.`);
          }
        } else if (file.name.endsWith('.csv')) {
          parseCsvSession(text, file.name);
        } else {
          alert('Please upload a valid .json or .csv astronomical session file.');
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function parseCsvSession(csvText, fileName) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const frames = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < header.length) continue;
      const row = {};
      header.forEach((h, idx) => { row[h] = parts[idx]; });

      frames.push({
        frame_number: parseInt(row['frame_number'] || row['frame'] || i),
        timestamp: row['timestamp'] || row['date-obs'] || `Frame_${i}`,
        fwhm_arcsec: parseFloat(row['fwhm_arcsec'] || row['fwhm'] || 2.5),
        fwhm_px: parseFloat(row['fwhm_px'] || 2.5),
        hfd_px: parseFloat(row['hfd_px'] || row['hfr_px'] || 2.8),
        eccentricity: parseFloat(row['eccentricity'] || row['roundness'] || 0.2),
        temperature: parseFloat(row['temperature'] || row['ccd-temp'] || 10.0),
        background_median: parseFloat(row['background_median'] || row['bg'] || 500),
        stars_detected: parseInt(row['stars_detected'] || row['stars'] || 150),
        guide_rms_total: parseFloat(row['guide_rms_total'] || row['rms'] || 0.5)
      });
    }

    currentSession = {
      id: 'custom-' + Date.now(),
      name: `Custom Session (${fileName})`,
      target: fileName.replace(/\.[^/.]+$/, ''),
      telescope: 'Custom Optical System',
      camera: 'Custom Astro Sensor',
      focalLength_mm: 750,
      pixelScale_arcsec: 1.0,
      filter: 'Custom',
      exposure_sec: 300,
      intendedPathology: 'User uploaded custom session metrics dataset.',
      guiding_stats: { ra_rms: 0.5, dec_rms: 0.5, total_rms: 0.71 },
      quadrant_metrics: {
        center: { fwhm: 2.2, ecc: 0.2 },
        top_left: { fwhm: 2.3, ecc: 0.2 },
        top_right: { fwhm: 2.3, ecc: 0.2 },
        bottom_left: { fwhm: 2.3, ecc: 0.2 },
        bottom_right: { fwhm: 2.3, ecc: 0.2 }
      },
      frames,
      guiding_samples: []
    };

    if (cliInstance) cliInstance.setSession(currentSession);
    updateUI();
    alert(`Loaded custom session with ${frames.length} subframes.`);
  }

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }
})();
