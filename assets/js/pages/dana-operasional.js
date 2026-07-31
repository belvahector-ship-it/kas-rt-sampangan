/* ==========================================================================
   HALAMAN: Bantuan Dana Operasional RT/RW
   ========================================================================== */

import { ambilData, segarkanData } from '../store.js';
import {
  rupiah, tanggalPanjang, amankan, ikon, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin, bukaForm, jalankanTulis } from '../admin.js';
import { kirimAksi } from '../auth.js';

pasangHeader();

let DATA = null;

function isiKontakFooter(pengaturan) {
  const wa = pengaturan.bendahara_wa || '';
  const el = document.getElementById('footer-wa');
  if (el) { if (wa) el.href = `https://wa.me/${nomorWA(wa)}`; else el.style.display = 'none'; }
  const email = document.getElementById('footer-email');
  if (email) { if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`; else email.style.display = 'none'; }
}

function renderRiwayat(daftar) {
  const wadah = document.getElementById('wadah-riwayat');

  if (!daftar.length) {
    wadah.innerHTML = keadaanKosong(
      'Belum ada catatan penggunaan dana',
      'Dana operasional belum pernah dipakai pada tahun buku ini.',
      'hibah'
    );
    return;
  }

  wadah.innerHTML = `
    <div class="simple-table-wrap">
      <table class="simple-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Pengguna</th>
            <th>Kategori</th>
            <th>Kegiatan</th>
            <th class="num-col">Nominal</th>
            <th data-admin-only></th>
          </tr>
        </thead>
        <tbody>
          ${daftar.map((d) => `
            <tr>
              <td class="cell-dim num" style="white-space:nowrap">${amankan(tanggalPanjang(d.tanggal))}</td>
              <td class="cell-strong">${d.pengguna ? amankan(d.pengguna) : '—'}</td>
              <td><span class="badge">${amankan(d.kategori)}</span></td>
              <td>${d.kegiatan ? amankan(d.kegiatan) : '—'}</td>
              <td class="num-col num text-neg">&minus;${amankan(rupiah(d.nominal))}</td>
              <td data-admin-only>
                ${d.id ? `<span class="baris-aksi">
                  <button type="button" title="Sunting" aria-label="Sunting catatan ini" data-sunting-dana="${amankan(d.id)}">${ikon('pena')}</button>
                </span>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* --- Mode pengurus: form penggunaan dana ---------------------------------- */

const KOLOM_DANA = [
  { nama: 'Tanggal', label: 'Tanggal', tipe: 'date', wajib: true },
  { nama: 'Pengguna', label: 'Pengguna', tipe: 'text', wajib: true,
    bantuan: 'Pihak yang memakai dana, mis. Kelurahan Sampangan RW 4 RT 1.' },
  { nama: 'Kategori', label: 'Kategori', tipe: 'text', wajib: true,
    bantuan: 'Mis. Kegiatan Sosial, Budaya, Operasional.' },
  { nama: 'Kegiatan', label: 'Kegiatan / Keperluan', tipe: 'textarea' },
  { nama: 'Nominal', label: 'Nominal (Rp)', tipe: 'number', wajib: true },
];

async function muatUlangDanGambar() {
  DATA = await segarkanData();
  gambarSemua();
}

function formDanaBaru() {
  bukaForm({
    judul: 'Catat Penggunaan Dana',
    labelSimpan: 'Simpan',
    nilai: { Tanggal: new Date().toISOString().slice(0, 10) },
    kolom: KOLOM_DANA,
    onSimpan: (nilai) => jalankanTulis(
      'Menyimpan penggunaan dana…',
      () => kirimAksi('tambahDanaOp', { nilai }),
      muatUlangDanGambar
    ),
  });
}

function formDanaSunting(id) {
  const d = DATA.danaOperasional.find((x) => x.id === id);
  if (!d) return;

  bukaForm({
    judul: 'Sunting Penggunaan Dana',
    labelSimpan: 'Simpan perubahan',
    nilai: {
      Tanggal: d.tanggal,
      Pengguna: d.pengguna,
      Kategori: d.kategori,
      Kegiatan: d.kegiatan,
      Nominal: d.nominal,
    },
    kolom: KOLOM_DANA,
    onSimpan: (nilai) => jalankanTulis(
      'Menyimpan perubahan…',
      () => kirimAksi('ubahDanaOp', { id, nilai }),
      muatUlangDanGambar
    ),
    onHapus: () => jalankanTulis(
      'Menghapus…',
      () => kirimAksi('hapusDanaOp', { id }),
      muatUlangDanGambar
    ),
  });
}

/** Menggambar seluruh isi halaman dari DATA. Dipisah dari mulai() supaya
    bisa dipanggil ulang setelah operasi tulis tanpa memuat ulang halaman. */
function gambarSemua() {
  const { statLain } = DATA;

  const peta = {
    saldoAwal: statLain.danaOperasionalSaldoAwal,
    sisa: statLain.danaOperasionalSisa,
    terpakai: statLain.danaOperasionalTerpakai,
  };

  document.querySelectorAll('[data-target]').forEach((el) => {
    const kunci = el.dataset.target;
    if (!(kunci in peta)) return;
    el.dataset.nilai = String(peta[kunci]);
    /* Kosongkan penanda supaya animasi hitung-naik jalan lagi dari 0 —
       tanpa ini angka lama tetap terpampang setelah data berubah. */
    el.dataset.dihitung = '';
    el.textContent = rupiah(0);
  });

  const sisaEl = document.querySelector('[data-target="sisa"]');
  sisaEl.classList.toggle('text-pos', statLain.danaOperasionalSisa >= 0);
  sisaEl.classList.toggle('text-neg', statLain.danaOperasionalSisa < 0);

  const teksSumber = document.getElementById('teks-sumber');
  if (teksSumber) teksSumber.textContent = statLain.danaOperasionalSumber || 'Pemkot/Kelurahan';

  renderRiwayat(DATA.danaOperasional);

  selesaiRender();
}

async function mulai() {
  DATA = await ambilData();

  pasangIdentitas(DATA);
  pitaSumberData(DATA);
  isiKontakFooter(DATA.pengaturan || {});

  gambarSemua();

  document.addEventListener('click', (e) => {
    const sunting = e.target.closest('[data-sunting-dana]');
    if (sunting) { formDanaSunting(sunting.dataset.suntingDana); return; }
    if (e.target.closest('[data-tambah-dana]')) formDanaBaru();
  });

  pasangHalamanAdmin();
}

mulai();
