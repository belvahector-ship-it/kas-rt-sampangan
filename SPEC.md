# Spec — Portal Transparansi Kas RT 01 / RW 04 Sampangan

Ditulis sebelum kode. Cukup konkret untuk dibantah, cukup pendek untuk dibaca, dan
berbentuk daftar periksa yang bisa diverifikasi saat serah terima.

---

## 1. Ringkasan

**Apa ini:** situs statis satu arah yang menampilkan pembukuan kas RT secara terbuka —
saldo, jurnal masuk-keluar, dan status iuran tiap kepala keluarga — dengan data yang
ditarik langsung dari Google Spreadsheet milik bendahara.

**Siapa penggunanya:**
- *Utama* — warga RT 01/RW 04 Sampangan, rentang usia lebar, mayoritas membuka lewat HP
  dengan jaringan seluler. Sebagian besar bukan pengguna teknologi yang mahir.
- *Sekunder* — pengurus RT dan bendahara, yang memakai situs ini sebagai bahan
  pertanggungjawaban saat rapat.

**Tugas inti:** seorang warga harus bisa membuka situs ini di HP dan, dalam waktu di
bawah satu menit, menjawab dua pertanyaan: *"berapa uang kas kita sekarang?"* dan
*"apakah setoran saya bulan lalu sudah tercatat?"* Kalau salah satu dari dua itu gagal
dijawab, situs ini tidak ada gunanya.

**Di luar cakupan v1:**
- Panel admin, login, dan segala bentuk penyuntingan lewat situs (lihat CP-02)
- Notifikasi/pengingat tagihan
- Ekspor PDF laporan
- Riwayat lintas tahun — v1 hanya menampilkan satu tahun aktif
- Multi-RT / multi-RW

## 2. Batasan

| | |
|---|---|
| Hosting | GitHub Pages, sub-path `/kas-rt-sampangan/` |
| Stack | HTML + CSS + JavaScript ES modules, tanpa build, tanpa dependency (CP-03) |
| Database | tidak ada — Google Spreadsheet sebagai sumber, snapshot JSON sebagai cadangan |
| Deadline | tidak disebutkan |
| Aset yang sudah ada | konsep + data pembukuan dari aplikasi `keuangan-rt`; kontak bendahara |
| Bahasa antarmuka | Indonesia sepenuhnya |
| Environment build | Node/npm/gh **tidak tersedia**; hanya git + Python 3 |

## 3. Halaman

| Halaman | Berkas | Tujuan | Elemen kunci |
|---|---|---|---|
| Beranda | `index.html` | orientasi + pintu masuk | hero editorial, saldo kas + 3 pos dana, **4 tombol besar** ke halaman lain, ringkas info bendahara |
| Laporan Kas | `laporan.html` | pertanggungjawaban arus kas | pemilih bulan, ringkasan masuk/keluar/selisih, dua kolom jurnal, grafik tren 12 bulan, rincian per kategori |
| Iuran Warga | `iuran.html` | cek status setoran pribadi | matrik 12 bulan × KK, tab Iuran/IPAL/Lelayu, pencarian nama, bilah progres per pos, legenda |
| Kegiatan | `kegiatan.html` | pengumuman & agenda | kartu editorial bergambar, penyaring kategori, penanda mendatang/selesai |
| Rekening BPD | `bank-bpd.html` | transparansi dana di rekening bank | total saldo rekening, rincian per alokasi, tanggal & catatan pembaruan |
| Dana Operasional | `dana-operasional.html` | transparansi bantuan dana Pemkot/Kelurahan | saldo awal/sisa/terpakai, riwayat penggunaan dana |
| Tentang | `tentang.html` | konteks & kontak | profil RT, susunan pengurus, cara membayar iuran, FAQ transparansi, kartu kontak bendahara |

**Halaman hero (porsi desain terbesar):** Beranda. Ini satu-satunya halaman yang
dilihat semua orang, dan satu-satunya kesempatan meyakinkan warga bahwa angka di sini
bisa dipercaya.

**Halaman terberat secara fungsi:** Iuran Warga. Tabel 13 kolom di layar 360px adalah
masalah tata letak paling sulit di proyek ini.

## 4. Alur pengguna utama

1. Warga membuka tautan yang dibagikan di grup WhatsApp RT
2. Beranda memuat; saldo kas dan tiga pos dana terbaca tanpa perlu menggulir di HP
3. Warga menekan tombol besar **"Iuran Warga"**
4. Warga mengetik namanya di kotak pencarian
5. Barisnya tersaring; warga membaca dua belas kotak bulan — ✓ artinya sudah tercatat
6. Bila ada yang janggal, warga menekan tombol WhatsApp bendahara dari kartu kontak

