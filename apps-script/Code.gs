/* ==========================================================================
   BACKEND TULIS — Google Apps Script Web App
   Portal Transparansi Kas RT 01 / RW 04 Sampangan

   Berkas ini TIDAK dijalankan dari repo. Isinya disalin ke editor Apps Script
   yang menempel pada Google Spreadsheet, lalu di-deploy sebagai Web App.
   Disimpan di sini supaya ikut terversi di git — tanpa ini, satu-satunya
   salinan kode backend ada di dalam editor Google dan tidak punya riwayat.

   PENTING — INI SATU-SATUNYA PENJAGA PEMBUKUAN RT.
   Web App di-deploy dengan akses "Anyone", artinya siapa pun di internet bisa
   mengirim POST ke URL-nya. Yang mencegah orang asing menulis ke buku kas RT
   HANYA fungsi verifikasiToken() di bawah. Jangan pernah melonggarkannya,
   dan jangan pernah memindahkan pemeriksaan whitelist ke sisi klien —
   JavaScript di browser bisa diedit siapa saja lewat DevTools.

   VERSI 2 — MENDUKUNG PENCATATAN OFFLINE DARI APLIKASI ANDROID.

   Aplikasi Android menyimpan perubahan pengurus di antrian lokal saat tidak
   ada jaringan, lalu mengirimkannya belakangan. Itu memunculkan dua persoalan
   yang tidak ada ketika satu-satunya klien adalah halaman web online, dan
   keduanya ditangani di berkas ini:

   1. PENGIRIMAN ULANG BISA MENGGANDAKAN CATATAN.
      Kalau jaringan putus tepat setelah baris tersimpan tapi sebelum
      balasannya sampai, aplikasi akan mencoba lagi — dan versi lama akan
      menambahkan baris kedua yang identik. Jawabannya: ID baris dibuat di
      HP (`idKlien`), bukan di sini, dan `tambahBaris` mengenali ID yang sudah
      ada lalu berhenti. Aman diulang berapa kali pun.

   2. DUA PENGURUS BISA MENGUBAH HAL YANG SAMA.
      Perubahan yang mengendap sehari di antrian bisa saja menimpa pekerjaan
      pengurus lain yang sudah masuk lebih dulu. Jawabannya: klien mengirim
      `nilaiSebelum` — isi sel seperti yang ia lihat saat menekan Simpan — dan
      di sini dibandingkan dengan isi terkini. Kalau berbeda, TIDAK ditulis;
      dikembalikan kode BENTROK beserta isi server, dan aplikasi menyerahkan
      keputusannya ke pengurus. Menimpa diam-diam adalah cara paling halus
      untuk kehilangan catatan keuangan tanpa ada yang menyadarinya.

   Keduanya OPSIONAL: permintaan tanpa `idKlien` dan tanpa `nilaiSebelum`
   berperilaku persis seperti versi 1, jadi kasmenoreh.my.id yang sekarang
   tetap berjalan tanpa perlu diubah sedikit pun.

   Rujukan keputusan: DECISIONS.md CP-22 (menggantikan sebagian CP-02),
   CP-27 (aplikasi Android offline-first).
   ========================================================================== */

/* --- Konfigurasi ---------------------------------------------------------- */

/** Client ID OAuth. Dipakai memeriksa klaim `aud` pada ID token. */
var CLIENT_ID = '274152936634-k5hivklb0gdf413sgf6m73v6k9rthtfn.apps.googleusercontent.com';

/** Daftar email yang boleh menulis — SENGAJA TIDAK ditulis di berkas ini.
    Repo ini publik; mencantumkan alamat email pribadi di sini akan
    memaparkannya ke perayap spam. Keamanan sendiri tidak bergantung pada
    kerahasiaan daftar ini (mengetahui email tidak membuat orang bisa
    menyamar sebagai pemiliknya) — ini murni soal privasi.

    Disimpan di Script Properties, dipisah koma. Cara mengisinya:
      Apps Script → Setelan Project → Properti skrip → Tambahkan properti
      Kunci : ADMIN_EMAILS
      Nilai : email1@gmail.com,email2@gmail.com

    Untuk menambah pengurus baru: tambahkan emailnya di properti itu DAN
    daftarkan sebagai test user di Google Cloud Console → Google Auth
    Platform → Audience. Keduanya harus, kalau salah satu terlewat
    loginnya akan ditolak. */
