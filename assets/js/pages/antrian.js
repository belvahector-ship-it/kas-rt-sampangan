/* ==========================================================================
   HALAMAN: Antrian & Riwayat  (khusus aplikasi Android)

   Tiga daftar, urut kepentingan:

     1. Perlu ditinjau  — bentrok dan penolakan; menunggu keputusan pengurus
     2. Menunggu dikirim — sudah tercatat di HP, belum sampai ke spreadsheet
     3. Riwayat terkirim — sudah diterima server

   Bagian pertama adalah alasan halaman ini ada. Ketika sebuah perubahan
   offline bertabrakan dengan perubahan pengurus lain, aplikasi TIDAK memilih
   pemenangnya sendiri: keduanya ditaruh berdampingan di sini, dan orang yang
   memutuskan. Menimpa otomatis akan menghilangkan catatan keuangan tanpa
   jejak yang bisa dilihat siapa pun.

   Rujukan keputusan: DECISIONS.md CP-27.
   ========================================================================== */

import { BULAN_PANJANG } from '../config.js';
import { rupiah, amankan, ikon, pasangHeader, selesaiRender, keadaanKosong } from '../ui.js';
import { diApp, nativeAntrian, nativeTinjau, dengarkan, getar } from '../jembatan.js';

pasangHeader();

/* --- Menerjemahkan aksi teknis jadi kalimat -------------------------------
   Isi outbox adalah nama aksi backend ("tambahDanaOp") dan muatan JSON
   mentah. Menampilkannya apa adanya berarti meminta bendahara membaca
   struktur data untuk memutuskan nasib catatannya sendiri. */

const JUDUL_AKSI = {
  setMatrik: 'Setoran warga',
  tambahTransaksi: 'Transaksi baru',
  ubahTransaksi: 'Ubah transaksi',
  hapusTransaksi: 'Hapus transaksi',
  tambahDanaOp: 'Penggunaan dana operasional',
  ubahDanaOp: 'Ubah dana operasional',
  hapusDanaOp: 'Hapus dana operasional',
};

function judulEntri(e) {
  return JUDUL_AKSI[e.aksi] || e.aksi;
}

function ringkasEntri(e) {
  const m = e.muatan || {};

  if (e.aksi === 'setMatrik') {
    const bulan = BULAN_PANJANG[Number(m.bulan)] || `bulan ke-${Number(m.bulan) + 1}`;
    const nominal = Number(m.nominal) || 0;
    return nominal > 0
      ? `${m.nama} — ${e.lembar} ${bulan}: ${rupiah(nominal)}`
      : `${m.nama} — ${e.lembar} ${bulan}: dibatalkan (belum bayar)`;
  }

  if (m.nilai) {
    const bagian = Object.keys(m.nilai)
      .filter((k) => String(m.nilai[k]).trim() !== '')
      .map((k) => `${k}: ${m.nilai[k]}`);
    return bagian.join(' · ') || '(tanpa isian)';
  }

  return `ID ${m.id || e.idKlien}`;
}

/* --- Perbandingan lokal vs server ------------------------------------------
   Ditampilkan berdampingan, bukan sebagai selisih. Bendahara perlu melihat
   dua angka utuh untuk memutuskan mana yang benar — bukan penjelasan tentang
   apa yang berubah. */

