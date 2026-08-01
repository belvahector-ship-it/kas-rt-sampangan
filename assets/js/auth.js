/* ==========================================================================
   AUTH — login pengurus lewat Google Identity Services (GIS)

   Alur:
   1. Warga biasa: tidak melihat apa pun dari berkas ini. Situs tetap
      baca-saja persis seperti sebelumnya.
   2. Pengurus menekan tombol "Pengurus" di header → modal login Google.
   3. Google mengembalikan ID token (JWT) → disimpan di sessionStorage.
   4. Token dikirim ke Apps Script dengan aksi `whoami`. SERVER yang
      memutuskan apakah email itu pengurus, bukan berkas ini.
   5. Kalau ya, dokumen diberi kelas `is-admin` → CSS memunculkan kontrol
      tulis yang sebelumnya tersembunyi total.

   YANG SENGAJA TIDAK ADA DI SINI: daftar email pengurus. Menaruhnya di
   klien akan (a) memaparkan email pribadi ke publik, dan (b) memberi kesan
   keliru bahwa itu penjaga keamanan — padahal siapa pun bisa mengedit
   JavaScript di browsernya sendiri. Pemeriksaan sesungguhnya ada di
   Apps Script. Kelas `is-admin` di sini murni kosmetik: memunculkan tombol
   pada orang yang tidak berhak pun tidak membuat tulisannya diterima server.

   Rujukan keputusan: DECISIONS.md CP-22.
   ========================================================================== */

import { CONFIG } from './config.js';
import { amankan, ikon } from './ui.js';

const KUNCI_SESI = 'kasrt.idToken';
const KUNCI_EMAIL = 'kasrt.email';

/** Keadaan auth saat ini. Dibaca halaman lewat statusAuth(). */
const status = {
  masuk: false,
  admin: false,
  email: '',
  siap: false,   /* true setelah percobaan pemulihan sesi selesai */
};

export function statusAuth() {
  return { ...status };
}

export function tokenSaatIni() {
  return sessionStorage.getItem(KUNCI_SESI) || '';
}

/* --- Panggilan ke backend -------------------------------------------------- */

/**
 * Kirim aksi ke Apps Script Web App.
 *
 * Content-Type SENGAJA text/plain, bukan application/json. Dengan
 * application/json browser mengirim preflight OPTIONS dulu, dan Apps Script
 * tidak menangani OPTIONS sama sekali — permintaan gagal dengan pesan CORS
 * yang menyesatkan (terlihat seperti masalah izin, padahal bukan).
 * text/plain membuatnya jadi "simple request" tanpa preflight; Apps Script
 * membaca mentahnya lewat e.postData.contents dan JSON.parse sendiri.
 */
export async function kirimAksi(aksi, muatan = {}) {
  if (!CONFIG.APPS_SCRIPT_URL) {
    throw new Error('URL backend belum diatur di assets/js/config.js');
  }

  const idToken = tokenSaatIni();
  if (!idToken) throw new Error('Belum login sebagai pengurus');

  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ idToken, aksi, ...muatan }),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error('Backend menjawab HTTP ' + res.status);

  const teks = await res.text();
  let hasil;
  try {
    hasil = JSON.parse(teks);
  } catch {
    /* Apps Script mengembalikan halaman HTML saat deployment salah setelan
       (mis. akses bukan "Anyone") — tampilkan pesan yang bisa ditindaklanjuti
       alih-alih melempar "Unexpected token <". */
    throw new Error('Backend tidak menjawab dalam format JSON. Periksa setelan deployment Web App (akses harus "Anyone").');
  }

  if (!hasil.ok) throw new Error(hasil.error || 'Operasi ditolak backend');
  return hasil.data;
}

/* --- Muat pustaka Google --------------------------------------------------- */

let janjiGis = null;

function muatGis() {
  if (janjiGis) return janjiGis;
  janjiGis = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Gagal memuat pustaka Google Sign-In'));
    document.head.appendChild(s);
  });
  return janjiGis;
}

/* --- Modal login ----------------------------------------------------------- */

