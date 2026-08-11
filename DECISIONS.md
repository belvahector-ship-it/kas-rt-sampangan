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

---

## CP-21 · Build · 2026-07-31

**Decision:** Dua animasi gulir baru diterapkan ke seluruh 7 halaman: (1)
`.reveal` diubah dari fade+geser polos menjadi gaya "pantul masuk" —
elemen naik dari bawah lalu mental balik pas di tempatnya, memakai
`--ease-overshoot` (token baru, `cubic-bezier(0.34, 1.56, 0.64, 1)`,
diambil dari konvensi motion aplikasi referensi); (2) bilah progres gulir
tebal (4px, kuning-hitam) di puncak viewport yang memanjang mengikuti
seberapa jauh halaman sudah digulir.

**Why:** Permintaan langsung: "animasi scrolling keren, terapkan ke
entire page". Overshoot dipilih karena paling cocok dengan bahasa neo-
brutalist (CP-19) yang tegas — kartu "mengklik" ke posisinya, bukan
melayang lembut ala tema lama. Opacity sengaja TETAP pakai ease-out biasa
(dipisah dari transform), karena opacity yang dianimasikan dengan
overshoot menghasilkan kedipan aneh (nilai overshoot bisa >1 atau <0,
tidak valid untuk opacity).

**Temuan saat eksekusi — jangan ulangi kesalahan CP-13:** Rencana awal
memakai `requestAnimationFrame` untuk throttle penulisan bilah progres di
tiap event scroll. Diuji lewat automation browser dan terkonfirmasi
ulang: pada tab yang tidak ter-composite, `requestAnimationFrame` sama
sekali tidak pernah dipanggil — bukan diperlambat, berhenti total. Karena
pelajaran ini SUDAH tercatat di CP-13 untuk kasus lain (angka hitung-naik,
reveal), seharusnya saya terapkan sejak awal, bukan menemukan ulang lewat
percobaan-gagal. Diperbaiki: `pasangProgresGulir()` menulis langsung di
setiap event `scroll`/`resize` tanpa rAF sama sekali — untuk elemen
hiasan seperti bilah progres, biaya menulis satu custom property per
event jauh lebih murah daripada risiko bilahnya diam total di WebView
tertentu (jalur yang sama dipakai warga: tautan dibagikan lewat WhatsApp).

**Affects:** `assets/css/tokens.css` (`--ease-overshoot`),
`assets/css/motion.css` (`.reveal` ditulis ulang, `.scroll-progress`/
`.scroll-progress__bar` baru), `assets/js/ui.js` (`pasangProgresGulir`,
dipanggil dari `pasangHeader()` — jadi otomatis aktif di semua halaman
tanpa mengubah tiap skrip halaman satu-satu), markup
`<div class="scroll-progress">` ditambahkan setelah `<body>` di 7 berkas
HTML.

**Reversible:** ya.

**Status:** confirmed

---

## CP-22 · Build · 2026-08-01

**Decision:** Membalik sebagian CP-02 (yang menghapus seluruh fungsi admin/tulis) —
menambahkan login pengurus (Google Identity Services) dan operasi tulis
terbatas: toggle matrik Iuran/IPAL/Lelayu, tambah/ubah/hapus Transaksi,
tambah/ubah/hapus Dana Operasional. Backend: Google Apps Script Web App
(`apps-script/Code.gs`, disalin manual ke editor Apps Script, TIDAK
dijalankan dari repo) yang memverifikasi ID token ke endpoint tokeninfo
Google (cek `aud`, `email_verified`, `exp`) lalu mencocokkan email ke
whitelist di Script Properties (bukan di kode — repo publik). Setiap
tulisan dicatat ke lembar AuditLog baru; Transaksi & DanaOperasional
mendapat kolom ID (bukan nomor baris) untuk sunting/hapus yang aman.

**Why:** Permintaan warga/pengurus untuk bisa mencatat langsung dari situs
tanpa membuka spreadsheet. Kelas `is-admin` di klien murni kosmetik —
satu-satunya penjaga keamanan sungguhan ada di `verifikasiToken()` sisi
server; ini diuji langsung ke backend live: permintaan tanpa token, token
ngawur, dan JWT berklaim benar tapi tanda tangan palsu — ketiganya
ditolak.

