// Engangsskript: leser kategorier/nøkkelord fra _raw/posts.json og legger dem
// inn i frontmatter på tilsvarende fil i content/posts/nb/.
const fs = require('fs');
const path = require('path');

const raw = require('../_raw/posts.json');
const posts = Array.isArray(raw) ? raw : Object.values(raw);
const dir = path.join(__dirname, '..', 'content', 'posts', 'nb');

function yamlList(items) {
  if (items.length === 0) return '[]';
  return '\n' + items.map((i) => `  - "${i.replace(/"/g, '\\"')}"`).join('\n');
}

for (const post of posts) {
  const file = path.join(dir, `${post.slug}.md`);
  if (!fs.existsSync(file)) continue;

  const terms = post._embedded?.['wp:term']?.flat() || [];
  const categories = terms.filter((t) => t.taxonomy === 'category' && t.name !== 'Uten kategori').map((t) => t.name);
  const tags = terms.filter((t) => t.taxonomy === 'post_tag').map((t) => t.name);

  let content = fs.readFileSync(file, 'utf-8');
  if (/^categories:/m.test(content)) continue; // allerede gjort

  content = content.replace(
    /^lang: .+$/m,
    (line) => `${line}\ncategories:${yamlList(categories)}\ntags:${yamlList(tags)}`
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log('Oppdatert:', post.slug, '-', categories.join(', '));
}
