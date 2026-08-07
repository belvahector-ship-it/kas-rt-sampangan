/* ==========================================================================
   ADMIN — potongan UI yang dipakai bersama oleh halaman ber-mode-tulis.

   Isinya sengaja generik (form dibangun dari deskripsi kolom, bukan HTML
   per-halaman) supaya menambah satu jenis catatan baru nanti tidak berarti
   menyalin-tempel seluruh markup modal lagi.

   Rujukan keputusan: DECISIONS.md CP-22.
   ========================================================================== */

import { CONFIG } from './config.js';
import { amankan, ikon } from './ui.js';
import { pasangAuth, statusAuth, keluar } from './auth.js';

/* --- Toast ----------------------------------------------------------------
   Menulis ke spreadsheet lewat internet bisa makan 1–3 detik. Tanpa umpan
   balik, bendahara akan mengira kliknya tidak terbaca dan mengklik lagi —
   itulah kenapa ada varian 'sibuk' yang ditahan sampai operasi selesai. */

function wadahToast() {
  let w = document.querySelector('.toast-wadah');
  if (!w) {
    w = document.createElement('div');
    w.className = 'toast-wadah';
    w.setAttribute('role', 'status');
    w.setAttribute('aria-live', 'polite');
    document.body.appendChild(w);
  }
  return w;
}

/**
 * @returns {function} penutup — panggil untuk menghapus toast ini lebih awal.
 *          Dipakai varian 'sibuk' yang tidak hilang sendiri.
 */
export function toast(pesan, jenis = 'ok', otomatisTutup = true) {
  const el = document.createElement('div');
  el.className = 'toast toast--' + jenis;
  const namaIkon = jenis === 'galat' ? 'awas' : jenis === 'sibuk' ? 'jam' : 'centang';
  el.innerHTML = `${ikon(namaIkon)}<span>${amankan(pesan)}</span>`;
  wadahToast().appendChild(el);

  const tutup = () => el.remove();
  if (otomatisTutup) setTimeout(tutup, jenis === 'galat' ? 6000 : 3500);
  return tutup;
}

/* --- Form modal generik ----------------------------------------------------
   kolom: [{ nama, label, tipe, opsi?, wajib?, bantuan? }]
   tipe: text | number | date | select | textarea
   -------------------------------------------------------------------------- */

function bangunKolom(k, nilaiAwal) {
  const nilai = nilaiAwal[k.nama] != null ? String(nilaiAwal[k.nama]) : '';
  const id = 'f-' + k.nama.replace(/\W+/g, '-').toLowerCase();
  const wajib = k.wajib ? 'required' : '';

  let kontrol;
  if (k.tipe === 'select') {
    const opsi = (k.opsi || [])
      .map((o) => `<option value="${amankan(o)}"${o === nilai ? ' selected' : ''}>${amankan(o)}</option>`)
      .join('');
    kontrol = `<select id="${id}" name="${amankan(k.nama)}" ${wajib}>${opsi}</select>`;
  } else if (k.tipe === 'textarea') {
    kontrol = `<textarea id="${id}" name="${amankan(k.nama)}" ${wajib}>${amankan(nilai)}</textarea>`;
  } else {
    const tipe = k.tipe || 'text';
    const langkah = tipe === 'number' ? ' step="1" min="0" inputmode="numeric"' : '';
    kontrol = `<input id="${id}" name="${amankan(k.nama)}" type="${tipe}"${langkah} value="${amankan(nilai)}" ${wajib}>`;
  }

  return `
    <div class="form-baris">
      <label class="form-baris__label" for="${id}">${amankan(k.label)}${k.wajib ? ' *' : ''}</label>
      ${kontrol}
      ${k.bantuan ? `<span class="form-baris__bantuan">${amankan(k.bantuan)}</span>` : ''}
    </div>`;
}

/**
 * Buka form. onSimpan(nilai) dan onHapus() harus mengembalikan Promise;
 * modal menutup sendiri hanya kalau Promise-nya sukses — kalau ditolak,
 * pesan galat ditampilkan di dalam modal dan isian TIDAK hilang, supaya
 * bendahara tidak perlu mengetik ulang.
 */
