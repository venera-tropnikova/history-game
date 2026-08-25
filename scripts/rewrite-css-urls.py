from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_FILES = [
    ROOT / "css" / "egypt.css",
    ROOT / "css" / "dino.css",
    ROOT / "css" / "styles.css",
]

URL_RE = re.compile(
    r"url\(\s*(['\"]?)(\.\./assets/[^)'\"]+\.(?:png|jpe?g))\1\s*\)",
    re.I,
)


def to_fs(css_url: str) -> Path:
    rel = css_url.replace("../", "")
    return ROOT / rel.replace("/", "\\") if False else ROOT / Path(*rel.split("/"))


def replacer(match: re.Match[str]) -> str:
    quote = match.group(1) or '"'
    path = match.group(2)
    root, ext = path.rsplit(".", 1)
    mime = "image/jpeg" if ext.lower() in {"jpg", "jpeg"} else "image/png"
    parts = []
    if to_fs(root + ".avif").is_file():
        parts.append(f"url({quote}{root}.avif{quote}) type(\"image/avif\")")
    if to_fs(root + ".webp").is_file():
        parts.append(f"url({quote}{root}.webp{quote}) type(\"image/webp\")")
    parts.append(f"url({quote}{path}{quote}) type(\"{mime}\")")
    if len(parts) == 1:
        return match.group(0)
    return "image-set(" + ", ".join(parts) + ")"


def main() -> None:
    for css in CSS_FILES:
        text = css.read_text(encoding="utf-8")
        if "image-set(" in text:
            print("skip already rewritten", css.name)
            continue
        new = URL_RE.sub(replacer, text)
        css.write_text(new, encoding="utf-8", newline="\n")
        print(css.name, "replacements", len(URL_RE.findall(text)))


if __name__ == "__main__":
    main()
