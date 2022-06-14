import typer
from rich.console import Console

from ..engine.session_builder import SessionBuilder

app = typer.Typer(help="Astro Session Doctor - Diagnose astronomical acquisition sessions")
console = Console()

@app.command()
def analyze(session_dir: str):
    """Analyze an acquisition session directory."""
    console.print(f"Analyzing session at [bold cyan]{session_dir}[/bold cyan]...")
    builder = SessionBuilder(session_dir)
    session = builder.build()
    
    light_count = sum(1 for f in session.frames if f.frame_type == "light")
    console.print(f"Found [green]{len(session.frames)}[/green] frames ([green]{light_count}[/green] lights).")
    
    # Simple summary of findings
    console.print("\n[bold]Session Summary:[/bold]")
    if light_count > 0:
        fwhms = [f.metrics.fwhm_px for f in session.frames if f.frame_type == "light" and f.metrics and f.metrics.fwhm_px]
        if fwhms:
            median_fwhm = sum(fwhms) / len(fwhms)
            console.print(f"Median FWHM: [yellow]{median_fwhm:.2f} px[/yellow]")
            
    from ..engine.analyzer import Analyzer
    analyzer = Analyzer(session)
    findings = analyzer.analyze()
    
    if findings:
        console.print("\n[bold red]Findings:[/bold red]")
        for f in findings:
            console.print(f"\n[bold]{f.title}[/bold] - [yellow]{f.severity}[/yellow] ({f.time_range})")
            console.print(f"Affected frames: {f.affected_frames}")
            console.print("Evidence:")
            for e in f.evidence:
                console.print(f"  - {e}")
            console.print("Possible Causes:")
            for c in f.possible_causes:
                console.print(f"  - {c}")
    else:
        console.print("\n[bold green]No major issues found.[/bold green]")

import os
import subprocess

@app.command()
def gui(session_dir: str = None):
    """Launch the interactive timeline GUI."""
    console.print("Launching GUI...")
    gui_script = os.path.join(os.path.dirname(__file__), "..", "gui", "app.py")
    cmd = ["streamlit", "run", gui_script]
    if session_dir:
        # Pass it as a command line arg to streamlit if we wanted to
        pass
    subprocess.run(cmd)

from ..demo.synthetic import SyntheticSessionGenerator

@app.command()
def demo():
    """Run the flagship demo session analysis."""
    console.print("Running flagship demo...")
    demo_dir = "demo_session"
    gen = SyntheticSessionGenerator(demo_dir)
    gen.generate()
    
    # Analyze the generated session
    console.print("\n[bold]Analyzing Demo Session...[/bold]")
    builder = SessionBuilder(demo_dir)
    session = builder.build()
    
    light_count = sum(1 for f in session.frames if f.frame_type == "light")
    console.print(f"\n[green]Analysis Complete![/green] Found {len(session.frames)} frames.")
    
    from ..engine.analyzer import Analyzer
    analyzer = Analyzer(session)
    findings = analyzer.analyze()
    
    if findings:
        console.print("\n[bold red]Findings:[/bold red]")
        for f in findings:
            console.print(f"\n[bold]{f.title}[/bold] - [yellow]{f.severity}[/yellow] ({f.time_range})")
            console.print(f"Affected frames: {f.affected_frames}")
            console.print("Evidence:")
            for e in f.evidence:
                console.print(f"  - {e}")
            console.print("Possible Causes:")
            for c in f.possible_causes:
                console.print(f"  - {c}")
    else:
        console.print("\n[bold green]No major issues found.[/bold green]")

if __name__ == "__main__":
    app()