export function bukaForm({ judul, kolom, nilai = {}, onSimpan, onHapus, labelSimpan = 'Simpan' }) {
  const lama = document.querySelector('.form-modal');
  if (lama) lama.remove();

  const modal = document.createElement('div');
  modal.className = 'form-modal';
  modal.innerHTML = `
    <div class="form-modal__tirai" data-tutup></div>
    <div class="form-modal__kotak" role="dialog" aria-modal="true" aria-labelledby="form-judul">
      <div class="form-modal__kepala">
        <h2 class="form-modal__judul" id="form-judul">${amankan(judul)}</h2>
        <button class="form-modal__tutup" type="button" data-tutup aria-label="Tutup">${ikon('x')}</button>
      </div>
      <form novalidate>
        ${kolom.map((k) => bangunKolom(k, nilai)).join('')}
        <p class="form-modal__galat" hidden></p>
        <div class="form-aksi">
          ${onHapus ? `<button type="button" class="btn btn--outline form-aksi__hapus" data-hapus>${ikon('sampah')} Hapus</button>` : ''}
          <button type="button" class="btn btn--outline" data-tutup>Batal</button>
          <button type="submit" class="btn btn--accent">${amankan(labelSimpan)}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  const form = modal.querySelector('form');
  const galat = modal.querySelector('.form-modal__galat');
  const tutup = () => modal.remove();

  modal.querySelectorAll('[data-tutup]').forEach((el) => el.addEventListener('click', tutup));
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape' && document.body.contains(modal)) { tutup(); document.removeEventListener('keydown', esc); }
  });

  const tampilGalat = (pesan) => { galat.textContent = pesan; galat.hidden = false; };

  const kunci = (terkunci) => {
    form.querySelectorAll('button, input, select, textarea')
      .forEach((el) => { el.disabled = terkunci; });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    galat.hidden = true;

    const data = {};
    kolom.forEach((k) => {
      const el = form.elements[k.nama];
      data[k.nama] = el ? el.value.trim() : '';
    });

    const kurang = kolom.filter((k) => k.wajib && !data[k.nama]);
    if (kurang.length) {
      tampilGalat('Masih kosong: ' + kurang.map((k) => k.label).join(', '));
      return;
    }

    kunci(true);
    try {
      await onSimpan(data);
      tutup();
    } catch (err) {
      tampilGalat(err.message || String(err));
      kunci(false);
    }
  });

  const tombolHapus = modal.querySelector('[data-hapus]');
  if (tombolHapus && onHapus) {
    tombolHapus.addEventListener('click', async () => {
      /* Konfirmasi wajib — penghapusan catatan keuangan tidak bisa
         dibatalkan dari situs. Isinya tetap tersalin ke AuditLog. */
      if (!window.confirm('Hapus catatan ini? Tindakan ini tidak bisa dibatalkan dari situs.\n\nIsi barisnya tetap tersimpan di lembar AuditLog.')) return;
      kunci(true);
      try {
        await onHapus();
        tutup();
      } catch (err) {
        tampilGalat(err.message || String(err));
        kunci(false);
      }
    });
  }

  const pertama = form.querySelector('input, select, textarea');
  if (pertama) pertama.focus();

  return modal;
}

/* --- Pembungkus operasi tulis ---------------------------------------------
   Menyatukan pola yang selalu sama: tampilkan "sedang menyimpan", jalankan,
   segarkan data, gambar ulang, lalu beri tahu hasilnya. */

export async function jalankanTulis(pesanSibuk, kerja, saatSukses) {
  const tutupSibuk = toast(pesanSibuk, 'sibuk', false);
  try {
    const hasil = await kerja();
    tutupSibuk();
    if (saatSukses) await saatSukses(hasil);
    toast('Tersimpan ke spreadsheet', 'ok');
    return hasil;
  } catch (err) {
    tutupSibuk();
    toast(err.message || String(err), 'galat');
    throw err;
  }
}

/* --- Pemasangan umum ------------------------------------------------------- */

/**
 * Menyisipkan tombol "Pengurus" ke header dan bilah status admin ke bagian
 * atas konten. Dipanggil semua halaman lewat pasangHalamanAdmin().
 */
/* Sama dengan titik ganti breakpoint nav mobile di components.css
   (@media max-width: 1100px) — harus persis sama, kalau tidak tombol bisa
   "terjebak" di posisi header pada lebar yang seharusnya sudah memakai
   drawer, atau sebaliknya.

   Sempat tertinggal di 960px saat breakpoint nav dinaikkan ke 1100px
   (CP-24), sehingga di lebar 961–1100px tombol Pengurus duduk di baris
   header padahal navigasinya sudah berwujud drawer. */
const MQ_MOBILE = window.matchMedia('(max-width: 1100px)');

/**
 * Header sempit (RT + Pengurus + hamburger) tidak punya ruang untuk tombol
 * Pengurus/Logout di layar sempit — di sana ia jadi berdesakan dengan
 * tombol menu. Di mobile, tombol yang SAMA (bukan salinan — supaya status
 * login/logout tidak perlu disinkron dua tempat) dipindah jadi item
 * terakhir di dalam drawer navigasi; di desktop ia kembali ke header,
 * di sebelah kiri tombol menu (yang toh tersembunyi di lebar itu).
 */
function tempatkanTombolPengurus(tombol) {
  const nav = document.querySelector('.nav');
  const baris = document.querySelector('.site-header__row');

  if (MQ_MOBILE.matches && nav) {
    if (tombol.parentElement !== nav) nav.appendChild(tombol);
  } else if (baris) {
    const toggle = baris.querySelector('.nav-toggle');
    if (tombol.nextElementSibling !== toggle) baris.insertBefore(tombol, toggle || null);
  }
}

function sisipkanKontrolUmum() {
  /* Tombol login di header — hanya jika backend memang dikonfigurasi.
     Tanpa APPS_SCRIPT_URL, fitur tulis tidak ada gunanya dan tombolnya
     cuma akan membingungkan warga. */
  if (!CONFIG.APPS_SCRIPT_URL || !CONFIG.OAUTH_CLIENT_ID) return;

  const baris = document.querySelector('.site-header__row');
  if (baris && !baris.querySelector('[data-tombol-login]')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-pengurus';
    b.setAttribute('data-tombol-login', '');
    b.innerHTML = `${ikon('gembok')}<span>Pengurus</span>`;

    /* Mengklik tombol ini tidak berpindah halaman (beda dari .nav__link
       lain di drawer), jadi drawer tidak tertutup sendiri lewat navigasi.
       Tutup manual supaya drawer tidak menganggur terbuka di belakang
       modal login/logout. Tidak berbahaya dipanggil di desktop — kelas
       is-open memang cuma berpengaruh di lebar mobile. */
    b.addEventListener('click', () => {
      const nav = document.querySelector('.nav');
      const toggle = document.querySelector('.nav-toggle');
      if (nav && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    });

    tempatkanTombolPengurus(b);
    MQ_MOBILE.addEventListener('change', () => tempatkanTombolPengurus(b));
  }

  const utama = document.querySelector('.site-main');
  if (utama && !document.querySelector('[data-admin-bar]')) {
    const bar = document.createElement('div');
    bar.className = 'container admin-bar';
    bar.setAttribute('data-admin-bar', '');
    bar.setAttribute('data-admin-only', '');
    bar.hidden = true;
    /* Tanpa tombol Keluar sendiri — tombol "Pengurus" di header berubah
       jadi tombol kuning "Logout" begitu login (lihat auth.js), jadi
       satu bilah ini murni informasi, tidak perlu aksi duplikat. */
    bar.innerHTML = `
      ${ikon('gembok')}
      <span>Mode pengurus aktif</span>
      <span class="admin-bar__email" data-admin-email></span>`;
    utama.insertBefore(bar, utama.firstChild);
  }
}

/**
 * Titik masuk tunggal untuk halaman yang punya mode tulis.
 * @param {function} saatBerubah dipanggil tiap status auth berubah —
 *        halaman memakainya untuk menggambar ulang kontrol tulisnya.
 */
export async function pasangHalamanAdmin(saatBerubah) {
  sisipkanKontrolUmum();

  if (saatBerubah) {
    document.addEventListener('kasrt:auth', (e) => saatBerubah(e.detail));
  }

  await pasangAuth();
}

export { statusAuth, keluar };
