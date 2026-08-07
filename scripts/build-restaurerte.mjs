// Bygger src/data/restaurerte.json fra bildene i images/restaurerte/.
//
// Konvensjon: hvert motiv har to filer med SAMME basenavn – originalen, og den
// restaurerte med "R" på slutten (før filendelsen). Filendelsen kan variere
// (original .webp, restaurert .png osv.). Filnavnet inneholder motiv + årstall,
// og ev. "louisewold" som fotograf.
//   nordreklev_louisewold_1885.webp   (original)
//   nordreklev_louisewold_1885R.webp  (restaurert)
//
// Scriptet BEHOLDER titler og bildetekster (description) du allerede har skrevet
// – det matcher på originalfilnavnet – og genererer bare defaults for NYE par.
//
// Kjør: node scripts/build-restaurerte.mjs   (eller: npm run restaurerte)
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'images', 'restaurerte');
const out = join(root, 'src', 'data', 'restaurerte.json');

const PHOTOG = { louisewold: 'Louise Wold' };
const isImg = (f) => /\.(jpe?g|png|webp)$/i.test(f);
// Filer som IKKE er før/nå-par (f.eks. hero-/flisbilde satt sammen av flere motiv).
const IGNORE = new Set(['hero']);

function titlecase(s) {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function parse(noext) {
  const tokens = noext.split('_');
  const year = tokens.find((t) => /^\d{4}$/.test(t)) || '';
  let photographer = '';
  const motif = [];
  for (const t of tokens) {
    if (/^\d{4}$/.test(t)) continue;
    if (PHOTOG[t.toLowerCase()]) {
      photographer = PHOTOG[t.toLowerCase()];
      continue;
    }
    motif.push(t);
  }
  return { title: titlecase(motif.join(' ')), year, photographer };
}

if (!existsSync(dir)) {
  console.error('[restaurerte] fant ikke images/restaurerte/ – avbryter');
  process.exit(1);
}

// eksisterende data, nøklet på originalfilnavn, for å beholde egne tekster
const byOrig = new Map();
if (existsSync(out)) {
  for (const rec of JSON.parse(readFileSync(out, 'utf8'))) byOrig.set(rec.orig, rec);
}

// par filene: base -> {orig, rest}
const pairs = {};
for (const f of readdirSync(dir).filter(isImg)) {
  const ext = extname(f);
  const noext = basename(f, ext);
  if (IGNORE.has(noext.toLowerCase())) continue;
  if (noext.endsWith('R')) {
    const base = noext.slice(0, -1);
    (pairs[base] ??= {}).rest = f;
  } else {
    (pairs[noext] ??= {}).orig = f;
  }
}

const records = [];
const added = [];
const incomplete = [];
for (const [base, p] of Object.entries(pairs)) {
  if (!p.orig || !p.rest) {
    incomplete.push(`${base} (mangler ${p.orig ? 'restaurert (R)' : 'original'})`);
    continue;
  }
  const existing = byOrig.get(p.orig);
  if (existing) {
    records.push({ ...existing, orig: p.orig, rest: p.rest });
  } else {
    const m = parse(base);
    records.push({
      orig: p.orig,
      rest: p.rest,
      title: m.title,
      year: m.year,
      photographer: m.photographer,
      description: '',
    });
    added.push(`${m.title}${m.year ? ` (${m.year})` : ''}`);
  }
}

records.sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999') || a.title.localeCompare(b.title, 'nb'));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(records, null, 2) + '\n', 'utf8');

console.log(`[restaurerte] ${records.length} par skrevet til src/data/restaurerte.json`);
if (added.length) console.log('  nye par (auto-tittel, tom tekst):\n   - ' + added.join('\n   - '));
if (incomplete.length) console.log('  ADVARSEL – ufullstendige par:\n   - ' + incomplete.join('\n   - '));
