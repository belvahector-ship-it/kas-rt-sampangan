/* ==========================================================================
   STORE — normalisasi lembar mentah menjadi satu bentuk data,
   lalu menurunkan seluruh statistik yang dipakai halaman.

   Semua halaman membaca dari sini. Tidak ada halaman yang boleh menghitung
   ulang saldo sendiri — kalau dua halaman menghitung dengan cara berbeda,
   warga akan melihat dua angka berbeda dan berhenti percaya pada keduanya.
   ========================================================================== */

import { CONFIG, BULAN_PENDEK } from './config.js';
import { muatSemuaData } from './sheets.js';

/* --- Pembersih nilai ------------------------------------------------------ */

/**
 * Mengubah apa pun dari spreadsheet menjadi angka.
 * Menangani: 15000 · "15000" · "15.000" · "Rp 15.000" · "15.000,50" · "" · null
 */
export function keAngka(nilai) {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : 0;
  if (nilai == null) return 0;

  const teks = String(nilai).trim();
  if (!teks) return 0;

  /* Buang semua kecuali angka, minus, titik, dan koma */
  let bersih = teks.replace(/[^\d,.-]/g, '');
  if (!bersih || bersih === '-') return 0;

  const titikTerakhir = bersih.lastIndexOf('.');
  const komaTerakhir = bersih.lastIndexOf(',');

  if (titikTerakhir > -1 && komaTerakhir > -1) {
    /* Keduanya ada — yang muncul terakhir adalah pemisah desimal */
    if (komaTerakhir > titikTerakhir) bersih = bersih.replace(/\./g, '').replace(',', '.');
    else bersih = bersih.replace(/,/g, '');
  } else if (komaTerakhir > -1) {
    /* Hanya koma. "15.000,50" sudah tertangani di atas; di sini "1500,50"
       vs "15,000". Tiga digit setelah koma hampir pasti pemisah ribuan. */
    const setelah = bersih.length - komaTerakhir - 1;
    bersih = setelah === 3 ? bersih.replace(/,/g, '') : bersih.replace(',', '.');
  } else if (titikTerakhir > -1) {
    const setelah = bersih.length - titikTerakhir - 1;
    if (setelah === 3) bersih = bersih.replace(/\./g, '');
  }

  const angka = parseFloat(bersih);
  return Number.isFinite(angka) ? angka : 0;
}

/** Normalkan tanggal apa pun ke YYYY-MM-DD, atau '' bila tidak terbaca. */
export function keTanggal(nilai) {
  if (!nilai) return '';
  const teks = String(nilai).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(teks)) return teks.slice(0, 10);

  /* DD/MM/YYYY atau D-M-YYYY. Konvensi Indonesia: hari lebih dulu. */
  const p = teks.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (p) {
    return `${p[3]}-${String(p[2]).padStart(2, '0')}-${String(p[1]).padStart(2, '0')}`;
  }

  /* YYYY/MM/DD */
  const q = teks.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (q) {
    return `${q[1]}-${String(q[2]).padStart(2, '0')}-${String(q[3]).padStart(2, '0')}`;
  }

  return '';
}

export function keTeks(nilai) {
  return nilai == null ? '' : String(nilai).trim();
}

/* --- Pencocokan kolom bulan ----------------------------------------------
   Bendahara mungkin menulis "Agt", "Agu", "Ags", "Agustus", atau "8".
   Semuanya harus mengarah ke indeks yang sama. */

const AWALAN_BULAN = [
  ['jan'], ['feb', 'peb'], ['mar'], ['apr'], ['mei', 'may'], ['jun'],
  ['jul'], ['agt', 'agu', 'ags', 'aug'], ['sep'], ['okt', 'oct'],
  ['nov', 'nop'], ['des', 'dec'],
];

function indeksBulanDariJudul(judul) {
  const j = keTeks(judul).toLowerCase();
  if (!j) return -1;

  const angka = parseInt(j, 10);
  if (!Number.isNaN(angka) && angka >= 1 && angka <= 12 && /^\d+$/.test(j)) return angka - 1;

  for (let i = 0; i < AWALAN_BULAN.length; i++) {
    if (AWALAN_BULAN[i].some((a) => j.startsWith(a))) return i;
  }
  return -1;
}

