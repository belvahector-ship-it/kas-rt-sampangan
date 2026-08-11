/* ==========================================================================
   JEMBATAN — penghubung halaman ini dengan aplikasi Android

   Saat halaman dibuka di peramban biasa, seluruh berkas ini praktis tidak
   melakukan apa-apa: `diApp()` mengembalikan false dan setiap pemanggil
   memakai jalurnya yang lama. Itu disengaja. Situs kasmenoreh.my.id dan isi
   APK adalah berkas yang SAMA — satu salinan, dua tempat berjalan — jadi
   apa pun yang ditambahkan untuk aplikasi tidak boleh mengubah perilaku
   situs sedikit pun.

   Di dalam APK, cangkang native menyuntikkan objek `window.KasRtNative`
   sebelum skrip halaman mana pun berjalan. Objek itu punya satu metode:

       KasRtNative.minta(idPermintaan, aksi, muatanJson)

   yang langsung kembali (tidak boleh memblokir — JavaScript menunggunya, dan
   menunggu di situ berarti halaman membeku). Jawabannya datang belakangan
   lewat `window.__kasrtBalas`, dipasangkan kembali berdasarkan idPermintaan.
   Berkas ini membungkus pola itu jadi Promise biasa.

   Rujukan keputusan: DECISIONS.md CP-27.
   ========================================================================== */

const NATIVE = (typeof window !== 'undefined' && window.KasRtNative) || null;

/** true hanya di dalam APK Android. */
export function diApp() {
  return NATIVE !== null;
}

/* Penanda untuk CSS (`html.di-app` di components.css).
   Cangkang native SEHARUSNYA sudah memasangnya sebelum satu skrip pun
   berjalan, lewat addDocumentStartJavaScript. Baris ini adalah pengaman untuk
   WebView lama yang belum mendukung fitur itu: di sana navigasi situs sempat
   terlihat sepersekian detik sebelum hilang — tidak ideal, tapi jauh lebih
   baik daripada dua navigasi yang bertahan sepanjang halaman. */
if (NATIVE) document.documentElement.classList.add('di-app');

/* --- Pemasangan permintaan ↔ jawaban --------------------------------------- */

let nomorUrut = 0;
const menunggu = new Map();

/**
 * Batas waktu jaring pengaman. Sisi native SEHARUSNYA selalu menjawab —
 * setiap cabang di JembatanNative.minta() berakhir dengan balasan, termasuk
 * cabang galat. Tapi kalau sebuah bug membuat satu jalur diam, tanpa batas
 * ini halaman akan menampilkan pemuat berputar selamanya tanpa satu pun
 * pesan yang bisa dilaporkan pengguna. Lebih baik gagal dengan jelas.
 */
const BATAS_MS = 20000;

if (NATIVE) {
  window.__kasrtBalas = function (idPermintaan, ok, data) {
    const janji = menunggu.get(idPermintaan);
    if (!janji) return;              /* sudah kedaluwarsa — abaikan */
    menunggu.delete(idPermintaan);
    clearTimeout(janji.jam);

    if (ok) janji.resolve(data);
    else janji.reject(new Error((data && data.pesan) || 'Permintaan ditolak aplikasi'));
  };
}

/**
 * Memanggil sisi native.
 *
 * @param {string} aksi  nama aksi jembatan (lihat JembatanNative.minta)
 * @param {object} muatan
 * @returns {Promise<object>}
 */
export function mintaNative(aksi, muatan = {}) {
  if (!NATIVE) {
    return Promise.reject(new Error('Bukan di dalam aplikasi'));
  }

  return new Promise((resolve, reject) => {
    const id = 'p' + (++nomorUrut);

    const jam = setTimeout(() => {
      menunggu.delete(id);
      reject(new Error(`Aplikasi tidak menjawab permintaan "${aksi}"`));
    }, BATAS_MS);

    menunggu.set(id, { resolve, reject, jam });

    try {
      NATIVE.minta(id, aksi, JSON.stringify(muatan));
    } catch (err) {
      menunggu.delete(id);
      clearTimeout(jam);
      reject(err);
    }
  });
}

/* --- Peristiwa dari native ------------------------------------------------
   Arah sebaliknya: cangkang memberi tahu halaman bahwa sesuatu berubah tanpa
   halaman perlu bertanya. Yang dikirim antara lain:

     sync-mulai     sinkronisasi dimulai
     sync-selesai   { terkirim, bentrok, gagal, tarikanBerhasil }
     data-berubah   cache lokal berubah — halaman perlu menggambar ulang
     auth-berubah   pengurus login atau keluar

   Dipakai supaya pengurus yang menekan "Sinkronkan" melihat angkanya
   diperbarui di tempat, bukan harus menutup dan membuka halaman.
   -------------------------------------------------------------------------- */

