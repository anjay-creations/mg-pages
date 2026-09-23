"""Stage only public assets for Pages; never publish the entire working directory."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build(destination=None):
    destination = Path(destination or ROOT / "dist")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    for name in ("index.html", "CNAME", "extension.zip"):
        shutil.copy2(ROOT / name, destination / name)
    shutil.copytree(ROOT / "src", destination / "src")
    if not (ROOT / "data/jobs.json").is_file():
        raise RuntimeError("Run the pipeline to generate data/jobs.json before building")
    (destination / "data").mkdir()
    shutil.copy2(ROOT / "data/jobs.json", destination / "data/jobs.json")
    (destination / ".nojekyll").touch()
    return destination


if __name__ == "__main__":
    print(build())