function ambilAdminEmails() {
  var mentah = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS');
  if (!mentah) {
    throw new Error(
      'Properti skrip ADMIN_EMAILS belum diisi. Buka Apps Script → ' +
      'Setelan Project → Properti skrip, tambahkan kunci ADMIN_EMAILS ' +
      'berisi email pengurus dipisah koma.'
    );
  }
  return mentah.split(',').map(function (e) {
    return String(e).trim().toLowerCase();
  }).filter(Boolean);
}

/** ID spreadsheet yang dikelola. */
var SHEET_ID = '1BMVLZk7yHYCFzzg_IynYzB1jGxNwJt8_xS1AvnE5ItU';

/** Nama lembar. Dipakai juga sebagai daftar putih — aksi hanya boleh
    menyentuh lembar yang tercantum di sini, supaya parameter dari klien
    tidak bisa mengarahkan tulisan ke lembar sembarangan. */
var LEMBAR = {
  IURAN: 'Iuran',
  IPAL: 'IPAL',
  LELAYU: 'Lelayu',
  TRANSAKSI: 'Transaksi',
  DANA_OPERASIONAL: 'DanaOperasional',
  AUDIT: 'AuditLog',
};

var POS_VALID = [LEMBAR.IURAN, LEMBAR.IPAL, LEMBAR.LELAYU];

/* --- Titik masuk ---------------------------------------------------------- */

/* --- Galat bertipe -------------------------------------------------------
   Klien perlu MEMBEDAKAN tiga kegagalan, karena tindak lanjutnya berlawanan:

     BENTROK  data sudah berubah duluan  → tahan, tanyakan pengurus
     AUTH     sesi habis / bukan pengurus → minta login ulang, antrian tetap
     (lain)   isinya memang salah         → jangan diulang, tampilkan pesannya

   Tanpa pembeda ini aplikasi hanya punya satu pilihan untuk ketiganya, dan
   pilihan apa pun yang diambilnya akan salah untuk dua kasus lainnya. */

function GalatBentrok(pesan, server) {
  var e = new Error(pesan);
  e.kode = 'BENTROK';
  e.server = server || null;
  return e;
}

function GalatAuth(pesan) {
  var e = new Error(pesan);
  e.kode = 'AUTH';
  return e;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Permintaan kosong');
    }

    var body = JSON.parse(e.postData.contents);
    var email = verifikasiToken(body.idToken);

    var hasil = jalankanAksi(body, email);
    return keluaran({ ok: true, data: hasil });
  } catch (err) {
    /* Pesan galat dikembalikan apa adanya supaya bendahara tahu apa yang
       salah (mis. "Nama tidak ditemukan"). Tidak ada rahasia di sini —
       token tidak pernah ikut dikembalikan. */
    var jawab = { ok: false, error: String((err && err.message) || err) };
    if (err && err.kode) jawab.kode = err.kode;
    if (err && err.server) jawab.server = err.server;
    return keluaran(jawab);
  }
}

/** GET dipakai hanya untuk memastikan Web App hidup saat menyiapkan. */
function doGet() {
  return keluaran({ ok: true, data: { pesan: 'Backend kas RT aktif' } });
}

function keluaran(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* --- Verifikasi identitas -------------------------------------------------
   Empat pemeriksaan, semuanya wajib. Menghapus salah satu membuka lubang:
   - tanpa cek `aud`: ID token yang diterbitkan untuk aplikasi Google LAIN
     bisa dipakai di sini
   - tanpa cek `email_verified`: akun dengan email belum terverifikasi bisa
     menyamar sebagai alamat orang lain
   - tanpa cek `exp`: token lama yang bocor berlaku selamanya
   - tanpa cek whitelist: siapa pun dengan akun Google bisa menulis
   -------------------------------------------------------------------------- */

function verifikasiToken(idToken) {
  if (!idToken) throw GalatAuth('Belum login');

  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );

  if (res.getResponseCode() !== 200) {
    throw GalatAuth('Token tidak sah atau sudah kedaluwarsa. Silakan login ulang.');
  }

  var info = JSON.parse(res.getContentText());

  if (info.aud !== CLIENT_ID) {
    throw new Error('Token bukan untuk aplikasi ini');
  }
  if (String(info.email_verified) !== 'true') {
    throw new Error('Email Google Anda belum terverifikasi');
  }
  if (!info.exp || (Number(info.exp) * 1000) < Date.now()) {
    throw GalatAuth('Sesi sudah kedaluwarsa. Silakan login ulang.');
  }

  var email = String(info.email || '').trim().toLowerCase();
  if (ambilAdminEmails().indexOf(email) === -1) {
    throw GalatAuth('Akun ' + email + ' tidak terdaftar sebagai pengurus');
  }

  return email;
}

