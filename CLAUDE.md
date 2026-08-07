# CLAUDE.md — Holmestrand Museum

Nettside som formidler Holmestrands historie gjennom engasjerende, interaktive
historier. Bygges fra bunnen som en ny, statisk side. Innholdet hentet fra den
gamle WordPress-siden er **utgangspunkt, ikke fasit** — tekst, bilder og struktur
kan og skal endres fritt for å lage noe bedre.

## Arbeidsmåte (viktigst)

- **Foreslå før du bygger.** Legg fram en kort plan og vent på "ok" før du
  oppretter eller endrer filer. Ikke sett i gang store endringer uforespurt.
- Snakk og skriv **norsk (bokmål)** med meg.
- Jeg jobber på **Windows**. Alle kommandoer, stier og instruksjoner skal være
  for PowerShell — aldri Mac/Linux.
- Ett steg om gangen ved oppsett og feilsøking. Ikke kjør flere store steg i slengen.

## Teknisk stack

- **Astro** (statisk site-generator), bygger til ren statisk HTML
- Hostes på **GitHub Pages**, repo: `Holmestrand-Museum/hmfnettside`
- **Flerspråklig** med Astro i18n — se eget prinsipp under
- Interaktive øyer (kart, quiz osv.) som lette JS-komponenter, ikke tunge rammeverk
- Hold arkitekturen **enkel og lavt vedlikehold** — siden skal kunne overlates
  til frivillige senere

## Kommandoer (PowerShell)

```powershell
npm install          # installer avhengigheter (én gang / ved nye pakker)
npm run dev          # lokal utviklingsserver — se siden på localhost
npm run build        # bygg statisk side til dist/
npm run preview      # forhåndsvis bygget side lokalt
```

(Oppdater denne lista hvis prosjektet får andre script.)

## Innhold og data

- Hentet innhold ligger i `content/` (Markdown med frontmatter).
- Bilder ligger i `images/` — allerede nedskalert/komprimert. Se [BILDER.md](BILDER.md)
  for hvordan nye bilder legges til, navngis og optimaliseres.
- Bildene **serveres fra `public/images/`**. `images/` er kilden; synk-steget
  (`predev`/`prebuild`, se `scripts/sync-images.mjs`) speiler `images/` → `public/images/`
  automatisk, så nye bilder trengs bare i `images/`.
- **Bildefliser for artikler**: legg til `image: bilde-NNN` i frontmatter for å velge
  eksplisitt bildeflise (f.eks. `image: bilde-314`). Uten feltets faller siden tilbake til
  første bilde i artikkelen. Bare si «artikkelname - bildenummer» så oppdaterer jeg det.
- Rå JSON-backup ligger lokalt i `_raw/` (ikke i Git — se `.gitignore`).
- **Envira-gallerier er bevisst utelatt** fra det hentede innholdet.
- Det finnes et **stort bildemateriale** tilgjengelig utover det som er hentet —
  spør om mer hvis en historie trenger flere bilder.

## Restaurerte bilder (før/nå-slider)

Artikkelen «Historien i nye farger» (`content/posts/nb/historien-i-nye-farger.md`,
frontmatter-felt `beforeafter: restaurerte`) viser original vs. KI-restaurert med en
dra-slider (`src/components/BeforeAfter.astro`). Bildene ligger i `images/restaurerte/`.

**Navnekonvensjon:** hvert motiv har to filer med samme basenavn — originalen, og den
restaurerte med `R` rett før filendelsen. Endelsen kan variere (f.eks. original `.webp`,
restaurert `.png`). Filnavnet inneholder motiv + årstall, og ev. `louisewold` (→ «Louise Wold»).
Eksempel: `nordreklev_louisewold_1885.webp` + `nordreklev_louisewold_1885R.webp`.

**Når jeg sier «det er nye bilder i restaurert-mappen»:**

1. Kjør `npm run restaurerte`. Det regenererer `src/data/restaurerte.json`,
   **beholder titler og tekster som allerede finnes**, og legger til nye par med
   auto-tittel fra filnavnet og tom `description`.
