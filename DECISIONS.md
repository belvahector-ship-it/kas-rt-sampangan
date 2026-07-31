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

---

## CP-14 · Discovery & Build · 2026-07-31

**Decision:** Tambah dua halaman baru — **Rekening BPD** (`bank-bpd.html`)
dan **Dana Operasional** (`dana-operasional.html`) — sebagai versi baca-saja
dari dua halaman admin di aplikasi referensi (`/dashboard/bpd` dan
`/dashboard/dana-operasional`). Kedua kantong dana ini **tidak digabung**
ke dalam saldo Kas Utama yang sudah ada di Beranda; ditampilkan terpisah
dan saling ditautkan.

**Options considered:** (a) menjumlahkan saldo BPD dan Dana Operasional ke
kartu saldo utama di Beranda supaya "satu angka besar"; (b) menampilkannya
sebagai kantong terpisah dengan tautan silang, meniru struktur navigasi
aplikasi referensi.

**Why:** Saat mempelajari aplikasi referensi lewat browser, ditemukan halaman
ketiga yang belum pernah dilihat sebelumnya — **"Rekap Gabungan"**
(`/dashboard/rekap`) — yang secara eksplisit memperlakukan Kas Utama,
Rekening BPD, dan Dana Operasional sebagai **tiga akun terpisah** dengan
tipe berbeda (Kas Manual / Rekening Bank / Dana Hibah), dan hanya
menjumlahkannya untuk satu baris ringkasan "Total Saldo Semua Akun" — bukan
mencampur datanya. Ini mengonfirmasi bahwa memaksa ketiganya jadi satu
angka di kartu saldo Beranda akan menyesatkan: Rekening BPD adalah uang
fisik di bank (diedit manual per buku tabungan, bukan hasil jurnal), dan
Dana Operasional adalah dana hibah pemerintah dengan aturan pakai berbeda
dari kas swadaya warga. Menyamakan ketiganya membuat warga tidak bisa lagi
membedakan "uang warga" dari "bantuan pemerintah" — justru mengaburkan
transparansi yang jadi tujuan portal ini (SPEC.md §1).

Halaman admin referensi (tombol Tambah/Sunting/Hapus/Import/Ekspor CSV)
**tidak diadopsi** — konsisten dengan CP-02: portal ini baca-saja, tanpa
login, tanpa operasi tulis dari sisi klien.

**Affects:** `SPEC.md` §3 §7, `assets/js/config.js` (`SHEETS.bankBpd`,
`SHEETS.danaOperasional`), `assets/js/store.js` (normalisasi + statistik
baru, terpisah dari `hitungStatistik` yang lama), `bank-bpd.html`,
`dana-operasional.html`, navigasi di seluruh halaman, kartu saldo Beranda
(ditambah catatan bahwa angka itu adalah Kas Utama, bukan total seluruh
kekayaan RT), `data/snapshot.json`, dan struktur spreadsheet `.xlsx`.

**Reversible:** ya — kedua halaman berdiri sendiri, bisa dihapus tanpa
menyentuh Kas Utama.

**Status:** confirmed

---

## CP-15 · Build · 2026-07-31

**Decision:** Endpoint gviz di `sheets.js` (`muatViaGviz`) selalu memakai
parameter `&headers=1` secara eksplisit, memaksa Google membaca **tepat
satu** baris header — tidak lagi mengandalkan tebakan otomatis Google.

**Why:** Setelah lembar `Pengaturan` diisi data nyata (13 baris Kunci/Nilai),
halaman Tentang menampilkan kontak bendahara kosong padahal datanya ada di
spreadsheet. Ditelusuri langsung lewat `curl` ke endpoint gviz: responsnya
menyertakan `"parsedNumHeaders":11` dan HANYA 3 baris data — 10 baris
pertama (termasuk seluruh info bendahara) tertelan ke dalam satu string
label kolom raksasa.

