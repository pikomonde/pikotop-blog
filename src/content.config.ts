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
			tagTopics: z.array(z.string()).default(['General']), // Example: ["Astro", "Web Dev", "Engineering Excellence"]
			tagSeries: z.optional(z.array(z.string())), // Editorial convention: max 1 series per article. Example: ["Building PikoMo Blog", "Intro to Programming"]
			seriesOrder: z.record(z.string(), z.number()).optional(),
			lang: z.enum(['id', 'en']).default('en'),
			// Identifier netral yang menghubungkan artikel-artikel terjemahan satu sama lain.
			// Tidak menunjuk ke filename/slug siapa pun — semua versi bahasa cuma "berbagi" key ini.
			// Contoh: "what-is-programming" dipakai baik oleh apa-itu-pemrograman.mdx (lang: id)
			// maupun what-is-programming.mdx (lang: en). Opsional — artikel tanpa pasangan bahasa
			// tidak perlu mengisi field ini.
			translationKey: z.string().optional(),
			publishedOn: z.record(z.string(), z.string()).optional(), // Example: { medium: "url", devto: "url", ... }
			draft: z.boolean().default(false),
			author: z.string().default('Piko Monde'),
		}),
});

export const collections = { blog };
