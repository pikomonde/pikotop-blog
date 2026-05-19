# PikoMo Analytics — Design Decision

> Briefing untuk setup dan maintenance analytics di semua subdomain `*.pikomo.top`.
> Bawa file ini ke chat baru sebagai konteks awal.

---

## Daftar Isi

- [1. Keputusan & Alasan](#1-keputusan--alasan)
- [2. Arsitektur](#2-arsitektur)
- [3. Konfigurasi per Site](#3-konfigurasi-per-site)
- [4. GTM Setup](#4-gtm-setup)
- [5. Matomo Setup](#5-matomo-setup)
- [6. GA4 Setup](#6-ga4-setup)
- [7. GDPR & Privacy](#7-gdpr--privacy)
- [8. Maintenance](#8-maintenance)
- [9. TODO](#9-todo)

---

## 1. Keputusan & Alasan

### Tool yang dipakai

| Tool | Status | Alasan |
|---|---|---|
| **Matomo** (self-hosted) | ✅ Aktif | Privacy-first, data tidak keluar server, tidak perlu consent banner untuk sekarang |
| **Google Tag Manager** | ✅ Aktif | Satu container untuk semua site — ubah tracking strategy tanpa deploy ulang |
| **GA4** | ⏸ Di-pause | Tidak ada kebutuhan mendesak; bisa diaktifkan kembali lewat GTM kapanpun |

### Kenapa GTM?

Semua tag (Matomo, GA4, dan apapun yang ditambah nanti) dikelola dari satu tempat. Kalau strategi berubah — misalnya mau aktifkan GA4 untuk keperluan sponsorship, atau tambah consent banner — cukup klik di GTM dashboard tanpa ubah kode Astro atau deploy ulang.

### Kenapa Matomo, bukan Umami?

Umami (Node.js + PostgreSQL) gagal di shared hosting DomaiNesia karena dua alasan:
- **Inode habis** — `node_modules/` menghabiskan inode secara masif, bukan hanya storage
- **Storage hampir penuh** — sempat mencapai ~1.2GB dari total 2GB

Matomo PHP dipilih karena native di cPanel (PHP + MySQL), install via Softaculous, dan inode jauh lebih hemat.

### Kenapa GA4 di-pause?

- Belum ada rencana direct sponsorship dalam waktu dekat
- GA4 kirim data ke server Google (EU data transfer concern)
- Matomo sudah cukup untuk kebutuhan saat ini
- Bisa diaktifkan kembali lewat GTM kapanpun tanpa ubah kode

---

## 2. Arsitektur

```
*.pikomo.top
    └── GTM Container (GTM-P8F5LQD2)
            ├── Tag: GA4 - blog.pikomo.top    [⏸ PAUSED]
            ├── Tag: GA4 - www.pikomo.top     [⏸ PAUSED]
            ├── Tag: Matomo - blog.pikomo.top [✅ ACTIVE]  → Site ID 1
            └── Tag: Matomo - www.pikomo.top  [⏳ PENDING] → Site ID 2
```

Setiap tag hanya fire di hostname yang sesuai — dikontrol via GTM trigger condition.

### Struktur server

```
/home/pikomoto/
  internal.pikomo.top/
    analytics/         ← Matomo PHP (install via Softaculous)
      config/
        config.ini.php ← DB credentials
      tmp/             ← Cache Matomo
    .htaccess          ← Options -Indexes
```

---

## 3. Konfigurasi per Site

| Site | GTM Snippet | Matomo | GA4 |
|---|---|---|---|
| `blog.pikomo.top` | ✅ Di `BaseHead.astro` | ✅ Site ID 1, firing | ⏸ Tag ada, di-pause |
| `www.pikomo.top` | ⏳ Belum dipasang | ⏳ Site ID 2, tag belum firing | ⏸ Tag ada, di-pause |
| `links.pikomo.top` | ⏳ Belum ada | ⏳ Belum setup | ⏳ Belum setup |

---

## 4. GTM Setup

**Container ID:** `GTM-P8F5LQD2`

### Built-in Variables yang diaktifkan

GTM → Variables → Configure → centang:
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

**Di `<head>`** — untuk Astro wajib pakai `is:inline`:

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

**Di `<body>` (noscript)** — fallback untuk browser tanpa JS, practically jarang tapi recommended:

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P8F5LQD2"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

---

## 5. Matomo Setup

**URL:** `https://internal.pikomo.top/analytics`
**Stack:** PHP + MySQL, install via Softaculous
**DB credentials:** tersimpan di `analytics/config/config.ini.php` — jangan enable remote DB access

### Site IDs

| Site | Site ID | Status |
|---|---|---|
| `blog.pikomo.top` | 1 | ✅ Aktif |
| `www.pikomo.top` | 2 | ⏳ Site sudah dibuat, tag GTM belum firing |
| `links.pikomo.top` | 3 (belum dibuat) | ⏳ Tunggu site jadi |

### Tag GTM untuk Matomo (Custom HTML)

```html
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['setCookieDomain', '*.pikomo.top']);
  _paq.push(['setDomains', ['*.pikomo.top']]);
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="//internal.pikomo.top/analytics/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', 'SITE_ID_DISINI']);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
  })();
</script>
```

`setCookieDomain` dan `setDomains` penting untuk cross-domain tracking — user journey dari blog → links → www terhitung satu session.

### Menambah site baru di Matomo

Matomo Administration → Websites → Add a new website → isi URL → dapat Site ID baru.

### Untuk links.pikomo.top (SPA dengan hash navigation)

Karena `#links`, `#projects` dll adalah "halaman" berbeda (bukan scroll anchor biasa), perlu virtual pageview tracking:

```js
// Matomo
window.addEventListener('hashchange', () => {
  _paq.push(['setCustomUrl', window.location.href]);
  _paq.push(['setDocumentTitle', 'Card - ' + window.location.hash]);
  _paq.push(['trackPageView']);
});

// GA4 via dataLayer (kalau GA4 nanti diaktifkan)
window.addEventListener('hashchange', () => {
  dataLayer.push({
    'event': 'virtual_pageview',
    'page_path': window.location.pathname + window.location.hash,
    'page_title': 'Card - ' + window.location.hash
  });
});
```

---

## 6. GA4 Setup

**Status: di-pause. Tag ada di GTM, tidak dihapus — bisa diaktifkan kembali kapanpun.**

### Measurement IDs

| Site | Measurement ID | Status |
|---|---|---|
| `blog.pikomo.top` | `G-EES94E7BJB` | ⏸ Di-pause di GTM |
| `www.pikomo.top` | `G-YY7Y732ZH5` | ⏸ Di-pause di GTM |

### Kapan perlu diaktifkan kembali?

- Mau kejar direct sponsorship → aktifkan GA4 blog, tambah consent banner
- Mau integrasi Google Search Console ke GA4 → aktifkan, link di GA4 Admin

### Kalau nanti diaktifkan: custom events www

Semua `gtag('event', ...)` di `www/index.html` perlu diganti `dataLayer.push()`:

```js
// Lama:
gtag('event', 'navigation_click', { 'event_label': '...', 'destination': '...' });

// Baru:
dataLayer.push({ 'event': 'navigation_click', 'event_label': '...', 'destination': '...' });
```

Events yang perlu dimigrasi: `navigation_click`, `toggle_theme`, `crypto_modal_open`, `wallet_copy`.

---

## 7. GDPR & Privacy

### Status saat ini

- **Matomo:** pakai cookie (`_pk_id`, `_pk_ses`), data di server sendiri, tidak keluar ke pihak ketiga
- **GA4:** di-pause, tidak ada data yang dikirim ke Google
- **Consent banner:** belum dipasang (MVP) — ini keputusan sadar risiko, bukan karena aman

> ⚠️ **Catatan risiko:** Artikel ditulis dalam bahasa Inggris dan di-share dari Medium, Dev.to, Hackernoon — artinya ada EU audience yang masuk. Matomo dengan cookie tanpa consent banner technically tidak GDPR compliant untuk EU visitor. Lihat TODO section untuk rencana mitigasi.

### Yang perlu dilakukan untuk compliance minimal

- Aktifkan **IP anonymization** di Matomo: Administration → Privacy → Anonymize data → anonymize last 2 bytes of IP
- Set **data retention** 12 bulan: Administration → Privacy → Data Retention
- Buat **halaman Privacy Policy** sederhana di blog — isinya cukup: "Site ini menggunakan Matomo Analytics (self-hosted). Data tidak dibagikan ke pihak ketiga." + link opt-out Matomo

### Kalau nanti GA4 diaktifkan kembali

Perlu tambah consent banner (misalnya [Klaro](https://klaro.org) — open source, ~10KB). Setup via GTM: GA4 tag hanya fire setelah user consent, Matomo tetap jalan tanpa consent.

### Keputusan domain analytics

Subdomain `internal.pikomo.top/analytics` dipilih supaya fleksibel kalau nanti ada service internal lain. Security by obscurity tidak dipakai: semua subdomain SSL tercatat publik di [crt.sh](https://crt.sh), proteksi sebenarnya adalah password yang kuat.

---

## 8. Maintenance

### Update Matomo

Via dashboard: Administration → System Check → klik Update kalau ada notifikasi.
Via Softaculous: cPanel → My Installations → Update.
Cek release notes: https://github.com/matomo-org/matomo/releases

### Storage

Estimasi growth: ~1GB per 5 juta pageview — sangat aman untuk blog personal.
Warning threshold: kalau storage di atas 1.8GB, segera cek via cPanel → Disk Usage.

### Cron job archiving (opsional)

Pasang kalau dashboard Matomo terasa lambat saat buka laporan:

```
5 * * * * php /home/pikomoto/internal.pikomo.top/analytics/console core:archive --url=https://internal.pikomo.top/analytics > /dev/null 2>&1
```

---

## 9. TODO

### Segera

- [X] Aktifkan IP anonymization di Matomo (Administration → Privacy → Anonymize data)
- [ ] Set data retention 12 bulan (Administration → Privacy → Data Retention)
- [ ] Tambah `.htaccess` `Options -Indexes` di `internal.pikomo.top` kalau belum ada
- [X] Tambah noscript GTM di `BlogPost.astro` dan `index.astro` setelah tag `<body>`

### www.pikomo.top

- [ ] Pasang GTM snippet di `www/index.html` — hapus blok gtag.js lama, ganti dengan GTM snippet
- [ ] Pasang noscript GTM setelah `<body>`
- [ ] Verifikasi GTM Preview Mode untuk `www.pikomo.top` — pastikan tag Matomo firing, GA4 tidak

### Nanti (kalau sudah ada sitenya)

- [ ] Setup analytics `links.pikomo.top`: GA4 stream baru + Matomo Site ID 3 + GTM trigger baru
- [ ] Pasang hash navigation tracking di `links.pikomo.top` (lihat section 5)

### ⚠️ Backlog: GDPR proper compliance (consent banner)

Saat ini Matomo pakai cookie tanpa consent banner — ini risiko yang diterima untuk MVP. Artikel berbahasa Inggris yang di-share dari Medium/Dev.to/Hackernoon berpotensi dapat EU visitor, artinya GDPR technically berlaku.

Kalau blog mulai tumbuh dan EU audience signifikan, segera kerjakan ini:

- [ ] Switch Matomo ke **cookieless mode** (opsi paling simple, tidak perlu consent banner sama sekali) — atau —
- [ ] Pasang **consent banner** (Klaro, open source ~10KB) via GTM: Matomo jalan tanpa consent (cookieless), GA4 hanya fire setelah user accept
- [ ] Buat halaman **Privacy Policy** di blog — isinya: tool yang dipakai, data apa yang dikumpulkan, link opt-out Matomo
- [ ] Tambah link Privacy Policy di footer blog

### Kalau mau aktifkan GA4 kembali

- [ ] Un-pause tag GA4 di GTM
- [ ] Pasang consent banner (Klaro) via GTM — wajib kalau GA4 aktif dan ada EU audience
- [ ] Ganti semua `gtag('event', ...)` di `www/index.html` ke `dataLayer.push()`