**Affects:** `apps-script/Code.gs`, `assets/js/auth.js`, `assets/js/admin.js`,
`assets/js/config.js` (OAUTH_CLIENT_ID, APPS_SCRIPT_URL), `assets/js/store.js`
(kolom `id` pada transaksi/danaOperasional), seluruh halaman (tombol
Pengurus di header).

**Reversible:** sebagian — mengosongkan `APPS_SCRIPT_URL` mematikan fitur
tulis dan mengembalikan situs ke baca-saja tanpa mengubah kode lain.

**Status:** confirmed

---

## CP-23 · Audit · 2026-08-01

**Decision:** Kas IPAL dan Kas Lelayu di Beranda sekarang ikut menghitung
transaksi manual berpos itu (bukan cuma setoran matrik seperti CP-10),
DITAHAN DI 0 kalau hasilnya negatif — selisih/defisitnya tetap diserap
Kas Iuran, persis seperti CP-10, supaya Iuran+IPAL+Lelayu tetap selalu
genap dengan saldo/kas fisik.

```js
const kasIpal = Math.max(0, setoranIpal + manualMasukPos.ipal - keluarPos.ipal);
const kasLelayu = Math.max(0, setoranLelayu + manualMasukPos.lelayu - keluarPos.lelayu);
const kasIuran = saldo - kasIpal - kasLelayu;
```

**Options considered:** (a) biarkan CP-10 apa adanya; (b) pool per-pos
murni tanpa penahan 0 (boleh tampil minus ke publik); (c) pool per-pos
ditahan di 0, sisa diserap Iuran — DIPILIH.

**Why:** Audit diminta user setelah mendapati Kas IPAL tertampil Rp 603rb
padahal ada transaksi manual "Saldo Ipal tahun 2025" Rp 1.238.000 yang
sudah diklasifikasikan benar ke pos IPAL oleh `posDariKategori()` —
tapi `kasIpal` lama (`= setoranIpal`, murni matrik) mengabaikannya sama
sekali. Ditelusuri sampai data live: selisihnya persis Rp 1.238.000.
Audit juga menemukan pos Lelayu SEBENARNYA defisit besar (pengeluaran
lelayu Rp 4.158.000 jauh melebihi setoran+manual masuknya) yang
disembunyikan CP-10 lama dengan menyerapnya diam-diam ke Iuran, membuat
Lelayu terlihat sehat (Rp 160rb) padahal minus. User memilih opsi (c)
supaya angka pos akurat TANPA menampilkan minus ke warga di situs publik.

User juga mengklarifikasi bahwa "Sosial" (jenguk warga sakit) dan
"Lelayu" (kematian warga) adalah dua hal berbeda secara riil, tapi
`posDariKategori()` memetakan keduanya ke pos yang sama — user memilih
TETAP DIGABUNG untuk sekarang (bukan pos ke-4 terpisah), jadi tidak ada
perubahan pada `posDariKategori()`. Juga dikonfirmasi: Iuran wajib
(15k/25k) adalah bundel beberapa sub-keperluan (Sosial, Uang Meja,
Lain-lain, dan untuk 25k ada tambahan Arisan) yang TIDAK dipecah di
data — user memilih tetap satu angka Iuran, bukan dipecah lebih jauh.

**Ditemukan tapi TIDAK diubah (di luar cakupan sesi ini):**
- Transaksi "Saldo Sosial/Lelayu 2025" (Rp 1.000.000, Masuk, 2026-01-01)
  berkategori teks "Lain-Lain" — seharusnya sesuatu yang mengandung kata
  "sosial"/"lelayu" supaya `posDariKategori()` mengenalinya sebagai pos
  Lelayu. Ini kesalahan INPUT DATA, bukan kode — perlu diperbaiki manual
  di spreadsheet atau lewat menu sunting transaksi di situs.
- `stat.masukIpal`/`keluarIpal`/dst. dan `stat.perBulan[i].ipal/.lelayu`
  (matrik-only per bulan) tetap ada di objek stat tapi tidak dikonsumsi
  UI mana pun — dipertahankan karena `kasIpal`/`kasLelayu` baru di atas
  memakainya, dan grafik tren sudah benar (pakai `masuk`/`keluar` agregat
  yang sudah termasuk transaksi manual, bukan field per-pos ini).
- Entri Dana Operasional "tes 1 / Tes 2 / cek" (Rp 330.000) tampak seperti
  data uji coba, mempengaruhi "Sisa Dana" yang tertampil — user belum
  memutuskan mau dihapus atau tidak.

