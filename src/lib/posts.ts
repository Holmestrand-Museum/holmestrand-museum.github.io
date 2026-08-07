import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

// URL-koder hvert stikitt slik at filnavn med mellomrom/norske tegn fungerer.
function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/');
}

// Finner riktig filendelse for en bildeflise gitt som «bilde-NNN» (uten endelse).
// Faller tilbake til .jpg hvis ingen fil finnes.
export function resolveImage(name: string): string {
  if (/\.[a-z0-9]+$/i.test(name)) return `/images/${encodePath(name)}`;
  for (const ext of IMAGE_EXTS) {
    if (fs.existsSync(path.join('public', 'images', `${name}.${ext}`))) {
      return `/images/${encodePath(name)}.${ext}`;
    }
  }
  return `/images/${encodePath(name)}.jpg`;
}

export function firstImage(body: string | undefined, imageField?: string): string | null {
  if (imageField) {
    return resolveImage(imageField);
  }
  if (!body) return null;
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match ? match[1] : null;
}
