# PikoMo Analytics — Design Decision Summary

Ini adalah briefing untuk setup dan maintenance analytics di hosting cPanel PikoMo.
Bawa file ini ke chat baru sebagai konteks awal.

---

## Tentang Setup Analytics

- **Tool:** Matomo (self-hosted) + Google Analytics 4 — keduanya dikelola via Google Tag Manager
- **GTM Container ID:** `GTM-P8F5LQD2` — satu container untuk semua subdomain `*.pikomo.top`
- **Matomo URL:** https://internal.pikomo.top/analytics
- **Matomo Stack:** PHP + MySQL — native di cPanel, tidak butuh Node.js/Passenger
- **Hosting:** cPanel shared hosting (sama dengan blog), DomaiNesia
- **Tujuan:** Dual analytics — Matomo untuk privacy-first data, GA4 untuk integrasi Google Search Console
- **Status:**
  - ✅ Matomo terinstall dan aktif
  - ✅ GTM container aktif (`GTM-P8F5LQD2`)
  - ✅ GA4 + Matomo tag sudah fired untuk `blog.pikomo.top`
  - ⏳ `www.pikomo.top` belum diupdate (masih pakai gtag.js langsung, belum migrasi ke GTM)

---

## Arsitektur Analytics

```
*.pikomo.top
    └── GTM Container (GTM-P8F5LQD2)
            ├── Tag: GA4 - blog.pikomo.top     → G-EES94E7BJB   (trigger: hostname = blog.pikomo.top)
            ├── Tag: GA4 - www.pikomo.top      → G-YY7Y732ZH5   (trigger: hostname = www.pikomo.top)
            ├── Tag: Matomo - blog.pikomo.top  → Site ID 1       (trigger: hostname = blog.pikomo.top)
            └── Tag: Matomo - www.pikomo.top   → Site ID 2       (trigger: hostname = www.pikomo.top)
```

Setiap tag hanya fire di hostname yang sesuai — tidak ada cross-fire antar site.

---

## GA4 Setup

### Property & Measurement IDs

| Site | Measurement ID | Stream Name |
|---|---|---|
| `www.pikomo.top` | `G-YY7Y732ZH5` | PikoMo www |
| `blog.pikomo.top` | `G-EES94E7BJB` | PikoMo Blog |

Semua stream di bawah satu GA4 property yang sama — bisa lihat aggregate atau filter per stream.

### Kenapa pisah stream, bukan gabung?

- blog dan www punya pertanyaan analitik yang berbeda (artikel vs portfolio)
- Pisah stream = bisa isolasi data per site, tapi tetap bisa aggregate di GA4 Exploration
- Cross-domain journey ditangani Matomo (yang sudah setup `setCookieDomain: *.pikomo.top`)
- Trade-off: GA4 cross-domain attribution kurang akurat kalau user journey lintas stream — ini diterima, karena Matomo yang handle cross-domain

### Tag di GTM (tipe: Google Tag)

Sejak update GTM terbaru, "GA4 Configuration" berganti nama menjadi **Google Tag**. Fungsinya sama.

```
Tag: GA4 - blog.pikomo.top
  Type: Google Tag
  Tag ID: G-EES94E7BJB
  Trigger: Pageview - blog.pikomo.top (hostname equals blog.pikomo.top)

Tag: GA4 - www.pikomo.top
  Type: Google Tag
  Tag ID: G-YY7Y732ZH5
  Trigger: Pageview - www.pikomo.top (hostname equals www.pikomo.top)
```

---

## Matomo Setup

### Site IDs

| Site | Site ID |
|---|---|
| `blog.pikomo.top` | 1 |
| `www.pikomo.top` | 2 |

### Kenapa pindah dari direct script ke GTM?

Sebelumnya Matomo dipasang langsung di `BaseHead.astro` sebagai direct script. Sekarang dikelola via GTM supaya:
- Satu tempat untuk manage semua analytics (GA4 + Matomo)
- Tidak perlu edit kode setiap kali ada perubahan tracking
- Trigger per hostname lebih clean dikelola di GTM

### Tag di GTM (tipe: Custom HTML)

```html
<!-- Tag: Matomo - blog.pikomo.top (Site ID 1) -->
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['setCookieDomain', '*.pikomo.top']);
  _paq.push(['setDomains', ['*.pikomo.top']]);
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="//internal.pikomo.top/analytics/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '1']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
</script>
```

```html
<!-- Tag: Matomo - www.pikomo.top (Site ID 2) -->
<!-- Script sama, ganti setSiteId ke '2' -->
```

### Cross-domain tracking

`setCookieDomain` dan `setDomains` dipasang di semua tag Matomo supaya journey user lintas subdomain (misal: blog → links → www) terhitung sebagai satu session.

---

## GTM Setup

### Container

