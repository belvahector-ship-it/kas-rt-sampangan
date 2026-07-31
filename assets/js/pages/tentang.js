/* ==========================================================================
   HALAMAN: Tentang & Kontak
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  amankan, ikon, inisial, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin } from '../admin.js';

pasangHeader();

const PENGURUS_PERAN = [
  { kunci: 'ketua_nama', peran: 'Ketua RT' },
  { kunci: 'sekretaris_nama', peran: 'Sekretaris' },
  { kunci: 'bendahara_nama', peran: 'Bendahara' },
];

const FAQ = [
  {
    tanya: 'Kenapa pos Iuran, IPAL, dan Lelayu dipisah?',
    jawab: 'Supaya warga bisa melihat ke mana tiap jenis setoran dipakai. Iuran wajib menopang operasional rutin, IPAL untuk pemeliharaan saluran, dan Lelayu murni dana sosial sukarela untuk duka warga.',
  },
  {
    tanya: 'Apakah data di sini bisa diedit warga?',
    jawab: 'Tidak. Portal ini hanya menampilkan, tidak bisa mengubah data. Semua pencatatan dilakukan bendahara di pembukuan resmi RT.',
  },
  {
    tanya: 'Setoran saya sudah dibayar tapi belum tercatat, kenapa?',
    jawab: 'Pencatatan biasanya butuh 1&ndash;2 hari kerja setelah bendahara menerima dan mencocokkan setoran. Bila lebih dari itu, hubungi bendahara lewat WhatsApp dengan bukti setor.',
  },
  {
    tanya: 'Kenapa kadang angka di portal ini berbeda dengan catatan saya sendiri?',
    jawab: 'Portal menampilkan apa adanya dari pembukuan bendahara. Jika ada selisih, itu kemungkinan salah catat atau salah konfirmasi &mdash; segera laporkan agar bisa dicek bersama.',
  },
  {
    tanya: 'Bagaimana kalau nama saya tidak muncul di matrik iuran?',
    jawab: 'Kemungkinan Anda warga baru yang belum didaftarkan bendahara ke sistem. Hubungi pengurus RT untuk pendaftaran.',
  },
];

function isiKontak(pengaturan) {
  const nama = pengaturan.bendahara_nama || 'Bendahara RT';
  const wa = pengaturan.bendahara_wa || '';
  const alamat = pengaturan.bendahara_alamat || '—';
  const email = pengaturan.bendahara_email || '';

  document.querySelectorAll('[data-isi-bendahara="nama"]').forEach((el) => { el.textContent = nama; });
  document.querySelectorAll('[data-isi-bendahara="wa"]').forEach((el) => { el.textContent = wa || '—'; });
  document.querySelectorAll('[data-isi-bendahara="alamat"]').forEach((el) => { el.textContent = alamat; });
  document.querySelectorAll('[data-isi-bendahara="email"]').forEach((el) => { el.textContent = email || '—'; });

  const waLink = wa ? `https://wa.me/${nomorWA(wa)}` : '#';
  ['btn-wa-tentang', 'footer-wa'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (wa) el.href = waLink;
    else { el.setAttribute('aria-disabled', 'true'); el.classList.add('btn--outline'); }
  });

  const footEmail = document.getElementById('footer-email');
  if (footEmail) {
    if (email) footEmail.href = `mailto:${email}`;
    else footEmail.style.display = 'none';
  }

  document.querySelectorAll('[data-isi-profil="alamat_rt"]').forEach((el) => {
    el.textContent = pengaturan.alamat_rt || '—';
  });
  document.querySelectorAll('[data-isi-profil="jadwal_setor"]').forEach((el) => {
    el.textContent = pengaturan.jadwal_setor || 'Hubungi bendahara untuk jadwal setor.';
  });
}

function renderPengurus(pengaturan) {
  const wadah = document.getElementById('wadah-pengurus');
  const daftar = PENGURUS_PERAN
    .map((p) => ({ peran: p.peran, nama: pengaturan[p.kunci] }))
    .filter((p) => p.nama);

  if (!daftar.length) {
    wadah.innerHTML = `<p class="dim fs-sm">Susunan pengurus belum diisi di lembar Pengaturan.</p>`;
    return;
  }

  wadah.innerHTML = daftar.map((p) => `
    <div class="person reveal">
      <span class="person__avatar">${amankan(inisial(p.nama))}</span>
      <div>
        <p class="person__role">${amankan(p.peran)}</p>
        <p class="person__name">${amankan(p.nama)}</p>
      </div>
    </div>`).join('');
}

function renderFAQ() {
  const wadah = document.getElementById('wadah-faq');
  wadah.innerHTML = FAQ.map((f, i) => `
    <div class="faq__item">
      <button class="faq__q" aria-expanded="false" aria-controls="faq-a-${i}" id="faq-q-${i}">
        <span>${amankan(f.tanya)}</span>
        ${ikon('tambah')}
      </button>
      <div class="faq__a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}">
        <div><p>${f.jawab}</p></div>
      </div>
    </div>`).join('');

  wadah.querySelectorAll('.faq__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const terbuka = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!terbuka));
    });
  });
}

async function mulai() {
  const data = await ambilData();

  pasangIdentitas(data);
  pitaSumberData(data);
  isiKontak(data.pengaturan || {});
  renderPengurus(data.pengaturan || {});
  renderFAQ();

  selesaiRender();

  /* Halaman ini tidak punya operasi tulis. pasangHalamanAdmin tetap
     dipanggil supaya tombol "Pengurus" dan pemulihan sesi tersedia dari
     sini juga — login tidak boleh cuma bisa dimulai dari halaman yang
     kebetulan punya tombol simpan. */
  pasangHalamanAdmin();
}

mulai();