/**
 * Ubah lembar matrik (Nama | Jan..Des) menjadi peta nama → 12 angka.
 * Nama dijadikan kunci dalam huruf kecil supaya "Budi Santoso" dan
 * "budi santoso" tidak menjadi dua warga berbeda.
 */
function bacaMatrik(baris) {
  const peta = new Map();
  if (!Array.isArray(baris) || !baris.length) return peta;

  const kunciKolom = Object.keys(baris[0]);
  const kolomNama = kunciKolom.find((k) => /nama|warga|kk/i.test(k)) || kunciKolom[0];

  const petaBulan = [];
  kunciKolom.forEach((k) => {
    const idx = indeksBulanDariJudul(k);
    if (idx > -1) petaBulan.push({ kunci: k, idx });
  });

  baris.forEach((r) => {
    const nama = keTeks(r[kolomNama]);
    if (!nama) return;
    const bulan = new Array(12).fill(0);
    petaBulan.forEach(({ kunci, idx }) => { bulan[idx] = keAngka(r[kunci]); });
    peta.set(nama.toLowerCase(), { nama, bulan });
  });

  return peta;
}

/* --- Pemetaan kategori ke pos dana ---------------------------------------
   Dipertahankan persis seperti aplikasi lama supaya angka lama dan baru
   bisa dibandingkan. */

export function posDariKategori(kategori) {
  const k = keTeks(kategori).toLowerCase();
  if (k.includes('ipal') || k.includes('sanitasi') || k.includes('saluran')) return 'ipal';
  if (k.includes('lelayu') || k.includes('kematian') || k.includes('sosial') || k.includes('duka')) return 'lelayu';
  return 'iuran';
}

/* --- Normalisasi ---------------------------------------------------------- */

