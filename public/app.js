// --- BEGIN SAFE ELEMENT PATCH ---
const _origGetId = document.getElementById;
document.getElementById = function(id) {
  const el = _origGetId.call(document, id);
  if (!el) {
    return {
      isDummy: true,
      addEventListener: function(){},
      classList: { add: function(){}, remove: function(){}, contains: function(){return false;} },
      style: {},
      dataset: {},
      value: '',
      innerHTML: '',
      textContent: '',
      className: '',
      src: '',
      focus: function(){},
      click: function(){},
      appendChild: function(){},
      removeChild: function(){}
    };
  }
  return el;
};
// --- END SAFE ELEMENT PATCH ---

function isDom(el) {
  return !!(el && el.nodeType === 1 && !el.isDummy);
}

function finishHydrate() {
  document.body.classList.remove('is-hydrating');
}

async function handleLogout() {
  const ok = await showCustomConfirm(
    'Keluar',
    'Keluar dari sesi operator? Dashboard dan pengaturan akan membutuhkan login lagi.',
    'Keluar',
    'Batal'
  );
  if (!ok) return;
  window.location.href = '/logout';
}

/* ============================================================
   DORPRIZE â€” Aplikasi Undian Digital Profesional
   Core Application Logic
   ============================================================ */

// ===================== APP STATE =====================
const APP = {
  workbook: null,
  dataPeserta: [],
  hasilUndian: [],
  currentRonde: 1,
  rev: 0,
  currentCluster: 'Semua',
  isSpinning: false,
  lastWinners: [],
  settings: {
    eventTitle: 'DOORPRIZE',
    eventSubtitle: 'Aplikasi Undian Digital',
    logoUrl: null,
    theme: 'komando',
    customColors: { primary: '#2563EB', secondary: '#7C3AED', accent: '#F59E0B' },
    prizes: []
  }
};

// Admin stored under innocuous key
const ADMIN_STORAGE_KEY = '_sys_pref_cache';
const LEGACY_SETTINGS_STORAGE_KEY = 'dorprize_settings';
const HISTORY_STORAGE_KEY = 'dorprize_history';

// ===================== THEME PRESETS =====================
const THEME_PRESETS = {
  komando: {
    primary: '#DC2626', primaryLight: '#F04444', primaryDark: '#B01B1B', primaryRgb: '220, 38, 38',
    secondary: '#7F1D1D', secondaryLight: '#991B1B', secondaryRgb: '127, 29, 29',
    accent: '#F97316', accentLight: '#FB923C', accentRgb: '249, 115, 22',
    bg: '#0A0E15', bgSecondary: '#0F141D', surface: '#111826',
    text: '#E9EEF6', textSecondary: '#B3C1D1', textMuted: '#7F93A8',
    border: '#1F2A3A', borderLight: '#2A3749'
  },
  professional_blue: {
    primary: '#2563EB', primaryLight: '#3B82F6', primaryDark: '#1D4ED8', primaryRgb: '37, 99, 235',
    secondary: '#7C3AED', secondaryLight: '#8B5CF6', secondaryRgb: '124, 58, 237',
    accent: '#F59E0B', accentLight: '#FBBF24', accentRgb: '245, 158, 11',
    bg: '#F8FAFC', bgSecondary: '#F1F5F9', surface: '#FFFFFF',
    text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
    border: '#E2E8F0', borderLight: '#F1F5F9'
  },
  gala_gold: {
    primary: '#D97706', primaryLight: '#F59E0B', primaryDark: '#B45309', primaryRgb: '217, 119, 6',
    secondary: '#111827', secondaryLight: '#1F2937', secondaryRgb: '17, 24, 39',
    accent: '#FCD34D', accentLight: '#FDE68A', accentRgb: '252, 211, 77',
    bg: '#0F0F1A', bgSecondary: '#1A1A2E', surface: '#16162B',
    text: '#FCD34D', textSecondary: '#D97706', textMuted: '#9CA3AF',
    border: '#374151', borderLight: '#1F2937'
  },
  festive_red: {
    primary: '#DC2626', primaryLight: '#EF4444', primaryDark: '#B91C1C', primaryRgb: '220, 38, 38',
    secondary: '#991B1B', secondaryLight: '#B91C1C', secondaryRgb: '153, 27, 27',
    accent: '#FBBF24', accentLight: '#FDE047', accentRgb: '251, 191, 36',
    bg: '#FEF2F2', bgSecondary: '#FEE2E2', surface: '#FFFFFF',
    text: '#1F2937', textSecondary: '#6B7280', textMuted: '#9CA3AF',
    border: '#FECACA', borderLight: '#FEE2E2'
  },
  nature_green: {
    primary: '#059669', primaryLight: '#10B981', primaryDark: '#047857', primaryRgb: '5, 150, 105',
    secondary: '#047857', secondaryLight: '#059669', secondaryRgb: '4, 120, 87',
    accent: '#34D399', accentLight: '#6EE7B7', accentRgb: '52, 211, 153',
    bg: '#F0FDF4', bgSecondary: '#DCFCE7', surface: '#FFFFFF',
    text: '#14532D', textSecondary: '#166534', textMuted: '#6B7280',
    border: '#BBF7D0', borderLight: '#DCFCE7'
  },
  royal_purple: {
    primary: '#7C3AED', primaryLight: '#8B5CF6', primaryDark: '#6D28D9', primaryRgb: '124, 58, 237',
    secondary: '#4C1D95', secondaryLight: '#5B21B6', secondaryRgb: '76, 29, 149',
    accent: '#F472B6', accentLight: '#F472B6', accentRgb: '244, 114, 182',
    bg: '#F5F3FF', bgSecondary: '#EDE9FE', surface: '#FFFFFF',
    text: '#1E1B4B', textSecondary: '#4338CA', textMuted: '#7C72B8',
    border: '#C4B5FD', borderLight: '#EDE9FE'
  },
  sunset_orange: {
    primary: '#EA580C', primaryLight: '#F97316', primaryDark: '#C2410C', primaryRgb: '234, 88, 12',
    secondary: '#C2410C', secondaryLight: '#EA580C', secondaryRgb: '194, 65, 12',
    accent: '#FBBF24', accentLight: '#FDE047', accentRgb: '251, 191, 36',
    bg: '#FFF7ED', bgSecondary: '#FFEDD5', surface: '#FFFFFF',
    text: '#431407', textSecondary: '#7C2D12', textMuted: '#9A3412',
    border: '#FED7AA', borderLight: '#FFEDD5'
  },
  midnight_dark: {
    primary: '#38BDF8', primaryLight: '#7DD3FC', primaryDark: '#0284C7', primaryRgb: '56, 189, 248',
    secondary: '#818CF8', secondaryLight: '#A5B4FC', secondaryRgb: '129, 140, 248',
    accent: '#F472B6', accentLight: '#F472B6', accentRgb: '244, 114, 182',
    bg: '#0F172A', bgSecondary: '#1E293B', surface: '#1E293B',
    text: '#F8FAFC', textSecondary: '#94A3B8', textMuted: '#64748B',
    border: '#334155', borderLight: '#1E293B'
  }
};;

// ===================== STAGE SCALER (Layout Fase 0) =====================
// Dashboard hidup di dalam #stage berukuran desain tetap 1920x1080. Kita hanya
// men-scale-nya (bukan reflow) agar tampil identik & konsisten di layar apa pun.
// Hanya berlaku di halaman dashboard; di halaman lain #stage tak ada (no-op).
const STAGE_W = 1920;
const STAGE_H = 1080;
function fitStage() {
  const stage = document.getElementById('stage');
  if (!stage || stage.isDummy) return;
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Mode LAYAR PENUH PROYEKTOR (Layout Fase 4). Hanya di dashboard (tombol #fullscreenBtn).
// Panggung sudah auto-skala via fitStage(); fullscreen membuatnya mengisi layar proyektor
// tanpa chrome browser. Pintasan 'F' juga tersedia (diabaikan saat mengetik di input).
function initFullscreenToggle() {
  const btn = document.getElementById('fullscreenBtn');
  if (!btn || btn.isDummy) return;

  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const enter = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) { try { req.call(el); } catch (e) { /* diblokir browser */ } }
  };
  const exit = () => {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex) { try { ex.call(document); } catch (e) { /* ignore */ } }
  };
  const toggle = () => { isFs() ? exit() : enter(); };

  btn.addEventListener('click', toggle);

  const sync = () => {
    document.body.classList.toggle('is-fullscreen', isFs());
    fitStage(); // sebagian browser tak memicu 'resize' saat masuk/keluar fullscreen
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    e.preventDefault();
    toggle();
  });
}
window.initFullscreenToggle = initFullscreenToggle;

// ===================== LAYOUT ENGINE (Layout Fase 1) =====================
// Item panggung yang bisa ditata + urutan tumpuk (z) default.
const STAGE_ITEM_IDS = ['logo', 'title', 'subtitle', 'stats', 'prize', 'slot', 'controls', 'footer'];
const STAGE_ITEM_Z = { footer: 5, prize: 10, slot: 10, title: 20, subtitle: 20, stats: 25, controls: 25, logo: 30 };

