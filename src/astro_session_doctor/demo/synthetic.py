import os
import numpy as np
from datetime import datetime, timedelta
from astropy.io import fits
from astropy.modeling.models import Gaussian2D
from rich.console import Console

console = Console()

class SyntheticSessionGenerator:
    """Generates a flagship synthetic session with known properties for demonstration."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.image_size = (1024, 1024)
        self.start_time = datetime(2026, 9, 14, 21, 0, 0)
        self.exposure = 300 # seconds

    def _generate_star_field(self, fwhm: float, eccentricity: float, background: float) -> np.ndarray:
        # Create empty background
        data = np.random.normal(loc=background, scale=15.0, size=self.image_size)
        
        # Generate random stars
        num_stars = 150
        y, x = np.mgrid[:self.image_size[0], :self.image_size[1]]
        
        # Derive sigma from FWHM
        sigma_x = fwhm / 2.355
        # Add eccentricity
        sigma_y = sigma_x / np.sqrt(1 - eccentricity**2) if eccentricity > 0 else sigma_x
        
        for _ in range(num_stars):
            amp = np.random.uniform(500, 45000)
            x_c = np.random.uniform(10, self.image_size[1]-10)
            y_c = np.random.uniform(10, self.image_size[0]-10)
            
            box = 15
            y_min, y_max = max(0, int(y_c - box)), min(self.image_size[0], int(y_c + box + 1))
            x_min, x_max = max(0, int(x_c - box)), min(self.image_size[1], int(x_c + box + 1))
            
            if y_max > y_min and x_max > x_min:
                y_box, x_box = np.mgrid[y_min:y_max, x_min:x_max]
                g = Gaussian2D(amplitude=amp, x_mean=x_c, y_mean=y_c, x_stddev=sigma_x, y_stddev=sigma_y)
                data[y_min:y_max, x_min:x_max] += g(x_box, y_box)
            
        # Add some read noise and clip
        data = np.clip(data, 0, 65535).astype(np.uint16)
        return data

    def generate(self):
        os.makedirs(self.output_dir, exist_ok=True)
        console.print(f"Generating synthetic flagship demo in {self.output_dir}...")
        
        # Scenario: 
        # 1. 10 frames good
        # 2. Focus drift over 10 frames (FWHM increases)
        # 3. Autofocus (simulated event, not a file, but FWHM drops)
        # 4. 10 frames good
        # 5. Guiding failure (Eccentricity increases)
        # 6. Clouds (Background increases, stars fade - we'll just increase background)
        
        total_frames = 40
        current_time = self.start_time
        base_fwhm = 2.5
        base_ecc = 0.1
        base_bg = 400.0
        
        for i in range(total_frames):
            fwhm = base_fwhm
            ecc = base_ecc
            bg = base_bg
            
            # 2. Focus drift
            if 10 <= i < 20:
                fwhm += (i - 10) * 0.15 
            
            # 5. Guiding failure
            if 25 <= i < 30:
                ecc = 0.6
                fwhm += 1.0 # Guiding makes it look bloated too
                
            # 6. Clouds
            if 32 <= i < 38:
                bg += 1500.0
                
            data = self._generate_star_field(fwhm, ecc, bg)
            
            # Create FITS header
            hdr = fits.Header()
            hdr['EXPTIME'] = self.exposure
            hdr['DATE-OBS'] = current_time.strftime("%Y-%m-%dT%H:%M:%S")
            hdr['IMAGETYP'] = 'Light'
            hdr['FILTER'] = 'L'
            hdr['CCD-TEMP'] = -10.0
            if 10 <= i < 20:
                 hdr['CCD-TEMP'] = -10.0 - ((i-10)*0.2) # Temp drop causing drift
            
            hdu = fits.PrimaryHDU(data=data, header=hdr)
            filepath = os.path.join(self.output_dir, f"Light_L_{i:03d}.fits")
            hdu.writeto(filepath, overwrite=True)
            
            current_time += timedelta(seconds=self.exposure + 10) # 10s download overhead
            
        # Generate fake PHD2 log
        self._generate_phd2_log(os.path.join(self.output_dir, "PHD2_GuideLog.txt"), total_frames)
        console.print("[green]Synthetic session generated successfully![/green]")

    def _generate_phd2_log(self, filepath: str, total_frames: int):
        with open(filepath, 'w') as f:
            f.write("PHD2 version 2.6.11\n")
            f.write(f"Guiding Begins at {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("Pixel scale = 1.0 arc-sec/px\n")
            f.write("Frame,Time,mount,dx,dy,RARawDistance,DECRawDistance,RAGuideDistance,DECGuideDistance,RADuration,RADirection,DECDuration,DECDirection,XStep,YStep,StarMass,SNR,ErrorCode\n")
            
            current_time = self.start_time
            # Output a guiding line every 3 seconds
            total_seconds = total_frames * (self.exposure + 10)
            
            for i in range(0, total_seconds, 3):
                # Normal guiding
                ra_err = np.random.normal(0, 0.3)
                dec_err = np.random.normal(0, 0.2)
                
                # Introduce guiding error between frames 25 and 30
                frame_idx = i // (self.exposure + 10)
                if 25 <= frame_idx < 30:
                    ra_err += np.sin(i / 10.0) * 1.5 + np.random.normal(0, 0.8) # Big RA oscillation
                    
                f.write(f"{i},{i*3.0},Mount,0.0,0.0,{ra_err:.3f},{dec_err:.3f},0,0,0,,0,,0,0,1000,50,0\n")
