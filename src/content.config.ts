import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			tagTopics: z.array(z.string()).default(['General']),
			tagSeries: z.optional(z.array(z.string())),
			tagLevels: z.optional(z.array(z.string())),
			lang: z.enum(['id', 'en']).default('en'),
			publishedOn: z.record(z.string(), z.string()).optional(), // Example: { medium: "url" }
		}),
});

export const collections = { blog };