- **Container ID:** `GTM-P8F5LQD2`
- **Scope:** semua subdomain `*.pikomo.top`

### Variables yang diaktifkan

Di GTM → Variables → Configure, centang:
- `Page Hostname` ✅
- `Page URL` ✅

### Triggers

```
Trigger: Pageview - blog.pikomo.top
  Type: Page View
  Fires on: Some Page Views
  Condition: Page Hostname equals blog.pikomo.top

Trigger: Pageview - www.pikomo.top
  Type: Page View
  Fires on: Some Page Views
  Condition: Page Hostname equals www.pikomo.top
```

### GTM Snippet

Snippet yang sama dipasang di semua site. Untuk Astro, wajib pakai `is:inline`.

**Di `<head>` (script):**
```html
<!-- Google Tag Manager -->
<script is:inline>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P8F5LQD2');
</script>
<!-- End Google Tag Manager -->
```

**Di `<body>` (noscript — fallback untuk browser tanpa JS, sangat jarang):**
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P8F5LQD2"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

---

## Integrasi per Site

### blog.pikomo.top (`src/components/BaseHead.astro`)

Script Matomo direct yang lama **sudah digantikan** dengan GTM snippet.
GTM snippet dipasang di `BaseHead.astro` dengan `is:inline`.

Noscript ditambah di:
- `src/layouts/BlogPost.astro` — tepat setelah tag `<body>`
- `src/pages/index.astro` — tepat setelah tag `<body>`

### www.pikomo.top (`index.html`)

⚠️ **Belum dimigrasi** — masih pakai gtag.js langsung. Lihat TODO di bawah.

---

## Custom Events — www.pikomo.top

Setelah migrasi ke GTM, semua `gtag('event', ...)` di `www/index.html` harus diganti dengan `dataLayer.push()`:

```js
// Lama (gtag langsung):
gtag('event', 'navigation_click', {
  'event_label': '...',
  'destination': '...'
});

// Baru (via dataLayer):
dataLayer.push({
  'event': 'navigation_click',
  'event_label': '...',
  'destination': '...'
});
```

Daftar events yang perlu dimigrasi di `www/index.html`:

| Event lama (gtag) | Event baru (dataLayer) |
|---|---|
| `navigation_click` | `navigation_click` |
| `toggle_theme` | `toggle_theme` |
| `crypto_modal_open` | `crypto_modal_open` |
| `wallet_copy` | `wallet_copy` |

---

## Kenapa Pindah dari Umami ke Matomo (Histori)

Umami (Node.js + PostgreSQL) dicoba dulu tapi gagal karena dua kendala di shared hosting DomaiNesia:

1. **Inode habis** — Node.js app dengan `node_modules/` menghabiskan inode hosting secara masif. Shared hosting DomaiNesia punya limit inode yang ketat, bukan hanya limit storage.
2. **Storage hampir penuh** — Pemakaian sempat mencapai ~1.2GB (dari total 2GB). Meski masih cukup secara MB, inode sudah habis duluan.

Matomo PHP dipilih karena:
- **PHP + MySQL** — stack yang sudah native di cPanel, tidak ada overhead `node_modules`
- **Install via Softaculous** — 1-click, tidak perlu konfigurasi manual Passenger/env vars
- **Inode jauh lebih hemat** — tidak ada ribuan file `node_modules`
- **Fitur lebih lengkap** — goals, segmentasi, live tracking, dll.

---

## Struktur di Server

```
/home/pikomoto/
  internal.pikomo.top/
    analytics/              ← Matomo PHP files (diinstall via Softaculous)
      config/
        config.ini.php      ← Konfigurasi Matomo (DB credentials, dll.)
      tmp/                  ← Cache Matomo
    .htaccess               ← Options -Indexes (cegah directory listing)
```

---

## Instalasi Matomo (Referensi)

Matomo diinstall via **Softaculous Apps Installer** di cPanel:

1. cPanel → Softaculous Apps Installer → search "Matomo" → Install
2. Isi form:
   - Protocol: `https://`
   - Domain: `internal.pikomo.top`
   - In Directory: `analytics`
   - Database: auto-generate oleh Softaculous
3. Softaculous otomatis buat database MySQL, user, dan jalankan installer

---

## Database

- **Engine:** MySQL (auto-dibuat Softaculous)
- **Host:** `localhost`
- **Database name:** konvensi cPanel `pikomoto_XXXX` (lihat di Softaculous → Installations)
- **Credentials:** tersimpan di `internal.pikomo.top/analytics/config/config.ini.php`

**Penting:** Jangan aktifkan remote DB access. Biarkan lokal saja.

---

## Keputusan Domain

