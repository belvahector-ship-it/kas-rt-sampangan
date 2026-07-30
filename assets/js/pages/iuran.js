/* ==========================================================================
   HALAMAN: Iuran Warga — tabel tersulit di proyek ini (SPEC.md §3)
   ========================================================================== */

import { BULAN_PENDEK } from '../config.js';
import { ambilData } from '../store.js';
import {
  rupiah, angkaID, amankan, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';

pasangHeader();

let DATA = null;
let queryCari = '';

/** "25000" → "25rb". Dipakai di kolom Pagu yang sekarang harus memuat
    tiga angka sekaligus (Iuran/IPAL/Lelayu) dalam satu sel sempit. */
function formatRb(n) {
  if (n == null) return '—';
  if (n === 0) return '0';
  if (n % 1000 === 0) return `${Math.round(n / 1000)}rb`;
  return angkaID(n);
}

function isiKontakFooter(pengaturan) {
  const wa = pengaturan.bendahara_wa || '';
  const el = document.getElementById('footer-wa');
  if (el) { if (wa) el.href = `https://wa.me/${nomorWA(wa)}`; else el.style.display = 'none'; }
  const email = document.getElementById('footer-email');
  if (email) { if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`; else email.style.display = 'none'; }
}

/* --- Kartu progres per pos -------------------------------------------------- */

function renderProgres() {
  const { stat } = DATA;
  const wadah = document.getElementById('wadah-progres');

  const kartu = [
    {
      pos: 'iuran', nama: 'Iuran Wajib', warna: 'var(--pos-iuran)',
      terkumpul: stat.setoranIuran, target: stat.targetIuran,
    },
    {
      pos: 'ipal', nama: 'IPAL Bulanan', warna: 'var(--pos-ipal)',
      terkumpul: stat.setoranIpal, target: stat.targetIpal,
    },
    {
      pos: 'lelayu', nama: 'Dana Lelayu', warna: 'var(--pos-lelayu)',
      terkumpul: stat.setoranLelayu,
      /* Lelayu tetap sukarela — ini BUKAN kewajiban seperti Iuran/IPAL.
         "Target" di sini hanya ada kalau bendahara mengisi nominal standar
         di lembar Warga; kalaupun ada, dilabeli beda supaya tidak terbaca
         sebagai tagihan wajib. */
      target: stat.adaPaguLelayu ? stat.targetLelayu : null,
      sukarela: true,
    },
  ];

  wadah.innerHTML = kartu.map((k) => {
    const persen = k.target ? Math.min(100, Math.round((k.terkumpul / Math.max(k.target, 1)) * 100)) : null;
    let footer;
    if (k.target) {
      footer = k.sukarela
        ? `${persen}% dari nominal standar ${amankan(rupiah(k.target))} (bulan berjalan) &mdash; tetap sukarela, bukan kewajiban.`
        : `${persen}% dari target ${amankan(rupiah(k.target))} (bulan berjalan)`;
    } else {
      footer = 'Sifatnya sukarela &mdash; tanpa nominal standar yang ditetapkan.';
    }
    return `
      <div class="stat reveal">
        <div class="stat__head">
          <span style="width:10px;height:10px;border-radius:50%;background:${k.warna};flex:none"></span>
          <span class="stat__label">${amankan(k.nama)}</span>
        </div>
        <p class="stat__value num" style="color:${k.warna}">${amankan(rupiah(k.terkumpul))}</p>
        ${k.target ? `<div class="progress mt-3"><div class="progress__bar" style="--bar-color:${k.warna};width:${persen}%"></div></div>` : ''}
        <p class="stat__foot mt-3">${footer}</p>
      </div>`;
  }).join('');
}

/* --- Matrik ------------------------------------------------------------------
   Satu tabel gabungan untuk ketiga pos (bukan tab terpisah lagi). Tiap sel
   bulan menampilkan tiga titik kecil — satu per pos — supaya warga bisa
   membandingkan status Iuran/IPAL/Lelayu tanpa berpindah tab. */

function renderMatrik() {
  const wadah = document.getElementById('wadah-matrik');
  const { warga } = DATA;

  const tersaring = queryCari
    ? warga.filter((w) => w.nama.toLowerCase().includes(queryCari.toLowerCase()))
    : warga;

  if (!tersaring.length) {
    wadah.innerHTML = keadaanKosong(
      `Nama "${queryCari}" tidak ditemukan`,
      'Periksa kembali ejaan nama, atau hubungi bendahara bila nama Anda belum terdaftar.',
      'cari'
    );
    return;
  }

  const baris = tersaring.map((w) => {
    const selBulan = BULAN_PENDEK.map((label, i) => {
      const iuranPaid = w.iuran[i] > 0;
      const ipalPaid = w.ipal[i] > 0;
      const lelayuPaid = w.lelayu[i] > 0;

      const rincian = [
        `Iuran: ${iuranPaid ? `lunas ${rupiah(w.iuran[i])}` : 'belum tercatat'}`,
        `IPAL: ${ipalPaid ? `lunas ${rupiah(w.ipal[i])}` : 'belum tercatat'}`,
        `Lelayu: ${lelayuPaid ? `menyumbang ${rupiah(w.lelayu[i])}` : 'tidak menyumbang'}`,
      ].join(' · ');
      const judul = `${w.nama} — ${label}: ${rincian}`;

      return `<td>
        <span class="dot-tri" title="${amankan(judul)}">
          <span class="dot-tri__dot dot-tri__dot--iuran${iuranPaid ? ' is-terisi' : ''}"></span>
          <span class="dot-tri__dot dot-tri__dot--ipal${ipalPaid ? ' is-terisi' : ''}"></span>
          <span class="dot-tri__dot dot-tri__dot--lelayu${lelayuPaid ? ' is-terisi' : ''}"></span>
          <span class="sr-only">${amankan(judul)}</span>
        </span>
      </td>`;
    }).join('');

    return `
      <tr>
        <td class="cell-name">${amankan(w.nama)}</td>
        <td class="cell-pagu">
          <span class="cell-pagu__baris"><span class="cell-pagu__titik cell-pagu__titik--iuran"></span>${formatRb(w.paguIuran)}</span>
          <span class="cell-pagu__baris"><span class="cell-pagu__titik cell-pagu__titik--ipal"></span>${formatRb(w.paguIpal)}</span>
          <span class="cell-pagu__baris"><span class="cell-pagu__titik cell-pagu__titik--lelayu"></span>${formatRb(w.paguLelayu)}</span>
        </td>
        ${selBulan}
      </tr>`;
  }).join('');

  wadah.innerHTML = `
    <table class="matrix">
      <thead>
        <tr>
          <th class="col-name">Nama Warga</th>
          <th class="col-pagu">Pagu</th>
          ${BULAN_PENDEK.map((b) => `<th class="col-month">${b}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${baris}</tbody>
    </table>`;

  perbaruiIsyaratGeser();
}

/* Isyarat gulir hanya muncul kalau tabel memang lebih lebar dari pembungkusnya.
   Dibaca langsung (bukan lewat requestAnimationFrame) karena scrollWidth memaksa
   browser menghitung layout secara sinkron begitu dibaca — menunggu paint hanya
   menambah kerapuhan pada tab yang sedang tidak tampil/tidak fokus. */
function perbaruiIsyaratGeser() {
  const wadah = document.getElementById('wadah-matrik');
  const isyarat = document.getElementById('isyarat-geser');
  isyarat.classList.toggle('is-shown', wadah.scrollWidth > wadah.clientWidth + 4);
}

/* --- Kontrol ------------------------------------------------------------------ */

function pasangPencarian() {
  const input = document.getElementById('cari-nama');
  const tombolBersih = document.getElementById('btn-bersihkan-cari');

  let waktu;
  input.addEventListener('input', () => {
    clearTimeout(waktu);
    /* Jeda kecil supaya tidak menggambar ulang tabel di setiap ketukan huruf
       pada perangkat lambat — tetap terasa instan bagi pengguna. */
    waktu = setTimeout(() => {
      queryCari = input.value.trim();
      tombolBersih.hidden = !queryCari;
      renderMatrik();
    }, 90);
  });

  tombolBersih.addEventListener('click', () => {
    input.value = '';
    queryCari = '';
    tombolBersih.hidden = true;
    renderMatrik();
    input.focus();
  });
}

/* --- Mulai --------------------------------------------------------------------- */

async function mulai() {
  DATA = await ambilData();

  pasangIdentitas(DATA);
  pitaSumberData(DATA);
  isiKontakFooter(DATA.pengaturan || {});

  renderProgres();
  renderMatrik();
  pasangPencarian();

  selesaiRender();

  window.addEventListener('resize', perbaruiIsyaratGeser);
}

mulai();
