# One-off converter: same pixels, WebP/AVIF beside originals.
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
REPORT = ROOT / "scripts" / "optimize-images-report.json"

PHOTO_WEBP_Q = 85
PHOTO_AVIF_Q = 62
SHARP_WEBP_Q = 90
SHARP_AVIF_Q = 72
MIN_SAVE_RATIO = 0.95  # keep new file only if smaller than 95% of original


def is_sharp(path: Path) -> bool:
    name = path.name.lower()
    return "title" in name or "glyph-crops" in str(path).replace("\\", "/")


def prepare(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "RGB"):
        return im
    if im.mode == "P":
        return im.convert("RGBA" if "transparency" in im.info else "RGB")
    if im.mode == "LA":
        return im.convert("RGBA")
    if im.mode == "L":
        return im.convert("RGB")
    if im.mode == "CMYK":
        return im.convert("RGB")
    return im.convert("RGB")


def save_if_smaller(im: Image.Image, dest: Path, fmt: str, **kwargs) -> int | None:
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    save_kwargs = dict(kwargs)
    save_kwargs["format"] = fmt
    im.save(tmp, **save_kwargs)
    new_size = tmp.stat().st_size
    orig_size = dest.with_suffix(dest.suffix).stat().st_size if False else None
    return new_size, tmp


def convert_one(src: Path, orig_bytes: int) -> dict:
    sharp = is_sharp(src)
    webp_q = SHARP_WEBP_Q if sharp else PHOTO_WEBP_Q
    avif_q = SHARP_AVIF_Q if sharp else PHOTO_AVIF_Q
    result = {
        "file": str(src.relative_to(ROOT)).replace("\\", "/"),
        "orig_bytes": orig_bytes,
        "size": None,
        "webp_bytes": None,
        "avif_bytes": None,
    }
    with Image.open(src) as im:
        im.load()
        result["size"] = [im.width, im.height]
        prepared = prepare(im)
        has_alpha = prepared.mode == "RGBA"

        webp_path = src.with_suffix(".webp")
        webp_tmp = src.with_suffix(".webp.tmp")
        prepared.save(
            webp_tmp,
            format="WEBP",
            quality=webp_q,
            method=6,
            lossless=False,
        )
        webp_bytes = webp_tmp.stat().st_size
        if webp_bytes < orig_bytes * MIN_SAVE_RATIO:
            webp_tmp.replace(webp_path)
            result["webp_bytes"] = webp_bytes
        else:
            webp_tmp.unlink(missing_ok=True)

        avif_path = src.with_suffix(".avif")
        avif_tmp = src.with_suffix(".avif.tmp")
        prepared.save(
            avif_tmp,
            format="AVIF",
            quality=avif_q,
            speed=6,
        )
        avif_bytes = avif_tmp.stat().st_size
        if avif_bytes < orig_bytes * MIN_SAVE_RATIO:
            avif_tmp.replace(avif_path)
            result["avif_bytes"] = avif_bytes
        else:
            avif_tmp.unlink(missing_ok=True)

        if has_alpha:
            result["alpha"] = True
    return result


def main() -> None:
    files = sorted(
        p
        for p in ASSETS.rglob("*")
        if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
        and "_test" not in p.name
    )
    rows = []
    orig_total = 0
    webp_total = 0
    avif_total = 0
    for src in files:
        orig = src.stat().st_size
        orig_total += orig
        print(f"convert {src.relative_to(ROOT)} ({orig/1024:.0f} KB)", flush=True)
        row = convert_one(src, orig)
        rows.append(row)
        if row["webp_bytes"]:
            webp_total += row["webp_bytes"]
        else:
            webp_total += orig
        if row["avif_bytes"]:
            avif_total += row["avif_bytes"]
        else:
            avif_total += orig
        print(
            f"  webp={row['webp_bytes'] or '-'} avif={row['avif_bytes'] or '-'}",
            flush=True,
        )

    report = {
        "count": len(rows),
        "orig_bytes": orig_total,
        "webp_payload_bytes": webp_total,
        "avif_payload_bytes": avif_total,
        "files": rows,
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("ORIG", orig_total)
    print("WEBP", webp_total)
    print("AVIF", avif_total)


if __name__ == "__main__":
    main()
