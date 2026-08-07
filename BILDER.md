# Bilder — arbeidsflyt

Dette dokumentet beskriver hvordan bilder legges til og organiseres på
Holmestrand Museum-siden.

## Mappestruktur

- `images/` — originalbilder, navngitt `bilde-001.jpg`, `bilde-002.png` osv.
- `public/images/` — speil av `images/`, generert automatisk av scriptet
  (ikke rediger her direkte)
- `_raw/bilderegister.html` — visuell oversikt (kun lokalt, ikke i Git) over
  alle bilder med filnavn, for å gjøre det enkelt å si "bruk bilde-014 i
  artikkelen om Harriet Backer"

## Legge til nye bilder

1. Legg de nye bildefilene rett i `images/` (uansett opprinnelig filnavn)
2. Kjør fra prosjektroten:
   ```powershell
   python scripts\bildeopprydding.py --dry-run
   ```
   for å se hvilke nye numre de får, deretter:
   ```powershell
   python scripts\bildeopprydding.py
   ```

Scriptet:
- gir nye bilder påfølgende `bilde-XXX`-navn (lar eksisterende navn være urørt)
- optimaliserer/komprimerer bildene (maks 1600px på lengste side)
- synker `images/` → `public/images/`
- oppdaterer `_raw/bilderegister.html`

## Bruke et bilde i en artikkel

Scriptet vet ikke hvor et bilde skal brukes — det må legges inn manuelt i
markdown-filen:

```markdown
![Beskrivelse av bildet](/images/bilde-014.jpg)
```

Åpne `_raw/bilderegister.html` i nettleseren for å finne riktig bildenummer.

## Variant-filer fra WordPress

Gamle WordPress-størrelsesvarianter (`-300x169.jpg`, `-scaled.jpg` osv.) blir
automatisk konsolidert til originalbildet og slettet av scriptet — dette
skjer kun ved behov og krever ingen manuell håndtering.
