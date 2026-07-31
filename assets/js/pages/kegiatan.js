/* ==========================================================================
   HALAMAN: Kegiatan & Pengumuman
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  tanggalPanjang, amankan, inisial, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin } from '../admin.js';

pasangHeader();

let DAFTAR = [];
let saringan = 'semua';

function isiKontakFooter(pengaturan) {
  const wa = pengaturan.bendahara_wa || '';
  const el = document.getElementById('footer-wa');
  if (el) { if (wa) el.href = `https://wa.me/${nomorWA(wa)}`; else el.style.display = 'none'; }
  const email = document.getElementById('footer-email');
  if (email) { if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`; else email.style.display = 'none'; }
}

function kartuKegiatan(k) {
  /* Gambar opsional. Kalau URL-nya pecah (tautan Drive kedaluwarsa, dsb.),
     img disembunyikan lewat onerror dan latar tipografis di baliknya
     (selalu ada di DOM) yang tampil — tanpa membangun HTML di dalam
     atribut onerror, yang rawan salah escape tanda kutip. */
  const media = `
    <div class="event__media${k.gambar ? '' : ' event__media--type'}">
      <span class="event__initial">${amankan(inisial(k.judul))}</span>
      ${k.gambar ? `<img src="${amankan(k.gambar)}" alt="" loading="lazy" width="400" height="250"
         style="position:absolute;inset:0" onerror="this.remove();this.closest('.event__media').classList.add('event__media--type')">` : ''}
    </div>`;

  return `
    <article class="event reveal">
      ${media}
      <div class="event__body">
        <div class="cluster" style="justify-content:space-between">
          <span class="badge">${amankan(k.kategori)}</span>
          <span class="badge ${k.status === 'mendatang' ? 'badge--pos' : ''}">${k.status === 'mendatang' ? 'Mendatang' : 'Selesai'}</span>
        </div>
        <h3 class="event__title">${amankan(k.judul)}</h3>
        <p class="event__summary">${amankan(k.ringkasan || 'Belum ada ringkasan untuk kegiatan ini.')}</p>
        <div class="event__foot">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
          <span>${amankan(tanggalPanjang(k.tanggal))}</span>
        </div>
      </div>
    </article>`;
}

function render() {
  const wadah = document.getElementById('wadah-kegiatan');
  const tersaring = saringan === 'semua' ? DAFTAR : DAFTAR.filter((k) => k.status === saringan);

  if (!tersaring.length) {
    wadah.innerHTML = keadaanKosong(
      'Belum ada kegiatan',
      saringan === 'mendatang' ? 'Belum ada agenda mendatang yang diumumkan.' : 'Belum ada catatan kegiatan pada kategori ini.',
      'kalender'
    );
    return;
  }

  wadah.innerHTML = tersaring.map(kartuKegiatan).join('');
  selesaiRender(wadah);
}

function pasangTab() {
  document.querySelectorAll('.tab[data-status]').forEach((tab) => {
    tab.addEventListener('click', () => {
      saringan = tab.dataset.status;
      document.querySelectorAll('.tab[data-status]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      render();
    });
  });
}

async function mulai() {
  const data = await ambilData();

  pasangIdentitas(data);
  pitaSumberData(data);
  isiKontakFooter(data.pengaturan || {});

  DAFTAR = data.kegiatan;
  pasangTab();
  render();

  /* Halaman ini tidak punya operasi tulis. pasangHalamanAdmin tetap
     dipanggil supaya tombol "Pengurus" dan pemulihan sesi tersedia dari
     sini juga — login tidak boleh cuma bisa dimulai dari halaman yang
     kebetulan punya tombol simpan. */
  pasangHalamanAdmin();
}

mulai();
