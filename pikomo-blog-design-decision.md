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
      tagSeries: z.optional(z.array(z.string())), // konvensi editorial: maks 1 series per artikel
      lang: z.enum(['id', 'en']).default('en'),
      publishedOn: z.record(z.string(), z.string()).optional(),
      // Contoh: { medium: "https://...", devto: "https://...", towardsDataScience: "https://..." }
      author: z.string().default('Piko Monde'),
    }),
});
```

**Catatan schema:**
- `tagSeries` tetap array di schema tapi konvensi editorial: **1 artikel = 1 series**
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
- Tags: series (amber) + topics (biru) + lang badge
- Judul artikel
- Deskripsi singkat (2 baris, `-webkit-line-clamp: 2`)
- Published date + updated date (jika ada, italic)
- Publisher badges (jika ada `publishedOn`)
- Author row di bawah: avatar initials + nama author

---

## Keputusan Desain: Halaman Artikel (`BlogPost.astro`)

### Urutan Elemen
1. Hero image (full width, `border-radius: 12px`, box-shadow)
2. Series bar — **hanya muncul jika ada `tagSeries`**:
   - Format: `Part of series: [nama clickable] · N of M`
   - Klik nama series → redirect ke `/?series=[nama]` (homepage dengan filter aktif)
   - N of M dihitung dari semua artikel yang punya series sama, diurutkan `pubDate` ascending
3. Tags: topics (biru) + lang badge
4. Judul artikel (`h1`, `clamp(1.6rem, 4vw, 2.2rem)`)
5. Meta bar: avatar initials + nama author · Published [date] + Updated [date jika ada, italic]
6. Konten artikel (MDX via `<slot />`)
7. **"Also published on"** — hanya muncul jika `publishedOn` ada dan tidak kosong — badge link per platform, `target="_blank"`

### Tanggal
- Keduanya ditampilkan: published + updated
- Updated hanya ditampilkan jika ada, dengan style italic

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
- **Footer:** Brand name kiri, copyright kanan. Tidak ada social links.
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
- [x] **RSS filter draft** — `rss.xml.js` belum filter `draft: true`, artikel draft bisa bocor ke feed. Fix: tambah `.filter((p) => !p.data.draft)` sebelum mapping.

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
- **`tagSeries` sebagai folder/collection** — ide untuk nanti, belum diimplementasi.

---

## Konvensi Cross-Posting

Saat mempublikasikan artikel di platform lain (Medium, Dev.to, dll.), selalu sertakan dua blok teks berikut:

### Di awal artikel (canonical notice)

> *Originally published on [blog.pikomo.top](https://blog.pikomo.top)*

Taruh tepat sebelum paragraf pertama, sesudah judul/subtitle platform.

### Di akhir artikel (CTA)

> *If this was useful, find more posts at [blog.pikomo.top](https://blog.pikomo.top) — or connect on [LinkedIn](https://linkedin.com/in/piko-monde) · [GitHub](https://github.com/pikomonde) · [Ko-fi](https://ko-fi.com/pikomonde)*

Taruh setelah paragraf terakhir konten, sebelum tag/topic platform.

### Catatan

- Cukup link ke `blog.pikomo.top` saja — tidak perlu link ke artikel spesifik lain
- Tidak perlu tambah link `/support` di CTA artikel — terlalu banyak pilihan justru mengurangi konversi
- Canonical URL di settings platform (Medium: "Import story" atau canonical field, Dev.to: `canonical_url` di frontmatter) tetap wajib diset ke URL artikel spesifik di blog