- **Subdomain:** `internal.pikomo.top` dengan path `/analytics`
- **Alasan tidak pakai `analytics.pikomo.top`:** Fleksibilitas — kalau nanti tambah service internal lain, bisa taruh di `internal.pikomo.top/service-lain` tanpa buat subdomain baru
- **Kenapa tidak pakai nama acak** (seperti `analytics-xk92d.pikomo.top`): Security through obscurity bukan security yang sesungguhnya. Semua subdomain yang dapat SSL tercatat publik di [crt.sh](https://crt.sh). Proteksi sebenarnya adalah password yang kuat.

### Fix Directory Listing

```apache
# /home/pikomoto/internal.pikomo.top/.htaccess
Options -Indexes
```

---

## Update Matomo

Tidak pakai CD pipeline — update via Softaculous atau dashboard Matomo:

- **Via dashboard Matomo:** Admin → System Check → ada notifikasi kalau ada update baru → klik Update
- **Via Softaculous:** cPanel → Softaculous → My Installations → Update

Cek release notes sebelum update: https://github.com/matomo-org/matomo/releases

---

## Manajemen Storage

Matomo PHP jauh lebih hemat inode dibanding Umami Node.js. Pantau tetap perlu:

- Set data retention: **Matomo Dashboard → Administration → Privacy → Data Retention → 12 bulan**
- Monitor storage rutin via cPanel → Disk Usage
- **Warning threshold:** kalau storage sudah di atas 1.8GB, segera cek

Estimasi database growth: ~1GB per 5 juta pageview. Untuk blog personal, ini sangat aman.

---

## Untuk Nanti: links.pikomo.top (atau card.pikomo.top)

Keputusan nama belum final (kandidat: `links.pikomo.top` vs `card.pikomo.top`). Setelah site-nya jadi:

1. **GA4:** Admin → Data Streams → Add stream → Web → `links.pikomo.top` → catat Measurement ID
2. **Matomo:** Administration → Websites → Add → `links.pikomo.top` → dapat Site ID 3
3. **GTM:** Tambah trigger baru `Pageview - links.pikomo.top`, buat tag GA4 + Matomo dengan hostname condition yang sesuai
4. **Hash-based navigation tracking** (karena site ini SPA-like dengan `#links`, `#projects`, dll):

```js
// Matomo virtual pageview on hash change
window.addEventListener('hashchange', () => {
  _paq.push(['setCustomUrl', window.location.href]);
  _paq.push(['setDocumentTitle', 'Card - ' + window.location.hash]);
  _paq.push(['trackPageView']);
});

// GA4 via dataLayer
window.addEventListener('hashchange', () => {
  dataLayer.push({
    'event': 'virtual_pageview',
    'page_path': window.location.pathname + window.location.hash,
    'page_title': 'Card - ' + window.location.hash
  });
});
```

---

## TODO

- [x] Install Matomo via Softaculous
- [x] Verifikasi live tracking aktif di Matomo dashboard
- [x] Setup GTM container (`GTM-P8F5LQD2`)
- [x] Buat GA4 stream untuk `blog.pikomo.top` (`G-EES94E7BJB`)
- [x] Buat Matomo Site ID 2 untuk `www.pikomo.top`
- [x] Buat 4 tags di GTM (GA4 + Matomo × blog + www)
- [x] Buat 2 triggers di GTM (per hostname)
- [x] Migrasi `BaseHead.astro` blog dari direct Matomo script ke GTM snippet
- [x] Verifikasi GTM Preview Mode — tags fired untuk `blog.pikomo.top` ✅
- [ ] **Migrasi `www.pikomo.top/index.html`** — ganti gtag.js direct dengan GTM snippet:
  - Hapus blok `<script async src="https://www.googletagmanager.com/gtag/js?id=G-YY7Y732ZH5">` dan gtag config
  - Pasang GTM snippet `GTM-P8F5LQD2` di `<head>`
  - Pasang noscript `GTM-P8F5LQD2` setelah `<body>`
  - Ganti semua `gtag('event', ...)` dengan `dataLayer.push({event: ...})` — lihat tabel events di atas
- [ ] Verifikasi GTM Preview Mode untuk `www.pikomo.top` setelah migrasi
- [ ] Set data retention 12 bulan di Matomo (Administration → Privacy → Data Retention)
- [ ] Tambah `.htaccess` di `internal.pikomo.top` untuk disable directory listing (kalau belum)
- [ ] Setup cron job untuk archiving laporan Matomo (opsional — kalau dashboard terasa lambat):
  - cPanel → Cron Jobs → tambah: `5 * * * * php /home/pikomoto/internal.pikomo.top/analytics/console core:archive --url=https://internal.pikomo.top/analytics > /dev/null 2>&1`
- [ ] Setup analytics untuk `links.pikomo.top` (atau `card.pikomo.top`) setelah site-nya jadi — lihat section "Untuk Nanti" di atas
- [X] Tambah noscript GTM di `BlogPost.astro` dan `index.astro` setelah tag `<body>`