Enam langkah, dan langkah 4–5 adalah inti produknya. Bila pencarian nama terasa lambat
atau matriknya perlu digulir ke samping untuk menemukan bulan yang dicari, alur ini
gagal meskipun setiap halaman tampak bagus.

## 5. Design tokens — "Neo-Brutalist RT" (CP-19, menggantikan "Editorial Ledger")

```
Kertas (bg)      #FFFFFF   surface #FFFFFF   surface-alt #F5F5F0
Tinta            #0A0A0A   sekunder #38383A   redup #5C5C5E
Garis            #0A0A0A   (border struktural = tinta penuh, bukan abu tipis)
Aksen (biru)     #2148F5   hover #1636C2   lembut #E7ECFE
Sorot (kuning)   #FFD400   teks di atasnya SELALU tinta gelap, bukan putih
Kritis (merah)   #E8353A   lembut #FCE7E7
Pos dana         Iuran #2148F5 (biru) · IPAL #FFD400 (kuning) · Lelayu #E8353A (merah)
                 — meniru lencana huruf I/P/L aplikasi referensi
Pos-ipal-ink     #664D03   varian gelap KHUSUS untuk teks (kuning murni gagal
                 kontras AA di atas putih); di mode gelap sama dengan --pos-ipal

Display          Archivo        700 (tebal, netral — bukan tracking ketat editorial)
Teks             Inter          400 / 500 / 600
Angka            JetBrains Mono 500 / 700, tabular

Basis            17px, line-height 1.6            <- dinaikkan untuk warga sepuh (CP-06)
Skala tipe       12 13 15 17 20 26 34 46 62 (rem, clamp untuk display)
Spasi            4 8 12 16 24 32 48 64 96 128
Radius           0px di semua kartu/tombol/input — sudut tajam ciri utama gaya ini.
                 Pil/lencana bulat (999px) tetap bulat.
Border            standar 2px, elemen hero 3px, semua warna --line (tinta penuh)
Bayangan         KERAS, offset, tanpa blur: 2px/3px/6px, memakai var(--ink) supaya
                 otomatis menyesuaikan mode gelap
Gerak            cepat 150ms · dasar 200ms · lambat 320ms · masuk cubic-bezier(.16,1,.3,1)
Breakpoint       480 · 720 · 960 · 1200 · 1440
Target sentuh    minimal 44×44px, jarak antar target minimal 8px
```

**Arah:** neo-brutalist tegas — border tebal, sudut tajam, bayangan keras offset,
palet kuning/biru/merah/tinta. Diadaptasi dari aplikasi referensi
`keuangan-rt-clone`, tapi tetap rapi dan mudah dibaca: hanya kartu/tombol/panel
utama yang dapat border tebal + bayangan; pemisah internal (baris tabel, daftar)
tetap tipis supaya tidak berisik. Interaksi tombol memakai pola "terangkat saat
hover, tertekan rata saat diklik" (bayangan hilang, elemen bergeser sejauh
offsetnya) — ciri khas gaya ini.

**Mode gelap:** ya, mengikuti `prefers-color-scheme`, dengan pasangan kontras yang
diverifikasi terpisah — bukan hasil pembalikan warna. Bayangan keras otomatis ikut
berubah warna karena memakai `var(--ink)` yang sudah terang di mode gelap.

**Latar bergerak (CP-07, dinonaktifkan oleh CP-19):** elemen DOM aurora/butiran
kertas tetap ada di setiap halaman (struktur tidak diubah), tapi opasitasnya
dinolkan lewat token — blur lembut bertentangan dengan bahasa neo-brutalist yang
datar dan tegas. Kisi garis rambut tetap ada, diredam halus.

**Anggaran animasi:** maksimal dua elemen bergerak per layar. Reveal saat gulir
(stagger 60ms), angka menghitung naik saat pertama terlihat, garis bawah tertarik saat
hover. Tidak ada yang menggeser tata letak.

## 6. Wireframe

**Beranda**
```
[latar bergerak: fixed, di belakang semua, opasitas rendah]
[header: nama RT kiri, nav kanan, jadi ringkas saat gulir, sticky]
[hero: satu kolom, rata kiri — label kecil / judul besar clamp / kalimat pengantar
       / stempel "diperbarui <tanggal>"]
[kartu saldo: full-bleed, angka besar tabular mono, garis pemisah,
       3 pos dana berjajar (turun jadi 1 kolom di 480)]
[3 statistik ringkas: pemasukan · pengeluaran · jumlah KK]
[TOMBOL BESAR: grid 2×2 (1 kolom di 720) — tiap tombol min 120px tinggi,
       ikon + judul + satu baris penjelas + panah]
[pita kontak bendahara: 60/40, tombol WhatsApp menonjol]
[footer: 3 kolom → 1 kolom di 720]
```

