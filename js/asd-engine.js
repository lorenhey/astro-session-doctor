/**
 * AstroSessionDoctor Engine v2.0.0
 * Astronomical Session Autopsy, PSF/FWHM Timeline, Guiding RMS Diagnosis & QA Workbench
 * (c) 2026 Loren - MIT License
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ASDEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants
  const FWHM_TO_SIGMA = 2.354820045; // 2 * sqrt(2 * ln(2))
  const HFD_TO_FWHM_GAUSS = 1.15;

  /**
   * Calculate summary statistics for an array of numbers
   */
  function calculateStats(arr) {
    const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (valid.length === 0) {
      return { count: 0, mean: 0, std: 0, median: 0, min: 0, max: 0, p25: 0, p75: 0, iqr: 0 };
    }
    const sorted = [...valid].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
    const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
    const std = Math.sqrt(variance);

    const q = (p) => {
      const idx = (n - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return sorted[lo];
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };

    const median = q(0.5);
    const p25 = q(0.25);
    const p75 = q(0.75);

    return {
      count: n,
      mean: Number(mean.toFixed(3)),
      std: Number(std.toFixed(3)),
      median: Number(median.toFixed(3)),
      min: Number(sorted[0].toFixed(3)),
      max: Number(sorted[n - 1].toFixed(3)),
      p25: Number(p25.toFixed(3)),
      p75: Number(p75.toFixed(3)),
      iqr: Number((p75 - p25).toFixed(3))
    };
  }

  /**
   * Linear regression for slope and correlation determination
   */
  function linearRegression(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { slope: 0, intercept: 0, r2: 0, r: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-12) return { slope: 0, intercept: sumY / n, r2: 0, r: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const denomY = n * sumY2 - sumY * sumY;
    let r = 0;
    if (denomY > 0 && denom > 0) {
      r = (n * sumXY - sumX * sumY) / Math.sqrt(denom * denomY);
    }
    const r2 = r * r;

    return { slope, intercept, r, r2 };
  }

  /**
   * Main Autopsy & Diagnosis Evaluator
   */
  function diagnoseSession(session) {
    const frames = session.frames || [];
    const n = frames.length;
    if (n === 0) {
      return {
        score: 0,
        verdict: 'NO_DATA',
        findings: [],
        prescriptions: ['Load or provide an astronomical acquisition session.'],
        breakdown: { seeingFocus: 0, trackingGuiding: 0, sensorTilt: 0, skyTransparency: 0 },
        stats: {}
      };
    }

    const fwhmArr = frames.map(f => f.fwhm_arcsec || f.fwhm_px || 0);
    const hfdArr = frames.map(f => f.hfd_px || (f.fwhm_px ? f.fwhm_px * 0.9 : 0));
    const eccArr = frames.map(f => f.eccentricity || 0);
    const tempArr = frames.map(f => f.temperature !== undefined ? f.temperature : null);
    const bgArr = frames.map(f => f.background_median || 0);
    const starsArr = frames.map(f => f.stars_detected || 0);
    const guideRmsArr = frames.map(f => f.guide_rms_total || 0);

    const fwhmStats = calculateStats(fwhmArr);
    const eccStats = calculateStats(eccArr);
    const bgStats = calculateStats(bgArr);
    const starsStats = calculateStats(starsArr);
    const guideStats = calculateStats(guideRmsArr);

    const validTemps = tempArr.filter(t => t !== null);
    const tempStats = calculateStats(validTemps);

    // Track findings
    const findings = [];
    const prescriptions = [];

    // --- Sub-score initial allocations (25 pts max each) ---
    let seeingScore = 25;
    let trackingScore = 25;
    let tiltScore = 25;
    let skyScore = 25;

    // 1. EVALUATE FOCUS DRIFT
    let focusDriftDetected = false;
    if (n >= 10) {
      const idxArr = frames.map((_, i) => i);
      const fwhmReg = linearRegression(idxArr, fwhmArr);
      const halfN = Math.floor(n / 2);
      const fwhmFirstHalf = calculateStats(fwhmArr.slice(0, halfN)).median;
      const fwhmSecondHalf = calculateStats(fwhmArr.slice(halfN)).median;
      const fwhmDeltaPct = fwhmFirstHalf > 0 ? ((fwhmSecondHalf - fwhmFirstHalf) / fwhmFirstHalf) * 100 : 0;

      let tempDelta = 0;
      if (validTemps.length >= 10) {
        tempDelta = validTemps[0] - validTemps[validTemps.length - 1]; // positive means cooling
      }

      if (fwhmDeltaPct > 20 && fwhmReg.slope > 0.015) {
        focusDriftDetected = true;
        const severity = fwhmDeltaPct > 45 ? 'CRITICAL' : 'MAJOR';
        const penalty = severity === 'CRITICAL' ? 14 : 9;
        seeingScore -= penalty;

        const evidence = [
          `FWHM increased from median ${fwhmFirstHalf.toFixed(2)}" to ${fwhmSecondHalf.toFixed(2)}" (+${fwhmDeltaPct.toFixed(1)}%)`,
          `Linear focus slope: +${(fwhmReg.slope * 10).toFixed(2)}" per 10 subframes (R² = ${fwhmReg.r2.toFixed(2)})`
        ];
        if (tempDelta > 0.8) {
          evidence.push(`Ambient temperature dropped by ${tempDelta.toFixed(1)}°C without compensatory refocusing`);
        }

        findings.push({
          id: 'focus-drift',
          title: 'THERMAL FOCUS DRIFT',
          severity: severity,
          category: 'Focus / Optical',
          evidence: evidence,
          impact: 'Point Spread Function bloat and severe loss of high-spatial-frequency resolution across deep-sky targets.',
          remedy: 'Configure automated refocusing triggers in N.I.N.A./Voyager/KStars on temperature delta (ΔT ≥ 0.75°C) or HFD delta (> 12%).'
        });
        prescriptions.push(`Automate focuser temperature coefficient calibration (step/°C) to compensate for tube contraction.`);
      }
    }

    // 2. EVALUATE TRACKING & GUIDING INSTABILITY
    const highGuideFrames = frames.filter(f => (f.guide_rms_total || 0) > 1.2 || (f.eccentricity || 0) > 0.5);
    const highGuidePct = (highGuideFrames.length / n) * 100;
    
    // Check RA vs Dec RMS imbalance
    let raRmsAvg = 0, decRmsAvg = 0;
    if (session.guiding_stats) {
      raRmsAvg = session.guiding_stats.ra_rms || 0;
      decRmsAvg = session.guiding_stats.dec_rms || 0;
    } else {
      raRmsAvg = guideStats.mean * 0.707;
      decRmsAvg = guideStats.mean * 0.707;
    }

    const raDecRatio = decRmsAvg > 0 ? (raRmsAvg / decRmsAvg) : 1;
    const decRaRatio = raRmsAvg > 0 ? (decRmsAvg / raRmsAvg) : 1;

    if (guideStats.median > 1.3 || highGuidePct > 20 || eccStats.median > 0.45) {
      const isSevere = guideStats.median > 1.8 || highGuidePct > 40 || eccStats.median > 0.55;
      const severity = isSevere ? 'CRITICAL' : 'MAJOR';
      trackingScore -= (isSevere ? 16 : 10);

      const evidence = [
        `Median stellar eccentricity is elevated at e = ${eccStats.median.toFixed(2)} (nominal < 0.35)`,
        `Guiding RMS median is ${guideStats.median.toFixed(2)}" with ${highGuidePct.toFixed(0)}% of frames exceeding tolerance`
      ];

      let trackingCause = 'Periodic worm error or tracking imbalance';
      if (decRaRatio > 1.7) {
        trackingCause = 'Declination axis backlash, cable drag, or uncompensated polar alignment drift';
        evidence.push(`Dec RMS (${decRmsAvg.toFixed(2)}") is ${decRaRatio.toFixed(1)}x greater than RA RMS (${raRmsAvg.toFixed(2)}")`);
      } else if (raDecRatio > 1.7) {
        trackingCause = 'RA periodic error, periodic gear harmonics, or sidereal drive oscillation';
        evidence.push(`RA RMS (${raRmsAvg.toFixed(2)}") is ${raDecRatio.toFixed(1)}x greater than Dec RMS (${decRmsAvg.toFixed(2)}")`);
      }

      findings.push({
        id: 'guiding-failure',
        title: 'GUIDING / MOUNT TRACKING INSTABILITY',
        severity: severity,
        category: 'Mount / Guiding',
        evidence: evidence,
        impact: `Star elongation along tracking axis; degraded SNR and smeared structural details (${trackingCause}).`,
        remedy: 'Run PHD2 Guiding Assistant, measure Declination backlash, check balance (east-heavy bias), and ensure cables are strain-relieved.'
      });
      prescriptions.push(`Perform PHD2 polar alignment drift calibration and set Dec backlash compensation.`);
    }

    // 3. EVALUATE TRANSIENT WIND BUFFETING / CABLE SNAGS
    const transientOutliers = frames.filter((f, i) => {
      const e = f.eccentricity || 0;
      const rms = f.guide_rms_total || 0;
      return (e > eccStats.median + 2 * eccStats.std && e > 0.55) || (rms > guideStats.median + 2.5 * guideStats.std && rms > 2.0);
    });

    if (transientOutliers.length > 0 && transientOutliers.length <= n * 0.25) {
      trackingScore -= 5;
      const frameIndices = transientOutliers.map(f => `#${f.frame_number || f.index || '?'}`).join(', ');
      findings.push({
        id: 'wind-buffeting',
        title: 'TRANSIENT WIND GUSTS / CABLE SNAG SPIKES',
        severity: 'MODERATE',
        category: 'Environmental / Mechanical',
        evidence: [
          `${transientOutliers.length} subframes (${((transientOutliers.length / n) * 100).toFixed(1)}%) exhibit severe transient elongation spikes: ${frameIndices}`,
          `Max transient eccentricity peaked at e = ${calculateStats(transientOutliers.map(f => f.eccentricity || 0)).max.toFixed(2)}`
        ],
        impact: 'Isolated heavily trailed subframes degrade stacked master frame contrast and core PSF if not rejected.',
        remedy: 'Reject identified damaged subframes during stacking with Sigma-Clipping; inspect cable drape loops for snagging points.'
      });
      prescriptions.push(`Discard or quarantine damaged outlier subframes: ${frameIndices}.`);
    }

    // 4. EVALUATE SENSOR TILT & OPTICAL ABERRATIONS
    const quad = session.quadrant_metrics || null;
    let tiltDiscrepancy = 0;
    let tiltThetaArcmin = 0;

    if (quad && quad.center) {
      const c = quad.center.fwhm || fwhmStats.median;
      const tl = quad.top_left ? quad.top_left.fwhm : c;
      const tr = quad.top_right ? quad.top_right.fwhm : c;
      const bl = quad.bottom_left ? quad.bottom_left.fwhm : c;
      const br = quad.bottom_right ? quad.bottom_right.fwhm : c;

      const diag1Diff = Math.abs(tl - br);
      const diag2Diff = Math.abs(tr - bl);
      tiltDiscrepancy = (Math.max(diag1Diff, diag2Diff) / (c > 0 ? c : 1)) * 100;
      // Approximate focal plane tilt angle in arcmin: delta_z / D_sensor * 3438
      tiltThetaArcmin = Number((tiltDiscrepancy * 0.12).toFixed(2));

      if (tiltDiscrepancy > 18) {
        const severity = tiltDiscrepancy > 35 ? 'CRITICAL' : 'MAJOR';
        tiltScore -= (severity === 'CRITICAL' ? 15 : 9);

        const worstCorner = [
          { name: 'Top-Left', val: tl },
          { name: 'Top-Right', val: tr },
          { name: 'Bottom-Left', val: bl },
          { name: 'Bottom-Right', val: br }
        ].sort((a, b) => b.val - a.val)[0];

        findings.push({
          id: 'sensor-tilt',
          title: 'SENSOR PLANE TILT & FIELD CURVATURE',
          severity: severity,
          category: 'Optical / Alignment',
          evidence: [
            `Corner-to-corner FWHM discrepancy is ${tiltDiscrepancy.toFixed(1)}% (Center: ${c.toFixed(2)}", ${worstCorner.name}: ${worstCorner.val.toFixed(2)}")`,
            `Estimated focal plane tilt angle: ~${tiltThetaArcmin}' arcminutes across optical diagonal`,
            `Asymmetric corner star aspect ratio indicating mechanical sensor non-orthogonality`
          ],
          impact: 'Selective corner defocus, astigmatic star elongation, and non-uniform resolution across the image sensor.',
          remedy: 'Install an adjustable sensor tilt-plate (CTU) and shim/adjust screws toward the defocused quadrant.'
        });
        prescriptions.push(`Correct camera sensor orthogonal alignment: adjust tilt towards ${worstCorner.name} quadrant.`);
      } else if (tiltDiscrepancy > 10) {
        tiltScore -= 4;
        findings.push({
          id: 'sensor-tilt-minor',
          title: 'MILD OPTICAL TILT / BACKFOCUS DEFICIT',
          severity: 'MINOR',
          category: 'Optical / Alignment',
          evidence: [
            `Corner FWHM variation is ${tiltDiscrepancy.toFixed(1)}% (nominally < 10%)`,
            `Minor corner PSF degradation within tolerable stacking threshold`
          ],
          impact: 'Subtle corner defocus on large sensor formats.',
          remedy: 'Verify corrector backfocus spacing with 0.5 mm shims.'
        });
      }
    }

    // 5. EVALUATE CLOUDS, SKY GRADIENTS & TRANSPARENCY
    if (bgStats.count >= 10 && starsStats.count >= 10) {
      const bgMin = bgStats.min;
      const bgMax = bgStats.max;
      const bgDelta = bgMin > 0 ? ((bgMax - bgMin) / bgMin) * 100 : 0;

      const starsMax = starsStats.max;
      const starsMin = starsStats.min;
      const starsDropPct = starsMax > 0 ? ((starsMax - starsMin) / starsMax) * 100 : 0;

      if (bgDelta > 80 || starsDropPct > 45) {
        const severity = (bgDelta > 150 || starsDropPct > 65) ? 'CRITICAL' : 'MAJOR';
        skyScore -= (severity === 'CRITICAL' ? 14 : 9);

        findings.push({
          id: 'cloud-gradient',
          title: 'CLOUD CONTAMINATION / SKY BACKGROUND SURGE',
          severity: severity,
          category: 'Atmospheric / Transparency',
          evidence: [
            `Detected star count dropped by ${starsDropPct.toFixed(1)}% (${starsMax} → ${starsMin} stars detected)`,
            `Sky background level surged by +${bgDelta.toFixed(0)}% (min: ${bgMin.toFixed(0)} ADU, max: ${bgMax.toFixed(0)} ADU)`,
            `Strong extinction of faint nebulosity and stellar flux signature`
          ],
          impact: 'Severe photon noise degradation, loss of deep target integration depth, and complex sky gradients.',
          remedy: 'Cull frames with high background or depleted star counts prior to integration; check local all-sky camera.'
        });
        prescriptions.push(`Exclude subframes with background ADU > ${(bgMin * 1.4).toFixed(0)} ADU or star count < ${(starsMax * 0.6).toFixed(0)}.`);
      }
    }

    // Ensure scores are bounded
    seeingScore = Math.max(0, Math.min(25, seeingScore));
    trackingScore = Math.max(0, Math.min(25, trackingScore));
    tiltScore = Math.max(0, Math.min(25, tiltScore));
    skyScore = Math.max(0, Math.min(25, skyScore));

    const totalScore = Math.round(seeingScore + trackingScore + tiltScore + skyScore);

    let verdict = 'PASS';
    let verdictLabel = 'CERTIFIED OPTIMAL (PASS)';
    let verdictColor = '#10b981'; // Green
    if (totalScore < 60) {
      verdict = 'CRITICAL';
      verdictLabel = 'CRITICAL PATHOLOGY (FAIL)';
      verdictColor = '#ef4444'; // Red
    } else if (totalScore < 85) {
      verdict = 'DEGRADED';
      verdictLabel = 'DEGRADED ACQUISITION (WARN)';
      verdictColor = '#f59e0b'; // Amber
    }

    if (prescriptions.length === 0) {
      prescriptions.push('Maintain current imaging train configuration: all acquisition metrics conform to precision astronomical standards.');
    }

    return {
      score: totalScore,
      verdict: verdict,
      verdictLabel: verdictLabel,
      verdictColor: verdictColor,
      findings: findings,
      prescriptions: prescriptions,
      breakdown: {
        seeingFocus: seeingScore,
        trackingGuiding: trackingScore,
        sensorTilt: tiltScore,
        skyTransparency: skyScore
      },
      stats: {
        framesCount: n,
        fwhm: fwhmStats,
        eccentricity: eccStats,
        background: bgStats,
        stars: starsStats,
        guiding: guideStats,
        temperature: tempStats,
        tiltDiscrepancy: tiltDiscrepancy,
        tiltThetaArcmin: tiltThetaArcmin
      }
    };
  }

  return {
    FWHM_TO_SIGMA,
    HFD_TO_FWHM_GAUSS,
    calculateStats,
    linearRegression,
    diagnoseSession
  };
});
