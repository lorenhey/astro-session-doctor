import os
import glob
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
from rich.progress import Progress

from ..models.session import Session, Equipment, Frame
from .fits_reader import FitsReader
from .image_metrics import ImageMetricsCalculator
from .parsers.phd2_parser import Phd2Parser

class SessionBuilder:
    """Discovers files and builds the complete session model."""
    
    def __init__(self, session_dir: str):
        self.session_dir = session_dir
        
    def discover_files(self) -> Dict[str, List[str]]:
        files = {
            'fits': [],
            'phd2': [],
            'csv': []
        }
        
        for root, _, filenames in os.walk(self.session_dir):
            for filename in filenames:
                ext = filename.lower().split('.')[-1]
                path = os.path.join(root, filename)
                
                if ext in ['fit', 'fits', 'fts']:
                    files['fits'].append(path)
                elif "phd2_guide" in filename.lower() and ext == "txt":
                    files['phd2'].append(path)
                elif ext == 'csv':
                    files['csv'].append(path)
                    
        return files

    def build(self) -> Session:
        """Builds a full session."""
        files = self.discover_files()
        
        frames: List[Frame] = []
        
        # Determine basic equipment metadata from first light frame
        equipment = Equipment()
        pixel_scale = None
        
        if not files['fits']:
            return Session(session_id=os.path.basename(self.session_dir), equipment=equipment, frames=[])
            
        with Progress() as progress:
            task = progress.add_task("[cyan]Processing FITS frames...", total=len(files['fits']))
            
            for f in files['fits']:
                try:
                    frame = FitsReader.read_metadata(f)
                    
                    if not equipment.camera and frame.frame_type == "light":
                        # Attempt to populate equipment from header if missing
                        pass # To be implemented via more header extraction
                        
                    if frame.frame_type == "light":
                        # Guess pixel scale if focal length and pixel size exist
                        # This would be expanded
                        metrics = ImageMetricsCalculator.calculate_metrics(f, pixel_scale)
                        frame.metrics = metrics
                        
                    frames.append(frame)
                except Exception as e:
                    pass # Log warning
                finally:
                    progress.update(task, advance=1)
                    
        # Parse PHD2
        guiding_sessions = []
        for p in files['phd2']:
            try:
                g_sessions = Phd2Parser.parse(p)
                guiding_sessions.extend(g_sessions)
            except Exception:
                pass
                
        # Build unified timeline logic would go here
        
        return Session(
            session_id=os.path.basename(self.session_dir),
            equipment=equipment,
            frames=frames
        )