Penyebabnya: gviz mencoba menebak sendiri jumlah baris header dengan mencari
titik di mana tipe data tiap kolom "mulai konsisten". Untuk lembar tabel
biasa (Warga, Iuran, dst.) ini aman karena satu kolom selalu teks dan kolom
lain selalu angka sejak baris pertama. Tapi `Pengaturan` sengaja berbentuk
Kunci/Nilai (CP-09) — kolom Nilai mencampur teks (nama, alamat) dan angka
(nomor rekening, saldo awal). Begitu gviz menemukan beberapa baris angka
berturut-turut di tengah, ia menyimpulkan "baris-baris sebelum ini pasti
header" dan menelan belasan baris data sungguhan.

Diverifikasi lewat `curl` bahwa menambah `&headers=1` ke URL memaksa gviz
kembali ke 1 baris header dan mengembalikan seluruh 13 baris dengan benar.

**Affects:** `assets/js/sheets.js` (`muatViaGviz`). Berlaku untuk semua
lembar, bukan cuma Pengaturan — perbaikan ini sekaligus mencegah kelas bug
yang sama muncul di lembar mana pun nantinya yang mencampur tipe data.

**Reversible:** ya — satu parameter URL.

**Status:** confirmed

---

## CP-16 · Build · 2026-07-31

**Decision:** Situs disambungkan ke Google Spreadsheet nyata milik RT
(`assets/js/config.js` → `SHEET_ID` diisi), dan lembar Warga/Iuran/IPAL/
Lelayu diisi data 91 kepala keluarga sungguhan (sumber: berkas `AAA.xlsx`
dari bendahara). Ditambah dukungan **Pagu Lelayu** yang sebelumnya tidak
ada di desain situs.

**Why:** Data nyata mengungkap bahwa RT ini punya nominal standar Rp5.000
untuk dana Lelayu (`pagu` sheet di AAA.xlsx), berbeda dari asumsi awal
("sukarela tanpa pagu sama sekali", diwarisi dari aplikasi referensi lama
yang memang tidak menyimpan pagu lelayu per warga). Kolom `Pagu Lelayu`
ditambahkan ke lembar Warga (opsional — `null` jika bendahara tidak
mengisinya, situs kembali menampilkan "Bebas" seperti semula). Framing
tetap dijaga sebagai "nominal standar", BUKAN "target wajib" — beda dari
Iuran/IPAL — supaya sifat sukarelanya tidak hilang hanya karena sekarang
ada angkanya.

Data mentah AAA.xlsx berformat status LUNAS/BELUM per bulan (checkbox),
bukan nominal. Nominal di lembar Iuran/IPAL/Lelayu situs diturunkan dari
pagu tetap tiap warga: dicentang = lunas sesuai pagu, kosong = 0. Satu
koreksi data dilakukan saat validasi silang lintas-lembar: nama
"HASTO 10-A (KOST)" tertulis "HASTO 10FALSEA (KOST)" di lembar `iuran`
milik AAA.xlsx (dugaan replace otomatis "-"→"FALSE" yang keliru saat
diedit) — dikoreksi supaya cocok dengan 3 lembar lain.

**Affects:** `assets/js/store.js` (`paguLelayu`, `paguLelayuTotal`,
`adaPaguLelayu`, `targetLelayu`), `assets/js/pages/iuran.js` (kartu progres
& kolom Pagu di matrik Lelayu), struktur `.xlsx` (kolom `Pagu Lelayu` baru
di lembar Warga).

**Belum diputuskan / perlu konfirmasi manusia:**
- Tahun buku (`Pengaturan.tahun_aktif`) belum dikonfirmasi cocok dengan
  data nyata ini — AAA.xlsx tidak menyebutkan tahunnya.
- `Pengaturan`, `Transaksi`, `Kegiatan`, `BankBPD`, `DanaOperasional` masih
  berisi data contoh/placeholder, belum data nyata.
