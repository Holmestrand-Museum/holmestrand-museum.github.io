import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  heading: z.string().optional(),
  slug: z.string(),
  date: z.coerce.date(),
  type: z.enum(['post', 'page']),
  status: z.string(),
  lang: z.string(),
  image: z.string().optional(),
  hero: z.string().optional(),
  gallery: z.string().optional(),
  beforeafter: z.string().optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/posts' }),
    schema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/pages' }),
    schema,
  }),
};