**Affects:** `assets/js/store.js` fungsi `hitungStatistik()`.

**Reversible:** ya — dua baris.

**Status:** confirmed

---

## CP-24 · Build · 2026-08-07

**Decision:** Seluruh tema visual diganti dari "Neo-Brutalist RT" (CP-19)
menjadi **"BRUTAL"** — spesifikasi neo-brutalism yang diberikan user hasil
ekstraksi CSS dari situs demo `ui-ux-pro-max` (creative-agency). Perubahan
inti: palet dipurnakan jadi PRIMER MURNI (merah `#FF0000`, biru `#0000FF`,
kuning `#FFFF00`, hitam `#000000`, putih, abu `#666666`) menggantikan palet
lama yang masih "dijinakkan" (`#E8353A` / `#2148F5` / `#FFD400` / `#0A0A0A`);
font Archivo + Inter + JetBrains Mono diganti **Syne (800) + Manrope**;
border naik 2px → 3px; bayangan keras naik jadi 4/6/8px; radius 0 di
SEMUA elemen termasuk pil dan lingkaran; dan ditambahkan interaksi tanda
tangan "tekan" — bayangan menyusut setengah sementara elemen bergeser
sejauh selisihnya, jadi sudut kanan-bawah bayangan diam di tempat.

Section baru mengikuti struktur spesifikasi: pita **marquee** hitam di
bawah header (tiap halaman), **hero dua kolom** dengan kolase empat balok
warna + bintang, section **hitam bernomor 01–04** ("Cara Kerjanya"), dan
section **kuning penuh** untuk kontak bendahara.

**Options considered:** (a) memakai Tailwind seperti sumber spesifikasi;
(b) menerjemahkan spesifikasi ke arsitektur token yang sudah ada.

**Why (b):** Situs ini vanilla HTML/CSS/JS tanpa build step, dan yang
lebih penting — markup yang dirakit di JavaScript (`chart.js`,
`iuran.js`, `laporan.js`) menulis `var(--pos-iuran)`, `var(--line)`, dst.
langsung ke dalam string HTML. Mengganti sistem ke Tailwind berarti
menulis ulang seluruh lapisan JS itu juga. Karena setiap komponen sudah
membaca token, ~80% pergantian tema terjadi di `tokens.css` saja, persis
seperti CP-19. Kelas utilitas dari spesifikasi (`.brutal-border`,
`.brutal-shadow`, `.highlight-*`, `.grid-pattern`, `.animate-marquee`)
tetap dibuat di `base.css`/`motion.css` dengan nama yang sama, supaya
markup baru bisa memakai bahasa spesifikasi apa adanya.

**Penyimpangan sadar dari spesifikasi (tiga, semuanya dicatat):**

1. **Font ketiga dilepas, bukan dipertahankan.** Spesifikasi adalah sistem
   dua font. Tema lama memakai JetBrains Mono khusus angka rupiah. Manrope
   punya angka tabular sungguhan (`font-variant-numeric: tabular-nums`),
   jadi kolom rupiah tetap lurus tanpa font ketiga — identitas utuh,
   sekaligus satu permintaan jaringan font lebih sedikit. Angka TERBESAR
   (saldo, statistik) pindah ke Syne supaya terbaca sebagai pernyataan.

2. **Token merah kedua (`--critical-ink: #D40000`).** `#FF0000` di atas
   putih hanya **4.0:1** — lulus AA untuk teks besar, GAGAL untuk teks
   kecil. Situs ini dibaca warga sepuh (CP-06) dan punya banyak angka
   rupiah negatif berukuran kecil. Merah murni tetap dipakai untuk isian,
   border, angka besar, dan sorotan judul; `--critical-ink` (5.53:1)
   dipakai HANYA di tempat merah harus jadi teks kecil (`.text-neg`).
   Ini pola yang sama persis dengan `--pos-ipal-ink` di CP-19, bukan
   pengecualian baru.

3. **Footer.** Spesifikasi bagian 8 meminta footer putih dengan garis atas
   hitam 3px; ini MEMBATALKAN commit terakhir sebelum sesi ini yang baru
   saja mengubah latar footer jadi biru-navy `#0D1117`. Navy tidak ada di
   palet BRUTAL. Dipilih mengikuti spesifikasi karena permintaannya
   "redesign whole web app"; mudah dikembalikan lewat satu token
   (`--footer-bg`) bila user lebih suka yang navy.

