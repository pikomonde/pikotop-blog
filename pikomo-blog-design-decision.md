# PikoMo Blog — Design Decision Summary

Ini adalah briefing untuk melanjutkan coding blog Astro milik PikoMo.
Bawa file ini ke chat baru sebagai konteks awal.

---

## Tentang Blog

- **Nama:** PikoMo Blog
- **URL:** blog.pikomo.top
- **Stack:** Astro + Tailwind CSS + MDX
- **Tujuan:** Blog personal software engineering, juga dipakai sebagai canonical source untuk cross-posting ke Medium, Dev.to, Towards Data Science, The Startup, dll.
- **Bahasa konten:** Campuran Indonesia & Inggris (per artikel)
- **Hosting:** cPanel shared hosting. Deploy via GitHub Actions → SSH → rsync ke `/home/pikomoto/blog.pikomo.top/`. Static files only (SSG output). Tidak ada server-side runtime.
- **Web utama:** www.pikomo.top dipisah repo dan deploy terpisah dari blog. Keduanya Astro SSG. Sync artikel terbaru ke www bisa via fetch RSS feed blog saat build-time.

---

## Struktur File

```
src/
  assets/
    computer-programming-min-300x200.jpeg  ← fallback OG image
    fonts/
      atkinson-regular.woff   ← open source, Braille Institute
      atkinson-bold.woff
  components/
    BaseHead.astro
    Footer.astro
    FormattedDate.astro
    Header.astro
  content/
    blog/
      first-post.mdx
  layouts/
    BlogPost.astro
  pages/
    index.astro
    rss.xml.js
    [...slug].astro
  styles/
    global.css
  consts.ts
  content.config.ts
astro.config.mjs
```

**Catatan:** `HeaderLink.astro` sudah dihapus — tidak dipakai. Kalau nanti butuh nav link, buat inline di `Header.astro`.

---

## Content Schema (`content.config.ts`)

```ts
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.optional(image()),
      tagTopics: z.array(z.string()).default(['General']),
      tagSeries: z.optional(z.array(z.string())),   // support multiple series per artikel
      seriesOrder: z.record(z.string(), z.number()).optional(),
      // Contoh: { "TIL (Today I Learn)": 2, "Modern AI Infrastructure": 3 }
      // Kalau tidak diisi, fallback ke pubDate ascending.
      // Infinity behavior: artikel tanpa order nempel di akhir series.
      lang: z.enum(['id', 'en']).default('en'),
      translationKey: z.string().optional(),
      // Identifier netral yang menghubungkan artikel-artikel terjemahan satu sama lain.
      // Bukan reference ke filename/slug siapa pun — semua versi bahasa cuma "berbagi" key ini.
      // Contoh: apa-itu-pemrograman.mdx (lang: id) dan what-is-programming.mdx (lang: en)
      // sama-sama punya translationKey: "what-is-programming". Opsional — artikel tanpa
      // pasangan bahasa tidak perlu mengisi field ini.
      publishedOn: z.record(z.string(), z.string()).optional(),
      // Contoh: { medium: "https://...", devto: "https://...", towardsDataScience: "https://..." }
      author: z.string().default('Piko Monde'),
    }),
});
```

