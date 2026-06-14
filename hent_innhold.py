# -*- coding: utf-8 -*-
"""
hent_innhold.py
---------------
Henter alt innhold fra holmestrandmuseum.no via WordPress REST API,
rydder bort Envira-gallerier og WP-spesifikk HTML, og lagrer som
Markdown-filer + optimaliserte bilder klare for en Astro/GitHub Pages-side.

KJØRER KUN LESING mot den eksisterende siden — ingenting endres der.

Bruk (Windows PowerShell):
    cd C:\codex\hmfnettside
    python hent_innhold.py

Krever: requests, beautifulsoup4, markdownify, pillow
    pip install requests beautifulsoup4 markdownify pillow
"""

import os
import re
import io
import json
import time
import logging
from datetime import datetime
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from PIL import Image

# ---------------------------------------------------------------------------
# KONFIGURASJON — juster her ved behov
# ---------------------------------------------------------------------------
BASE_URL = "https://holmestrandmuseum.no"
API = f"{BASE_URL}/wp-json/wp/v2"

# Rotmappe = der scriptet kjøres fra (C:\codex\hmfnettside på din maskin)
ROOT = os.getcwd()
RAW_DIR = os.path.join(ROOT, "_raw")
CONTENT_DIR = os.path.join(ROOT, "content")
IMAGES_DIR = os.path.join(ROOT, "images")
LOG_FILE = os.path.join(ROOT, "extract.log")

# Hvilke innholdstyper skal hentes
POST_TYPES = ["posts", "pages"]

# Bildeoptimalisering
MAX_BREDDE = 1600          # px — bilder skaleres ned til denne maksbredden
JPEG_KVALITET = 82         # 1-95, høyere = bedre kvalitet/større fil
PER_PAGE = 100             # API henter opptil 100 av gangen

# Høflig pause mellom nedlastinger (sekunder) — skåner serveren
PAUSE = 0.3

