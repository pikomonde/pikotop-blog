# PikoMo Analytics — Design Decision Summary

Ini adalah briefing untuk setup dan maintenance Matomo Analytics di hosting cPanel PikoMo.
Bawa file ini ke chat baru sebagai konteks awal.

---

## Tentang Setup Analytics

- **Tool:** Matomo (self-hosted, open source) — via Softaculous cPanel
- **URL:** https://internal.pikomo.top/analytics
- **Stack:** PHP + MySQL — native di cPanel, tidak butuh Node.js/Passenger
- **Hosting:** cPanel shared hosting (sama dengan blog), DomaiNesia
- **Tujuan:** Privacy-first analytics untuk blog.pikomo.top (dan nanti www.pikomo.top)
- **Status:** ✅ Terinstall dan aktif — live tracking sudah berjalan

---

## Kenapa Pindah dari Umami ke Matomo

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

## Instalasi

Matomo diinstall via **Softaculous Apps Installer** di cPanel:

1. cPanel → Softaculous Apps Installer → search "Matomo" → Install
2. Isi form:
   - Protocol: `https://`
   - Domain: `internal.pikomo.top`
   - In Directory: `analytics`
   - Database: auto-generate oleh Softaculous
3. Softaculous otomatis buat database MySQL, user, dan jalankan installer

Tidak perlu setup manual `.env`, SSH, atau konfigurasi Passenger.

---

## Database

- **Engine:** MySQL (auto-dibuat Softaculous)
- **Host:** `localhost`
- **Database name:** konvensi cPanel `pikomoto_XXXX` (lihat di Softaculous → Installations)
- **Credentials:** tersimpan di `internal.pikomo.top/analytics/config/config.ini.php`

**Penting:** Jangan aktifkan remote DB access. Biarkan lokal saja.

---

## Integrasi ke Blog

Tracking script dipasang di `BaseHead.astro` dengan `is:inline` untuk menghindari TypeScript error di Astro:

```astro
<!-- Matomo -->
<script is:inline>
  var _paq = window._paq = window._paq || [];
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
<!-- End Matomo Code -->
```

**Catatan `is:inline`:** Wajib dipakai di Astro. Tanpanya, TypeScript akan error karena `window._paq` tidak dikenal dan `s.parentNode` dianggap possibly null. `is:inline` membuat Astro skip TypeScript processing dan output script apa adanya ke HTML.

**Catatan URL:** `u="//internal.pikomo.top/analytics/"` adalah alamat **server Matomo** (tempat data dikirim), bukan website yang ditrack. Script ini dipasang di `blog.pikomo.top` → data dikirim ke `internal.pikomo.top/analytics`. Ini sudah benar.

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

## Tracking Multi-Site

Satu instance Matomo bisa track banyak website. Kalau `www.pikomo.top` mau ditrack juga:
1. Login Matomo → Administration → Websites → Add New Website
2. Dapat `SiteId` baru
3. Pasang script yang sama (dengan `setSiteId` berbeda) di `www.pikomo.top`

---

## TODO

- [x] Install Matomo via Softaculous
- [x] Integrasi tracking script ke `BaseHead.astro` blog
- [x] Verifikasi live tracking aktif di Matomo dashboard
- [ ] Set data retention 12 bulan (Administration → Privacy → Data Retention)
- [ ] Tambah `.htaccess` di `internal.pikomo.top` untuk disable directory listing (kalau belum)
- [ ] Setup cron job untuk archiving laporan (opsional — kalau dashboard terasa lambat):
  - cPanel → Cron Jobs → tambah: `5 * * * * php /home/pikomoto/internal.pikomo.top/analytics/console core:archive --url=https://internal.pikomo.top/analytics > /dev/null 2>&1`
- [ ] (Opsional) Tambah tracking untuk `www.pikomo.top` juga