// Snapshot posisi elemen SAAT INI (mode flex) menjadi layout ternormalisasi
// (fraksi 0..1 terhadap #stage). Karena mengukur DOM nyata, menerapkan hasilnya
// mereproduksi tampilan sekarang secara persis — jadi titik awal editor (Fase 2).
function buildDefaultLayout() {
  const stage = document.getElementById('stage');
  const items = {};
  if (stage && !stage.isDummy && typeof stage.getBoundingClientRect === 'function') {
    const sr = stage.getBoundingClientRect();
    if (sr.width > 0 && sr.height > 0) {
      STAGE_ITEM_IDS.forEach((id) => {
        const el = document.querySelector(`[data-stage-item="${id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        items[id] = {
          x: (r.left - sr.left) / sr.width,
          y: (r.top - sr.top) / sr.height,
          w: r.width / sr.width,
          h: r.height / sr.height,
          rot: 0,
          opacity: 1,
          z: STAGE_ITEM_Z[id] || 10,
          visible: true
        };
      });
    }
  }
  return { version: 2, stage: { w: STAGE_W, h: STAGE_H }, items };
}

// Skalakan font sebuah elemen teks agar MENGISI kotaknya di mode kanvas. Metode:
// ukur lebar/tinggi teks 1 baris pada font ACUAN (100px) lalu skala linear ke kotak
// → ukuran = min(muat-lebar, muat-tinggi). Pengukuran dilakukan di konteks BLOK
// netral (display:block; white-space:nowrap; overflow:visible) karena scrollWidth/
// Height pada elemen flex + overflow:hidden TAK ANDAL (itu bikin versi lama menciut
// jadi tak terlihat). Semua diukur di koordinat stage 1920x1080 → konsisten lintas
// layar. Font di-set inline !important (menang atas CSS dasar); applyLayout() akan
// menghapus font-size/line-height lagi (MANAGED) saat balik ke mode flex.
function fitTextToBox(el) {
  if (!el || el.isDummy) return;
  const boxW = el.clientWidth, boxH = el.clientHeight;
  if (boxW < 6 || boxH < 6) { el.style.removeProperty('font-size'); el.style.removeProperty('line-height'); return; }
  const REF = 100;
  el.style.setProperty('line-height', '1.05', 'important');
  el.style.setProperty('display', 'block', 'important');
  el.style.setProperty('white-space', 'nowrap', 'important');
  el.style.setProperty('overflow', 'visible', 'important');
  el.style.setProperty('font-size', REF + 'px', 'important');
  const textW = el.scrollWidth, textH = el.scrollHeight;
  // Kembalikan properti tata letak yang dikelola CSS (flex + clip).
  el.style.removeProperty('display');
  el.style.removeProperty('white-space');
  el.style.removeProperty('overflow');
  if (!(textW > 0) || !(textH > 0)) { el.style.removeProperty('font-size'); return; }
  let size = 0.96 * Math.min(REF * boxW / textW, REF * boxH / textH);
  if (!isFinite(size)) { el.style.removeProperty('font-size'); return; }
  size = Math.max(8, Math.min(size, boxH));
  el.style.setProperty('font-size', size + 'px', 'important');
}

// Render layout ke #stage. null/kosong → mode flex bawaan (tampilan lama, nol
// regresi). Ada items → mode kanvas: tiap item diposisikan absolut (% dari stage).
function applyLayout(layout) {
  const stage = document.getElementById('stage');
  if (!stage || stage.isDummy) return;

  // Properti yang kita kelola per item. removeProperty() menghapus juga deklarasi
  // ber-!important yang kita set, agar bersih total saat balik ke mode flex.
  // min/max-width/height ikut dikelola: beberapa item punya batas ukuran di CSS
  // dasar (mis. .slot-machine-frame: max-width:1840/max-height:900) yang, tanpa
  // dinetralkan, MENGKLEM width/height tata letak (max-* selalu membatasi ukuran
  // terpakai, tak peduli !important) → kotak jadi lebih kecil/geser dari yang diatur.
  const MANAGED = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin', 'opacity', 'z-index', 'transform', 'display', 'font-size', 'line-height'];
  const clear = (el) => { MANAGED.forEach((p) => el.style.removeProperty(p)); };

  const hasItems = layout && layout.items && typeof layout.items === 'object' && Object.keys(layout.items).length > 0;
  if (!hasItems) {
    stage.classList.remove('stage-custom');
    STAGE_ITEM_IDS.forEach((id) => {
      const el = document.querySelector(`[data-stage-item="${id}"]`);
      if (el && !el.isDummy) clear(el);
    });
    return;
  }

  stage.classList.add('stage-custom');
  // Geometri dipasang dalam PIKSEL pada ruang koordinat stage tetap (SW x SH),
  // yang kemudian di-skala via transform pada .stage-custom. TIDAK boleh pakai %:
  // untuk item ber-position:absolute, height:% hanya resolve bila containing block
  // punya tinggi eksplisit. Item di dalam <header> (logo/title/subtitle/stats)
  // containing block-nya = header (mis. 95px), bukan stage → height:% & top:% ciut
  // → judul/subjudul/logo tampak super kecil (fitTextToBox lalu jatuh ke font 8px).
  // Piksel dalam ruang stage tak bergantung tinggi parent → konsisten utk semua item.
  const SW = (layout.stage && layout.stage.w) || STAGE_W;
  const SH = (layout.stage && layout.stage.h) || STAGE_H;
  STAGE_ITEM_IDS.forEach((id) => {
    const el = document.querySelector(`[data-stage-item="${id}"]`);
    if (!el || el.isDummy) return;
    const it = layout.items[id];
    if (!it || it.visible === false) {
      el.style.setProperty('display', 'none', 'important');
      return;
    }
    // Set geometri dengan prioritas 'important' + reset right/bottom. Beberapa item
    // punya aturan dasar ber-!important (mis. .header-right/stats: position/right/
    // bottom/top/width !important) yang, tanpa ini, membuat item MENGABAIKAN tata
    // letak (inline biasa kalah dari CSS !important; inline !important menang).
    // 'display' dibiarkan (dihapus) agar tiap item pakai display alaminya (flex dll).
    el.style.removeProperty('display');
    const set = (p, v) => el.style.setProperty(p, v, 'important');
    set('position', 'absolute');
    set('margin', '0');
    set('left', (it.x * SW) + 'px');
    set('top', (it.y * SH) + 'px');
    set('right', 'auto');
    set('bottom', 'auto');
    set('width', (it.w * SW) + 'px');
    // Judul & sub-judul di DASHBOARD (punya __fitTitles): BANNER TINGGI FLEKSIBEL — tinggi kotak jadi
    // MINIMUM & banner TUMBUH mengikuti teks (maks 2 baris) sehingga kalimat panjang TAK TERPOTONG.
    // Ukuran font dari slider Setting (via __fitTitles), BUKAN isi-kotak (fitTextToBox) → slider Ukuran
    // Judul/Sub-judul kini BERFUNGSI. Halaman lain (tanpa __fitTitles): perilaku lama (isi-kotak).
    var useSlider = (id === 'title' || id === 'subtitle') && typeof window.__fitTitles === 'function';
    if (useSlider) set('height', 'auto'); else set('height', (it.h * SH) + 'px');
    // Netralkan batas ukuran CSS dasar agar kotak PERSIS seukuran yang diatur
    // (kalau tidak, max-width/height mengklem & item tampak lebih kecil/meleset).
    set('min-width', '0');
    set('min-height', useSlider ? ((it.h * SH) + 'px') : '0');
    set('max-width', 'none');
    set('max-height', 'none');
    set('opacity', String(it.opacity != null ? it.opacity : 1));
    set('z-index', String(it.z != null ? it.z : 10));
    set('transform', it.rot ? `rotate(${it.rot}deg)` : 'none');
    // Ukuran teks judul/sub-judul: __fitTitles (slider + wrap maks 2 baris) di dashboard; fitTextToBox (isi-kotak) di halaman lain.
    if (id === 'title' || id === 'subtitle') { if (useSlider) window.__fitTitles(); else fitTextToBox(el); }
  });
}
window.applyLayout = applyLayout;
window.buildDefaultLayout = buildDefaultLayout;

// ===================== LAYOUT EDITOR WIRING (Layout Fase 2) =====================
// Menyalakan editor drag/resize di halaman Pengaturan. Editor bekerja pada SALINAN
// KERJA (working copy) sendiri; hasil edit baru masuk ke APP.settings.layout saat
// operator menekan "Simpan Tata Letak" → saveSettings() → tersinkron ke semua layar.
// Sinkron 2 detik boleh memperbarui APP.settings di latar tanpa mengganggu editing.
function getLayoutEditorContent() {
  const titleInput = document.getElementById('inputEventTitle');
  const subInput = document.getElementById('inputEventSubtitle');
  return {
    logoUrl: APP.settings.logoUrl || null,
    title: (titleInput && titleInput.value.trim()) || APP.settings.eventTitle || 'JUDUL ACARA',
    subtitle: (subInput && subInput.value.trim()) || APP.settings.eventSubtitle || 'Sub-judul',
    footer: APP.settings.footerText || 'Powered by Satsiber Kopassus'
  };
}

function initLayoutEditor() {
  const root = document.getElementById('layoutEditorRoot');
  if (!root || root.isDummy) return;
  if (APP.layoutEditor || typeof window.LayoutEditor !== 'function') return;

  APP.layoutEditor = new window.LayoutEditor(root, {
    getContent: getLayoutEditorContent,
    onSave: (layout) => {
      APP.settings.layout = layout;
      saveSettings();
      showToast('Tata letak panggung disimpan & disinkronkan ke semua layar.', 'success');
    },
    onUseDefault: () => {
      APP.settings.layout = null;
      saveSettings();
      if (APP.layoutEditor) APP.layoutEditor.setLayout(null);
      showToast('Tata letak dikembalikan ke bawaan (mode fleksibel).', 'success');
    },
    onNotify: (type, msg) => showToast(msg, type)
  });

  // Muat layout tersimpan (null → editor pakai pratinjau bawaannya sebagai titik awal).
  APP.layoutEditor.setLayout(APP.settings.layout || null);
}
window.initLayoutEditor = initLayoutEditor;

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', async () => {
  const hydrateTimer = setTimeout(finishHydrate, 8000);
  try {
  loadSettings();
  loadAdminSettings();
  checkRemoteAccess();
  bindEvents();

  // Skala panggung ke ukuran layar sekarang, dan setiap kali ukuran berubah.
  fitStage();
  window.addEventListener('resize', fitStage);
  initFullscreenToggle();

  // Ambil state utuh dari server pada saat startup SEBELUM populasi form
  await syncFullStateFromRemote();
  
  // Jika ini halaman pengaturan, populasi data input settings dengan nilai dari server
  const inputTitle = document.getElementById('inputEventTitle');
  if (inputTitle && !inputTitle.isDummy) {
    openSettingsModal();
    initLayoutEditor();
    // Indikator dirty (HUD Setting Fase 3): tandai "belum disimpan" saat ada perubahan input.
    const _scont = document.querySelector('.settings-container');
    if (_scont) {
      const _mark = () => setSettingsDirty(true);
      _scont.addEventListener('input', _mark);
      _scont.addEventListener('change', _mark);
    }
    setSettingsDirty(false);
  }

  // Jika ini halaman admin: bila sesi MASIH ter-unlock (cookie 24 jam) — mis. halaman
  // ter-reload sendiri / tab HP di-discard lalu dibuka lagi — langsung buka panel,
  // JANGAN paksa login ulang (ini yang bikin "selalu kembali ke login"). GET /api/admin
  // balas 200 bila unlocked, 403 bila terkunci.
  const adminRondeInput = document.getElementById('adminRonde');
  if (adminRondeInput && !adminRondeInput.isDummy) {
    fetch('/api/admin', { headers: { 'Accept': 'application/json' } })
      .then(r => {
        if (r.ok) {
          const lb = document.getElementById('adminLoginModal');
          if (lb) lb.style.display = 'none';
          openAdminPanel();
        } else {
          openAdminLogin();
        }
      })
      .catch(() => openAdminLogin());
  }
  
  updateUI();
  
  // Start 2-second background live sync for all connected devices
  startLiveSync();
  } finally {
    clearTimeout(hydrateTimer);
    finishHydrate();
  }
});

APP.lastSyncTs = 0;

function normalizeClientSettings(settings = {}) {
  const normalized = { ...settings };

  // Compatibility with old data while ensuring Base64 is never persisted again.
  if (!normalized.logoUrl && typeof normalized.logoBase64 === 'string' && normalized.logoBase64.startsWith('/uploads/')) {
    normalized.logoUrl = normalized.logoBase64;
  }
  if (!normalized.bgUrl && typeof normalized.bgBase64 === 'string' && normalized.bgBase64.startsWith('/uploads/')) {
    normalized.bgUrl = normalized.bgBase64;
  }
  if (!normalized.winnerBgUrl && typeof normalized.winnerBgBase64 === 'string' && normalized.winnerBgBase64.startsWith('/uploads/')) {
    normalized.winnerBgUrl = normalized.winnerBgBase64;
  }

  delete normalized.logoBase64;
  delete normalized.bgBase64;
  delete normalized.winnerBgBase64;

  normalized.prizes = Array.isArray(normalized.prizes)
    ? normalized.prizes.map((prize) => {
        const cleanPrize = { ...prize };
        if (!cleanPrize.imageUrl && typeof cleanPrize.imageBase64 === 'string' && cleanPrize.imageBase64.startsWith('/uploads/')) {
          cleanPrize.imageUrl = cleanPrize.imageBase64;
        }
        delete cleanPrize.imageBase64;
        return cleanPrize;
      })
    : [];

  return normalized;
}

function loadSettings() {
  // Remove the legacy cache once. Settings now come from the server API.
  try {
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
  } catch (e) { /* ignore */ }

  APP.settings = normalizeClientSettings(APP.settings);
  applyTheme(APP.settings.theme);
  applyEventSettings();
}

function saveSettings() {
  APP.settings = normalizeClientSettings(APP.settings);

  const ts = Date.now();
  APP.lastSyncTs = ts;

  if (window.location.protocol === 'file:') return;

  const payload = {
    settings: APP.settings,
    peserta: {
      dataPeserta: APP.dataPeserta || [],
      availableClusters: APP.availableClusters || [],
      hasilUndian: APP.hasilUndian || [],
      currentRonde: APP.currentRonde || 1,
      rev: APP.rev || 0
    },
    admin: {
      targets: APP.adminTargets || []
    }
  };

  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch((error) => console.warn('State sync POST error:', error.message));
}

function loadAdminSettings() {
  // Password admin TIDAK lagi dikelola/disimpan di klien — verifikasi kini
  // sepenuhnya di server (POST /api/admin/unlock). Klien hanya memegang targets.
  try {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(atob(saved));
      APP.adminTargets = parsed.targets || [];
    } else {
      APP.adminTargets = [];
    }
  } catch (e) {
    APP.adminTargets = [];
  }
}

// Simpan KONFIGURASI target penuh (tambah/ubah/hapus). Hanya berhasil dari
// halaman adm1n yang sudah unlock (server meng-gate POST /api/admin dengan
// requireAdminUnlocked). Dari halaman lain, POST akan 403 dan diabaikan.
function saveAdminSettings() {
  APP.lastAdminSaveTime = Date.now();
  const ts = Date.now();
  APP.lastSyncTs = ts;

  const payload = { targets: APP.adminTargets };

  const data = btoa(JSON.stringify(payload));
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, data);
  } catch (e) {
    console.warn('LocalStorage admin quota exceeded:', e);
  }

  // Sync to remote server if possible
  if (window.location.protocol !== 'file:') {
    fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.log('Remote admin sync error'));

    // Also push unified state
    saveSettings();
  }
}

// Simpan HANYA status target (dipanggil dari layar undian saat spin/reset).
// Endpoint /api/admin/status tidak butuh unlock dan hanya menyalin status ke
// target yang sudah ada — operator tak bisa merekayasa target lewat sini.
function saveAdminStatus() {
  if (window.location.protocol === 'file:') return;
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, btoa(JSON.stringify({ targets: APP.adminTargets })));
  } catch (e) { /* ignore */ }
  fetch('/api/admin/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets: APP.adminTargets })
  }).catch(e => console.log('Admin status sync error'));
}

async function syncStateWithServer() {
  if (window.location.protocol === 'file:') return;
  if (APP.isSpinning) return; // Do not interrupt rolling animation

  try {
    const res = await fetch(`/api/state?ts=${APP.lastSyncTs || 0}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    if (data.changed === false) {
      if (data.timestamp) APP.lastSyncTs = data.timestamp;
      return;
    }

    const serverTs = data.timestamp || 0;
    APP.lastSyncTs = serverTs;

    // 1. Sync Settings
    if (data.settings && data.settings.eventTitle !== undefined) {
      APP.settings = normalizeClientSettings({ ...APP.settings, ...data.settings });
      applyTheme(APP.settings.theme);
      applyEventSettings();

      // Jika halaman pengaturan sedang dibuka, perbarui nilai-nilai input form agar tidak tertimpa default
      const inputTitle = document.getElementById('inputEventTitle');
      if (inputTitle && !inputTitle.isDummy) {
        openSettingsModal();
      }
    }

    // 2. Sync Peserta & Winners
    if (data.peserta) {
      // GENERASI (rev): rev server lebih tinggi = Reset Undian / state otoritatif →
      // adopsi penuh (boleh mundur). rev sama = pertahankan guard anti-mundur di bawah.
      const serverRev = Number(data.peserta.rev) || 0;
      const isNewerGen = serverRev > (Number(APP.rev) || 0);
      if (serverRev >= (Number(APP.rev) || 0)) APP.rev = serverRev;

      if (data.peserta.dataPeserta && (data.peserta.dataPeserta.length > 0 || (APP.dataPeserta || []).length === 0)) {
        APP.dataPeserta = data.peserta.dataPeserta;
        computeUniqueCategories(false);
      }
      if (data.peserta.availableClusters && data.peserta.availableClusters.length > 0) {
        APP.availableClusters = data.peserta.availableClusters;
      }
      // ANTI-DUPLIKASI RONDE: terima hasilUndian jika generasi lebih baru (reset) atau lebih lengkap
      if (data.peserta.hasilUndian) {
        const serverLen = data.peserta.hasilUndian.length;
        const localLen = (APP.hasilUndian || []).length;
        if (isNewerGen || serverLen >= localLen) {
          APP.hasilUndian = data.peserta.hasilUndian;
        }
      }
      // ANTI-DUPLIKASI RONDE: jangan mundurkan currentRonde KECUALI generasi lebih baru (reset)
      if (data.peserta.currentRonde !== undefined) {
        const serverRonde = data.peserta.currentRonde;
        if (isNewerGen || serverRonde >= APP.currentRonde) {
          APP.currentRonde = serverRonde;
        }
      }
    }

    // 3. Sync Admin Targets & Password
    if (data.admin) {
      if (data.admin.targets) APP.adminTargets = data.admin.targets;

      const localData = btoa(JSON.stringify(data.admin));
      try {
        localStorage.setItem(ADMIN_STORAGE_KEY, localData);
      } catch (e) {
        console.warn('Sync admin: LocalStorage quota exceeded:', e);
      }
    }

    // Selaraskan ronde efektif target dengan hadiah terkini (mis. operator memindah
    // ronde sebuah hadiah dari perangkat lain) SEBELUM merender apa pun.
    syncTargetRounds();

    // 4. Update UI Components
    updateUI();
    if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();
    if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();
    // Anti-KEDIP panel admin: sinkron 2s sering ber-"changed" untuk hal lain (mis.
    // peserta/undian). Bangun-ulang tabel & dropdown HANYA bila data admin-nya benar
    // berubah → hilangkan kedip & jaga pilihan/scroll operator saat mengonfigurasi.
    const _adminSig = JSON.stringify({
      t: APP.adminTargets,
      r: APP.currentRonde,
      p: (APP.settings.prizes || []).map(p => [p && p.id, p && p.name, p && p.ronde, p && p.count, p && p.jenis, p && p.grup, p && p.kelompok]),
      h: (APP.hasilUndian || []).length
    });
    if (_adminSig !== APP._lastAdminRenderSig) {
      APP._lastAdminRenderSig = _adminSig;
      if (typeof refreshAdminTable === 'function') refreshAdminTable();
      if (typeof populateAdminPrizeSelect === 'function' && document.getElementById('adminPrize')) populateAdminPrizeSelect();
    }
    if (typeof renderPrizeSettings === 'function') renderPrizeSettings();
  } catch (e) {
    // Ignore network drop
  }
}

function syncPesertaDataToServer() {
  saveSettings();
}

function startLiveSync() {
  syncStateWithServer();
  setInterval(syncStateWithServer, 2000);
}

async function syncFullStateFromRemote() {
  if (window.location.protocol === 'file:') return;
  try {
    const res = await fetch('/api/state?ts=0');
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    if (data.timestamp) APP.lastSyncTs = data.timestamp;

    if (data.settings && typeof data.settings === 'object') {
      APP.settings = normalizeClientSettings({ ...APP.settings, ...data.settings });
      applyTheme(APP.settings.theme);
      applyEventSettings();
    }

    if (data.peserta) {
      if (data.peserta.rev !== undefined) APP.rev = Number(data.peserta.rev) || 0;
      if (data.peserta.dataPeserta) {
        APP.dataPeserta = data.peserta.dataPeserta;
        computeUniqueCategories(false);
      }
      if (data.peserta.availableClusters) APP.availableClusters = data.peserta.availableClusters;
      if (data.peserta.hasilUndian) APP.hasilUndian = data.peserta.hasilUndian;
      if (data.peserta.currentRonde !== undefined) APP.currentRonde = data.peserta.currentRonde;
      
      if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();
      if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();
      
      // Sync cluster selects on setting/dashboard page
      document.querySelectorAll('.cluster-select').forEach(select => {
        const val = select.value;
        select.innerHTML = '<option value="Semua">Semua Cluster</option>';
        APP.availableClusters.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          select.appendChild(opt);
        });
        select.value = val || 'Semua';
      });
    }

    if (data.admin) {
      if (data.admin.targets) APP.adminTargets = data.admin.targets;
    }

    // Ronde efektif target mengikuti hadiah terkini setelah state utuh dimuat.
    syncTargetRounds();
  } catch (e) {
    console.warn('syncFullStateFromRemote error:', e.message);
  }
}

function checkRemoteAccess() {
  const params = new URLSearchParams(window.location.search);
  const isRemote = params.has('rc');

  // Detect and store the remote URL
  if (window.location.protocol !== 'file:') {
    const remoteUrl = `${window.location.origin}${window.location.pathname}?rc=true`;
    APP.remoteUrl = remoteUrl;
  }

  if (isRemote) {
    // Remote admin mode: go directly to admin login
    APP.isRemoteMode = true;
    setTimeout(() => openAdminLogin(), 500);
  }
}

// ===================== THEME MANAGER =====================
function applyTheme(themeKey) {
  const root = document.documentElement;
  let colors;

  if (themeKey === 'custom') {
    colors = {
      primary: APP.settings.customColors.primary,
      primaryLight: lightenColor(APP.settings.customColors.primary, 15),
      primaryDark: darkenColor(APP.settings.customColors.primary, 15),
      primaryRgb: hexToRgb(APP.settings.customColors.primary),
      secondary: APP.settings.customColors.secondary,
      secondaryLight: lightenColor(APP.settings.customColors.secondary, 15),
      secondaryRgb: hexToRgb(APP.settings.customColors.secondary),
      accent: APP.settings.customColors.accent,
      accentLight: lightenColor(APP.settings.customColors.accent, 15),
      accentRgb: hexToRgb(APP.settings.customColors.accent),
      bg: '#F8FAFC', bgSecondary: '#F1F5F9', surface: '#FFFFFF',
      text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
      border: '#E2E8F0', borderLight: '#F1F5F9'
    };
  } else {
    colors = THEME_PRESETS[themeKey] || THEME_PRESETS.komando;
  }

  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-primary-rgb', colors.primaryRgb);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-secondary-light', colors.secondaryLight);
  root.style.setProperty('--color-secondary-rgb', colors.secondaryRgb);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-light', colors.accentLight);
  root.style.setProperty('--color-accent-rgb', colors.accentRgb);
  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-border-light', colors.borderLight);

  // Sinyal mode gelap/terang dari luminance latar tema → poles adaptif (judul & idle ala konsep [data-mode]).
  // UI-only: hanya set atribut; tidak menyentuh alur undian/reel (sengaja BUKAN body.dark-theme).
  const _bgHex = String(colors.bg || '#ffffff').replace('#', '');
  const _br = parseInt(_bgHex.substr(0, 2), 16), _bgc = parseInt(_bgHex.substr(2, 2), 16), _bb = parseInt(_bgHex.substr(4, 2), 16);
  const _isDark = ((0.2126 * (_br || 255) + 0.7152 * (_bgc || 255) + 0.0722 * (_bb || 255)) / 255) < 0.5;
  root.setAttribute('data-mode', _isDark ? 'dark' : 'light');
}

window.applyEventSettings = function() {
  const root = document.documentElement;
  
  const font = APP.settings.fontFamily || 'Outfit, sans-serif';
  const transform = APP.settings.textTransform || 'uppercase';
  const titleColor = APP.settings.titleColor || '#2563EB';
  const titleSize = (APP.settings.titleSize || 2.2) + 'rem';
  const subColor = APP.settings.subtitleColor || '#F59E0B';
  const subSize = (APP.settings.subtitleSize || 1.0) + 'rem';
  const logoShape = APP.settings.logoShape || 'rounded';
  const bgStyle = APP.settings.bgStyle || 'glass';
  const bgOpacity = APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.65;

  const prizeFont = APP.settings.prizeFontFamily || "'Outfit', sans-serif";
  const prizeTitleColor = APP.settings.prizeTitleColor || '#B91C1C';
  const reelNumColor = APP.settings.reelNumberColor || '#F8FAFC';
  const winnerNumColor = APP.settings.winnerNumberColor || '#FBBF24';

  root.style.setProperty('--font-event', font);
  root.style.setProperty('--text-transform-event', transform);
  root.style.setProperty('--title-color-event', titleColor);
  root.style.setProperty('--title-size-event', titleSize);
  root.style.setProperty('--subtitle-color-event', subColor);
  root.style.setProperty('--subtitle-size-event', subSize);

  // Brand-word HUD (dari settings.brandName; sembunyi bila kosong) — Fase 1
  const hudBrand = document.getElementById('hudBrand');
  const hudBrandName = document.getElementById('hudBrandName');
  if (hudBrand && hudBrandName) {
    const bn = (APP.settings.brandName || '').trim();
    hudBrandName.textContent = bn;
    hudBrand.style.display = bn ? 'flex' : 'none';
  }

  root.style.setProperty('--prize-font-family', prizeFont);
  root.style.setProperty('--prize-title-color', prizeTitleColor);
  root.style.setProperty('--reel-number-color', reelNumColor);
  root.style.setProperty('--winner-number-color', winnerNumColor);

  const titleEls = document.querySelectorAll('.event-title, .header-title, #eventTitleDisplay, #miniTitle');
  titleEls.forEach(el => {
    if (el) {
      if (APP.settings.eventTitle && el.id !== 'miniTitle') el.textContent = APP.settings.eventTitle;
      el.style.fontFamily = font;
      el.style.textTransform = transform;
      if (!el.classList.contains('event-title')) {
        el.style.color = titleColor;
        el.style.fontSize = titleSize;
      }
    }
  });

  const subEls = document.querySelectorAll('.event-subtitle, .header-subtitle, #eventSubtitleDisplay, #miniSubtitle');
  subEls.forEach(el => {
    if (el) {
      if (APP.settings.eventSubtitle && el.id !== 'miniSubtitle') el.textContent = APP.settings.eventSubtitle;
      el.style.fontFamily = font;
      el.style.textTransform = transform;
      if (!el.classList.contains('event-subtitle')) {
        el.style.color = subColor;
        el.style.fontSize = subSize;
      }
    }
  });

  const logoElements = document.querySelectorAll('#headerLogo, #customLogo, #logoPreview, .header-logo img');
  logoElements.forEach(el => {
    if (el) {
      el.className = el.className.replace(/logo-shape-\w+/g, '').trim();
      el.classList.add(`logo-shape-${logoShape}`);
    }
  });

  const defaultLogo = document.getElementById('headerLogo');
  const customLogo = document.getElementById('customLogo');

  if (APP.settings.logoUrl) {
    if (defaultLogo) defaultLogo.style.display = 'none';
    if (customLogo) {
      customLogo.src = APP.settings.logoUrl;
      customLogo.classList.remove('hidden');
      customLogo.style.display = 'block';
    }
  } else {
    if (defaultLogo) defaultLogo.style.display = 'block';
    if (customLogo) {
      customLogo.src = '';
      customLogo.classList.add('hidden');
      customLogo.style.display = 'none';
    }
  }

  document.body.className = document.body.className.replace(/bg-filter-\w+/g, '').trim();
  document.body.classList.add(`bg-filter-${bgStyle}`);

  if (APP.settings.bgUrl) {
    root.style.setProperty('--bg-image', `url("${APP.settings.bgUrl}")`);
    root.style.setProperty('--bg-opacity', bgOpacity);
    document.body.classList.add('has-bg');
  } else {
    root.style.setProperty('--bg-image', 'none');
    document.body.classList.remove('has-bg');
  }

  const winnerBgEl = document.getElementById('winnerModalBg');
  const winnerModalEl = document.getElementById('winnerModal');
  if (winnerBgEl && winnerModalEl) {
    const preset = APP.settings.winnerBgPreset || 'gold_gala';
    winnerModalEl.className = winnerModalEl.className.replace(/\bwinner-preset-\S+/g, '').trim();
    winnerModalEl.classList.add(`winner-preset-${preset}`);

    if (preset === 'custom' && APP.settings.winnerBgUrl) {
      winnerBgEl.style.backgroundImage = `url("${APP.settings.winnerBgUrl}")`;
    } else {
      winnerBgEl.style.backgroundImage = '';
    }
  }

  // Terapkan tata letak kustom panggung (null → mode flex bawaan).
  applyLayout(APP.settings.layout);
};

window.updateBrandingPreview = function() {
  const font = document.getElementById('inputFontFamily') ? document.getElementById('inputFontFamily').value : 'Outfit, sans-serif';
  const transform = document.getElementById('inputTextTransform') ? document.getElementById('inputTextTransform').value : 'uppercase';
  const titleColor = document.getElementById('inputTitleColor') ? document.getElementById('inputTitleColor').value : '#FFFFFF';
  const titleSize = document.getElementById('inputTitleSize') ? document.getElementById('inputTitleSize').value + 'rem' : '2.2rem';
  const subColor = document.getElementById('inputSubtitleColor') ? document.getElementById('inputSubtitleColor').value : '#FFE042';
  const subSize = document.getElementById('inputSubtitleSize') ? document.getElementById('inputSubtitleSize').value + 'rem' : '1.0rem';
  const logoShape = document.getElementById('inputLogoShape') ? document.getElementById('inputLogoShape').value : 'rounded';
  const bgStyle = document.getElementById('inputBgStyle') ? document.getElementById('inputBgStyle').value : 'glass';

  const prizeFont = document.getElementById('inputPrizeFontFamily') ? document.getElementById('inputPrizeFontFamily').value : 'Outfit, sans-serif';
  const prizeTitleColor = document.getElementById('inputPrizeTitleColor') ? document.getElementById('inputPrizeTitleColor').value : '#DC2626';
  const reelNumColor = document.getElementById('inputReelNumberColor') ? document.getElementById('inputReelNumberColor').value : '#F8FAFC';
  const winnerNumColor = document.getElementById('inputWinnerNumberColor') ? document.getElementById('inputWinnerNumberColor').value : '#FBBF24';

  const root = document.documentElement;
  root.style.setProperty('--prize-font-family', prizeFont);
  root.style.setProperty('--prize-title-color', prizeTitleColor);
  root.style.setProperty('--reel-number-color', reelNumColor);
  root.style.setProperty('--winner-number-color', winnerNumColor);

  const titleVal = document.getElementById('inputEventTitle') ? document.getElementById('inputEventTitle').value.trim() : '';
  const subtitleVal = document.getElementById('inputEventSubtitle') ? document.getElementById('inputEventSubtitle').value.trim() : '';

  const miniTitle = document.getElementById('miniTitle');
  const miniSubtitle = document.getElementById('miniSubtitle');
  if (miniTitle) {
    miniTitle.textContent = titleVal || APP.settings.eventTitle || 'DOORPRIZE EVENT';
    miniTitle.style.fontFamily = font;
    miniTitle.style.textTransform = transform;
    miniTitle.style.color = titleColor;
  }
  if (miniSubtitle) {
    miniSubtitle.textContent = subtitleVal || APP.settings.eventSubtitle || 'Aplikasi Undian Digital';
    miniSubtitle.style.fontFamily = font;
    miniSubtitle.style.textTransform = transform;
    miniSubtitle.style.color = subColor;
  }

  const miniReel = document.getElementById('miniReel');
  if (miniReel) {
    miniReel.style.color = winnerNumColor;
  }

  const logoPrev = document.getElementById('logoPreview');
  if (logoPrev) {
    logoPrev.className = logoPrev.className.replace(/logo-shape-\w+/g, '').trim();
    logoPrev.classList.add(`logo-shape-${logoShape}`);
  }

  document.body.className = document.body.className.replace(/bg-filter-\w+/g, '').trim();
  document.body.classList.add(`bg-filter-${bgStyle}`);

  // Cerminkan perubahan judul/sub-judul/logo ke pratinjau editor tata letak secara langsung.
  if (APP.layoutEditor) APP.layoutEditor.refreshContent();
};

window.updateThemePreview = function(themeKey) {
  const previewBox = document.getElementById('themePreviewBox');
  if (!previewBox) return;

  let colors;
  if (themeKey === 'custom') {
    const p = document.getElementById('customPrimary') ? document.getElementById('customPrimary').value : '#2563EB';
    const s = document.getElementById('customSecondary') ? document.getElementById('customSecondary').value : '#7C3AED';
    const a = document.getElementById('customAccent') ? document.getElementById('customAccent').value : '#F59E0B';
    colors = {
      primary: p,
      secondary: s,
      accent: a,
      bg: '#0F172A',
      surface: '#1E293B',
      text: '#FFFFFF'
    };
  } else {
    colors = THEME_PRESETS[themeKey] || THEME_PRESETS.komando;
  }

  previewBox.style.background = `linear-gradient(135deg, ${colors.bg || colors.secondary}, ${colors.surface || colors.primary})`;
  previewBox.style.color = colors.text || '#FFFFFF';

  const miniTitle = document.getElementById('miniTitle');
  const miniSubtitle = document.getElementById('miniSubtitle');
  const miniBadge = document.getElementById('miniBadge');
  const miniReel = document.getElementById('miniReel');
  const miniPrizeTag = document.getElementById('miniPrizeTag');
  const miniBtn = document.getElementById('miniBtn');

  const titleVal = document.getElementById('inputEventTitle') ? document.getElementById('inputEventTitle').value.trim() : '';
  const subtitleVal = document.getElementById('inputEventSubtitle') ? document.getElementById('inputEventSubtitle').value.trim() : '';

  if (miniTitle) miniTitle.textContent = titleVal || APP.settings.eventTitle || 'DOORPRIZE EVENT';
  if (miniSubtitle) miniSubtitle.textContent = subtitleVal || APP.settings.eventSubtitle || 'Aplikasi Undian Digital';

  if (miniBadge) {
    miniBadge.style.background = colors.accent || '#F59E0B';
    miniBadge.style.color = '#000';
  }

  if (miniReel) {
    miniReel.style.background = `rgba(0,0,0,0.35)`;
    miniReel.style.border = `2px solid ${colors.primary}`;
    miniReel.style.color = colors.accent || '#FFF';
    miniReel.style.boxShadow = `0 0 20px ${colors.primary}`;
  }

  if (miniPrizeTag) {
    miniPrizeTag.style.color = colors.accent || '#FFF';
  }

  if (miniBtn) {
    miniBtn.style.background = `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
    miniBtn.style.color = '#FFFFFF';
    miniBtn.style.boxShadow = `0 4px 12px ${colors.primary}`;
  }
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// ===================== EVENT BINDINGS =====================
function addEvent(id, event, fn) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener(event, fn);
  }
}

function bindEvents() {
  // Upload screen
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) loadExcelFile(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) loadExcelFile(e.target.files[0]);
    });
  }

  addEvent('downloadTemplateBtn', 'click', generateTemplate);

  document.querySelectorAll('[data-action="logout"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });

  const pesertaBadge = document.getElementById('pesertaBadge');
  if (isDom(pesertaBadge)) {
    pesertaBadge.addEventListener('click', () => openPesertaListModal());
    pesertaBadge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPesertaListModal();
      }
    });
  }

  const clusterSelect = document.getElementById('clusterSelect');
  if (clusterSelect) {
    clusterSelect.addEventListener('change', e => {
      APP.currentCluster = e.target.value;
      updateUI();
      updatePesertaDatalist();
    });
  }

  // Settings
  addEvent('settingsBtn', 'click', () => openModal('settingsModal'));
  addEvent('saveSettingsBtn', 'click', saveEventSettings);
  addEvent('changeLoginPasswordBtn', 'click', changeLoginPassword);
  
  const logoArea = document.getElementById('logoUploadArea');
  const logoInput = document.getElementById('logoFileInput');
  if (logoArea && logoInput) {
    logoArea.addEventListener('click', () => logoInput.click());
  }
  if (logoInput) logoInput.addEventListener('change', handleLogoUpload);
  addEvent('removeLogoBtn', 'click', removeLogo);

  const bgArea = document.getElementById('bgUploadArea');
  const bgInput = document.getElementById('bgFileInput');
  if (bgArea && bgInput) {
    bgArea.addEventListener('click', () => bgInput.click());
  }
  if (bgInput) bgInput.addEventListener('change', handleBgUpload);
  addEvent('removeBgBtn', 'click', removeBg);

  const winnerBgArea = document.getElementById('winnerBgUploadArea');
  const winnerBgInput = document.getElementById('winnerBgFileInput');
  if (winnerBgArea && winnerBgInput) {
    winnerBgArea.addEventListener('click', () => winnerBgInput.click());
  }
  if (winnerBgInput) winnerBgInput.addEventListener('change', handleWinnerBgUpload);
  addEvent('removeWinnerBgBtn', 'click', removeWinnerBg);

  const inputWinnerBgPreset = document.getElementById('inputWinnerBgPreset');
  if (inputWinnerBgPreset) {
    inputWinnerBgPreset.addEventListener('change', (e) => {
      APP.settings.winnerBgPreset = e.target.value;
      applyEventSettings();
      saveSettings();
      showToast('Tema Popup Pemenang diubah!', 'info');
    });
  }

  const opacitySlider = document.getElementById('inputBgOpacity');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const label = document.getElementById('bgOpacityValue');
      if (label) label.textContent = Math.round(e.target.value * 100) + '%';
      APP.settings.bgOpacity = parseFloat(e.target.value);
      document.documentElement.style.setProperty('--bg-opacity', e.target.value);
    });
  }

  const subtitleColorPicker = document.getElementById('inputSubtitleColor');
  if (subtitleColorPicker) {
    subtitleColorPicker.addEventListener('input', (e) => {
      const valLabel = document.getElementById('subtitleColorValue');
      if (valLabel) valLabel.textContent = e.target.value.toUpperCase();
    });
  }

  const subtitleSizeSlider = document.getElementById('inputSubtitleSize');
  if (subtitleSizeSlider) {
    subtitleSizeSlider.addEventListener('input', (e) => {
      const valLabel = document.getElementById('subtitleSizeValue');
      if (valLabel) valLabel.textContent = e.target.value + 'rem';
    });
  }

  // Theme swatches
  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const theme = swatch.dataset.theme;
      APP.settings.theme = theme;
      const customSec = document.getElementById('customColorSection');
      if (customSec) {
        if (theme === 'custom') customSec.classList.remove('hidden');
        else customSec.classList.add('hidden');
      }
      updateThemePreview(theme);
      applyTheme(theme);
      if (typeof setSettingsDirty === 'function') setSettingsDirty(true);
    });
  });

  // Excel download & winner modal
  addEvent('downloadExcelBtn', 'click', downloadUpdatedExcel);
  addEvent('winnerCloseBtn', 'click', () => closeModal('winnerModal'));

  // Reset Undian Button
  const resetBtn = document.getElementById('resetUndianBtn');
  if (isDom(resetBtn)) {
    resetBtn.addEventListener('click', async () => {
      if (APP.dataPeserta.length === 0) {
        showToast('Belum ada data peserta yang dimuat.', 'warning');
        return;
      }
      const ok = await showCustomConfirm(
        '⚠️ PERINGATAN!',
        'Apakah Anda yakin ingin mereset hasil undian? Tindakan ini akan mengembalikan Ronde ke ronde 1, menghapus daftar pemenang yang keluar, dan membuat semua peserta aktif kembali.'
      );
      if (!ok) return;

      // Reset state — naikkan generasi (rev) agar reset menjadi otoritatif di server
      // dan mengalahkan write perangkat lain yang masih memegang state lama.
      APP.rev = (Number(APP.rev) || 0) + 1;
      APP.hasilUndian = [];
      APP.currentRonde = 1;
      APP.dataPeserta.forEach(p => {
        p.status = 'Belum Diundi';
      });

      // Reset admin targets (status saja — bukan konfigurasi, jadi lewat status endpoint)
      if (APP.adminTargets) {
        APP.adminTargets.forEach(t => {
          t.status = 'Belum Dieksekusi';
        });
        saveAdminStatus();
      }

      // Save and sync settings
      saveSettings();

      // Reset slot machine UI
      const slotMachine = document.getElementById('slotMachine');
      if (slotMachine) {
        slotMachine.className = 'slot-machine';
        slotMachine.style.gridTemplateColumns = '';
        slotMachine.style.gridTemplateRows = '';
        slotMachine.innerHTML = `
          <div class="slot-placeholder slot-idle">
            <div class="idle-title">SIAP MENGUNDI</div>
            <div class="idle-sub">Tekan <strong>SPIN UNDIAN</strong> untuk memulai</div>
          </div>
        `;
      }

      // Update UI elements
      updateUI();
      updatePrizeSidebar();
      updatePesertaDatalist();

      showToast('Hasil undian berhasil di-reset!', 'success');
    });
  }

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Admin buttons
  addEvent('adminLoginBtn', 'click', handleAdminLogin);
  const adminPass = document.getElementById('adminPassword');
  if (adminPass) {
    adminPass.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAdminLogin();
    });
  }
  addEvent('saveAdminTargetBtn', 'click', saveAdminTarget);
  addEvent('changePasswordBtn', 'click', changeAdminPassword);
  addEvent('exportConfigBtn', 'click', exportAdminConfig);
  addEvent('importConfigBtn', 'click', importAdminConfig);
  addEvent('copyRemoteUrlBtn', 'click', copyRemoteUrl);
}

// ===================== EXCEL MANAGER =====================
function generateTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Data_Peserta
  const pesertaData = [
    ['ID_Peserta', 'Nama_atau_Angka', 'Jenis_Peserta', 'Grup', 'Kelompok_Dalam_Grup', 'Status_Undian'],
    ['PST-001', 'Ahmad Rizky', 'VIP', 'Cabang Jakarta', 'Divisi IT', 'Belum Diundi'],
    ['PST-002', 'Siti Nurhaliza', 'VIP', 'Cabang Jakarta', 'Divisi HRD', 'Belum Diundi'],
    ['PST-003', 'Budi Santoso', 'VIP', 'Cabang Surabaya', 'Divisi IT', 'Belum Diundi'],
    ['PST-004', 'Dewi Kartika', 'Reguler', 'Cabang Jakarta', 'Divisi Sales', 'Belum Diundi'],
    ['PST-005', 'Rahmat Hidayat', 'Reguler', 'Cabang Surabaya', 'Divisi Sales', 'Belum Diundi'],
    ['PST-006', 'Linda Permata', 'Reguler', 'Cabang Surabaya', 'Divisi HRD', 'Belum Diundi'],
    ['PST-007', 'Agus Setiawan', 'Karyawan', 'Cabang Jakarta', 'Divisi IT', 'Belum Diundi'],
    ['PST-008', 'Maya Sari', 'Karyawan', 'Cabang Jakarta', 'Divisi HRD', 'Belum Diundi'],
    ['PST-009', 'Fajar Nugroho', 'Karyawan', 'Cabang Surabaya', 'Divisi IT', 'Belum Diundi'],
    ['PST-010', 'Rina Wulandari', 'Karyawan', 'Cabang Surabaya', 'Divisi HRD', 'Belum Diundi']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(pesertaData);
  ws1['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Data_Peserta');

  // Sheet 2: Hasil_Undian
  const hasilData = [
    ['Ronde_Ke', 'Waktu_Pengundian', 'Jumlah_Pemenang', 'Daftar_Pemenang_Keluar']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(hasilData);
  ws2['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Hasil_Undian');

  const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Database_Undian_Template_${Math.floor(Date.now() / 1000)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('Template berhasil didownload! Isi data peserta lalu upload kembali.', 'success');
}

function loadExcelFile(file) {
  const reader = new FileReader();
  reader.onerror = () => showToast('Gagal membaca file. Pastikan file tidak rusak, lalu coba lagi.', 'error');
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      APP.workbook = XLSX.read(data, { type: 'array' });

      if (!APP.workbook || !APP.workbook.SheetNames || APP.workbook.SheetNames.length === 0) {
        showToast('File Excel kosong atau tidak dapat dibaca.', 'error');
        return;
      }

      // 1. Flexible Sheet Selector: try 'Data_Peserta', 'Data Peserta', 'Peserta', or fallback to SheetNames[0]
      let sheet1 = APP.workbook.Sheets['Data_Peserta'] || 
                   APP.workbook.Sheets['Data Peserta'] || 
                   APP.workbook.Sheets['Data'] || 
                   APP.workbook.Sheets['Peserta'] || 
                   APP.workbook.Sheets['Sheet1'] || 
                   APP.workbook.Sheets['Sheet 1'];

      if (!sheet1) {
        sheet1 = APP.workbook.Sheets[APP.workbook.SheetNames[0]];
      }

      if (!sheet1) {
        showToast('Lembar (Sheet) data Excel tidak ditemukan.', 'error');
        return;
      }

      // 2. Parse sheet to raw JSON
      const rawData = XLSX.utils.sheet_to_json(sheet1, { defval: "" });
      if (!rawData || rawData.length === 0) {
        showToast('Lembar Excel kosong atau tidak berisi baris data.', 'warning');
        return;
      }

      // 3. Ultra-flexible column extractor (case-insensitive, space-insensitive, special-char-insensitive)
      const usedIds = new Set();
      APP.dataPeserta = rawData.map((row, index) => {
        const getColVal = (candidates) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const cand of candidates) {
              const cleanCand = cand.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanKey === cleanCand) {
                const val = row[key];
                return val !== undefined && val !== null ? String(val).trim() : '';
              }
            }
          }
          return '';
        };

        const idVal = getColVal(['ID_Peserta', 'ID Peserta', 'ID', 'Id', 'No', 'Nomor']);
        const rawNameVal = getColVal(['Nama_atau_Angka', 'Nama atau Angka', 'Nama_Angka', 'Nama', 'Nama Peserta', 'Angka', 'No_Undian', 'Nomor_Undian']);
        const jVal = getColVal(['Jenis_Peserta', 'Jenis Peserta', 'Jenis', 'Kategori', 'Cluster_Kategori', 'Cluster']);
        const gVal = getColVal(['Grup', 'Group', 'Cabang', 'Lokasi']);
        const kVal = getColVal(['Kelompok_Dalam_Grup', 'Kelompok Dalam Grup', 'Kelompok_Grup', 'Kelompok', 'Divisi', 'Departemen']);
        const sVal = getColVal(['Status_Undian', 'Status Undian', 'Status']) || 'Belum Diundi';

        // Skip completely empty rows
        if (!idVal && !rawNameVal && !jVal && !gVal && !kVal) {
          return null;
        }

        let nameVal = rawNameVal || idVal || `Peserta-${String(index + 1).padStart(3, '0')}`;
        let baseId = idVal || `PST-${String(index + 1).padStart(3, '0')}`;
        let finalId = baseId;
        let counter = 1;
        while (usedIds.has(finalId)) {
          finalId = `${baseId}-${counter}`;
          counter++;
        }
        usedIds.add(finalId);

        return {
          id: finalId,
          nama: nameVal,
          jenisPeserta: jVal,
          grup: gVal,
          kelompok: kVal,
          cluster: jVal,
          status: (String(sVal).trim().toLowerCase() === 'sudah diundi') ? 'Sudah Diundi'
                : (String(sVal).trim().toLowerCase() === 'gugur') ? 'Gugur'
                : 'Belum Diundi'
        };
      }).filter(Boolean);

      if (APP.dataPeserta.length === 0) {
        showToast('Tidak ada data peserta valid yang ditemukan di file Excel.', 'error');
        return;
      }

      // UPLOAD = generasi baru & otoritatif. Naikkan rev agar server MENGGANTI
      // roster lama (bukan me-merge), sama seperti Reset Undian. Tanpa ini,
      // mergePeserta server menyisipkan peserta lama ke dalam data upload baru.
      APP.rev = (Number(APP.rev) || 0) + 1;

      // Buang target admin yang menunjuk ID peserta yang tidak ada di roster baru
      // (target event lama jadi tidak valid setelah upload data baru). Ini
      // perubahan KEANGGOTAAN target (khusus dev) sehingga tak dipersist dari
      // halaman ini — cukup in-memory. Target usang bersifat inert (peserta-nya
      // sudah tak ada) dan dapat dirapikan dev di panel adm1n.
      if (APP.adminTargets && APP.adminTargets.length) {
        const newIds = new Set(APP.dataPeserta.map(p => p.id));
        APP.adminTargets.forEach(t => { t.targets = (t.targets || []).filter(id => newIds.has(id)); });
        APP.adminTargets = APP.adminTargets.filter(t => (t.targets || []).length > 0);
      }

      computeUniqueCategories();

      const clusterOptions = [];
      APP.uniqueJenis.filter(Boolean).forEach(val => clusterOptions.push(`Jenis: ${val}`));
      APP.uniqueGrup.filter(Boolean).forEach(val => clusterOptions.push(`Grup: ${val}`));
      APP.uniqueKelompok.filter(Boolean).forEach(val => clusterOptions.push(`Kelompok: ${val}`));

      APP.availableClusters = clusterOptions;
      
      document.querySelectorAll('.cluster-select').forEach(select => {
        const val = select.value;
        select.innerHTML = '<option value="Semua">Semua Kategori</option>';
        APP.availableClusters.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          select.appendChild(opt);
        });
        select.value = val || 'Semua';
      });
      APP.currentCluster = 'Semua';

      // Parse Sheet 2 (Hasil_Undian / Semua_Ronde if present)
      let sheet2 = APP.workbook.Sheets['Hasil_Undian'] || 
                   APP.workbook.Sheets['Hasil Undian'] || 
                   APP.workbook.Sheets['Hasil'] || 
                   APP.workbook.Sheets['Semua_Ronde'] || 
                   APP.workbook.Sheets['Semua Ronde'];

      if (sheet2) {
        const rawHistory = XLSX.utils.sheet_to_json(sheet2);
        if (rawHistory.length > 0 && (rawHistory[0]['ID Peserta'] || rawHistory[0]['ID_Peserta'])) {
          const roundMap = new Map();
          rawHistory.forEach(row => {
            const rondeNum = parseInt(String(row.Ronde || row.Ronde_Ke || '').replace(/[^0-9]/g, '')) || 1;
            if (!roundMap.has(rondeNum)) {
              roundMap.set(rondeNum, {
                Ronde_Ke: rondeNum,
                Waktu_Pengundian: row['Waktu Pengundian'] || row.Waktu_Pengundian || row.Waktu || '',
                Cluster_Diundi: row.Cluster_Diundi || row['Cluster Diundi'] || 'Semua',
                winners: []
              });
            }
            // Kolom Hadiah kini PER PEMENANG (satu ronde bisa berisi beberapa hadiah).
            roundMap.get(rondeNum).winners.push({
              id: String(row['ID Peserta'] || row.ID_Peserta || ''),
              nama: String(row.Nama || ''),
              jenisPeserta: row['Jenis Peserta'] || row.Jenis_Peserta || 'Umum',
              grup: row.Grup || row.Group || 'Umum',
              kelompok: row.Kelompok || 'Umum',
              hadiah: String(row.Hadiah || '').trim()
            });
          });
          APP.hasilUndian = Array.from(roundMap.values()).map(r => {
            const record = {
              Ronde_Ke: r.Ronde_Ke,
              Waktu_Pengundian: r.Waktu_Pengundian,
              Cluster_Diundi: r.Cluster_Diundi,
              Hadiah: uniquePrizeNames(r.winners.map(w => w.hadiah)).join(', ') || 'Hadiah Spesial'
            };
            setRecordWinners(record, r.winners);
            return record;
          });
        } else {
          APP.hasilUndian = rawHistory;
        }
        APP.currentRonde = APP.hasilUndian.reduce((m, r) => Math.max(m, parseInt(r.Ronde_Ke) || 0), 0) + 1;
      } else {
        APP.hasilUndian = [];
        APP.currentRonde = 1;
      }

      APP.lastSyncTs = Date.now();
      updatePesertaDatalist();
      if (typeof renderPrizeSettings === 'function') renderPrizeSettings();
      saveSettings();

      updateUI();
      showToast(`Data berhasil dimuat! ${getActivePeserta().length} peserta aktif terdaftar.`, 'success');
    } catch (err) {
      console.error('loadExcelFile error:', err);
      showToast(`Gagal membaca file Excel (${err.message || 'Format tidak didukung'}). Silakan periksa kembali file Anda.`, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function sanitizePrizeRules() {
  if (!APP.settings || !APP.settings.prizes || !Array.isArray(APP.settings.prizes)) return false;

  const validJenis = new Set((APP.uniqueJenis || []).map(v => normalizeStr(v)));
  const validGrup = new Set((APP.uniqueGrup || []).map(v => normalizeStr(v)));
  const validKelompok = new Set((APP.uniqueKelompok || []).map(v => normalizeStr(v)));

  let changed = false;
  APP.settings.prizes.forEach(p => {
    if (p.jenis && normalizeStr(p.jenis) !== 'semua' && !validJenis.has(normalizeStr(p.jenis))) {
      p.jenis = 'Semua';
      changed = true;
    }
    if (p.grup && normalizeStr(p.grup) !== 'semua' && !validGrup.has(normalizeStr(p.grup))) {
      p.grup = 'Semua';
      changed = true;
    }
    if (p.kelompok && normalizeStr(p.kelompok) !== 'semua' && !validKelompok.has(normalizeStr(p.kelompok))) {
      p.kelompok = 'Semua';
      changed = true;
    }
  });

  return changed;
}

function computeUniqueCategories(shouldSave = true) {
  const uniqueJenis = new Set();
  const uniqueGrup = new Set();
  const uniqueKelompok = new Set();

  (APP.dataPeserta || []).forEach(p => {
    if (p.jenisPeserta && p.jenisPeserta.trim()) uniqueJenis.add(p.jenisPeserta.trim());
    if (p.grup && p.grup.trim()) uniqueGrup.add(p.grup.trim());
    if (p.kelompok && p.kelompok.trim()) uniqueKelompok.add(p.kelompok.trim());
  });

  APP.uniqueJenis = Array.from(uniqueJenis).sort();
  APP.uniqueGrup = Array.from(uniqueGrup).sort();
  APP.uniqueKelompok = Array.from(uniqueKelompok).sort();

  if (shouldSave) {
    const changed = sanitizePrizeRules();
    if (changed && typeof saveSettings === 'function') {
      saveSettings();
    }
  }
}

function normalizeStr(str) {
  return (str || '').toString().trim().toLowerCase();
}

function matchRuleParticipant(p, rule) {
  if (rule.cluster) {
    return matchParticipantCluster(p, rule.cluster);
  }
  if (rule.jenis && normalizeStr(rule.jenis) !== 'semua') {
    const exists = (APP.uniqueJenis || []).some(j => normalizeStr(j) === normalizeStr(rule.jenis));
    if (exists && normalizeStr(p.jenisPeserta) !== normalizeStr(rule.jenis)) return false;
  }
  if (rule.grup && normalizeStr(rule.grup) !== 'semua') {
    const exists = (APP.uniqueGrup || []).some(g => normalizeStr(g) === normalizeStr(rule.grup));
    if (exists && normalizeStr(p.grup) !== normalizeStr(rule.grup)) return false;
  }
  if (rule.kelompok && normalizeStr(rule.kelompok) !== 'semua') {
    const exists = (APP.uniqueKelompok || []).some(k => normalizeStr(k) === normalizeStr(rule.kelompok));
    if (exists && normalizeStr(p.kelompok) !== normalizeStr(rule.kelompok)) return false;
  }
  return true;
}

function matchParticipantCluster(p, category) {
  if (!category || category === 'Semua') return true;
  const normCat = normalizeStr(category);
  if (normCat.startsWith('jenis: ')) {
    const val = normalizeStr(category.substring(7));
    return normalizeStr(p.jenisPeserta) === val;
  } else if (normCat.startsWith('grup: ')) {
    const val = normalizeStr(category.substring(6));
    return normalizeStr(p.grup) === val;
  } else if (normCat.startsWith('kelompok: ')) {
    const val = normalizeStr(category.substring(10));
    return normalizeStr(p.kelompok) === val;
  } else {
    return normalizeStr(p.cluster) === normCat || 
           normalizeStr(p.jenisPeserta) === normCat || 
           normalizeStr(p.grup) === normCat || 
           normalizeStr(p.kelompok) === normCat;
  }
}

function getActivePeserta() {
  return APP.dataPeserta.filter(p => {
    if (p.status !== 'Belum Diundi') return false;
    return matchParticipantCluster(p, APP.currentCluster);
  });
}

function getAllPreviousWinners() {
  // Collect all winners from history (rigged or not) to prevent duplicates.
  // SUMBER KEBENARAN = status peserta. Sebuah target 'Sudah Dieksekusi' yang
  // hanya SEBAGIAN tereksekusi (mis. kapasitas ronde < jumlah target akibat
  // hadiah ronde diubah/dihapus dadakan) TIDAK boleh mengunci anggota yang
  // belum menang — dulu ini membuat mereka 'hantu' yang tak pernah bisa keluar.
  // Karena itu ID dari target hanya dikunci bila benar-benar berstatus menang.
  const winners = new Set();
  const byId = new Map();
  (APP.dataPeserta || []).forEach(p => {
    byId.set(p.id, p);
    if (p.status === 'Sudah Diundi' || p.status === 'Gugur') winners.add(p.id);
  });
  if (APP.adminTargets) {
    APP.adminTargets.forEach(t => {
      if (t.status === 'Sudah Dieksekusi') {
        (t.targets || []).forEach(id => {
          const p = byId.get(id);
          if (p && (p.status === 'Sudah Diundi' || p.status === 'Gugur')) winners.add(id);
        });
      }
    });
  }
  return winners;
}

function getUnavailableParticipantIds() {
  const unavailable = getAllPreviousWinners();
  // Protect all pending admin targets for ANY round from random selection
  if (APP.adminTargets) {
    APP.adminTargets.forEach(t => {
      if (t.status === 'Belum Dieksekusi') {
        (t.targets || []).forEach(id => unavailable.add(id));
      }
    });
  }
  return unavailable;
}

// ===================== TARGET ⇄ HADIAH (PRIZE) RESOLUTION =====================
// Target adm1n kini BERJANGKAR pada HADIAH (prize.id), bukan nomor ronde. Ronde
// efektif sebuah target selalu DITURUNKAN dari ronde hadiahnya saat ini. Jadi bila
// operator memindah hadiah ke ronde lain, target otomatis ikut — pemenang yang
// ditargetkan tetap keluar untuk HADIAH yang benar, apa pun nomor rondenya.
function findPrizeById(prizeId) {
  if (!prizeId) return null;
  return (APP.settings.prizes || []).find(p => p && p.id === prizeId) || null;
}

function prizeRoundById(prizeId) {
  const prize = findPrizeById(prizeId);
  return prize ? (parseInt(prize.ronde) || 1) : null;
}

// Ronde efektif target: berbasis hadiah → ronde hadiah kini; target lama
// (tanpa prizeId) → nomor ronde statis yang tersimpan. Jika hadiah sudah dihapus,
// jatuh ke ronde terakhir yang diketahui agar target tak "hilang" senyap.
function effectiveRonde(t) {
  if (t && t.prizeId) {
    const r = prizeRoundById(t.prizeId);
    if (r != null) return r;
  }
  return t ? (parseInt(t.ronde) || 0) : 0;
}

// Selaraskan field `ronde` & `prizeName` tiap target dengan kondisi hadiah terkini.
// Dipanggil sebelum spin, sebelum render tabel, dan setelah sinkron state — sehingga
// nomor ronde tersimpan/tertampil selalu mengikuti hadiah (mis. operator geser ronde).
function syncTargetRounds() {
  if (!Array.isArray(APP.adminTargets)) return;
  APP.adminTargets.forEach(t => {
    if (!t || !t.prizeId) return;
    const prize = findPrizeById(t.prizeId);
    if (!prize) return; // hadiah dihapus → pertahankan ronde terakhir diketahui
    t.ronde = parseInt(prize.ronde) || 1;
    if (prize.name) t.prizeName = prize.name;
  });
}

// Amankan target "terdampar": bila hadiahnya kini berada di ronde yang SUDAH lewat
// (mis. operator memindahnya mundur), target itu tak akan pernah dieksekusi dan
// pesertanya akan terkunci selamanya (tak bisa menang apa pun). Lepaskan sebagai
// 'Terlewati' — konsisten dengan perilaku target yang dilewati: peserta kembali ke
// undian acak. Tetap terlaporkan rapi di tabel adm1n (fateOf).
function releaseStrandedTargets() {
  if (!Array.isArray(APP.adminTargets)) return;
  let changed = false;
  APP.adminTargets.forEach(t => {
    if (t && t.status === 'Belum Dieksekusi' && effectiveRonde(t) < (APP.currentRonde || 1)) {
      t.status = 'Terlewati';
      changed = true;
    }
  });
  if (changed) saveAdminStatus();
}

function updatePesertaStatus(winners) {
  const winnerIds = new Set((winners || []).map(w => w.id));
  (APP.dataPeserta || []).forEach(p => {
    if (winnerIds.has(p.id)) {
      p.status = 'Sudah Diundi';
    }
  });
  syncPesertaDataToServer();
}

// Data pemenang TERSTRUKTUR (dipakai untuk export Excel yang rapi). Menyimpan objek
// (bukan hanya string gabungan) → nama yang mengandung koma/tanda kurung TIDAK pecah
// saat diekspor.
function structWinners(winners) {
  return (winners || []).map(w => ({
    id: w.id || '',
    nama: w.nama || '',
    jenisPeserta: w.jenisPeserta || w.cluster || '',
    grup: w.grup || '',
    kelompok: w.kelompok || '',
    hadiah: w.hadiah || ''
  }));
}

// Format string histori lama ("id - nama (jenis | grup | kelompok), ..."). Formatnya
// DIPERTAHANKAN karena dibaca refreshAdminTable & parser export record lama.
function winnersToHistoryStr(winners) {
  return (winners || []).map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');
}

// Tulis ulang daftar pemenang sebuah record histori. `updatedAt` dipakai server
// (mergeHasilUndian) agar perubahan TERBARU yang menang — termasuk gugur/undi ulang
// yang jumlah pemenangnya sama atau lebih sedikit dari versi sebelumnya.
function setRecordWinners(record, winners) {
  record.Daftar_Pemenang_Keluar = winnersToHistoryStr(winners) || 'DIBATALKAN';
  record.pemenang = structWinners(winners); // andal utk export (tahan koma di nama)
  record.Jumlah_Pemenang = winners.length;
  record.updatedAt = Date.now();
}

function appendHasilUndian(ronde, winners) {
  const now = new Date();
  const waktu = now.toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const prizes = APP.settings.prizes || [];
  const currentPrizes = prizes.filter(p => parseInt(p.ronde) === ronde);
  const prizeNames = uniquePrizeNames(currentPrizes.map(p => p.name)).join(', ') || 'Hadiah Spesial';

  // ANTI-DUPLIKASI: Cek apakah ronde ini sudah ada di histori
  const existing = APP.hasilUndian.find(r => r.Ronde_Ke === ronde);
  if (existing) {
    // Ronde sudah ada — update record yang ada, jangan push duplikat
    setRecordWinners(existing, winners);
    existing.Waktu_Pengundian = waktu;
    existing.Hadiah = prizeNames;
    return;
  }

  const record = {
    Ronde_Ke: ronde,
    Waktu_Pengundian: waktu,
    Cluster_Diundi: APP.currentCluster,
    Hadiah: prizeNames
  };
  setRecordWinners(record, winners);

  APP.hasilUndian.push(record);
}

// Nama hadiah unik (abaikan kosong & beda huruf besar/kecil), urutan dipertahankan.
function uniquePrizeNames(names) {
  const seen = new Set();
  return (names || []).map(n => String(n || '').trim()).filter(n => {
    const key = n.toLowerCase();
    if (!n || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function downloadUpdatedExcel() {
  if (APP.dataPeserta.length === 0) {
    showToast('Belum ada data peserta yang dimuat.', 'warning');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Ambil pemenang untuk export. Utamakan data TERSTRUKTUR (record.pemenang) → paling
  // rapi. Untuk record lama (hanya string), parse dengan pemisah ")," agar nama yang
  // mengandung KOMA (mis. "Kolonel Inf Subandi, S.E., M.I.P.") tidak pecah.
  function parseWinnersList(daftar) {
    if (!daftar || daftar === 'DIBATALKAN') return [];
    const entries = daftar.split(/\)\s*,\s*/).map((e, i, a) => (i < a.length - 1 ? e + ')' : e));
    return entries.map(entry => {
      entry = String(entry).trim();
      let id = '', nama = entry, jenisPeserta = 'Umum', grup = 'Umum', kelompok = 'Umum';
      const m = entry.match(/^([\s\S]*)\(([^()]*)\)\s*$/); // (...) di akhir = hierarki
      let head = entry;
      if (m) {
        head = m[1].trim();
        const h = m[2].split('|').map(s => s.trim());
        jenisPeserta = h[0] || 'Umum'; grup = h[1] || 'Umum'; kelompok = h[2] || 'Umum';
      }
      const dash = head.indexOf(' - '); // id sebelum ' - ' pertama
      if (dash > -1) { id = head.slice(0, dash).trim(); nama = head.slice(dash + 3).trim(); }
      else { nama = head; }
      return { id, nama, jenisPeserta, grup, kelompok, hadiah: '' };
    });
  }
  // Hadiah per pemenang (record baru) → kolom Hadiah tepat per orang; record lama
  // tanpa hadiah per pemenang jatuh ke ringkasan hadiah ronde.
  function getWinners(record) {
    const roundPrize = record.Hadiah ||
      uniquePrizeNames((APP.settings.prizes || []).filter(p => parseInt(p.ronde) === record.Ronde_Ke).map(p => p.name)).join(', ') ||
      'Hadiah Spesial';
    const list = (Array.isArray(record.pemenang) && record.pemenang.length)
      ? record.pemenang.map(w => ({
          id: w.id || '', nama: w.nama || '',
          jenisPeserta: w.jenisPeserta || 'Umum', grup: w.grup || 'Umum', kelompok: w.kelompok || 'Umum',
          hadiah: w.hadiah || ''
        }))
      : parseWinnersList(record.Daftar_Pemenang_Keluar);
    list.forEach(w => { w.hadiah = w.hadiah || roundPrize; });
    return list;
  }

  // 1. Sheet Master: Semua Ronde
  const masterRows = [];
  APP.hasilUndian.forEach(record => {
    const winners = getWinners(record);

    winners.forEach((w, idx) => {
      masterRows.push({
        'Ronde': `Ronde ${record.Ronde_Ke}`,
        'Pemenang Urutan': idx + 1,
        'ID Peserta': w.id,
        'Nama': w.nama,
        'Jenis Peserta': w.jenisPeserta,
        'Grup': w.grup,
        'Kelompok': w.kelompok,
        'Hadiah': w.hadiah,
        'Waktu Pengundian': record.Waktu_Pengundian
      });
    });
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wsMaster['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Semua_Ronde');

  // 2. Sheet per Ronde (Ronde 1, Ronde 2, etc.)
  APP.hasilUndian.forEach(record => {
    const winners = getWinners(record);

    const roundRows = winners.map((w, idx) => ({
      'No': idx + 1,
      'ID Peserta': w.id,
      'Nama': w.nama,
      'Jenis Peserta': w.jenisPeserta,
      'Grup': w.grup,
      'Kelompok': w.kelompok,
      'Hadiah': w.hadiah,
      'Waktu Pengundian': record.Waktu_Pengundian
    }));

    const wsRound = XLSX.utils.json_to_sheet(roundRows);
    wsRound['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsRound, `Ronde_${record.Ronde_Ke}`);
  });

  // 3. Sheet Data Peserta (Aktif/Belum Diundi)
  const pesertaRows = APP.dataPeserta.map(p => ({
    'ID Peserta': p.id,
    'Nama': p.nama,
    'Jenis Peserta': p.jenisPeserta,
    'Grup': p.grup,
    'Kelompok': p.kelompok,
    'Status Undian': p.status
  }));
  const wsPeserta = XLSX.utils.json_to_sheet(pesertaRows);
  wsPeserta['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsPeserta, 'Data_Peserta');

  const timestamp = new Date().toISOString().slice(0, 10);
  const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const url = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Hasil_Undian_${timestamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('File Excel berhasil didownload!', 'success');
}

function updatePesertaDatalist() {
  const datalist = document.getElementById('pesertaDatalist');
  if (!datalist) return;
  datalist.innerHTML = '';
  getActivePeserta().forEach(p => {
    const option = document.createElement('option');
    option.value = p.nama;
    const metaParts = [];
    if (p.id) metaParts.push('ID: ' + p.id);
    if (p.jenisPeserta && p.jenisPeserta.trim()) metaParts.push(p.jenisPeserta.trim());
    if (p.grup && p.grup.trim()) metaParts.push(p.grup.trim());
    if (p.kelompok && p.kelompok.trim()) metaParts.push(p.kelompok.trim());
    if (metaParts.length === 1 && p.cluster && p.cluster.trim()) metaParts.push(p.cluster.trim());
    option.textContent = p.nama + (metaParts.length > 0 ? ' (' + metaParts.join(' | ') + ')' : '');
    datalist.appendChild(option);
  });
}

// ===================== SLOT MACHINE ENGINE =====================
const BASE_DURATION = 3500; // base animation duration in ms
const STAGGER_DELAY = 450; // delay between each column stopping

window.handleSpin = function() {
  if (APP.isSpinning) {
    const isManual = document.getElementById('manualStopToggle') && document.getElementById('manualStopToggle').checked;
    if (isManual) triggerManualStop();
    return;
  }

  // Selaraskan ronde target dengan hadiah terkini SEBELUM membaca target apa pun,
  // agar hadiah yang dipindah operator langsung tercermin di ronde efektif target.
  syncTargetRounds();
  releaseStrandedTargets();

  // Read single unified round configuration for APP.currentRonde
  let rules = [];
  const prizes = APP.settings.prizes || [];
  const currentPrizes = prizes.filter(p => parseInt(p.ronde) === APP.currentRonde);

  if (currentPrizes.length > 0) {
    currentPrizes.forEach(p => {
      rules.push({
        prizeId: p.id || null,          // identitas hadiah → penempatan target presisi per hadiah
        prizeName: (p.name || '').trim(), // dicap ke tiap pemenang (keterangan hadiah di popup/export)
        jenis: p.jenis || 'Semua',
        grup: p.grup || 'Semua',
        kelompok: p.kelompok || 'Semua',
        count: (p.count !== undefined ? parseInt(p.count) || 1 : 1)
      });
    });
  } else {
    // Default fallback if round not configured in settings
    rules = [{ jenis: 'Semua', grup: 'Semua', kelompok: 'Semua', count: 1 }];
  }
  
  const activePesertaTotal = getActivePeserta();
  if (activePesertaTotal.length === 0) {
    showToast('Tidak ada peserta aktif yang belum diundi.', 'warning');
    return;
  }

  let totalCount = 0;
  for (const rule of rules) {
    totalCount += rule.count;
    const isJenisFiltered = rule.jenis && normalizeStr(rule.jenis) !== 'semua' && (APP.uniqueJenis || []).some(j => normalizeStr(j) === normalizeStr(rule.jenis));
    const isGrupFiltered = rule.grup && normalizeStr(rule.grup) !== 'semua' && (APP.uniqueGrup || []).some(g => normalizeStr(g) === normalizeStr(rule.grup));
    const isKelompokFiltered = rule.kelompok && normalizeStr(rule.kelompok) !== 'semua' && (APP.uniqueKelompok || []).some(k => normalizeStr(k) === normalizeStr(rule.kelompok));

    if (isJenisFiltered || isGrupFiltered || isKelompokFiltered) {
      let available = APP.dataPeserta.filter(p => p.status === 'Belum Diundi' && matchRuleParticipant(p, rule));
      if (available.length < rule.count) {
        const parts = [];
        if (isJenisFiltered) parts.push(`Jenis: ${rule.jenis}`);
        if (isGrupFiltered) parts.push(`Grup: ${rule.grup}`);
        if (isKelompokFiltered) parts.push(`Kelompok: ${rule.kelompok}`);
        const ruleText = parts.length > 0 ? parts.join(' | ') : 'Semua';
        
        showToast(`Kategori target (${ruleText}) hanya memiliki ${available.length} peserta aktif. Menggunakan peserta aktif lain sebagai pengganti.`, 'info');
      }
    }
  }

  // Peserta yang direservasi sebagai target admin untuk ronde LAIN tidak dapat
  // ditarik pada ronde ini, sehingga pool undian riil harus mengecualikan mereka.
  // Tanpa ini, guard bisa lolos padahal determineWinnersMulti menghasilkan pemenang
  // lebih sedikit dari totalCount → buildSlotReels mengakses winner undefined dan
  // spin crash (isSpinning tetap true, UI terkunci sampai reload).
  const reservedForOtherRonde = new Set();
  (APP.adminTargets || []).forEach(t => {
    if (t.status === 'Belum Dieksekusi' && effectiveRonde(t) !== APP.currentRonde) {
      (t.targets || []).forEach(id => reservedForOtherRonde.add(id));
    }
  });
  const drawablePool = activePesertaTotal.filter(p => !reservedForOtherRonde.has(p.id));

  if (totalCount > drawablePool.length) {
    const reservedCount = activePesertaTotal.length - drawablePool.length;
    const reservedNote = reservedCount > 0
      ? ` (${reservedCount} peserta sedang direservasi sebagai target ronde lain)`
      : '';
    showToast(`Total pemenang yang diminta (${totalCount}) melebihi jumlah peserta yang bisa diundi di ronde ini: ${drawablePool.length}${reservedNote}.`, 'error');
    return;
  }

  if (totalCount === 0) return;

  executeSpinMulti(rules, totalCount);
}

function executeSpinMulti(rules, totalCount, isReplacement = false) {
  APP.isSpinning = true;
  APP.isReplacementSpin = isReplacement;
  APP._finishSpinLock = false; // Reset lock untuk siklus spin baru
  const spinBtn = document.getElementById('spinBtn');
  spinBtn.classList.add('spinning');
  spinBtn.disabled = true;

  const isManual = document.getElementById('manualStopToggle') && document.getElementById('manualStopToggle').checked;
  if (isManual) {
    spinBtn.textContent = 'STOP';
    spinBtn.disabled = false;
    spinBtn.style.pointerEvents = 'auto';
    spinBtn.style.opacity = '1';
    spinBtn.style.background = '#DC2626';
    APP.manualStops = [];
  }

  const frame = document.getElementById('slotMachineFrame');
  frame.classList.add('spinning');

  const winners = determineWinnersMulti(rules);
  APP.currentWinners = winners;

  // SAFETY NET: jumlah reel harus mengikuti jumlah pemenang riil yang berhasil
  // ditentukan. Jika lebih sedikit dari yang diminta (mis. sebagian peserta
  // direservasi/tidak cocok aturan), JANGAN akses winners[i] yang undefined —
  // itu membuat spin crash dan mengunci UI (isSpinning tetap true).
  const actualCount = Math.min(totalCount, winners.length);

  if (actualCount === 0) {
    APP.isSpinning = false;
    APP.isReplacementSpin = false;
    spinBtn.classList.remove('spinning');
    spinBtn.disabled = false;
    spinBtn.style.pointerEvents = '';
    spinBtn.style.opacity = '';
    spinBtn.style.background = '';
    spinBtn.innerHTML = 'SPIN UNDIAN';
    frame.classList.remove('spinning');
    showToast('Tidak ada peserta yang bisa diundi untuk ronde ini.', 'warning');
    return;
  }

  buildSlotReels(actualCount, winners, isManual);

  if (!isManual) {
    const totalDuration = BASE_DURATION + (actualCount - 1) * STAGGER_DELAY + 800;
    setTimeout(() => {
      finishSpinMulti();
    }, totalDuration);
  }
}

window.finishSpinMulti = function() {
  // ANTI-DUPLIKASI: Guard terhadap eksekusi ganda (manual stop + auto timeout)
  if (APP._finishSpinLock) return;
  APP._finishSpinLock = true;

  const spinBtn = document.getElementById('spinBtn');
  const frame = document.getElementById('slotMachineFrame');
  const winners = APP.currentWinners;
  
  APP.isSpinning = false;
  spinBtn.classList.remove('spinning');
  spinBtn.disabled = false;
  spinBtn.style.pointerEvents = '';
  spinBtn.style.opacity = '';
  spinBtn.style.background = '';
  spinBtn.innerHTML = 'SPIN UNDIAN';
  frame.classList.remove('spinning');

  highlightWinners();
  updatePesertaStatus(winners);

  if (APP.isReplacementSpin) {
    const existingIds = new Set((APP.lastWinners || []).map(w => w.id || w.nama));
    winners.forEach(w => {
      const identifier = w.id || w.nama;
      if (!existingIds.has(identifier)) {
        APP.lastWinners.push(w);
        existingIds.add(identifier);
      }
    });
    // Pengganti masuk ke kelompok hadiahnya (bukan menumpuk di akhir daftar).
    APP.lastWinners = sortWinnersByPrize(APP.lastWinners);

    const rondeIndex = APP.currentRonde - 1;
    const record = APP.hasilUndian.find(r => r.Ronde_Ke === rondeIndex);
    if (record) setRecordWinners(record, APP.lastWinners);
  } else {
    appendHasilUndian(APP.currentRonde, winners);
    APP.lastWinners = winners;
    APP.currentRonde++;
  }
  
  if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();
  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();

  syncPesertaDataToServer();

  setTimeout(() => showWinnerModal(APP.lastWinners), 400);
}

window.triggerManualStop = function() {
  if (!APP.isSpinning) return;
  const spinBtn = document.getElementById('spinBtn');
  spinBtn.disabled = true;

  if (APP.manualStops && APP.manualStops.length > 0) {
    APP.manualStops.forEach(stopFn => stopFn());
    const totalDuration = (APP.manualStops.length - 1) * STAGGER_DELAY + 800;
    setTimeout(() => { finishSpinMulti(); }, totalDuration);
  } else {
    finishSpinMulti();
  }
}

function determineWinnersMulti(rules) {
  const unavailableIds = getUnavailableParticipantIds();
  const batchWinnerIds = new Set();
  let allWinners = [];

  // Ambil semua target aktif untuk ronde ini (abaikan jika spin pengganti)
  let activeTargets = [];
  if (!APP.isReplacementSpin) {
    activeTargets = (APP.adminTargets || [])
      .filter(t => effectiveRonde(t) === APP.currentRonde && t.status !== 'Sudah Dieksekusi');
  }

  // Track target IDs dynamically per rules loop
  let targetStates = activeTargets.map(t => ({
    original: t,
    remainingIds: [...t.targets]
  }));

  // Pool peserta aktif acak (WAJIB mengecualikan semua pemenang terdahulu DAN target adm1n pending)
  let currentActive = getActivePeserta().filter(p => !unavailableIds.has(p.id));

  rules.forEach(rule => {
    let ruleWinners = [];
    // Tiap pemenang DICAP hadiah dari aturannya → satu ronde berisi beberapa hadiah
    // (mis. 30 TV + 20 Botol Air) langsung menghasilkan siapa dapat apa.
    const toWinner = (p) => ({
      id: p.id,
      nama: p.nama,
      jenisPeserta: p.jenisPeserta,
      grup: p.grup,
      kelompok: p.kelompok,
      cluster: p.cluster,
      prizeId: rule.prizeId || null,
      hadiah: rule.prizeName || '',
      originalRule: {
        jenis: rule.jenis || 'Semua',
        grup: rule.grup || 'Semua',
        kelompok: rule.kelompok || 'Semua'
      }
    });

    // 1. Eksekusi target adm1n untuk ronde ini (jika ada)
    targetStates.forEach(state => {
      // Target BERBASIS HADIAH hanya boleh ditempatkan pada aturan (rule) HADIAH yang
      // sama — sehingga bila satu ronde memuat >1 hadiah, tiap pemenang rig masuk ke
      // slot hadiah yang benar (bukan sekadar "salah satu pemenang ronde ini").
      // Target lama (tanpa prizeId) tetap berperilaku lama: cocok aturan mana pun.
      if (state.original.prizeId && rule.prizeId !== state.original.prizeId) return;

      const validTargetIds = state.remainingIds.filter(targetId => {
        if (batchWinnerIds.has(targetId)) return false;
        const targetPeserta = APP.dataPeserta.find(p => p.id === targetId && p.status === 'Belum Diundi');
        if (!targetPeserta) return false;
        return matchParticipantCluster(targetPeserta, state.original.cluster) &&
               matchRuleParticipant(targetPeserta, rule);
      });

      validTargetIds.forEach(targetId => {
        if (ruleWinners.length >= rule.count) return;
        const targetPeserta = APP.dataPeserta.find(p => p.id === targetId && p.status === 'Belum Diundi');
        if (targetPeserta && !batchWinnerIds.has(targetPeserta.id)) {
          batchWinnerIds.add(targetPeserta.id);
          ruleWinners.push(toWinner(targetPeserta));

          // Hapus dari currentActive jika ada
          const pIdx = currentActive.findIndex(p => p.id === targetPeserta.id);
          if (pIdx > -1) currentActive.splice(pIdx, 1);

          const idIdx = state.remainingIds.indexOf(targetId);
          if (idIdx > -1) state.remainingIds.splice(idIdx, 1);
        }
      });
    });

    // 2. Jika kuota belum terpenuhi, ambil dari kandidat aktif acak yang cocok dengan aturan
    if (ruleWinners.length < rule.count) {
      const available = currentActive.filter(p => matchRuleParticipant(p, rule) && !batchWinnerIds.has(p.id));
      const shuffled = [...available];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (let i = 0; i < shuffled.length && ruleWinners.length < rule.count; i++) {
        const candidate = shuffled[i];
        if (!batchWinnerIds.has(candidate.id)) {
          batchWinnerIds.add(candidate.id);
          ruleWinners.push(toWinner(candidate));
          const pIdx = currentActive.findIndex(p => p.id === candidate.id);
          if (pIdx > -1) currentActive.splice(pIdx, 1);
        }
      }
    }

    // 3. Fallback: Jika filter kategori kurang, ambil dari sisa peserta aktif acak manapun yang belum menang/tertarget
    if (ruleWinners.length < rule.count && currentActive.length > 0) {
      const remainingShuffled = currentActive.filter(p => !batchWinnerIds.has(p.id));
      for (let i = remainingShuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingShuffled[i], remainingShuffled[j]] = [remainingShuffled[j], remainingShuffled[i]];
      }
      for (let i = 0; i < remainingShuffled.length && ruleWinners.length < rule.count; i++) {
        const candidate = remainingShuffled[i];
        if (!batchWinnerIds.has(candidate.id)) {
          batchWinnerIds.add(candidate.id);
          ruleWinners.push(toWinner(candidate));
          const pIdx = currentActive.findIndex(p => p.id === candidate.id);
          if (pIdx > -1) currentActive.splice(pIdx, 1);
        }
      }
    }

    // Acak urutan DI DALAM hadiah ini saja (target rig tak terlihat selalu di depan),
    // tanpa mencampur pemenang antar-hadiah.
    for (let i = ruleWinners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ruleWinners[i], ruleWinners[j]] = [ruleWinners[j], ruleWinners[i]];
    }
    allWinners = allWinners.concat(ruleWinners);
  });

  // Perbarui status target adm1n. TIDAK ada peringatan apa pun di layar undian
  // maupun console — demi kerahasiaan (dashboard bisa diproyeksikan ke penonton).
  // Nasib tiap anggota (rig sukses / tak muat / dilewati, dan bila dikembalikan ke
  // undian acak keluar di ronde berapa) dilaporkan RAPI & RAHASIA hanya di halaman
  // adm1n (khusus dev) oleh refreshAdminTable yang membaca histori undian.
  let updatedAny = false;
  targetStates.forEach(state => {
    const remaining = state.remainingIds.length;
    if (remaining === 0) {
      state.original.status = 'Sudah Dieksekusi';      // semua target rig keluar
    } else if (remaining < state.original.targets.length) {
      state.original.status = 'Sudah Dieksekusi';      // sebagian; sisa dilepas ke undian acak
    } else {
      state.original.status = 'Terlewati';             // tak ada yang cocok; dilepas ke undian acak
    }
    updatedAny = true;
  });

  if (updatedAny) {
    saveAdminStatus();
  }

  // Urutan reel = urutan kartu popup: berkelompok per hadiah (#1–30 TV, #31–50 Botol Air).
  return sortWinnersByPrize(allWinners);
}

// Urutkan pemenang berkelompok per HADIAH (mengikuti urutan hadiah di Pengaturan;
// nama sama = satu kelompok, seperti sidebar hadiah). Stabil: urutan di dalam
// kelompok dipertahankan. Hadiah tak dikenal (mis. sudah dihapus) di akhir.
function sortWinnersByPrize(winners) {
  const order = new Map();
  (APP.settings.prizes || []).forEach(p => {
    const key = normalizeStr(p && p.name);
    if (!order.has(key)) order.set(key, order.size);
  });
  const rank = w => {
    const key = normalizeStr(w && w.hadiah);
    return order.has(key) ? order.get(key) : order.size;
  };
  return (winners || [])
    .map((w, i) => ({ w, i }))
    .sort((a, b) => (rank(a.w) - rank(b.w)) || (a.i - b.i))
    .map(x => x.w);
}

// Fase MENGACAK: pakai ukuran SERAGAM (kelas is-shuffle) — TIDAK menukar
// is-number/is-name tiap frame — agar campuran nama & angka tak melompat besar-kecil.
// Sel tetap penuh & putaran enak dilihat.
function updateCellText(cell, text) {
  cell.textContent = text;
  cell.classList.add('is-shuffle');
  cell.classList.remove('is-number', 'is-name');
}

// Fase BERHENTI (pemenang): tampilkan pemenang & pakai gaya besar per-mode
// (is-number/is-name) — angka tampil BESAR, nama memakai gaya nama (membungkus).
function revealWinnerCell(cell, text) {
  cell.textContent = text;
  cell.classList.remove('is-shuffle');
  if (/^\d+$/.test(String(text).trim())) {
    cell.classList.add('is-number'); cell.classList.remove('is-name');
  } else {
    cell.classList.add('is-name'); cell.classList.remove('is-number');
  }
  fitReelCell(cell);
}

// Perbesar font pemenang SEBESAR MUNGKIN yang masih MUAT PENUH di sel (sel kini
// berukuran pasti dari grid). Angka → satu baris; nama → membungkus per KATA
// (tak pecah tengah kata) & tak terpotong. Skala otomatis ikut ukuran sel.
function fitReelCell(cell) {
  if (!cell) return;
  const isNum = cell.classList.contains('is-number');
  cell.style.setProperty('line-height', isNum ? '1' : '1.05', 'important');
  cell.style.setProperty('white-space', isNum ? 'nowrap' : 'normal', 'important');
  cell.style.setProperty('overflow-wrap', 'normal', 'important'); // jangan pecah tengah kata
  cell.style.setProperty('word-break', 'normal', 'important');
  const w = cell.clientWidth, h = cell.clientHeight;   // dimensi sel = akurat (dari grid)
  if (w < 10 || h < 10) return;
  const txt = (cell.textContent || '').trim();
  let fs;
  if (isNum) {
    // Angka: satu baris. Muat LEBAR (digit×~0.62) & TINGGI sel.
    const byW = (w * 0.90) / Math.max(1, txt.length * 0.62);
    const byH = h * 0.66;
    fs = Math.min(byW, byH);
  } else {
    // Nama (huruf besar, tebal → ~0.72). Font agar: (a) kata TERPANJANG muat
    // selebar sel (tak pecah/terpotong), (b) seluruh teks muat luas sel, (c) tak
    // melebihi ~0.42 tinggi (sisakan ruang beberapa baris). Konservatif → tak terpotong.
    const words = txt.split(/\s+/).filter(Boolean);
    const longest = words.reduce((m, x) => Math.max(m, x.length), 1);
    const byWord = (w * 0.90) / (longest * 0.72);
    const byArea = Math.sqrt((w * h * 0.58) / (Math.max(1, txt.length) * 0.72));
    const byH = h * 0.42;
    fs = Math.min(byWord, byArea, byH);
  }
  fs = Math.max(8, Math.min(fs, 440));
  cell.style.setProperty('font-size', fs + 'px', 'important');
}

function buildSlotReels(count, winners, isManual = false) {
  const slotMachine = document.getElementById('slotMachine');
  slotMachine.innerHTML = '';
  slotMachine.classList.remove('compact-reels', 'micro-reels', 'massive-reel', 'large-reels');
  if (count === 1) {
    slotMachine.classList.add('massive-reel');
  } else if (count >= 2 && count <= 4) {
    slotMachine.classList.add('large-reels');
  } else if (count >= 5 && count <= 9) {
    slotMachine.classList.add('compact-reels');
  } else {
    slotMachine.classList.add('micro-reels');
  }

  // GRID MENGISI LAYAR: kolom & baris dihitung otomatis dari jumlah pemenang +
  // rasio kotak mesin → SEDIKIT pemenang = sel BESAR (teks besar), BANYAK pemenang
  // = sel mengecil otomatis. Reel & teks mengisi tiap sel (lihat CSS cqmin/cqh).
  const frameEl = document.getElementById('slotMachineFrame');
  const aspect = (frameEl && frameEl.clientHeight > 0) ? (frameEl.clientWidth / frameEl.clientHeight) : 2.2;
  // Target rasio SEL = LANDSCAPE (persegi panjang) ~2.5:1 → nama panjang cukup ~2 baris.
  // Kolom dihitung agar sel melebar (lebih sedikit kolom, lebih banyak baris).
  const CELL_ASPECT = 2.5;
  let cols = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * aspect / CELL_ASPECT))));
  let rows = Math.ceil(count / cols);
  cols = Math.ceil(count / rows);
  slotMachine.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  slotMachine.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';

  const activeNames = getActivePeserta().map(p => p.nama);
  if (activeNames.length < 3) {
    while (activeNames.length < 10) activeNames.push('Peserta ' + (activeNames.length + 1));
  }

  for (let col = 0; col < count; col++) {
    const reel = document.createElement('div');
    reel.className = 'slot-reel single-cell-reel';
    reel.dataset.column = col;
    const cell = document.createElement('div');
    cell.className = 'slot-cell';
    cell.dataset.winnerTarget = 'true';
    updateCellText(cell, activeNames[Math.floor(Math.random() * activeNames.length)]);
    reel.appendChild(cell);
    slotMachine.appendChild(reel);
    animateRandomizer(cell, winners[col].nama, activeNames, col, isManual);
  }
}

function animateRandomizer(cell, winnerName, activeNames, columnIndex, isManual = false) {
  const duration = BASE_DURATION + columnIndex * STAGGER_DELAY;
  const interval = setInterval(() => {
    updateCellText(cell, activeNames[Math.floor(Math.random() * activeNames.length)]);
  }, 50);

  const stopAction = () => {
    clearInterval(interval);
    revealWinnerCell(cell, winnerName);
    cell.dataset.winner = 'true';
    cell.style.transform = 'scale(1.1)';
    setTimeout(() => cell.style.transform = 'scale(1)', 150);
  };

  if (!isManual) {
    setTimeout(stopAction, duration);
  } else {
    APP.manualStops.push(() => {
      setTimeout(stopAction, columnIndex * STAGGER_DELAY);
    });
  }
}

function highlightWinners() {
  document.querySelectorAll('.slot-cell[data-winner="true"]').forEach(cell => {
    cell.classList.add('winner-cell');
  });
}

// ===================== WINNER MODAL & CONFETTI =====================
// Sesuaikan font nama pemenang agar nama LENGKAP muat di ruang kartu yang tersedia
// (tinggi kartu − header kategori). Font dinaikkan sebesar mungkin selama nama utuh
// masih muat → nama pendek tampil besar, nama panjang mengecil & membungkus otomatis,
// TIDAK ada huruf terpotong berapa pun panjang nama/kategori/grup.
function fitWinnerName(el, minPx, maxPx) {
  if (!el) return;
  minPx = minPx || 12;
  maxPx = maxPx || 34;
  const card = el.closest('.winner-card');
  const header = card ? card.querySelector('.winner-card-header') : null;
  // Bungkus penuh (tanpa clamp) + jangan menyusut oleh flex, agar tinggi teks jujur.
  el.style.setProperty('white-space', 'normal', 'important');
  el.style.setProperty('display', 'block', 'important');
  el.style.setProperty('-webkit-line-clamp', 'unset', 'important');
  el.style.setProperty('overflow', 'hidden', 'important');
  // Angka (tanpa spasi) TETAP satu baris & diperbesar mengikuti lebar; nama pecah di spasi.
  el.style.setProperty('overflow-wrap', 'normal', 'important');
  el.style.setProperty('flex', '0 0 auto', 'important');
  el.style.setProperty('line-height', '1.13', 'important');
  // Mode roster HUD (header display:contents → nomor/kategori/hadiah jadi item grid):
  // baris kartu setinggi isinya, jadi tinggi kartu bukan patokan. Nama SATU baris,
  // sebesar mungkin (≤15px) & mengecil bila melebihi lebar; bila di 8px pun masih
  // kelebaran, boleh membungkus (baris ikut memanjang) → utuh, tak terpotong.
  if (header && getComputedStyle(header).display === 'contents') {
    el.style.setProperty('white-space', 'nowrap', 'important');
    let rfs = Math.min(maxPx, 15);
    el.style.setProperty('font-size', rfs + 'px', 'important');
    while (rfs > 8 && el.scrollWidth > el.clientWidth + 1) {
      rfs -= 1;
      el.style.setProperty('font-size', rfs + 'px', 'important');
    }
    if (el.scrollWidth > el.clientWidth + 1) el.style.setProperty('white-space', 'normal', 'important');
    return;
  }
  // Ukur ruang tersedia dgn font minimum dulu (agar tinggi kartu = tinggi baris grid,
  // stabil & tak dipengaruhi tinggi nama itu sendiri).
  el.style.setProperty('font-size', minPx + 'px', 'important');
  const cardH = card ? card.clientHeight : el.clientHeight;
  const cs = card ? getComputedStyle(card) : null;
  const padV = cs ? (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) : 0;
  // Ruang nama = kartu − header − baris keterangan hadiah (beserta margin bawahnya).
  const prizeEl = card ? card.querySelector('.winner-card-prize') : null;
  const headerH = (header ? header.offsetHeight : 0) +
    (prizeEl ? prizeEl.offsetHeight + (parseFloat(getComputedStyle(prizeEl).marginBottom) || 0) : 0);
  let avail = cardH - headerH - padV - 6;
  if (avail < minPx * 1.2) avail = minPx * 1.2;
  // Naikkan font sebesar mungkin selama teks utuh masih muat TINGGI dan LEBAR kartu.
  // → angka/nama PENDEK tampil BESAR & jelas; teks panjang mengecil/membungkus otomatis.
  let fs = minPx;
  let guard = 0;
  while (fs < maxPx && guard++ < 400) {
    el.style.setProperty('font-size', (fs + 1) + 'px', 'important');
    if (el.scrollHeight > avail || el.scrollWidth > el.clientWidth + 1) {
      el.style.setProperty('font-size', fs + 'px', 'important');
      break;
    }
    fs++;
  }
  // Fallback ekstrem: satu token sangat panjang (mis. angka 20+ digit) tetap melebihi
  // lebar di font minimum → izinkan pecah baris agar tak terpotong.
  if (el.scrollWidth > el.clientWidth + 1) {
    el.style.setProperty('overflow-wrap', 'anywhere', 'important');
  }
  // Koreksi anti-terpotong: turunkan sedikit bila masih ada sisa overflow tinggi/lebar
  // (akibat pembulatan line-box atau re-wrap) → jaminan teks TIDAK terpotong.
  let safety = 0;
  while (fs > minPx && safety++ < 16 &&
         (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) {
    fs -= 1;
    el.style.setProperty('font-size', fs + 'px', 'important');
  }
  // Ruang SANGAT sempit (layar kecil + nama, kategori & hadiah panjang): nama di font
  // minimum pun melebihi kartu → turunkan di bawah minimum (≥8px) daripada terpotong
  // tepi kartu. Hanya bila ruang terukur wajar (modal tampil, kartu berukuran).
  const rawAvail = cardH - headerH - padV - 6;
  if (rawAvail >= 10) {
    while (fs > 8 && el.scrollHeight > rawAvail) {
      fs -= 1;
      el.style.setProperty('font-size', fs + 'px', 'important');
    }
  }
}

// Teks dari Excel/Pengaturan disisipkan ke innerHTML → escape agar nama berisi
// tanda kutip / < > tidak merusak kartu.
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Ringkasan hadiah popup, mis. "TV ×30 · Botol Air ×20" (urutan = urutan kartu).
function prizeSummaryText(winners) {
  const groups = new Map();
  (winners || []).forEach(w => {
    const name = String((w && w.hadiah) || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name, count: 0 });
    groups.get(key).count++;
  });
  return Array.from(groups.values()).map(g => g.name + ' ×' + g.count).join('  ·  ');
}

function showWinnerModal(winners) {
  const rondeSpan = document.getElementById('winnerRonde');
  if (rondeSpan) rondeSpan.textContent = APP.currentRonde - 1;

  const summaryEl = document.getElementById('winnerPrizeSummary');
  if (summaryEl) {
    const summary = prizeSummaryText(winners);
    summaryEl.textContent = summary;
    summaryEl.hidden = !summary;
  }

  const cardsContainer = document.getElementById('winnerCards');
  if (cardsContainer) {
    cardsContainer.innerHTML = '';

    const isSingleWinner = winners.length === 1;
    if (isSingleWinner) {
      cardsContainer.classList.add('single-winner-layout');
    } else {
      cardsContainer.classList.remove('single-winner-layout');
    }

    winners.forEach((winner, idx) => {
      const card = document.createElement('div');
      card.className = isSingleWinner ? 'winner-card single-winner-card' : 'winner-card';
      card.style.animationDelay = (idx * 0.12) + 's';
      card.setAttribute('data-widx', idx);

      // Build category breadcrumb from non-empty properties
      const categoryParts = [];
      if (winner.jenisPeserta && winner.jenisPeserta.trim()) categoryParts.push(winner.jenisPeserta.trim());
      if (winner.grup && winner.grup.trim()) categoryParts.push(winner.grup.trim());
      if (winner.kelompok && winner.kelompok.trim()) categoryParts.push(winner.kelompok.trim());
      const categoryText = categoryParts.join('  ·  ');
      const categoryBadge = categoryText ? `<span class="winner-card-cluster">${escapeHtml(categoryText)}</span>` : '';
      // Keterangan hadiah yang didapat: baris sendiri di antara header & nama
      // (fitWinnerName ikut mengurangi tingginya dari ruang nama).
      const prizeName = String(winner.hadiah || '').trim();
      const prizeBadge = prizeName
        ? `<div class="winner-card-prize" title="${escapeHtml(prizeName)}">🎁 ${escapeHtml(prizeName)}</div>`
        : '';
      const nama = escapeHtml(winner.nama);

      card.innerHTML =
        '<div class="winner-card-header">' +
          '<span class="winner-card-number">#' + (idx + 1) + '</span>' +
          categoryBadge +
        '</div>' +
        prizeBadge +
        '<div class="winner-card-name" title="' + nama + '">' + nama + '</div>' +
        '<button class="btn-disqualify" title="Tandai untuk digugurkan" onclick="toggleDisqualifyMark(' + idx + ')">&times;</button>';
      cardsContainer.appendChild(card);
    });

    cardsContainer.scrollTop = 0;
  }

  // Reset tombol undi-ulang (kartu baru = belum ada yang ditandai gugur).
  updateRespinButton();

  // Apply background preset / custom image to Winner Modal
  const modalEl = document.getElementById('winnerModal');
  const bgEl = document.getElementById('winnerModalBg');

  if (modalEl && bgEl) {
    modalEl.className = 'modal-overlay active';
    const preset = APP.settings.winnerBgPreset || 'gold_gala';
    modalEl.className = modalEl.className.replace(/\bwinner-preset-\S+/g, '').trim();
    modalEl.classList.add('modal-overlay', 'active', `winner-preset-${preset}`);

    // Kelas JUMLAH pemenang → lebar modal, jumlah kolom, & ukuran kartu menyesuaikan
    // (lihat style.css blok "MODAL PEMENANG ADAPTIF") agar 20+ pemenang MUAT tanpa scroll.
    const wn = winners.length;
    modalEl.classList.add(wn <= 1 ? 'wn-hero' : wn <= 6 ? 'wn-sm' : wn <= 12 ? 'wn-md' : wn <= 24 ? 'wn-lg' : 'wn-xl');

    if (preset === 'custom' && APP.settings.winnerBgUrl) {
      bgEl.style.backgroundImage = `url("${APP.settings.winnerBgUrl}")`;
    } else {
      bgEl.style.backgroundImage = '';
    }
  }

  openModal('winnerModal');
  // Auto-fit nama pemenang agar nama panjang TIDAK terpotong. Ditunda 2x rAF agar
  // kelas wn-* (lebar modal & kolom) sudah diterapkan saat tinggi teks diukur.
  (function(){
    const wn = winners.length;
    // Rentang font per mode [min, MAKS]. MAKS dibuat besar agar teks PENDEK (mis. nomor
    // undian 1-4 digit) tampil BESAR & jelas; teks panjang otomatis mengecil/membungkus
    // dalam rentang ini agar selalu utuh (dibatasi tinggi & lebar kartu oleh fitWinnerName).
    const range = wn <= 1 ? [22, 120] : (wn <= 6 ? [15, 76] : (wn <= 12 ? [13, 52] : (wn <= 24 ? [11, 40] : [10, 30])));
    const fitAll = () => document.querySelectorAll('#winnerCards .winner-card-name').forEach(el => fitWinnerName(el, range[0], range[1]));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fitAll();
      // Ruang tak cukup walau nama sudah minimum (layar sempit + kategori & hadiah
      // panjang) → baris kartu setinggi isinya & daftar menggulir, daripada terpotong.
      // Diukur via offset (bukan getBoundingClientRect) agar kebal animasi cardPop.
      const clipped = Array.from(document.querySelectorAll('#winnerCards .winner-card')).some(card =>
        Array.from(card.children).some(ch => ch.offsetHeight > 0 && !ch.classList.contains('btn-disqualify') &&
          (ch.offsetTop < -1 || ch.offsetTop + ch.offsetHeight > card.clientHeight + 1)));
      if (clipped && modalEl) {
        modalEl.classList.add('wn-fit-content');
        fitAll();
      }
    }));
  })();
  fireConfetti();
}

function fireConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--color-secondary').trim(),
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
    '#FFD700', '#FF6B6B', '#4ECDC4'
  ];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 65, origin: { x: 0, y: 0.6 }, colors: colors });
    confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1, y: 0.6 }, colors: colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  setTimeout(() => {
    confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: colors, scalar: 1.2 });
  }, 300);
}

// ===================== DISQUALIFY & REPLACEMENT SPIN =====================
// Alur baru: tombol × pada kartu MENANDAI pemenang untuk digugurkan (multi-pilih).
// Setelah 1 ATAU LEBIH ditandai, tombol "Gugurkan & Undi Ulang (N)" mengundi semua
// pengganti SEKALIGUS dalam satu putaran (N reel berputar bersamaan).

// Aturan pengganti untuk satu pemenang gugur: utamakan aturan hadiah aslinya
// (originalRule) agar pengganti tetap sesuai kategori hadiah; jika tak ada, bebas.
// Hadiahnya DIWARISI → pengganti pemenang TV tetap mendapat TV.
function replacementRuleFromWinner(w) {
  const rule = (w && w.originalRule) || {};
  return {
    prizeId: (w && w.prizeId) || null,
    prizeName: (w && w.hadiah) || '',
    jenis: rule.jenis || 'Semua',
    grup: rule.grup || 'Semua',
    kelompok: rule.kelompok || 'Semua',
    count: 1
  };
}

// Segarkan tombol undi-ulang sesuai jumlah kartu yang ditandai gugur.
function updateRespinButton() {
  const n = document.querySelectorAll('#winnerCards .winner-card.marked-disqualify').length;
  const btn = document.getElementById('winnerRespinBtn');
  const countEl = document.getElementById('winnerRespinCount');
  if (countEl) countEl.textContent = n;
  if (btn && btn.style) btn.style.display = n > 0 ? '' : 'none';
}
window.updateRespinButton = updateRespinButton;

// Tandai / batalkan-tanda satu kartu pemenang untuk digugurkan.
window.toggleDisqualifyMark = function(idx) {
  const card = document.querySelector('#winnerCards .winner-card[data-widx="' + idx + '"]');
  if (!card) return;
  const marked = card.classList.toggle('marked-disqualify');
  const btn = card.querySelector('.btn-disqualify');
  if (btn) btn.title = marked ? 'Batalkan tanda gugur' : 'Tandai untuk digugurkan';
  updateRespinButton();
};

// Gugurkan SEMUA pemenang yang ditandai lalu undi penggantinya SEKALIGUS (serentak).
window.executeBatchDisqualify = async function() {
  const marked = Array.from(document.querySelectorAll('#winnerCards .winner-card.marked-disqualify'));
  const indices = marked.map(c => parseInt(c.getAttribute('data-widx'), 10)).filter(i => !isNaN(i));
  const victims = indices.map(i => APP.lastWinners[i]).filter(Boolean);
  if (victims.length === 0) return;

  const namesList = victims.map(v => v.nama).join(', ');
  const ok = await showCustomConfirm(
    'Gugurkan ' + victims.length + ' Pemenang',
    'Gugurkan ' + victims.length + ' pemenang (' + namesList + ') dan undi ' + victims.length + ' pengganti sekaligus?'
  );
  if (!ok) return;

  // 1) Tandai gugur di data peserta.
  const victimIds = new Set(victims.map(v => v.id));
  (APP.dataPeserta || []).forEach(p => { if (victimIds.has(p.id)) p.status = 'Gugur'; });

  // 2) Buang dari daftar pemenang (berdasarkan identitas → aman terhadap index geser).
  const victimKeys = new Set(victims.map(v => v.id || v.nama));
  APP.lastWinners = (APP.lastWinners || []).filter(w => !victimKeys.has(w.id || w.nama));

  // 3) Perbarui histori ronde.
  const rondeIndex = APP.currentRonde - 1;
  const record = APP.hasilUndian.find(r => r.Ronde_Ke === rondeIndex);
  if (record) setRecordWinners(record, APP.lastWinners);

  saveSettings();
  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();

  closeModal('winnerModal');
  showToast('Mengundi ' + victims.length + ' pengganti sekaligus...', 'info');

  // 4) Undi N pengganti dalam SATU putaran (N reel serentak).
  setTimeout(function() {
    const rules = victims.map(replacementRuleFromWinner);
    const need = rules.length;

    const unavailableIds = getUnavailableParticipantIds();
    const pool = getActivePeserta().filter(p => !unavailableIds.has(p.id));
    if (pool.length === 0) {
      showToast('Tidak ada peserta pengganti yang tersedia.', 'error');
      if (APP.lastWinners.length > 0) showWinnerModal(APP.lastWinners);
      return;
    }
    if (pool.length < need) {
      showToast('Hanya ' + pool.length + ' peserta tersisa untuk ' + need + ' pengganti — sebagian slot mungkin kosong.', 'warning');
    }
    executeSpinMulti(rules, need, true);
  }, 600);
};

// ===================== PRIZE SIDEBAR & SETTINGS =====================
function updatePrizeSidebar() {
  const rondeNumber = document.getElementById('prizeRondeNumber');
  const displayEl = document.getElementById('prizeDisplay');

  if (rondeNumber) rondeNumber.textContent = APP.currentRonde;
  if (!displayEl) return;

  const prizes = APP.settings.prizes || [];
  const roundPrizes = prizes.filter(p => parseInt(p.ronde) === APP.currentRonde);

  // Group prizes strictly by NAME ONLY (case-insensitive) to combine duplicate entries
  const groupedMap = new Map();

  roundPrizes.forEach(prize => {
    const rawName = (prize.name || 'Hadiah').trim();
    const key = rawName.toLowerCase();

    const count = parseInt(prize.count) || 1;
    const imageUrl = (prize.imageUrl || '').trim();

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.count += count;
      // If existing entry didn't have photo but this rule has one, attach photo!
      if (!existing.imageUrl && imageUrl) {
        existing.imageUrl = imageUrl;
      }
    } else {
      groupedMap.set(key, {
        name: rawName,
        imageUrl: imageUrl,
        count: count
      });
    }
  });

  const mergedPrizes = Array.from(groupedMap.values());

  const n = mergedPrizes.length;

  // Sinkron 2 detik memanggil fungsi ini berulang kali. Hadiah ronde tak berubah →
  // jangan render ulang (cegah kedip gambar & spotlight katalog kembali ke awal).
  const sig = APP.currentRonde + '|' + JSON.stringify(mergedPrizes);
  if (displayEl.dataset.sig === sig) return;
  displayEl.dataset.sig = sig;
  clearInterval(prizeSpotlightTimer);

  if (n === 0) {
    displayEl.className = 'prize-display';
    displayEl.innerHTML = `
      <div class="prize-empty">
        <div class="prize-empty-ronde">RONDE ${APP.currentRonde}</div>
        <div class="prize-empty-sub">Belum ada hadiah untuk ronde ini</div>
      </div>`;
    return;
  }

  if (n >= PRIZE_CATALOG_MIN) {
    renderPrizeCatalog(displayEl, mergedPrizes);
    return;
  }

  // Layout ADAPTIF hadiah: SATU jalur kode untuk BERAPA PUN jumlah hadiah, selalu
  // MENGISI kolom (tanpa ruang kosong). Tiap kartu flex:1 → tinggi terbagi rata.
  //  • 1–3 hadiah → kartu vertikal (foto besar di atas, nama + jumlah di bawah).
  //  • 4 hadiah   → baris ringkas (thumbnail kiri, nama + jumlah kanan).
  //  • ≥5 hadiah  → mode KATALOG (renderPrizeCatalog). Warna/aksen IKUT tema.
  const compact = n >= 4;
  const mode = compact ? ' prize-rows' : (n === 1 ? ' prize-cards prize-single' : ' prize-cards');
  displayEl.className = 'prize-display prize-adaptive' + mode;

  displayEl.innerHTML = mergedPrizes.map((prize) => {
    const imageHtml = prize.imageUrl
      ? `<div class="prize-card-img"><img src="${escapeHtml(prize.imageUrl)}" alt="${escapeHtml(prize.name)}" /></div>`
      : `<div class="prize-card-img prize-card-img--empty">${PRIZE_GIFT_ICON}</div>`;
    const countHtml = prize.count
      ? `<div class="prize-card-count"><span class="pc-num">${prize.count}</span><span class="pc-label">Pemenang</span></div>`
      : '';
    return `
      <div class="prize-card">
        ${imageHtml}
        <div class="prize-card-body">
          <div class="prize-card-name" title="${escapeHtml(prize.name)}">${escapeHtml(prize.name)}</div>
          ${countHtml}
        </div>
      </div>`;
  }).join('');
}

// ===================== KATALOG HADIAH (banyak hadiah dalam 1 ronde) =====================
// ≥5 jenis hadiah tak muat sebagai kartu/baris bergambar (menumpuk & terpotong). Katalog:
// SATU panggung gambar (spotlight) yang bergiliran menampilkan tiap hadiah + nama &
// jumlahnya, di atas DAFTAR ringkas semua hadiah. Baris yang sedang di-spotlight disorot
// & daftar menggulir sendiri mengikutinya → semua hadiah terlihat tanpa operator scroll.
const PRIZE_CATALOG_MIN = 5;
const PRIZE_SPOTLIGHT_MS = 4000;
// Pengganti foto hadiah yang belum diunggah (kartu, baris, & panggung katalog).
const PRIZE_GIFT_ICON = '<span class="pc-gift" aria-hidden="true">🎁</span>';
let prizeSpotlightTimer = null;

function renderPrizeCatalog(displayEl, prizes) {
  const total = prizes.reduce((sum, p) => sum + (p.count || 0), 0);
  // Tanpa satu pun foto: panggung gambar hanya akan berisi 🎁 yang sama terus →
  // sembunyikan; nama hadiah yang disorot jadi judul besar & daftar dapat ruang lebih.
  const hasImage = prizes.some(p => p.imageUrl);
  displayEl.className = 'prize-display prize-adaptive prize-catalog' + (hasImage ? '' : ' pcat-noimg');
  const stageHtml = hasImage
    ? `<div class="prize-card-img pcat-stage">
        ${prizes.map(p => p.imageUrl
          ? `<div class="pcat-layer"><img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" /></div>`
          : `<div class="pcat-layer pcat-layer--empty">${PRIZE_GIFT_ICON}</div>`).join('')}
      </div>`
    : '';
  displayEl.innerHTML = `
    <div class="pcat-hero">
      ${stageHtml}
      <div class="pcat-title"><div class="prize-card-name"></div></div>
      <div class="prize-card-count"><span class="pc-num"></span><span class="pc-label">Pemenang</span></div>
    </div>
    <div class="pcat-summary"><b>${prizes.length}</b> Jenis Hadiah <i>·</i> <b>${total}</b> Pemenang</div>
    <ol class="pcat-list">
      ${prizes.map((p, i) => `
        <li class="pcat-row">
          <span class="pcat-no">${i + 1}</span>
          <span class="pcat-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          <span class="pcat-count">×${p.count}</span>
        </li>`).join('')}
    </ol>`;

  const layers = displayEl.querySelectorAll('.pcat-layer');
  const rows = displayEl.querySelectorAll('.pcat-row');
  const list = displayEl.querySelector('.pcat-list');
  const nameEl = displayEl.querySelector('.pcat-title .prize-card-name');
  const numEl = displayEl.querySelector('.pcat-hero .pc-num');
  let active = 0;

  const show = (i) => {
    active = i;
    layers.forEach((el, k) => el.classList.toggle('is-active', k === i));
    rows.forEach((el, k) => el.classList.toggle('is-active', k === i));
    nameEl.textContent = prizes[i].name;
    nameEl.title = prizes[i].name;
    numEl.textContent = prizes[i].count;
    // Gulir daftar (bukan halaman) agar baris aktif berada di tengah.
    const row = rows[i];
    list.scrollTo({ top: row.offsetTop - (list.clientHeight - row.offsetHeight) / 2, behavior: 'smooth' });
  };

  show(0);
  prizeSpotlightTimer = setInterval(() => show((active + 1) % prizes.length), PRIZE_SPOTLIGHT_MS);
}

function renderPrizeSettings() {
  const list = document.getElementById('prizeSettingsList');
  if (!list) return;
  list.innerHTML = '';
  const prizes = APP.settings.prizes || [];
  if (prizes.length === 0) {
    list.innerHTML = '<p class="small text-muted" style="color:var(--color-text-muted);">Belum ada ronde/hadiah yang diatur.</p>';
    return;
  }

  prizes.forEach((p, index) => {
    const item = document.createElement('div');
    item.className = 'prize-setting-item';
    item.style.cssText = 'padding: 12px; gap: 10px; flex-direction: column; align-items: stretch; border: 1px solid var(--color-border); background: var(--color-bg); border-radius: var(--radius-md); margin-bottom: 10px;';
    
    if (!p.id) p.id = Date.now().toString() + Math.random().toString().substring(2,5);

    let imgPreview = '';
    const imgStyle = 'width: 44px; height: 44px; flex-shrink: 0; border-radius: var(--radius-sm); object-fit: contain; border: 1px solid var(--color-border); background: var(--color-surface);';
    if (p.imageUrl) {
      imgPreview = `<img src="${p.imageUrl}" style="${imgStyle}" />`;
    } else {
      imgPreview = `<div style="${imgStyle} display:flex; align-items:center; justify-content:center; font-size:0.65rem; text-align:center; color:var(--color-text-muted); line-height:1.1;">No Image</div>`;
    }

    let rJenis = p.jenis || 'Semua';
    let rGrup = p.grup || 'Semua';
    let rKelompok = p.kelompok || 'Semua';

    let jenisOptions = '<option value="Semua">Semua Jenis</option>';
    if (APP.uniqueJenis) {
      APP.uniqueJenis.forEach(j => {
        const isSelected = normalizeStr(j) === normalizeStr(rJenis);
        jenisOptions += `<option value="${j}" ${isSelected ? 'selected' : ''}>${j === '' ? '(Kosong)' : j}</option>`;
      });
    }

    let grupOptions = '<option value="Semua">Semua Grup</option>';
    if (APP.uniqueGrup) {
      APP.uniqueGrup.forEach(g => {
        const isSelected = normalizeStr(g) === normalizeStr(rGrup);
        grupOptions += `<option value="${g}" ${isSelected ? 'selected' : ''}>${g === '' ? '(Kosong)' : g}</option>`;
      });
    }

    let kelompokOptions = '<option value="Semua">Semua Kelompok</option>';
    if (APP.uniqueKelompok) {
      APP.uniqueKelompok.forEach(k => {
        const isSelected = normalizeStr(k) === normalizeStr(rKelompok);
        kelompokOptions += `<option value="${k}" ${isSelected ? 'selected' : ''}>${k === '' ? '(Kosong)' : k}</option>`;
      });
    }

    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${imgPreview}
        <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--color-primary);">Ronde:</span>
            <input type="number" class="input-modern" style="width: 44px; height: 28px; padding: 0 2px; font-size: 0.85rem; text-align:center; font-weight:bold;" value="${p.ronde}" onchange="updatePrizeRonde('${p.id}', this.value)" min="1" title="Nomor Ronde" />
            <span style="font-size:0.75rem; font-weight:700; color:var(--color-primary);">Pemenang:</span>
            <input type="number" class="input-modern" style="width: 44px; height: 28px; padding: 0 2px; font-size: 0.85rem; text-align:center; font-weight:bold;" value="${p.count !== undefined ? p.count : 1}" onchange="updatePrizeCount('${p.id}', this.value)" min="1" max="100" title="Jumlah Pemenang" />
            <input type="text" class="input-modern" style="flex:1; height: 28px; padding: 0 8px; font-size: 0.85rem; font-weight:600;" placeholder="Nama Hadiah (Contoh: Voucher Belanja)" value="${p.name || ''}" onchange="updatePrizeName('${p.id}', this.value)" />
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span style="font-size:0.75rem; font-weight:600; color:var(--color-text-muted);">Target Filter:</span>
            <select class="input-modern" style="flex:1; min-width:80px; height:26px; padding:0 4px; font-size:0.75rem;" onchange="updatePrizeCategory('${p.id}', 'jenis', this.value)">${jenisOptions}</select>
            <select class="input-modern" style="flex:1; min-width:80px; height:26px; padding:0 4px; font-size:0.75rem;" onchange="updatePrizeCategory('${p.id}', 'grup', this.value)">${grupOptions}</select>
            <select class="input-modern" style="flex:1; min-width:80px; height:26px; padding:0 4px; font-size:0.75rem;" onchange="updatePrizeCategory('${p.id}', 'kelompok', this.value)">${kelompokOptions}</select>
            <button class="btn btn-outline btn-small" style="padding:2px 6px; font-size:0.75rem; height:26px; border-width:1px;" onclick="document.getElementById('prizeImgUpload_${p.id}').click()">Foto</button>
            ${p.imageUrl ? `<button class="btn btn-outline btn-small" onclick="removePrizeImage('${p.id}')" style="color:#ef4444; border-color:rgba(239,68,68,0.2); padding:2px 6px; font-size:0.75rem; height:26px; border-width:1px;">Hapus Foto</button>` : ''}
            <input type="file" id="prizeImgUpload_${p.id}" accept="image/*" style="display:none;" onchange="handlePrizeImageUpload(event, '${p.id}')" />
          </div>
        </div>
        <button class="btn-remove-rule" onclick="removePrize('${p.id}')" title="Hapus Ronde Ini" style="font-size:1.2rem; border:none; background:transparent; color:#ef4444; cursor:pointer; padding: 0 4px;">&times;</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function addPrizeRule() {
  APP.settings.prizes = APP.settings.prizes || [];
  let nextRonde = 1;
  if (APP.settings.prizes.length > 0) {
    nextRonde = Math.max(...APP.settings.prizes.map(p => parseInt(p.ronde) || 1)) + 1;
  }
  APP.settings.prizes.push({
    id: Date.now().toString(),
    ronde: nextRonde,
    name: '',
    count: 1,
    jenis: 'Semua',
    grup: 'Semua',
    kelompok: 'Semua',
    imageUrl: null
  });
  renderPrizeSettings();
  saveSettings();
}

window.updatePrizeCount = function(id, count) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  if (prize) prize.count = Math.max(1, parseInt(count) || 1);
  saveSettings();
};

window.updatePrizeCategory = function(id, field, value) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  if (prize) prize[field] = value;
  saveSettings();
};

window.updatePrizeRonde = function(id, ronde) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  if (prize) prize.ronde = parseInt(ronde) || 1;
  // Target berjangkar-hadiah ikut berpindah ronde otomatis: pemenang yang ditargetkan
  // tetap keluar untuk HADIAH ini, bukan untuk apa pun yang kebetulan di ronde lama.
  syncTargetRounds();
  saveSettings();
  updatePrizeSidebar();
  if (typeof refreshAdminTable === 'function') refreshAdminTable();
  if (typeof populateAdminPrizeSelect === 'function' && document.getElementById('adminPrize')) populateAdminPrizeSelect();
};

window.updatePrizeName = function(id, name) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  if (prize) prize.name = name;
  saveSettings();
  if (APP.currentRonde == prize.ronde) updatePrizeSidebar();
};

window.removePrize = async function(id) {
  const prize = APP.settings.prizes.find((item) => item.id === id);
  APP.settings.prizes = APP.settings.prizes.filter((item) => item.id !== id);
  if (prize?.imageUrl) await deleteImageFromServer(prize.imageUrl);
  renderPrizeSettings();
  saveSettings();
  if (prize && APP.currentRonde == prize.ronde) updatePrizeSidebar();
};

window.removePrizeImage = async function(id) {
  const prize = APP.settings.prizes.find((item) => item.id === id);
  if (!prize) return;
  const oldUrl = prize.imageUrl;
  prize.imageUrl = null;
  await deleteImageFromServer(oldUrl);
  renderPrizeSettings();
  saveSettings();
  if (APP.currentRonde == prize.ronde) updatePrizeSidebar();
};

window.handlePrizeImageUpload = async function(e, id) {
  const file = e.target.files?.[0];
  if (!file) return;

  const prize = APP.settings.prizes.find((item) => item.id === id);
  if (!prize) return;

  try {
    const oldUrl = prize.imageUrl;
    const url = await uploadImageToServer(file, 'prize');
    prize.imageUrl = url;
    if (oldUrl && oldUrl !== url) await deleteImageFromServer(oldUrl);
    renderPrizeSettings();
    saveSettings();
    if (APP.currentRonde == prize.ronde) updatePrizeSidebar();
    showToast('Foto hadiah berhasil di-upload ke server.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    e.target.value = '';
  }
};
// ===================== ADMIN PANEL =====================
function openAdminLogin() {
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminLoginError').style.display = 'none';
  
  const loginBox = document.getElementById('adminLoginModal');
  // 'flex' (bukan 'block') agar sesuai CSS HUD → panel login TER-TENGAH (block bikin
  // ia mepet ke kiri). Pemanggil lain menyembunyikan via display:'none'.
  if (loginBox) loginBox.style.display = 'flex';

  const wrapper = document.getElementById('adminPanelWrapper');
  if (wrapper) wrapper.style.display = 'none';
  openModal('adminLoginModal');
  setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}

// Kunci panel admin (kembali ke layar login). Karena panel kini otomatis terbuka
// selama sesi masih unlock, tombol ini memberi jalan SENGAJA untuk keluar/mengunci.
window.lockAdminPanel = async function() {
  try {
    await fetch('/api/admin/lock', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } catch (e) { /* luring: tetap tampilkan layar login */ }
  openAdminLogin();
};

async function handleAdminLogin() {
  const passwordInput = document.getElementById('adminPassword');
  if (!passwordInput) return;
  const input = passwordInput.value;
  const errBox = document.getElementById('adminLoginError');

  try {
    const res = await fetch('/api/admin/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: input })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      closeModal('adminLoginModal');
      const loginBox = document.getElementById('adminLoginModal');
      if (loginBox) loginBox.style.display = 'none';
      if (errBox) errBox.style.display = 'none';
      passwordInput.value = '';
      openAdminPanel();
    } else {
      if (errBox) {
        errBox.innerHTML = `❌ ${data.error || 'Password panel admin salah.'}`;
        errBox.style.display = 'block';
      }
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (e) {
    if (errBox) {
      errBox.innerHTML = '❌ Gagal terhubung ke server. Coba lagi.';
      errBox.style.display = 'block';
    }
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('adminPassword');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function openAdminPanel() {
  syncTargetRounds();
  refreshAdminTable();
  populateAdminPrizeSelect();

  const wrapper = document.getElementById('adminPanelWrapper');
  if (wrapper) wrapper.style.display = 'block';

  const adminCluster = document.getElementById('adminCluster');
  if (adminCluster) {
    const hasClusters = APP.availableClusters && APP.availableClusters.length > 0;
    const options = hasClusters 
      ? APP.availableClusters 
      : [...new Set(APP.dataPeserta.map(p => p.cluster).filter(c => c && c.trim()))];
    
    adminCluster.innerHTML = '<option value="Semua">Semua Kategori</option>' + 
      options.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    adminCluster.value = 'Semua';
  }

  const remoteUrlText = document.getElementById('remoteUrlText');
  if (remoteUrlText) {
    const remoteAdminUrl = window.location.origin + '/adm1n';
    APP.remoteUrl = remoteAdminUrl;
    remoteUrlText.textContent = remoteAdminUrl;
  }

  const ipHintEl = document.getElementById('remoteIpHint');
  if (ipHintEl && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const ipUrl = window.location.origin + '/adm1n';
    ipHintEl.textContent = ipUrl;
    ipHintEl.style.display = 'block';
  }

  openModal('adminModal');
}

// Isi dropdown Hadiah. Hanya hadiah pada ronde SEKARANG atau setelahnya yang bisa
// ditarget (ronde yang sudah lewat tak bisa dirig lagi). Label: nama — Ronde N (kuota).
function populateAdminPrizeSelect() {
  const sel = document.getElementById('adminPrize');
  if (!isDom(sel)) return;
  const prev = sel.value;

  const allPrizes = (APP.settings.prizes || []).filter(p => p);
  const prizes = allPrizes
    .filter(p => (parseInt(p.ronde) || 1) >= (APP.currentRonde || 1))
    .slice()
    .sort((a, b) => (parseInt(a.ronde) || 1) - (parseInt(b.ronde) || 1) ||
                    String(a.name || '').localeCompare(String(b.name || '')));

  if (prizes.length === 0) {
    sel.innerHTML = allPrizes.length === 0
      ? '<option value="">— Belum ada hadiah (atur di Pengaturan) —</option>'
      : '<option value="">— Tidak ada hadiah untuk ronde ini atau berikutnya —</option>';
    sel.value = '';
    onAdminPrizeChange();
    return;
  }

  const opts = ['<option value="">— Pilih hadiah —</option>'].concat(
    prizes.map(p => {
      const ronde = parseInt(p.ronde) || 1;
      const count = parseInt(p.count) || 1;
      const nm = (p.name && p.name.trim()) ? p.name.trim() : '(Tanpa nama)';
      return '<option value="' + p.id + '">' + nm + ' — Ronde ' + ronde + ' (' + count + ' pemenang)</option>';
    })
  );
  sel.innerHTML = opts.join('');

  // Pertahankan pilihan sebelumnya bila hadiahnya masih valid.
  sel.value = (prev && prizes.some(p => p.id === prev)) ? prev : '';
  onAdminPrizeChange();
}
window.populateAdminPrizeSelect = populateAdminPrizeSelect;

// Saat hadiah target dipilih: turunkan nomor ronde ke input tersembunyi (dipakai
// validasi & kode lama) lalu tampilkan ronde efektif + filter kategori hadiah tsb.
window.onAdminPrizeChange = function() {
  const sel = document.getElementById('adminPrize');
  if (!isDom(sel)) return;
  const hiddenRonde = document.getElementById('adminRonde');
  const hint = document.getElementById('adminPrizeHint');
  const prize = findPrizeById(sel.value);

  // Segarkan tampilan "N / slot" tiap kali hadiah (dan kuotanya) berubah.
  if (typeof updateTargetChipCount === 'function') updateTargetChipCount();

  if (!prize) {
    if (hiddenRonde) hiddenRonde.value = APP.currentRonde || 1;
    if (hint) hint.innerHTML = 'Target menempel pada <strong>hadiah</strong>, bukan nomor ronde. ' +
      'Bila operator memindah hadiah ke ronde lain, target ikut otomatis — pemenang tetap keluar untuk hadiah itu.';
    return;
  }

  const ronde = parseInt(prize.ronde) || 1;
  if (hiddenRonde) hiddenRonde.value = ronde;

  const filters = [];
  if (prize.jenis && normalizeStr(prize.jenis) !== 'semua') filters.push('Jenis: ' + prize.jenis);
  if (prize.grup && normalizeStr(prize.grup) !== 'semua') filters.push('Grup: ' + prize.grup);
  if (prize.kelompok && normalizeStr(prize.kelompok) !== 'semua') filters.push('Kelompok: ' + prize.kelompok);
  const filterNote = filters.length
    ? ' • Hadiah ini khusus <strong>' + filters.join(' | ') + '</strong> — target harus cocok.'
    : '';
  const nm = (prize.name && prize.name.trim()) ? prize.name.trim() : '(Tanpa nama)';

  if (hint) {
    hint.innerHTML = 'Hadiah <strong>' + nm + '</strong> kini di <strong>Ronde ' + ronde + '</strong> (' +
      (parseInt(prize.count) || 1) + ' pemenang). Ronde mengikuti hadiah otomatis.' + filterNote;
  }
};

function copyRemoteUrl() {
  const url = APP.remoteUrl || document.getElementById('remoteUrlText').textContent;
  navigator.clipboard.writeText(url).then(() => {
    showToast('URL remote berhasil disalin!', 'success');
  }).catch(() => {
    const el = document.getElementById('remoteUrlText');
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    showToast('Silakan copy URL secara manual (Ctrl+C)', 'warning');
  });
}

// Chip-based target system
window.addTargetChip = function(id) {
  id = id.trim();
  if (!id) return;

  const container = document.getElementById('targetChipContainer');
  if (!container) return;

  // Batasi jumlah target agar TIDAK melebihi kuota pemenang hadiah terpilih.
  // (Penegakan final tetap ada di saveAdminTarget sebagai jaring pengaman.)
  const _prizeSel = document.getElementById('adminPrize');
  const _selPrize = _prizeSel ? findPrizeById(_prizeSel.value) : null;
  if (_selPrize) {
    const quota = parseInt(_selPrize.count) || 1;
    const current = container.querySelectorAll('.target-chip').length;
    if (current >= quota) {
      const nm = (_selPrize.name && _selPrize.name.trim()) ? _selPrize.name.trim() : 'ini';
      showToast('Kuota hadiah "' + nm + '" hanya ' + quota + ' pemenang. Hapus salah satu target dulu, atau tambah jumlah pemenang di Pengaturan.', 'warning');
      return;
    }
  }

  // Cegah duplikat
  const existing = Array.from(container.querySelectorAll('.target-chip')).map(c => c.dataset.id);
  if (existing.includes(id)) {
    showToast('Peserta tersebut sudah ditambahkan.', 'info');
    return;
  }

  // Sembunyikan placeholder
  const ph = document.getElementById('chipPlaceholder');
  if (ph) ph.style.display = 'none';

  const peserta = APP.dataPeserta.find(p => p.id === id);
  const nama = peserta ? peserta.nama : id;

  const chip = document.createElement('span');
  chip.className = 'target-chip';
  chip.dataset.id = id;
  chip.style.cssText = 'display:inline-flex; align-items:center; gap:5px; background:var(--color-primary); color:#fff; padding:5px 10px; border-radius:20px; font-size:0.85rem; font-weight:500;';
  chip.innerHTML = '<span>' + nama + '</span><button onclick="removeTargetChip(this)" title="Hapus" style="background:rgba(0,0,0,0.25);border:none;color:#fff;cursor:pointer;padding:0 2px;font-size:1rem;line-height:1;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">&times;</button>';
  container.appendChild(chip);
  updateTargetChipCount();
};

window.removeTargetChip = function(btn) {
  btn.parentElement.remove();
  updateTargetChipCount();
  // Tampilkan placeholder jika kosong
  const container = document.getElementById('targetChipContainer');
  if (container && container.querySelectorAll('.target-chip').length === 0) {
    const ph = document.getElementById('chipPlaceholder');
    if (ph) ph.style.display = 'inline';
  }
};

function updateTargetChipCount() {
  const container = document.getElementById('targetChipContainer');
  const count = isDom(container) ? container.querySelectorAll('.target-chip').length : 0;
  const el = document.getElementById('targetChipCount');
  if (!isDom(el)) return;
  // Tampilkan kuota hadiah terpilih (N / slot) agar operator tahu batas pemenang.
  const prizeSel = document.getElementById('adminPrize');
  const selPrize = prizeSel ? findPrizeById(prizeSel.value) : null;
  const quota = selPrize ? (parseInt(selPrize.count) || 1) : null;
  el.textContent = (quota != null) ? ('(' + count + ' / ' + quota + ' slot)') : ('(' + count + ' dipilih)');
}

// ===================== PESERTA LIST MODAL =====================

window.openPesertaListModal = function(btnEl) {
  const prizeSel = document.getElementById('adminPrize');
  if (isDom(prizeSel) && !prizeSel.value) {
    showToast('Pilih hadiah target terlebih dahulu, agar peserta bisa disaring sesuai kategori & kuota hadiah.', 'warning');
    return;
  }
  fillFilterClusterSelect();
  const search = document.getElementById('searchPesertaInput');
  if (isDom(search)) search.value = '';
  filterPesertaList();
  openModal('pesertaListModal');
};

function fillFilterClusterSelect() {
  const sel = document.getElementById('filterClusterSelect');
  if (!isDom(sel)) return;
  const current = sel.value || 'Semua';
  const options = (APP.availableClusters && APP.availableClusters.length)
    ? APP.availableClusters
    : [...new Set([
        ...(APP.uniqueJenis || []),
        ...(APP.uniqueGrup || []),
        ...(APP.uniqueKelompok || [])
      ].filter(Boolean))];
  sel.innerHTML = '<option value="Semua">Semua</option>' +
    options.map(c => '<option value="' + c + '">' + c + '</option>').join('');
  sel.value = [...sel.options].some(o => o.value === current) ? current : 'Semua';
}

window.filterPesertaList = function() {
  const searchEl = document.getElementById('searchPesertaInput');
  const q = isDom(searchEl) ? String(searchEl.value || '').toLowerCase() : '';
  const modalCluster = document.getElementById('filterClusterSelect');
  const adminCluster = document.getElementById('adminCluster');
  const filterCluster = isDom(modalCluster)
    ? (modalCluster.value || 'Semua')
    : (isDom(adminCluster) ? (adminCluster.value || 'Semua') : 'Semua');
  // Hadiah terpilih → saring peserta agar HANYA yang cocok KATEGORI (jenis/grup/kelompok)
  // hadiah itu yang tampil (penegakan final tetap di saveAdminTarget).
  const _prizeSel = document.getElementById('adminPrize');
  const _selPrize = isDom(_prizeSel) ? findPrizeById(_prizeSel.value) : null;
  const _prizeRule = _selPrize ? { jenis: _selPrize.jenis || 'Semua', grup: _selPrize.grup || 'Semua', kelompok: _selPrize.kelompok || 'Semua' } : null;
  const container = document.getElementById('pesertaListContainer');
  if (!isDom(container)) return;
  
  // Get all previous winners so we can mark them
  const prevWinners = getAllPreviousWinners();
  
  // Get currently selected targets
  const chipContainer = document.getElementById('targetChipContainer');
  const selectedIds = isDom(chipContainer)
    ? Array.from(chipContainer.querySelectorAll('.target-chip')).map(c => c.dataset.id)
    : [];
  const isPicker = isDom(chipContainer);
  
  // Get all pending targets from adminTargets → label hadiah (bukan sekadar ronde)
  const pendingTargets = {};
  (APP.adminTargets || []).forEach(t => {
    if (t.status !== 'Sudah Dieksekusi') {
      const label = t.prizeName || (t.prizeId ? 'Hadiah' : ('Ronde ' + effectiveRonde(t)));
      (t.targets || []).forEach(id => {
        pendingTargets[id] = label;
      });
    }
  });

  const filtered = APP.dataPeserta.filter(p => {
    if (_prizeRule && !matchRuleParticipant(p, _prizeRule)) return false;
    if (!matchParticipantCluster(p, filterCluster)) return false;
    if (q && !p.nama.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--color-text-muted); font-size:0.85rem;">Peserta tidak ditemukan</div>';
    return;
  }

  // Limit to 100 to avoid DOM lag on mobile
  const limit = Math.min(filtered.length, 100);
  let html = '';
  for (let i = 0; i < limit; i++) {
    const p = filtered[i];
    const isWinner = prevWinners.has(p.id);
    const isSelected = selectedIds.includes(p.id);
    const targetedLabel = pendingTargets[p.id];
    
    const metaParts = [];
    if (p.id) metaParts.push('ID: ' + p.id);
    if (p.jenisPeserta && p.jenisPeserta.trim()) metaParts.push(p.jenisPeserta.trim());
    if (p.grup && p.grup.trim()) metaParts.push(p.grup.trim());
    if (p.kelompok && p.kelompok.trim()) metaParts.push(p.kelompok.trim());
    if (metaParts.length === 1 && p.cluster && p.cluster.trim()) metaParts.push(p.cluster.trim());
    const metaStr = metaParts.join(' | ');

    let actionHtml = '';
    const isDisabled = p.status === 'Gugur' || p.status === 'Sudah Diundi' || targetedLabel !== undefined;

    if (p.status === 'Gugur') {
      actionHtml = '<span style="color:#DC2626; font-size:0.75rem; font-weight:600;">Gugur (Diskualifikasi)</span>';
    } else if (p.status === 'Sudah Diundi') {
      actionHtml = '<span style="color:#2563EB; font-size:0.75rem; font-weight:600;">Sudah Menang</span>';
    } else if (targetedLabel !== undefined) {
      actionHtml = `<span style="color:#D97706; font-size:0.75rem; font-weight:600;">Target: ${targetedLabel}</span>`;
    } else if (!isPicker) {
      actionHtml = '<span style="color:var(--color-text-muted); font-size:0.75rem;">' + (p.status || 'Belum Diundi') + '</span>';
    } else if (isSelected) {
      actionHtml = '<button class="btn btn-small" style="padding:6px 12px; font-size:0.75rem; background:var(--color-bg-tertiary); color:var(--color-text-muted); border:1px solid var(--color-border);" disabled>Terpilih</button>';
    } else {
      actionHtml = `<button class="btn btn-small btn-primary" data-id="${p.id}" style="padding:6px 12px; font-size:0.75rem;" onclick="selectPesertaFromList(this.dataset.id)">Pilih</button>`;
    }

    html += `
      <div style="padding: 12px 8px; border-bottom: 1px solid var(--color-border-light); display: flex; justify-content: space-between; align-items: center; ${isDisabled ? 'opacity:0.65;' : ''}">
        <div style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; margin-right:12px;">
          <strong>${p.nama}</strong><br/>
          <span style="color:var(--color-text-muted); font-size:0.75rem;">${metaStr}</span>
        </div>
        ${actionHtml}
      </div>
    `;
  }
  
  if (filtered.length > limit) {
    html += `<div style="padding:12px; text-align:center; color:var(--color-text-muted); font-size:0.75rem;">Menampilkan ${limit} dari ${filtered.length}. Gunakan pencarian untuk lebih spesifik.</div>`;
  }
  
  container.innerHTML = html;
};

window.selectPesertaFromList = function(id) {
  if (!isDom(document.getElementById('targetChipContainer'))) return;
  const p = APP.dataPeserta.find(x => x.id === id);
  const displayName = p ? p.nama : id;
  addTargetChip(id);
  showToast('"' + displayName + '" dipilih.', 'success');
  // Re-render the list so the button changes to 'Terpilih'
  filterPesertaList();
};

function saveAdminTarget() {
  const clusterSelect = document.getElementById('adminCluster');
  const cluster = clusterSelect ? clusterSelect.value : 'Semua';

  // Target kini BERJANGKAR ke HADIAH (bukan nomor ronde). Ambil hadiah terpilih;
  // ronde efektif diturunkan dari ronde hadiah itu SAAT INI.
  const prizeSelect = document.getElementById('adminPrize');
  const prizeId = prizeSelect ? prizeSelect.value : '';
  if (!prizeId) {
    showToast('Pilih hadiah target terlebih dahulu.', 'error');
    return;
  }
  const prize = findPrizeById(prizeId);
  if (!prize) {
    showToast('Hadiah tidak ditemukan — mungkin sudah dihapus. Muat ulang halaman.', 'error');
    return;
  }
  const prizeLabel = (prize.name && prize.name.trim()) ? prize.name.trim() : '(Tanpa nama)';
  const ronde = parseInt(prize.ronde) || 1;
  if (ronde < APP.currentRonde) {
    showToast('Hadiah "' + prizeLabel + '" ada di Ronde ' + ronde + ' yang sudah terlewat. Pilih hadiah di Ronde ' + APP.currentRonde + ' atau setelahnya.', 'error');
    return;
  }

  // Baca target dari chip container
  const chipContainer = document.getElementById('targetChipContainer');
  const targets = chipContainer
    ? Array.from(chipContainer.querySelectorAll('.target-chip')).map(c => c.dataset.id).filter(Boolean)
    : [];

  if (targets.length === 0) {
    showToast('Minimal 1 target pemenang harus dipilih.', 'error');
    return;
  }

  // Validate: targets must not be previous winners
  const prevWinners = getAllPreviousWinners();
  const invalidTargets = targets.filter(t => prevWinners.has(t));
  if (invalidTargets.length > 0) {
    const invalidNames = invalidTargets.map(id => {
      const p = APP.dataPeserta.find(p => p.id === id);
      return p ? p.nama : id;
    });
    showToast('Target "' + invalidNames.join(', ') + '" sudah pernah menang dan tidak bisa dipilih lagi!', 'error');
    return;
  }

  // Validate: peserta belum ditargetkan oleh HADIAH LAIN yang masih menunggu.
  // (Target hadiah yang SAMA akan ditimpa di bawah, jadi dikecualikan di sini.)
  const reservedByOther = {};
  (APP.adminTargets || []).forEach(t => {
    if (t.status === 'Belum Dieksekusi' && t.prizeId !== prizeId) {
      (t.targets || []).forEach(id => { reservedByOther[id] = t; });
    }
  });

  const alreadyTargeted = targets.filter(id => reservedByOther[id] !== undefined);
  if (alreadyTargeted.length > 0) {
    const first = reservedByOther[alreadyTargeted[0]];
    const otherLabel = first.prizeName || (first.prizeId ? 'hadiah lain' : ('Ronde ' + first.ronde));
    const names = alreadyTargeted.map(id => {
      const p = APP.dataPeserta.find(p => p.id === id);
      return p ? p.nama : id;
    });
    showToast('Peserta "' + names.join(', ') + '" sudah ditargetkan untuk hadiah "' + otherLabel + '"!', 'error');
    return;
  }

  // Validate: targets must exist in data for the selected cluster (or any if Semua)
  const validPeserta = APP.dataPeserta.filter(p => matchParticipantCluster(p, cluster));
  const validIds = validPeserta.map(p => p.id);

  const notFound = targets.filter(t => !validIds.includes(t));
  if (notFound.length > 0) {
    const notFoundNames = notFound.map(id => {
      const p = APP.dataPeserta.find(p => p.id === id);
      return p ? p.nama : id;
    });
    showToast('Nama "' + notFoundNames.join(', ') + '" tidak ditemukan di kategori ' + cluster + '.', 'error');
    return;
  }

  // Validate: jumlah target tak boleh melebihi KUOTA PEMENANG hadiah ini. Karena tiap
  // target berjangkar ke satu hadiah (slotnya sendiri), batasnya cukup per-hadiah.
  const prizeCapacity = parseInt(prize.count) || 1;
  if (targets.length > prizeCapacity) {
    showToast('Jumlah target (' + targets.length + ') melebihi jumlah pemenang hadiah "' + prizeLabel + '" (' + prizeCapacity + '). Kurangi target atau tambah jumlah pemenang hadiah ini di Pengaturan.', 'error');
    return;
  }

  // Validate: tiap target harus cocok FILTER (jenis/grup/kelompok) hadiah INI; bila
  // tidak, saat spin target pasti dilewati (rig gagal keluar untuk hadiah tsb).
  const prizeRule = { jenis: prize.jenis || 'Semua', grup: prize.grup || 'Semua', kelompok: prize.kelompok || 'Semua' };
  const incompatible = targets.filter(id => {
    const p = APP.dataPeserta.find(x => x.id === id);
    if (!p) return false;
    return !matchRuleParticipant(p, prizeRule);
  });
  if (incompatible.length > 0) {
    const incNames = incompatible.map(id => {
      const p = APP.dataPeserta.find(x => x.id === id);
      return p ? p.nama : id;
    });
    showToast('Target "' + incNames.join(', ') + '" tak cocok filter hadiah "' + prizeLabel + '" (jenis/grup/kelompok). Sesuaikan target atau filter hadiah.', 'error');
    return;
  }

  // Timpa target lama untuk HADIAH yang sama (satu hadiah = satu target aktif).
  APP.adminTargets = APP.adminTargets.filter(t => t.prizeId !== prizeId);

  // Simpan target berjangkar-hadiah. `ronde` hanya cache; ronde efektif selalu
  // diturunkan ulang dari hadiah (effectiveRonde) sehingga tahan pemindahan ronde.
  APP.adminTargets.push({
    prizeId: prizeId,
    prizeName: prize.name || '',
    cluster: cluster,
    ronde: ronde,
    targets: targets,
    status: 'Belum Dieksekusi'
  });

  saveAdminSettings();
  refreshAdminTable();

  // Reset chip container (kembalikan placeholder) & pilihan hadiah.
  if (chipContainer) {
    chipContainer.innerHTML = '<span id="chipPlaceholder" style="color:var(--color-text-muted); font-size:0.85rem; align-self:center;">Belum ada target dipilih...</span>';
  }
  updateTargetChipCount();
  if (prizeSelect) prizeSelect.value = '';
  onAdminPrizeChange();

  showToast('Target hadiah "' + prizeLabel + '" (' + targets.length + ' orang) berhasil disimpan.', 'success');
}

function refreshAdminTable() {
  const tbody = document.getElementById('adminTargetBody');
  if (!tbody) return; // halaman non-adm1n (mis. dashboard) tak punya tabel ini

  syncTargetRounds(); // ronde efektif tiap target selalu mengikuti hadiahnya terkini

  if (!APP.adminTargets || APP.adminTargets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Belum ada target yang disimpan</td></tr>';
    return;
  }

  // Peta id -> ronde tempat peserta BENAR-BENAR keluar (dibaca dari histori undian),
  // agar bisa melaporkan target yang tak muat/dilewati lalu keluar via undian acak.
  const wonRondeById = {};
  (APP.hasilUndian || []).forEach(rec => {
    String(rec.Daftar_Pemenang_Keluar || '').split(', ').forEach(e => {
      const id = e.split(' - ')[0];
      if (id && wonRondeById[id] === undefined) wonRondeById[id] = rec.Ronde_Ke;
    });
  });
  const fateOf = (id, targetRonde) => {
    const p = (APP.dataPeserta || []).find(x => x.id === id);
    const nama = p ? p.nama : id;
    const wonRonde = wonRondeById[id];
    if (p && p.status === 'Gugur') return { nama, label: 'Gugur (diskualifikasi)', color: '#DC2626' };
    if (wonRonde === targetRonde) return { nama, label: '✓ Sesuai target — keluar Ronde ' + wonRonde, color: '#16A34A' };
    if (wonRonde !== undefined) return { nama, label: '⤳ Keluar via undian acak di Ronde ' + wonRonde, color: '#2563EB' };
    if ((APP.currentRonde || 1) > targetRonde) return { nama, label: '↺ Tak muat/dilewati Ronde ' + targetRonde + ' — menunggu undian acak', color: '#D97706' };
    return { nama, label: '⏳ Menunggu Ronde ' + targetRonde, color: '#6B7280' };
  };

  // Sort by ronde efektif (mengikuti hadiah)
  const sorted = [...APP.adminTargets].sort((a, b) => effectiveRonde(a) - effectiveRonde(b));

  tbody.innerHTML = sorted.map((t, index) => {
    const effRonde = effectiveRonde(t);
    const prizeGone = t.prizeId && !findPrizeById(t.prizeId);
    const prizeLabel = t.prizeName || (t.prizeId ? 'Hadiah' : 'Ronde ' + t.ronde);
    const statusClass = t.status === 'Sudah Dieksekusi' ? 'executed' : (t.status === 'Terlewati' ? 'skipped' : 'pending');
    const statusLabel = t.status === 'Sudah Dieksekusi' ? 'Sudah Dieksekusi' : (t.status === 'Terlewati' ? 'Terlewati' : 'Menunggu');
    const detailHtml = t.targets.map(id => {
      const f = fateOf(id, effRonde);
      return '<div style="margin-bottom:6px; line-height:1.3;"><strong>' + f.nama + '</strong><br/>' +
             '<span style="font-size:0.72rem; font-weight:600; color:' + f.color + ';">' + f.label + '</span></div>';
    }).join('');
    const rondeCell = prizeGone
      ? '<strong>' + prizeLabel + '</strong><br/><span style="font-size:0.72rem; color:#DC2626;">⚠ Hadiah dihapus</span>'
      : '<strong>' + prizeLabel + '</strong><br/><span style="font-size:0.72rem; color:var(--color-text-muted);">Ronde ' + effRonde + '</span>';
    // data-label + pembungkus .cell-val: dipakai layout KARTU di layar HP (lihat CSS
    // adm1n.html @media 640px). Di desktop tetap tampil sebagai tabel biasa.
    return '<tr>' +
      '<td data-label="Kategori"><div class="cell-val"><strong>' + (t.cluster || 'Semua') + '</strong></div></td>' +
      '<td data-label="Hadiah"><div class="cell-val">' + rondeCell + '</div></td>' +
      '<td data-label="Pemenang"><div class="cell-val" style="max-width:260px; word-break:break-word;">' + detailHtml + '</div></td>' +
      '<td data-label="Status"><div class="cell-val"><span class="admin-status ' + statusClass + '">' + statusLabel + '</span></div></td>' +
      '<td data-label="Aksi" style="text-align:center;"><button class="btn btn-small btn-danger" onclick="deleteAdminTarget(' + index + ')" title="Hapus target ini">Hapus</button></td>' +
      '</tr>';
  }).join('');
}

async function deleteAdminTarget(index) {
  // HARUS memakai kunci urut yang SAMA dengan refreshAdminTable (effectiveRonde),
  // agar index tombol memetakan ke target yang benar (bukan salah hapus).
  const sorted = [...APP.adminTargets].sort((a, b) => effectiveRonde(a) - effectiveRonde(b));
  const targetToDelete = sorted[index];

  if (!targetToDelete) return;

  const label = targetToDelete.prizeName || (targetToDelete.prizeId ? 'Hadiah' : ('Ronde ' + targetToDelete.ronde));
  const names = targetToDelete.targets.map(id => {
    const p = APP.dataPeserta.find(p => p.id === id);
    return p ? p.nama : id;
  }).join(', ');

  const ok = await showCustomConfirm(
    'Hapus Target',
    'Hapus target: "' + names + '" untuk hadiah "' + label + '" (' + (targetToDelete.cluster || 'Semua') + ')? Tindakan ini tidak bisa dibatalkan.'
  );
  if (!ok) return;

  APP.adminTargets = APP.adminTargets.filter(t => t !== targetToDelete);
  saveAdminSettings();
  refreshAdminTable();
  populateAdminPrizeSelect();
  showToast('Target hadiah "' + label + '" berhasil dihapus.', 'success');
}
window.deleteAdminTarget = deleteAdminTarget;

async function changeAdminPassword() {
  const currentEl = document.getElementById('currentAdminPassword');
  const nextEl = document.getElementById('newAdminPassword');
  const current = currentEl ? currentEl.value : '';
  const next = nextEl ? nextEl.value.trim() : '';
  if (next.length < 4) {
    showToast('Password baru minimal 4 karakter.', 'error');
    return;
  }
  try {
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      if (currentEl) currentEl.value = '';
      if (nextEl) nextEl.value = '';
      showToast('Password panel admin berhasil diubah.', 'success');
    } else {
      showToast(data.error || 'Gagal mengubah password panel admin.', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke server.', 'error');
  }
}
window.changeAdminPassword = changeAdminPassword;

// Ganti password LOGIN (operator) dari halaman Pengaturan.
async function changeLoginPassword() {
  const currentEl = document.getElementById('currentLoginPassword');
  const nextEl = document.getElementById('newLoginPassword');
  const current = currentEl ? currentEl.value : '';
  const next = nextEl ? nextEl.value.trim() : '';
  if (next.length < 4) {
    showToast('Password baru minimal 4 karakter.', 'error');
    return;
  }
  try {
    const res = await fetch('/api/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      if (currentEl) currentEl.value = '';
      if (nextEl) nextEl.value = '';
      showToast('Password login berhasil diubah. Gunakan password baru saat login berikutnya.', 'success');
    } else {
      showToast(data.error || 'Gagal mengubah password login.', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke server.', 'error');
  }
}
window.changeLoginPassword = changeLoginPassword;

function exportAdminConfig() {
  const config = btoa(JSON.stringify({
    targets: APP.adminTargets
  }));
  const textarea = document.getElementById('configTextarea');
  textarea.classList.remove('hidden');
  textarea.value = config;
  textarea.select();
  navigator.clipboard.writeText(config).then(() => {
    showToast('Config disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast('Config siap dicopy dari textarea.', 'success');
  });
}

function importAdminConfig() {
  const textarea = document.getElementById('configTextarea');
  textarea.classList.remove('hidden');
  textarea.placeholder = 'Paste config di sini, lalu klik Import lagi...';

  if (textarea.value.trim()) {
    try {
      const parsed = JSON.parse(atob(textarea.value.trim()));
      APP.adminTargets = parsed.targets || [];
      // Password panel admin kini server-only — tidak diimpor dari config.
      saveAdminSettings();
      refreshAdminTable();
      textarea.value = '';
      textarea.classList.add('hidden');
      showToast('Config berhasil diimport!', 'success');
    } catch (e) {
      showToast('Format config tidak valid.', 'error');
    }
  }
}

// Indikator status simpan (dirty) — HUD Setting (Fase 3). UI-only: hanya MENCERMINKAN
// keadaan tersimpan/belum di chip #saveStat + save bar; tak mengubah cara/isi penyimpanan.
function setSettingsDirty(dirty) {
  const chip = document.getElementById('saveStat');
  if (chip) {
    chip.classList.toggle('ok', !dirty);
    chip.classList.toggle('warn', !!dirty);
    const txt = chip.querySelector('.stxt');
    if (txt) txt.textContent = dirty ? 'Perubahan belum disimpan' : 'Tersimpan';
  }
  const bar = document.querySelector('.floating-save-bar');
  if (bar) bar.classList.toggle('dirty', !!dirty);
}
window.setSettingsDirty = setSettingsDirty;

// ===================== SETTINGS MODAL HANDLERS =====================
function saveEventSettings() {
  const title = document.getElementById('inputEventTitle') ? document.getElementById('inputEventTitle').value.trim() : '';
  const subtitle = document.getElementById('inputEventSubtitle') ? document.getElementById('inputEventSubtitle').value.trim() : '';

  if (title) APP.settings.eventTitle = title;
  APP.settings.eventSubtitle = subtitle;
  // Nama Brand/Instansi (brand-word header dashboard, Fase 1) — field baru Fase 3.
  if (document.getElementById('inputBrandName')) APP.settings.brandName = document.getElementById('inputBrandName').value.trim();

  if (document.getElementById('inputFontFamily')) APP.settings.fontFamily = document.getElementById('inputFontFamily').value;
  if (document.getElementById('inputTextTransform')) APP.settings.textTransform = document.getElementById('inputTextTransform').value;
  if (document.getElementById('inputTitleColor')) APP.settings.titleColor = document.getElementById('inputTitleColor').value;
  if (document.getElementById('inputTitleSize')) APP.settings.titleSize = parseFloat(document.getElementById('inputTitleSize').value);
  if (document.getElementById('inputSubtitleColor')) APP.settings.subtitleColor = document.getElementById('inputSubtitleColor').value;
  if (document.getElementById('inputSubtitleSize')) APP.settings.subtitleSize = parseFloat(document.getElementById('inputSubtitleSize').value);
  if (document.getElementById('inputLogoShape')) APP.settings.logoShape = document.getElementById('inputLogoShape').value;
  if (document.getElementById('inputBgStyle')) APP.settings.bgStyle = document.getElementById('inputBgStyle').value;
  if (document.getElementById('inputBgOpacity')) APP.settings.bgOpacity = parseFloat(document.getElementById('inputBgOpacity').value);
  if (document.getElementById('inputPrizeFontFamily')) APP.settings.prizeFontFamily = document.getElementById('inputPrizeFontFamily').value;
  if (document.getElementById('inputPrizeTitleColor')) APP.settings.prizeTitleColor = document.getElementById('inputPrizeTitleColor').value;
  if (document.getElementById('inputReelNumberColor')) APP.settings.reelNumberColor = document.getElementById('inputReelNumberColor').value;
  if (document.getElementById('inputWinnerNumberColor')) APP.settings.winnerNumberColor = document.getElementById('inputWinnerNumberColor').value;
  if (document.getElementById('inputWinnerBgPreset')) APP.settings.winnerBgPreset = document.getElementById('inputWinnerBgPreset').value;

  // Get selected theme
  const activeSwatch = document.querySelector('.theme-swatch.active');
  if (activeSwatch) {
    APP.settings.theme = activeSwatch.dataset.theme;
  }

  // Get custom colors if custom theme
  if (APP.settings.theme === 'custom') {
    APP.settings.customColors = {
      primary: document.getElementById('customPrimary').value,
      secondary: document.getElementById('customSecondary').value,
      accent: document.getElementById('customAccent').value
    };
  }

  applyTheme(APP.settings.theme);
  applyEventSettings();
  saveSettings();
  closeModal('settingsModal');
  if (typeof setSettingsDirty === 'function') setSettingsDirty(false);
  showToast('Pengaturan berhasil disimpan!', 'success');
}

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

async function uploadImageToServer(file, category = 'image') {
  if (!file) throw new Error('File tidak ditemukan.');
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error('Format gambar harus JPG, PNG, WEBP, atau GIF.');
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('Ukuran gambar maksimal 10 MB.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) {
    throw new Error(result.error || 'Upload gambar gagal.');
  }
  return result.url;
}

async function deleteImageFromServer(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  try {
    await fetch('/api/upload/image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch (e) {
    console.warn('File lama belum dapat dihapus:', e.message);
  }
}

async function handleWinnerBgUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const oldUrl = APP.settings.winnerBgUrl;
    const url = await uploadImageToServer(file, 'winner-background');
    APP.settings.winnerBgUrl = url;
    APP.settings.winnerBgPreset = 'custom';
    if (oldUrl && oldUrl !== url) await deleteImageFromServer(oldUrl);

    const presetInput = document.getElementById('inputWinnerBgPreset');
    if (presetInput) presetInput.value = 'custom';
    const preview = document.getElementById('winnerBgPreview');
    if (preview) {
      preview.src = url;
      preview.style.display = 'block';
    }
    const uploadText = document.getElementById('winnerBgUploadText');
    if (uploadText) uploadText.style.display = 'none';
    const removeButton = document.getElementById('removeWinnerBgBtn');
    if (removeButton) removeButton.classList.remove('hidden');

    applyEventSettings();
    saveSettings();
    showToast('Background pemenang berhasil di-upload ke server.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    e.target.value = '';
  }
}

async function removeWinnerBg() {
  const oldUrl = APP.settings.winnerBgUrl;
  APP.settings.winnerBgUrl = null;
  APP.settings.winnerBgPreset = 'gold_gala';
  await deleteImageFromServer(oldUrl);

  const presetInput = document.getElementById('inputWinnerBgPreset');
  if (presetInput) presetInput.value = 'gold_gala';
  const preview = document.getElementById('winnerBgPreview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  const uploadText = document.getElementById('winnerBgUploadText');
  if (uploadText) uploadText.style.display = 'block';
  const removeButton = document.getElementById('removeWinnerBgBtn');
  if (removeButton) removeButton.classList.add('hidden');
  const fileInput = document.getElementById('winnerBgFileInput');
  if (fileInput) fileInput.value = '';

  applyEventSettings();
  saveSettings();
  showToast('Background custom dihapus.', 'info');
}

async function handleLogoUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const oldUrl = APP.settings.logoUrl;
    const url = await uploadImageToServer(file, 'logo');
    APP.settings.logoUrl = url;
    if (oldUrl && oldUrl !== url) await deleteImageFromServer(oldUrl);

    const preview = document.getElementById('logoPreview');
    if (preview) {
      preview.src = url;
      preview.style.display = 'block';
    }
    const uploadText = document.getElementById('logoUploadText');
    if (uploadText) uploadText.style.display = 'none';
    const removeButton = document.getElementById('removeLogoBtn');
    if (removeButton) removeButton.classList.remove('hidden');

    applyEventSettings();
    saveSettings();
    showToast('Logo berhasil di-upload ke server.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    e.target.value = '';
  }
}

async function removeLogo() {
  const oldUrl = APP.settings.logoUrl;
  APP.settings.logoUrl = null;
  await deleteImageFromServer(oldUrl);

  const preview = document.getElementById('logoPreview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  const uploadText = document.getElementById('logoUploadText');
  if (uploadText) uploadText.style.display = 'block';
  const removeButton = document.getElementById('removeLogoBtn');
  if (removeButton) removeButton.classList.add('hidden');
  const fileInput = document.getElementById('logoFileInput');
  if (fileInput) fileInput.value = '';

  applyEventSettings();
  saveSettings();
}

async function handleBgUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const oldUrl = APP.settings.bgUrl;
    const url = await uploadImageToServer(file, 'background');
    APP.settings.bgUrl = url;
    if (oldUrl && oldUrl !== url) await deleteImageFromServer(oldUrl);

    const preview = document.getElementById('bgPreview');
    if (preview) {
      preview.src = url;
      preview.style.display = 'block';
    }
    const uploadText = document.getElementById('bgUploadText');
    if (uploadText) uploadText.style.display = 'none';
    const removeButton = document.getElementById('removeBgBtn');
    if (removeButton) removeButton.classList.remove('hidden');
    const opacityGroup = document.getElementById('bgOpacityGroup');
    if (opacityGroup) opacityGroup.classList.remove('hidden');

    if (APP.settings.bgOpacity === undefined) APP.settings.bgOpacity = 0.15;
    applyEventSettings();
    saveSettings();
    showToast('Background berhasil di-upload ke server.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    e.target.value = '';
  }
}

async function removeBg() {
  const oldUrl = APP.settings.bgUrl;
  APP.settings.bgUrl = null;
  await deleteImageFromServer(oldUrl);

  const preview = document.getElementById('bgPreview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  const uploadText = document.getElementById('bgUploadText');
  if (uploadText) uploadText.style.display = 'block';
  const removeButton = document.getElementById('removeBgBtn');
  if (removeButton) removeButton.classList.add('hidden');
  const opacityGroup = document.getElementById('bgOpacityGroup');
  if (opacityGroup) opacityGroup.classList.add('hidden');
  const fileInput = document.getElementById('bgFileInput');
  if (fileInput) fileInput.value = '';

  applyEventSettings();
  saveSettings();
}

function openSettingsModal() {
  renderPrizeSettings();
  // Populate current values
  if (document.getElementById('inputEventTitle')) document.getElementById('inputEventTitle').value = APP.settings.eventTitle || '';
  if (document.getElementById('inputEventSubtitle')) document.getElementById('inputEventSubtitle').value = APP.settings.eventSubtitle || '';
  if (document.getElementById('inputBrandName')) document.getElementById('inputBrandName').value = APP.settings.brandName || '';

  if (document.getElementById('inputFontFamily')) document.getElementById('inputFontFamily').value = APP.settings.fontFamily || 'Outfit, sans-serif';
  if (document.getElementById('inputTextTransform')) document.getElementById('inputTextTransform').value = APP.settings.textTransform || 'uppercase';
  
  if (document.getElementById('inputTitleColor')) document.getElementById('inputTitleColor').value = APP.settings.titleColor || '#FFFFFF';
  if (document.getElementById('inputTitleSize')) {
    const tSize = APP.settings.titleSize || 2.2;
    document.getElementById('inputTitleSize').value = tSize;
    if (document.getElementById('titleSizeValue')) document.getElementById('titleSizeValue').textContent = tSize + 'rem';
  }

  const subColor = APP.settings.subtitleColor || '#FFE042';
  const subSize = APP.settings.subtitleSize || 1.0;
  if (document.getElementById('inputSubtitleColor')) document.getElementById('inputSubtitleColor').value = subColor;
  if (document.getElementById('inputSubtitleSize')) {
    document.getElementById('inputSubtitleSize').value = subSize;
    if (document.getElementById('subtitleSizeValue')) document.getElementById('subtitleSizeValue').textContent = subSize + 'rem';
  }

  if (document.getElementById('inputLogoShape')) document.getElementById('inputLogoShape').value = APP.settings.logoShape || 'rounded';
  if (document.getElementById('inputBgStyle')) document.getElementById('inputBgStyle').value = APP.settings.bgStyle || 'glass';
  if (document.getElementById('inputPrizeFontFamily')) document.getElementById('inputPrizeFontFamily').value = APP.settings.prizeFontFamily || 'Outfit, sans-serif';
  if (document.getElementById('inputPrizeTitleColor')) document.getElementById('inputPrizeTitleColor').value = APP.settings.prizeTitleColor || '#DC2626';
  if (document.getElementById('inputReelNumberColor')) document.getElementById('inputReelNumberColor').value = APP.settings.reelNumberColor || '#F8FAFC';
  if (document.getElementById('inputWinnerNumberColor')) document.getElementById('inputWinnerNumberColor').value = APP.settings.winnerNumberColor || '#FBBF24';
  if (document.getElementById('inputWinnerBgPreset')) document.getElementById('inputWinnerBgPreset').value = APP.settings.winnerBgPreset || 'gold_gala';

  // Set active theme swatch & update preview
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === APP.settings.theme);
  });

  if (APP.settings.theme === 'custom') {
    document.getElementById('customColorSection').classList.remove('hidden');
    document.getElementById('customPrimary').value = APP.settings.customColors.primary;
    document.getElementById('customSecondary').value = APP.settings.customColors.secondary;
    document.getElementById('customAccent').value = APP.settings.customColors.accent;
  } else {
    document.getElementById('customColorSection').classList.add('hidden');
  }

  updateThemePreview(APP.settings.theme || 'professional_blue');
  updateBrandingPreview();

  // Show logo preview if exists
  if (APP.settings.logoUrl) {
    const preview = document.getElementById('logoPreview');
    preview.src = APP.settings.logoUrl;
    preview.style.display = 'block';
    if (document.getElementById('logoUploadText')) document.getElementById('logoUploadText').style.display = 'none';
    if (document.getElementById('removeLogoBtn')) document.getElementById('removeLogoBtn').classList.remove('hidden');
  } else {
    if (document.getElementById('logoPreview')) document.getElementById('logoPreview').style.display = 'none';
    if (document.getElementById('logoUploadText')) document.getElementById('logoUploadText').style.display = 'block';
    if (document.getElementById('removeLogoBtn')) document.getElementById('removeLogoBtn').classList.add('hidden');
  }

  if (APP.settings.bgUrl) {
    const preview = document.getElementById('bgPreview');
    preview.src = APP.settings.bgUrl;
    preview.style.display = 'block';
    if (document.getElementById('bgUploadText')) document.getElementById('bgUploadText').style.display = 'none';
    if (document.getElementById('removeBgBtn')) document.getElementById('removeBgBtn').classList.remove('hidden');
    if (document.getElementById('bgOpacityGroup')) document.getElementById('bgOpacityGroup').classList.remove('hidden');
    
    // Set slider value
    const opacityVal = APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.65;
    if (document.getElementById('inputBgOpacity')) document.getElementById('inputBgOpacity').value = opacityVal;
    if (document.getElementById('bgOpacityValue')) document.getElementById('bgOpacityValue').textContent = Math.round(opacityVal * 100) + '%';
  } else {
    if (document.getElementById('bgPreview')) document.getElementById('bgPreview').style.display = 'none';
    if (document.getElementById('bgUploadText')) document.getElementById('bgUploadText').style.display = 'block';
    if (document.getElementById('removeBgBtn')) document.getElementById('removeBgBtn').classList.add('hidden');
    if (document.getElementById('bgOpacityGroup')) document.getElementById('bgOpacityGroup').classList.add('hidden');
  }

  if (APP.settings.winnerBgUrl) {
    const preview = document.getElementById('winnerBgPreview');
    if (preview) {
      preview.src = APP.settings.winnerBgUrl;
      preview.style.display = 'block';
    }
    if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'none';
    if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.remove('hidden');
  } else {
    if (document.getElementById('winnerBgPreview')) document.getElementById('winnerBgPreview').style.display = 'none';
    if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'block';
    if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.add('hidden');
  }

  // Segarkan pratinjau isi editor tata letak (aman: tak menyentuh working copy/posisi).
  if (APP.layoutEditor) APP.layoutEditor.refreshContent();

  openModal('settingsModal');
}

// ===================== MODAL UTILITIES =====================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
      // Handled entirely by openSettingsModal() which we just called, 
      // wait, openSettingsModal calls openModal('settingsModal').
      // Let's not duplicate logic here.
      // We will let openSettingsModal do the populating, and only keep modal open logic.
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// ===================== TOAST NOTIFICATIONS =====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===================== CUSTOM CONFIRM MODAL =====================
window.showCustomConfirm = function(title, message, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'hud-confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    const modal = document.createElement('div');
    modal.className = 'hud-confirm-modal';
    modal.style.cssText = `
      background: var(--color-surface, #1E293B);
      border: 1px solid var(--color-border-light, #334155);
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.3));
      width: 90%;
      max-width: 420px;
      padding: 24px;
      box-sizing: border-box;
      transform: scale(0.92);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-align: center;
      color: var(--color-text, #F8FAFC);
    `;

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.className = 'hud-confirm-title';
    titleEl.style.cssText = `
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: var(--color-primary, #38BDF8);
    `;

    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.className = 'hud-confirm-msg';
    msgEl.style.cssText = `
      font-family: 'Inter', sans-serif;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 24px 0;
      color: var(--color-text-muted, #94A3B8);
    `;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'hud-confirm-actions';
    btnContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.className = 'hud-confirm-cancel';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 10px 16px;
      background: var(--color-bg-secondary, #1E293B);
      border: 1px solid var(--color-border-light, #334155);
      color: var(--color-text, #F8FAFC);
      border-radius: var(--radius-md, 8px);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    cancelBtn.onmouseenter = () => cancelBtn.style.background = 'var(--color-border-light, #334155)';
    cancelBtn.onmouseleave = () => cancelBtn.style.background = 'var(--color-bg-secondary, #1E293B)';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = 'hud-confirm-ok';
    confirmBtn.style.cssText = `
      flex: 1;
      padding: 10px 16px;
      background: var(--color-primary, #38BDF8);
      border: none;
      color: #fff;
      border-radius: var(--radius-md, 8px);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    confirmBtn.onmouseenter = () => confirmBtn.style.filter = 'brightness(1.1)';
    confirmBtn.onmouseleave = () => confirmBtn.style.filter = 'none';

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    modal.appendChild(titleEl);
    modal.appendChild(msgEl);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    }, 10);

    const closeConfirm = (result) => {
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.92)';
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    cancelBtn.onclick = () => closeConfirm(false);
    confirmBtn.onclick = () => closeConfirm(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) closeConfirm(false);
    };
  });
};

// ===================== UI UPDATES =====================
function updateUI() {
  const active = getActivePeserta();
  const pesertaCount = document.getElementById('pesertaCount');
  const rondeCount = document.getElementById('rondeCount');
  const statusText = document.getElementById('statusText');
  const spinBtn = document.getElementById('spinBtn');
  const downloadExcelBtn = document.getElementById('downloadExcelBtn');

  if (pesertaCount) pesertaCount.textContent = active.length;
  if (rondeCount) rondeCount.textContent = APP.currentRonde;

  // Status tag for settings page
  const uploadStatusText = document.getElementById('uploadStatusText');
  if (uploadStatusText) {
    if (APP.dataPeserta.length > 0) {
      uploadStatusText.innerHTML = `<strong>${APP.dataPeserta.length}</strong> peserta terdaftar (${active.length} aktif)`;
      uploadStatusText.className = "status-tag success";
    } else {
      uploadStatusText.textContent = "Belum ada data peserta";
      uploadStatusText.className = "status-tag warning";
    }
  }

  if (APP.dataPeserta.length > 0) {
    const clusterInfo = APP.currentCluster !== 'Semua' ? ` (Cluster: ${APP.currentCluster})` : '';
    if (statusText) statusText.textContent = `Siap — ${active.length} Peserta Aktif${clusterInfo} | Ronde ke-${APP.currentRonde}`;
    if (spinBtn) spinBtn.disabled = active.length === 0;
    if (downloadExcelBtn) downloadExcelBtn.disabled = false;
  } else {
    if (statusText) statusText.textContent = 'Siap — Upload file Excel di Pengaturan untuk memulai';
    if (spinBtn) spinBtn.disabled = true;
    if (downloadExcelBtn) downloadExcelBtn.disabled = true;
  }
}

function previewWinnerModal(count) {
  if (count === 1) {
    showWinnerModal([{ nama: '66 (Bapak Ahmad - Militer)', jenisPeserta: 'Militer', grup: 'Batalyon 1', kelompok: 'Kelompok Utama', hadiah: 'Sepeda Motor' }]);
  } else {
    showWinnerModal([
      { nama: '66 (Bapak Ahmad)', jenisPeserta: 'Militer', grup: 'Grup A', kelompok: 'Kelompok 1', hadiah: 'Televisi' },
      { nama: '14 (Ibu Siti)', jenisPeserta: 'Warga', grup: 'Grup B', kelompok: 'Kelompok 2', hadiah: 'Televisi' },
      { nama: '236 (Budi Santoso)', jenisPeserta: 'Warga', grup: 'Grup C', kelompok: 'Kelompok 3', hadiah: 'Botol Air' },
      { nama: '110 (Letda Dian)', jenisPeserta: 'Militer', grup: 'Grup A', kelompok: 'Kelompok 1', hadiah: 'Botol Air' }
    ]);
  }
}
window.previewWinnerModal = previewWinnerModal;

// Make deleteAdminTarget globally accessible
window.deleteAdminTarget = deleteAdminTarget;