**Cacat nyata yang ditemukan & diperbaiki saat pengujian 320px:**

- **Judul brutalist tidak bisa membungkus di tengah kata.** Kata seperti
  "TERBUKA" (hero) melebar 439px di layar 335px dan mendorong halaman
  menggulir ke samping. Batas bawah tiap `clamp()` di `tokens.css` kini
  dihitung dari kata terpanjang yang harus muat di 320px, bukan dipilih
  karena enak dilihat, ditambah `overflow-wrap: break-word` pada h1–h4
  sebagai jaring pengaman untuk judul yang datang dari data.
- **Item flex menolak menyusut.** `min-width: auto` bawaan membuat
  `.panel__head`, `.person`, `.ledger__head`, dst. mendorong keluar
  induknya di layar sempit. Dikumpulkan jadi satu aturan `min-width: 0`
  di puncak `components.css` karena gejalanya identik di banyak komponen
  dan mudah terlupa saat menambah komponen flex baru.
- **Panah `.doorway__title` terpotong hilang** di 320px karena flex
  `space-between` dengan teks yang tak mau menyusut. Diganti grid
  `minmax(0, 1fr) auto`.
- **Sudut membulat yang lolos lewat JavaScript**: `rx="2.5"` pada batang
  grafik (`chart.js`) dan `border-radius:50%` pada swatch legenda
  (`iuran.js`). Token CSS tidak bisa menjangkau nilai yang ditulis di
  string HTML — keduanya diperbaiki di sumbernya.
- **Tabel rincian kategori** di `laporan.js` memakai gaya inline sendiri,
  jadi ia satu-satunya tabel yang tidak ikut berganti tema. Dipindah ke
  komponen `.simple-table` yang sama dengan halaman lain.

**Verifikasi:** ketujuh halaman diperiksa pada 320px, 375px, dan desktop —
nol gulir horizontal, nol elemen terpotong, nol galat konsol. Rasio
kontras seluruh pasangan warna yang dipakai diukur dan lulus ambangnya
(teks kecil ≥4.5:1, teks besar ≥3:1); yang paling ketat adalah putih di
atas merah murni pada sorotan judul, 4.00:1, dan itu hanya pernah dipakai
pada teks ≥24px.

**Catatan pengujian:** panel pratinjau yang dipakai tidak meng-compose
frame, sehingga properti yang DITRANSISIKAN (opacity, visibility,
`grid-template-rows`) membeku di nilai awalnya dan tampak seperti bug pada
menu mobile dan akordeon FAQ. Setelah transisi dinonaktifkan sementara,
keduanya terbukti benar. Bukan cacat kode — dicatat supaya tidak
"diperbaiki" ulang di sesi berikutnya.

**Affects:** `assets/css/tokens.css`, `base.css`, `motion.css`,
`components.css` (ditulis ulang); ketujuh berkas HTML (font, favicon,
marquee, hero, section baru); `assets/js/chart.js`,
`assets/js/pages/iuran.js`, `assets/js/pages/laporan.js`.

**Reversible:** sebagian besar ya — palet, bentuk, bayangan, dan
tipografi semuanya token di `tokens.css`. Yang TIDAK otomatis kembali:
markup section baru (marquee, kolase hero, daftar bernomor) dan tiga
perbaikan JS di atas.

**Status:** confirmed

---

## CP-25 · Build · 2026-08-07

**Decision:** Lapisan tipografi tema BRUTAL (CP-24) direvisi demi
keterbacaan. **Syne dilepas, diganti Archivo.** Angka rupiah dipindah ke
Manrope tabular. Huruf kapital dicabut dari seluruh JUDUL dan KONTEN,
disisakan hanya di label pendek. Line-height, tracking, ukuran teks kecil,
dan warna teks sekunder semuanya dilonggarkan.

**Why:** User melaporkan fontnya "terlalu brutal... sulit terbaca" dan
minta yang lebih ramah untuk orang tua. Benar, dan itu kesalahan eksekusi
CP-24 — bukan kesalahan spesifikasinya. Spesifikasi BRUTAL memakai Syne
untuk judul di situs agensi kreatif, tempat judul hanya muncul dalam
ukuran raksasa. Di CP-24 saya menerapkannya ke SEMUA judul, termasuk judul
panel 20px, nama pengurus, dan pertanyaan FAQ — dan yang terburuk, ke
**angka rupiah**. Syne adalah font display geometris; bentuk hurufnya
nyeleneh dan angkanya harus ditebak. Untuk portal keuangan yang dibaca
warga sepuh (CP-06), itu kegagalan telak.

