# Decision Log — Portal Transparansi Kas RT 01 / RW 04 Sampangan

Append-only. Entri terbaru di bawah. Jangan mengedit atau menghapus entri lama — kalau
sebuah keputusan dibatalkan, tulis entri baru yang menggantikannya. Urutan pembatalan
itu justru bagian paling berguna dari berkas ini.

**Legenda status:** `confirmed` (disetujui user) · `assumed` (saya putuskan sendiri,
user belum menimbang) · `superseded by CP-xx` · `debt` (celah yang sengaja ditinggal)

---

## CP-01 · Discovery · 2026-07-30

**Decision:** Proyek ini adalah penulisan ulang total dari aplikasi `keuangan-rt`
(React + Express + PostgreSQL + Firebase Auth) menjadi situs **statis tanpa backend**,
tanpa sistem login, dengan data bersumber dari Google Spreadsheet.

**Options considered:** (a) mempertahankan backend Express dan hanya mengganti
PostgreSQL dengan Sheets API; (b) statis penuh, browser membaca Sheets langsung.

**Why:** Target deploy adalah GitHub Pages, yang hanya melayani berkas statis — tidak
ada proses server yang bisa hidup di sana. Opsi (a) akan memaksa hosting kedua (Vercel/
Railway) hanya untuk mem-proxy pembacaan data publik yang toh tidak rahasia. Portal ini
sifatnya baca-saja dan semua datanya memang untuk konsumsi publik, jadi lapisan server
tidak memberi nilai apa pun selain biaya dan titik gagal tambahan.

**Affects:** seluruh arsitektur. `server.ts`, `src/db/`, `src/middleware/auth.ts`,
`src/lib/firebase*.ts`, `AdminPortal.tsx`, dan `PINLoginModal.tsx` dari proyek lama
tidak dipakai sama sekali.

**Reversible:** tidak murah — mengembalikan backend berarti membangun ulang lapisan
data, autentikasi, dan hosting dari nol.

**Status:** confirmed

---

## CP-02 · Discovery · 2026-07-30

**Decision:** Panel admin, login PIN, dan seluruh operasi tulis (CRUD) dihapus. Situs
hanya membaca. Pengelolaan data dilakukan bendahara langsung di Google Spreadsheet.

**Options considered:** mempertahankan panel admin dengan menulis balik ke Sheets lewat
Apps Script; menghapus panel sepenuhnya.

**Why:** Permintaan eksplisit user ("tanpa sistem login"). Selain itu, tanpa backend,
setiap kredensial tulis (API key, token Apps Script) akan tersimpan di JavaScript sisi
klien — artinya siapa pun bisa membacanya dari view-source dan mengubah pembukuan RT.
Spreadsheet sendiri sudah punya kontrol akses Google yang jauh lebih baik daripada PIN
yang di-hardcode.

**Affects:** tidak ada halaman admin, tidak ada berkas auth, tidak ada endpoint tulis.

**Reversible:** ya — panel admin bisa ditambahkan nanti sebagai proyek terpisah.

**Status:** confirmed

---

## CP-03 · Blueprint · 2026-07-30

**Decision:** Stack: **HTML + CSS + JavaScript ES modules murni, tanpa build step,
tanpa dependency**. Bukan React/Vite seperti proyek aslinya.

**Options considered:** React 19 + Vite + Tailwind (stack asli, perlu Node); React+Vite
yang di-build hanya di GitHub Actions; vanilla tanpa build.

**Why:** Node.js dan npm **tidak terpasang** di mesin ini (sudah diperiksa: hanya `git`
dan Python yang tersedia). Dengan React+Vite saya tidak akan bisa menjalankan atau
menguji apa pun sebelum push — kode yang belum pernah dieksekusi adalah draf, bukan
produk. Membangun hanya di Actions memindahkan kegagalan ke tempat yang lebih sulit
didiagnosis. Vanilla bisa saya jalankan dan uji lokal lewat `py -m http.server`, dan
langsung dilayani GitHub Pages tanpa konfigurasi apa pun. User meminta "yang minim
eror" — ini jawabannya.

