from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".m4v"}
COPY_EXTS = {".html", ".css", ".js", ".md", ".json", ".txt", ".nojekyll"}
SKIP_LOCAL_GALLERY_ASSETS = os.environ.get("SKIP_LOCAL_GALLERY_ASSETS") == "1"


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ensure_clean_out() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def convert_image(src: Path) -> Path:
    target = OUT / src.relative_to(ROOT)
    target = target.with_suffix(".webp")
    target.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(src) as image:
        image = image.convert("RGB")
        width, height = image.size
        max_side = 1800
        scale = min(1.0, max_side / max(width, height))
        if scale < 1:
            image = image.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=82, method=6)
    return target


def copy_regular_file(src: Path) -> None:
    target = OUT / src.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)


def build_image_map() -> dict[str, str]:
    image_map: dict[str, str] = {}
    for src in ROOT.rglob("*"):
        if not src.is_file():
            continue
        relative_parts = src.relative_to(ROOT).parts
        top_level = relative_parts[0]
        if top_level in {"scripts", "_site", ".git", ".github"}:
            continue
        if SKIP_LOCAL_GALLERY_ASSETS and relative_parts[:2] == ("assets", "images"):
            continue
        if src.suffix.lower() in IMAGE_EXTS:
            target = convert_image(src)
            image_map["./" + rel(src)] = "./" + target.relative_to(OUT).as_posix()
        elif src.suffix.lower() in VIDEO_EXTS:
            copy_regular_file(src)
        elif src.name == ".nojekyll" or src.suffix.lower() in COPY_EXTS:
            if src.name != "generated-gallery.js":
                copy_regular_file(src)
    return image_map


def update_generated_gallery(image_map: dict[str, str]) -> None:
    generated_path = ROOT / "generated-gallery.js"
    text = generated_path.read_text(encoding="utf-8")

    for old, new in sorted(image_map.items(), key=lambda item: len(item[0]), reverse=True):
        text = text.replace(json.dumps(old, ensure_ascii=False), json.dumps(new, ensure_ascii=False))

    (OUT / "generated-gallery.js").write_text(text, encoding="utf-8")


def main() -> None:
    ensure_clean_out()
    image_map = build_image_map()
    update_generated_gallery(image_map)

    total = sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file())
    print(f"Built: {OUT}")
    print(f"Files: {sum(1 for path in OUT.rglob('*') if path.is_file())}")
    print(f"Size: {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