**Iuran Warga**
```
[header]
[judul halaman + penjelas + pemilih tahun]
[3 kartu progres: Iuran · IPAL · Lelayu — terkumpul / target, bilah progres]
[kotak cari nama — satu tabel gabungan, tiap sel bulan menampilkan
       3 titik status (Iuran/IPAL/Lelayu sekaligus), bukan tab terpisah — CP-18]
[matrik: kolom Nama beku di kiri, kolom Pagu, 12 kolom bulan
       gulir horizontal HANYA di dalam pembungkus tabel, tidak pernah di body
       di bawah 720: kolom bulan menyempit, isyarat gulir muncul]
[legenda + catatan]
```

**Laporan Kas**
```
[header]
[judul + pemilih bulan]
[3 ringkasan: masuk · keluar · selisih]
[grafik batang tren 12 bulan, SVG, dengan tabel alternatif untuk pembaca layar]
[2 kolom jurnal: Kas Masuk | Kas Keluar — menumpuk di 960]
[rincian per kategori]
```

## 7. Model data (Google Spreadsheet)

Sembilan lembar. Nama lembar **harus persis** seperti di bawah; nama kolom di baris 1.

**`Pengaturan`** — pasangan kunci/nilai, supaya teks bisa diubah tanpa menyentuh kode

| Kolom | Contoh |
|---|---|
| `Kunci` | `nama_rt`, `tahun_aktif`, `bendahara_nama`, `bendahara_wa`, `bendahara_alamat`, `bendahara_email`, `ketua_nama`, `sekretaris_nama`, `dana_operasional_saldo_awal`, `dana_operasional_sumber` |
| `Nilai` | `RT 01 / RW 04 Sampangan`, `2026`, `Belva Fahrozi C`, `085163210987`, …, `25000000`, `Pemkot/Kelurahan Sampangan` |

**`Warga`** — daftar kepala keluarga

| Kolom | Tipe | Catatan |
|---|---|---|
| `Nama` | teks | wajib, jadi kunci relasi ke tiga lembar matrik |
| `Pagu Iuran` | angka | kewajiban per bulan, mis. `15000` |
| `Pagu IPAL` | angka | kewajiban per bulan, mis. `5000` |

**`Iuran`**, **`IPAL`**, **`Lelayu`** — tiga lembar berformat sama

| `Nama` | `Jan` | `Feb` | … | `Des` |
|---|---|---|---|---|
| Budi Santoso | 15000 | 15000 | … | (kosong) |

Sel diisi **nominal yang dibayar**. Kosong atau `0` berarti belum. Lembar `Lelayu`
bersifat sukarela sehingga tidak punya pagu.

**`Transaksi`** — kas manual di luar setoran matrik

| Kolom | Tipe | Catatan |
|---|---|---|
| `Tanggal` | `YYYY-MM-DD` | |
| `Jenis` | `Masuk` \| `Keluar` | |
| `Kategori` | teks | dipetakan ke pos: mengandung "ipal"/"sanitasi" → IPAL; "lelayu"/"kematian"/"sosial" → Lelayu; selain itu → Iuran |
| `Jumlah` | angka | positif |
| `Keterangan` | teks | |

**`Kegiatan`** — pengumuman & agenda

| Kolom | Tipe | Catatan |
|---|---|---|
| `Tanggal` | `YYYY-MM-DD` | |
| `Judul` | teks | |
| `Ringkasan` | teks | |
| `Kategori` | teks | mis. Rapat, Kerja Bakti, Sosial, Pengumuman |
| `Gambar` | URL | opsional; kosong → kartu memakai latar tipografis |
| `Status` | `Mendatang` \| `Selesai` | opsional; kalau kosong disimpulkan dari tanggal |

**`BankBPD`** — snapshot saldo rekening bank RT, dipecah per alokasi (bukan jurnal
transaksi — diedit manual oleh bendahara setiap kali buku tabungan berubah)

| Kolom | Tipe | Catatan |
|---|---|---|
| `Nama Alokasi` | teks | mis. `Alokasi (Kas RT)`, `Alokasi (Ipal)`, `Alokasi (Sosial/Sukarela)` |
| `Saldo` | angka | saldo terkini alokasi itu di rekening |
| `Diperbarui` | `YYYY-MM-DD` | tanggal terakhir dicocokkan ke buku tabungan fisik |
| `Catatan` | teks | opsional, mis. asal-usul saldo migrasi |

**`DanaOperasional`** — jurnal penggunaan dana bantuan operasional dari
Pemkot/Kelurahan. Saldo awal disimpan di `Pengaturan.dana_operasional_saldo_awal`;
sisa saldo dan total terpakai **dihitung di situs**, bukan disimpan, supaya tidak
bisa menyimpang dari saldo awal + jurnal.