- **Konfirmasi publikasi belum diminta ulang di sesi ini** — `SHEET_ID`
  sudah terisi secara lokal (belum di-commit/push) sehingga 91 nama warga
  beserta status setoran mereka BELUM tampil di situs publik. Meng-commit
  dan push perubahan ini adalah langkah yang membuatnya publik secara
  permanen (ter-indeks mesin pencari, dsb.) — perlu persetujuan eksplisit
  sebelum dilakukan, terlepas dari langkah penyambungan SHEET_ID yang
  sudah terjadi di sesi sebelumnya.

**Reversible:** SHEET_ID dan kode — ya. Data nyata yang sudah pernah
ter-publish ke internet — tidak sepenuhnya (cache mesin pencari, arsip).

**Status:** assumed (koneksi SHEET_ID) / confirmed (perbaikan kode)

---

## CP-17 · Build · 2026-07-31

**Decision:** Tambalan hardcode nama/WA/alamat bendahara di
`assets/js/pages/beranda.js` (commit `8ceae7e`, dibuat langsung lewat
editor web GitHub) **dikembalikan** ke fallback generik ("Bendahara RT" /
kosong), sekarang setelah akar masalahnya (CP-15, parameter `headers=1`)
diperbaiki.

**Why:** Repo ini punya dua commit yang dibuat langsung di GitHub
(`260f8b8` mengisi `SHEET_ID`, `8ceae7e` menambal beranda dengan
hardcode) sebagai respons cepat terhadap bug kontak bendahara kosong —
namun hanya menambal Beranda, bukan halaman Tentang (yang tetap kosong,
sesuai tangkapan layar yang dilaporkan). Hardcode data pribadi langsung di
kode sumber itu sendiri berbahaya: begitu bendahara berganti orang atau
nomor, siapa pun yang mengedit `Pengaturan` di spreadsheet akan bingung
kenapa Beranda tidak ikut berubah — dua sumber kebenaran untuk data yang
sama. Dengan CP-15 memperbaiki akar masalahnya, seluruh halaman (termasuk
Tentang) sekarang membaca `Pengaturan` dengan benar, jadi tambalan ini
tidak diperlukan lagi.

**Affects:** `assets/js/pages/beranda.js`.

**Reversible:** ya.

**Status:** confirmed

---

## CP-18 · Build · 2026-07-31

**Decision:** Tiga perubahan atas permintaan langsung: (1) footer semua
halaman mencantumkan kredit pembuat situs, (2) diperbaiki bug tata letak
di bagian "Cara membayar iuran" pada halaman Tentang, (3) matrik Iuran
Warga digabung dari tiga tab terpisah (Iuran/IPAL/Lelayu) menjadi **satu
tabel** — tiap sel bulan menampilkan tiga titik status sekaligus.

**Detail (2) — bug grid `.step`:** `.step` adalah `display:grid` dengan
`grid-template-columns: 40px 1fr`, tapi tiga anaknya (`::before` si
lencana nomor, `.step__title`, `.step__desc`) dibiarkan auto-flow. Urutan
penempatan otomatis CSS Grid mengisi baris demi baris: lencana di
(kol1,baris1), judul di (kol2,baris1), lalu **deskripsi ikut auto-lanjut
ke (kol1,baris2)** — kolom yang cuma lebar 40px, dirancang untuk lencana
bernomor, bukan paragraf. Setiap kata jadi patah baris sendiri-sendiri.
Diperbaiki dengan menempatkan ketiga elemen secara eksplisit
(`grid-column`/`grid-row`) sehingga judul dan deskripsi SELALU di kolom
kedua (lebar penuh).

**Detail (3) — matrik gabungan:** Kolom Pagu yang tadinya satu angka
sekarang tiga baris ringkas berlabel titik warna (mis. "●25rb / ●4rb /
●5rb"), dan tiap sel bulan berisi tiga titik kecil (hijau=Iuran,
biru=IPAL, emas=Lelayu; terisi=tercatat, kosong=belum) alih-alih satu
tanda centang. Info lengkap tetap ada lewat atribut `title` (hover) dan
teks tersembunyi untuk pembaca layar — warna tidak pernah jadi
satu-satunya penyampai makna. Perubahan ini menghapus komponen `.pay`
(diganti `.dot-tri`) dan seluruh kontrol tab di halaman ini.

