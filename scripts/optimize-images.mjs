// Optimaliserer bildene i images/ (alle undermapper) for web.
//
// Hva scriptet gjør, uansett hvilken mappe du legger bildene i:
//   - Nedskalerer for store bilder (tak på MAX_WIDTH px bredde – aldri oppskalering)
//   - Rekomprimerer JPG/WebP i samme format (mindre fil, ingen endring av filnavn)
//   - Konverterer PNG -> WebP (stor besparelse for foto) OG oppdaterer automatisk
//     alle referanser i innhold/kode/JSON, slik at ingen lenker brytes
//   - Hopper over bilder som allerede er behandlet (cache på størrelse+endringstid)
//
// Kjør:  npm run bilder      (kjører også sync til public/ etterpå)
//        node scripts/optimize-images.mjs --dry   (tørrkjøring: viser hva som VILLE skjedd)
//
// Kilden i images/ er fasit; public/images/ speiles av sync-steget.
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, extname, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Skru av libvips' fil-cache: ellers holder sharp inn-filer åpne, og å skrive
// over samme fil (in-place rekomprimering) feiler med fillås på Windows.
sharp.cache(false);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = join(root, 'images');
const CACHE_FILE = join(root, '.optimize-cache.json');

// --- Innstillinger ---
const MAX_WIDTH = 2200;      // tak på bredde; bredere bilder nedskaleres
const Q_JPG = 80;            // jpeg-kvalitet
const Q_WEBP = 82;           // webp-kvalitet (også for PNG->WebP)
// Toppnivå-mapper i images/ som IKKE skal behandles/serveres (kildemateriale / arbeidsmapper).
const SKIP_TOP = new Set(['tordenskiold', 'til restaurering', 'Christian Fredrik Jean-Hansen']);

// Tekstfiler der /images/-referanser kan forekomme (for lenkefiks ved PNG->WebP).
const CONTENT_GLOBS = [join(root, 'content'), join(root, 'src')];
const RESTAURERTE_JSON = join(root, 'src', 'data', 'restaurerte.json');

const DRY = process.argv.includes('--dry');

// --- Hjelpere ---
const isImg = (f) => /\.(jpe?g|png|webp)$/i.test(f);

function walk(dir, top = null) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const isTop = top === null;
    if (isTop && SKIP_TOP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, isTop ? entry.name : top));
    else if (entry.isFile() && isImg(entry.name)) out.push(full);
  }
  return out;
}

function loadCache() {
  if (!existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; }
}

