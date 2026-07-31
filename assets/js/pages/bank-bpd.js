/* ==========================================================================
   HALAMAN: Kas Warga di Rekening BPD
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  rupiah, tanggalPanjang, amankan, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';
import { pasangHalamanAdmin } from '../admin.js';

pasangHeader();

function isiKontakFooter(pengaturan) {
  const wa = pengaturan.bendahara_wa || '';
  const el = document.getElementById('footer-wa');
  if (el) { if (wa) el.href = `https://wa.me/${nomorWA(wa)}`; else el.style.display = 'none'; }
  const email = document.getElementById('footer-email');
  if (email) { if (pengaturan.bendahara_email) email.href = `mailto:${pengaturan.bendahara_email}`; else email.style.display = 'none'; }
}

function renderAlokasi(bankBpd) {
  const wadah = document.getElementById('wadah-alokasi');

  if (!bankBpd.length) {
    wadah.innerHTML = keadaanKosong(
      'Belum ada data alokasi',
      'Bendahara belum mencatat rincian saldo rekening BPD di lembar BankBPD.',
      'bank'
    );
    return;
  }

  wadah.innerHTML = `
    <div class="simple-table-wrap">
      <table class="simple-table">
        <thead>
          <tr>
            <th>Nama Alokasi</th>
            <th class="num-col">Saldo</th>
            <th>Diperbarui</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${bankBpd.map((a) => `
            <tr>
              <td class="cell-strong">${amankan(a.namaAlokasi)}</td>
              <td class="num-col num">${amankan(rupiah(a.saldo))}</td>
              <td class="cell-dim num">${a.diperbarui ? amankan(tanggalPanjang(a.diperbarui)) : '—'}</td>
              <td class="cell-dim">${a.catatan ? amankan(a.catatan) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function mulai() {
  const data = await ambilData();

  pasangIdentitas(data);
  pitaSumberData(data);
  isiKontakFooter(data.pengaturan || {});

  const totalEl = document.querySelector('[data-target="totalBpd"]');
  totalEl.dataset.nilai = String(data.statLain.totalBpd);
  totalEl.textContent = rupiah(0);
  document.querySelector('.balance').removeAttribute('data-loading');

  renderAlokasi(data.bankBpd);

  selesaiRender();

  /* Halaman ini tidak punya operasi tulis. pasangHalamanAdmin tetap
     dipanggil supaya tombol "Pengurus" dan pemulihan sesi tersedia dari
     sini juga — login tidak boleh cuma bisa dimulai dari halaman yang
     kebetulan punya tombol simpan. */
  pasangHalamanAdmin();
}

mulai();
