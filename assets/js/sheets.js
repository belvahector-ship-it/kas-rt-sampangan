/* ==========================================================================
   SHEETS — pemuat data berlapis tiga (DECISIONS.md CP-08)

   Lapis 1  endpoint gviz Google Sheets      (selalu dicoba lebih dulu)
   Lapis 2  CSV publish-to-web               (kalau dikonfigurasi)
   Lapis 3  data/snapshot.json               (selalu berhasil)

   Kontraknya: fungsi ini TIDAK PERNAH melempar galat. Portal transparansi
   keuangan yang menampilkan halaman kosong terbaca sebagai "pengurus
   menyembunyikan sesuatu", bukan sebagai kegagalan teknis. Yang terburuk
   yang boleh terjadi adalah data lama disertai label kapan diambil.
   ========================================================================== */

import { CONFIG } from './config.js';

/* --- Pembantu ------------------------------------------------------------- */

async function ambilDenganBatasWaktu(url, ms) {
  const pembatal = new AbortController();
  const jam = setTimeout(() => pembatal.abort(), ms);
  try {
    const res = await fetch(url, { signal: pembatal.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(jam);
  }
}

/**
 * Pengurai CSV yang menghormati tanda kutip, koma di dalam kutip, baris
 * bertingkat, dan kutip ganda yang di-escape (""). Pemisahan naif dengan
 * split(',') akan rusak pada keterangan seperti: "Beli semen, pasir".
 */
export function uraikanCSV(teks) {
  const baris = [];
  let sel = '';
  let barisIni = [];
  let dalamKutip = false;

  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];

    if (dalamKutip) {
      if (c === '"') {
        if (teks[i + 1] === '"') { sel += '"'; i++; }
        else dalamKutip = false;
      } else sel += c;
      continue;
    }

    if (c === '"') { dalamKutip = true; continue; }
    if (c === ',') { barisIni.push(sel); sel = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { barisIni.push(sel); baris.push(barisIni); barisIni = []; sel = ''; continue; }
    sel += c;
  }

  barisIni.push(sel);
  baris.push(barisIni);

  return baris.filter((r) => r.some((v) => String(v).trim() !== ''));
}

/**
 * Respons gviz dibungkus: /*O_o* /\ngoogle.visualization.Query.setResponse({...});
 * Kita potong pembungkusnya lalu urai JSON di dalamnya.
 */
function uraikanGviz(teks) {
  const mulai = teks.indexOf('{');
  const akhir = teks.lastIndexOf('}');
  if (mulai === -1 || akhir === -1) throw new Error('Bentuk respons gviz tidak dikenali');

  const data = JSON.parse(teks.slice(mulai, akhir + 1));
  if (data.status === 'error') {
    const pesan = (data.errors || []).map((e) => e.detailed_message || e.message).join('; ');
    throw new Error(pesan || 'gviz mengembalikan status error');
  }

  const tabel = data.table;
  if (!tabel) throw new Error('gviz tidak mengembalikan tabel');

  /* gviz kadang menaruh baris judul di `label` kolom, kadang menjadikannya
     baris pertama data. Kita tangani keduanya supaya bendahara tidak perlu
     tahu bedanya. */
  const labelKolom = (tabel.cols || []).map((c) => String(c.label || '').trim());
  const punyaLabel = labelKolom.some((l) => l !== '');

  const barisData = (tabel.rows || []).map((r) =>
    (r.c || []).map((sel) => {
      if (!sel) return '';

      /* `f` adalah nilai terformat seperti yang dilihat manusia di sheet;
         `v` adalah nilai mentah. Untuk angka kita mau yang mentah supaya
         pemisah ribuan lokal tidak ikut terbawa. */
      if (typeof sel.v === 'number') return sel.v;

      /* Sel bertanggal dikembalikan gviz sebagai string "Date(2026,0,15)"
         dengan bulan berbasis nol. Kalau kita pakai `f` sebagai gantinya,
         bentuknya ikut setelan lokal spreadsheet — bisa 15/01/2026 atau
         01/15/2026, dan keduanya mustahil dibedakan. Jadi diurai di sini
         dan selalu dinormalkan ke YYYY-MM-DD. */
      if (typeof sel.v === 'string') {
        const d = sel.v.match(/^Date\((\d+),(\d+),(\d+)/);
        if (d) {
          const th = d[1];
          const bl = String(Number(d[2]) + 1).padStart(2, '0');
          const tg = String(Number(d[3])).padStart(2, '0');
          return `${th}-${bl}-${tg}`;
        }
      }

      if (sel.f != null) return String(sel.f);
      return sel.v == null ? '' : String(sel.v);
    })
  );

  return punyaLabel ? [labelKolom, ...barisData] : barisData;
}

/** Ubah larik-of-larik menjadi larik objek berkunci nama kolom. */
function keObjek(baris) {
  if (!baris.length) return [];
  const kepala = baris[0].map((h) => String(h).trim());
  return baris.slice(1).map((r) => {
    const o = {};
    kepala.forEach((k, i) => { if (k) o[k] = r[i] === undefined ? '' : r[i]; });
    return o;
  });
}

/* --- Lapis 1: gviz -------------------------------------------------------- */

async function muatViaGviz(namaLembar) {
  const url =
    `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(namaLembar)}`;
  return keObjek(uraikanGviz(await ambilDenganBatasWaktu(url, CONFIG.TIMEOUT_MS)));
}

/* --- Lapis 2: CSV publish-to-web ------------------------------------------ */

async function muatViaCSV(namaLembar) {
  const gid = CONFIG.GIDS[namaLembar];
  if (!CONFIG.PUBLISHED_ID || !gid) throw new Error('CSV cadangan tidak dikonfigurasi');
  const url =
    `https://docs.google.com/spreadsheets/d/e/${CONFIG.PUBLISHED_ID}/pub` +
    `?gid=${gid}&single=true&output=csv`;
  return keObjek(uraikanCSV(await ambilDenganBatasWaktu(url, CONFIG.TIMEOUT_MS)));
}

/* --- Lapis 3: snapshot ---------------------------------------------------- */

async function muatSnapshot() {
  const res = await fetch(CONFIG.SNAPSHOT_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Snapshot tidak terbaca (HTTP ${res.status})`);
  return res.json();
}

/* --- Cache peramban ------------------------------------------------------- */

function bacaCache() {
  try {
    const mentah = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!mentah) return null;
    const { waktu, data } = JSON.parse(mentah);
    if (Date.now() - waktu > CONFIG.CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function tulisCache(data) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ waktu: Date.now(), data }));
  } catch {
    /* Kuota penuh atau mode privat. Cache hanya optimasi — abaikan. */
  }
}

/* --- Muat satu lembar dengan mundur bertahap ------------------------------ */

async function muatLembar(namaLembar, galat) {
  if (CONFIG.SHEET_ID) {
    try {
      return await muatViaGviz(namaLembar);
    } catch (e) {
      galat.push(`gviz "${namaLembar}": ${e.message}`);
    }
    try {
      return await muatViaCSV(namaLembar);
    } catch (e) {
      galat.push(`csv "${namaLembar}": ${e.message}`);
    }
  }
  return null;
}

/* --- API publik ----------------------------------------------------------- */

/**
 * Menarik seluruh lembar. Selalu mengembalikan objek berbentuk
 * { lembar: {...}, meta: { sumber, diambilPada, galat[] } }.
 *
 * Bila SATU lembar saja gagal ditarik secara langsung, kita mundurkan
 * SELURUHNYA ke snapshot. Alasannya: mencampur lembar langsung dengan
 * lembar cadangan menghasilkan angka yang tidak konsisten satu sama lain —
 * misalnya daftar warga baru dipasangkan dengan matrik pembayaran lama.
 * Pembukuan yang setengah baru lebih berbahaya daripada pembukuan lama.
 */
export async function muatSemuaData() {
  const galat = [];
  const namaLembar = Object.values(CONFIG.SHEETS);

  if (CONFIG.SHEET_ID) {
    const hasil = await Promise.all(namaLembar.map((n) => muatLembar(n, galat)));
    const semuaBerhasil = hasil.every((h) => h !== null);

    if (semuaBerhasil) {
      const lembar = {};
      namaLembar.forEach((n, i) => { lembar[n] = hasil[i]; });
      const paket = {
        lembar,
        meta: { sumber: 'live', diambilPada: new Date().toISOString(), galat },
      };
      tulisCache(paket);
      return paket;
    }
  }

  /* Cache lebih segar daripada snapshot yang ter-commit, jadi dicoba dulu. */
  const dariCache = bacaCache();
  if (dariCache) {
    return {
      ...dariCache,
      meta: { ...dariCache.meta, sumber: 'cache', galat: [...galat, ...(dariCache.meta.galat || [])] },
    };
  }

  try {
    const snap = await muatSnapshot();
    return {
      lembar: snap.lembar,
      meta: {
        sumber: 'snapshot',
        diambilPada: snap.diambilPada || null,
        galat,
      },
    };
  } catch (e) {
    galat.push(`snapshot: ${e.message}`);
    return { lembar: {}, meta: { sumber: 'gagal', diambilPada: null, galat } };
  }
}
