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

/**
 * Menggabungkan pasangan terjemahan jadi satu entry per artikel logis.
 * Post yang berbagi `translationKey` di-dedupe; versi yang cocok dengan
 * `preferLang` yang dipilih kalau ada, kalau tidak pakai yang pertama ketemu.
 * Post tanpa `translationKey` selalu dipertahankan (tiap-tiap jadi entry sendiri).
 *
 * Kirim post yang sudah ter-sort sesuai urutan yang diinginkan — urutannya
 * dipertahankan, dan tiap artikel logis menempati slot versi yang pertama terlihat.
 */
export function dedupeByTranslation(
	posts: BlogPost[],
	preferLang?: string
): BlogPost[] {
	const seen = new Set<string>();
	const result: BlogPost[] = [];

	for (const post of posts) {
		const groupKey = post.data.translationKey ?? post.id;
		if (seen.has(groupKey)) continue;
		seen.add(groupKey);

		const preferred = preferLang
			? posts.find(
					(p) => (p.data.translationKey ?? p.id) === groupKey && p.data.lang === preferLang
			  )
			: undefined;

		result.push(preferred ?? post);
	}

	return result;
}