/* --- Router aksi ---------------------------------------------------------- */

function jalankanAksi(body, email) {
  switch (body.aksi) {
    case 'whoami':          return { email: email, admin: true };

    case 'setMatrik':       return setMatrik(body, email);

    case 'tambahTransaksi': return tambahBaris(LEMBAR.TRANSAKSI, body, email);
    case 'ubahTransaksi':   return ubahBaris(LEMBAR.TRANSAKSI, body, email);
    case 'hapusTransaksi':  return hapusBaris(LEMBAR.TRANSAKSI, body, email);

    case 'tambahDanaOp':    return tambahBaris(LEMBAR.DANA_OPERASIONAL, body, email);
    case 'ubahDanaOp':      return ubahBaris(LEMBAR.DANA_OPERASIONAL, body, email);
    case 'hapusDanaOp':     return hapusBaris(LEMBAR.DANA_OPERASIONAL, body, email);

    default:
      throw new Error('Aksi tidak dikenal: ' + body.aksi);
  }
}

/* --- Pembantu ------------------------------------------------------------- */

function ambilLembar(nama) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(nama);
  if (!sh) throw new Error('Lembar "' + nama + '" tidak ditemukan di spreadsheet');
  return sh;
}

/** Baris 1 = judul kolom. Kembalikan peta {judul: indeks 0-based}. */
function petaKolom(sh) {
  var judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var peta = {};
  for (var i = 0; i < judul.length; i++) {
    var k = String(judul[i]).trim();
    if (k) peta[k] = i;
  }
  return peta;
}

function butuhKolom(peta, nama, lembar) {
  if (!(nama in peta)) {
    throw new Error('Kolom "' + nama + '" tidak ada di lembar ' + lembar);
  }
  return peta[nama];
}

/** ID unik untuk baris jurnal. Bukan UUID penuh — cukup unik untuk skala RT,
    dan enak dibaca manusia saat menelusuri AuditLog. */
