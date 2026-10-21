import numpy as np
from typing import Optional
from astropy.io import fits
from astropy.stats import sigma_clipped_stats
from photutils.background import Background2D, MedianBackground
from photutils.detection import DAOStarFinder
from photutils.profiles import RadialProfile
from astropy.modeling import models, fitting
import warnings
from astropy.utils.exceptions import AstropyUserWarning

from ..models.session import FrameMetrics

class ImageMetricsCalculator:
    """Calculates image quality metrics (FWHM, eccentricity, background) from FITS data."""

    @staticmethod
    def calculate_metrics(filepath: str, pixel_scale: Optional[float] = None) -> FrameMetrics:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', AstropyUserWarning)
            with fits.open(filepath, ignore_missing_end=True) as hdul:
                # Find the first HDU with 2D data
                data = None
                for hdu in hdul:
                    if hdu.is_image and hdu.data is not None and len(hdu.data.shape) == 2:
                        data = hdu.data.astype(float)
                        break
                
                if data is None:
                    raise ValueError("No 2D image data found in FITS file.")

                # Calculate background
                mean, median_bg, std_bg = sigma_clipped_stats(data, sigma=3.0)
                
                # Try to use Background2D for more robust sigma if image is large enough
                try:
                    bkg = Background2D(data, (64, 64), filter_size=(3, 3), bkg_estimator=MedianBackground())
                    median_bg = np.median(bkg.background)
                    std_bg = np.median(bkg.background_rms)
                except Exception:
                    pass # fallback to sigma_clipped_stats

                # Detect stars
                threshold = median_bg + (3.0 * std_bg)
                # We use a conservative FWHM guess for detection
                daofind = DAOStarFinder(fwhm=3.0, threshold=threshold, exclude_border=True)
                sources = daofind(data - median_bg)
                
                stars_detected = 0
                fwhm_list = []
                eccentricity_list = []

                if sources is not None and len(sources) > 0:
                    stars_detected = len(sources)
                    # Limit to top N brightest stars to save time and avoid noise
                    sources.sort('flux', reverse=True)
                    sources = sources[:min(200, len(sources))]

                    # Fit 2D Gaussian to each star to get accurate FWHM and eccentricity
                    fitter = fitting.LevMarLSQFitter()
                    box_size = 11
                    x_col = 'x_centroid' if 'x_centroid' in sources.colnames else 'xcentroid'
                    y_col = 'y_centroid' if 'y_centroid' in sources.colnames else 'ycentroid'
                    
                    for row in sources:
                        x_cen = int(row[x_col])
                        y_cen = int(row[y_col])
                        
                        y_min = max(0, y_cen - box_size)
                        y_max = min(data.shape[0], y_cen + box_size + 1)
                        x_min = max(0, x_cen - box_size)
                        x_max = min(data.shape[1], x_cen + box_size + 1)
                        
                        cutout = data[y_min:y_max, x_min:x_max] - median_bg
                        
                        if cutout.shape[0] < 5 or cutout.shape[1] < 5:
                            continue

                        # Initial guess
                        y, x = np.mgrid[:cutout.shape[0], :cutout.shape[1]]
                        g_init = models.Gaussian2D(
                            amplitude=np.max(cutout), 
                            x_mean=cutout.shape[1]/2, 
                            y_mean=cutout.shape[0]/2, 
                            x_stddev=1.5, 
                            y_stddev=1.5
                        )
                        
                        with warnings.catch_warnings():
                            warnings.simplefilter('ignore')
                            g_fit = fitter(g_init, x, y, cutout)
                        
                        if fitter.fit_info['ierr'] not in [1, 2, 3, 4]:
                            continue # Fit failed
                            
                        # Calculate metrics
                        x_std, y_std = g_fit.x_stddev.value, g_fit.y_stddev.value
                        if x_std <= 0 or y_std <= 0 or x_std > 10 or y_std > 10:
                            continue
                            
                        fwhm_x = 2.355 * x_std
                        fwhm_y = 2.355 * y_std
                        avg_fwhm = (fwhm_x + fwhm_y) / 2.0
                        
                        major = max(x_std, y_std)
                        minor = min(x_std, y_std)
                        eccentricity = np.sqrt(1 - (minor**2 / major**2))
                        
                        fwhm_list.append(avg_fwhm)
                        eccentricity_list.append(eccentricity)

                median_fwhm_px = float(np.median(fwhm_list)) if fwhm_list else None
                median_eccentricity = float(np.median(eccentricity_list)) if eccentricity_list else None

                fwhm_arcsec = None
                if median_fwhm_px is not None and pixel_scale is not None:
                    fwhm_arcsec = median_fwhm_px * pixel_scale

                # Saturation
                # Very simple saturation proxy based on max value in image (e.g. 16-bit)
                sat_threshold = 65000
                sat_pixels = np.sum(data > sat_threshold)
                sat_fraction = float(sat_pixels / data.size)

                return FrameMetrics(
                    fwhm_px=median_fwhm_px,
                    fwhm_arcsec=fwhm_arcsec,
                    eccentricity=median_eccentricity,
                    stars_detected=stars_detected,
                    background_median=float(median_bg),
                    background_sigma=float(std_bg),
                    saturation_fraction=sat_fraction
                )