**Affects:** seluruh struktur berkas; tidak ada `package.json`, `node_modules`, atau
workflow build.

**Reversible:** ya, tapi berarti menulis ulang lapisan tampilan.

**Status:** confirmed

---

## CP-04 · Blueprint · 2026-07-30

**Decision:** Lima halaman: **Beranda**, **Laporan Kas**, **Iuran Warga**,
**Kegiatan**, **Tentang**. Beranda tidak memuat daftar aktivitas terakhir; sebagai
gantinya ada blok tombol besar sebagai pintu masuk ke empat halaman lain.

**Options considered:** 3 halaman padat; 4 halaman; 5 halaman dengan Kegiatan.

**Why:** Pilihan user. Alasan menghapus "aktivitas terakhir" dari beranda juga masuk
akal secara desain: daftar transaksi mentah di beranda menuntut pembaca menafsirkan
angka sebelum mereka tahu situs ini isinya apa. Tombol besar memberi orientasi dulu,
baru detail — dan tombol besar jauh lebih ramah untuk warga sepuh di layar HP daripada
tautan teks kecil.

**Affects:** `index.html`, `laporan.html`, `iuran.html`, `kegiatan.html`,
`tentang.html`, dan navigasi global.

**Reversible:** ya.

**Status:** confirmed

---

## CP-05 · Blueprint · 2026-07-30

**Decision:** Arah visual **"Editorial Ledger"** — grid editorial dan tipografi tegas
khas creative agency, tetapi diredam untuk data keuangan. Latar kertas hangat
(`#FAFAF8`), tinta near-black (`#14161A`), satu warna aksen hijau tua (`#1B6B4C`) untuk
uang, merah bata (`#B4423A`) untuk pengeluaran. Angka memakai JetBrains Mono tabular.
Ditambah latar bergerak lambat dan animasi pendukung.

**Options considered:** Editorial Ledger; Warm Communal (kraft/terracotta);
Swiss Mono ketat (hitam-putih, aksen biru).

**Why:** Pilihan user. Creative-agency mentah (tipografi 12rem, kursor kustom, latar
gelap) akan bertabrakan dengan tugas utama situs ini: menampilkan tabel 12 kolom dan
angka rupiah yang harus terbaca warga sepuh. Yang dipertahankan dari bahasa agency
adalah gridnya, keberanian tipografinya, dan kedisiplinan warnanya — bukan
kebisingannya.

**Affects:** `assets/css/tokens.css` dan seluruh lapisan tampilan.

**Reversible:** ya — token warna dan tipografi terpusat di satu berkas.

**Status:** confirmed

---

## CP-06 · Blueprint · 2026-07-30

**Decision:** Ukuran teks dasar dinaikkan ke **17px** (bukan 16px standar), tinggi baris
1.6, dan seluruh target sentuh minimal 44×44px.

**Options considered:** 16px standar; 17px; 18px.

**Why:** User secara eksplisit menyebut "tetap terbaca nyaman warga sepuh". Menaikkan
basis ke 17px menaikkan seluruh skala tipografi secara proporsional karena semua ukuran
memakai `rem`. 18px membuat tabel matrik 12 kolom melebar sampai memaksa gulir
horizontal berlebihan di HP, jadi 17px adalah titik seimbangnya.

**Affects:** `assets/css/tokens.css`, seluruh skala tipografi dan spasi.

**Reversible:** ya — satu variabel.

**Status:** assumed

---

## CP-07 · Blueprint · 2026-07-30

**Decision:** Latar bergerak dibuat dari tiga lapisan diam di belakang konten: butiran
kertas (SVG noise), dua gumpalan cahaya (*aurora*) yang melayang dengan siklus 45–70
detik pada opasitas 4–7%, dan kisi garis rambut editorial. Semuanya hanya menganimasi
`transform` dan `opacity`, dan **berhenti total** saat `prefers-reduced-motion: reduce`.

**Options considered:** video latar; canvas partikel; gradien animasi CSS berlapis.

