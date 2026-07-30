/* ==========================================================================
   HALAMAN: Bantuan Dana Operasional RT/RW
   ========================================================================== */

import { ambilData } from '../store.js';
import {
  rupiah, tanggalPanjang, amankan, nomorWA,
  pasangHeader, pasangIdentitas, pitaSumberData, keadaanKosong, selesaiRender,
} from '../ui.js';

pasangHeader();

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
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function mulai() {
  const data = await ambilData();
  const { statLain } = data;

  pasangIdentitas(data);
  pitaSumberData(data);
  isiKontakFooter(data.pengaturan || {});

  document.querySelectorAll('[data-target]').forEach((el) => {
    const peta = {
      saldoAwal: statLain.danaOperasionalSaldoAwal,
      sisa: statLain.danaOperasionalSisa,
      terpakai: statLain.danaOperasionalTerpakai,
    };
    const kunci = el.dataset.target;
    if (!(kunci in peta)) return;
    el.dataset.nilai = String(peta[kunci]);
    el.textContent = rupiah(0);
  });

  const sisaEl = document.querySelector('[data-target="sisa"]');
  sisaEl.classList.toggle('text-pos', statLain.danaOperasionalSisa >= 0);
  sisaEl.classList.toggle('text-neg', statLain.danaOperasionalSisa < 0);

  const teksSumber = document.getElementById('teks-sumber');
  if (teksSumber) teksSumber.textContent = statLain.danaOperasionalSumber || 'Pemkot/Kelurahan';

  renderRiwayat(data.danaOperasional);

  selesaiRender();
}

mulai();
