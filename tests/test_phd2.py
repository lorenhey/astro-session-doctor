import pytest
import os
from astro_session_doctor.engine.parsers.phd2_parser import Phd2Parser

def test_phd2_parser_basic(tmp_path):
    log_content = """PHD2 version 2.6.11
Guiding Begins at 2026-09-14 21:00:00
Equipment Profile = Default
Pixel scale = 1.48 arc-sec/px, Binning = 1, Focal length = 530 mm
Frame,Time,mount,dx,dy,RARawDistance,DECRawDistance,RAGuideDistance,DECGuideDistance,RADuration,RADirection,DECDuration,DECDirection,XStep,YStep,StarMass,SNR,ErrorCode
1,0.0,Mount,0.0,0.0,0.500,0.200,0,0,0,,0,,0,0,1000,50,0
2,3.0,Mount,0.0,0.0,-0.100,0.300,0,0,0,,0,,0,0,1000,50,0
"""
    log_file = os.path.join(tmp_path, "PHD2_GuideLog.txt")
    with open(log_file, "w") as f:
        f.write(log_content)
        
    sessions = Phd2Parser.parse(log_file)
    assert len(sessions) == 1
    session = sessions[0]
    
    assert session['metadata']['profile'] == "Default"
    assert session['metadata']['pixel_scale'] == 1.48
    
    df = session['data']
    assert len(df) == 2
    assert float(df.iloc[0]['RARawDistance']) == 0.5
    
    rms = Phd2Parser.calculate_rms(df, pixel_scale=session['metadata']['pixel_scale'])
    assert 'ra_rms_px' in rms
    assert 'ra_rms_arcsec' in rms