function buatId() {
  return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function keAngka(v) {
  if (typeof v === 'number') return v;
  var t = String(v == null ? '' : v).replace(/[^\d.-]/g, '');
  var n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

/* --- Perbandingan nilai untuk deteksi bentrok -----------------------------
   Nilai yang sama bisa datang dalam tiga wujud berbeda: objek Date dari
   spreadsheet, string "2026-01-15" hasil normalisasi gviz di sisi klien, dan
   angka yang tersimpan sebagai teks. Membandingkannya mentah-mentah akan
   menyatakan bentrok pada baris yang sebenarnya tidak berubah sama sekali —
   dan bentrok palsu jauh lebih merusak daripada tidak ada deteksi: pengurus
   akan belajar menekan "Timpa" tanpa membaca, dan sejak itu deteksinya tidak
   lagi menjaga apa pun.

   Zona waktu dipatok Asia/Jakarta, sama dengan yang dipakai catatAudit. */

function normalNilai(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  if (typeof v === 'number') return String(v);

  var s = String(v).trim();
  if (s === '') return '';
  if (!isNaN(Number(s))) return String(Number(s));
  return s;
}

function samaNilai(a, b) {
  return normalNilai(a) === normalNilai(b);
}

/**
 * Membandingkan potret klien dengan isi sel yang sebenarnya.
 *
 * @param nilaiSebelum objek {kolom: nilai} kiriman klien, atau null/undefined
 *        bila klien memang tidak mengirimkannya (klien web versi lama, atau
 *        aksi tambah). Tanpa potret, TIDAK ADA pemeriksaan — perilaku versi 1
 *        dipertahankan apa adanya.
 * @param bacaSel fungsi (namaKolom) => nilai terkini
 * @throws GalatBentrok bila ada satu kolom pun yang sudah berbeda
 */
function periksaBentrok(nilaiSebelum, bacaSel, keterangan) {
  if (!nilaiSebelum || typeof nilaiSebelum !== 'object') return;

  var server = {};
  var berbeda = [];

  for (var kunci in nilaiSebelum) {
    var terkini = bacaSel(kunci);
    server[kunci] = normalNilai(terkini);
    if (!samaNilai(terkini, nilaiSebelum[kunci])) berbeda.push(kunci);
  }

  if (berbeda.length) {
    throw GalatBentrok(
      keterangan + ' sudah diubah orang lain sejak Anda mencatatnya (kolom: ' +
      berbeda.join(', ') + ')',
      server
    );
  }
}

/* --- AuditLog -------------------------------------------------------------
   Ditulis SETELAH operasi utama sukses. Kalau pencatatan audit sendiri gagal
   (mis. lembar AuditLog terhapus), operasi utama TIDAK dibatalkan — data
   keuangan lebih penting daripada lognya, dan kegagalan audit dilaporkan
   lewat konsol server, bukan dengan menggagalkan input bendahara. */

function catatAudit(email, aksi, lembar, detail) {
  try {
    var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LEMBAR.AUDIT);
    if (!sh) return;
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
      email,
      aksi,
      lembar,
      typeof detail === 'string' ? detail : JSON.stringify(detail),
    ]);
  } catch (err) {
    console.error('Gagal menulis AuditLog: ' + err);
  }
}

/* --- Aksi: matrik iuran ---------------------------------------------------
   Menandai/membatalkan setoran satu warga pada satu bulan. Nominal 0 atau
   kosong berarti "belum bayar" — konsisten dengan cara situs membacanya. */

function setMatrik(p, email) {
  if (POS_VALID.indexOf(p.pos) === -1) {
    throw new Error('Pos tidak sah: ' + p.pos);
  }
  var bulan = Number(p.bulan);
  if (!(bulan >= 0 && bulan <= 11)) {
    throw new Error('Bulan tidak sah: ' + p.bulan);
  }
  var nama = String(p.nama || '').trim();
  if (!nama) throw new Error('Nama warga kosong');

  var sh = ambilLembar(p.pos);
  var jumlahBaris = sh.getLastRow();
  if (jumlahBaris < 2) throw new Error('Lembar ' + p.pos + ' masih kosong');

  var kolomNama = sh.getRange(2, 1, jumlahBaris - 1, 1).getValues();
  var barisTarget = -1;
  for (var i = 0; i < kolomNama.length; i++) {
    if (String(kolomNama[i][0]).trim().toLowerCase() === nama.toLowerCase()) {
      barisTarget = i + 2;
      break;
    }
  }
  if (barisTarget === -1) {
    throw new Error('Warga "' + nama + '" tidak ada di lembar ' + p.pos);
  }

  /* Kolom 1 = Nama, kolom 2..13 = Jan..Des */
  var kolomTarget = bulan + 2;
  var nominal = keAngka(p.nominal);
  var sel = sh.getRange(barisTarget, kolomTarget);
  var sebelum = sel.getValue();

  /* Potret dari klien berkunci NAMA KOLOM ("Jan".."Des"), sementara di sini
     yang ada cuma satu sel. Nilainya diambil dari kunci mana pun yang
     dikirim — hanya ada satu, karena Penerap.nilaiSebelum() memang cuma
     memotret sel yang disentuh. */
  periksaBentrok(
    p.nilaiSebelum,
    function () { return sebelum; },
    'Setoran ' + nama + ' bulan ke-' + (bulan + 1) + ' di ' + p.pos
  );

  if (nominal > 0) sel.setValue(nominal);
  else sel.clearContent();

  catatAudit(email, nominal > 0 ? 'tandai-lunas' : 'batal-lunas', p.pos,
    nama + ' bulan ke-' + (bulan + 1) + ': ' + (sebelum || 0) + ' → ' + (nominal || 0));

  return { nama: nama, pos: p.pos, bulan: bulan, nominal: nominal };
}