function tabelBanding(e) {
  const lokal = e.nilaiSebelum || {};
  const server = e.server || {};
  const baru = (e.muatan && e.muatan.nilai) || {};

  const kunci = [...new Set([
    ...Object.keys(lokal),
    ...Object.keys(server),
    ...Object.keys(baru),
  ])];

  if (!kunci.length) return '';

  return `
    <div class="simple-table-wrap mt-4">
      <table class="simple-table">
        <thead>
          <tr>
            <th>Kolom</th>
            <th>Saat Anda catat</th>
            <th>Di server sekarang</th>
            <th>Yang Anda tulis</th>
          </tr>
        </thead>
        <tbody>
          ${kunci.map((k) => {
            const a = lokal[k];
            const b = server[k];
            const berbeda = b !== undefined && String(a ?? '') !== String(b ?? '');
            return `
              <tr>
                <td class="cell-strong">${amankan(k)}</td>
                <td class="cell-dim">${amankan(String(a ?? '—') || '—')}</td>
                <td class="${berbeda ? 'cell-strong' : 'cell-dim'}"
                    ${berbeda ? 'style="background:var(--critical-soft)"' : ''}>
                  ${amankan(String(b ?? '—') || '—')}
                </td>
                <td class="cell-strong">${amankan(String(baru[k] ?? '—') || '—')}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

/* --- Kartu entri ----------------------------------------------------------- */

function kartu(e, { denganTombol }) {
  const status = {
    TERTUNDA: { label: 'Menunggu', kelas: 'antrian-kartu--tunggu' },
    TERKIRIM: { label: 'Terkirim', kelas: 'antrian-kartu--kirim' },
    BENTROK: { label: 'Bentrok', kelas: 'antrian-kartu--bentrok' },
    GAGAL: { label: 'Ditolak', kelas: 'antrian-kartu--gagal' },
  }[e.status] || { label: e.status, kelas: '' };

  return `
    <article class="antrian-kartu ${status.kelas} reveal" data-id="${e.id}">
      <div class="antrian-kartu__kepala">
        <span class="antrian-kartu__judul">${amankan(judulEntri(e))}</span>
        <span class="antrian-kartu__status">${amankan(status.label)}</span>
      </div>

      <p class="antrian-kartu__ringkas">${amankan(ringkasEntri(e))}</p>

      <p class="antrian-kartu__meta">
        ${amankan(e.dibuatPadaTeks)} &middot; ${amankan(e.email)}
        ${e.percobaan > 0 ? ` &middot; ${e.percobaan}× dicoba` : ''}
      </p>

      ${e.galat ? `<p class="antrian-kartu__galat">${ikon('awas')}<span>${amankan(e.galat)}</span></p>` : ''}

      ${e.status === 'BENTROK' ? tabelBanding(e) : ''}

      ${denganTombol ? `
        <div class="antrian-kartu__aksi">
          <button type="button" class="btn btn--accent" data-keputusan="timpa" data-id="${e.id}">
            Pakai catatan saya
          </button>
          <button type="button" class="btn btn--outline" data-keputusan="ulangi" data-id="${e.id}">
            Coba kirim lagi
          </button>
          <button type="button" class="btn btn--outline antrian-kartu__buang" data-keputusan="buang" data-id="${e.id}">
            Buang catatan saya
          </button>
        </div>` : ''}
    </article>`;
}

/* --- Gambar --------------------------------------------------------------- */

function gambar(data) {
  const entri = data.entri || [];

  const tinjau = entri.filter((e) => e.perluDitinjau);
  const tunggu = entri.filter((e) => e.status === 'TERTUNDA');
  const kirim = entri.filter((e) => e.status === 'TERKIRIM');

  const bagianTinjau = document.getElementById('bagian-tinjau');
  bagianTinjau.hidden = tinjau.length === 0;
  document.getElementById('daftar-tinjau').innerHTML =
    tinjau.map((e) => kartu(e, { denganTombol: true })).join('');

  document.getElementById('daftar-tertunda').innerHTML = tunggu.length
    ? tunggu.map((e) => kartu(e, { denganTombol: false })).join('')
    : keadaanKosong(
        'Tidak ada yang menunggu',
        'Semua catatan Anda sudah sampai ke spreadsheet.',
        'centang'
      );

  document.getElementById('daftar-terkirim').innerHTML = kirim.length
    ? kirim.slice(0, 30).map((e) => kartu(e, { denganTombol: false })).join('')
    : keadaanKosong('Belum ada riwayat', 'Catatan yang sudah terkirim akan muncul di sini.', 'info');

  const ringkasan = document.getElementById('ringkasan');
  if (tinjau.length) {
    ringkasan.innerHTML =
      `<strong>${tinjau.length} perubahan perlu ditinjau.</strong> ` +
      'Data di spreadsheet sudah berubah sejak Anda mencatatnya, jadi tidak ada ' +
      'yang ditimpa otomatis. Periksa perbandingannya di bawah, lalu putuskan.';
  } else if (tunggu.length) {
    ringkasan.textContent =
      `${tunggu.length} catatan menunggu dikirim. Semuanya akan terkirim sendiri ` +
      'begitu ada internet — aman ditinggal.';
  } else {
    ringkasan.textContent =
      'Tidak ada catatan yang menunggu. Semua yang Anda catat sudah masuk ke spreadsheet.';
  }

  selesaiRender();
}

/* --- Keputusan pengurus ---------------------------------------------------- */

const KONFIRMASI = {
  timpa: 'Tulis catatan Anda menimpa yang ada di server sekarang?\n\n' +
    'Perubahan pengurus lain pada kolom yang sama akan hilang. ' +
    'Isi lamanya tetap tersalin ke lembar AuditLog.',
  buang: 'Buang catatan Anda dan biarkan data server apa adanya?\n\n' +
    'Catatan ini akan hilang dari HP dan tidak pernah terkirim.',
};

document.addEventListener('click', async (ev) => {
  const tombol = ev.target.closest('[data-keputusan]');
  if (!tombol) return;

  const keputusan = tombol.dataset.keputusan;
  const id = Number(tombol.dataset.id);

  /* "Timpa" dan "buang" sama-sama menghapus pekerjaan seseorang, jadi
     keduanya dikonfirmasi. "Ulangi" tidak — ia hanya mencoba kirim ulang
     dengan pembanding yang sama, dan kalau masih bentrok ia kembali ke sini. */
  if (KONFIRMASI[keputusan] && !window.confirm(KONFIRMASI[keputusan])) return;

  tombol.disabled = true;
  try {
    await nativeTinjau(id, keputusan);
    getar();
    await muat();
  } catch (err) {
    window.alert(err.message || String(err));
    tombol.disabled = false;
  }
});

/* --- Pemuatan -------------------------------------------------------------- */

async function muat() {
  const data = await nativeAntrian();
  gambar(data);
}

async function mulai() {
  if (!diApp()) {
    /* Dibuka di peramban biasa. Halaman ini ikut ter-deploy ke
       kasmenoreh.my.id karena aset aplikasi dan situs adalah folder yang
       sama — jadi ia harus menjelaskan dirinya, bukan menampilkan tiga
       daftar kosong yang membingungkan. */
    document.getElementById('ringkasan').textContent =
      'Antrian hanya ada di dalam aplikasi Android. Di peramban, setiap ' +
      'catatan pengurus langsung dikirim ke spreadsheet saat disimpan, jadi ' +
      'tidak ada yang perlu menunggu di sini.';
    document.getElementById('daftar-tertunda').innerHTML = keadaanKosong(
      'Tidak berlaku di peramban',
      'Buka halaman ini dari aplikasi Kas RT di HP untuk melihat antrian.',
      'info'
    );
    document.getElementById('daftar-terkirim').innerHTML = '';
    selesaiRender();
    return;
  }

  await muat();

  /* Sinkronisasi bisa selesai selagi halaman ini terbuka — justru sering,
     karena pengurus membukanya tepat untuk menunggu antriannya terkirim. */
  dengarkan('sync-selesai', () => { muat(); });
}

mulai();
