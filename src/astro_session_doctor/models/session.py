from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class Equipment(BaseModel):
    camera: Optional[str] = None
    telescope: Optional[str] = None
    focal_length_mm: Optional[float] = None
    pixel_size_um: Optional[float] = None

class FrameMetrics(BaseModel):
    fwhm_px: Optional[float] = None
    fwhm_arcsec: Optional[float] = None
    hfr_px: Optional[float] = None
    eccentricity: Optional[float] = None
    stars_detected: Optional[int] = None
    background_median: Optional[float] = None
    background_sigma: Optional[float] = None
    saturation_fraction: Optional[float] = None

class Frame(BaseModel):
    path: str
    frame_type: str  # light, dark, flat, bias
    filter_name: Optional[str] = None
    exposure_time: float
    timestamp: datetime
    temperature: Optional[float] = None
    gain: Optional[float] = None
    offset: Optional[float] = None
    binning: Optional[int] = None
    metrics: Optional[FrameMetrics] = None

class Session(BaseModel):
    session_id: str
    equipment: Equipment
    frames: List[Frame] = []
    # guiding, focus, events will be added here
