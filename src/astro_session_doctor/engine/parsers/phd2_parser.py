import re
from datetime import datetime
import pandas as pd
from typing import List, Dict, Any, Optional

class Phd2Parser:
    """Parses PHD2 guide log files."""

    @staticmethod
    def parse(filepath: str) -> List[Dict[str, Any]]:
        """Parses a PHD2 guide log and returns a list of guiding sequences (sessions)."""
        sessions = []
        current_session = None
        data_rows = []
        columns = []

        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                if line.startswith("Guiding Begins at"):
                    if current_session and data_rows:
                        current_session['data'] = pd.DataFrame(data_rows, columns=columns)
                        sessions.append(current_session)
                        
                    current_session = {'start_time_str': line.split("at")[1].strip(), 'metadata': {}}
                    data_rows = []
                    
                    # Try to parse start time
                    try:
                        current_session['start_time'] = datetime.strptime(current_session['start_time_str'], "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        current_session['start_time'] = None

                elif line.startswith("Equipment Profile ="):
                    if current_session:
                        current_session['metadata']['profile'] = line.split("=")[1].strip()
                elif line.startswith("Pixel scale ="):
                    if current_session:
                        try:
                            # Format: Pixel scale = 1.48 arc-sec/px, Binning = 1, Focal length = 530 mm
                            match = re.search(r"Pixel scale = ([\d.]+) arc-sec/px", line)
                            if match:
                                current_session['metadata']['pixel_scale'] = float(match.group(1))
                        except Exception:
                            pass
                elif "dx" in line and "dy" in line and "RARawDistance" in line:
                    # Header row
                    columns = line.split(",")
                    columns = [c.strip() for c in columns]
                elif current_session and columns and line and not line.startswith("#") and not line.startswith("INFO"):
                    # Data row
                    parts = line.split(",")
                    if len(parts) == len(columns):
                        try:
                            # Convert to floats where possible
                            row = [float(p) if p.replace('.','',1).replace('-','',1).isdigit() else p for p in parts]
                            data_rows.append(row)
                        except Exception:
                            pass

        if current_session and data_rows:
            current_session['data'] = pd.DataFrame(data_rows, columns=columns)
            sessions.append(current_session)

        return sessions

    @staticmethod
    def calculate_rms(df: pd.DataFrame, pixel_scale: Optional[float] = None) -> Dict[str, float]:
        """Calculates RMS error from a PHD2 data frame."""
        if 'RARawDistance' not in df.columns or 'DECRawDistance' not in df.columns:
            return {}

        ra_err = df['RARawDistance'].astype(float)
        dec_err = df['DECRawDistance'].astype(float)
        
        # Simple RMS calculation
        ra_rms_px = (ra_err ** 2).mean() ** 0.5
        dec_rms_px = (dec_err ** 2).mean() ** 0.5
        total_rms_px = (ra_rms_px**2 + dec_rms_px**2) ** 0.5

        result = {
            'ra_rms_px': ra_rms_px,
            'dec_rms_px': dec_rms_px,
            'total_rms_px': total_rms_px
        }

        if pixel_scale:
            result['ra_rms_arcsec'] = ra_rms_px * pixel_scale
            result['dec_rms_arcsec'] = dec_rms_px * pixel_scale
            result['total_rms_arcsec'] = total_rms_px * pixel_scale

        return result
