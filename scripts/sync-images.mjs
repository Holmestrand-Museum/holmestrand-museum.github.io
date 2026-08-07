// Speiler images/ -> public/images/ slik at siden alltid serverer nyeste bilder.
// Kjøres automatisk via "predev" og "prebuild" i package.json.
// Nye bilder trenger derfor bare å legges i images/ (public/-kopien holdes oppdatert).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'images');
const dest = join(root, 'public', 'images');

// Toppnivå-mapper i images/ som er rent kildemateriale og IKKE skal serveres/publiseres.
// (Web-vennlige versjoner legges i egne mapper, f.eks. images/tordenskiold-web/.)
const IGNORE_TOP = new Set(['tordenskiold']);

if (!existsSync(src)) {
  console.log('[sync-images] ingen images/-mappe – hopper over');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });

let count = 0;
for (const entry of readdirSync(src, { withFileTypes: true })) {
  if (IGNORE_TOP.has(entry.name)) continue;
  cpSync(join(src, entry.name), join(dest, entry.name), { recursive: true });
  count++;
}

const skipped = [...IGNORE_TOP].join(', ');
console.log(
  `[sync-images] images/ -> public/images/ synkronisert (${count} elementer${skipped ? `, hoppet over: ${skipped}` : ''})`
);