const pendengar = new Map();

if (NATIVE) {
  window.__kasrtPeristiwa = function (nama, data) {
    const daftar = pendengar.get(nama);
    if (daftar) daftar.forEach((cb) => { try { cb(data || {}); } catch (e) { console.error(e); } });

    /* Diteruskan juga sebagai event DOM, supaya kode yang sudah terbiasa
       mendengarkan `kasrt:auth` (lihat auth.js) tidak perlu mekanisme kedua. */
    document.dispatchEvent(new CustomEvent('kasrt:' + nama, { detail: data || {} }));
  };
}

/** @returns {function} pelepas — panggil untuk berhenti mendengarkan. */
export function dengarkan(nama, cb) {
  if (!pendengar.has(nama)) pendengar.set(nama, new Set());
  pendengar.get(nama).add(cb);
  return () => pendengar.get(nama)?.delete(cb);
}

/* --- Pintasan yang sering dipakai ------------------------------------------ */

export const nativeMuatData = () => mintaNative('muatData');
export const nativeStatusAuth = () => mintaNative('statusAuth');
export const nativeLogin = () => mintaNative('login');
export const nativeKeluar = () => mintaNative('keluar');
export const nativeSync = () => mintaNative('sync');
export const nativeAntrian = () => mintaNative('antrian');
export const nativeBuka = (halaman) => mintaNative('buka', { halaman });
export const nativeTinjau = (id, keputusan) => mintaNative('tinjau', { id, keputusan });

/**
 * Getaran halus saat aksi penting selesai. Diabaikan diam-diam di peramban —
 * bukan sesuatu yang perlu dijaga dengan percabangan di tiap pemanggil.
 */
export function getar() {
  if (NATIVE) mintaNative('getar').catch(() => {});
}

/* --- Menggambar ulang setelah sinkronisasi ---------------------------------
   Ketujuh halaman memanggil muatSemuaData() satu kali saat dimuat, lalu
   menggambar. Tidak ada satu pun yang punya jalur "gambar ulang dari data
   baru" yang bisa dipanggil dari luar — dan menambahkannya berarti menyentuh
   tujuh berkas halaman yang sebelumnya tidak perlu tahu apa-apa soal
   aplikasi.

   Jadi dipakai cara yang lebih tumpul tapi jujur: muat ulang halamannya.
   Di dalam APK itu murah — seluruh berkas ada di dalam APK dan datanya datang
   dari basis data lokal, jadi tidak ada satu pun permintaan jaringan. Yang
   dijaga hanya dua hal yang benar-benar mengganggu kalau hilang: posisi gulir,
   dan halaman yang sedang punya modal terbuka.
   -------------------------------------------------------------------------- */

const KUNCI_GULIR = 'kasrt.gulir';

if (NATIVE) {
  let tundaMuatUlang = false;

  const modalTerbuka = () =>
    !!document.querySelector('.form-modal, .auth-modal:not([hidden])');

  const muatUlang = () => {
    /* Menyimpan posisi gulir sebelum memuat ulang. Tanpa ini, pengurus yang
       sedang di baris ke-70 matrik iuran akan terlempar ke atas setiap kali
       sinkronisasi selesai di latar belakang. */
    try {
      sessionStorage.setItem(KUNCI_GULIR, JSON.stringify({
        halaman: location.pathname,
        y: window.scrollY,
      }));
    } catch { /* mode privat / kuota — bukan alasan untuk membatalkan */ }
    location.reload();
  };

  dengarkan('data-berubah', () => {
    if (modalTerbuka()) { tundaMuatUlang = true; return; }
    muatUlang();
  });

  /* Modal yang tertutup adalah saat yang aman. Diperiksa lewat klik dan
     tombol, bukan MutationObserver: satu pengamat yang berjalan seumur
     halaman demi kejadian yang jarang bukan pertukaran yang sepadan. */
  const cekTertunda = () => {
    if (tundaMuatUlang && !modalTerbuka()) { tundaMuatUlang = false; muatUlang(); }
  };
  document.addEventListener('click', () => setTimeout(cekTertunda, 0));
  document.addEventListener('keyup', () => setTimeout(cekTertunda, 0));

  window.addEventListener('DOMContentLoaded', () => {
    try {
      const simpan = JSON.parse(sessionStorage.getItem(KUNCI_GULIR) || 'null');
      sessionStorage.removeItem(KUNCI_GULIR);
      if (simpan && simpan.halaman === location.pathname && simpan.y > 0) {
        /* Setelah gambar pertama, bukan sebelumnya — tinggi halaman baru
           final setelah tabel dan grafik selesai dibangun. */
        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo(0, simpan.y);
        }));
      }
    } catch { /* abaikan */ }
  });
}