/* --- Aksi generik: tambah / ubah / hapus baris jurnal ---------------------
   Dipakai bersama oleh Transaksi dan DanaOperasional. Keduanya berbentuk
   jurnal (satu baris = satu kejadian) dan punya kolom ID, jadi logikanya
   identik — yang beda hanya nama lembar dan kolomnya. */

function tambahBaris(namaLembar, p, email) {
  var sh = ambilLembar(namaLembar);
  var peta = petaKolom(sh);
  var kolomId = butuhKolom(peta, 'ID', namaLembar);

  /* ID dari klien kalau ada. INILAH yang membuat pengiriman ulang aman:
     kalau baris dengan ID ini sudah ada, permintaan ini adalah percobaan
     kedua atas catatan yang SAMA — bukan catatan baru. Dijawab sukses tanpa
     menulis apa pun, sehingga aplikasi bisa mencoret entrinya dari antrian
     dan tidak ada transaksi yang tercatat dua kali di buku kas.

     Tanpa idKlien, perilakunya persis versi 1: ID dibuat di sini. */
  var id = String(p.idKlien || '').trim();
  if (id) {
    var sudahAda = cariBarisOpsional(sh, id, namaLembar);
    if (sudahAda) {
      catatAudit(email, 'tambah-diulang', namaLembar, { id: id });
      return { id: id, sudahAda: true };
    }
  } else {
    id = buatId();
  }

  var judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var baris = new Array(judul.length).fill('');
  baris[kolomId] = id;

  var nilai = p.nilai || {};
  for (var kunci in nilai) {
    if (kunci === 'ID') continue; /* ID tidak boleh ditentukan klien */
    if (kunci in peta) baris[peta[kunci]] = nilai[kunci];
  }

  sh.appendRow(baris);
  catatAudit(email, 'tambah', namaLembar, { id: id, nilai: nilai });
  return { id: id };
}

/** Seperti cariBarisById, tapi mengembalikan null alih-alih melempar. */
function cariBarisOpsional(sh, id, namaLembar) {
  var peta = petaKolom(sh);
  var kolomId = butuhKolom(peta, 'ID', namaLembar);
  var jumlahBaris = sh.getLastRow();
  if (jumlahBaris < 2) return null;

  var kolom = sh.getRange(2, kolomId + 1, jumlahBaris - 1, 1).getValues();
  for (var i = 0; i < kolom.length; i++) {
    if (String(kolom[i][0]).trim() === String(id).trim()) {
      return { baris: i + 2, peta: peta };
    }
  }
  return null;
}

function cariBarisById(sh, id, namaLembar) {
  var temu = cariBarisOpsional(sh, id, namaLembar);
  if (temu) return temu;

  /* Baris yang hilang BUKAN kegagalan biasa — hampir selalu berarti pengurus
     lain sudah menghapusnya. Dikembalikan sebagai BENTROK supaya aplikasi
     menahannya untuk ditinjau, bukan menandainya gagal permanen dan
     membuang catatan yang mungkin masih ingin dipulihkan pemiliknya. */
  throw GalatBentrok(
    'Baris dengan ID ' + id + ' tidak ditemukan — mungkin sudah dihapus orang lain',
    null
  );
}

function ubahBaris(namaLembar, p, email) {
  if (!p.id) throw new Error('ID baris tidak disertakan');
  var sh = ambilLembar(namaLembar);
  var temu = cariBarisById(sh, p.id, namaLembar);

  /* Diperiksa SEBELUM satu sel pun ditulis. Kalau pemeriksaan diselipkan di
     tengah perulangan, sebagian kolom sudah berubah saat bentrok ditemukan —
     dan baris itu berakhir setengah-lama-setengah-baru, keadaan yang tidak
     dikehendaki siapa pun dan tidak tercatat di mana pun. */
  periksaBentrok(
    p.nilaiSebelum,
    function (kunci) {
      if (!(kunci in temu.peta)) return '';
      return sh.getRange(temu.baris, temu.peta[kunci] + 1).getValue();
    },
    'Catatan ini'
  );

  var nilai = p.nilai || {};
  var perubahan = {};
  for (var kunci in nilai) {
    if (kunci === 'ID') continue; /* ID tidak pernah boleh diubah */
    if (!(kunci in temu.peta)) continue;
    var sel = sh.getRange(temu.baris, temu.peta[kunci] + 1);
    perubahan[kunci] = { dari: sel.getValue(), ke: nilai[kunci] };
    sel.setValue(nilai[kunci]);
  }

  catatAudit(email, 'ubah', namaLembar, { id: p.id, perubahan: perubahan });
  return { id: p.id };
}