**Why:** User minta "bergerak dinamis pelan kalem ... mewah elegan mahal namun tetap
terbaca". Video dan canvas partikel menguras baterai dan data seluler, dan keduanya
menaikkan kontras latar sampai mengganggu teks. Gumpalan opasitas rendah memberi kesan
kedalaman dan gerak tanpa pernah menaikkan kontras latar di atas ~7%, jadi rasio
kontras teks tidak pernah turun di bawah ambang WCAG AA.

**Affects:** `assets/css/motion.css`, elemen `.bg-canvas` di setiap halaman.

**Reversible:** ya.

**Status:** assumed

---

## CP-08 · Blueprint · 2026-07-30

**Decision:** Data dibaca berlapis tiga: (1) endpoint **gviz** Google Sheets saat
halaman dibuka, (2) bila gagal, endpoint **CSV publish-to-web** bila dikonfigurasi,
(3) bila keduanya gagal, **snapshot JSON** yang ikut ter-commit di repo. Snapshot juga
dipakai sebagai isi awal supaya situs sudah hidup sebelum spreadsheet tersambung.

**Options considered:** live fetch saja; sinkronisasi berkala lewat GitHub Actions;
JSON manual di repo.

**Why:** Pilihan user (live + cadangan). Live fetch sendirian punya satu titik gagal
yang fatal: kalau Google berubah format, kuota kena, atau warga membuka situs saat
jaringan buruk, yang tampil adalah halaman kosong — dan halaman kosong pada portal
transparansi keuangan terbaca sebagai "pengurus menyembunyikan sesuatu", bukan sebagai
galat teknis. Snapshot mengubah kegagalan total menjadi kemunduran yang jujur: data
terakhir yang diketahui, dengan label kapan itu diambil.

**Affects:** `assets/js/sheets.js`, `assets/js/config.js`, `data/snapshot.json`.

**Reversible:** ya.

**Status:** confirmed

---

## CP-09 · Blueprint · 2026-07-30

**Decision:** Struktur spreadsheet ditetapkan **tujuh lembar**: `Pengaturan`, `Warga`,
`Iuran`, `IPAL`, `Lelayu`, `Transaksi`, `Kegiatan`. Tiga lembar matrik (`Iuran`,
`IPAL`, `Lelayu`) memakai format lebar: satu baris per warga, dua belas kolom bulan.

**Options considered:** satu lembar panjang berisi kolom `nama, bulan, pos, nominal`;
tiga lembar matrik lebar.

**Why:** Format panjang lebih rapi secara basis data tapi tidak bisa dibaca manusia —
bendahara harus menggulir ratusan baris untuk memeriksa satu warga. Format lebar persis
meniru buku kas kertas yang sudah dipakai pengurus RT: nama di kiri, bulan ke kanan.
Berkas ini akan diisi orang, bukan program, jadi bentuknya harus mengikuti kebiasaan
orangnya.

`Pengaturan` dipisah supaya nama bendahara, nomor WA, alamat, dan tahun aktif bisa
diubah tanpa menyentuh kode sama sekali.

**Affects:** `assets/js/sheets.js`, `assets/js/store.js`, `data/snapshot.json`,
dokumentasi di `README.md`.

**Reversible:** ya, tapi berarti bendahara harus menata ulang spreadsheet.

**Status:** assumed

---

## CP-10 · Blueprint · 2026-07-30

**Decision:** Rumus saldo dari aplikasi lama dipertahankan apa adanya, termasuk
kejanggalannya: **Kas Iuran = Saldo Total − Kas IPAL − Kas Lelayu**, di mana Kas IPAL
dan Kas Lelayu diambil murni dari matrik setoran warga.

**Options considered:** menghitung tiap pos secara mandiri (pemasukan pos − pengeluaran
pos); mempertahankan rumus lama.