function normalkan(lembar, meta) {
  const S = CONFIG.SHEETS;
  const peringatan = [];

  /* Pengaturan: daftar pasangan kunci/nilai */
  const pengaturan = {};
  (lembar[S.pengaturan] || []).forEach((r) => {
    const kunciKolom = Object.keys(r);
    const kK = kunciKolom.find((k) => /kunci|key|nama|param/i.test(k)) || kunciKolom[0];
    const kN = kunciKolom.find((k) => /nilai|value|isi/i.test(k)) || kunciKolom[1];
    const kunci = keTeks(r[kK]).toLowerCase().replace(/\s+/g, '_');
    if (kunci) pengaturan[kunci] = keTeks(r[kN]);
  });

  const tahun = parseInt(pengaturan.tahun_aktif, 10) || CONFIG.TAHUN_DEFAULT;

  /* Tiga matrik pembayaran */
  const mIuran = bacaMatrik(lembar[S.iuran]);
  const mIpal = bacaMatrik(lembar[S.ipal]);
  const mLelayu = bacaMatrik(lembar[S.lelayu]);

  /* Daftar warga — sumber urutan tampil dan sumber pagu */
  const warga = [];
  const sudahDipakai = new Set();

  (lembar[S.warga] || []).forEach((r) => {
    const kunciKolom = Object.keys(r);
    const kNama = kunciKolom.find((k) => /^nama|warga|kepala/i.test(k)) || kunciKolom[0];
    const kIuran = kunciKolom.find((k) => /pagu.*iuran|iuran.*pagu/i.test(k));
    const kIpal = kunciKolom.find((k) => /pagu.*ipal|ipal.*pagu/i.test(k));
    const kLelayu = kunciKolom.find((k) => /pagu.*lelayu|lelayu.*pagu/i.test(k));

    const nama = keTeks(r[kNama]);
    if (!nama) return;
    const kunci = nama.toLowerCase();
    sudahDipakai.add(kunci);

    warga.push({
      nama,
      paguIuran: kIuran ? keAngka(r[kIuran]) : 0,
      paguIpal: kIpal ? keAngka(r[kIpal]) : 0,
      /* Pagu Lelayu opsional — banyak RT tidak mencantumkannya sama sekali
         karena sifatnya sukarela murni. Kolom absen ≠ 0 rupiah di sini;
         null berarti "tidak ada nominal standar", dipakai UI untuk
         menampilkan "Bebas" alih-alih "Rp 0". */
      paguLelayu: kLelayu ? keAngka(r[kLelayu]) : null,
      iuran: mIuran.get(kunci)?.bulan || new Array(12).fill(0),
      ipal: mIpal.get(kunci)?.bulan || new Array(12).fill(0),
      lelayu: mLelayu.get(kunci)?.bulan || new Array(12).fill(0),
    });
  });

  /* Nama yang ada di matrik tapi tidak ada di lembar Warga tetap
     ditampilkan. Uang yang sudah disetor tidak boleh hilang dari laporan
     hanya karena bendahara salah ketik nama di satu lembar. */
  [mIuran, mIpal, mLelayu].forEach((m) => {
    m.forEach((v, kunci) => {
      if (sudahDipakai.has(kunci)) return;
      sudahDipakai.add(kunci);
      peringatan.push(`"${v.nama}" ada di lembar matrik tapi tidak terdaftar di lembar Warga — pagu dianggap 0.`);
      warga.push({
        nama: v.nama,
        paguIuran: 0,
        paguIpal: 0,
        paguLelayu: null,
        iuran: mIuran.get(kunci)?.bulan || new Array(12).fill(0),
        ipal: mIpal.get(kunci)?.bulan || new Array(12).fill(0),
        lelayu: mLelayu.get(kunci)?.bulan || new Array(12).fill(0),
      });
    });
  });

  /* Transaksi kas manual */
  const transaksi = (lembar[S.transaksi] || []).map((r) => {
    const kunciKolom = Object.keys(r);
    const cari = (re) => kunciKolom.find((k) => re.test(k));
    const kTgl = cari(/tanggal|date/i) || kunciKolom[0];
    const kJenis = cari(/jenis|tipe|type/i);
    const kKat = cari(/kategori|category|pos/i);
    const kJml = cari(/jumlah|nominal|amount|nilai/i);
    const kKet = cari(/keterangan|deskripsi|catatan|uraian/i);

    const jenisMentah = keTeks(kJenis ? r[kJenis] : '').toLowerCase();
    const jenis = /keluar|expense|out|debet|debit|biaya/.test(jenisMentah) ? 'keluar' : 'masuk';
    const kategori = keTeks(kKat ? r[kKat] : '') || 'Lain-lain';

    return {
      /* Kolom ID dipakai admin untuk mengedit/menghapus baris ini.
         Sengaja merujuk ID, bukan nomor baris: nomor baris bergeser setiap
         ada penghapusan, dan salah baris pada catatan keuangan berarti
         menghapus transaksi orang lain. Kosong untuk baris lama yang
         belum sempat diberi ID — UI menyembunyikan tombol edit/hapusnya. */
      id: keTeks(r.ID || r.id || ''),
      tanggal: keTanggal(r[kTgl]),
      jenis,
      kategori,
      pos: posDariKategori(kategori),
      jumlah: Math.abs(keAngka(kJml ? r[kJml] : 0)),
      keterangan: keTeks(kKet ? r[kKet] : ''),
    };
  }).filter((t) => t.jumlah > 0 || t.keterangan);

  transaksi.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  /* Kegiatan */
  const hariIni = new Date().toISOString().slice(0, 10);
  const kegiatan = (lembar[S.kegiatan] || []).map((r) => {
    const kunciKolom = Object.keys(r);
    const cari = (re) => kunciKolom.find((k) => re.test(k));
    const kTgl = cari(/tanggal|date/i) || kunciKolom[0];
    const kJdl = cari(/judul|title|nama/i);
    const kRng = cari(/ringkasan|deskripsi|summary|isi|keterangan/i);
    const kKat = cari(/kategori|category|jenis/i);
    const kImg = cari(/gambar|image|foto|url/i);
    const kSts = cari(/status/i);

    const tanggal = keTanggal(r[kTgl]);
    const statusTertulis = keTeks(kSts ? r[kSts] : '').toLowerCase();
    const status = statusTertulis
      ? (/datang|akan|rencana|upcoming/.test(statusTertulis) ? 'mendatang' : 'selesai')
      : (tanggal && tanggal >= hariIni ? 'mendatang' : 'selesai');

    return {
      tanggal,
      judul: keTeks(kJdl ? r[kJdl] : '') || 'Tanpa judul',
      ringkasan: keTeks(kRng ? r[kRng] : ''),
      kategori: keTeks(kKat ? r[kKat] : '') || 'Pengumuman',
      gambar: keTeks(kImg ? r[kImg] : ''),
      status,
    };
  }).filter((k) => k.judul !== 'Tanpa judul' || k.ringkasan);

  kegiatan.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  /* Rekening BPD — snapshot saldo per alokasi, bukan jurnal transaksi.
     Terpisah dari Kas Utama (lihat CP-14). */
  const bankBpd = (lembar[S.bankBpd] || []).map((r) => {
    const kunciKolom = Object.keys(r);
    const cari = (re) => kunciKolom.find((k) => re.test(k));
    const kNama = cari(/alokasi|nama/i) || kunciKolom[0];
    const kSaldo = cari(/saldo|nominal/i);
    const kUpdate = cari(/perbarui|update|tanggal/i);
    const kCatatan = cari(/catatan|keterangan/i);

    return {
      namaAlokasi: keTeks(r[kNama]) || 'Alokasi',
      saldo: keAngka(kSaldo ? r[kSaldo] : 0),
      diperbarui: keTanggal(kUpdate ? r[kUpdate] : ''),
      catatan: keTeks(kCatatan ? r[kCatatan] : ''),
    };
  }).filter((a) => a.namaAlokasi);

  /* Dana Operasional — jurnal penggunaan. Saldo awal dari Pengaturan;
     sisa & terpakai dihitung, tidak pernah disimpan (lihat CP-14). */
  const danaOperasional = (lembar[S.danaOperasional] || []).map((r) => {
    const kunciKolom = Object.keys(r);
    const cari = (re) => kunciKolom.find((k) => re.test(k));
    const kTgl = cari(/tanggal|date/i) || kunciKolom[0];
    const kPengguna = cari(/pengguna|penerima|pihak/i);
    const kKat = cari(/kategori|category/i);
    const kKegiatan = cari(/kegiatan|deskripsi|keperluan/i);
    const kNominal = cari(/nominal|jumlah|amount/i);

    return {
      id: keTeks(r.ID || r.id || ''),   /* lihat catatan di transaksi di atas */
      tanggal: keTanggal(r[kTgl]),
      pengguna: keTeks(kPengguna ? r[kPengguna] : ''),
      kategori: keTeks(kKat ? r[kKat] : '') || 'Lain-lain',
      kegiatan: keTeks(kKegiatan ? r[kKegiatan] : ''),
      nominal: Math.abs(keAngka(kNominal ? r[kNominal] : 0)),
    };
  }).filter((d) => d.nominal > 0 || d.kegiatan);

  danaOperasional.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  return {
    pengaturan, tahun, warga, transaksi, kegiatan, bankBpd, danaOperasional,
    meta: { ...meta, peringatan },
  };
}