Yang membuat perbaikan ini murah: **nilai brutalis tema ini tidak dibawa
oleh font sama sekali** — melainkan oleh border 3px hitam, bayangan keras
ber-offset, sudut 0, warna primer murni, dan interaksi "tekan". Semuanya
tetap utuh. Hanya lapisan tipografi yang berubah.

**Perubahan spesifik:**

1. `--font-display`: Syne → **Archivo** (x-height besar, apertur terbuka,
   1/l/I dan 0/O jelas berbeda, dirancang tetap terbaca di ukuran kecil).
   Archivo sudah pernah dipakai proyek ini di CP-19, jadi terbukti cocok.
2. **Semua angka → Manrope + `tabular-nums`**, termasuk saldo raksasa yang
   sebelumnya memakai font judul. Satu sistem angka untuk seluruh situs:
   kartu saldo dan baris jurnal memakai bentuk digit yang sama persis,
   yang membedakan bobotnya saja. Warga tidak perlu "menyesuaikan mata".
3. **Uppercase dicabut** dari judul hero-kecil, judul halaman, judul panel,
   judul doorway, judul kegiatan, pertanyaan FAQ, judul langkah, nama
   pengurus, judul modal, dan judul bernomor. Teks kapital menghapus
   bentuk-kata (word shape) yang justru jadi pegangan utama pembaca sepuh.
   **Tetap kapital** di 24 tempat yang semuanya label pendek 1–3 kata:
   eyebrow, lencana, tombol, nav, kepala tabel, label statistik. Judul hero
   juga tetap kapital karena skalanya display (94px) dan hanya empat kata.
4. `--lh-tight` 1 → **1.1**; judul multi-baris tidak lagi bersentuhan.
5. `--ls-display` -0.02em → **-0.005em**; tracking negatif merapatkan huruf
   sampai menempel.
6. Ukuran kecil dinaikkan: `--fs-2xs` 0.72 → **0.8rem** (12,2px → 13,6px),
   `--fs-xs` 0.8 → 0.86rem, `--fs-sm` 0.88 → 0.94rem.