**Why:** Rumus lama membuat pos Iuran menyerap **seluruh** pengeluaran, dari pos mana
pun asalnya. Secara akuntansi itu keliru — pengeluaran IPAL semestinya mengurangi kas
IPAL. Tapi rumus itu menjamin satu hal yang lebih penting bagi warga: `Iuran + IPAL +
Lelayu` selalu sama persis dengan uang fisik yang dipegang bendahara. Menggantinya
sekarang akan membuat angka di situs berbeda dari catatan bendahara, dan selisih yang
tidak bisa dijelaskan jauh lebih merusak kepercayaan daripada pembagian pos yang tidak
sempurna. Dicatat sebagai utang, bukan diperbaiki diam-diam.

**Affects:** `assets/js/store.js` fungsi `hitungStatistik()`.

**Reversible:** ya — satu fungsi.

**Status:** debt

---

## CP-11 · Build · 2026-07-30

**Decision:** Nama repositori **`kas-rt-sampangan`** di bawah akun
`belvahector-ship-it`, dilayani GitHub Pages dari branch `main` folder root. URL akhir:
`https://belvahector-ship-it.github.io/kas-rt-sampangan/`.

**Why:** Tautan yang diberikan user (`github.com/belvahector-ship-it`) adalah halaman
profil, bukan repositori, jadi nama repo perlu ditentukan. Karena situs dilayani dari
sub-path (bukan domain akar), semua tautan internal dan aset ditulis **relatif** —
`href="laporan.html"`, bukan `href="/laporan.html"` — supaya tidak rusak di sub-path.

**Affects:** seluruh atribut `href` dan `src`, `README.md`.

**Reversible:** ya, dan tetap aman kalau nanti dipindah ke domain kustom, karena tautan
relatif bekerja di kedua kasus.

**Status:** assumed

---

## CP-12 · Build · 2026-07-30

**Decision:** `gh` CLI tidak terpasang, sehingga repositori GitHub **tidak bisa saya
buat otomatis**. Saya menyiapkan repo git lokal beserta commit pertama, dan menyerahkan
perintah `git remote add` + `git push` untuk dijalankan user.

**Why:** Pembuatan repo dan push memerlukan kredensial GitHub milik user yang tidak
tersedia di sesi ini, dan sesi ini tidak bisa menjalankan alur OAuth.

**Affects:** langkah deploy di `README.md`.

**Reversible:** —

**Status:** assumed

---

## CP-13 · Build · 2026-07-30

**Decision:** Semua efek yang bergantung pada `requestAnimationFrame` atau
`IntersectionObserver` (hitung-naik angka saldo, reveal saat gulir, isyarat
gulir matrik) diberi jaring pengaman berbasis `setTimeout` yang memaksa
keadaan akhir tampil meski API tersebut tidak pernah terpicu.

**Why:** Saat menguji lewat automation browser, ditemukan bahwa tab yang
dibuka tanpa pernah tampil ter-composite (mis. tab di latar) membuat
`requestAnimationFrame` tidak pernah berjalan sama sekali — bukan melambat,
tapi berhenti total. Efeknya: angka saldo macet di "Rp 0", elemen `.reveal`
tetap `opacity:0` selamanya, dan isyarat gulir matrik tidak pernah muncul.

Ini bukan sekadar kondisi uji yang janggal. Alur pengguna utama di SPEC.md
§4 dimulai dari warga membuka tautan yang dibagikan di grup WhatsApp — dan
WebView bawaan WhatsApp (serta beberapa in-app browser lain) dikenal
menunda pemberian frame render pada tab yang baru dibuka. Untuk situs
biasa itu hanya berarti animasi telat sedikit. Untuk portal keuangan,
"saldo menampilkan Rp 0" adalah kegagalan paling merusak kepercayaan yang
bisa terjadi — persis yang coba dicegah CP-08.

**Affects:** `assets/js/ui.js` (`pasangReveal`, `pasangHitungNaik`),
`assets/js/pages/iuran.js` (`perbaruiIsyaratGeser` — sekaligus diganti dari
`requestAnimationFrame` menjadi pembacaan `scrollWidth` langsung, yang
memaksa reflow sinkron tanpa menunggu paint).

**Reversible:** ya.

**Status:** confirmed
