/* ==========================================================================
   HALAMAN: Beranda
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  rupiah, nomorWA, amankan, pasangHeader, pasangIdentitas,
  pitaSumberData, selesaiRender,
} from '../ui.js';

pasangHeader();

/** Isi kartu saldo & statistik ringkas dari objek statistik terhitung. */
function isiAngka(stat) {
  const peta = {
    saldo: stat.saldo,
    kasIuran: stat.kasIuran,
    kasIpal: stat.kasIpal,
    kasLelayu: stat.kasLelayu,
    totalMasuk: stat.totalMasuk,
    totalKeluar: stat.totalKeluar,
    jumlahKK: stat.jumlahKK,
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

  document.querySelector('.balance').removeAttribute('data-loading');
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
  isiAngka(data.stat);
  isiKontak(data.pengaturan || {});

  selesaiRender();
}

mulai();