**Affects:** footer di 7 berkas HTML; `assets/css/components.css`
(`.step`, `.dot-tri`, `.cell-pagu`, kolom `.col-pagu`); `iuran.html`
(hapus markup tab); `assets/js/pages/iuran.js` (hapus `posAktif`/
`pasangTab`/`paguUntuk`, tulis ulang `renderMatrik`); `SPEC.md` §6.

**Reversible:** ya.

**Status:** confirmed

---

## CP-19 · Build · 2026-07-31

**Decision:** Seluruh tema visual diganti dari "Editorial Ledger" (kertas
hangat, garis rambut, bayangan nyaris tak terlihat) menjadi
**"Neo-Brutalist RT"** — palet kuning `#FFD400` / biru `#2148F5` / merah
`#E8353A` / tinta `#0A0A0A`, sudut tajam (radius 0), border tebal 2–3px,
bayangan keras offset tanpa blur. Diadaptasi dari palet
`keuangan-rt-clone/public/css/tokens.css` dan pola visual aplikasi
referensi langsung (bukan hanya kode, juga diamati lewat browser).

**Options considered:** (a) hanya mengambil warnanya, tetap dalam bahasa
visual Editorial Ledger yang lebih tenang; (b) menerapkan penuh neo-
brutalist (border tebal, bayangan keras, sudut tajam) sekaligus menjaga
keterbacaan lewat disiplin — hanya elemen struktural (kartu/tombol/panel)
yang dapat perlakuan tebal, pemisah internal tetap tipis.

**Why:** User eksplisit meminta opsi (b) setelah ditawari opsi (a) di
turn sebelumnya — "terapkan full neo-brutalist namun tetap dengan konsep
rapi dan mudah terbaca". Instruksi tegas: jangan ubah struktur apa pun
yang sudah ada, hanya terapkan tema. Ini dicapai HAMPIR SELURUHNYA lewat
`tokens.css` saja — karena setiap komponen sudah memakai variabel
`--r-*` (radius) dan `--sh-*` (bayangan) alih-alih nilai mentah, mengubah
definisi token itu di satu tempat otomatis menajamkan sudut dan mengeraskan
bayangan di SELURUH situs tanpa menyentuh `components.css`. Hanya lebar
border (yang sebelumnya di-hardcode `1px`, bukan variabel) dan penambahan
`box-shadow` pada kartu yang butuh sentuhan langsung di `components.css` —
persis "merapikan jika dibutuhkan" yang diizinkan.

**Temuan penting saat eksekusi — kuning sebagai warna teks:** `--pos-ipal`
asli aplikasi referensi (`#FFD400`) gagal kontras AA sebagai warna TEKS di
atas latar putih (~1.9:1), meski sebagai warna ISIAN lencana bulat (dengan
teks tinta gelap di atasnya) kontrasnya bagus. Aplikasi referensi sendiri
tampaknya hanya memakai kuning sebagai isian, tidak pernah sebagai teks
polos. Ditambahkan token terpisah `--pos-ipal-ink` (`#664D03`, warna amber
gelap yang sudah divalidasi Bootstrap sebagai aman di atas putih) khusus
untuk tempat pos-ipal dipakai sebagai `color:` teks (kartu progres IPAL,
badge, notice) — bukan `background:` (dot terisi, gradien, bar). Di mode
gelap kedua token disamakan karena kuning-di-atas-gelap justru kontras
bagus. Tanpa perbaikan ini, permintaan eksplisit "mudah terbaca" akan
gagal tepat di satu tempat yang paling sering dilihat warga.

