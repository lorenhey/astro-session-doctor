/**
 * AstroSessionDoctor Benchmark Sessions Catalog v2.0.0
 * 6 Realistic Astronomical Acquisition Sessions with Injected Pathologies & Golden Benchmarks
 * (c) 2026 Loren - MIT License
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ASDCatalog = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Helper to generate gaussian random
  function randn(mean = 0, std = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  // Generate 6 benchmark sessions
  function buildSessions() {
    const sessions = [];

    // ========================================================
    // 1. NGC 6960 (Western Veil Nebula) - Focus Drift
    // ========================================================
    (function () {
      const numFrames = 45;
      const baseFwhm = 2.05;
      const baseTemp = 14.8;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        // Temperature cools steadily from 14.8 C down to 10.9 C
        const temp = Number((baseTemp - (i * 0.088) + randn(0, 0.05)).toFixed(2));
        // FWHM drifts upwards as aluminum tube contracts
        const drift = i > 8 ? (i - 8) * 0.058 : 0;
        const fwhm = Number((baseFwhm + drift + randn(0, 0.08)).toFixed(2));
        const fwhm_px = Number((fwhm / 0.82).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.12 + randn(0, 0.04)).toFixed(2));
        const ecc = Number(Math.max(0.12, Math.min(0.38, 0.22 + randn(0, 0.03))).toFixed(2));
        const bg = Math.round(520 + randn(0, 15));
        const stars = Math.round(185 - (drift * 12) + randn(0, 5));
        const raRms = Number(Math.max(0.25, 0.45 + randn(0, 0.05)).toFixed(2));
        const decRms = Number(Math.max(0.22, 0.42 + randn(0, 0.05)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 5,
          timestamp: `2026-09-14T${String(21 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: bg,
          stars_detected: Math.max(80, stars),
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      for (let j = 0; j < 120; j++) {
        guidingSamples.push({
          ra_err: Number(randn(0, 0.42).toFixed(3)),
          dec_err: Number(randn(0, 0.39).toFixed(3))
        });
      }

      sessions.push({
        id: 'ngc-6960',
        name: 'NGC 6960 (Western Veil) — Thermal Focus Drift',
        target: 'NGC 6960 (Caldwell 34)',
        telescope: 'TS-Optics Photoline 102mm f/7 FPL53 + 0.79x Reducer',
        camera: 'ZWO ASI2600MM Pro (APS-C)',
        focalLength_mm: 563,
        pixelScale_arcsec: 1.38,
        filter: 'OIII (3nm)',
        exposure_sec: 300,
        intendedPathology: 'Severe thermal focus drift: ambient temperature fell by 3.9°C over 3.7 hours without refocusing. Star FWHM expanded by 102%.',
        guiding_stats: { ra_rms: 0.45, dec_rms: 0.42, total_rms: 0.62 },
        quadrant_metrics: {
          center: { fwhm: 3.12, ecc: 0.22 },
          top_left: { fwhm: 3.25, ecc: 0.25 },
          top_right: { fwhm: 3.28, ecc: 0.24 },
          bottom_left: { fwhm: 3.22, ecc: 0.23 },
          bottom_right: { fwhm: 3.29, ecc: 0.25 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    // ========================================================
    // 2. M51 (Whirlpool Galaxy) - Dec Backlash & Periodic Tracking Failure
    // ========================================================
    (function () {
      const numFrames = 40;
      const baseFwhm = 2.20;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        const temp = Number((12.5 - (i * 0.02) + randn(0, 0.04)).toFixed(2));
        // Dec oscillation periodic backlash cycle every 6-8 frames
        const decOsc = 0.85 * Math.sin((i / 7) * 2 * Math.PI) + 0.4;
        const decRms = Number(Math.max(0.35, 0.75 + Math.max(0, decOsc) + randn(0, 0.08)).toFixed(2));
        const raRms = Number(Math.max(0.30, 0.48 + randn(0, 0.06)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        // Stellar eccentricity severely elongated in Declination direction
        const isBadTracking = decRms > 1.2;
        const ecc = Number(Math.min(0.72, 0.32 + (isBadTracking ? 0.30 : 0.08) + randn(0, 0.04)).toFixed(2));
        const fwhm = Number((baseFwhm + (isBadTracking ? 0.75 : 0.15) + randn(0, 0.07)).toFixed(2));
        const fwhm_px = Number((fwhm / 0.75).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.15).toFixed(2));
        const bg = Math.round(480 + randn(0, 12));
        const stars = Math.round(210 + randn(0, 8));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 4,
          timestamp: `2026-05-18T${String(22 + Math.floor((i * 4) / 60)).padStart(2, '0')}:${String((i * 4) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: bg,
          stars_detected: stars,
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      // Guiding samples show distinct elongation in Dec (Y axis)
      for (let j = 0; j < 140; j++) {
        const decErr = randn(0, 1.45);
        const raErr = randn(0, 0.46);
        guidingSamples.push({
          ra_err: Number(raErr.toFixed(3)),
          dec_err: Number(decErr.toFixed(3))
        });
      }

      sessions.push({
        id: 'm51',
        name: 'M51 (Whirlpool) — Dec Backlash & Tracking Degradation',
        target: 'M51 / NGC 5194',
        telescope: 'Sky-Watcher Esprit 120ED Super APO Triplet',
        camera: 'QHY268M (IMX571)',
        focalLength_mm: 840,
        pixelScale_arcsec: 0.92,
        filter: 'Luminance',
        exposure_sec: 240,
        intendedPathology: 'Severe Declination axis backlash and oscillating guide pulses causing Dec RMS of 1.6" and star elongation (e = 0.62) along Dec axis.',
        guiding_stats: { ra_rms: 0.48, dec_rms: 1.48, total_rms: 1.55 },
        quadrant_metrics: {
          center: { fwhm: 2.85, ecc: 0.55 },
          top_left: { fwhm: 2.92, ecc: 0.58 },
          top_right: { fwhm: 2.90, ecc: 0.56 },
          bottom_left: { fwhm: 2.88, ecc: 0.57 },
          bottom_right: { fwhm: 2.95, ecc: 0.59 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    // ========================================================
    // 3. IC 405 (Flaming Star) - Sensor Tilt & Field Curvature
    // ========================================================
    (function () {
      const numFrames = 35;
      const baseFwhm = 2.15;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        const temp = Number((8.2 - (i * 0.03) + randn(0, 0.03)).toFixed(2));
        const fwhm = Number((baseFwhm + randn(0, 0.06)).toFixed(2));
        const fwhm_px = Number((fwhm / 1.1).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.13).toFixed(2));
        const ecc = Number(Math.max(0.18, 0.28 + randn(0, 0.03)).toFixed(2));
        const bg = Math.round(590 + randn(0, 10));
        const stars = Math.round(240 + randn(0, 7));
        const raRms = Number(Math.max(0.28, 0.42 + randn(0, 0.04)).toFixed(2));
        const decRms = Number(Math.max(0.25, 0.39 + randn(0, 0.04)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 5,
          timestamp: `2026-11-05T${String(23 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: bg,
          stars_detected: stars,
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      for (let j = 0; j < 120; j++) {
        guidingSamples.push({
          ra_err: Number(randn(0, 0.41).toFixed(3)),
          dec_err: Number(randn(0, 0.38).toFixed(3))
        });
      }

      sessions.push({
        id: 'ic-405',
        name: 'IC 405 (Flaming Star) — Sensor Tilt & Field Curvature',
        target: 'IC 405 (Sh2-229)',
        telescope: 'Askar FRA600 f/5.6 Quintuplet Petzval Astrograph',
        camera: 'ZWO ASI6200MC Pro (Full Frame)',
        focalLength_mm: 600,
        pixelScale_arcsec: 1.29,
        filter: 'Optolong L-eXtreme',
        exposure_sec: 300,
        intendedPathology: 'Severe optical sensor tilt across sensor diagonal: Center FWHM 2.15", Top-Left 2.22", Bottom-Right 4.25" with tangential corner astigmatism.',
        guiding_stats: { ra_rms: 0.42, dec_rms: 0.39, total_rms: 0.57 },
        quadrant_metrics: {
          center: { fwhm: 2.15, ecc: 0.16, angle_deg: 0 },
          top_left: { fwhm: 2.22, ecc: 0.21, angle_deg: 45 },
          top_right: { fwhm: 2.78, ecc: 0.33, angle_deg: 135 },
          bottom_left: { fwhm: 2.85, ecc: 0.35, angle_deg: 225 },
          bottom_right: { fwhm: 4.25, ecc: 0.56, angle_deg: 315 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    // ========================================================
    // 4. B33 (Horsehead Nebula) - Wind Buffeting & Cable Snag Spikes
    // ========================================================
    (function () {
      const numFrames = 40;
      const baseFwhm = 2.10;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        const temp = Number((5.1 - (i * 0.02) + randn(0, 0.03)).toFixed(2));
        // Transient wind gusts and snag events on frames 18..24
        const isGust = (i >= 17 && i <= 23);
        const gustFactor = isGust ? (1.8 + Math.sin(i) * 0.8) : 0;

        const raRms = Number(Math.max(0.32, 0.45 + (isGust ? gustFactor * 1.1 : 0) + randn(0, 0.06)).toFixed(2));
        const decRms = Number(Math.max(0.28, 0.41 + (isGust ? gustFactor * 0.9 : 0) + randn(0, 0.05)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        const ecc = Number(Math.min(0.78, 0.22 + (isGust ? 0.45 : 0) + randn(0, 0.04)).toFixed(2));
        const fwhm = Number((baseFwhm + (isGust ? 1.6 : 0.05) + randn(0, 0.06)).toFixed(2));
        const fwhm_px = Number((fwhm / 0.85).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.14).toFixed(2));
        const bg = Math.round(510 + randn(0, 14));
        const stars = Math.round(260 - (isGust ? 70 : 0) + randn(0, 8));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 5,
          timestamp: `2026-12-10T${String(22 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: bg,
          stars_detected: stars,
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      for (let j = 0; j < 130; j++) {
        const isSpike = j > 50 && j < 75;
        const scale = isSpike ? 2.2 : 0.45;
        guidingSamples.push({
          ra_err: Number(randn(0, scale).toFixed(3)),
          dec_err: Number(randn(0, scale * 0.9).toFixed(3))
        });
      }

      sessions.push({
        id: 'b33',
        name: 'B33 (Horsehead) — Wind Buffeting & Cable Snag Spikes',
        target: 'Barnard 33 / IC 434',
        telescope: 'Celestron EdgeHD 8" with 0.7x Reducer',
        camera: 'ZWO ASI533MM Pro',
        focalLength_mm: 1422,
        pixelScale_arcsec: 0.55,
        filter: 'Ha (7nm)',
        exposure_sec: 300,
        intendedPathology: 'Mountain observatory 35 km/h wind gusts and declination cable tension spike between subframes #18 and #24.',
        guiding_stats: { ra_rms: 0.88, dec_rms: 0.79, total_rms: 1.18 },
        quadrant_metrics: {
          center: { fwhm: 2.35, ecc: 0.29 },
          top_left: { fwhm: 2.42, ecc: 0.32 },
          top_right: { fwhm: 2.40, ecc: 0.31 },
          bottom_left: { fwhm: 2.38, ecc: 0.30 },
          bottom_right: { fwhm: 2.45, ecc: 0.33 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    // ========================================================
    // 5. M31 (Andromeda Galaxy) - Passing Cirrus Clouds & Moon Rise
    // ========================================================
    (function () {
      const numFrames = 50;
      const baseFwhm = 2.25;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        const temp = Number((11.0 - (i * 0.03) + randn(0, 0.03)).toFixed(2));
        // Cirrus clouds invade around frame 20..35, Moon rises after frame 36
        const isCloudy = (i >= 20 && i <= 34);
        const isMoon = (i >= 35);

        let bg = 450;
        let stars = 320;
        if (isCloudy) {
          bg = 1100 + randn(0, 80);
          stars = 110 + randn(0, 20); // Extinction
        } else if (isMoon) {
          bg = 850 + (i - 35) * 45;
          stars = 230 + randn(0, 15);
        } else {
          bg = 450 + randn(0, 15);
          stars = 320 + randn(0, 15);
        }

        const fwhm = Number((baseFwhm + (isCloudy ? 0.8 : 0.05) + randn(0, 0.07)).toFixed(2));
        const fwhm_px = Number((fwhm / 1.05).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.14).toFixed(2));
        const ecc = Number(Math.max(0.15, 0.25 + randn(0, 0.03)).toFixed(2));
        const raRms = Number(Math.max(0.30, 0.44 + randn(0, 0.05)).toFixed(2));
        const decRms = Number(Math.max(0.28, 0.40 + randn(0, 0.05)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 3,
          timestamp: `2026-10-18T${String(21 + Math.floor((i * 3) / 60)).padStart(2, '0')}:${String((i * 3) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: Math.round(bg),
          stars_detected: Math.max(40, Math.round(stars)),
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      for (let j = 0; j < 120; j++) {
        guidingSamples.push({
          ra_err: Number(randn(0, 0.43).toFixed(3)),
          dec_err: Number(randn(0, 0.41).toFixed(3))
        });
      }

      sessions.push({
        id: 'm31',
        name: 'M31 (Andromeda) — High Cirrus Clouds & Moon Surge',
        target: 'M31 / NGC 224',
        telescope: 'William Optics Zenithstar 73 III APO',
        camera: 'Canon EOS Ra Full Frame Astro-DSLR',
        focalLength_mm: 430,
        pixelScale_arcsec: 2.11,
        filter: 'Broadband RGB',
        exposure_sec: 180,
        intendedPathology: 'High-altitude cirrostratus clouds caused 65% stellar flux extinction, followed by 78% waxing moon rise background surge.',
        guiding_stats: { ra_rms: 0.44, dec_rms: 0.40, total_rms: 0.59 },
        quadrant_metrics: {
          center: { fwhm: 2.45, ecc: 0.22 },
          top_left: { fwhm: 2.50, ecc: 0.24 },
          top_right: { fwhm: 2.48, ecc: 0.23 },
          bottom_left: { fwhm: 2.52, ecc: 0.25 },
          bottom_right: { fwhm: 2.49, ecc: 0.24 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    // ========================================================
    // 6. NGC 253 (Sculptor Galaxy) - Pristine Reference Session (PASS)
    // ========================================================
    (function () {
      const numFrames = 48;
      const baseFwhm = 1.72;
      const baseTemp = 9.5;
      const frames = [];
      const guidingSamples = [];

      for (let i = 0; i < numFrames; i++) {
        // Controlled slow cooling with active auto-focus offsets
        const temp = Number((baseTemp - (i * 0.02) + randn(0, 0.02)).toFixed(2));
        const fwhm = Number((baseFwhm + randn(0, 0.05)).toFixed(2));
        const fwhm_px = Number((fwhm / 0.65).toFixed(2));
        const hfd_px = Number((fwhm_px * 1.12).toFixed(2));
        const ecc = Number(Math.max(0.10, 0.18 + randn(0, 0.02)).toFixed(2));
        const bg = Math.round(410 + randn(0, 8));
        const stars = Math.round(390 + randn(0, 10));
        const raRms = Number(Math.max(0.18, 0.28 + randn(0, 0.03)).toFixed(2));
        const decRms = Number(Math.max(0.16, 0.26 + randn(0, 0.03)).toFixed(2));
        const totRms = Number(Math.sqrt(raRms ** 2 + decRms ** 2).toFixed(2));

        frames.push({
          frame_number: i + 1,
          time_offset_min: i * 5,
          timestamp: `2026-10-25T${String(22 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00Z`,
          fwhm_arcsec: fwhm,
          fwhm_px: fwhm_px,
          hfd_px: hfd_px,
          eccentricity: ecc,
          temperature: temp,
          background_median: bg,
          stars_detected: stars,
          guide_rms_ra: raRms,
          guide_rms_dec: decRms,
          guide_rms_total: totRms
        });
      }

      for (let j = 0; j < 150; j++) {
        guidingSamples.push({
          ra_err: Number(randn(0, 0.28).toFixed(3)),
          dec_err: Number(randn(0, 0.26).toFixed(3))
        });
      }

      sessions.push({
        id: 'ngc-253',
        name: 'NGC 253 (Sculptor Galaxy) — Golden Master Session (PASS)',
        target: 'NGC 253 (Silver Coin Galaxy)',
        telescope: 'Planewave CDK14 f/7.2 Corrected Dall-Kirkham',
        camera: 'Moravian C3-61000 PRO (IMX455)',
        focalLength_mm: 2563,
        pixelScale_arcsec: 0.30,
        filter: 'Luminance',
        exposure_sec: 300,
        intendedPathology: 'None (Benchmark Golden Reference): Sub-arcsecond seeing, closed-loop motorized temperature compensation, 0.38" total guiding RMS, zero tilt.',
        guiding_stats: { ra_rms: 0.28, dec_rms: 0.26, total_rms: 0.38 },
        quadrant_metrics: {
          center: { fwhm: 1.72, ecc: 0.16 },
          top_left: { fwhm: 1.76, ecc: 0.18 },
          top_right: { fwhm: 1.75, ecc: 0.17 },
          bottom_left: { fwhm: 1.74, ecc: 0.18 },
          bottom_right: { fwhm: 1.77, ecc: 0.19 }
        },
        frames,
        guiding_samples: guidingSamples
      });
    })();

    return sessions;
  }

  const CATALOG = buildSessions();

  function getSessionById(id) {
    return CATALOG.find(s => s.id === id) || CATALOG[0];
  }

  function getAllSessions() {
    return CATALOG;
  }

  return {
    CATALOG,
    getSessionById,
    getAllSessions
  };
});
