// Kategorier vist i menyen, i ønsket rekkefølge.
export const CATEGORIES = [
  'Personene',
  'Hendelsene',
  'Stedene',
  'Historier',
  'Emigrantenes historier',
  'Bilder',
] as const;

// Visningsnavn der det avviker fra kategorinavnet i innholdet.
export const CATEGORY_LABELS: Record<string, string> = {
  Personene: 'Menneskene',
  'Emigrantenes historier': 'Emigrasjon',
};

export function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name] ?? name;
}

// Kategorifliser på forsiden, i ønsket rekkefølge.
export const FRONT_CATEGORIES = ['Personene', 'Historier', 'Stedene', 'Bilder', 'Quiz'] as const;

export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