function bukaModal() {
  let modal = document.querySelector('.auth-modal');
  if (modal) { modal.hidden = false; return modal; }

  modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal__tirai" data-tutup></div>
    <div class="auth-modal__kotak" role="dialog" aria-modal="true" aria-labelledby="auth-judul">
      <div class="auth-modal__kepala">
        <h2 class="auth-modal__judul" id="auth-judul">Masuk sebagai Pengurus</h2>
        <button class="auth-modal__tutup" type="button" data-tutup aria-label="Tutup">
          ${ikon('x')}
        </button>
      </div>
      <p class="auth-modal__teks">
        Login dengan akun Google pengurus RT untuk mengaktifkan pencatatan.
        Warga tidak perlu login &mdash; semua data sudah bisa dilihat tanpa masuk.
      </p>
      <div class="auth-modal__tombol" id="auth-tombol-google"></div>
      <p class="auth-modal__galat" id="auth-galat" hidden></p>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelectorAll('[data-tutup]').forEach((el) => {
    el.addEventListener('click', () => { modal.hidden = true; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });

  return modal;
}

function tampilkanGalat(pesan) {
  const el = document.getElementById('auth-galat');
  if (!el) return;
  el.textContent = pesan;
  el.hidden = false;
}

/* --- Alur login ------------------------------------------------------------ */

async function mulaiLogin() {
  const modal = bukaModal();
  const galat = document.getElementById('auth-galat');
  if (galat) galat.hidden = true;

  if (!CONFIG.OAUTH_CLIENT_ID) {
    tampilkanGalat('OAUTH_CLIENT_ID belum diatur di assets/js/config.js');
    return;
  }

  try {
    await muatGis();
  } catch (err) {
    tampilkanGalat(err.message);
    return;
  }

  const wadah = document.getElementById('auth-tombol-google');
  if (wadah.dataset.siap === '1') return;

  google.accounts.id.initialize({
    client_id: CONFIG.OAUTH_CLIENT_ID,
    callback: terimaKredensial,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  /* Tombol resmi Google, bukan tombol buatan sendiri — selain lebih dikenal
     warga, memakai tombol sendiri untuk memicu alur ini melanggar pedoman
     merek Google. Tampilannya dibingkai kotak modal bergaya situs. */
  google.accounts.id.renderButton(wadah, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    locale: 'id',
  });
  wadah.dataset.siap = '1';
}

async function terimaKredensial(respons) {
  const idToken = respons && respons.credential;
  if (!idToken) { tampilkanGalat('Login dibatalkan'); return; }

  sessionStorage.setItem(KUNCI_SESI, idToken);

  try {
    const data = await kirimAksi('whoami');
    status.masuk = true;
    status.admin = !!data.admin;
    status.email = data.email || '';
    sessionStorage.setItem(KUNCI_EMAIL, status.email);

    const modal = document.querySelector('.auth-modal');
    if (modal) modal.hidden = true;

    terapkanStatus();
  } catch (err) {
    /* Token sah menurut Google tapi ditolak backend — hampir selalu berarti
       email ini tidak ada di whitelist. Bersihkan sesi supaya tidak
       menggantung dalam keadaan setengah login. */
    sessionStorage.removeItem(KUNCI_SESI);
    sessionStorage.removeItem(KUNCI_EMAIL);
    tampilkanGalat(err.message);
  }
}

export function keluar() {
  sessionStorage.removeItem(KUNCI_SESI);
  sessionStorage.removeItem(KUNCI_EMAIL);
  status.masuk = false;
  status.admin = false;
  status.email = '';
  if (window.google && google.accounts && google.accounts.id) {
    google.accounts.id.disableAutoSelect();
  }
  terapkanStatus();
}

/* --- Sinkronisasi tampilan ------------------------------------------------- */

function terapkanStatus() {
  document.documentElement.classList.toggle('is-admin', status.admin);

  const bar = document.querySelector('[data-admin-bar]');
  if (bar) {
    bar.hidden = !status.admin;
    const nama = bar.querySelector('[data-admin-email]');
    if (nama) nama.textContent = status.email;
  }

  /* Satu tombol yang GANTI WUJUD, bukan disembunyikan.
     Sebelumnya dipakai `tombol.hidden = status.admin` — tidak pernah
     benar-benar menyembunyikannya, karena `.btn-pengurus` mendefinisikan
     `display` sendiri di components.css, dan itu mengalahkan aturan
     bawaan browser `[hidden] { display: none }` (author style menang atas
     UA style pada spesifisitas yang sama). Hasilnya tombol "Pengurus"
     tetap terlihat setelah login. Diganti: tombol yang sama berubah jadi
     tombol kuning "Logout", tidak pernah disembunyikan sama sekali. */
  const tombol = document.querySelector('[data-tombol-login]');
  if (tombol) {
    tombol.classList.toggle('btn-pengurus--keluar', status.admin);
    tombol.setAttribute('aria-label', status.admin ? 'Keluar dari mode pengurus' : 'Masuk sebagai pengurus');
    tombol.innerHTML = status.admin
      ? `${ikon('keluar')}<span>Logout</span>`
      : `${ikon('gembok')}<span>Pengurus</span>`;
  }

  /* Halaman mendengarkan ini untuk menggambar ulang kontrol tulisnya. */
  document.dispatchEvent(new CustomEvent('kasrt:auth', { detail: statusAuth() }));
}

/* --- Pemulihan sesi + pemasangan ------------------------------------------ */

/**
 * Dipanggil sekali per halaman. Kalau ada token tersimpan di sessionStorage
 * (mis. pengurus berpindah halaman), token itu diverifikasi ulang ke server.
 * Sengaja verifikasi ulang, bukan percaya begitu saja: token bisa saja sudah
 * kedaluwarsa, atau email dicabut dari whitelist sejak login tadi.
 */
export async function pasangAuth() {
  /* Satu tombol, satu listener — perilakunya dicek saat DIKLIK (bukan saat
     dipasang), supaya berfungsi benar baik sebelum maupun sesudah login
     tanpa perlu memasang ulang listener setiap kali status berubah. */
  const tombol = document.querySelector('[data-tombol-login]');
  if (tombol) {
    tombol.addEventListener('click', () => {
      if (status.admin) keluar();
      else mulaiLogin();
    });
  }

  const tersimpan = tokenSaatIni();
  if (tersimpan && CONFIG.APPS_SCRIPT_URL) {
    try {
      const data = await kirimAksi('whoami');
      status.masuk = true;
      status.admin = !!data.admin;
      status.email = data.email || sessionStorage.getItem(KUNCI_EMAIL) || '';
    } catch {
      sessionStorage.removeItem(KUNCI_SESI);
      sessionStorage.removeItem(KUNCI_EMAIL);
    }
  }

  status.siap = true;
  terapkanStatus();
}
