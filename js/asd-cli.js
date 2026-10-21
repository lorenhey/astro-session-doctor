/**
 * AstroSessionDoctor In-Browser CLI v2.0.0
 * Interactive Astronomical Terminal (asd:~$)
 * (c) 2026 Loren - MIT License
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ASDCLI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CLI {
    constructor(terminalElement, onCommandExecuted) {
      this.term = terminalElement;
      this.history = [];
      this.historyIndex = -1;
      this.onCommandExecuted = onCommandExecuted || (() => {});
      this.currentSession = null;
      this.init();
    }

    init() {
      if (!this.term) return;
      this.term.innerHTML = `
        <div class="cli-output" id="cliOutput"></div>
        <div class="cli-input-line">
          <span class="cli-prompt">asd:~$</span>
          <input type="text" class="cli-input" id="cliInput" autocomplete="off" spellcheck="false" placeholder="Type 'help' or 'autopsy'...">
        </div>
      `;

      this.outputElem = this.term.querySelector('#cliOutput');
      this.inputElem = this.term.querySelector('#cliInput');

      this.printBanner();

      this.inputElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = this.inputElem.value.trim();
          if (cmd) {
            this.history.push(cmd);
            this.historyIndex = this.history.length;
            this.execute(cmd);
            this.inputElem.value = '';
          }
        } else if (e.key === 'ArrowUp') {
          if (this.historyIndex > 0) {
            this.historyIndex--;
            this.inputElem.value = this.history[this.historyIndex];
          }
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.inputElem.value = this.history[this.historyIndex];
          } else {
            this.historyIndex = this.history.length;
            this.inputElem.value = '';
          }
          e.preventDefault();
        }
      });
    }

    setSession(session) {
      this.currentSession = session;
    }

    printBanner() {
      this.log(`
<span class="text-sky">===============================================================</span>
<span class="text-emerald font-bold">  AstroSessionDoctor (ASD) v2.0.0 — Astronomical Session Autopsy CLI</span>
<span class="text-slate">  Interactive Astrophotography Diagnostic & Quality Assurance Shell</span>
<span class="text-sky">===============================================================</span>
Type <span class="text-amber">'help'</span> for command list, or <span class="text-amber">'autopsy'</span> to inspect active session.
`);
    }

    log(html) {
      if (!this.outputElem) return;
      const line = document.createElement('div');
      line.className = 'cli-line';
      line.innerHTML = html;
      this.outputElem.appendChild(line);
      this.outputElem.scrollTop = this.outputElem.scrollHeight;
    }

    execute(cmdStr) {
      this.log(`<span class="cli-prompt">asd:~$</span> <span class="text-white">${escapeHtml(cmdStr)}</span>`);
      const parts = cmdStr.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (cmd) {
        case 'help':
          this.log(`
<span class="text-amber font-bold">Available Commands:</span>
  <span class="text-sky">sessions</span>                    List all benchmark astronomical sessions
  <span class="text-sky">load &lt;id&gt;</span>                  Load session by ID (e.g. 'load ngc-6960', 'load m51')
  <span class="text-sky">autopsy</span>                    Perform full forensic pathology autopsy & diagnosis
  <span class="text-sky">metrics</span>                    Print comprehensive statistical metrics summary
  <span class="text-sky">guiding</span>                    Display PHD2 tracking performance & axis balance
  <span class="text-sky">tilt</span>                       Evaluate 5-zone sensor tilt and optical orthogonality
  <span class="text-sky">filter &lt;fwhm_max&gt; [rms]</span>    Calculate survivor frame count after quality cull
  <span class="text-sky">export [json|csv]</span>          Export session data and autopsy report
  <span class="text-sky">math</span>                       Show analytical equations used in autopsy engine
  <span class="text-sky">clear</span>                      Clear the terminal output
  <span class="text-sky">about</span>                      Display software architecture and metadata
`);
          break;

        case 'sessions':
          if (window.ASDCatalog) {
            const list = window.ASDCatalog.getAllSessions();
            let table = `<table class="cli-table"><thead><tr><th>ID</th><th>Target</th><th>Telescope / Camera</th><th>Pathology</th></tr></thead><tbody>`;
            list.forEach(s => {
              table += `<tr><td class="text-sky font-bold">${s.id}</td><td>${s.target}</td><td>${s.telescope.substring(0, 30)}...</td><td class="text-amber">${s.name.split('—')[1] || 'Nominal'}</td></tr>`;
            });
            table += `</tbody></table>`;
            this.log(table);
            this.log(`<span class="text-slate">Use 'load &lt;id&gt;' to load a session into the workbench.</span>`);
          }
          break;

        case 'load':
          if (!args[0]) {
            this.log(`<span class="text-rose">Error: Specify session ID. Example: 'load ngc-6960'</span>`);
            return;
          }
          if (window.ASDCatalog) {
            const sess = window.ASDCatalog.getSessionById(args[0]);
            if (sess) {
              this.currentSession = sess;
              this.onCommandExecuted('load', sess);
              this.log(`<span class="text-emerald">Successfully loaded session: <b>${sess.name}</b> (${sess.frames.length} subframes)</span>`);
            } else {
              this.log(`<span class="text-rose">Unknown session ID '${args[0]}'. Type 'sessions' to see available IDs.</span>`);
            }
          }
          break;

        case 'autopsy':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session. Load one first with 'load &lt;id&gt;'.</span>`);
            return;
          }
          if (window.ASDEngine) {
            const report = window.ASDEngine.diagnoseSession(this.currentSession);
            let out = `
<div class="cli-autopsy-box">
  <div class="cli-header-row">
    <span class="font-bold text-lg">${this.currentSession.name}</span>
    <span class="cli-verdict" style="color: ${report.verdictColor}; font-weight: bold; border: 1px solid ${report.verdictColor}; padding: 2px 8px; border-radius: 4px;">${report.verdictLabel} (Score: ${report.score}/100)</span>
  </div>
  <div class="text-slate" style="margin: 6px 0;">Target: ${this.currentSession.target} | Sensor: ${this.currentSession.camera} | Exp: ${this.currentSession.exposure_sec}s x ${this.currentSession.frames.length} frames</div>
  <div class="cli-score-bars">
    Seeing & Focus: ${report.breakdown.seeingFocus}/25 | Guiding & Tracking: ${report.breakdown.trackingGuiding}/25 | Sensor Tilt: ${report.breakdown.sensorTilt}/25 | Sky & Transparency: ${report.breakdown.skyTransparency}/25
  </div>
`;
            if (report.findings.length === 0) {
              out += `<div class="text-emerald font-bold" style="margin-top: 8px;">✓ All acquisition parameters conform to golden astronomical standards. Zero pathologies detected.</div>`;
            } else {
              out += `<div class="text-amber font-bold" style="margin-top: 8px;">Detected Pathologies (${report.findings.length}):</div>`;
              report.findings.forEach(f => {
                out += `
  <div class="cli-finding" style="margin-left: 12px; margin-top: 6px;">
    <span class="text-rose font-bold">[${f.severity}]</span> <span class="text-white font-bold">${f.title}</span> <span class="text-slate">(${f.category})</span>
    <div class="text-slate" style="font-size: 0.9em;">${f.impact}</div>
    <ul style="margin: 2px 0 4px 18px; color: #cbd5e1; font-size: 0.88em;">
      ${f.evidence.map(e => `<li>${e}</li>`).join('')}
    </ul>
    <div class="text-emerald" style="font-size: 0.88em;"><b>Action:</b> ${f.remedy}</div>
  </div>`;
              });
            }

            out += `<div class="text-sky font-bold" style="margin-top: 10px;">Prescriptions & Recommendations:</div><ol style="margin: 4px 0 4px 20px; font-size: 0.9em; color: #e2e8f0;">`;
            report.prescriptions.forEach(p => {
              out += `<li>${p}</li>`;
            });
            out += `</ol></div>`;
            this.log(out);
          }
          break;

        case 'metrics':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session.</span>`);
            return;
          }
          if (window.ASDEngine) {
            const s = window.ASDEngine.diagnoseSession(this.currentSession).stats;
            this.log(`
<table class="cli-table">
  <thead><tr><th>Metric</th><th>Mean</th><th>Median</th><th>Std</th><th>Min</th><th>Max</th><th>IQR</th></tr></thead>
  <tbody>
    <tr><td class="text-sky">FWHM (")</td><td>${s.fwhm.mean}</td><td>${s.fwhm.median}</td><td>${s.fwhm.std}</td><td>${s.fwhm.min}</td><td>${s.fwhm.max}</td><td>${s.fwhm.iqr}</td></tr>
    <tr><td class="text-pink">Eccentricity</td><td>${s.eccentricity.mean}</td><td>${s.eccentricity.median}</td><td>${s.eccentricity.std}</td><td>${s.eccentricity.min}</td><td>${s.eccentricity.max}</td><td>${s.eccentricity.iqr}</td></tr>
    <tr><td class="text-amber">Temp (°C)</td><td>${s.temperature.mean}</td><td>${s.temperature.median}</td><td>${s.temperature.std}</td><td>${s.temperature.min}</td><td>${s.temperature.max}</td><td>${s.temperature.iqr}</td></tr>
    <tr><td class="text-purple">Sky BG (ADU)</td><td>${s.background.mean}</td><td>${s.background.median}</td><td>${s.background.std}</td><td>${s.background.min}</td><td>${s.background.max}</td><td>${s.background.iqr}</td></tr>
    <tr><td class="text-emerald">Guide RMS (")</td><td>${s.guiding.mean}</td><td>${s.guiding.median}</td><td>${s.guiding.std}</td><td>${s.guiding.min}</td><td>${s.guiding.max}</td><td>${s.guiding.iqr}</td></tr>
  </tbody>
</table>
`);
          }
          break;

        case 'guiding':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session.</span>`);
            return;
          }
          const gs = this.currentSession.guiding_stats || { ra_rms: 0, dec_rms: 0, total_rms: 0 };
          const raDecRatio = gs.dec_rms > 0 ? (gs.ra_rms / gs.dec_rms).toFixed(2) : '1.0';
          this.log(`
<div class="cli-autopsy-box">
  <div class="text-sky font-bold">PHD2 Guiding Assessment:</div>
  <div>RA RMS: <b>${gs.ra_rms}"</b> | Dec RMS: <b>${gs.dec_rms}"</b> | Total RMS: <b class="text-emerald">${gs.total_rms}"</b></div>
  <div>Axis Imbalance (RA/Dec): <b>${raDecRatio}</b> (nominal range: 0.85 - 1.25)</div>
  <div class="text-slate" style="font-size: 0.9em; margin-top: 4px;">Mount Status: ${gs.total_rms < 0.6 ? 'Excellent Tracking' : gs.total_rms < 1.0 ? 'Acceptable' : 'Degraded Mount Oscillation'}</div>
</div>
`);
          break;

        case 'tilt':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session.</span>`);
            return;
          }
          const q = this.currentSession.quadrant_metrics || {};
          this.log(`
<div class="cli-autopsy-box">
  <div class="text-sky font-bold">5-Zone Focal Plane Orthogonality:</div>
  <table class="cli-table" style="margin-top: 6px;">
    <thead><tr><th>Quadrant</th><th>FWHM (")</th><th>Eccentricity</th><th>Defocus Status</th></tr></thead>
    <tbody>
      <tr><td>Top-Left</td><td>${q.top_left ? q.top_left.fwhm.toFixed(2) : '-'}</td><td>${q.top_left ? q.top_left.ecc.toFixed(2) : '-'}</td><td>${(q.top_left && q.top_left.fwhm > 3.0) ? '<span class="text-rose">Defocused</span>' : '<span class="text-emerald">Nominal</span>'}</td></tr>
      <tr><td>Top-Right</td><td>${q.top_right ? q.top_right.fwhm.toFixed(2) : '-'}</td><td>${q.top_right ? q.top_right.ecc.toFixed(2) : '-'}</td><td>${(q.top_right && q.top_right.fwhm > 3.0) ? '<span class="text-rose">Defocused</span>' : '<span class="text-emerald">Nominal</span>'}</td></tr>
      <tr style="background: rgba(56, 189, 248, 0.1);"><td><b>Center</b></td><td><b>${q.center ? q.center.fwhm.toFixed(2) : '-'}</b></td><td><b>${q.center ? q.center.ecc.toFixed(2) : '-'}</b></td><td><span class="text-emerald">Reference</span></td></tr>
      <tr><td>Bottom-Left</td><td>${q.bottom_left ? q.bottom_left.fwhm.toFixed(2) : '-'}</td><td>${q.bottom_left ? q.bottom_left.ecc.toFixed(2) : '-'}</td><td>${(q.bottom_left && q.bottom_left.fwhm > 3.0) ? '<span class="text-rose">Defocused</span>' : '<span class="text-emerald">Nominal</span>'}</td></tr>
      <tr><td>Bottom-Right</td><td>${q.bottom_right ? q.bottom_right.fwhm.toFixed(2) : '-'}</td><td>${q.bottom_right ? q.bottom_right.ecc.toFixed(2) : '-'}</td><td>${(q.bottom_right && q.bottom_right.fwhm > 3.0) ? '<span class="text-rose">Defocused</span>' : '<span class="text-emerald">Nominal</span>'}</td></tr>
    </tbody>
  </table>
</div>
`);
          break;

        case 'filter':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session.</span>`);
            return;
          }
          const fwhmCut = parseFloat(args[0]) || 2.5;
          const rmsCut = parseFloat(args[1]) || 1.0;
          const totalFrames = this.currentSession.frames.length;
          const survivors = this.currentSession.frames.filter(f => (f.fwhm_arcsec || f.fwhm_px || 0) <= fwhmCut && (f.guide_rms_total || 0) <= rmsCut);
          const rejected = totalFrames - survivors.length;
          this.log(`
<div class="cli-autopsy-box">
  <div class="text-sky font-bold">Subframe Quality Cull Filter:</div>
  <div>Filter Criteria: FWHM ≤ ${fwhmCut}", Guiding RMS ≤ ${rmsCut}"</div>
  <div>Survivor Frames: <b class="text-emerald">${survivors.length} / ${totalFrames}</b> (${((survivors.length / totalFrames) * 100).toFixed(1)}% kept)</div>
  <div>Rejected Bad Frames: <b class="text-rose">${rejected} frames</b> (${((rejected / totalFrames) * 100).toFixed(1)}% discarded)</div>
</div>
`);
          break;

        case 'export':
          if (!this.currentSession) {
            this.log(`<span class="text-rose">No active session to export.</span>`);
            return;
          }
          const format = (args[0] || 'json').toLowerCase();
          this.onCommandExecuted('export', { format, session: this.currentSession });
          this.log(`<span class="text-emerald">Generated and triggered download of ${format.toUpperCase()} report.</span>`);
          break;

        case 'math':
          this.log(`
<div class="cli-autopsy-box">
  <div class="text-sky font-bold">Forensic Astronomical Equations:</div>
  <div style="font-family: monospace; font-size: 0.9em; margin-top: 6px; line-height: 1.6;">
    • <b>Point Spread Function FWHM:</b> FWHM = 2 * sqrt(2 * ln(2)) * σ ≈ 2.35482 * σ<br>
    • <b>Stellar Eccentricity:</b> e = sqrt(1 - (b / a)²) = sqrt(1 - (σ_min / σ_max)²)<br>
    • <b>Half Flux Diameter (Gaussian):</b> HFD ≈ 1.15 * FWHM<br>
    • <b>Total Guiding RMS:</b> RMS_total = sqrt(RMS_RA² + RMS_Dec²)<br>
    • <b>Corner Diagonal Tilt Asymmetry:</b> Δ_tilt = |FWHM_TL - FWHM_BR| / FWHM_center<br>
    • <b>Critical Focus Zone (CFZ):</b> CFZ = ± 4.88 * λ * f_ratio² (μm)
  </div>
</div>
`);
          break;

        case 'clear':
          if (this.outputElem) this.outputElem.innerHTML = '';
          break;

        case 'about':
          this.log(`
<div class="cli-autopsy-box">
  <div class="text-emerald font-bold">AstroSessionDoctor (ASD) v2.0.0</div>
  <div class="text-slate">Astronomical Session Autopsy, PSF Timeline & Quality Assurance Workbench</div>
  <div class="text-slate">Engineered by Loren for amateur and professional astrophotographers.</div>
  <div class="text-sky" style="margin-top: 6px;">Zero backend dependencies • Pure HTML5 / Canvas 2D / KaTeX / Vanilla JS</div>
</div>
`);
          break;

        default:
          this.log(`<span class="text-rose">Command not recognized: '${cmd}'. Type 'help' for available commands.</span>`);
          break;
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { CLI };
});
