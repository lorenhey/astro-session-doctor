import pytest
import numpy as np
from astropy.modeling.models import Gaussian2D
from astro_session_doctor.engine.image_metrics import ImageMetricsCalculator

def generate_test_star(fwhm_x, fwhm_y, background=100, amp=5000):
    size = 64
    y, x = np.mgrid[:size, :size]
    sigma_x = fwhm_x / 2.355
    sigma_y = fwhm_y / 2.355
    
    g = Gaussian2D(amplitude=amp, x_mean=size/2, y_mean=size/2, x_stddev=sigma_x, y_stddev=sigma_y)
    data = g(x, y) + background
    return data

def test_metrics_calculator_with_synthetic_data(tmp_path):
    from astropy.io import fits
    import os
    
    # Create a synthetic fits file
    data = generate_test_star(fwhm_x=3.0, fwhm_y=3.0, background=200.0)
    # Add some noise
    data += np.random.normal(0, 10, data.shape)
    
    filepath = os.path.join(tmp_path, "test.fits")
    fits.writeto(filepath, data, overwrite=True)
    
    metrics = ImageMetricsCalculator.calculate_metrics(filepath)
    
    # Basic assertions
    assert metrics is not None
    assert metrics.stars_detected == 1
    assert 2.5 < metrics.fwhm_px < 3.5
    assert metrics.eccentricity < 0.2
    assert 190.0 < metrics.background_median < 210.0