| Kolom | Tipe | Catatan |
|---|---|---|
| `Tanggal` | `YYYY-MM-DD` | |
| `Pengguna` | teks | pihak yang memakai dana, mis. `Kelurahan Sampangan RW 4 RT 1` |
| `Kategori` | teks | mis. `Kegiatan Sosial`, `Budaya` |
| `Kegiatan` | teks | deskripsi keperluan |
| `Nominal` | angka | jumlah yang terpakai |

**Penting — tiga kantong dana ini terpisah, tidak dijumlah jadi satu:** Kas
Utama (dari matrik + `Transaksi`, dipakai kartu saldo di Beranda), Rekening
BPD, dan Dana Operasional adalah tiga pool uang yang berbeda sumber dan
aturan pakainya. Situs referensi (`keuangan-rt`) memisahkannya secara
eksplisit lewat halaman "Rekap Gabungan" yang menjumlah ketiganya HANYA untuk
tampilan ringkasan — bukan menggabung datanya. Portal ini mengikuti pemisahan
yang sama; lihat DECISIONS.md CP-14.

**Relasi:** `Warga.Nama` 1—1 dengan baris di `Iuran`, `IPAL`, `Lelayu`. Nama yang ada
di lembar matrik tapi tidak ada di `Warga` tetap ditampilkan dengan pagu 0, dan dicatat
sebagai peringatan di konsol — data tidak boleh hilang diam-diam hanya karena bendahara
salah ketik nama.

## 8. Kontrak data (pengganti kontrak API)

Tidak ada API. Yang menggantikannya adalah kontrak pemuatan berlapis di
`assets/js/sheets.js` — dibekukan begitu pembangunan dimulai.

| Lapis | Sumber | Kapan dipakai |
|---|---|---|
| 1 | `https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:json&sheet={Lembar}` | selalu dicoba pertama |
| 2 | `https://docs.google.com/spreadsheets/d/e/{PUB_ID}/pub?gid={GID}&single=true&output=csv` | bila lapis 1 gagal **dan** dikonfigurasi |
| 3 | `data/snapshot.json` | bila 1 dan 2 gagal; juga sebagai isi awal saat halaman pertama dilukis |

Bentuk data setelah normalisasi — satu objek, dipakai semua halaman:

```js
{
  pengaturan: { nama_rt, tahun_aktif, bendahara_nama, bendahara_wa, ... },
  warga:      [ { nama, paguIuran, paguIpal,
                  iuran: [12 angka], ipal: [12 angka], lelayu: [12 angka] } ],
  transaksi:  [ { tanggal, jenis: 'masuk'|'keluar', kategori, jumlah, keterangan, pos } ],
  kegiatan:   [ { tanggal, judul, ringkasan, kategori, gambar, status } ],
  meta:       { sumber: 'live'|'snapshot', diambilPada: ISO-8601, galat: [] }
}
```

Setiap halaman **wajib** menangani tiga keadaan: `memuat`, `siap`, dan `mundur ke
snapshot`. Keadaan ketiga tampil sebagai pita peringatan jujur di atas konten, bukan
sebagai kegagalan diam-diam.

## 9. Asumsi

Hal-hal yang saya putuskan tanpa masukan user — daftar yang paling mungkin dikoreksi,
jadi sengaja dibuat terlihat.

- Basis teks 17px, bukan 16px, demi keterbacaan warga sepuh → CP-06
- Latar bergerak memakai gumpalan CSS, bukan video/canvas → CP-07
- Struktur tujuh lembar spreadsheet dengan matrik format lebar → CP-09
- Nama repo `kas-rt-sampangan`; semua tautan ditulis relatif agar aman di sub-path → CP-11
- Rumus pos dana yang keliru secara akuntansi tetap dipertahankan demi konsistensi
  dengan catatan bendahara → CP-10 (utang)
- Tahun aktif tunggal (`2026`), dibaca dari lembar `Pengaturan`
- Susunan pengurus selain bendahara belum diketahui; halaman Tentang memakai data
  contoh dari `Pengaturan` dan mudah diisi tanpa mengubah kode
- Mode gelap disertakan meski tidak diminta

## 10. Serah terima

- [ ] Kode berjalan dari klon baru mengikuti README, tanpa langkah build
- [ ] README: cara menyiapkan spreadsheet, cara menyambungkan, cara deploy ke Pages
- [ ] `SPEC.md`, `DECISIONS.md`
- [ ] Daftar periksa QA lulus; keterbatasan yang diketahui ditulis terbuka
- [ ] Diuji pada 360px, 768px, 1440px; tanpa gulir horizontal di body
- [ ] Diuji dengan `prefers-reduced-motion` aktif dan dengan mode gelap
- [ ] Diuji dalam keadaan snapshot (spreadsheet sengaja dimatikan)
