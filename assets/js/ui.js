/* ==========================================================================
   UI — utilitas bersama: format, ikon, gerak, kerangka halaman
   ========================================================================== */

import { BULAN_PANJANG } from './config.js';

/* --- Format --------------------------------------------------------------- */

export function rupiah(n) {
  const angka = Math.round(Number(n) || 0);
  return 'Rp ' + angka.toLocaleString('id-ID');
}

/** Bentuk ringkas untuk sumbu grafik dan ruang sempit: Rp 4,3 jt */
export function rupiahRingkas(n) {
  const a = Math.abs(Number(n) || 0);
  const tanda = n < 0 ? '-' : '';
  if (a >= 1_000_000_000) return `${tanda}Rp ${(a / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000_000) return `${tanda}Rp ${(a / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (a >= 1_000) return `${tanda}Rp ${(a / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `${tanda}Rp ${a.toLocaleString('id-ID')}`;
}

export function angkaID(n) {
  return (Math.round(Number(n) || 0)).toLocaleString('id-ID');
}

/** "2026-01-15" → "15 Januari 2026" */
export function tanggalPanjang(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—';
  const [th, bl, tg] = iso.slice(0, 10).split('-');
  return `${parseInt(tg, 10)} ${BULAN_PANJANG[parseInt(bl, 10) - 1] || ''} ${th}`;
}

/** "2026-01-15" → "15 Jan" */
export function tanggalPendek(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—';
  const [, bl, tg] = iso.slice(0, 10).split('-');
  const nama = BULAN_PANJANG[parseInt(bl, 10) - 1] || '';
  return `${parseInt(tg, 10)} ${nama.slice(0, 3)}`;
}

/** ISO waktu → "30 Juli 2026, 14:05" */
export function waktuPanjang(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}, ${jam}:${menit}`;
}

/** "085163210987" → "6285163210987" untuk tautan wa.me */
export function nomorWA(nomor) {
  const digit = String(nomor || '').replace(/\D/g, '');
  if (!digit) return '';
  if (digit.startsWith('62')) return digit;
  if (digit.startsWith('0')) return '62' + digit.slice(1);
  return digit;
}

/** Selalu pakai ini saat menyisipkan nilai spreadsheet ke innerHTML. */
export function amankan(teks) {
  return String(teks ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function inisial(nama) {
  return String(nama || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';
}

/* --- Ikon ----------------------------------------------------------------
   Satu keluarga, tebal garis seragam 1.75, ukuran diwarisi dari induk.
   Tidak ada emoji sebagai ikon di mana pun. */

const JALUR = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  cari: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  panahKanan: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  panahSerong: '<path d="M7 17 17 7M8 7h9v9"/>',
  centang: '<path d="m4 12 5.5 5.5L20 7"/>',
  minus: '<path d="M5 12h14"/>',
  dompet: '<path d="M3 8a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 8v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5"/><circle cx="16.5" cy="14" r="1.2"/>',
  naik: '<path d="M3 17 10 10l4 4 7-7"/><path d="M15 7h6v6"/>',
  turun: '<path d="M3 7 10 14l4-4 7 7"/><path d="M15 17h6v-6"/>',
  warga: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6.2"/><path d="M18 20a6 6 0 0 0-2.5-4.9"/>',
  kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  buku: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  kisi: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  awas: '<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  chat: '<path d="M21 11.5a8 8 0 0 1-11.7 7.1L3 20.5l1.9-6.1A8 8 0 1 1 21 11.5Z"/>',
  pin: '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  surel: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  bawah: '<path d="m6 9 6 6 6-6"/>',
  tambah: '<path d="M12 5v14M5 12h14"/>',
  geser: '<path d="M8 5 3 12l5 7M16 5l5 7-5 7"/><path d="M7 12h10"/>',
  segar: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  perisai: '<path d="M12 3 4.5 6v6c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
  jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
};

/**
 * @param {string} nama kunci dari JALUR
 * @param {object} opsi { kelas, ukuran, label } — beri label kalau ikon berdiri
 *                 sendiri sebagai makna; biarkan kosong kalau hanya dekorasi
 */
export function ikon(nama, opsi = {}) {
  const d = JALUR[nama];
  if (!d) return '';
  const { kelas = '', ukuran = 24, label = '' } = opsi;
  const aria = label
    ? `role="img" aria-label="${amankan(label)}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg ${aria} class="${kelas}" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

/* --- Gerak ---------------------------------------------------------------- */

export const gerakDikurangi = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pasang IntersectionObserver untuk semua .reveal yang belum diamati. */
export function pasangReveal(akar = document) {
  const target = akar.querySelectorAll('.reveal:not([data-diamati])');
  if (!target.length) return;

  if (gerakDikurangi() || !('IntersectionObserver' in window)) {
    target.forEach((el) => { el.classList.add('is-visible'); el.dataset.diamati = '1'; });
    return;
  }

  const pengamat = new IntersectionObserver((entri) => {
    entri.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      /* Lepas will-change setelah transisi selesai supaya layer GPU
         tidak ditahan sepanjang umur halaman. */
      setTimeout(() => e.target.classList.add('is-settled'), 600);
      pengamat.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  target.forEach((el) => { el.dataset.diamati = '1'; pengamat.observe(el); });

  /* Jaring pengaman: sejumlah WebView bawaan aplikasi (mis. peramban dalam
     WhatsApp yang dipakai warga membuka tautan grup) menunda atau tidak
     pernah memicu IntersectionObserver saat tab baru dibuka di latar.
     Konten yang bergantung sepenuhnya pada observer bisa tersembunyi
     permanen. Setelah 2.5 detik, paksa tampil apa pun yang belum terlihat —
     lebih baik animasi reveal terlewat daripada konten hilang. */
  setTimeout(() => {
    target.forEach((el) => {
      if (!el.classList.contains('is-visible')) el.classList.add('is-visible', 'is-settled');
    });
  }, 2500);
}

/**
 * Angka menghitung naik saat pertama terlihat.
 * Elemen wajib punya data-nilai. Dengan reduced-motion, nilai akhir
 * langsung ditulis tanpa animasi.
 */
export function pasangHitungNaik(akar = document) {
  const target = akar.querySelectorAll('[data-nilai]:not([data-dihitung])');
  if (!target.length) return;

  const tulis = (el, n) => {
    const bentuk = el.dataset.bentuk || 'rupiah';
    if (bentuk === 'angka') el.textContent = angkaID(n);
    else if (bentuk === 'ringkas') el.textContent = rupiahRingkas(n);
    else el.textContent = rupiah(n);
  };

  const jalankan = (el) => {
    if (el.dataset.dihitung === '1') return;
    el.dataset.dihitung = '1';
    const akhir = Number(el.dataset.nilai) || 0;

    if (gerakDikurangi() || akhir === 0) { tulis(el, akhir); return; }

    const durasi = 950;
    const mulai = performance.now();

    const langkah = (waktu) => {
      const t = Math.min((waktu - mulai) / durasi, 1);
      /* ease-out kuartik — cepat di awal, mendarat lembut */
      const e = 1 - Math.pow(1 - t, 4);
      tulis(el, akhir * e);
      if (t < 1) requestAnimationFrame(langkah);
      else tulis(el, akhir);
    };

    requestAnimationFrame(langkah);

    /* Jaring pengaman: kalau requestAnimationFrame tidak pernah dipanggil
       (tab dibuka di latar oleh WebView tertentu), angka akhir yang benar
       tetap harus muncul. tulis() aman dipanggil ulang — hanya menulis teks. */
    setTimeout(() => tulis(el, akhir), 1600);
  };

  if (!('IntersectionObserver' in window)) { target.forEach(jalankan); return; }

  const pengamat = new IntersectionObserver((entri) => {
    entri.forEach((e) => {
      if (!e.isIntersecting) return;
      jalankan(e.target);
      pengamat.unobserve(e.target);
    });
  }, { threshold: 0.3 });

  target.forEach((el) => pengamat.observe(el));

  /* Jaring pengaman yang sama seperti pasangReveal: paksa hitung semua
     angka yang belum terlihat observer-nya setelah 2.5 detik. */
  setTimeout(() => target.forEach(jalankan), 2500);
}

/* --- Kerangka halaman ----------------------------------------------------- */

/** Header menyusut saat digulir + menu mobile. */
export function pasangHeader() {
  const header = document.querySelector('.site-header');
  const tombol = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');

  if (header) {
    const perbarui = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    perbarui();
    window.addEventListener('scroll', perbarui, { passive: true });
  }

  if (tombol && nav) {
    const tutup = () => {
      nav.classList.remove('is-open');
      tombol.setAttribute('aria-expanded', 'false');
    };

    tombol.addEventListener('click', () => {
      const terbuka = nav.classList.toggle('is-open');
      tombol.setAttribute('aria-expanded', String(terbuka));
    });

    /* Escape menutup menu, dan fokus kembali ke tombol pemicunya */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        tutup();
        tombol.focus();
      }
    });

    /* Klik di luar menu menutupnya */
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || tombol.contains(e.target)) return;
      tutup();
    });

    /* Kalau layar melebar sampai nav kembali horizontal, buang keadaan mobile */
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
      if (e.matches) tutup();
    });
  }

  /* Tandai halaman aktif berdasarkan nama berkas */
  const berkas = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav__link').forEach((a) => {
    const tujuan = (a.getAttribute('href') || '').toLowerCase();
    if (tujuan === berkas || (berkas === '' && tujuan === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });
}

/** Isi bagian-bagian yang bergantung pada lembar Pengaturan. */
export function pasangIdentitas(data) {
  const p = data.pengaturan || {};
  const namaRT = p.nama_rt || 'RT 01 / RW 04 Sampangan';

  document.querySelectorAll('[data-isi="nama_rt"]').forEach((el) => { el.textContent = namaRT; });
  document.querySelectorAll('[data-isi="tahun"]').forEach((el) => { el.textContent = String(data.tahun); });
  document.querySelectorAll('[data-isi="tahun_sekarang"]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const judul = document.querySelector('title');
  if (judul && judul.dataset.pola) {
    judul.textContent = judul.dataset.pola.replace('{rt}', namaRT);
  }
}

/**
 * Pita jujur soal asal data. Muncul hanya saat data BUKAN langsung dari
 * spreadsheet. Menyembunyikan ini akan membuat warga membaca angka lama
 * sebagai angka hari ini — persis kegagalan yang paling merusak
 * kepercayaan pada portal keuangan.
 */
export function pitaSumberData(data) {
  const wadah = document.querySelector('[data-sumber-data]');
  if (!wadah) return;

  const { sumber, diambilPada, peringatan = [] } = data.meta || {};

  if (sumber === 'live') {
    wadah.innerHTML = '';
    const jejak = document.querySelector('[data-stempel]');
    if (jejak) {
      jejak.innerHTML =
        `<span class="live-dot"></span><span>Data langsung &middot; ${amankan(waktuPanjang(diambilPada))}</span>`;
    }
    if (peringatan.length) console.warn('[kas-rt] Peringatan data:', peringatan);
    return;
  }

  const pesan = {
    cache: {
      judul: 'Menampilkan data tersimpan',
      isi: `Spreadsheet sedang tidak dapat dihubungi, jadi yang tampil adalah salinan terakhir yang berhasil diambil${diambilPada ? ` pada ${waktuPanjang(diambilPada)}` : ''}. Muat ulang halaman untuk mencoba lagi.`,
    },
    snapshot: {
      judul: 'Menampilkan data cadangan',
      isi: `Situs belum tersambung ke spreadsheet, atau spreadsheet sedang tidak dapat dibaca. Angka di bawah berasal dari berkas cadangan${diambilPada ? ` per ${tanggalPanjang(String(diambilPada).slice(0, 10))}` : ''} dan mungkin sudah tidak mutakhir.`,
    },
    gagal: {
      judul: 'Data tidak dapat dimuat',
      isi: 'Baik spreadsheet maupun berkas cadangan tidak dapat dibaca. Silakan muat ulang halaman, atau hubungi bendahara bila terus berulang.',
    },
  }[sumber] || null;

  if (!pesan) return;

  wadah.innerHTML = `
    <div class="notice notice--warn animate-slide-down" role="status">
      ${ikon('awas')}
      <div><strong>${amankan(pesan.judul)}.</strong> ${amankan(pesan.isi)}</div>
    </div>`;

  const jejak = document.querySelector('[data-stempel]');
  if (jejak) {
    jejak.innerHTML =
      `<span class="live-dot live-dot--stale"></span><span>${sumber === 'gagal' ? 'Data tidak tersedia' : 'Data cadangan'}</span>`;
  }

  if (peringatan.length) console.warn('[kas-rt] Peringatan data:', peringatan);
}

/** Keadaan kosong yang seragam di seluruh situs. */
export function keadaanKosong(judul, deskripsi, namaIkon = 'info') {
  return `
    <div class="empty">
      ${ikon(namaIkon, { ukuran: 34 })}
      <p class="empty__title">${amankan(judul)}</p>
      ${deskripsi ? `<p class="empty__desc">${amankan(deskripsi)}</p>` : ''}
    </div>`;
}

/** Dipanggil setiap halaman setelah konten dinamisnya selesai dilukis. */
export function selesaiRender(akar = document) {
  pasangReveal(akar);
  pasangHitungNaik(akar);
}

/* Tandai bahwa JavaScript hidup — CSS memakai ini untuk memutuskan
   apakah konten .reveal boleh disembunyikan dulu. */
document.documentElement.classList.remove('no-js');
