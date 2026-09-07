#!/usr/bin/env python3
"""Download pinned CLDF release tarballs into vendor/."""

from __future__ import annotations

import json
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
DATASETS = json.loads((ROOT / "data" / "datasets.json").read_text())


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"skip existing {dest.name}")
        return
    print(f"downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "typology-atlas/0.1"})
    with urllib.request.urlopen(req) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)


def extract(archive: Path, target: Path) -> Path:
    if target.exists() and any(target.rglob("languages.csv")):
        print(f"skip extract {target.name}")
        return target
    print(f"extracting {archive.name}")
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as tar:
        tar.extractall(target, filter="data")
    return target


def cldf_dir(extracted: Path) -> Path:
    matches = list(extracted.rglob("StructureDataset-metadata.json")) + list(
        extracted.rglob("cldf-metadata.json")
    )
    if not matches:
        raise SystemExit(f"no CLDF metadata under {extracted}")
    return matches[0].parent


def main() -> None:
    VENDOR.mkdir(exist_ok=True)
    mapping = {}
    for key, spec in DATASETS.items():
        archive = VENDOR / f"{key}-{spec['tag']}.tar.gz"
        extracted = VENDOR / f"{key}-{spec['tag']}"
        download(spec["url"], archive)
        extract(archive, extracted)
        mapping[key] = str(cldf_dir(extracted).relative_to(ROOT))
    (VENDOR / "cldf-paths.json").write_text(json.dumps(mapping, indent=2) + "\n")
    print(json.dumps(mapping, indent=2))


if __name__ == "__main__":
    main()
