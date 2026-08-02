/* ==========================================================================
   HALAMAN: Beranda
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  rupiah, nomorWA, amankan, pasangHeader, pasangIdentitas,
  pitaSumberData, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin } from '../admin.js';

pasangHeader();

/** Isi kartu saldo & statistik ringkas dari objek statistik terhitung.
    @param stat dari hitungStatistik() — Kas Utama (Iuran/IPAL/Lelayu).
    @param statLain dari hitungStatistikLain() — Rekening BPD & Dana
           Operasional. Ditampilkan sebagai dua kartu ringkas TERPISAH
           (bukan dijumlahkan ke Kas Utama) — lihat CP-14: dua kantong ini
           punya aturan pakai sendiri, tidak boleh terkesan satu pot. */
function isiAngka(stat, statLain) {
  const peta = {
    saldo: stat.saldo,
    kasIuran: stat.kasIuran,
    kasIpal: stat.kasIpal,
    kasLelayu: stat.kasLelayu,
    totalMasuk: stat.totalMasuk,
    totalKeluar: stat.totalKeluar,
    jumlahKK: stat.jumlahKK,
    totalBpd: statLain.totalBpd,
    danaOperasionalSisa: statLain.danaOperasionalSisa,
  };

  document.querySelectorAll('[data-target]').forEach((el) => {
    const kunci = el.dataset.target;
    if (!(kunci in peta)) return;
    const nilai = peta[kunci];
    el.dataset.nilai = String(nilai);
    /* Skeleton diganti isi asli; animasi hitung-naik mengambil alih dari sini
       lewat selesaiRender() -> pasangHitungNaik(). */
    el.textContent = el.dataset.bentuk === 'angka' ? '0' : rupiah(0);
  });

  document.querySelectorAll('.balance').forEach((el) => el.removeAttribute('data-loading'));
}

function isiKontak(pengaturan) {
  const nama = pengaturan.bendahara_nama || 'Bendahara RT';
  const wa = pengaturan.bendahara_wa || '';
  const alamat = pengaturan.bendahara_alamat || '—';
  const waLink = wa ? `https://wa.me/${nomorWA(wa)}` : '#';

  document.querySelectorAll('[data-isi-bendahara="nama"]').forEach((el) => { el.textContent = nama; });
  document.querySelectorAll('[data-isi-bendahara="wa"]').forEach((el) => { el.textContent = wa || '—'; });
  document.querySelectorAll('[data-isi-bendahara="alamat"]').forEach((el) => { el.textContent = alamat; });

  ['btn-wa-hero', 'footer-wa'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (wa) el.href = waLink;
    else { el.setAttribute('aria-disabled', 'true'); el.classList.add('btn--outline'); }
  });

  const email = document.getElementById('footer-email');
  if (email) {
    if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`;
    else email.style.display = 'none';
  }
}

async function mulai() {
  const data = await ambilData();

  pasangIdentitas(data);
  pitaSumberData(data);
  isiAngka(data.stat, data.statLain);
  isiKontak(data.pengaturan || {});

  selesaiRender();

  /* Halaman ini tidak punya operasi tulis. pasangHalamanAdmin tetap
     dipanggil supaya tombol "Pengurus" dan pemulihan sesi tersedia dari
     Beranda juga — bendahara yang mendarat di sini (halaman paling sering
     dibuka) tidak boleh harus pindah ke Laporan Kas dulu hanya untuk
     login. */
  pasangHalamanAdmin();
}

mulai();
