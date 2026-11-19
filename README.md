# 🤖 Hams Auto Order v1 — Open Source Edition

Bot Telegram Auto-Order Produk Digital (App Prem, Akun, Voucher, Lisensi) **Versi 1 (Open Source / Free)** berbasis **Node.js + Telegraf + SQLite (WAL Mode)** dengan integrasi penuh **QRIS Payment Gateway Veyra Pay (`https://pay.veyra.id`)**, **Dashboard Profil**, dan **Force Subscribe Real-Time**.

> **Butuh fitur All-in-One di v2 (Commercial)?**
> **Hams Auto Order v2** menambahkan modul **Nokos / Virtual OTP (SMSCode API v1 IDR + Auto-Refund)**, **Keranjang Multi-Produk**, **Reseller Tier**, **Referral Komisi Otomatis**, **Flash Sale Promo**, **Riwayat & Unduh Ulang Akun**, **Notif Restok Otomatis**, **Export Excel CSV**, **Channel Auto-Testimoni**, **Live Chat CS**, **Mode Maintenance**, **Auto-Backup Harian**, dan **Inspeksi User/Channel**. Hubungi developer di bagian [Kontak & Support](#-kontak--support).

---

## 📑 Daftar Isi
1. [Perbandingan v1 vs v2](#-perbandingan-v1-vs-v2)
2. [Penjelasan Detail Setiap Fitur (v1)](#-penjelasan-detail-setiap-fitur-v1)
3. [Struktur Direktori & Penjelasan Setiap File Kode](#-struktur-direktori--penjelasan-setiap-file-kode)
4. [Prasyarat & Instalasi (Lokal, VPS PM2, Pterodactyl)](#-prasyarat--instalasi)
5. [Referensi Lengkap Variabel `.env`](#-referensi-lengkap-variabel-env)
6. [Daftar Lengkap Command User & Admin](#-daftar-lengkap-command-user--admin)
7. [Automated Testing (`npm test`)](#-automated-testing)
8. [Troubleshooting](#-troubleshooting)
9. [Kontak & Support](#-kontak--support)

---

## 📊 Perbandingan v1 vs v2

| Fitur | 🆓 v1 (Open Source) | 💎 v2 (Commercial) |
| :--- | :---: | :---: |
| Katalog Kategori, Produk & Stok (`akun` & `plain`) | ✅ | ✅ |
| Integrasi Penuh **Veyra Pay** (QRIS Polling + **Webhook HMAC** + **Withdraw PIN** + **VIP**) | ✅ | ✅ |
| Sistem Saldo Bot, `/deposit`, & Tombol `🔄 Cek Status Pembayaran` | ✅ | ✅ |
| Pengiriman File Akun `.txt` Otomatis + `/batal` + Auto-Refund Jika Stok Habis | ✅ | ✅ |
| **Dashboard Profil Lengkap** (`/start` & `/profil`) & **Force Subscribe** (`/forcesub`) | ✅ | ✅ |
| Database **SQLite ACID (WAL Mode)** + Auto-Migrasi JSON + Instant Save | ✅ | ✅ |
| Keamanan `.env` + Backup Lintas OS (`adm-zip`) + Menu Shortcut Slash (`/`) | ✅ | ✅ |
| **Modul Nokos / Nomor Virtual OTP (SMSCode v1 IDR)** + Auto-Polling + Auto-Refund | ❌ | ✅ |
| **Keranjang Multi-Produk** (`/keranjang`) & Pencarian Produk (`/cari`) | ❌ | ✅ |
| **Riwayat Order & Unduh Ulang File `.txt`** (`/riwayat`) + **Notif Restok** | ❌ | ✅ |
| **Sistem Reseller / Tier Harga**, **Referral Komisi**, & **Flash Sale Promo** | ❌ | ✅ |
| **Channel Auto-Testimoni**, **Live Chat CS (`/bantuan`)**, & **Mode Maintenance** | ❌ | ✅ |
| **Export Laporan Excel/CSV** (`/exportrekap`) & **Auto-Backup Harian** | ❌ | ✅ |
| **Inspeksi Data User & Grup/Channel** (`/listuser` 1-klik, `/cekuser`, `/listchat`) | ❌ | ✅ |

---

## ✨ Penjelasan Detail Setiap Fitur (v1)

### 1. Integrasi Penuh Payment Gateway Veyra Pay (`https://pay.veyra.id`)
- **Pembuatan QRIS Dinamis (`POST /api/deposit`):** Setiap transaksi mengirim header `x-api-key` dan `Idempotency-Key` unik untuk mencegah duplikasi tiket. Veyra Pay mengembalikan `qr_string` (di-render lokal ke gambar QR via `qrcode`), `qr_image` (fallback), `fee` (kode unik), dan `total`.
- **Dual Mode Konfirmasi (Polling + Webhook):**
  - **Polling (Default, 15 detik):** Langsung jalan di lokal/Pterodactyl tanpa butuh domain/SSL. Dilengkapi lock anti-overlap (`isPollingVeyra`) dan lock anti-double delivery (`processingPayments`).
  - **Webhook Real-Time (Opsional untuk VPS):** Endpoint Express (`POST /veyra-webhook`) memverifikasi header `X-Webhook-Signature` menggunakan **HMAC SHA-256** (`crypto.timingSafeEqual`).
- **Tombol `🔄 Cek Status Pembayaran`:** Pembeli bisa memicu cek status manual langsung dari pesan QRIS (dengan cooldown 8 detik agar aman dari rate limit).
- **Pembatalan Otomatis (`POST /api/deposit/:ref/cancel` + fallback `DELETE /api/deposit/:ref`):** Saat user klik **❌ Batalkan Pembayaran**, ketik `/batal`, atau melewati batas expired, tiket di Veyra Pay ikut dibatalkan, foto QRIS dihapus dari chat, dan kuota promo dikembalikan.
- **Withdraw + Keamanan PIN (`POST /api/withdraw`):** Owner dapat menarik saldo langsung dari Telegram ke E-Wallet (`dana`, `gopay`, `ovo`, `shopeepay`, `linkaja`, `isaku`) maupun Bank (`seabank`, `bca`, `bni`, `bri`, `mandiri`, `bsi`, dll.) dengan perintah `/withdraw <metode> <nomor> <nominal> <pin>`. Pesan perintah yang mengandung PIN **otomatis langsung dihapus** dari riwayat chat Telegram.
- **VIP Veyra Pay & Monitoring:** Mendukung `/ceksaldoveyra` (`GET /api/user/me`), `/riwayatveyra` (`GET /api/user/transactions`), `/subscribevip` (`POST /api/user/subscribe`), dan `/setkodeunik <min> <max>` (`POST /api/user/custom-unik`).

### 2. Katalog Produk Digital & Pengiriman Otomatis
- Mendukung multi-kategori (`/addkategori`) dan 2 format stok per produk:
  - **`akun`:** Format `email|password|profil|pin|2fa` — otomatis dirapikan saat dikirim di file `.txt`.
  - **`plain`:** Format teks bebas (1 baris = 1 stok), cocok untuk kode voucher, redeem key, atau link invite.
- **Proteksi Stok Habis Saat QRIS Pending:** Jika stok produk habis oleh pembeli lain saat QRIS user sedang menunggu pembayaran, dana QRIS yang masuk **otomatis di-refund ke Saldo Bot pembeli** sehingga tidak pernah mengirim akun kosong.
- **Notifikasi Stok Menipis (`/setnotifstok`):** Bot otomatis mengirim peringatan ke Owner saat stok turun di bawah ambang batas.

### 3. Sistem Saldo Bot, Deposit, Promo & Ulasan
- Pembeli bisa deposit saldo kapan saja via `/deposit <nominal>` (QRIS Veyra Pay) dan membayar produk secara instan via **Saldo Bot** (dengan guard anti-double-click).
- Voucher promo dasar (`/addpromocode`) mendukung diskon `persen` (dengan opsional batas `max_discount`) maupun potongan tetap `fixed` berbasis kuota.
- Setelah transaksi selesai, pembeli bisa memberi rating 1–5 bintang dan ulasan lewat `/review`, dan calon pembeli bisa mengecek ulasan produk lewat tombol inline.

### 4. Dashboard Profil & Force Subscribe Real-Time
- **Dashboard Profil (`/start` & `/profil`):** Langsung menampilkan ID Telegram (bisa diketuk untuk salin), nama, username, tanggal pertama bergabung (`joined_at`), saldo bot, total order, dan total pengeluaran.
- **Force Subscribe (`/forcesub`):** Middleware global yang mengecek keanggotaan user secara real-time ke Channel wajib (dan opsional Grup) via Telegram `getChatMember` dengan micro-cache 15 detik. Jika user belum join — atau keluar dari channel di kemudian hari — seluruh aksi bot otomatis terkunci dan menampilkan tombol gabung + tombol `✅ Sudah Bergabung / Cek Akses`.

### 5. Database SQLite WAL, Stabilitas & Keamanan
- **SQLite ACID (`node:sqlite` WAL Mode):** Menggantikan penulisan JSON mentah yang rawan corrupt. Jika terdapat `options/database.json` lama, data otomatis dimigrasi 1x ke `options/database.sqlite`.
- **Instant Save (`saveDbNow()`):** Setiap transaksi uang/saldo langsung ditulis ke disk SQLite secara sinkron agar 0% risiko kehilangan saldo saat server mati mendadak.
- **Startup Auto-Retry & Global Error Handler:** `launchBotWithRetry()` otomatis mencoba ulang saat koneksi awal terkena `ECONNRESET`, ditambah `bot.catch`, `unhandledRejection`, dan graceful shutdown `db.close()` pada `SIGINT`/`SIGTERM`.
- **Validasi Owner Ganda:** Menggunakan `OWNER_ID` dan `OWNER_USERNAME` sehingga akses Owner tetap aman meski username Telegram berubah.

---

## 🗂️ Struktur Direktori & Penjelasan Setiap File Kode

```text
AUTO-ORDER-FREE/
├── ham.js                    # Process supervisor (spawn main.js & auto-restart saat crash/reset)
├── main.js                   # Inti bot: Telegraf, Force-Sub middleware, Veyra Pay polling/webhook, callback inline, & owner commands
├── index.js                  # Handler pesan teks, Reply Keyboard, & slash command (/stok, /buy, /addproduk, /addstok, /backup, dll.)
├── setting.js                # Jembatan konfigurasi: memuat .env ke global.*, thumbnail, template pesan global.mess, & hot-reload
├── ecosystem.config.js       # Konfigurasi PM2 untuk menjalankan bot 24/7 di VPS Linux
├── package.json              # Metadata proyek, dependency bersih, & script npm start / npm test
├── .env.example              # Template variabel environment (salin menjadi .env)
├── .gitignore                # Mencegah .env, node_modules, database.sqlite, & file sementara masuk ke Git
├── function/
│   ├── env.js                # Zero-dependency .env parser (memuat .env ke process.env tanpa overwrite)
│   ├── database.js           # Engine database SQLite (node:sqlite WAL) + auto-migrasi database.json + fallback JSON atomik
│   ├── veyra.js              # Client H2H API Veyra Pay lengkap (deposit, status, cancel+DELETE fallback, withdraw+PIN, VIP, HMAC webhook)
│   ├── forcesub.js           # Engine Force Subscribe (getChatMember real-time, micro-cache 15 detik, & builder tombol gate)
│   ├── features.js           # Helper inti: rate limiter, validator promo dasar, backup adm-zip lintas OS, profil user, & validasi Owner
│   ├── guides.js             # Builder teks & tombol interaktif untuk Panduan User (/panduan) dan Panduan Admin (/panduanadmin)
│   ├── myfunc.js             # Utilitas umum: sleep, runtime formatter, escapeMarkdown (legacy-safe), & displayProductReviews
│   └── respon-testi.js       # Helper CRUD auto-respon testimoni gambar (/addtesti, /deltesti, /testi)
├── options/
│   ├── database.json         # Template database awal (otomatis dimigrasi ke options/database.sqlite saat pertama jalan)
│   └── image/thumbnail.jpg   # Gambar thumbnail menu bot
└── test/
    └── run-tests.js          # Automated Test Suite (syntax check semua file, SQLite, Veyra Pay, Force-Sub, promo, backup)
```

---

## 🚀 Prasyarat & Instalasi

### Prasyarat
- **Node.js v22.5+** *(wajib v22+ agar `node:sqlite` aktif otomatis tanpa kompilasi C++).*
- **Token Bot Telegram** dari [@BotFather](https://t.me/BotFather).
- **API Key Veyra Pay** dari dashboard [pay.veyra.id](https://pay.veyra.id).

### 1. Instalasi Lokal (Windows / Linux / macOS)
```bash
npm install
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
# Edit file .env lalu isi BOT_TOKEN, OWNER_ID, OWNER_USERNAME, dan APIKEY_VEYRA
npm test                   # Pastikan semua tes otomatis PASS
npm start                  # Jalankan bot
```

### 2. Deploy 24/7 di VPS Linux (Ubuntu/Debian + PM2)
```bash
npm install -g pm2
npm install --omit=dev
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Deploy di Panel Pterodactyl
1. Upload semua file ke `/home/container` (kecuali `node_modules`).
2. Gunakan Docker Image **Node.js 22**.
3. Buat/edit file `.env` lewat File Manager panel.
4. Jalankan `npm install --omit=dev` lalu atur Startup File ke `ham.js` atau `main.js`.

---

## ⚙️ Referensi Lengkap Variabel `.env`

| Variabel | Default | Keterangan | Persisten di SQLite? |
| :--- | :--- | :--- | :---: |
| `BOT_TOKEN` | — | Token bot Telegram dari `@BotFather` *(Wajib)* | `.env` |
| `BOT_NAME` | `Hams Auto Order` | Nama toko/bot yang tampil di header & struk | `.env` |
| `URL_BOT` | `t.me/...` | URL bot Telegram Anda | `.env` |
| `OWNER_ID` | — | Numeric Telegram User ID Owner *(Wajib, cek via `/id`)* | `.env` |
| `OWNER_NAME` | `Hams - Offc` | Nama Owner yang ditampilkan ke pembeli | `.env` |
| `OWNER_NUMBER` | `628...` | Nomor kontak Owner (untuk command `/owner`) | `.env` |
| `OWNER_USERNAME` | — | Username Telegram Owner tanpa `@` | `.env` |
| `CHANNEL` | — | Link channel info/update yang tampil di `/start` | `.env` |
| `FORCE_SUB_ENABLED` | `false` | Master switch Wajib Join (`true`/`false`) | Ya (`/forcesub`) |
| `FORCE_SUB_CHANNEL_ENABLED` | `true` | Aktifkan wajib join Channel | `.env` |
| `FORCE_SUB_CHANNEL` | — | Username `@channel` atau Chat ID `-100...` | `.env` |
| `FORCE_SUB_CHANNEL_URL` | — | URL tombol direct ke channel | `.env` |
| `FORCE_SUB_GROUP_ENABLED` | `false` | Opsional: aktifkan wajib join Grup | `.env` |
| `FORCE_SUB_GROUP` | — | Username `@grup` atau Chat ID `-100...` | `.env` |
| `FORCE_SUB_GROUP_URL` | — | URL invite tombol direct ke grup | `.env` |
| `VEYRA_BASE_URL` | `https://pay.veyra.id` | Base URL API Veyra Pay | `.env` |
| `APIKEY_VEYRA` | — | API Key Merchant Veyra Pay *(Wajib)* | `.env` |
| `VEYRA_WD_PIN` | *(kosong)* | Opsional: PIN Withdraw default (kosongkan agar ketik manual) | `.env` |
| `VEYRA_EXPIRE_MINUTES` | `15` | Fallback batas waktu QRIS (menit) | `.env` |
| `QRIS_FEE_PERCENT` / `FIXED` | `0` / `0` | Biaya tambahan opsional bot (0 karena Veyra otomatis pakai kode unik) | `.env` |
| `VEYRA_WEBHOOK_ENABLED` | `false` | `true` untuk mengaktifkan Express Webhook Server di VPS | `.env` |
| `VEYRA_WEBHOOK_PORT` | `3000` | Port lokal server webhook | `.env` |
| `VEYRA_WEBHOOK_PATH` | `/veyra-webhook` | Path endpoint webhook | `.env` |
| `VEYRA_WEBHOOK_SECRET` | *(kosong)* | Secret key HMAC SHA-256 dari Dashboard Veyra Pay | `.env` |

---

## 📖 Daftar Lengkap Command User & Admin

### Sisi Pengguna (Pembeli)
- `/start` — Dashboard profil, statistik pribadi, & keyboard utama
- `/stok` atau tombol **List Produk** — Lihat kategori & beli produk digital
- `/buy <idproduk> <jumlah>` — Beli produk langsung via perintah teks
- `/deposit <nominal>` atau tombol **Deposit** — Topup saldo bot via QRIS Veyra Pay
- `/saldo` — Cek sisa saldo bot
- `/profil` atau tombol **Profil Saya** — Lihat ID Telegram, tanggal daftar, & total belanja
- `/panduan` atau tombol **Cara Order** — Panduan interaktif cara order & bayar QRIS
- `/batal` — Batalkan transaksi/deposit QRIS aktif
- `/review <reff>|<1-5>|<ulasan>` & `/listreviews <idproduk>` — Rating & ulasan produk
- `/id` / `/cekid` — Cek User ID & Chat ID (mendukung reply user & forward channel)
- `/kalkulator <angka1> <angka2>` — Kalkulator cepat

### Sisi Admin / Owner
- **Panduan & Menu:** `/panduanadmin`, tombol **Menu Admin**
- **Kategori & Produk:** `/addkategori`, `/delkategori`, `/listkategori`, `/addproduk`, `/delproduk`, `/setharga`, `/setprofit`, `/setjudul`, `/setdesk`, `/setsnk`, `/setprodukformat <id>|<akun|plain>`, `/addstok`, `/delstok`, `/setnotifstok`
- **Promo & Saldo:** `/addpromocode <KODE>|<persen|fixed>|<nilai>|<kuota>|[max_diskon]`, `/delpromocode`, `/listpromocode`, `/topup <uid> <nominal>`
- **Veyra Pay:** `/ceksaldoveyra`, `/withdraw <metode> <nomor> <nominal> <pin>`, `/riwayatveyra`, `/setkodeunik <min> <max>`, `/subscribevip`
- **Sistem & Laporan:** `/rekap`, `/forcesub <on|off|status>`, `/backup`, `/broadcast <pesan>`, `/done`, `/proses`, `/addtesti`, `/deltesti`

---

## 🧪 Automated Testing
```bash
npm test
```
Memverifikasi sintaks seluruh 13 file `.js`, keamanan repo (tidak ada `.env` rahasia/modul Pro), `.env` loader, persistensi SQLite + auto-migrasi JSON, HMAC SHA-256 & validasi Withdraw Veyra Pay, Force-Sub real-time + deteksi keluar, promo, panduan, dan backup `adm-zip`.

---

## 🛠️ Troubleshooting
- **Force-Sub selalu menolak padahal user sudah join:** Jadikan bot sebagai **Admin** di channel/grup target, lalu cek status dengan `/forcesub status`.
- **Withdraw gagal `PIN Keamanan diperlukan!`:** Gunakan format lengkap `/withdraw <metode> <nomor> <nominal> <pin>` (pesan PIN otomatis dihapus dari chat).
- **Webhook Veyra Pay tidak masuk di VPS:** Pastikan IP server Veyra Pay **`103.177.100.55`** sudah di-whitelist pada firewall/Cloudflare WAF.

---

## 📞 Kontak & Support

Ada pertanyaan, butuh bantuan instalasi, request custom fitur, atau tertarik upgrade ke **Hams Auto Order v2 (Commercial)**? Hubungi developer langsung melalui:

- **Telegram:** [@hamsoffc23](https://t.me/hamsoffc23) (`https://t.me/hamsoffc23`)
- **WhatsApp:** [085781549773](https://wa.me/6285781549773) (`085781549773`)

