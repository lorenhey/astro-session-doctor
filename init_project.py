
import os
import textwrap

files = {
    "src/astro_session_doctor/cli/main.py": """
        import typer
        from rich.console import Console

        app = typer.Typer(help="Astro Session Doctor - Diagnose astronomical acquisition sessions")
        console = Console()

        @app.command()
        def analyze(session_dir: str):
            \"\"\"Analyze an acquisition session directory.\"\"\"
            console.print(f"Analyzing session at [bold cyan]{session_dir}[/bold cyan]...")

        @app.command()
        def demo():
            \"\"\"Run the flagship demo session analysis.\"\"\"
            console.print("Running flagship demo...")

        if __name__ == "__main__":
            app()
    """,
    "src/astro_session_doctor/models/session.py": """
        from pydantic import BaseModel
        from typing import List, Optional
        from datetime import datetime

        class Equipment(BaseModel):
            camera: Optional[str] = None
            telescope: Optional[str] = None
            focal_length_mm: Optional[float] = None
            pixel_size_um: Optional[float] = None
            
        class Frame(BaseModel):
            path: str
            frame_type: str # light, dark, flat, bias
            filter_name: Optional[str] = None
            exposure_time: float
            timestamp: datetime
            
        class Session(BaseModel):
            session_id: str
            equipment: Equipment
            frames: List[Frame] = []
    """,
    "README.md": """
        # astro-session-doctor
        `astro-session-doctor` correlaciona imágenes, guiding, foco y condiciones de adquisición para explicar qué limitó una sesión astronómica.
    """,
    ".gitignore": """
        __pycache__/
        *.pyc
        .venv/
        venv/
        env/
        *.fits
        *.fit
        *.xisf
    """
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).strip() + "\\n")
print("Initialization complete.")