/* --- Statistik turunan ----------------------------------------------------
   PERINGATAN AKUNTANSI (DECISIONS.md CP-10, diamandemen CP-23)
   Kas Iuran dihitung sebagai SISA: Saldo Total − Kas IPAL − Kas Lelayu.
   Sejak CP-23, Kas IPAL/Lelayu sudah menghitung transaksi manual berpos itu
   (bukan cuma setoran matrik lagi) dan ditahan di 0 kalau minus — tapi
   kalau salah satu pos defisit LEBIH BESAR dari yang bisa ditutup pos itu
   sendiri, sisanya tetap diam-diam diserap Kas Iuran, bukan ditampilkan
   minus ke warga. Itu keliru secara akuntansi (pengeluaran satu pos bisa
   "ditagih" ke pos lain), tapi menjamin ketiga pos selalu berjumlah persis
   sama dengan uang fisik di tangan bendahara. Jangan ubah lagi tanpa
   membaca CP-10 dan CP-23 dulu — keduanya menjelaskan kenapa pola "serap
   ke Iuran" ini dipertahankan, bukan dihapus. */

export function hitungStatistik(data) {
  const { warga, transaksi } = data;

  const jml = (arr) => arr.reduce((a, b) => a + b, 0);

  const setoranIuran = jml(warga.map((w) => jml(w.iuran)));
  const setoranIpal = jml(warga.map((w) => jml(w.ipal)));
  const setoranLelayu = jml(warga.map((w) => jml(w.lelayu)));

  let manualMasuk = 0;
  let totalKeluar = 0;
  const manualMasukPos = { iuran: 0, ipal: 0, lelayu: 0 };
  const keluarPos = { iuran: 0, ipal: 0, lelayu: 0 };

  transaksi.forEach((t) => {
    if (t.jenis === 'masuk') {
      manualMasuk += t.jumlah;
      manualMasukPos[t.pos] += t.jumlah;
    } else {
      totalKeluar += t.jumlah;
      keluarPos[t.pos] += t.jumlah;
    }
  });

  const totalMasuk = setoranIuran + setoranIpal + setoranLelayu + manualMasuk;
  const saldo = totalMasuk - totalKeluar;

  /* Kas IPAL/Lelayu HARUS ikut menghitung transaksi manual berpos itu, bukan
     cuma setoran matrik (lihat CP-23) — sebelumnya transaksi manual yang
     sudah diklasifikasikan benar ke pos IPAL/Lelayu tetap tidak muncul di
     pool-nya, "nyasar" ke Iuran lewat baris kasIuran di bawah.
     Ditahan di 0 (bukan boleh negatif): kalau pengeluaran pos itu melebihi
     pemasukannya, pool tidak ditampilkan minus ke warga — CP-10 tetap
     dipertahankan untuk BAGIAN INI: sisa/selisihnya (termasuk yang negatif)
     tetap diserap kasIuran, supaya Iuran+IPAL+Lelayu masih selalu genap
     dengan saldo/kas fisik. */
  const kasIpal = Math.max(0, setoranIpal + manualMasukPos.ipal - keluarPos.ipal);
  const kasLelayu = Math.max(0, setoranLelayu + manualMasukPos.lelayu - keluarPos.lelayu);
  const kasIuran = saldo - kasIpal - kasLelayu; /* lihat CP-10, CP-23 */

  const paguIuranTotal = jml(warga.map((w) => w.paguIuran));
  const paguIpalTotal = jml(warga.map((w) => w.paguIpal));
  /* Lelayu tetap sukarela — pagu di sini adalah NOMINAL STANDAR saat warga
     menyumbang, bukan kewajiban. Hanya dijumlah kalau memang diisi bendahara
     di lembar Warga (kolom Pagu Lelayu opsional). */
  const adaPaguLelayu = warga.some((w) => w.paguLelayu != null);
  const paguLelayuTotal = adaPaguLelayu ? jml(warga.map((w) => w.paguLelayu || 0)) : 0;

  /* Rekapitulasi per bulan untuk grafik tren */
  const perBulan = Array.from({ length: 12 }, (_, i) => {
    const iuran = jml(warga.map((w) => w.iuran[i]));
    const ipal = jml(warga.map((w) => w.ipal[i]));
    const lelayu = jml(warga.map((w) => w.lelayu[i]));

    let manual = 0;
    let keluar = 0;
    transaksi.forEach((t) => {
      if (!t.tanggal) return;
      if (parseInt(t.tanggal.slice(5, 7), 10) - 1 !== i) return;
      if (t.jenis === 'masuk') manual += t.jumlah;
      else keluar += t.jumlah;
    });

    return {
      bulan: i,
      label: BULAN_PENDEK[i],
      iuran, ipal, lelayu,
      masuk: iuran + ipal + lelayu + manual,
      keluar,
      selisih: iuran + ipal + lelayu + manual - keluar,
    };
  });

  /* Rekapitulasi per kategori untuk rincian di halaman laporan */
  const perKategori = {};
  transaksi.forEach((t) => {
    const kunci = `${t.kategori}::${t.jenis}`;
    if (!perKategori[kunci]) {
      perKategori[kunci] = { kategori: t.kategori, jenis: t.jenis, total: 0, jumlahEntri: 0 };
    }
    perKategori[kunci].total += t.jumlah;
    perKategori[kunci].jumlahEntri += 1;
  });

  /* Berapa bulan yang sudah lewat di tahun aktif — dipakai menghitung
     target realistis, bukan target 12 bulan penuh sejak Januari. */
  const sekarang = new Date();
  const bulanBerjalan = sekarang.getFullYear() === data.tahun
    ? sekarang.getMonth() + 1
    : (sekarang.getFullYear() > data.tahun ? 12 : 0);

  return {
    jumlahKK: warga.length,
    totalMasuk,
    totalKeluar,
    saldo,
    kasIuran, kasIpal, kasLelayu,
    setoranIuran, setoranIpal, setoranLelayu,
    masukIuran: setoranIuran + manualMasukPos.iuran,
    masukIpal: setoranIpal + manualMasukPos.ipal,
    masukLelayu: setoranLelayu + manualMasukPos.lelayu,
    keluarIuran: keluarPos.iuran,
    keluarIpal: keluarPos.ipal,
    keluarLelayu: keluarPos.lelayu,
    paguIuranTotal,
    paguIpalTotal,
    paguLelayuTotal,
    adaPaguLelayu,
    komitmenBulanan: paguIuranTotal + paguIpalTotal,
    targetIuran: paguIuranTotal * bulanBerjalan,
    targetIpal: paguIpalTotal * bulanBerjalan,
    targetLelayu: paguLelayuTotal * bulanBerjalan,
    bulanBerjalan,
    perBulan,
    perKategori: Object.values(perKategori).sort((a, b) => b.total - a.total),
  };
}

