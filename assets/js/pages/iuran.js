/* ==========================================================================
   HALAMAN: Iuran Warga — tabel tersulit di proyek ini (SPEC.md §3)
   ========================================================================== */

import { BULAN_PENDEK, BULAN_PANJANG } from '../config.js';
import { ambilData, segarkanData } from '../store.js';
import {
  rupiah, angkaID, amankan, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin, bukaForm, jalankanTulis } from '../admin.js';
import { kirimAksi } from '../auth.js';

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
    /* `warna` = ISIAN (titik & bilah progres), `teks` = ANGKA RUPIAH di atas
       kartu putih. Sejak palet berganti ke tema dasbor, ketiga warna pos
       terlalu terang untuk jadi warna teks — emerald 2,54:1, sky 3,68:1,
       amber 1,25:1 — jadi ketiganya kini memakai varian `-ink` yang gelap.
       Sebelumnya hanya IPAL (yang dulu kuning) yang butuh. */
    {
      pos: 'iuran', nama: 'Iuran Wajib', warna: 'var(--pos-iuran)', teks: 'var(--pos-iuran-ink)',
      terkumpul: stat.setoranIuran, target: stat.targetIuran,
    },
    {
      pos: 'ipal', nama: 'IPAL Bulanan', warna: 'var(--pos-ipal)', teks: 'var(--pos-ipal-ink)',
      terkumpul: stat.setoranIpal, target: stat.targetIpal,
    },
    {
      pos: 'lelayu', nama: 'Dana Lelayu', warna: 'var(--pos-lelayu)', teks: 'var(--pos-lelayu-ink)',
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
          <span style="width:12px;height:12px;border:2px solid var(--ink);border-radius:var(--r-pill);background:${k.warna};flex:none"></span>
          <span class="stat__label">${amankan(k.nama)}</span>
        </div>
        <p class="stat__value num" style="color:${k.teks}">${amankan(rupiah(k.terkumpul))}</p>
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
        <span class="dot-tri" title="${amankan(judul)}"
              data-nama="${amankan(w.nama)}" data-bulan="${i}">
          <span class="dot-tri__dot dot-tri__dot--iuran${iuranPaid ? ' is-terisi' : ''}" aria-hidden="true">I</span>
          <span class="dot-tri__dot dot-tri__dot--ipal${ipalPaid ? ' is-terisi' : ''}" aria-hidden="true">P</span>
          <span class="dot-tri__dot dot-tri__dot--lelayu${lelayuPaid ? ' is-terisi' : ''}" aria-hidden="true">L</span>
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

/* --- Mode pengurus: sunting satu sel matrik --------------------------------
   Sengaja membuka form konfirmasi alih-alih toggle seketika saat diklik.
   Dua alasan: (1) sel matrik hanya ~25px tinggi, jauh di bawah target sentuh
   44px — salah sentuh di HP akan langsung mengubah catatan keuangan tanpa
   sempat disadari; (2) satu sel memuat tiga pos sekaligus, jadi toggle
   instan tetap butuh cara memilih pos yang mana. Form menyelesaikan
   keduanya, dan menampilkan nominal sehingga bendahara bisa mencatat
   pembayaran sebagian. */

const POS_LEMBAR = { iuran: 'Iuran', ipal: 'IPAL', lelayu: 'Lelayu' };

function bukaSuntingSel(nama, bulan) {
  const w = DATA.warga.find((x) => x.nama === nama);
  if (!w) return;

  const awal = {
    Iuran: w.iuran[bulan] || '',
    IPAL: w.ipal[bulan] || '',
    Lelayu: w.lelayu[bulan] || '',
  };

  bukaForm({
    judul: `${nama} — ${BULAN_PANJANG[bulan]}`,
    labelSimpan: 'Simpan setoran',
    nilai: awal,
    kolom: [
      { nama: 'Iuran', label: 'Iuran Wajib', tipe: 'number',
        bantuan: `Pagu ${rupiah(w.paguIuran)}. Kosongkan atau isi 0 bila belum bayar.` },
      { nama: 'IPAL', label: 'IPAL', tipe: 'number',
        bantuan: `Pagu ${rupiah(w.paguIpal)}.` },
      { nama: 'Lelayu', label: 'Dana Lelayu', tipe: 'number',
        bantuan: w.paguLelayu != null
          ? `Nominal standar ${rupiah(w.paguLelayu)} — sukarela, bukan kewajiban.`
          : 'Sukarela, nominal bebas.' },
    ],
    onSimpan: async (nilai) => {
      /* Kirim HANYA pos yang berubah. Selain hemat panggilan, ini membuat
         AuditLog tidak penuh baris "diubah dari 0 ke 0". */
      const perubahan = Object.keys(POS_LEMBAR)
        .map((pos) => {
          const lembar = POS_LEMBAR[pos];
          const baru = Number(nilai[lembar] || 0);
          const lama = Number(w[pos][bulan] || 0);
          return baru === lama ? null : { pos: lembar, nominal: baru };
        })
        .filter(Boolean);

      if (!perubahan.length) return; /* tidak ada yang berubah — tutup saja */

      await jalankanTulis(
        `Menyimpan ${perubahan.length} perubahan…`,
        async () => {
          for (const p of perubahan) {
            await kirimAksi('setMatrik', { pos: p.pos, nama, bulan, nominal: p.nominal });
          }
        },
        async () => {
          DATA = await segarkanData();
          renderProgres();
          renderMatrik();
          selesaiRender();
        }
      );
    },
  });
}

function pasangSuntingMatrik() {
  const wadah = document.getElementById('wadah-matrik');
  /* Delegasi di wadah, bukan per sel: tabel digambar ulang tiap pencarian
     atau penyimpanan, jadi listener per sel akan hilang terus. */
  wadah.addEventListener('click', (e) => {
    if (!document.documentElement.classList.contains('is-admin')) return;
    const sel = e.target.closest('.dot-tri');
    if (!sel || !wadah.contains(sel)) return;
    bukaSuntingSel(sel.dataset.nama, Number(sel.dataset.bulan));
  });
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
  pasangSuntingMatrik();

  selesaiRender();

  window.addEventListener('resize', perbaruiIsyaratGeser);

  /* Dipanggil terakhir: kalau ada sesi pengurus tersimpan, ini yang
     memunculkan kontrol tulis. Tidak menunggu hasilnya — halaman sudah
     bisa dipakai warga biasa sejak baris-baris di atas selesai. */
  pasangHalamanAdmin(() => {
    const catatan = document.getElementById('catatan-admin-matrik');
    if (catatan) {
      catatan.hidden = !document.documentElement.classList.contains('is-admin');
    }
  });
}

mulai();
