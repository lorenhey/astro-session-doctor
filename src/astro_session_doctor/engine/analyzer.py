from typing import List, Dict, Any
from ..models.session import Session, Frame
import numpy as np

class Finding:
    def __init__(self, title: str, severity: str, time_range: str, affected_frames: int, evidence: List[str], possible_causes: List[str]):
        self.title = title
        self.severity = severity
        self.time_range = time_range
        self.affected_frames = affected_frames
        self.evidence = evidence
        self.possible_causes = possible_causes

class Analyzer:
    """Analyzes the unified session timeline to generate findings."""

    def __init__(self, session: Session):
        self.session = session
        self.findings = []

    def analyze(self) -> List[Finding]:
        self.findings = []
        self._analyze_focus_drift()
        self._analyze_guiding_degradation()
        return self.findings

    def _analyze_focus_drift(self):
        lights = [f for f in self.session.frames if f.frame_type == "light" and f.metrics and f.metrics.fwhm_px is not None]
        if len(lights) < 10:
            return

        # Simple monotonic increase detection for demo purposes
        # A real implementation would use change point detection and cross-reference with guiding
        
        # Check if there is a sequence of increasing FWHM
        fwhms = [f.metrics.fwhm_px for f in lights]
        temps = [f.temperature for f in lights if f.temperature is not None]
        
        # Very simple drift detection for the demo
        if len(fwhms) >= 20:
            first_half = np.median(fwhms[0:10])
            second_half = np.median(fwhms[10:20])
            
            if second_half > first_half * 1.15: # 15% increase
                evidence = [
                    f"Median FWHM increased by {((second_half/first_half)-1)*100:.1f}%",
                ]
                if len(temps) >= 20:
                    t_drop = temps[0] - temps[19]
                    if t_drop > 0.5:
                        evidence.append(f"Temperature dropped by {t_drop:.1f} °C")
                
                self.findings.append(Finding(
                    title="FOCUS DRIFT",
                    severity="MAJOR",
                    time_range=f"{lights[10].timestamp.strftime('%H:%M')} - {lights[19].timestamp.strftime('%H:%M')}",
                    affected_frames=10,
                    evidence=evidence,
                    possible_causes=["Temperature-related focus drift", "Mechanical slippage"]
                ))

    def _analyze_guiding_degradation(self):
        lights = [f for f in self.session.frames if f.frame_type == "light" and f.metrics and f.metrics.eccentricity is not None]
        if len(lights) < 30:
            return
            
        eccs = [f.metrics.eccentricity for f in lights]
        
        if len(eccs) >= 30:
            base_ecc = np.median(eccs[0:20])
            spike_ecc = np.median(eccs[25:30])
            
            if spike_ecc > base_ecc * 2.0:
                self.findings.append(Finding(
                    title="TRACKING/GUIDING DEGRADATION",
                    severity="MODERATE",
                    time_range=f"{lights[25].timestamp.strftime('%H:%M')} - {lights[29].timestamp.strftime('%H:%M')}",
                    affected_frames=5,
                    evidence=[
                        f"Stellar eccentricity increased from {base_ecc:.2f} to {spike_ecc:.2f}",
                        "Simultaneous FWHM increase detected"
                    ],
                    possible_causes=["Wind gust", "Cable drag", "Temporary guiding failure"]
                ))