# ---------------------------------------------------------------------------
# Oppsett
# ---------------------------------------------------------------------------
for d in (RAW_DIR, CONTENT_DIR, IMAGES_DIR):
    os.makedirs(d, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({"User-Agent": "HMF-innholdsuttrekk/1.0 (lesing)"})

# Holder styr på bilder vi allerede har lastet ned (unngå duplikater)
nedlastede_bilder = {}   # original-URL -> lokalt filnavn
total_bytes = 0


# ---------------------------------------------------------------------------
# Hjelpefunksjoner
# ---------------------------------------------------------------------------
def hent_alle(post_type):
    """Henter alle elementer av en type med paginering."""
    resultater = []
    side = 1
    while True:
        url = f"{API}/{post_type}"
        params = {"per_page": PER_PAGE, "page": side, "_embed": "1"}
        r = session.get(url, params=params, timeout=30)

        # WP returnerer 400 når man ber om en side utover siste
        if r.status_code == 400:
            break
        r.raise_for_status()

        batch = r.json()
        if not batch:
            break

        resultater.extend(batch)
        log.info(f"  {post_type}: hentet side {side} ({len(batch)} stk)")

        # Sjekk totalt antall sider fra header
        total_sider = int(r.headers.get("X-WP-TotalPages", side))
        if side >= total_sider:
            break
        side += 1
        time.sleep(PAUSE)

    return resultater


def trygt_filnavn(tekst):
    """Lager et trygt filnavn av en tekststreng."""
    tekst = tekst.lower().strip()
    tekst = tekst.replace("æ", "ae").replace("ø", "oe").replace("å", "aa")
    tekst = re.sub(r"[^a-z0-9\-_]+", "-", tekst)
    tekst = re.sub(r"-+", "-", tekst).strip("-")
    return tekst or "uten-tittel"


def last_ned_og_optimaliser(bilde_url):
    """Laster ned ett bilde, skalerer/komprimerer, returnerer lokalt filnavn."""
    global total_bytes

    if bilde_url in nedlastede_bilder:
        return nedlastede_bilder[bilde_url]

    try:
        r = session.get(bilde_url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"    KUNNE IKKE laste bilde: {bilde_url} ({e})")
        return None

    # Lag filnavn fra original-URL
    sti = urlparse(bilde_url).path
    orig_navn = os.path.basename(sti)
    basis, ext = os.path.splitext(orig_navn)
    ext = ext.lower()

    # SVG og GIF lar vi være urørt (kan ikke optimaliseres på samme måte)
    if ext in (".svg", ".gif"):
        lokal_sti = os.path.join(IMAGES_DIR, trygt_filnavn(basis) + ext)
        with open(lokal_sti, "wb") as f:
            f.write(r.content)
        storrelse = len(r.content)
    else:
        try:
            img = Image.open(io.BytesIO(r.content))
            # Konverter til RGB hvis nødvendig (f.eks. PNG med alpha -> JPEG)
            beholder_png = ext == ".png" and img.mode in ("RGBA", "LA", "P")

            # Skaler ned hvis bredere enn maks
            if img.width > MAX_BREDDE:
                ny_hoyde = int(img.height * MAX_BREDDE / img.width)
                img = img.resize((MAX_BREDDE, ny_hoyde), Image.LANCZOS)

            ut = io.BytesIO()
            if beholder_png:
                img.save(ut, format="PNG", optimize=True)
                lagret_ext = ".png"
            else:
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(ut, format="JPEG", quality=JPEG_KVALITET, optimize=True)
                lagret_ext = ".jpg"

            data = ut.getvalue()
            lokal_navn = trygt_filnavn(basis) + lagret_ext
            lokal_sti = os.path.join(IMAGES_DIR, lokal_navn)
            with open(lokal_sti, "wb") as f:
                f.write(data)
            storrelse = len(data)
        except Exception as e:
            log.warning(f"    Bildefeil ({e}), lagrer rått: {bilde_url}")
            lokal_navn = trygt_filnavn(basis) + ext
            lokal_sti = os.path.join(IMAGES_DIR, lokal_navn)
            with open(lokal_sti, "wb") as f:
                f.write(r.content)
            storrelse = len(r.content)

    total_bytes += storrelse
    lokal_navn = os.path.basename(lokal_sti)
    nedlastede_bilder[bilde_url] = lokal_navn
    log.info(f"    bilde: {orig_navn} -> {lokal_navn} ({storrelse//1024} kB)")
    time.sleep(PAUSE)
    return lokal_navn


def rydd_innhold(html):
    """
    Fjerner Envira-gallerier, Google Maps-iframes, base64-placeholdere
    og WP-spesifikk støy. Laster ned gjenværende vanlige bilder.
    Returnerer renset HTML.
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1. Fjern Envira-gallerier HELT (ditt valg)
    for blokk in soup.select("div.wp-block-envira-envira-gallery, .envira-gallery-wrap"):
        blokk.decompose()
    # Rydd også eventuelle noscript-rester fra Envira
    for ns in soup.find_all("noscript"):
        ns.decompose()

    # 2. Fjern iframes (Google Maps o.l.) — håndteres heller med egne komponenter
    for iframe in soup.find_all("iframe"):
        iframe.decompose()

    # 3. Last ned og bytt ut vanlige bilder
    for img in soup.find_all("img"):
        src = img.get("src", "")
        # Hopp over base64-placeholdere
        if src.startswith("data:"):
            # Prøv ekte kilde fra srcset/data-src hvis finnes
            src = img.get("data-src") or ""
        if not src or src.startswith("data:"):
            img.decompose()
            continue

        # Bare bilder fra egen server
        if BASE_URL in src:
            lokal = last_ned_og_optimaliser(src)
            if lokal:
                img["src"] = f"/images/{lokal}"
                # Fjern WP-støyattributter
                for attr in ("srcset", "sizes", "loading", "decoding",
                             "class", "data-src", "data-srcset", "width",
                             "height", "style"):
                    img.attrs.pop(attr, None)
            else:
                img.decompose()

    # 4. Fjern tomme paragrafer og WP-klasser
    for tag in soup.find_all(class_=True):
        del tag["class"]
    for p in soup.find_all("p"):
        if not p.get_text(strip=True) and not p.find("img"):
            p.decompose()

    return str(soup)


def behandle(element, post_type):
    """Behandler ett innlegg/én side -> skriver Markdown-fil."""
    tittel = BeautifulSoup(
        element.get("title", {}).get("rendered", ""), "html.parser"
    ).get_text()
    slug = element.get("slug") or trygt_filnavn(tittel)
    dato = element.get("date", "")[:10]
    status = element.get("status", "")
    raa_innhold = element.get("content", {}).get("rendered", "")

    log.info(f"  • {post_type[:-1]}: {tittel}  ({slug})")

    renset = rydd_innhold(raa_innhold)
    markdown = md(renset, heading_style="ATX", strip=["span"]).strip()
    # Fjern overflødige tomme linjer
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)

    # Frontmatter
    fm = [
        "---",
        f'title: "{tittel.replace(chr(34), chr(39))}"',
        f"slug: {slug}",
        f"date: {dato}",
        f"type: {post_type[:-1]}",
        f"status: {status}",
        "---",
        "",
    ]

    undermappe = os.path.join(CONTENT_DIR, post_type)
    os.makedirs(undermappe, exist_ok=True)
    filsti = os.path.join(undermappe, f"{trygt_filnavn(slug)}.md")
    with open(filsti, "w", encoding="utf-8") as f:
        f.write("\n".join(fm) + markdown + "\n")


# ---------------------------------------------------------------------------
# Hovedkjøring
# ---------------------------------------------------------------------------
def main():
    log.info("=" * 60)
    log.info(f"Starter uttrekk fra {BASE_URL}")
    log.info(f"Rotmappe: {ROOT}")
    log.info("=" * 60)

    for pt in POST_TYPES:
        log.info(f"\nHenter '{pt}' ...")
        try:
            elementer = hent_alle(pt)
        except Exception as e:
            log.error(f"  FEIL ved henting av {pt}: {e}")
            continue

        # Lagre rådata urørt
        with open(os.path.join(RAW_DIR, f"{pt}.json"), "w", encoding="utf-8") as f:
            json.dump(elementer, f, ensure_ascii=False, indent=2)
        log.info(f"  Lagret rådata: _raw/{pt}.json ({len(elementer)} stk)")

        for el in elementer:
            try:
                behandle(el, pt)
            except Exception as e:
                log.error(f"  FEIL i element {el.get('id')}: {e}")

    # Oppsummering
    log.info("\n" + "=" * 60)
    log.info("FERDIG")
    log.info(f"  Markdown-filer: {CONTENT_DIR}")
    log.info(f"  Bilder lastet ned: {len(nedlastede_bilder)} unike")
    mb = total_bytes / (1024 * 1024)
    log.info(f"  Total bildestørrelse: {mb:.1f} MB")
    if mb > 800:
        log.info("  ⚠️  Nærmer seg GitHub-grensen (1 GB). Vurder ekstern bildelagring.")
    else:
        log.info("  ✅ God margin mot 1 GB-grensen.")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