function hapusBaris(namaLembar, p, email) {
  if (!p.id) throw new Error('ID baris tidak disertakan');
  var sh = ambilLembar(namaLembar);
  var temu = cariBarisById(sh, p.id, namaLembar);

  /* Salin isi baris ke audit SEBELUM dihapus — ini satu-satunya jejak yang
     tersisa setelah baris hilang dari lembar. */
  var judul = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var isi = sh.getRange(temu.baris, 1, 1, sh.getLastColumn()).getValues()[0];
  var salinan = {};
  for (var i = 0; i < judul.length; i++) {
    var k = String(judul[i]).trim();
    if (k) salinan[k] = isi[i];
  }

  /* Penghapusan diperiksa terhadap SELURUH baris, bukan sebagian kolom.
     Menghapus catatan tidak bisa dibatalkan dari sisi mana pun, jadi ambang
     kehati-hatiannya memang sengaja dibuat lebih tinggi daripada mengubah:
     satu kolom saja yang sudah berbeda cukup untuk menahannya. */
  periksaBentrok(
    p.nilaiSebelum,
    function (kunci) { return salinan[kunci]; },
    'Catatan yang akan dihapus'
  );

  sh.deleteRow(temu.baris);
  catatAudit(email, 'hapus', namaLembar, { id: p.id, isiSebelumDihapus: salinan });
  return { id: p.id };
}

/* --- Penyiapan sekali jalan ----------------------------------------------
   Jalankan MANUAL dari editor Apps Script (pilih fungsi ini lalu klik Run)
   untuk menyiapkan struktur yang dibutuhkan: kolom ID dan lembar AuditLog.
   Aman dijalankan berulang — tidak menimpa apa pun yang sudah ada. */

function siapkanStruktur() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var laporan = [];

  /* 1. Lembar AuditLog */
  var audit = ss.getSheetByName(LEMBAR.AUDIT);
  if (!audit) {
    audit = ss.insertSheet(LEMBAR.AUDIT);
    audit.appendRow(['Waktu', 'Email', 'Aksi', 'Lembar', 'Detail']);
    audit.setFrozenRows(1);
    laporan.push('Lembar AuditLog dibuat');
  } else {
    laporan.push('Lembar AuditLog sudah ada');
  }

  /* 2. Kolom ID di lembar jurnal */
  [LEMBAR.TRANSAKSI, LEMBAR.DANA_OPERASIONAL].forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    if (!sh) { laporan.push('LEWAT: lembar ' + nama + ' tidak ada'); return; }

    var peta = petaKolom(sh);
    if ('ID' in peta) {
      /* Kolom sudah ada — isi ID untuk baris lama yang masih kosong */
      var kolomId = peta['ID'] + 1;
      var jumlahBaris = sh.getLastRow();
      var terisi = 0;
      if (jumlahBaris >= 2) {
        var nilai = sh.getRange(2, kolomId, jumlahBaris - 1, 1).getValues();
        for (var i = 0; i < nilai.length; i++) {
          if (!String(nilai[i][0]).trim()) {
            sh.getRange(i + 2, kolomId).setValue(buatId());
            terisi++;
          }
        }
      }
      laporan.push(nama + ': kolom ID sudah ada, ' + terisi + ' baris lama diberi ID');
      return;
    }

    /* Sisipkan kolom ID di paling kiri, lalu isi untuk semua baris lama */
    sh.insertColumnBefore(1);
    sh.getRange(1, 1).setValue('ID');
    var akhir = sh.getLastRow();
    for (var r = 2; r <= akhir; r++) {
      sh.getRange(r, 1).setValue(buatId());
    }
    laporan.push(nama + ': kolom ID ditambahkan untuk ' + Math.max(0, akhir - 1) + ' baris');
  });

  var pesan = laporan.join('\n');
  console.log(pesan);
  return pesan;
}
