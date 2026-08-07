# Oversettelse — arbeidsflyt

Dette dokumentet beskriver hvordan innhold på Holmestrand Museum-siden skal
oversettes, slik at det er nok å si **"oversett denne til [språk]"** for at
det skal gjøres riktig.

## Kildespråk

Norsk (bokmål, `nb`) er kildespråk. Alt innhold skrives på norsk først.

## Språk siden bygges for

- `nb` — norsk bokmål (kilde)
- `en` — engelsk (turister, internasjonalt publikum)

Flere språk legges til samme struktur ved behov (f.eks. ukrainsk `uk`,
arabisk `ar`, tigrinja `ti` — relevant for flyktninger). Strukturen under er
laget for å gjøre det enkelt å legge til nye språk uten ombygging.

## Mappestruktur

Hvert språk får sin egen undermappe, med **samme filnavn (slug)** som
originalen:

```
content/
  pages/
    nb/museet.md
    en/museet.md
  posts/
    nb/harriet-backer.md
    en/harriet-backer.md
```

Samme slug på tvers av språk gjør at Astro i18n-routing kan koble sammen
språkversjoner av samme side automatisk.

## Hva som skal oversettes

- Title, ingress/sammendrag og brødtekst
- Alt-tekst / bildetekster (billedtekst under bilder i markdown)
- Eventuelle sitater — oversett, men marker at det er oversatt om
  originalsitatet er på et annet språk enn norsk

## Hva som IKKE skal endres

- Bildefiler og bilde-URLer (`/images/...`) — samme bilder i alle språk
- Stedsnavn, personnavn, gatenavn (Holmestrand, Indre Havn osv.) — behold
  norsk form med mindre det finnes en etablert engelsk form
- `slug` i frontmatter — alltid samme som norsk original, så lenkestrukturen
  blir konsekvent
- `date` — behold original publiseringsdato

## Frontmatter i oversatte filer

Oversatte filer skal ha samme frontmatter-felter som originalen, men med
oversatt `title`. Eksempel:

```yaml
---
title: "Harriet Backer"
slug: harriet-backer
date: 2024-11-12
type: post
status: publish
lang: en
---
```

`lang`-feltet legges til for å gjøre det tydelig hvilket språk filen er på
(brukes også av Astro i18n).

## Tone og forenkling

Målgruppen er bred — lokale, turister og flyktninger. Oversettelsen skal:

- Bruke enkelt, klart språk (ikke avansert litterær stil), selv om
  originalen er mer "fortellende"
- Beholde fortellergrep og struktur (avsnitt, bildeplassering, mellomtitler)
- Korte ned tunge/dialektpregede formuleringer der det gjør teksten
  vanskelig å forstå for en som ikke har norsk som morsmål — uten å fjerne
  meningsinnhold

## Arbeidsflyt i praksis

Når du sier **"oversett [filnavn/historie] til [språk]"**:

1. Finn originalfilen i `content/posts/nb/` eller `content/pages/nb/`
2. Oversett innhold etter prinsippene over
3. Lagre som ny fil i `content/posts/[språkkode]/` eller
   `content/pages/[språkkode]/` med samme filnavn
4. Behold bilder, slug og dato uendret; sett `lang` til riktig kode
