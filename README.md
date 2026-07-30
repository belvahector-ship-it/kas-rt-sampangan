# Portal Transparansi Kas — RT 01 / RW 04 Sampangan

Situs statis satu arah yang menampilkan pembukuan kas RT secara terbuka: saldo,
jurnal kas masuk-keluar, dan status iuran tiap kepala keluarga — datanya ditarik
langsung dari Google Spreadsheet milik bendahara.

Tidak ada login, tidak ada database, tidak ada langkah build. HTML, CSS, dan
JavaScript murni yang bisa dibuka langsung di peramban atau di-deploy ke
GitHub Pages tanpa konfigurasi tambahan.

Baca `SPEC.md` untuk spesifikasi lengkap dan `DECISIONS.md` untuk alasan di
balik setiap keputusan besar.

---

## Menjalankan di komputer sendiri

Karena tidak ada langkah build, Anda hanya perlu server statis sederhana —
membuka `index.html` langsung lewat `file://` tidak akan berfungsi penuh
karena modul JavaScript (`type="module"`) diblokir kebijakan CORS peramban
pada skema `file://`.

Pilih salah satu:

```bash
# Python (biasanya sudah terpasang)
python -m http.server 8000
# lalu buka http://localhost:8000
```

```bash
# Node, kalau Anda punya npx
npx serve .
```

```bash
# VS Code
# Ekstensi "Live Server" → klik kanan index.html → "Open with Live Server"
```

---

## Menyambungkan ke Google Spreadsheet Anda

### 1. Siapkan spreadsheet

Buat Google Spreadsheet baru dengan **tujuh lembar**, nama harus persis (lihat
`SPEC.md` §7 untuk kolom lengkap tiap lembar):

| Lembar | Isi |
|---|---|
| `Pengaturan` | Kolom `Kunci` / `Nilai` — nama RT, tahun aktif, data bendahara, dll. |
| `Warga` | Daftar KK: `Nama`, `Pagu Iuran`, `Pagu IPAL` |
| `Iuran` | Matrik: `Nama`, lalu 12 kolom `Jan`..`Des` — isi nominal yang dibayar |
| `IPAL` | Sama seperti `Iuran`, untuk pos IPAL |
| `Lelayu` | Sama seperti `Iuran`, untuk dana sosial sukarela |
| `Transaksi` | `Tanggal`, `Jenis` (Masuk/Keluar), `Kategori`, `Jumlah`, `Keterangan` |
| `Kegiatan` | `Tanggal`, `Judul`, `Ringkasan`, `Kategori`, `Gambar` (opsional), `Status` (opsional) |

Tips mengisi:
- Sel matrik yang kosong = belum dibayar. Isi dengan nominal (bukan centang) kalau sudah dibayar.
- Kolom `Gambar` di lembar `Kegiatan` boleh dikosongkan — kartu kegiatan akan
  otomatis memakai tampilan bertipografi kalau tidak ada gambar.
- Baris pertama tiap lembar **wajib** jadi judul kolom.

### 2. Bagikan spreadsheet agar bisa dibaca publik

Klik **Bagikan** (kanan atas) → **Ubah ke siapa saja yang memiliki tautan** →
pastikan perannya **Pelihat (Viewer)**. Situs ini hanya membaca, jadi peran
Editor tidak diperlukan dan sebaiknya dihindari.

### 3. Ambil ID spreadsheet

Dari URL spreadsheet Anda:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                       └──────────── ID ini ────────────┘
```

### 4. Isi konfigurasi

Buka [`assets/js/config.js`](assets/js/config.js) dan isi:

```js
SHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
```

Simpan, muat ulang halaman. Selesai — situs sekarang membaca langsung dari
spreadsheet Anda. Pita kuning "data cadangan" akan hilang dan berganti
menjadi titik hijau "Data langsung" di beranda.

### 5. (Opsional) Cadangan CSV

Kalau organisasi/jaringan Anda memblokir endpoint `gviz` Google, isi juga
`PUBLISHED_ID` dan `GIDS` di `config.js` sebagai jalur cadangan kedua. Cara
mendapatkannya: **Berkas → Bagikan → Publikasikan ke web** di spreadsheet,
lalu salin ID dari tautan yang muncul untuk tiap lembar (gid ada di URL tab
lembar saat dibuka).

### 6. Perbarui data cadangan (snapshot)

Situs menyimpan `data/snapshot.json` sebagai cadangan pihak ketiga — dipakai
otomatis kalau spreadsheet sedang tidak bisa dihubungi. Perbarui berkas ini
sesekali (misalnya tiap semester) supaya cadangannya tidak terlalu using.
Cara termudah: unduh tiap lembar sebagai CSV lalu susun ulang ke bentuk JSON
sesuai struktur di `SPEC.md` §8, atau minta bantuan AI dengan data spreadsheet
terbaru sebagai acuan.

---

## Deploy ke GitHub Pages

Repositori ini disiapkan untuk `github.com/belvahector-ship-it/kas-rt-sampangan`.
`gh` CLI tidak tersedia di lingkungan pembuatan proyek ini, jadi langkah
pembuatan repo dan push dilakukan manual:

```bash
# 1. Buat repositori baru di github.com/belvahector-ship-it
#    (New repository → nama: kas-rt-sampangan → Public → jangan centang
#    "Add README", biar tidak konflik dengan yang sudah ada)