7. Teks sekunder panjang (`.lede`, deskripsi panel/doorway/langkah,
   jawaban FAQ, ringkasan kegiatan) dinaikkan dari `--ink-3` (#666,
   5.74:1) ke `--ink-2` (#333, **12.6:1**). #666 lolos ambang WCAG, tapi
   ambang itu batas minimum untuk penglihatan normal — bukan target untuk
   pembaca sepuh.

**Cacat lama yang ikut ketahuan & diperbaiki — lencana matrik bertumpuk:**
Tiga lencana I/P/L dalam satu sel bulan butuh 59px (3×17 + gap + padding),
tapi `col-month` cuma 52px — jadi ketiganya saling menimpa dan status
pembayaran mustahil dibaca. **Ini sudah salah sejak sebelum CP-24**, bukan
regresi; baru terlihat saat mengukur ukuran huruf terkecil di situs. Lebar
kolom sekarang diturunkan dari hitungan isinya (`3 × lencana + 2 × gap +
padding`), lalu `min-width` tabel mengikuti (`col-name + col-pagu +
12 × col-month`) — 1120px di desktop, 920px di mobile. Tabelnya jadi lebih
sering perlu digeser; itu disengaja, dan sudah ada `.scroll-hint`. Lencana
yang terbaca lebih penting daripada tabel yang muat tanpa digeser.

**Verifikasi:** ketujuh halaman pada 320px dan 1280px — nol gulir
horizontal, nol elemen terpotong, nol galat konsol. Teks terkecil yang
memuat kalimat kini ≥16px; label metadata ≥13,6px; huruf I/P/L di matrik
naik dari 9px ke 10–11px di dalam lencana yang kini benar-benar muat.

**Affects:** `assets/css/tokens.css` (font, line-height, tracking, skala),
`base.css` (`.num--display`, `.lede`, komentar tipografi),
`components.css` (26 suntingan: font angka, uppercase, warna teks
sekunder, dimensi matrik), ketujuh berkas HTML (tautan Google Fonts), dan
`index.html` (tiga `text-transform` inline dilepas).

**Reversible:** ya, seluruhnya lewat token — `--font-display` mengembalikan
Syne, dan uppercase per komponen ada di `components.css`. Tapi jangan:
alasan pelepasannya ada di atas.

**Status:** confirmed

---

## CP-26 · Build · 2026-08-07

**Decision:** Pita berjalan (marquee) yang diperkenalkan CP-24 tidak lagi
memuat label kategori statis, melainkan **nominal saldo sungguhan** dari
lima kantong dana: Kas Utama, Kas IPAL, Kas Lelayu, Rekening BPD, dan Dana
Hibah Operasional. Ditambahkan tombol jeda, dan kecepatan pita dihitung
dari lebar isinya.

**Why:** Permintaan user — pita diisi "semua informasi saldo kas yg
tercatat". Sebelumnya pita hanya mengulang nama kategori, yang tidak
memberi informasi apa pun.

**Kas Iuran Wajib SENGAJA dikeluarkan — jangan ditambahkan kembali.**
Pos Iuran adalah penyerap defisit (`kasIuran = saldo - kasIpal -
kasLelayu`, CP-23). IPAL dan Lelayu ditahan di minimum 0, tapi Iuran tidak
punya lantai, jadi nilainya bisa — dan saat ini memang — minus
(Rp -1.086.400). CP-23 mencatat pilihan user: angka pos akurat tapi minus
tidak ditampilkan ke warga di situs publik. Menaruhnya di pita berarti
angka minus itu berjalan di ketujuh halaman sebagai elemen paling mencolok
di situs, tanpa konteks apa pun. User memilih opsi ini setelah ditawari
tiga kemungkinan (tampilkan apa adanya / keluarkan Kas Iuran / pita hanya
tiga total besar). Rinciannya tidak hilang — kartu saldo di Beranda tetap
memuat ketiga pos dengan nilai sebenarnya.

**Temuan terpisah yang BELUM diperbaiki:** niat CP-23 ("tanpa menampilkan
minus ke warga") sebenarnya belum tercapai. Penahan `Math.max(0, ...)`
hanya dipasang di `kasIpal` dan `kasLelayu`; `kasIuran` sebagai penyerap
tidak punya lantai, sehingga kartu saldo di Beranda **sudah** menampilkan
minus sejak sebelum sesi ini. Ini bukan regresi dari CP-24/CP-25. Belum
disentuh karena memperbaikinya berarti memilih antara dua hal yang saling
meniadakan: menahan Iuran di 0 akan membuat Iuran+IPAL+Lelayu tidak lagi
genap dengan saldo — invarian yang justru jadi dasar CP-23. Perlu
keputusan user tersendiri.

**Detail teknis:**
- Nama pos ditulis di HTML, nominalnya diisi JavaScript. Tanpa JS pita
  tetap menampilkan daftar nama kantong yang bermakna — hanya angkanya
  yang hilang. Lebih baik kehilangan angka daripada menampilkan angka yang
  salah.
- Saat `meta.sumber === 'gagal'`, nominal sengaja dibiarkan KOSONG. `stat`
  pada keadaan itu berisi nol, dan "Rp 0" di pita paling menonjol akan
  terbaca sebagai "kas RT benar-benar kosong" — kebohongan yang jauh lebih
  merusak daripada tidak menampilkan apa-apa.
- `isiMarquee()` dipanggil dari `pasangIdentitas()`, bukan dari tiap berkas
  halaman, karena fungsi itu sudah dipanggil ketujuh halaman dengan objek
  data lengkap. Halaman baru otomatis ikut terisi — tidak ada langkah yang
  bisa terlupa.
- **Kecepatan dihitung, bukan dipatok.** Animasi menggeser jalur -50%;
  dengan durasi tetap, pita berjalan makin cepat setiap kali angkanya makin
  panjang — persis saat isinya makin perlu dibaca. Durasi kini diturunkan
  dari lebar jalur sesungguhnya (65 px/detik), dihitung ulang saat font
  selesai dimuat, saat angka masuk, dan saat jendela diubah ukurannya.
- **Tombol jeda ditambahkan.** Teks bergerak yang memuat informasi wajib
  bisa dihentikan (WCAG 2.2.2); jeda-saat-hover yang ada sebelumnya tidak
  menjangkau pengguna papan ketik maupun layar sentuh. Juga membantu warga
  sepuh yang butuh waktu lebih lama membaca nominal.
- Pada `prefers-reduced-motion`, pita berhenti di posisi awal, salinan
  kedua disembunyikan, dan tombol jeda ikut disembunyikan karena tidak ada
  lagi yang perlu dihentikan.
- Nominal memakai kuning di atas hitam (19,6:1); nama pos putih diredam
  supaya angkanya yang menonjol.

**Ikut diperbaiki:** `pasangHeader()` masih memakai ambang
`(min-width: 961px)` untuk membuang keadaan menu mobile, padahal CP-24
memindahkan breakpoint nav ke 1100px. Akibatnya di lebar 961–1100px menu
masih berwujud panel mobile tapi dipaksa tertutup saat jendela diubah
ukurannya. Disamakan jadi 1101px.

**Affects:** ketujuh berkas HTML (markup pita), `assets/js/ui.js`
(`pasangMarquee`, `isiMarquee`, `pasangIdentitas`, ambang breakpoint),
`assets/css/components.css` (viewport, tombol jeda, gaya nominal),
`assets/css/motion.css` (perilaku reduced-motion).

**Reversible:** ya. Menambah kembali Kas Iuran = satu baris di `isiMarquee`
plus satu item di tiap HTML — tapi baca dulu alasan pengeluarannya di atas.

**Status:** confirmed

---

## CP-27 · Build · 2026-08-08

**Decision:** Dibuat aplikasi Android **offline-first** (`../kas-rt-android/`) yang
membungkus situs ini apa adanya. Situs tidak ditulis ulang: folder
`kas-rt-sampangan/` disalin ke dalam APK saat build. Yang berubah adalah dari
mana halaman mendapat datanya.

**Why:** Permintaan user — "intinya apk kokoh tanpa internet tidak masalah".
Situs saat ini mati total tanpa jaringan: seluruh datanya ditarik saat halaman
dibuka, dan cadangannya hanya `localStorage` 30 menit plus `snapshot.json` yang
ter-commit. Warga yang membuka portal di area sinyal lemah melihat halaman
kosong — yang pada portal keuangan terbaca sebagai "pengurus menyembunyikan
sesuatu", persis kegagalan yang CP-08 berusaha hindari.

**Pembalikan arah yang jadi intinya.** Di situs, jaringan adalah sumber
kebenaran dan penyimpanan lokal adalah cadangan. Di aplikasi, urutannya
dibalik: **basis data lokal adalah yang ditampilkan**, dan jaringan hanya
bertugas memperbaruinya di lain waktu. Semua halaman karena itu terbuka penuh
tanpa internet, disertai keterangan kapan data terakhir ditarik.

**Tiga titik sambung, bukan tujuh halaman.** Seluruh integrasi menempel pada
tiga fungsi yang kebetulan sudah menjadi pintu tunggal:

| Seam | Berkas | Di dalam APK |
|---|---|---|
| Baca | `muatSemuaData()` — `sheets.js` | Room DB lewat jembatan native |
| Tulis | `kirimAksi()` — `auth.js` | antrian lokal (outbox), dikirim belakangan |
| Login | `mulaiLogin()`/`pasangAuth()` — `auth.js` | Credential Manager native |

Tidak ada satu pun berkas di `pages/` yang disentuh. Semua percabangan dijaga
`diApp()` / `html.di-app`, jadi kasmenoreh.my.id berperilaku persis seperti
sebelumnya di peramban.

**Google Identity Services tidak bisa dipertahankan di dalam aplikasi.** Google
memblokir alur login webnya sendiri saat halaman berjalan di WebView
(`disallowed_useragent`). Memindahkannya ke Credential Manager bukan pilihan
gaya — itu satu-satunya cara login bisa bekerja. `serverClientId` tetap memakai
Web Client ID yang sama, sehingga klaim `aud` tidak berubah dan
`verifikasiToken()` di `Code.gs` tidak perlu disentuh.

**Sesi pengurus 7 hari — dan apa yang sebenarnya dijaganya.** Setelah login
online sukses, pengurus boleh mencatat offline selama 7 hari. Yang bertahan 7
hari adalah izin MENGISI ANTRIAN LOKAL, bukan akses tulis ke buku kas: ID token
Google sendiri hanya berlaku ~1 jam, dan pengiriman antrian selalu menuntut
token segar. HP yang hilang dalam keadaan login tidak memberi penemunya
kemampuan mengubah pembukuan RT — paling jauh mengisi antrian yang akan ditolak
server. Konsisten dengan CP-22: penjaga sesungguhnya ada di Apps Script.

**Bentrok ditahan, tidak diputuskan aplikasi.** Perubahan offline yang
bertabrakan dengan perubahan pengurus lain TIDAK ditimpa dan TIDAK dibuang. Ia
masuk `antrian.html` dengan nilai lokal dan nilai server berdampingan, dan
pengurus yang memutuskan (Timpa / Buang / Coba lagi). Menimpa otomatis adalah
cara paling halus untuk kehilangan catatan keuangan tanpa jejak yang bisa
dilihat siapa pun. Sisa antrian yang tidak bentrok tetap terkirim — satu sel
yang bentrok tidak boleh membekukan sembilan catatan lain di belakangnya.

**`Code.gs` v2 WAJIB, bukan opsional.** Antrian offline tidak aman dengan
backend lama, karena dua lubang yang hanya muncul begitu klien boleh mengulang
kiriman:

1. `tambahBaris()` membuat ID di server. Jaringan yang putus tepat setelah baris
   tersimpan tapi sebelum balasannya sampai membuat percobaan berikutnya
   menambah baris kedua yang identik. → ID kini dibuat di HP (`idKlien`) dan
   server mengenali ID yang sudah ada lalu berhenti. Idempoten.
2. `ubahBaris()`/`hapusBaris()` menimpa tanpa memeriksa. → klien mengirim
   `nilaiSebelum`, server membandingkannya dengan isi terkini, dan menolak
   dengan kode `BENTROK` bila sudah berbeda.

Keduanya opsional di sisi permintaan, jadi versi 2 kompatibel mundur penuh.

**Font di-vendor.** Ketujuh halaman memanggil `fonts.googleapis.com` lewat
`<link>`. Offline itu pasti gagal, dan yang terlihat bukan "sedang offline"
melainkan judul dan angka rupiah berganti font sistem — aplikasinya tampak rusak
justru saat ia bekerja persis seperti seharusnya. Archivo dan Manrope keduanya
font variabel, jadi cukup dua berkas (58 KB total, subset latin). Situs ikut
untung: satu perjalanan CDN hilang dari jalur render kritis.

**Matrik iuran diperbesar di layar sempit, bukan diperkecil.** Nilai lama
(lencana 17px, huruf 10px, kolom nama 132px) dipilih untuk mengurangi jarak
geser. Itu tidak menyelesaikan apa pun: dengan `min-width: 920px` di layar
360px tabelnya tetap harus digeser. Yang dibeli hanya beberapa sentimeter
gulir; yang dibayar adalah huruf I/P/L yang nyaris tidak terbaca pada perangkat
yang paling sering dipakai warga. Sekarang lencana 21px/huruf 12px, kolom nama
140px, dan `min-width` naik ke 1118px. Keterbacaan menang (CP-06).

**Jalur cadangan login tidak setara, dan itu disebutkan terus terang.**
Perangkat tanpa layanan Google diarahkan membuka situs di peramban, tempat
pencatatan berlangsung online dan antrian offline tidak aktif. Membuatnya
setara menuntut alur OAuth PKCE sendiri, Client ID Android kedua, DAN `Code.gs`
menerima audiens `aud` kedua — memperlebar permukaan yang menjaga buku kas demi
kemungkinan perangkat yang di lingkungan ini praktis nol.

**Affects:** `assets/js/jembatan.js` (baru), `sheets.js`, `auth.js`, `admin.js`,
`ui.js`, `antrian.html` + `assets/js/pages/antrian.js` (baru), `assets/font/`
(baru), `assets/css/tokens.css`, `assets/css/components.css`, ketujuh berkas
HTML (tautan font), `apps-script/Code.gs` (v2), dan seluruh `../kas-rt-android/`.

**Reversible:** ya, dan terpisah. Menghapus folder `kas-rt-android/` sudah cukup
untuk membatalkan aplikasinya; perubahan di repo situs semuanya dijaga
`diApp()`/`html.di-app` dan tidak aktif di peramban. Yang TIDAK boleh dibatalkan
sendirian adalah `Code.gs` v2 selama masih ada APK beredar — antrian di HP warga
akan kehilangan jaminan idempotennya.

**Status:** confirmed (aplikasi belum pernah dikompilasi — lihat README project)