// Rekursivt list opp tekstfiler under gitt mappe.
function textFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...textFiles(full));
    else if (/\.(md|astro|ts|json)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// --- Hovedløp ---
const cache = loadCache();
const files = walk(IMAGES);

let recompressed = 0, converted = 0, skipped = 0, failed = 0;
let bytesBefore = 0, bytesAfter = 0;
const renames = []; // { oldRel, newRel } relativt til images/

for (const file of files) {
  const rel = relative(IMAGES, file).split(sep).join('/');
  const st = statSync(file);
  const key = rel;
  const cached = cache[key];
  if (cached && cached.size === st.size && cached.mtimeMs === st.mtimeMs) {
    skipped++;
    continue; // uendret siden sist – allerede optimalisert
  }

  const ext = extname(file).toLowerCase();
  try {
    const img = sharp(file).rotate(); // respekter EXIF-orientering
    const meta = await img.metadata();
    const resize = meta.width && meta.width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : null;
    if (resize) img.resize(resize);

    bytesBefore += st.size;

    if (ext === '.png') {
      // PNG -> WebP
      const newRel = rel.replace(/\.png$/i, '.webp');
      const newFull = join(IMAGES, newRel.split('/').join(sep));
      if (!DRY) {
        const buf = await img.webp({ quality: Q_WEBP }).toBuffer();
        writeFileSync(newFull, buf);
        unlinkSync(file);
        const ns = statSync(newFull);
        bytesAfter += ns.size;
        delete cache[key];
        cache[newRel] = { size: ns.size, mtimeMs: ns.mtimeMs };
      }
      renames.push({ oldRel: rel, newRel });
      converted++;
    } else {
      // JPG/WebP: rekomprimer i samme format. Bruk toBuffer() (fullfører pipelinen
      // og frigjør sharp sitt lesehåndtak) og skriv rett over fila – unngår
      // rename-over-låst-fil, som feiler på Windows.
      const buf = ext === '.webp'
        ? await img.webp({ quality: Q_WEBP }).toBuffer()
        : await img.jpeg({ quality: Q_JPG, mozjpeg: true }).toBuffer();
      if (!DRY) {
        // behold bare hvis den faktisk ble mindre
        if (buf.length < st.size) writeFileSync(file, buf);
        const ns = statSync(file);
        bytesAfter += ns.size;
        cache[key] = { size: ns.size, mtimeMs: ns.mtimeMs };
      } else {
        bytesAfter += Math.min(buf.length, st.size);
      }
      recompressed++;
    }
  } catch (e) {
    failed++;
    console.error(`  ! feilet: ${rel} – ${e.message}`);
  }
}

// --- Lenkefiks for PNG->WebP ---
let refFilesChanged = 0, refCount = 0;
if (renames.length) {
  const targets = [
    ...CONTENT_GLOBS.flatMap((d) => textFiles(d)),
  ];
  for (const tf of targets) {
    let txt = readFileSync(tf, 'utf8');
    const before = txt;
    // Bar relativ sti (uten /images/) er kun trygt å bytte i innholdsfiler –
    // i src/ kan f.eks. "hero.png" kollidere med assets-importer.
    const isContent = tf.startsWith(join(root, 'content') + sep);
    for (const { oldRel, newRel } of renames) {
      // 1) served path: /images/<rel>  (dekker markdown ![](...), <img src>, og /images/ i src/)
      txt = txt.split(`/images/${oldRel}`).join(`/images/${newRel}`);
      // 2) bar frontmatter-sti i innhold, f.eks. image: bilde-360.png / hero: restaurerte/hero.png
      if (isContent) txt = txt.split(oldRel).join(newRel);
    }
    if (txt !== before) {
      if (!DRY) writeFileSync(tf, txt, 'utf8');
      refFilesChanged++;
      refCount += countDiffs(before, txt);
    }
  }
  // 3) restaurerte.json lagrer bare filnavn (uten /images/), håndteres eksplisitt
  if (existsSync(RESTAURERTE_JSON)) {
    let txt = readFileSync(RESTAURERTE_JSON, 'utf8');
    const before = txt;
    for (const { oldRel, newRel } of renames) {
      if (!oldRel.startsWith('restaurerte/')) continue;
      const oldName = oldRel.slice('restaurerte/'.length);
      const newName = newRel.slice('restaurerte/'.length);
      txt = txt.split(`"${oldName}"`).join(`"${newName}"`);
    }
    if (txt !== before && !DRY) writeFileSync(RESTAURERTE_JSON, txt, 'utf8');
  }
}

function countDiffs(a, b) {
  // grov teller: antall tegn-forskjeller er lite nyttig; tell heller linjer som endret seg
  const la = a.split('\n'), lb = b.split('\n');
  let n = 0;
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) n++;
  return n;
}

if (!DRY) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');

// --- Oppsummering ---
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`\n[bilder]${DRY ? ' (TØRRKJØRING – ingenting skrevet)' : ''}`);
console.log(`  PNG -> WebP:      ${converted}`);
console.log(`  Rekomprimert:     ${recompressed}`);
console.log(`  Hoppet over:      ${skipped} (uendret)`);
if (failed) console.log(`  Feilet:           ${failed}`);
console.log(`  Størrelse:        ${mb(bytesBefore)} -> ${mb(bytesAfter)} (behandlede filer)`);
if (renames.length) {
  console.log(`  Lenkefiks:        ${refFilesChanged} filer, ~${refCount} linjer oppdatert`);
  console.log(`  Konverterte navn:`);
  for (const r of renames) console.log(`     - ${r.oldRel}  ->  ${r.newRel}`);
}
