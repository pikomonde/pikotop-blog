import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

/**
 * Mencari semua artikel lain yang merupakan pasangan terjemahan dari artikel
 * yang diberikan — yaitu artikel dengan `translationKey` yang sama tapi
 * `lang` yang berbeda.
 *
 * Tidak melakukan apa pun terkait folder/path — murni baca field frontmatter.
 * Mengembalikan array kosong kalau artikel tidak punya `translationKey`,
 * atau tidak ada pasangan yang ditemukan.
 */
export function getTranslations(
	post: BlogPost,
	allPosts: BlogPost[]
): BlogPost[] {
	const key = post.data.translationKey;
	if (!key) return [];

	return allPosts.filter(
		(p) =>
			p.id !== post.id &&
			p.data.translationKey === key &&
			p.data.lang !== post.data.lang
	);
}

/**
 * Map dari nama bahasa lengkap ke label badge singkat.
 * Dipakai supaya badge "Also in: EN" konsisten penulisannya di semua tempat.
 */
const LANG_LABEL: Record<string, string> = {
	id: 'ID',
	en: 'EN',
};

export function langLabel(lang: string): string {
	return LANG_LABEL[lang] ?? lang.toUpperCase();
}
