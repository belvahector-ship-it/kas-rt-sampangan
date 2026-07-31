/* ==========================================================================
   HALAMAN: Laporan Kas
   ========================================================================== */

import { BULAN_PANJANG } from '../config.js';
import { ambilData, segarkanData } from '../store.js';
import {
  rupiah, tanggalPendek, amankan, ikon, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';
import { gambarTrenChart } from '../chart.js';
import { pasangHalamanAdmin, bukaForm, jalankanTulis } from '../admin.js';
import { kirimAksi } from '../auth.js';

pasangHeader();

/** Dipegang di modul supaya handler admin bisa menggambar ulang tanpa
    menerima data lewat rantai argumen yang panjang. */
let DATA = null;
let bulanAktif = 0;

function isiKontakFooter(pengaturan) {
  const wa = pengaturan.bendahara_wa || '';
  const el = document.getElementById('footer-wa');
  if (el) { if (wa) el.href = `https://wa.me/${nomorWA(wa)}`; else el.style.display = 'none'; }
  const email = document.getElementById('footer-email');
  if (email) { if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`; else email.style.display = 'none'; }
}

function baseKategori(kategori) {
  const k = String(kategori || '').toLowerCase();
  if (k.includes('ipal') || k.includes('sanitasi')) return 'Pemeliharaan IPAL';
  if (k.includes('lelayu') || k.includes('sosial') || k.includes('duka')) return 'Sosial / Lelayu';
  return kategori || 'Lain-lain';
}

function renderEntri(daftar, wadah, jenis) {
  if (!daftar.length) {
    wadah.innerHTML = keadaanKosong(
      jenis === 'masuk' ? 'Belum ada kas masuk' : 'Belum ada kas keluar',
      'Tidak ada transaksi manual tercatat pada bulan ini.',
      jenis === 'masuk' ? 'naik' : 'turun'
    );
    return;
  }

  wadah.innerHTML = daftar.map((t) => `
    <div class="entry">
      <div class="entry__main">
        <div class="entry__meta">
          <span class="entry__date num">${amankan(tanggalPendek(t.tanggal))}</span>
          <span class="badge badge--${t.pos}">${amankan(baseKategori(t.kategori))}</span>
        </div>
        <p class="entry__desc">${amankan(t.keterangan || (jenis === 'masuk' ? 'Setoran kas RT' : 'Pengeluaran RT'))}</p>
      </div>
      <span class="entry__amount ${jenis === 'masuk' ? 'text-pos' : 'text-neg'}">
        ${jenis === 'masuk' ? '+' : '−'}${amankan(rupiah(t.jumlah))}
      </span>
      ${t.id ? `
        <span class="baris-aksi" data-admin-only>
          <button type="button" title="Sunting" aria-label="Sunting catatan ini" data-sunting="${amankan(t.id)}">${ikon('pena')}</button>
        </span>` : ''}
    </div>`).join('');
}

/* --- Mode pengurus: form transaksi ---------------------------------------- */

const KOLOM_TRANSAKSI = [
  { nama: 'Tanggal', label: 'Tanggal', tipe: 'date', wajib: true },
  { nama: 'Jenis', label: 'Jenis', tipe: 'select', opsi: ['Masuk', 'Keluar'], wajib: true },
  { nama: 'Kategori', label: 'Kategori', tipe: 'text', wajib: true,
    bantuan: 'Mengandung "IPAL" → masuk pos IPAL. Mengandung "Lelayu"/"Sosial" → pos Lelayu. Selain itu → pos Iuran.' },
  { nama: 'Jumlah', label: 'Jumlah (Rp)', tipe: 'number', wajib: true },
  { nama: 'Keterangan', label: 'Keterangan', tipe: 'textarea' },
];

async function muatUlangDanGambar() {
  DATA = await segarkanData();
  render(DATA, bulanAktif);
}

function formTransaksiBaru() {
  const hariIni = new Date().toISOString().slice(0, 10);
  bukaForm({
    judul: 'Catat Transaksi Kas',
    labelSimpan: 'Simpan',
    nilai: { Tanggal: hariIni, Jenis: 'Keluar' },
    kolom: KOLOM_TRANSAKSI,
    onSimpan: (nilai) => jalankanTulis(
      'Menyimpan transaksi…',
      () => kirimAksi('tambahTransaksi', { nilai }),
      muatUlangDanGambar
    ),
  });
}

function formTransaksiSunting(id) {
  const t = DATA.transaksi.find((x) => x.id === id);
  if (!t) return;

  bukaForm({
    judul: 'Sunting Transaksi',
    labelSimpan: 'Simpan perubahan',
    nilai: {
      Tanggal: t.tanggal,
      Jenis: t.jenis === 'masuk' ? 'Masuk' : 'Keluar',
      Kategori: t.kategori,
      Jumlah: t.jumlah,
      Keterangan: t.keterangan,
    },
    kolom: KOLOM_TRANSAKSI,
    onSimpan: (nilai) => jalankanTulis(
      'Menyimpan perubahan…',
      () => kirimAksi('ubahTransaksi', { id, nilai }),
      muatUlangDanGambar
    ),
    onHapus: () => jalankanTulis(
      'Menghapus…',
      () => kirimAksi('hapusTransaksi', { id }),
      muatUlangDanGambar
    ),
  });
}

function renderKategori(wadah, perKategori) {
  if (!perKategori.length) {
    wadah.innerHTML = keadaanKosong('Belum ada rincian kategori', 'Transaksi manual akan tampil di sini setelah bendahara mencatatnya.');
    return;
  }

  wadah.innerHTML = `
    <div style="overflow-x:auto">
    <table style="min-width:480px">
      <thead>
        <tr style="border-bottom:1px solid var(--line)">
          <th class="eyebrow" style="text-align:left;padding:var(--sp-3) var(--sp-5)">Kategori</th>
          <th class="eyebrow" style="text-align:left;padding:var(--sp-3) var(--sp-2)">Jenis</th>
          <th class="eyebrow" style="text-align:right;padding:var(--sp-3) var(--sp-5)">Jumlah Entri</th>
          <th class="eyebrow" style="text-align:right;padding:var(--sp-3) var(--sp-5)">Total</th>
        </tr>
      </thead>
      <tbody>
        ${perKategori.map((k) => `
          <tr style="border-bottom:1px solid var(--line-soft)">
            <td style="padding:var(--sp-3) var(--sp-5);font-weight:600">${amankan(k.kategori)}</td>
            <td style="padding:var(--sp-3) var(--sp-2)">
              <span class="badge ${k.jenis === 'masuk' ? 'badge--pos' : 'badge--neg'}">${k.jenis === 'masuk' ? 'Masuk' : 'Keluar'}</span>
            </td>
            <td class="num" style="padding:var(--sp-3) var(--sp-5);text-align:right;color:var(--ink-3)">${k.jumlahEntri}</td>
            <td class="num" style="padding:var(--sp-3) var(--sp-5);text-align:right;font-weight:700" >${amankan(rupiah(k.total))}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
}

function render(data, bulanTerpilih) {
  const { transaksi, stat } = data;

  const terfilter = bulanTerpilih === 0
    ? transaksi
    : transaksi.filter((t) => t.tanggal && parseInt(t.tanggal.slice(5, 7), 10) === bulanTerpilih);

  const masuk = terfilter.filter((t) => t.jenis === 'masuk');
  const keluar = terfilter.filter((t) => t.jenis === 'keluar');
  const sumMasuk = masuk.reduce((a, t) => a + t.jumlah, 0);
  const sumKeluar = keluar.reduce((a, t) => a + t.jumlah, 0);
  const selisih = sumMasuk - sumKeluar;

  const labelBulan = bulanTerpilih === 0 ? 'Semua Bulan' : BULAN_PANJANG[bulanTerpilih - 1];
  document.getElementById('lbl-masuk').textContent = `Kas Masuk (${labelBulan})`;
  document.getElementById('lbl-keluar').textContent = `Kas Keluar (${labelBulan})`;

  document.querySelectorAll('[data-target="masuk"]').forEach((el) => {
    el.dataset.nilai = String(sumMasuk); el.dataset.dihitung = ''; el.textContent = rupiah(0);
  });
  document.querySelectorAll('[data-target="keluar"]').forEach((el) => {
    el.dataset.nilai = String(sumKeluar); el.dataset.dihitung = ''; el.textContent = rupiah(0);
  });

  const elSelisih = document.getElementById('nilai-selisih');
  elSelisih.textContent = `${selisih >= 0 ? '+' : '−'}${rupiah(Math.abs(selisih))}`;
  elSelisih.classList.toggle('text-pos', selisih >= 0);
  elSelisih.classList.toggle('text-neg', selisih < 0);

  document.getElementById('total-masuk-list').textContent = rupiah(sumMasuk);
  document.getElementById('total-keluar-list').textContent = rupiah(sumKeluar);

  renderEntri(masuk, document.getElementById('daftar-masuk'), 'masuk');
  renderEntri(keluar, document.getElementById('daftar-keluar'), 'keluar');
  renderKategori(document.getElementById('wadah-kategori'), stat.perKategori);

  gambarTrenChart(document.getElementById('wadah-grafik'), stat.perBulan, bulanTerpilih === 0 ? -1 : bulanTerpilih - 1);

  selesaiRender();
}

function isiPemilihBulan() {
  const sel = document.getElementById('pilih-bulan');
  const opsi = ['<option value="0">Semua Bulan</option>']
    .concat(BULAN_PANJANG.map((b, i) => `<option value="${i + 1}">${b}</option>`));
  sel.innerHTML = opsi.join('');

  const bulanIni = new Date().getMonth() + 1;
  sel.value = String(bulanIni);
  return sel;
}

async function mulai() {
  DATA = await ambilData();

  pasangIdentitas(DATA);
  pitaSumberData(DATA);
  isiKontakFooter(DATA.pengaturan || {});

  const sel = isiPemilihBulan();
  bulanAktif = parseInt(sel.value, 10);
  render(DATA, bulanAktif);

  sel.addEventListener('change', () => {
    bulanAktif = parseInt(sel.value, 10);
    render(DATA, bulanAktif);
  });

  /* Delegasi di document: daftar jurnal digambar ulang tiap ganti bulan
     dan tiap penyimpanan, jadi listener per tombol akan hilang terus. */
  document.addEventListener('click', (e) => {
    const sunting = e.target.closest('[data-sunting]');
    if (sunting) { formTransaksiSunting(sunting.dataset.sunting); return; }
    if (e.target.closest('[data-tambah-transaksi]')) formTransaksiBaru();
  });

  pasangHalamanAdmin();
}

mulai();
