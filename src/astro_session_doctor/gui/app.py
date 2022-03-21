import os
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from ..engine.session_builder import SessionBuilder
from ..engine.analyzer import Analyzer

st.set_page_config(page_title="Astro Session Doctor", layout="wide")

def load_session(session_dir: str):
    if not os.path.exists(session_dir):
        st.error(f"Directory not found: {session_dir}")
        return None
        
    with st.spinner("Building session timeline and analyzing frames..."):
        builder = SessionBuilder(session_dir)
        session = builder.build()
        analyzer = Analyzer(session)
        findings = analyzer.analyze()
        return session, findings

st.title("🔭 Astro Session Doctor")
st.markdown("Autopsy and diagnose astronomical acquisition sessions.")

session_dir = st.text_input("Session Directory", "demo_session")

if st.button("Analyze Session"):
    result = load_session(session_dir)
    if result:
        session, findings = result
        st.success(f"Successfully loaded {len(session.frames)} frames.")
        
        # Prepare timeline dataframe
        data = []
        for f in session.frames:
            if f.frame_type == "light" and f.metrics:
                data.append({
                    "time": f.timestamp,
                    "fwhm_px": f.metrics.fwhm_px,
                    "eccentricity": f.metrics.eccentricity,
                    "background": f.metrics.background_median,
                    "temperature": f.temperature,
                    "filename": os.path.basename(f.path)
                })
        
        if data:
            df = pd.DataFrame(data)
            df = df.sort_values(by="time")
            
            st.header("Session Timeline")
            
            # FWHM Plot
            fig_fwhm = px.scatter(df, x="time", y="fwhm_px", title="FWHM Over Time", hover_data=["filename"], trendline="lowess")
            st.plotly_chart(fig_fwhm, use_container_width=True)
            
            # Eccentricity and Background
            col1, col2 = st.columns(2)
            with col1:
                fig_ecc = px.scatter(df, x="time", y="eccentricity", title="Eccentricity", hover_data=["filename"])
                st.plotly_chart(fig_ecc, use_container_width=True)
            with col2:
                fig_bg = px.scatter(df, x="time", y="background", title="Background", hover_data=["filename"])
                st.plotly_chart(fig_bg, use_container_width=True)
                
            # Findings
            st.header("Diagnosis & Findings")
            if findings:
                for f in findings:
                    color = "red" if f.severity == "CRITICAL" else "orange" if f.severity == "MAJOR" else "yellow"
                    st.markdown(f"### :{color}[{f.title}] ({f.severity})")
                    st.markdown(f"**Time range:** {f.time_range} | **Affected frames:** {f.affected_frames}")
                    
                    st.markdown("**Evidence:**")
                    for e in f.evidence:
                        st.markdown(f"- {e}")
                        
                    st.markdown("**Possible Causes:**")
                    for c in f.possible_causes:
                        st.markdown(f"- {c}")
                    st.divider()
            else:
                st.info("No major issues detected in this session based on current rules.")
        else:
            st.warning("No light frames with calculated metrics found.")