2. Kjør `npm run build` (synk-steget kopierer bildene til `public/` automatisk).
3. Fortell meg de nye parene + auto-titlene, så jeg kan gi egne titler/tekster.
   Egne bildetekster legges i `description`-feltet i `src/data/restaurerte.json`
   (overstyrer auto-teksten). Ingen KI-merknad per bilde — det står i introen øverst.
4. Varsle om ufullstendige par (mangler original eller `R`) som scriptet lister opp.

## Designretning

Grunntone: en kombinasjon av **levende magasin** og **stemningsfullt arkiv**,
med **kart som sentral inngang** til historiene.

- Serif-typografi for titler/brødtekst der det gir karakter; rolig og lesbar
- Dempede, historiske farger (ikke fargeklatt, ikke dystert)
- Luftig, bildedrevet layout — store bilder får plass å puste
- Føles moderne og innbydende, ikke "støvete museum"
- Bredt publikum: lokale, turister og flyktninger — lavterskel og visuelt

## Bærende prinsipp: flerspråklighet

Siden skal kunne leses av lokale, turister **og flyktninger**. Dette er ikke en
ettertanke — det former arkitekturen:

- Bygg med Astro i18n fra start (ikke som påheng senere)
- Tydelig språkvelger i navigasjonen
- Hold tekstmengden per historie håndterbar å oversette
- Norsk (bokmål) er kildespråk; oversettelser bygges på toppen

## Interaktive funksjoner (planlagt)

Bygges gradvis — ikke alt på en gang. Foreslå rekkefølge.

- **Kart** med historiske steder (Leaflet + Kartverket), klikkbare punkter
- **Tidslinjer** for å vise utvikling over tid
- **Quiz/spill** knyttet til historiene
- **Før/nå-bildegalleri** (historisk foto vs. dagens)
- **Lyd/podkast** — stemmer og fortellinger

## Historier

- **Variert lengde** — fra korte notiser til lange, fordypende artikler
- Målet er alltid å **engasjere og formidle**, ikke arkivere tørt
- Hver historie bør fungere godt visuelt, ikke bare som tekst

## Fremtidige utvidelser (ikke bygg ennå)

- **Nettbutikk på subdomene `butikk.holmestrandmuseum.no`.** Tanken er å selge
  print-on-demand-varer (plakater, trykk, lerret, postkort) basert på museets
  bildemateriale og de KI-restaurerte fotoene, via **Gelato**
  (produksjon + frakt, trykker lokalt i Norge).
  - Gelato er kun en produksjons-/fraktmotor, **ikke** en butikk-/kasseløsning.
    Den må kobles til en butikkplattform: Shopify, Etsy, WooCommerce m.fl., eller
    egen butikk via Gelatos REST-API.
  - Ren GitHub Pages kan **ikke** kjøre kassen selv (ingen server). Butikken lever
    derfor hos plattformen (aktuelt: **Shopify** for egen drakt + Vipps, evt.
    **Etsy** for billigst mulig start) og legges på subdomenet — hovedsiden blir
    liggende på GitHub Pages uansett.
  - Status: besluttet som eget spor **senere**. Grunnsiden publiseres først.

## Publisering

- Siden hostes på **GitHub Pages** (repo `Holmestrand-Museum/hmfnettside`),
  ikke på hotell — ingen planlagte funksjoner krever server.
- Domenet **`holmestrandmuseum.no`** er registrert hos **Uniweb**. Ved lansering
  må DNS peke fra Uniweb til GitHub Pages (gjøres i Uniwebs kontrollpanel, ikke
  WP-admin). Gammel WordPress-side beholdes urørt som fallback til alt er bekreftet.

## Hva du IKKE skal gjøre

- Ikke push til GitHub uten at jeg sier ifra.
- Ikke legg hemmeligheter (API-nøkler, `.env`) inn i repoet.
- Ikke dra inn tunge avhengigheter uten å foreslå det først.
- Ikke anta at gammelt WP-innhold må beholdes som det er — vi står fritt.
