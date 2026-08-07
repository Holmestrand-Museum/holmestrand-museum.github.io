"""
Bildeopprydding for Holmestrand Museum.

Hva scriptet gjør:
1. Finner WP-genererte størrelsesvarianter (-WxH.ext / -scaled.ext) i images/.
   For varianter som er referert i content/posts/nb og content/pages/nb,
   byttes referansen til originalbildet. Alle variantfiler slettes deretter.
2. Omdøper alle gjenværende bilder i images/ til bilde-001.jpg, bilde-002.png, osv.
   og oppdaterer referansene i content/posts/nb og content/pages/nb.
3. Optimaliserer bildene (maks 1600px på lengste side, komprimert).
4. Synker images/ -> public/images/.
5. Lager _raw/bilderegister.html med miniatyrbilder + nye filnavn.

Kjør med --dry-run for å se hva som ville skje uten å gjøre endringer.
"""

import argparse
import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"
PUBLIC_IMAGES = ROOT / "public" / "images"
CONTENT_DIRS = [ROOT / "content" / "posts" / "nb", ROOT / "content" / "pages" / "nb"]
RAW_DIR = ROOT / "_raw"

VARIANT_RE = re.compile(r"^(?P<base>.+?)(-\d+x\d+|-scaled)(?P<ext>\.[A-Za-z]+)$")
MAX_DIM = 1600


def md_files():
    for d in CONTENT_DIRS:
        if d.exists():
            yield from d.glob("*.md")


def replace_in_markdown(old_name: str, new_name: str, dry_run: bool):
    for f in md_files():
        text = f.read_text(encoding="utf-8")
        new_text = text.replace(f"/images/{old_name}", f"/images/{new_name}")
        if new_text != text:
            print(f"  oppdaterer referanse i {f.relative_to(ROOT)}: {old_name} -> {new_name}")
            if not dry_run:
                f.write_text(new_text, encoding="utf-8")


def step_consolidate_variants(dry_run: bool):
    print("\n== Steg 1: konsoliderer størrelsesvarianter ==")
    files = sorted(p.name for p in IMAGES.iterdir() if p.is_file())
    existing = set(files)

    for name in files:
        m = VARIANT_RE.match(name)
        if not m:
            continue
        base_name = m.group("base") + m.group("ext")
        if base_name not in existing:
            # Originalen finnes ikke - behold varianten som den er, ikke slett.
            print(f"  hopper over {name}: original {base_name} finnes ikke")
            continue

        replace_in_markdown(name, base_name, dry_run)

        path = IMAGES / name
        print(f"  sletter variant {name}")
        if not dry_run:
            path.unlink()


BILDE_RE = re.compile(r"^bilde-(\d+)\.[A-Za-z]+$")


def step_rename(dry_run: bool):
    print("\n== Steg 2: omdøper til bilde-NNN ==")
    files = sorted(p for p in IMAGES.iterdir() if p.is_file())

    existing_numbers = [int(m.group(1)) for p in files if (m := BILDE_RE.match(p.name))]
    next_number = max(existing_numbers, default=0) + 1
    width = max(len(str(len(files))), 3)

    mapping = []
    for path in files:
        if BILDE_RE.match(path.name):
            continue  # allerede omdøpt - la nummeret stå
        ext = path.suffix.lower()
        new_name = f"bilde-{next_number:0{width}d}{ext}"
        next_number += 1
        mapping.append((path.name, new_name, path))

    # Bruk temporære navn først for å unngå kollisjoner.
    for old_name, new_name, path in mapping:
        if old_name == new_name:
            continue
        tmp_path = path.with_name(path.name + ".tmp")
        print(f"  {old_name} -> {new_name}")
        if not dry_run:
            path.rename(tmp_path)

    for old_name, new_name, path in mapping:
        if old_name == new_name:
            continue
        tmp_path = path.with_name(path.name + ".tmp")
        final_path = IMAGES / new_name
        if not dry_run:
            tmp_path.rename(final_path)
        replace_in_markdown(old_name, new_name, dry_run)

    return [new_name for _, new_name, _ in mapping]


def step_optimize(dry_run: bool):
    print("\n== Steg 3: optimaliserer bilder ==")
    for path in sorted(IMAGES.iterdir()):
        if not path.is_file():
            continue
        try:
            with Image.open(path) as img:
                changed = False
                if max(img.size) > MAX_DIM:
                    ratio = MAX_DIM / max(img.size)
                    new_size = (round(img.width * ratio), round(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                    changed = True

                if dry_run:
                    if changed:
                        print(f"  ville skalert {path.name} -> {img.size}")
                    continue

                if path.suffix.lower() in (".jpg", ".jpeg"):
                    img.convert("RGB").save(path, "JPEG", quality=82, optimize=True)
                elif path.suffix.lower() == ".png":
                    img.save(path, "PNG", optimize=True)
                else:
                    if changed:
                        img.save(path)
        except Exception as e:
            print(f"  KUNNE IKKE behandle {path.name}: {e}")


def step_sync_public(dry_run: bool):
    print("\n== Steg 4: synker images/ -> public/images/ ==")
    if dry_run:
        print("  (hoppes over i dry-run)")
        return
    if PUBLIC_IMAGES.exists():
        shutil.rmtree(PUBLIC_IMAGES)
    shutil.copytree(IMAGES, PUBLIC_IMAGES)


def step_register(dry_run: bool):
    print("\n== Steg 5: lager bilderegister ==")
    files = sorted(p.name for p in IMAGES.iterdir() if p.is_file())
    if dry_run:
        print(f"  (ville laget register med {len(files)} bilder)")
        return

    RAW_DIR.mkdir(exist_ok=True)
    items = "\n".join(
        f'<figure><img src="../public/images/{name}" loading="lazy">'
        f"<figcaption>{name}</figcaption></figure>"
        for name in files
    )
    html = f"""<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<title>Bilderegister</title>
<style>
body {{ font-family: sans-serif; background: #f7f3ec; margin: 1.5rem; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }}
figure {{ margin: 0; background: #fff; border: 1px solid #ddd3c4; border-radius: 4px; overflow: hidden; }}
img {{ display: block; width: 100%; height: 150px; object-fit: contain; background: #ddd3c4; }}
figcaption {{ padding: 0.4rem; font-size: 0.85rem; text-align: center; }}
</style>
</head>
<body>
<h1>Bilderegister ({len(files)} bilder)</h1>
<div class="grid">
{items}
</div>
</body>
</html>
"""
    out = RAW_DIR / "bilderegister.html"
    out.write_text(html, encoding="utf-8")
    print(f"  skrev {out.relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Vis hva som ville skjedd uten å gjøre endringer")
    args = parser.parse_args()

    step_consolidate_variants(args.dry_run)
    step_rename(args.dry_run)
    step_optimize(args.dry_run)
    step_sync_public(args.dry_run)
    step_register(args.dry_run)

    print("\nFerdig" + (" (dry-run, ingenting endret)" if args.dry_run else "") + ".")


if __name__ == "__main__":
    main()