**Temuan kedua — `overflow: hidden` memotong `box-shadow` sendiri:**
`.panel`, `.balance`, `.doorway`, `.event` semula memakai
`overflow: hidden` untuk memotong sudut membulat anak elemen mengikuti
radius kartu. Karena radius sekarang 0 di semua kartu, alasan itu hilang
— dan `overflow: hidden` pada elemen yang sama dengan `box-shadow` justru
memotong bayangannya sendiri (perilaku standar CSS). Dihapus dari keempat
selector itu; elemen dekoratif anak yang sebelumnya bergantung padanya
(garis aksen `::before`/`::after` di `.balance`/`.doorway`, gambar yang
membesar di `.event__media`) tetap aman karena posisinya inset atau punya
pemotong overflow sendiri di elemen anak.

**Matrik (fokus utama permintaan):** `.dot-tri` diubah dari titik polos
7px menjadi lencana bulat 17px (14px di mobile) berisi huruf **I/P/L**,
meniru pola aplikasi referensi persis — jauh lebih terbaca daripada warna
saja. Terisi = lencana penuh warna pos dengan huruf kontras (biru/merah
→ putih, kuning → tinta gelap); kosong = cincin outline dengan huruf
redup. Legenda di `iuran.html` diperbarui menampilkan huruf yang sama.

**Latar bergerak (CP-07) dinonaktifkan** — blur aurora lembut bertentangan
dengan bahasa datar-tegas neo-brutalist. Elemen DOM-nya TIDAK dihapus dari
HTML (struktur tidak diubah); hanya opasitasnya dinolkan lewat token
`--aurora-opacity`/`--grain-opacity` di `tokens.css`.

**Header** kehilangan efek kaca buram (`backdrop-filter: blur`) — diganti
latar solid opak dengan border bawah tinta 2px selalu tampak, sesuai
kesederhanaan header aplikasi referensi.

**Affects:** `assets/css/tokens.css` (ditulis ulang penuh — lihat juga
CP-05, digantikan), `assets/css/components.css` (lebar border ~21 kartu/
tombol/input dinaikkan ke `var(--bw-2)`, `box-shadow` ditambahkan ke
`.card`/`.panel`/`.balance`/`.stat`/`.doorway`/`.event`/`.contact`/
`.person`/`.matrix-wrap`/`.btn`, `overflow: hidden` dihapus dari 4
selector, `.dot-tri`/`.cell-pagu` ditulis ulang, `.site-header` ditulis
ulang), `assets/js/pages/iuran.js` (huruf I/P/L di markup lencana,
pemisahan `warna`/`teks` di kartu progres), `iuran.html` (legenda),
`SPEC.md` §5.

**Reversible:** ya — hampir seluruhnya lewat `tokens.css`; sisanya
(border-width, shadow, overflow, markup huruf) tercatat eksplisit di
atas untuk memudahkan pembalikan kalau diperlukan.

**Status:** confirmed

---

## CP-20 · Build · 2026-07-31

**Decision:** Blok `@media (prefers-color-scheme: dark)` di `tokens.css`
dihapus total. Situs sekarang **selalu terang**, berapa pun preferensi
sistem/peramban pengunjung. `color-scheme: light dark` diganti jadi
`color-scheme: light` supaya kontrol bawaan peramban (scrollbar, dsb.)
ikut dipaksa terang, bukan cuma variabel warna kita.

**Why:** User melaporkan (disertai tangkapan layar) melihat tampilan yang
tidak diinginkan dan menegaskan dengan tegas tidak mau ada mode gelap
sama sekali — permintaan eksplisit, bukan bug untuk didiagnosis lebih
jauh. Auto-switching berdasarkan preferensi sistem (CP-05, dipertahankan
lewat semua tema berikutnya) selama ini menyulitkan verifikasi visual
karena lingkungan pengujian saya sendiri memakai preferensi gelap secara
default, tapi voice pengguna produk sesungguhnya adalah yang menentukan:
lebih baik satu tampilan yang konsisten dan dikenal daripada dua varian
yang bisa membingungkan.

**Affects:** `assets/css/tokens.css` (blok dark mode dihapus, ~50 baris).

**Reversible:** ya — blok itu ada lengkap di riwayat git (commit CP-19)
kalau suatu saat mode gelap ingin dihidupkan kembali (mis. lewat toggle
manual, bukan auto-deteksi sistem).

**Status:** confirmed
