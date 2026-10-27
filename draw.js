'use strict';

/* ============================================================
   DOORPRIZE — Mesin undian (SERVER-SIDE)
   Seluruh penentuan pemenang — termasuk target adm1ndev — terjadi DI SINI, bukan
   di browser. Dashboard hanya menerima daftar pemenang (tanpa penanda target),
   jadi target tak pernah sampai ke layar undian / devtools operator.
   Fungsi di modul ini MURNI terhadap objek state yang diberikan (memutasi salinan
   yang dibaca server.js dari disk) agar mudah diuji tanpa HTTP.
   ============================================================ */

const STATUS_ACTIVE = 'Belum Diundi';
const STATUS_WON = 'Sudah Diundi';
const STATUS_DQ = 'Gugur';
const TARGET_PENDING = 'Belum Dieksekusi';
const TARGET_DONE = 'Sudah Dieksekusi';
const TARGET_SKIPPED = 'Terlewati';

function norm(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Nilai kategori yang BENAR-BENAR ada di data peserta. Filter hadiah dengan nilai
// yang tak ada (mis. data peserta diganti) diabaikan, bukan membuat hadiah kosong.
function categoryIndex(dataPeserta) {
  const idx = { jenis: new Set(), grup: new Set(), kelompok: new Set() };
  for (const p of dataPeserta) {
    if (norm(p.jenisPeserta)) idx.jenis.add(norm(p.jenisPeserta));
    if (norm(p.grup)) idx.grup.add(norm(p.grup));
    if (norm(p.kelompok)) idx.kelompok.add(norm(p.kelompok));
  }
  return idx;
}

const RULE_FIELDS = [['jenis', 'jenisPeserta'], ['grup', 'grup'], ['kelompok', 'kelompok']];

function matchRule(p, rule, cats) {
  for (const [field, pField] of RULE_FIELDS) {
    const want = norm(rule[field]);
    if (want && want !== 'semua' && cats[field].has(want) && norm(p[pField]) !== want) return false;
  }
  return true;
}

// Kategori target lama (sebelum target berjangkar hadiah): 'Jenis: X' / 'Grup: X' /
// 'Kelompok: X' / nilai bebas. Target baru selalu 'Semua'.
function matchCluster(p, category) {
  if (!category || category === 'Semua') return true;
  const c = norm(category);
  if (c.startsWith('jenis: ')) return norm(p.jenisPeserta) === norm(category.slice(7));
  if (c.startsWith('grup: ')) return norm(p.grup) === norm(category.slice(6));
  if (c.startsWith('kelompok: ')) return norm(p.kelompok) === norm(category.slice(10));
  return [p.cluster, p.jenisPeserta, p.grup, p.kelompok].some(v => norm(v) === c);
}

function findPrize(prizes, prizeId) {
  return prizeId ? prizes.find(p => p && p.id === prizeId) || null : null;
}

// Target berjangkar HADIAH: ronde efektifnya = ronde hadiah SAAT INI. Hadiah dipindah
// ke ronde mana pun → target ikut. Target lama (tanpa prizeId) / hadiah terhapus →
// nomor ronde terakhir yang tersimpan.
function effectiveRonde(target, prizes) {
  const prize = findPrize(prizes, target.prizeId);
  return prize ? (parseInt(prize.ronde, 10) || 1) : (parseInt(target.ronde, 10) || 0);
}

// Samakan cache `ronde` & `prizeName` target dengan hadiahnya (label tabel adm1ndev).
function syncTargetCache(targets, prizes) {
  let changed = false;
  for (const t of targets) {
    const prize = findPrize(prizes, t.prizeId);
    if (!prize) continue;
    const ronde = parseInt(prize.ronde, 10) || 1;
    if (t.ronde !== ronde) { t.ronde = ronde; changed = true; }
    if (prize.name && t.prizeName !== prize.name) { t.prizeName = prize.name; changed = true; }
  }
  return changed;
}

// Target yang hadiahnya kini di ronde yang SUDAH lewat tak akan pernah dieksekusi;
// tanpa dilepas, pesertanya terkunci selamanya. Lepas → 'Terlewati' (ikut undian acak).
function releaseStranded(targets, prizes, currentRonde) {
  let changed = false;
  for (const t of targets) {
    if (t.status === TARGET_PENDING && effectiveRonde(t, prizes) < currentRonde) {
      t.status = TARGET_SKIPPED;
      changed = true;
    }
  }
  return changed;
}

function roundRules(prizes, ronde) {
  const rules = prizes
    .filter(p => p && (parseInt(p.ronde, 10) || 1) === ronde)
    .map(p => ({
      prizeId: p.id || null,
      prizeName: String(p.name || '').trim(),
      jenis: p.jenis || 'Semua',
      grup: p.grup || 'Semua',
      kelompok: p.kelompok || 'Semua',
      count: Math.max(1, parseInt(p.count, 10) || 1)
    }));
  // Ronde tanpa hadiah di Pengaturan: 1 pemenang bebas.
  return rules.length ? rules : [{ prizeId: null, prizeName: '', jenis: 'Semua', grup: 'Semua', kelompok: 'Semua', count: 1 }];
}

function toWinner(p, rule) {
  return {
    id: p.id,
    nama: p.nama,
    jenisPeserta: p.jenisPeserta || '',
    grup: p.grup || '',
    kelompok: p.kelompok || '',
    prizeId: rule.prizeId || null,
    hadiah: rule.prizeName || ''
  };
}

// Urut berkelompok per hadiah sesuai urutan hadiah di Pengaturan (nama sama = satu
// kelompok). Stabil; hadiah tak dikenal di akhir.
function sortByPrize(winners, prizes) {
  const order = new Map();
  prizes.forEach(p => { const k = norm(p && p.name); if (!order.has(k)) order.set(k, order.size); });
  const rank = w => (order.has(norm(w.hadiah)) ? order.get(norm(w.hadiah)) : order.size);
  return winners.map((w, i) => ({ w, i })).sort((a, b) => (rank(a.w) - rank(b.w)) || (a.i - b.i)).map(x => x.w);
}

function uniqueNames(names) {
  const seen = new Set();
  return names.map(n => String(n || '').trim()).filter(n => {
    if (!n || seen.has(n.toLowerCase())) return false;
    seen.add(n.toLowerCase());
    return true;
  });
}

function historyString(winners) {
  return winners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');
}

function setRecordWinners(record, winners) {
  record.pemenang = winners.map(w => ({
    id: w.id || '', nama: w.nama || '', jenisPeserta: w.jenisPeserta || '', grup: w.grup || '',
    kelompok: w.kelompok || '', hadiah: w.hadiah || '', prizeId: w.prizeId || null
  }));
  record.Daftar_Pemenang_Keluar = historyString(winners) || 'DIBATALKAN';
  record.Jumlah_Pemenang = winners.length;
  record.updatedAt = Date.now();
}

// Isi tiap aturan hadiah: (1) target adm1ndev milik hadiah itu, (2) acak yang cocok
// kategori hadiah, (3) acak bebas bila kategori kurang. `batch` mencegah satu orang
// menang dua kali dalam satu putaran; `pool` sudah bebas pemenang lama & target pending.
function fillRules(rules, { pool, targetStates, byId, cats, rand }) {
  const batch = new Set();
  const winners = [];
  for (const rule of rules) {
    const got = [];
    for (const state of targetStates) {
      // Target berbasis hadiah HANYA ke slot hadiahnya; target lama cocok aturan mana pun.
      if (state.target.prizeId && rule.prizeId !== state.target.prizeId) continue;
      for (const id of state.remaining.slice()) {
        if (got.length >= rule.count) break;
        const p = byId.get(id);
        if (!p || p.status !== STATUS_ACTIVE || batch.has(id)) continue;
        if (!matchCluster(p, state.target.cluster) || !matchRule(p, rule, cats)) continue;
        batch.add(id);
        got.push(toWinner(p, rule));
        state.remaining.splice(state.remaining.indexOf(id), 1);
      }
    }
    for (const strict of [true, false]) {
      if (got.length >= rule.count) break;
      const candidates = shuffle(pool.filter(p => !batch.has(p.id) && (!strict || matchRule(p, rule, cats))), rand);
      for (const p of candidates) {
        if (got.length >= rule.count) break;
        batch.add(p.id);
        got.push(toWinner(p, rule));
      }
    }
    // Acak DI DALAM hadiah (posisi target tak tertebak), tanpa mencampur antar-hadiah.
    winners.push(...shuffle(got, rand));
  }
  return winners;
}

// ID yang tak boleh keluar lewat undian ACAK: pemenang lama/gugur + semua anggota
// target yang masih menunggu (ronde mana pun) — target ronde ini keluar lewat jalur target.
function blockedIds(dataPeserta, targets) {
  const blocked = new Set(dataPeserta.filter(p => p.status !== STATUS_ACTIVE).map(p => p.id));
  for (const t of targets) {
    if (t.status === TARGET_PENDING) (t.targets || []).forEach(id => blocked.add(id));
  }
  return blocked;
}

function shortageNotices(rules, active, cats) {
  const notices = [];
  for (const rule of rules) {
    const parts = RULE_FIELDS
      .filter(([field]) => norm(rule[field]) && norm(rule[field]) !== 'semua' && cats[field].has(norm(rule[field])))
      .map(([field]) => `${field[0].toUpperCase()}${field.slice(1)}: ${rule[field]}`);
    if (!parts.length) continue;
    const available = active.filter(p => matchRule(p, rule, cats)).length;
    if (available < rule.count) {
      notices.push(`Kategori hadiah "${rule.prizeName || 'Hadiah'}" (${parts.join(' | ')}) hanya memiliki ${available} peserta aktif. Kekurangannya diisi peserta aktif lain.`);
    }
  }
  return notices;
}

/**
 * Undi satu ronde. Memutasi `peserta` & `admin`. Mengembalikan
 * { winners, record, currentRonde, notices, adminChanged } atau { status, error }.
 */
function drawRound({ peserta, settings, admin, ronde, waktu, rand = Math.random }) {
  const prizes = Array.isArray(settings.prizes) ? settings.prizes : [];
  const dataPeserta = Array.isArray(peserta.dataPeserta) ? peserta.dataPeserta : [];
  const targets = Array.isArray(admin.targets) ? admin.targets : [];
  const current = Number(peserta.currentRonde) || 1;

  // Kunci ronde: undian ganda (dua perangkat menekan SPIN / layar basi) ditolak.
  if (Number(ronde) !== current) {
    return { status: 409, error: `Ronde ${ronde} sudah diundi. Data dimuat ulang ke Ronde ${current}.`, currentRonde: current };
  }

  let adminChanged = syncTargetCache(targets, prizes);
  adminChanged = releaseStranded(targets, prizes, current) || adminChanged;

  const active = dataPeserta.filter(p => p.status === STATUS_ACTIVE);
  if (!active.length) return { status: 400, error: 'Tidak ada peserta aktif yang belum diundi.' };

  const rules = roundRules(prizes, current);
  const cats = categoryIndex(dataPeserta);
  const blocked = blockedIds(dataPeserta, targets);
  const pool = active.filter(p => !blocked.has(p.id));
  const roundTargets = targets.filter(t => t.status === TARGET_PENDING && effectiveRonde(t, prizes) === current);
  const targetStates = roundTargets.map(t => ({ target: t, remaining: [...(t.targets || [])] }));

  const totalCount = rules.reduce((sum, r) => sum + r.count, 0);
  const reachable = new Set(pool.map(p => p.id));
  roundTargets.forEach(t => (t.targets || []).forEach(id => { if (active.some(p => p.id === id)) reachable.add(id); }));
  if (totalCount > reachable.size) {
    return { status: 400, error: `Peserta yang tersisa tidak cukup untuk ${totalCount} pemenang di Ronde ${current}.` };
  }

  const byId = new Map(dataPeserta.map(p => [p.id, p]));
  const winners = sortByPrize(fillRules(rules, { pool, targetStates, byId, cats, rand }), prizes);
  if (!winners.length) return { status: 400, error: 'Tidak ada peserta yang bisa diundi untuk ronde ini.' };

  // Nasib target: semua/sebagian keluar → Sudah Dieksekusi (sisa dilepas ke acak);
  // tak satu pun cocok → Terlewati. Dilaporkan HANYA di adm1ndev.
  for (const state of targetStates) {
    state.target.status = state.remaining.length < (state.target.targets || []).length ? TARGET_DONE : TARGET_SKIPPED;
    adminChanged = true;
  }

  const winnerIds = new Set(winners.map(w => w.id));
  dataPeserta.forEach(p => { if (winnerIds.has(p.id)) p.status = STATUS_WON; });

  peserta.hasilUndian = Array.isArray(peserta.hasilUndian) ? peserta.hasilUndian : [];
  let record = peserta.hasilUndian.find(r => r.Ronde_Ke === current);
  if (!record) {
    record = { Ronde_Ke: current, Cluster_Diundi: 'Semua' };
    peserta.hasilUndian.push(record);
  }
  record.Waktu_Pengundian = String(waktu || new Date().toISOString()).slice(0, 80);
  record.Hadiah = uniqueNames(prizes.filter(p => (parseInt(p.ronde, 10) || 1) === current).map(p => p.name)).join(', ') || 'Hadiah Spesial';
  setRecordWinners(record, winners);
  peserta.currentRonde = current + 1;

  return {
    winners,
    record,
    currentRonde: peserta.currentRonde,
    notices: shortageNotices(rules, active, cats),
    adminChanged
  };
}

/**
 * Gugurkan pemenang ronde TERAKHIR & undi penggantinya (hadiah diwarisi). Target
 * tak dipakai untuk pengganti. Mengembalikan { winners (daftar lengkap), replacements,
 * record } atau { status, error }.
 */
function drawReplacements({ peserta, settings, admin, ronde, victimIds, rand = Math.random }) {
  const prizes = Array.isArray(settings.prizes) ? settings.prizes : [];
  const dataPeserta = Array.isArray(peserta.dataPeserta) ? peserta.dataPeserta : [];
  const targets = Array.isArray(admin.targets) ? admin.targets : [];
  const lastRonde = (Number(peserta.currentRonde) || 1) - 1;

  if (Number(ronde) !== lastRonde) {
    return { status: 409, error: 'Hanya pemenang ronde terakhir yang bisa digugurkan.' };
  }
  const record = (peserta.hasilUndian || []).find(r => r.Ronde_Ke === lastRonde);
  if (!record || !Array.isArray(record.pemenang)) {
    return { status: 400, error: 'Data ronde ini tidak mendukung undi ulang.' };
  }
  const wanted = new Set((Array.isArray(victimIds) ? victimIds : []).map(String));
  const victims = record.pemenang.filter(w => wanted.has(String(w.id)));
  if (!victims.length) return { status: 400, error: 'Pemenang yang digugurkan tidak ditemukan.' };

  const victimSet = new Set(victims.map(v => v.id));
  dataPeserta.forEach(p => { if (victimSet.has(p.id)) p.status = STATUS_DQ; });

  // Aturan pengganti = hadiah milik pemenang gugur (kategori hadiah ikut berlaku).
  const rules = victims.map(v => {
    const prize = findPrize(prizes, v.prizeId) ||
      prizes.find(p => p && (parseInt(p.ronde, 10) || 1) === lastRonde && norm(p.name) === norm(v.hadiah)) || null;
    return {
      prizeId: v.prizeId || (prize && prize.id) || null,
      prizeName: v.hadiah || (prize && String(prize.name || '').trim()) || '',
      jenis: (prize && prize.jenis) || 'Semua',
      grup: (prize && prize.grup) || 'Semua',
      kelompok: (prize && prize.kelompok) || 'Semua',
      count: 1
    };
  });

  const blocked = blockedIds(dataPeserta, targets);
  const pool = dataPeserta.filter(p => p.status === STATUS_ACTIVE && !blocked.has(p.id));
  const cats = categoryIndex(dataPeserta);
  const replacements = fillRules(rules, { pool, targetStates: [], byId: new Map(), cats, rand });

  const replacementIds = new Set(replacements.map(w => w.id));
  dataPeserta.forEach(p => { if (replacementIds.has(p.id)) p.status = STATUS_WON; });

  const winners = sortByPrize(record.pemenang.filter(w => !victimSet.has(w.id)).concat(replacements), prizes);
  setRecordWinners(record, winners);
  return { winners: record.pemenang, replacements, record };
}

// Reset undian: generasi baru (rev) yang otoritatif + semua target kembali menunggu.
function resetDraw({ peserta, admin }) {
  peserta.rev = (Number(peserta.rev) || 0) + 1;
  peserta.hasilUndian = [];
  peserta.currentRonde = 1;
  (peserta.dataPeserta || []).forEach(p => { p.status = STATUS_ACTIVE; });
  (admin.targets || []).forEach(t => { t.status = TARGET_PENDING; });
}

module.exports = { drawRound, drawReplacements, resetDraw, syncTargetCache };
