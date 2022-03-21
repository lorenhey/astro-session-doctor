import os
from typing import Optional, Dict, Any
from datetime import datetime
from astropy.io import fits
from astropy.time import Time
from ..models.session import Frame

class FitsReader:
    """Reads FITS files and extracts normalized metadata."""
    
    # Common FITS keyword aliases used by different acquisition software
    ALIASES = {
        'EXPTIME': ['EXPTIME', 'EXPOSURE'],
        'DATE-OBS': ['DATE-OBS', 'DATE_OBS'],
        'FILTER': ['FILTER'],
        'CCD-TEMP': ['CCD-TEMP', 'SET-TEMP', 'TEMPERAT'],
        'GAIN': ['GAIN', 'EGAIN'],
        'OFFSET': ['OFFSET', 'BLKLEVEL'],
        'XBINNING': ['XBINNING', 'BINX'],
        'YBINNING': ['YBINNING', 'BINY'],
        'FOCALLEN': ['FOCALLEN'],
        'PIXSIZE': ['PIXSIZE', 'XPIXSZ'],
        'RA': ['RA', 'OBJCTRA'],
        'DEC': ['DEC', 'OBJCTDEC'],
        'OBJECT': ['OBJECT', 'TARGNAME'],
        'IMAGETYP': ['IMAGETYP', 'FRAME']
    }

    @staticmethod
    def _get_header_value(header: fits.Header, keys: list) -> Optional[Any]:
        for key in keys:
            if key in header:
                return header[key]
        return None

    @classmethod
    def read_metadata(cls, filepath: str) -> Frame:
        """Reads a FITS file and returns a Frame object with metadata."""
        with fits.open(filepath, ignore_missing_end=True) as hdul:
            header = hdul[0].header
            
            # Extract values using aliases
            exptime = cls._get_header_value(header, cls.ALIASES['EXPTIME']) or 0.0
            date_obs_str = cls._get_header_value(header, cls.ALIASES['DATE-OBS'])
            
            # Parse timestamp
            try:
                if date_obs_str:
                    timestamp = Time(date_obs_str).to_datetime()
                else:
                    # Fallback to file creation time
                    timestamp = datetime.fromtimestamp(os.path.getctime(filepath))
            except ValueError:
                timestamp = datetime.fromtimestamp(os.path.getctime(filepath))

            frame_type_raw = cls._get_header_value(header, cls.ALIASES['IMAGETYP'])
            frame_type = "light"
            if frame_type_raw:
                frame_type_raw = str(frame_type_raw).lower()
                if "dark" in frame_type_raw:
                    frame_type = "dark"
                elif "flat" in frame_type_raw:
                    frame_type = "flat"
                elif "bias" in frame_type_raw:
                    frame_type = "bias"

            filter_name = cls._get_header_value(header, cls.ALIASES['FILTER'])
            temp = cls._get_header_value(header, cls.ALIASES['CCD-TEMP'])
            gain = cls._get_header_value(header, cls.ALIASES['GAIN'])
            offset = cls._get_header_value(header, cls.ALIASES['OFFSET'])
            binning = cls._get_header_value(header, cls.ALIASES['XBINNING'])

            return Frame(
                path=filepath,
                frame_type=frame_type,
                filter_name=str(filter_name) if filter_name else None,
                exposure_time=float(exptime),
                timestamp=timestamp,
                temperature=float(temp) if temp is not None else None,
                gain=float(gain) if gain is not None else None,
                offset=float(offset) if offset is not None else None,
                binning=int(binning) if binning is not None else None,
            )
