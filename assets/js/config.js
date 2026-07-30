/* ==========================================================================
   KONFIGURASI
   Ini satu-satunya berkas yang perlu Anda sentuh untuk menyambungkan
   spreadsheet. Petunjuk lengkap ada di README.md.
   ========================================================================== */

export const CONFIG = {
  /* ------------------------------------------------------------------
     1. ID Google Spreadsheet.

     Ambil dari URL spreadsheet Anda — bagian di antara /d/ dan /edit:
     docs.google.com/spreadsheets/d/[INI_YANG_DISALIN]/edit

     Biarkan kosong ('') kalau belum siap. Situs tetap berjalan penuh
     memakai data contoh di data/snapshot.json.
     ------------------------------------------------------------------ */
  SHEET_ID: '',

  /* ------------------------------------------------------------------
     2. Cadangan CSV (opsional).

     Hanya perlu diisi kalau cara utama gagal — misalnya organisasi Anda
     memblokir endpoint gviz. Isi dengan ID dari menu
     Berkas > Bagikan > Publikasikan ke web, lalu petakan gid tiap lembar.
     ------------------------------------------------------------------ */
  PUBLISHED_ID: '',
  GIDS: {
    Pengaturan: '',
    Warga: '',
    Iuran: '',
    IPAL: '',
    Lelayu: '',
    Transaksi: '',
    Kegiatan: '',
  },

  /* ------------------------------------------------------------------
     3. Nama lembar. Harus persis sama dengan tab di spreadsheet Anda,
        termasuk huruf besar-kecilnya.
     ------------------------------------------------------------------ */
  SHEETS: {
    pengaturan: 'Pengaturan',
    warga: 'Warga',
    iuran: 'Iuran',
    ipal: 'IPAL',
    lelayu: 'Lelayu',
    transaksi: 'Transaksi',
    kegiatan: 'Kegiatan',
  },

  /* Berkas cadangan yang ikut ter-commit di repo (CP-08). */
  SNAPSHOT_URL: 'data/snapshot.json',

  /* Batas waktu per permintaan. Di atas ini dianggap gagal dan langsung
     mundur ke lapisan berikutnya — lebih baik menampilkan data lama
     dengan jujur daripada membiarkan warga menatap layar memuat. */
  TIMEOUT_MS: 9000,

  /* Simpan hasil terakhir di browser. Kunjungan berikutnya melukis
     seketika dari sini, lalu menyegarkan diam-diam di latar. */
  CACHE_KEY: 'kasrt.cache.v1',
  CACHE_TTL_MS: 1000 * 60 * 30,

  /* Tahun yang ditampilkan. Bisa ditimpa lewat lembar Pengaturan
     dengan kunci `tahun_aktif`. */
  TAHUN_DEFAULT: 2026,
};

export const BULAN_PENDEK = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
];

export const BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* Warna pos dana — dibaca JS untuk grafik SVG.
   Nilainya sengaja dicerminkan dari tokens.css; kalau Anda mengubah
   token, ubah juga di sini. */
export const WARNA_POS = {
  iuran: 'var(--pos-iuran)',
  ipal: 'var(--pos-ipal)',
  lelayu: 'var(--pos-lelayu)',
};
