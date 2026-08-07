/* ==========================================================================
   CHART — grafik batang tren 12 bulan, SVG murni tanpa pustaka.

   Aturan yang dipegang (lihat ui-ux-pro-max --domain chart):
   - selalu disertai tabel data untuk pembaca layar, grafik SVG diberi aria-hidden
   - grid rendah kontras, tidak bersaing dengan data
   - label langsung pada nilai penting, bukan hanya di sumbu
   - responsif lewat viewBox, bukan lebar piksel tetap
   ========================================================================== */

import { rupiah, rupiahRingkas, amankan } from './ui.js';

/**
 * @param {HTMLElement} wadah
 * @param {Array<{label:string, masuk:number, keluar:number}>} perBulan
 * @param {number} bulanSorot indeks bulan yang sedang dipilih di halaman (-1 = semua)
 */
export function gambarTrenChart(wadah, perBulan, bulanSorot = -1) {
  const W = 760, H = 260;
  const padL = 46, padR = 12, padT = 16, padB = 30;
  const lebarPlot = W - padL - padR;
  const tinggiPlot = H - padT - padB;

  const puncak = Math.max(1, ...perBulan.map((b) => Math.max(b.masuk, b.keluar)));
  const skalaY = (v) => tinggiPlot - (v / puncak) * tinggiPlot;

  const lebarGrup = lebarPlot / perBulan.length;
  const lebarBar = Math.min(16, lebarGrup * 0.3);

  /* Grid horizontal — 4 garis, nilai bulat */
  const jumlahGrid = 4;
  let grid = '';
  let labelSumbu = '';
  for (let i = 0; i <= jumlahGrid; i++) {
    const nilai = (puncak / jumlahGrid) * i;
    const y = padT + skalaY(nilai);
    grid += `<line class="chart__grid" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
    labelSumbu += `<text x="${padL - 8}" y="${y + 3}" text-anchor="end">${amankan(rupiahRingkas(nilai))}</text>`;
  }

  let batang = '';
  let labelBulan = '';

  perBulan.forEach((b, i) => {
    const xGrup = padL + i * lebarGrup;
    const xMasuk = xGrup + lebarGrup / 2 - lebarBar - 2;
    const xKeluar = xGrup + lebarGrup / 2 + 2;

    const hMasuk = (b.masuk / puncak) * tinggiPlot;
    const hKeluar = (b.keluar / puncak) * tinggiPlot;
    const disorot = i === bulanSorot;

    batang += `
      <g class="chart__bar" tabindex="0" role="img"
         aria-label="${amankan(b.label)}: masuk ${amankan(rupiah(b.masuk))}, keluar ${amankan(rupiah(b.keluar))}">
        <title>${amankan(b.label)} — Masuk ${amankan(rupiah(b.masuk))} · Keluar ${amankan(rupiah(b.keluar))}</title>
        <rect x="${xMasuk}" y="${padT + tinggiPlot - hMasuk}" width="${lebarBar}" height="${Math.max(hMasuk, b.masuk > 0 ? 2 : 0)}"
              fill="var(--accent)" opacity="${disorot || bulanSorot === -1 ? 1 : 0.35}"/>
        <rect x="${xKeluar}" y="${padT + tinggiPlot - hKeluar}" width="${lebarBar}" height="${Math.max(hKeluar, b.keluar > 0 ? 2 : 0)}"
              fill="var(--critical)" opacity="${disorot || bulanSorot === -1 ? 1 : 0.35}"/>
      </g>`;

    labelBulan += `<text x="${xGrup + lebarGrup / 2}" y="${H - 8}" text-anchor="middle"
      ${disorot ? 'font-weight="700" fill="var(--ink)"' : ''}>${amankan(b.label)}</text>`;
  });

  const tabelSR = `
    <table class="sr-only">
      <caption>Data tren kas masuk dan keluar per bulan</caption>
      <thead><tr><th>Bulan</th><th>Kas Masuk</th><th>Kas Keluar</th></tr></thead>
      <tbody>
        ${perBulan.map((b) => `<tr><td>${amankan(b.label)}</td><td>${amankan(rupiah(b.masuk))}</td><td>${amankan(rupiah(b.keluar))}</td></tr>`).join('')}
      </tbody>
    </table>`;

  wadah.innerHTML = `
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g class="chart__grid">${grid}</g>
      <g class="chart__axis">${labelSumbu}${labelBulan}</g>
      ${batang}
    </svg>
    ${tabelSR}`;
}