/* --- Statistik: Rekening BPD & Dana Operasional ---------------------------
   Sengaja dipisah dari hitungStatistik() di atas — dua kantong dana ini
   TIDAK dijumlahkan ke saldo Kas Utama. Lihat DECISIONS.md CP-14. */

export function hitungStatistikLain(data) {
  const { bankBpd, danaOperasional, pengaturan } = data;

  const totalBpd = bankBpd.reduce((a, b) => a + b.saldo, 0);

  const danaOperasionalSaldoAwal = keAngka(pengaturan.dana_operasional_saldo_awal);
  const danaOperasionalTerpakai = danaOperasional.reduce((a, d) => a + d.nominal, 0);
  const danaOperasionalSisa = danaOperasionalSaldoAwal - danaOperasionalTerpakai;

  return {
    totalBpd,
    danaOperasionalSaldoAwal,
    danaOperasionalTerpakai,
    danaOperasionalSisa,
    danaOperasionalSumber: keTeks(pengaturan.dana_operasional_sumber),
  };
}

/* --- Titik masuk tunggal -------------------------------------------------- */

let janji = null;

/** Memuat sekali per halaman, lalu membagikan hasil yang sama ke semua pemanggil. */
export function ambilData() {
  if (!janji) {
    janji = muatSemuaData().then(({ lembar, meta }) => {
      const data = normalkan(lembar, meta);
      return { ...data, stat: hitungStatistik(data), statLain: hitungStatistikLain(data) };
    });
  }
  return janji;
}

/**
 * Buang hasil yang sudah dimuat DAN cache di localStorage, lalu muat ulang.
 *
 * Wajib dipanggil setelah operasi tulis berhasil. Tanpa ini, bendahara yang
 * baru saja menandai iuran lunas akan melihat tampilan lama sampai cache
 * 30 menit (CONFIG.CACHE_TTL_MS) kedaluwarsa — dan hampir pasti menyimpulkan
 * bahwa kliknya gagal, lalu mengklik lagi.
 */
export function segarkanData() {
  janji = null;
  try {
    localStorage.removeItem(CONFIG.CACHE_KEY);
  } catch {
    /* mode privat / kuota penuh — cache memang cuma optimasi */
  }
  return ambilData();
}