# 2. Dari folder proyek ini:
git init
git add .
git commit -m "Portal transparansi kas RT 01/RW 04 Sampangan"
git branch -M main
git remote add origin https://github.com/belvahector-ship-it/kas-rt-sampangan.git
git push -u origin main
```

Lalu aktifkan Pages:

1. Buka repo di GitHub → **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main`, folder `/ (root)`
4. Simpan. Tunggu 1–2 menit.

Situs akan tersedia di:

```
https://belvahector-ship-it.github.io/kas-rt-sampangan/
```

Karena situs dilayani dari sub-path (bukan domain akar), seluruh tautan
internal di proyek ini ditulis **relatif** (`href="laporan.html"`, bukan
`href="/laporan.html"`) — jadi aman baik di GitHub Pages maupun bila nanti
dipindah ke domain kustom.

Setiap kali Anda mengubah `assets/js/config.js` (mis. mengisi `SHEET_ID`
untuk pertama kali), commit dan push ulang perubahan itu agar situs yang
sudah di-deploy ikut memakainya.

---

## Struktur berkas

```
index.html          Beranda — saldo, statistik, pintasan ke halaman lain
laporan.html         Laporan Kas — jurnal bulanan + grafik tren
iuran.html           Iuran Warga — matrik 12 bulan × warga
kegiatan.html         Kegiatan & Pengumuman
tentang.html          Profil RT, pengurus, cara bayar, FAQ, kontak

assets/
  css/
    tokens.css        Warna, tipografi, spasi, gerak — sumber tunggal desain
    base.css           Reset, tipografi dasar, latar bergerak
    motion.css          Semua @keyframes dan aturan animasi
    components.css       Setiap komponen UI (kartu, tabel, tombol, dst.)
  js/
    config.js           ← EDIT INI untuk menyambungkan spreadsheet
    sheets.js            Pemuat data berlapis tiga (live → CSV → snapshot)
    store.js              Normalisasi data + perhitungan statistik
    ui.js                  Format angka/tanggal, ikon, animasi bersama
    chart.js                Grafik tren SVG
    pages/
      beranda.js, laporan.js, iuran.js, kegiatan.js, tentang.js

data/
  snapshot.json        Data cadangan (dan contoh awal sebelum tersambung)
```

---

## Keterbatasan yang diketahui

- **Rumus pos dana** — Kas Iuran dihitung sebagai sisa (Saldo Total − IPAL −
  Lelayu), bukan pemasukan-dikurangi-pengeluaran per pos. Ini keliru secara
  akuntansi tapi sengaja dipertahankan supaya total tiga pos selalu sama
  persis dengan uang fisik di tangan bendahara. Detail alasannya ada di
  `DECISIONS.md` CP-10.
- **Tanpa riwayat lintas tahun** — situs ini hanya menampilkan satu tahun buku
  aktif (dibaca dari `Pengaturan.tahun_aktif`).
- **Tanpa notifikasi** — situs tidak mengirim pengingat tagihan; warga harus
  membuka sendiri.
- **Nama warga adalah kunci relasi** — pastikan ejaan nama sama persis antara
  lembar `Warga`, `Iuran`, `IPAL`, dan `Lelayu`. Nama yang tidak cocok
  ditampilkan tetap (supaya data tidak hilang) tapi dicatat sebagai peringatan
  di konsol peramban.

## Uji sebelum menganggap selesai

- [ ] Dicoba di 360px, 768px, 1440px — tidak ada gulir horizontal di body
- [ ] Dicoba dengan `SHEET_ID` kosong (mode snapshot) dan terisi (mode langsung)
- [ ] Dicoba dengan preferensi gerak dikurangi (`prefers-reduced-motion`) aktif
- [ ] Dicoba dalam mode gelap dan terang
- [ ] Pencarian nama di halaman Iuran Warga diuji dengan nama yang ada dan tidak ada