**Catatan schema:**
- `tagSeries` array — sekarang support **multiple series per artikel**
- `seriesOrder` adalah map dari nama series ke urutan (number). Opsional — kalau tidak diisi, urutan fallback ke `pubDate` ascending. Artikel tanpa `seriesOrder` akan nempel di akhir series di antara sesama artikel tanpa order.
- `translationKey` — lihat section [Bilingual Support](#bilingual-support) untuk detail lengkap (helper function, konvensi foldering, UI di card & artikel)
- `publishedOn` adalah key-value bebas untuk nama publisher dan URL-nya
- `author` ditambahkan — default `'Piko Monde'`, tidak wajib diisi di frontmatter
- `tagLevels` sudah **dihapus** dari schema — tidak dipakai

---

## Keputusan Desain: Homepage (`index.astro`)

### Layout Artikel
- Artikel terbaru tampil **featured / full-width** di baris pertama (flex-row: gambar kiri, konten kanan)
- Artikel berikutnya tampil dalam **grid auto-fit, minmax(260px, 1fr)**
- Kalau filter aktif, card pertama yang **visible** yang jadi featured — bukan selalu index 0
- Kartu artikel yang punya `tagSeries` diberi **left border amber** sebagai visual cue

### Hero Image
- Ukuran rekomendasi: **1200×630px** (rasio 1.91:1, optimal untuk Open Graph & Twitter Card)
- Kalau tidak ada hero image, tampil placeholder `"No image"`

### Filter Bar
Urutan dari kiri ke kanan:

1. **Language pills** — 3 tombol pill style: `All` | `EN` | `ID`
2. **Dropdown "Topics & Series"** — multi-select dengan grouping:
   - Group: *Topics* → tag biru (`tagTopics`)
   - Group: *Series* → tag amber (`tagSeries`)
3. **Dropdown "Publishers"** — multi-select (`publishedOn` keys) — **hanya muncul kalau ada publisher**

### Active Filter Chip
- Kalau filter series aktif, muncul chip di bawah filter bar: `Series: Blog Journey ✕`
- Klik ✕ untuk hapus filter series itu
- Klik tag series amber di kartu → auto-aktifkan filter series yang sama
- Homepage menerima `?series=NamaSeries` dari URL → otomatis aktifkan filter, lalu URL dibersihkan via `history.replaceState`

### Informasi di Kartu Artikel
- Hero image (16:9)
- Tags: series (amber) + topics (biru) + lang badge + translation badge (jika punya pasangan `translationKey`)
- Judul artikel
- Deskripsi singkat (2 baris, `-webkit-line-clamp: 2`)
- Published date + updated date (jika ada, italic)
- Publisher badges (jika ada `publishedOn`)
- Author row di bawah: avatar initials + nama author

---

## Keputusan Desain: Halaman Artikel (`BlogPost.astro`)

### Urutan Elemen
1. Hero image (full width, `border-radius: 12px`, box-shadow)
2. Series bar — **satu bar per series**, hanya muncul jika ada `tagSeries`**:
   - Format: `Part of series: [nama clickable] · N of M  « ‹ Prev  Next ›`
   - Klik nama series → redirect ke `/?series=[nama]` (homepage dengan filter aktif)
   - N of M dihitung dari semua artikel yang punya series sama
   - Urutan: pakai `seriesOrder[seriesName]` kalau ada, fallback ke `pubDate` ascending
   - Navigasi prev/next/first:
     - `«` → artikel pertama di series (disembunyikan kalau sudah di artikel pertama)
     - `‹ Prev` → artikel sebelumnya (disembunyikan kalau sudah di artikel pertama)
     - `Next ›` → artikel berikutnya (disembunyikan kalau sudah di artikel terakhir)
3. Tags: topics (biru) + lang badge
4. Judul artikel (`h1`, `clamp(1.6rem, 4vw, 2.2rem)`)
5. Meta bar: avatar initials + nama author · Published [date] + Updated [date jika ada, italic] · translation link (jika punya pasangan `translationKey`)
6. Konten artikel (MDX via `<slot />`)
7. **"Also published on"** — hanya muncul jika `publishedOn` ada dan tidak kosong — badge link per platform, `target="_blank"`

### Tanggal
- Keduanya ditampilkan: published + updated
- Updated hanya ditampilkan jika ada, dengan style italic

---

## Bilingual Support

### `translationKey` — konsep dasar

`translationKey` (string, opsional) di schema adalah identifier netral yang menghubungkan artikel-artikel terjemahan. Bukan reference satu arah ke filename/slug tertentu — semua versi bahasa cuma "berbagi" key yang sama, sehingga menambah bahasa ketiga nanti tidak perlu mengedit file yang sudah ada.

### Helper function: `src/utils/translations.ts`

```ts
import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

export function getTranslations(post: BlogPost, allPosts: BlogPost[]): BlogPost[] {
	const key = post.data.translationKey;
	if (!key) return [];
	return allPosts.filter(
		(p) => p.id !== post.id && p.data.translationKey === key && p.data.lang !== post.data.lang
	);
}

const LANG_LABEL: Record<string, string> = { id: 'ID', en: 'EN' };
export function langLabel(lang: string): string {
	return LANG_LABEL[lang] ?? lang.toUpperCase();
}
```

### Konvensi foldering (bukan rule di kode — folder 100% agnostik)

`glob` pattern (`**/*.{md,mdx}`) sudah recursive, jadi folder TIDAK punya pengaruh terhadap logic apa pun — semua logic baca dari field frontmatter. Folder murni untuk kerapian penulis. Konvensi yang dipakai:

- **Folder by `translationKey`** — kalau artikel standalone yang bilingual (bukan bagian series).
- **Folder by series** — kalau artikel bagian dari series (prioritas di atas translationKey kalau keduanya berlaku untuk artikel yang sama).

Contoh:
```
content/blog/
  what-is-rag/
    apa-itu-rag.mdx        (lang: id, translationKey: "what-is-rag")
    what-is-rag.mdx        (lang: en, translationKey: "what-is-rag")
  series-algoritma-komputer/
    apa-itu-pemrograman.mdx
    apa-itu-algoritma.mdx
```

### UI — Card (`index.astro`)

Chip kecil bentuk pill, sejajar dengan lang badge di baris tag. Format: `↔ also ID` / `↔ also EN`. Klik → redirect ke artikel pasangannya.

Card seluruhnya sudah berupa `<a>`, jadi badge ini pakai `<span data-translation-href>` + JS click handler (`stopPropagation` + redirect manual), bukan nested `<a>` (invalid HTML).

```astro
{translations.length > 0 && (
  <>
    {translations.map((t) => (
      <span class="translation-badge" data-translation-href={`/${t.id}/`}>
        ↔ also {langLabel(t.data.lang)}
      </span>
    ))}
  </>
)}
```

```css
.translation-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px dashed var(--text3);
  color: var(--text2);
  cursor: pointer;
}
.translation-badge:hover {
  border-color: var(--accent);
  color: var(--accent);
}
```

```ts
// di <script> index.astro
document.querySelectorAll<HTMLElement>('.translation-badge').forEach((badge) => {
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const href = badge.dataset.translationHref;
    if (href) window.location.href = href;
  });
});
```

### UI — Halaman Artikel (`BlogPost.astro`)

Tampil di `.article-meta`, **sejajar** dengan avatar/author/dates (bukan di dalam `.meta-dates`, dan bukan box/section terpisah seperti "Also published on"). Dipisah dengan `.meta-sep` yang sama dengan elemen lain di meta bar.

Styling pill, konsisten dengan warna `.tag.topic` (biru lembut) — dipilih daripada teks link polos karena fungsinya lebih dekat ke "info kategori" daripada call-to-action besar.

Teks link full phrase (bukan kode bahasa), berdasarkan `lang` tujuan:
- `↔ Read in English`
- `↔ Baca dalam Bahasa Indonesia`

```astro
<div class="article-meta">
  <div class="avatar">{initials}</div>
  <span class="meta-author">{author}</span>
  <span class="meta-sep">·</span>
  <div class="meta-dates">
    <div>Published <FormattedDate date={pubDate} /></div>
    {updatedDate && (
      <div class="upd">Updated <FormattedDate date={updatedDate} /></div>
    )}
  </div>
  {translations.length > 0 && (
    <>
      <span class="meta-sep">·</span>
      <div class="meta-other-lang">
        {translations.map((t) => (
          <a class="translation-meta-link" href={`/${t.id}/`}>
            ↔ {t.data.lang === 'id' ? 'Baca dalam Bahasa Indonesia' : 'Read in English'}
          </a>
        ))}
      </div>
    </>
  )}
</div>
```

```css
.meta-other-lang {
  display: flex;
  align-items: center;
}
.translation-meta-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--tag-bg);
  color: var(--tag-text);
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.translation-meta-link:hover {
  opacity: 0.8;
}
```

### Setup pendukung di `BlogPost.astro`

`BlogPost.astro` menerima props lewat `type Props = CollectionEntry<'blog'>['data']` — artinya **tidak** ada `id` di dalamnya secara default (cuma `data`, bukan entry penuh). Perlu 2 penyesuaian:

```ts
import { getTranslations, langLabel } from '../utils/translations';

type Props = CollectionEntry<'blog'>['data'] & { id: string };
const { /* ...existing destructured fields... */, id, translationKey } = Astro.props;

const translations = translationKey
	? allPosts.filter((p) => p.data.translationKey === translationKey && p.data.lang !== lang)
	: [];
```

Dan di `[...slug].astro`, pass `id` sebagai prop tambahan:

```astro
<BlogPost {...post.data} id={post.id} />
```

### Prinsip desain elemen tambahan kecil (translation link, badge, dan sejenisnya)

Dipelajari dari proses iterasi desain translation link ini — berlaku untuk elemen kecil sejenis di masa depan:

- Sejajarkan dengan elemen yang levelnya sama (misal: translation link sejajar avatar/dates, bukan dipaksa nempel di dalam salah satu baris tanggal yang sudah sempit).
- Hindari box/border besar (dashed atau solid) untuk elemen yang fungsinya sekunder — itu salah kasih sinyal "ini section penting", padahal cuma 1 baris info kecil.
- Styling pill yang konsisten dengan sistem warna yang sudah ada (`--tag-bg`, dst.) lebih baik daripada teks link polos berwarna `--accent` saja, atau warna baru yang tidak ada di sistem.
- Kalau implementasi mulai butuh percabangan if/else ganda demi "menumpang" di elemen lain yang sudah ada, itu sinyal untuk dijadikan elemen sendiri yang sejajar, bukan terus dipaksa nempel.

### Sub-series (dibahas, di-drop untuk saat ini)

Sempat didiskusikan sebagai field tambahan (`subSeries`, `subSeriesOrder`) untuk series yang punya banyak artikel dan perlu di-breakdown jadi grup lebih kecil. Tetap akan field-based, bukan folder-based, supaya kompatibel dengan konvensi foldering `translationKey` di atas. **Belum diimplementasikan** — tidak ada keputusan struktur foldering saat ini yang perlu di-undo kalau sub-series ditambah nanti.

---

## Keputusan Desain: Dark Mode

- Toggle di **header kanan** — style pill dengan knob animasi (bukan icon)
- Label berubah: `Light` ↔ `Dark`
- Implementasi: toggle class `.dark` pada `<html>`
- Preferensi disimpan di `localStorage`, fallback ke `prefers-color-scheme`
- **Semua warna pakai CSS custom properties** — wajib, tidak boleh hardcode warna

### CSS Variables

```css
/* Light */
--bg: #ffffff;      --bg2: #f5f4f0;     --bg3: #eeeceb;
--text: #0f1219;    --text2: #60739f;   --text3: #8892aa;
--border: rgba(15,18,25,0.12);
--border2: rgba(15,18,25,0.22);
--accent: #2337ff;  --accent-dark: #000d8a;
--pill-active-bg: #2337ff;  --pill-active-text: #fff;
--tag-bg: #e6f1fb;      --tag-text: #0c447c;    /* Topics — biru */
--series-bg: #faeeda;   --series-text: #633806; /* Series — amber */
--pub-bg: #eaf3de;      --pub-text: #3b6d11;    /* Publishers — hijau */
--toggle-bg: #e5e3e0;   --toggle-dot: #60739f;
--box-shadow: 0 2px 6px rgba(15,18,25,0.08), 0 8px 24px rgba(15,18,25,0.06);

/* Dark */
--bg: #18191e;      --bg2: #22232a;     --bg3: #2a2b33;
--text: #e4e5ec;    --text2: #8892aa;   --text3: #60739f;
--border: rgba(255,255,255,0.1);
--border2: rgba(255,255,255,0.2);
--tag-bg: #0c447c;      --tag-text: #b5d4f4;
--series-bg: #633806;   --series-text: #fac775;
--pub-bg: #1a3a0a;      --pub-text: #c0dd97;
--toggle-bg: #2a2b33;   --toggle-dot: #b5d4f4;
```

### Color Usage Map

Ini peta warna per komponen UI — pakai sebagai referensi cepat saat mau styling elemen baru:

| Komponen | Background | Text/Foreground | Border/Accent |
|---|---|---|---|
| **Page background** | `--bg` | `--text` | — |
| **Card / section bg** | `--bg2` | — | `--border` |
| **Code inline / bg subtle** | `--bg3` | `--text2` | — |
| **Heading & body text** | — | `--text` | — |
| **Secondary text** (meta, date, label) | — | `--text2` | — |
| **Tertiary text** (placeholder, muted) | — | `--text3` | — |
| **Link / accent** | — | `--accent` | — |
| **Link hover** | — | `--accent-dark` | — |
| **Divider / hr** | — | — | `--border` |
| **Tag: Topics** (biru) | `--tag-bg` | `--tag-text` | — |
| **Tag: Series** (amber) | `--series-bg` | `--series-text` | — |
| **Tag: Publishers** (hijau) | `--pub-bg` | `--pub-text` | — |
| **Lang badge** (EN/ID) | `--bg3` | `--text2` | — |
| **Avatar initials** | `--tag-bg` | `--tag-text` | — |
| **Active filter chip** (series) | `--series-bg` | `--series-text` | — |
| **Language pill (active)** | `--pill-active-bg` (`#2337ff`) | `--pill-active-text` (`#fff`) | — |
| **Language pill (inactive)** | transparent | `--text2` | — |
| **Pill group track** | `--bg3` | — | — |
| **Filter dropdown button** | `--bg3` | `--text` | `--border` |
| **Filter dropdown menu** | `--bg` | `--text` | `--border2` |
| **Dropdown item hover** | `--bg3` | — | — |
| **Dropdown checkbox (checked)** | `--accent` | `#fff` | `--accent` |
| **Count badge (on dropdown)** | `--accent` | `#fff` | — |
| **Dark mode toggle pill** | `--toggle-bg` | `--text2` | `--border` |
| **Dark mode knob dot** | `--toggle-dot` | — | — |
| **Card border (default)** | `--bg` | — | `--border` |
| **Card border (hover)** | — | — | `--accent` |
| **Card left border: in-series** | — | — | `--series-text` |
| **Hero image shadow** | — | — | `--box-shadow` |
| **Blockquote border** | — | — | `--accent` |
| **Series bar** | `--series-bg` | `--series-text` | — |
| **"Also published on" box** | `--bg2` | `--text2` (label) | — |

### Favicon SVG Color

SVG favicon di `public/favicon.svg` pakai hardcode warna langsung (bukan CSS var, karena SVG di luar scope Astro):
- Light mode: `path { fill: #000; }`
- Dark mode: `@media (prefers-color-scheme: dark) { path { fill: #FFF; } }`

Mengikuti `prefers-color-scheme` sistem — **tidak** sync dengan dark mode toggle di halaman (yang pakai `localStorage`). Ini limitasi favicon SVG yang diterima — tidak bisa diperbaiki tanpa JS trickery.

---

## Keputusan Desain: Header & Footer

- **Header:** Logo "PikoMo" (link ke `/`) di kiri, dark mode toggle di kanan. Tidak ada nav links.
- **Footer:** Tiga kolom:
  - Kiri: brand "PikoMo Blog" + tagline singkat
  - Tengah: nav links (RSS, /links di www.pikomo.top)
  - Kanan: copyright + social links (LinkedIn, GitHub, Ko-fi)
  - Mobile: stack vertikal
- Halaman `/about` tidak ada — tidak dipakai.

---

## SEO

- `BaseHead.astro` menangani: canonical URL, Open Graph, Twitter Card
- **Canonical URL:** `new URL(Astro.url.pathname, Astro.site)` — merujuk ke dirinya sendiri, aman
- `Astro.site` diambil dari `astro.config.mjs` → wajib diset: `site: 'https://blog.pikomo.top'`
- Hero image dipakai sebagai `og:image` — fallback ke `computer-programming-min-300x200.jpeg`
- **Page title format:** `[Judul Artikel] | PikoMo Blog` untuk artikel, `PikoMo Blog` saja untuk homepage
  - Implementasi di `BaseHead.astro`: `const fullTitle = title === SITE_TITLE ? SITE_TITLE : \`${title} | ${SITE_TITLE}\``

### RSS (`rss.xml.js`)

- Endpoint: `/rss.xml` — di-link di `<head>` via `BaseHead.astro`
- ⚠️ **Belum filter `draft: true`** — perlu tambah `.filter((p) => !p.data.draft)` sebelum `.map()`

### `consts.ts`
```ts
export const SITE_TITLE = 'PikoMo Blog';
export const SITE_DESCRIPTION = 'Software development, programming, and technology insights from PikoMo.';
```

---

## Font

- **Atkinson Hyperlegible** — open source (Braille Institute), aman untuk web
- File: `src/assets/fonts/atkinson-regular.woff` & `atkinson-bold.woff`
- Dikonfigurasi di `astro.config.mjs` via `fontProviders.local()`
- Dipakai via CSS variable `--font-atkinson` di `body`

---

## TODO

- [x] Update favicon — saat ini masih pakai SVG default Astro
- [ ] Migrasi styling ke Tailwind — saat ini styling pakai `<style>` scoped per komponen, belum pakai utility classes Tailwind secara konsisten
- [ ] Tag `NEW` — artikel yang baru publish (misal dalam 7 hari terakhir) mendapat badge NEW di kartu
- [x] Related articles — sudah diimplementasi di `BlogPost.astro`. Scoring: same series (5pts) + topic overlap (3pts each) + recency boost top-7 (1.5pts per rank). Maks 3 artikel.
- [x] **RSS filter draft** — `rss.xml.js` sudah filter `draft: true`.
- [x] Footer — diperbarui jadi 3 kolom: brand+tagline | nav links | copyright+socials.
- [ ] **Performance & Monitoring** — daftar hal yang perlu didaftarkan/dicek:
  - [ ] Daftar & verifikasi **Google Search Console** untuk `blog.pikomo.top` (submit sitemap, pantau Core Web Vitals real-user, cek indexing errors)
  - [ ] Daftar & verifikasi **Google Search Console** untuk `www.pikomo.top` (properti terpisah)
  - [ ] Cek performa via **PageSpeed Insights** (pagespeed.web.dev) — target LCP < 2.5s, CLS < 0.1, INP < 200ms
  - [ ] GTmetrix — opsional, bisa skip kalau sudah pakai PageSpeed Insights
  - [ ] web.dev/measure — sudah deprecated, redirect ke PageSpeed Insights, skip
- [ ] **Analytics** — pilih salah satu:
  - Opsi A: **Umami self-hosted** (gratis, GDPR compliant by default, tidak perlu cookie banner, script ~2KB). Deploy via Docker ke Railway/Fly.io free tier. Bisa track blog + www sekaligus dari satu instance.
  - Opsi B: **GA4 via GTM** — butuh cookie consent popup untuk visitor EU (wajib GDPR). Keuntungan: integrasi Google Search Console data + keyword organic query via GSC linking.
  - **Catatan keyword organic:** Baik Umami maupun GA4, data keyword "apa yang dicari user di Google" TIDAK tersedia langsung — ini ada di Google Search Console (gratis). GA4 bisa di-link ke GSC untuk lihat query data di dalam GA4 dashboard, tapi sumbernya tetap GSC. Umami + GSC juga bisa jalan berdampingan.
- [ ] **Draft URL protection** — `[...slug].astro` tidak filter draft, artikel draft bisa diakses via URL langsung. Pertimbangkan apakah perlu di-block atau by design.

---

## CD / Deployment

### Build (SSG)

Astro sudah SSG by default — `npm run build` langsung output file statis ke `./dist/`. Tidak perlu konfigurasi tambahan.

### Trigger

**Trigger: GitHub Release (`release: published`)**

Alasan: push ke main bisa berantakan saat nulis artikel setengah jadi atau eksperimen fitur. Release lebih intentional — kamu yang kontrol kapan go live. GitHub Release juga otomatis bikin Git tag untuk history versi.

### GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy Blog

on:
  release:
    types: [published]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run build
      # Output ada di ./dist/

      # ── Opsi A: Deploy via SSH ke server sendiri ──────────────
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            rsync -avz --delete ./dist/ user@host:/var/www/blog/

      # ── Opsi B: Deploy ke GitHub Pages ────────────────────────
      # - uses: actions/upload-pages-artifact@v3
      #   with:
      #     path: ./dist
      # - uses: actions/deploy-pages@v4
```

**GitHub Secrets yang perlu diset (untuk Opsi A / SSH):**
- `SSH_HOST` — IP atau domain server
- `SSH_USER` — username SSH
- `SSH_PRIVATE_KEY` — isi private key (bukan public key)

---

## Hal yang Belum Diputuskan / Untuk Nanti

- **Halaman Series dedicated** (`/series/[name]`) — saat ini klik series = filter di homepage. Bisa jadi fitur v2.
- **Search** — belum dibahas, bisa jadi fitur v2.
- **Sub-series** — lihat catatan di [Bilingual Support](#bilingual-support), belum diimplementasi.

---

## Konvensi Cross-Posting

Saat mempublikasikan artikel di platform lain (Medium, Dev.to, dll.), selalu sertakan dua blok teks berikut:

### Di awal artikel (canonical notice)

> *Originally published on [blog.pikomo.top](https://blog.pikomo.top)*

Taruh tepat sebelum paragraf pertama, sesudah judul/subtitle platform.

### Di akhir artikel (CTA)

**Untuk platform eksternal (Medium, Dev.to, Hackernoon, dll.):**

> *More posts at [blog.pikomo.top](https://blog.pikomo.top) · [GitHub](https://github.com/pikomonde). If this saved you some debugging time, [Ko-fi](https://ko-fi.com/pikomonde) is always appreciated.*

**Untuk Astro blog (BlogPost.astro):**

> More projects on *[GitHub](https://github.com/pikomonde) · If this saved you some debugging time, [Ko-fi](https://ko-fi.com/pikomonde) is always appreciated.*

Taruh setelah paragraf terakhir konten, sebelum tag/topic platform.

Funnel yang diinginkan: Dev.to / Medium → blog.pikomo.top → footer → /links (di www.pikomo.top).
Ko-fi disebut di penutup artikel saja — tidak diulang di footer blog supaya tidak overlap.

### Catatan

- Link ke `blog.pikomo.top` (homepage), bukan ke artikel spesifik — tidak perlu diupdate tiap artikel baru. Pengecualian: kalau ada artikel seri lanjutan yang sudah publish, boleh link langsung dengan konteks eksplisit, misal *"Part 2 is already up: [judul]"*
- LinkedIn dihapus dari CTA artikel — sudah ada di footer www.pikomo.top dan links.pikomo.top
- `links.pikomo.top` tidak perlu disebut di CTA artikel — lebih tepat di bio platform
- Di Astro blog, link "more posts" dihilangkan karena pembaca sudah ada di blog; related posts section sudah menghandle ini
- Tidak perlu tambah link `/support` di CTA artikel — terlalu banyak pilihan justru mengurangi konversi
- Canonical URL di settings platform (Medium: "Import story" atau canonical field, Dev.to: `canonical_url` di frontmatter) tetap wajib diset ke URL artikel spesifik di blog


