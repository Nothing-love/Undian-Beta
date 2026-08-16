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
    theme: 'professional_blue',
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
    set('height', (it.h * SH) + 'px');
    // Netralkan batas ukuran CSS dasar agar kotak PERSIS seukuran yang diatur
    // (kalau tidak, max-width/height mengklem & item tampak lebih kecil/meleset).
    set('min-width', '0');
    set('min-height', '0');
    set('max-width', 'none');
    set('max-height', 'none');
    set('opacity', String(it.opacity != null ? it.opacity : 1));
    set('z-index', String(it.z != null ? it.z : 10));
    set('transform', it.rot ? `rotate(${it.rot}deg)` : 'none');
    // Judul & sub-judul: skalakan teks agar MENGISI kotak (ukuran kotak = ukuran
    // teks). Tanpa ini, font tetap (2.4rem/1.15rem) tampak kecil di kotak besar.
    if (id === 'title' || id === 'subtitle') fitTextToBox(el);
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
    footer: APP.settings.footerText || 'Powered by SATSIBER'
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
  }

  // Jika ini halaman admin, inisialisasi panel admin
  const adminRondeInput = document.getElementById('adminRonde');
  if (adminRondeInput && !adminRondeInput.isDummy) {
    openAdminLogin();
  }
  
  updateUI();
  
  // Start 2-second background live sync for all connected devices
  startLiveSync();
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

    // 4. Update UI Components
    updateUI();
    if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();
    if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();
    if (typeof refreshAdminTable === 'function') refreshAdminTable();
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
    colors = THEME_PRESETS[themeKey] || THEME_PRESETS.professional_blue;
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

  // Terapkan tata letak kustom panggung (null → mode flex bawaan). WAJIB di sini:
  // INILAH applyEventSettings yang AKTIF — assignment window.* ini menimpa deklarasi
  // `function applyEventSettings()` di bawah (yang jadi dead-code). Semua pemanggil
  // memakai versi ini, jadi applyLayout harus dipanggil DI SINI agar layout benar-
  // benar diterapkan di dashboard (bukan di kembarannya yang tak pernah dipakai).
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
    colors = THEME_PRESETS[themeKey] || THEME_PRESETS.professional_blue;
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

window.updateCustomThemePreview = function() {
  updateThemePreview('custom');
  applyTheme('custom');
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

// ⚠️ DEAD CODE — JANGAN dipakai untuk perubahan. Deklarasi ini DITIMPA oleh
// `window.applyEventSettings = function(){...}` di atas (assignment berjalan setelah
// hoisting), jadi versi INI tak pernah dipanggil. Logika aktif + applyLayout ada di
// versi window.* di atas. (Dulu applyLayout keliru ditaruh di sini → layout tak muncul.)
function applyEventSettings() {
  const titleEl = document.getElementById('eventTitle');
  const subtitleEl = document.getElementById('eventSubtitle');
  const customLogoEl = document.getElementById('customLogo');
  const defaultLogoEl = document.getElementById('headerLogo');

  // Update Main App Header
  if (titleEl) titleEl.textContent = APP.settings.eventTitle || 'DOORPRIZE';
  if (subtitleEl) {
    subtitleEl.textContent = APP.settings.eventSubtitle || 'Aplikasi Undian Digital';
    if (APP.settings.subtitleColor) {
      subtitleEl.style.color = APP.settings.subtitleColor;
    } else {
      subtitleEl.style.color = '';
    }
    if (APP.settings.subtitleSize) {
      subtitleEl.style.fontSize = APP.settings.subtitleSize + 'rem';
    } else {
      subtitleEl.style.fontSize = '';
    }
  }
  
  if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();

  if (APP.settings.logoUrl) {
    if (customLogoEl) customLogoEl.src = APP.settings.logoUrl;
    if (customLogoEl) customLogoEl.classList.remove('hidden');
    if (defaultLogoEl) defaultLogoEl.classList.add('hidden');
  } else {
    if (customLogoEl) customLogoEl.classList.add('hidden');
    if (defaultLogoEl) defaultLogoEl.classList.remove('hidden');
  }

  // Update Upload Screen (Initial Screen)
  const upTitle = document.getElementById('uploadTitleText');
  const upSubtitle = document.getElementById('uploadSubtitleText');
  const upLogoImg = document.getElementById('uploadLogoImg');
  const upDefLogo = document.getElementById('uploadDefaultLogo');

  if (upTitle) upTitle.textContent = APP.settings.eventTitle || 'DOORPRIZE';
  if (upSubtitle) {
    upSubtitle.textContent = APP.settings.eventSubtitle || 'Aplikasi Undian Digital Profesional';
    if (APP.settings.subtitleColor) {
      upSubtitle.style.color = APP.settings.subtitleColor;
    } else {
      upSubtitle.style.color = '';
    }
    if (APP.settings.subtitleSize) {
      upSubtitle.style.fontSize = APP.settings.subtitleSize + 'rem';
    } else {
      upSubtitle.style.fontSize = '';
    }
  }

  if (APP.settings.logoUrl) {
    if (upLogoImg) {
      upLogoImg.src = APP.settings.logoUrl;
      upLogoImg.style.display = 'block';
    }
    if (upDefLogo) upDefLogo.style.display = 'none';
  } else {
    if (upLogoImg) upLogoImg.style.display = 'none';
    if (upDefLogo) upDefLogo.style.display = 'block';
  }

  // Apply Background Image to body
  if (APP.settings.bgUrl) {
    document.documentElement.style.setProperty('--bg-image', `url("${APP.settings.bgUrl}")`);
    document.documentElement.style.setProperty('--bg-opacity', APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.15);
    document.body.classList.add('has-bg');
  } else {
    document.documentElement.style.setProperty('--bg-image', 'none');
    document.body.classList.remove('has-bg');
  }

  // Terapkan tata letak kustom (null → mode flex bawaan). Fase 1: layout selalu
  // null sampai editor (Fase 2) menghasilkannya, jadi tampilan belum berubah.
  applyLayout(APP.settings.layout);
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
    });
  });

  // Excel download & winner modal
  addEvent('downloadExcelBtn', 'click', downloadUpdatedExcel);
  addEvent('winnerCloseBtn', 'click', () => closeModal('winnerModal'));

  // Reset Undian Button
  const resetBtn = document.getElementById('resetUndianBtn');
  if (resetBtn) {
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
          <div class="slot-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <p>Siap untuk mengundi</p>
            <p class="small">Pilih jumlah pemenang lalu tekan SPIN</p>
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
                Jumlah_Pemenang: 0,
                winners: [],
                Hadiah: row.Hadiah || 'Hadiah Spesial'
              });
            }
            const rec = roundMap.get(rondeNum);
            rec.Jumlah_Pemenang++;
            const winnerStr = `${row['ID Peserta'] || row.ID_Peserta || ''} - ${row.Nama || ''} (${row['Jenis Peserta'] || row.Jenis_Peserta || 'Umum'} | ${row.Grup || row.Group || 'Umum'} | ${row.Kelompok || 'Umum'})`;
            rec.winners.push(winnerStr);
          });
          APP.hasilUndian = Array.from(roundMap.values()).map(r => ({
            Ronde_Ke: r.Ronde_Ke,
            Waktu_Pengundian: r.Waktu_Pengundian,
            Cluster_Diundi: r.Cluster_Diundi,
            Jumlah_Pemenang: r.Jumlah_Pemenang,
            Daftar_Pemenang_Keluar: r.winners.join(', '),
            Hadiah: r.Hadiah
          }));
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

function updatePesertaStatus(winners) {
  const winnerIds = new Set((winners || []).map(w => w.id));
  (APP.dataPeserta || []).forEach(p => {
    if (winnerIds.has(p.id)) {
      p.status = 'Sudah Diundi';
    }
  });
  syncPesertaDataToServer();
}

function appendHasilUndian(ronde, winners) {
  const now = new Date();
  const waktu = now.toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const prizes = APP.settings.prizes || [];
  const currentPrizes = prizes.filter(p => parseInt(p.ronde) === ronde);
  const prizeNames = currentPrizes.map(p => p.name).filter(name => name).join(', ') || 'Hadiah Spesial';

  const winnerStr = winners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');

  // ANTI-DUPLIKASI: Cek apakah ronde ini sudah ada di histori
  const existingIdx = APP.hasilUndian.findIndex(r => r.Ronde_Ke === ronde);
  if (existingIdx !== -1) {
    // Ronde sudah ada — update record yang ada, jangan push duplikat
    const existing = APP.hasilUndian[existingIdx];
    existing.Daftar_Pemenang_Keluar = winnerStr;
    existing.Jumlah_Pemenang = winners.length;
    existing.Waktu_Pengundian = waktu;
    existing.Hadiah = prizeNames;
    return;
  }

  const record = {
    Ronde_Ke: ronde,
    Waktu_Pengundian: waktu,
    Cluster_Diundi: APP.currentCluster,
    Jumlah_Pemenang: winners.length,
    Daftar_Pemenang_Keluar: winnerStr,
    Hadiah: prizeNames
  };

  APP.hasilUndian.push(record);
}

function downloadUpdatedExcel() {
  if (APP.dataPeserta.length === 0) {
    showToast('Belum ada data peserta yang dimuat.', 'warning');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Helper to parse hierarchy from winners list string
  function parseWinnersList(daftar) {
    if (!daftar || daftar === 'DIBATALKAN') return [];
    return daftar.split(', ').map(entry => {
      const parts = entry.split(' - ');
      let id = parts[0] || '';
      let nama = parts[1] || parts[0] || '';
      let jenisPeserta = 'Umum';
      let grup = 'Umum';
      let kelompok = 'Umum';
      const match = nama.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        nama = match[1];
        const hierarchyStr = match[2];
        const hierarchyParts = hierarchyStr.split(' | ');
        jenisPeserta = (hierarchyParts[0] || 'Umum').trim();
        grup = (hierarchyParts[1] || 'Umum').trim();
        kelompok = (hierarchyParts[2] || 'Umum').trim();
      }
      return { id, nama, jenisPeserta, grup, kelompok };
    });
  }

  // 1. Sheet Master: Semua Ronde
  const masterRows = [];
  APP.hasilUndian.forEach(record => {
    const winners = parseWinnersList(record.Daftar_Pemenang_Keluar);
    const prizes = APP.settings.prizes || [];
    const currentPrizes = prizes.filter(p => parseInt(p.ronde) === record.Ronde_Ke);
    const prizeName = record.Hadiah || currentPrizes.map(p => p.name).filter(n => n).join(', ') || 'Hadiah Spesial';

    winners.forEach((w, idx) => {
      masterRows.push({
        'Ronde': `Ronde ${record.Ronde_Ke}`,
        'Pemenang Urutan': idx + 1,
        'ID Peserta': w.id,
        'Nama': w.nama,
        'Jenis Peserta': w.jenisPeserta,
        'Grup': w.grup,
        'Kelompok': w.kelompok,
        'Hadiah': prizeName,
        'Waktu Pengundian': record.Waktu_Pengundian
      });
    });
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wsMaster['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Semua_Ronde');

  // 2. Sheet per Ronde (Ronde 1, Ronde 2, etc.)
  APP.hasilUndian.forEach(record => {
    const winners = parseWinnersList(record.Daftar_Pemenang_Keluar);
    const prizes = APP.settings.prizes || [];
    const currentPrizes = prizes.filter(p => parseInt(p.ronde) === record.Ronde_Ke);
    const prizeName = record.Hadiah || currentPrizes.map(p => p.name).filter(n => n).join(', ') || 'Hadiah Spesial';

    const roundRows = winners.map((w, idx) => ({
      'No': idx + 1,
      'ID Peserta': w.id,
      'Nama': w.nama,
      'Jenis Peserta': w.jenisPeserta,
      'Grup': w.grup,
      'Kelompok': w.kelompok,
      'Hadiah': prizeName,
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
let CELL_HEIGHT = 56; // must match CSS .slot-cell height
const VISIBLE_CELLS = 5; // number of cells visible in each reel
const BASE_STRIP_LENGTH = 70; // base number of cells in each strip
const EXTRA_PER_COLUMN = 12; // extra cells per column index for stagger
const BASE_DURATION = 3500; // base animation duration in ms
const STAGGER_DELAY = 450; // delay between each column stopping

// MULTI-CLUSTER DRAW RULES UI
window.addDrawRule = function() {
  const container = document.getElementById('drawRulesContainer');
  const row = document.createElement('div');
  row.className = 'draw-rule-row';
  
  let jenisOptions = '<option value="Semua">Semua Jenis</option>';
  if (APP.uniqueJenis) {
    APP.uniqueJenis.forEach(j => {
      jenisOptions += `<option value="${j}">${j === '' ? '(Kosong)' : j}</option>`;
    });
  }
  
  let grupOptions = '<option value="Semua">Semua Grup</option>';
  if (APP.uniqueGrup) {
    APP.uniqueGrup.forEach(g => {
      grupOptions += `<option value="${g}">${g === '' ? '(Kosong)' : g}</option>`;
    });
  }
  
  let kelompokOptions = '<option value="Semua">Semua Kelompok</option>';
  if (APP.uniqueKelompok) {
    APP.uniqueKelompok.forEach(k => {
      kelompokOptions += `<option value="${k}">${k === '' ? '(Kosong)' : k}</option>`;
    });
  }

  row.innerHTML = `
    <select class="jenis-select input-modern" style="flex: 1; min-width: 90px; height: 36px; padding: 0 8px; font-size: 0.85rem;">
      ${jenisOptions}
    </select>
    <select class="grup-select input-modern" style="flex: 1; min-width: 90px; height: 36px; padding: 0 8px; font-size: 0.85rem;">
      ${grupOptions}
    </select>
    <select class="kelompok-select input-modern" style="flex: 1; min-width: 90px; height: 36px; padding: 0 8px; font-size: 0.85rem;">
      ${kelompokOptions}
    </select>
    <div class="number-input-group">
      <button class="btn-num rule-decrease" onclick="decreaseRule(this)">-</button>
      <input type="number" class="rule-count" value="1" min="1" max="50" style="width: 40px; text-align: center;" />
      <button class="btn-num rule-increase" onclick="increaseRule(this)">+</button>
    </div>
    <button class="btn-remove-rule" onclick="removeRule(this)" title="Hapus">&times;</button>
  `;
  container.appendChild(row);
  
  const rows = container.querySelectorAll('.draw-rule-row');
  if (rows.length > 1) {
    rows.forEach(r => {
      const btn = r.querySelector('.btn-remove-rule');
      if (btn) btn.style.display = 'block';
    });
  }
}

window.removeRule = function(btn) {
  const container = document.getElementById('drawRulesContainer');
  const row = btn.closest('.draw-rule-row');
  if (container.querySelectorAll('.draw-rule-row').length > 1) {
    row.remove();
  }
  
  const rows = container.querySelectorAll('.draw-rule-row');
  if (rows.length === 1) {
    const removeBtn = rows[0].querySelector('.btn-remove-rule');
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

window.decreaseRule = function(btn) {
  const input = btn.nextElementSibling;
  let val = parseInt(input.value) || 1;
  if (val > 1) input.value = val - 1;
}

window.increaseRule = function(btn) {
  const input = btn.previousElementSibling;
  let val = parseInt(input.value) || 1;
  if (val < 100) input.value = val + 1;
}

window.handleSpin = function() {
  if (APP.isSpinning) {
    const isManual = document.getElementById('manualStopToggle') && document.getElementById('manualStopToggle').checked;
    if (isManual) triggerManualStop();
    return;
  }

  // Read single unified round configuration for APP.currentRonde
  let rules = [];
  const prizes = APP.settings.prizes || [];
  const currentPrizes = prizes.filter(p => parseInt(p.ronde) === APP.currentRonde);

  if (currentPrizes.length > 0) {
    currentPrizes.forEach(p => {
      rules.push({
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
    if (t.status === 'Belum Dieksekusi' && t.ronde !== APP.currentRonde) {
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
    spinBtn.textContent = '🛑 STOP';
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
    spinBtn.innerHTML = '<span class="spin-icon">🏆</span> SPIN';
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
  spinBtn.innerHTML = '<span class="spin-icon">🏆</span> SPIN';
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

    const rondeIndex = APP.currentRonde - 1;
    const record = APP.hasilUndian.find(r => r.Ronde_Ke === rondeIndex);
    if (record) {
      record.Daftar_Pemenang_Keluar = APP.lastWinners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');
      record.Jumlah_Pemenang = APP.lastWinners.length;
    }
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
      .filter(t => t.ronde === APP.currentRonde && t.status !== 'Sudah Dieksekusi');
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

    // 1. Eksekusi target adm1n untuk ronde ini (jika ada)
    targetStates.forEach(state => {
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
          ruleWinners.push({
            id: targetPeserta.id,
            nama: targetPeserta.nama,
            jenisPeserta: targetPeserta.jenisPeserta,
            grup: targetPeserta.grup,
            kelompok: targetPeserta.kelompok,
            cluster: targetPeserta.cluster,
            originalRule: {
              jenis: rule.jenis || 'Semua',
              grup: rule.grup || 'Semua',
              kelompok: rule.kelompok || 'Semua'
            }
          });

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
          ruleWinners.push({
            id: candidate.id,
            nama: candidate.nama,
            jenisPeserta: candidate.jenisPeserta,
            grup: candidate.grup,
            kelompok: candidate.kelompok,
            cluster: candidate.cluster,
            originalRule: {
              jenis: rule.jenis || 'Semua',
              grup: rule.grup || 'Semua',
              kelompok: rule.kelompok || 'Semua'
            }
          });
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
          ruleWinners.push({
            id: candidate.id,
            nama: candidate.nama,
            jenisPeserta: candidate.jenisPeserta,
            grup: candidate.grup,
            kelompok: candidate.kelompok,
            cluster: candidate.cluster,
            originalRule: {
              jenis: rule.jenis || 'Semua',
              grup: rule.grup || 'Semua',
              kelompok: rule.kelompok || 'Semua'
            }
          });
          const pIdx = currentActive.findIndex(p => p.id === candidate.id);
          if (pIdx > -1) currentActive.splice(pIdx, 1);
        }
      }
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

  // Acak urutan tampilan pemenang di reel
  for (let i = allWinners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allWinners[i], allWinners[j]] = [allWinners[j], allWinners[i]];
  }
  return allWinners;
}

function getAdminTarget(ronde, clusterName) {
  if (!APP.adminTargets) return null;
  return APP.adminTargets.find(t =>
    t.ronde === ronde &&
    (t.cluster === 'Semua' || clusterName === 'Semua' || t.cluster === clusterName) &&
    t.status !== 'Sudah Dieksekusi'
  );
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
  CELL_HEIGHT = 56;
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
  let cols = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * aspect))));
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
  // Ukur ruang tersedia dgn font minimum dulu (agar tinggi kartu = tinggi baris grid,
  // stabil & tak dipengaruhi tinggi nama itu sendiri).
  el.style.setProperty('font-size', minPx + 'px', 'important');
  const cardH = card ? card.clientHeight : el.clientHeight;
  const cs = card ? getComputedStyle(card) : null;
  const padV = cs ? (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) : 0;
  const headerH = header ? header.offsetHeight : 0;
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
}

function showWinnerModal(winners) {
  const rondeSpan = document.getElementById('winnerRonde');
  if (rondeSpan) rondeSpan.textContent = APP.currentRonde - 1;

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

      // Build category breadcrumb from non-empty properties
      const categoryParts = [];
      if (winner.jenisPeserta && winner.jenisPeserta.trim()) categoryParts.push(winner.jenisPeserta.trim());
      if (winner.grup && winner.grup.trim()) categoryParts.push(winner.grup.trim());
      if (winner.kelompok && winner.kelompok.trim()) categoryParts.push(winner.kelompok.trim());
      const categoryText = categoryParts.join(' | ');
      const categoryBadge = categoryText ? `<span class="winner-card-cluster">${categoryText}</span>` : '';

      card.innerHTML =
        '<div class="winner-card-header">' +
          '<span class="winner-card-number">#' + (idx + 1) + '</span>' +
          categoryBadge +
        '</div>' +
        '<div class="winner-card-name" title="' + winner.nama + '">' + winner.nama + '</div>' +
        '<button class="btn-disqualify" title="Gugurkan peserta ini" onclick="disqualifyWinner(' + idx + ')">&times;</button>';
      cardsContainer.appendChild(card);
    });

    cardsContainer.scrollTop = 0;
  }

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
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('#winnerCards .winner-card-name').forEach(el => fitWinnerName(el, range[0], range[1]));
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
window.disqualifyWinner = async function(idx) {
  const ok = await showCustomConfirm('Gugurkan Pemenang', 'Yakin gugurkan pemenang ini? Sistem akan otomatis mengundi pengganti.');
  if (!ok) return;

  const disqualified = APP.lastWinners[idx];
  if (!disqualified) return;

  // Tandai peserta sebagai gugur
  (APP.dataPeserta || []).forEach(function(p) {
    if (p.id === disqualified.id) p.status = 'Gugur';
  });

  // Hapus dari list pemenang
  APP.lastWinners.splice(idx, 1);

  // Update histori
  const rondeIndex = APP.currentRonde - 1;
  const record = APP.hasilUndian.find(function(r) { return r.Ronde_Ke === rondeIndex; });
  if (record) {
    const sisa = APP.lastWinners.map(function(w) {
      return `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`;
    }).join(', ');
    record.Daftar_Pemenang_Keluar = sisa || 'DIBATALKAN';
  }

  saveSettings();
  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();

  closeModal('winnerModal');
  showToast('Mencari pengganti untuk ' + disqualified.nama + '...', 'info');

  setTimeout(function() {
    let rules;
    if (disqualified.originalRule) {
      rules = [{
        jenis: disqualified.originalRule.jenis || 'Semua',
        grup: disqualified.originalRule.grup || 'Semua',
        kelompok: disqualified.originalRule.kelompok || 'Semua',
        count: 1
      }];
    } else {
      const replacementCluster = disqualified.cluster || 'Semua';
      rules = [{ cluster: replacementCluster, count: 1 }];
    }

    const activePesertaTotal = getActivePeserta();
    const unavailableIds = getUnavailableParticipantIds();
    const currentActive = activePesertaTotal.filter(p => !unavailableIds.has(p.id));
    const available = currentActive.filter(p => matchRuleParticipant(p, rules[0]));

    if (available.length === 0) {
      showToast('Tidak ada peserta pengganti yang cocok dengan kriteria hadiah ini.', 'error');
      if (APP.lastWinners.length > 0) showWinnerModal(APP.lastWinners);
      return;
    }
    executeSpinMulti(rules, 1, true);
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

  if (n === 0) {
    displayEl.className = 'prize-display';
    displayEl.innerHTML = `
      <div class="prize-empty">
        <div class="prize-empty-ronde">RONDE ${APP.currentRonde}</div>
        <div class="prize-empty-sub">Belum ada hadiah untuk ronde ini</div>
      </div>`;
    return;
  }

  // Layout ADAPTIF hadiah: SATU jalur kode untuk BERAPA PUN jumlah hadiah, selalu
  // MENGISI kolom (tanpa ruang kosong). Tiap kartu flex:1 → tinggi terbagi rata.
  //  • 1–3 hadiah → kartu vertikal (foto besar di atas, nama + jumlah di bawah).
  //  • ≥4 hadiah  → baris ringkas (thumbnail kiri, nama + jumlah kanan); scroll
  //    otomatis bila terlalu banyak. Warna/aksen IKUT tema (bukan pink hardcode).
  const compact = n >= 4;
  const mode = compact ? ' prize-rows' : (n === 1 ? ' prize-cards prize-single' : ' prize-cards');
  displayEl.className = 'prize-display prize-adaptive' + mode;

  displayEl.innerHTML = mergedPrizes.map((prize) => {
    const imageHtml = prize.imageUrl
      ? `<div class="prize-card-img"><img src="${prize.imageUrl}" alt="${prize.name}" /></div>`
      : `<div class="prize-card-img prize-card-img--empty">🎁</div>`;
    const countHtml = prize.count
      ? `<div class="prize-card-count"><span class="pc-num">${prize.count}</span><span class="pc-label">Pemenang</span></div>`
      : '';
    return `
      <div class="prize-card">
        ${imageHtml}
        <div class="prize-card-body">
          <div class="prize-card-name" title="${prize.name}">${prize.name}</div>
          ${countHtml}
        </div>
      </div>`;
  }).join('');
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
  saveSettings();
  updatePrizeSidebar();
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
  if (loginBox) loginBox.style.display = 'block';
  
  const wrapper = document.getElementById('adminPanelWrapper');
  if (wrapper) wrapper.style.display = 'none';
  openModal('adminLoginModal');
  setTimeout(() => document.getElementById('adminPassword').focus(), 100);
}

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
  refreshAdminTable();
  const rondeInput = document.getElementById('adminRonde');
  if (rondeInput) {
    rondeInput.value = APP.currentRonde;
    rondeInput.min = APP.currentRonde;
  }
  
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
  const count = container ? container.querySelectorAll('.target-chip').length : 0;
  const el = document.getElementById('targetChipCount');
  if (el) el.textContent = '(' + count + ' dipilih)';
}

// ===================== PESERTA LIST MODAL =====================

window.openPesertaListModal = function(btnEl) {
  document.getElementById('searchPesertaInput').value = '';
  filterPesertaList();
  openModal('pesertaListModal');
};

window.filterPesertaList = function() {
  const q = document.getElementById('searchPesertaInput').value.toLowerCase();
  const adminCluster = document.getElementById('adminCluster');
  const filterCluster = adminCluster ? adminCluster.value : 'Semua';
  const container = document.getElementById('pesertaListContainer');
  
  // Get all previous winners so we can mark them
  const prevWinners = getAllPreviousWinners();
  
  // Get currently selected targets
  const chipContainer = document.getElementById('targetChipContainer');
  const selectedIds = chipContainer ? Array.from(chipContainer.querySelectorAll('.target-chip')).map(c => c.dataset.id) : [];
  
  // Get all pending targets from adminTargets
  const pendingTargets = {};
  (APP.adminTargets || []).forEach(t => {
    if (t.status !== 'Sudah Dieksekusi') {
      (t.targets || []).forEach(id => {
        pendingTargets[id] = t.ronde;
      });
    }
  });

  const filtered = APP.dataPeserta.filter(p => {
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
    const targetedRonde = pendingTargets[p.id];
    
    const metaParts = [];
    if (p.id) metaParts.push('ID: ' + p.id);
    if (p.jenisPeserta && p.jenisPeserta.trim()) metaParts.push(p.jenisPeserta.trim());
    if (p.grup && p.grup.trim()) metaParts.push(p.grup.trim());
    if (p.kelompok && p.kelompok.trim()) metaParts.push(p.kelompok.trim());
    if (metaParts.length === 1 && p.cluster && p.cluster.trim()) metaParts.push(p.cluster.trim());
    const metaStr = metaParts.join(' | ');

    let actionHtml = '';
    const isDisabled = p.status === 'Gugur' || p.status === 'Sudah Diundi' || targetedRonde !== undefined;
    
    if (p.status === 'Gugur') {
      actionHtml = '<span style="color:#DC2626; font-size:0.75rem; font-weight:600;">Gugur (Diskualifikasi)</span>';
    } else if (p.status === 'Sudah Diundi') {
      actionHtml = '<span style="color:#2563EB; font-size:0.75rem; font-weight:600;">Sudah Menang</span>';
    } else if (targetedRonde !== undefined) {
      actionHtml = `<span style="color:#D97706; font-size:0.75rem; font-weight:600;">Target Ronde ${targetedRonde}</span>`;
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
  const ronde = parseInt(document.getElementById('adminRonde').value);
  if (!ronde || ronde < APP.currentRonde) {
    showToast('Ronde ini sudah terlewat! Silakan pilih ronde ' + APP.currentRonde + ' atau setelahnya.', 'error');
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

  // Validate: targets must not already be reserved in another pending admin target
  const pendingTargets = {};
  (APP.adminTargets || []).forEach(t => {
    if (t.status === 'Belum Dieksekusi' && !(t.ronde === ronde && (t.cluster || 'Semua') === cluster)) {
      (t.targets || []).forEach(id => {
        pendingTargets[id] = t.ronde;
      });
    }
  });

  const alreadyTargeted = targets.filter(id => pendingTargets[id] !== undefined);
  if (alreadyTargeted.length > 0) {
    const names = alreadyTargeted.map(id => {
      const p = APP.dataPeserta.find(p => p.id === id);
      return p ? p.nama : id;
    });
    showToast('Peserta "' + names.join(', ') + '" sudah ditargetkan untuk Ronde ' + pendingTargets[alreadyTargeted[0]] + '!', 'error');
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

  // Validate (BUG-1): total target ronde ini tak boleh melebihi jumlah pemenang
  // (total count hadiah ronde; tanpa hadiah = fallback 1). Termasuk target cluster
  // lain yang masih menunggu di ronde yang sama, agar tak ada yang terkunci saat spin.
  const roundPrizes = (APP.settings.prizes || []).filter(p => parseInt(p.ronde) === ronde);
  const roundCapacity = roundPrizes.length
    ? roundPrizes.reduce((sum, p) => sum + (parseInt(p.count) || 0), 0)
    : 1;
  const otherReservedSameRonde = (APP.adminTargets || [])
    .filter(t => t.ronde === ronde && (t.cluster || 'Semua') !== cluster && t.status === 'Belum Dieksekusi')
    .reduce((sum, t) => sum + (t.targets || []).length, 0);
  const totalForRonde = targets.length + otherReservedSameRonde;
  if (totalForRonde > roundCapacity) {
    showToast(`Total target Ronde ${ronde} (${totalForRonde}) melebihi jumlah pemenang ronde (${roundCapacity}). Kurangi target atau tambah jumlah hadiah ronde ini.`, 'error');
    return;
  }

  // Validate (BUG-2): tiap target harus cocok minimal satu aturan hadiah ronde tsb;
  // bila tidak, target pasti dilewati saat spin (rig gagal keluar). Lewati cek ini
  // bila ronde tak punya hadiah (aturan fallback 'Semua' menerima semua orang).
  if (roundPrizes.length) {
    const roundRules = roundPrizes.map(p => ({
      jenis: p.jenis || 'Semua', grup: p.grup || 'Semua', kelompok: p.kelompok || 'Semua'
    }));
    const incompatible = targets.filter(id => {
      const p = APP.dataPeserta.find(x => x.id === id);
      if (!p) return false;
      return !roundRules.some(rule => matchRuleParticipant(p, rule));
    });
    if (incompatible.length > 0) {
      const incNames = incompatible.map(id => {
        const p = APP.dataPeserta.find(x => x.id === id);
        return p ? p.nama : id;
      });
      showToast(`Target "${incNames.join(', ')}" tak cocok aturan hadiah Ronde ${ronde} (hadiah khusus jenis/grup/kelompok tertentu) sehingga akan terlewati. Sesuaikan target atau aturan hadiah.`, 'error');
      return;
    }
  }

  // Remove existing target for this ronde and cluster if any
  APP.adminTargets = APP.adminTargets.filter(t => !(t.ronde === ronde && (t.cluster || 'Semua') === cluster));

  // Add new target
  APP.adminTargets.push({
    cluster: cluster,
    ronde: ronde,
    targets: targets,
    status: 'Belum Dieksekusi'
  });

  saveAdminSettings();
  refreshAdminTable();

  // Reset chip container dan input
  if (chipContainer) chipContainer.innerHTML = '';
  updateTargetChipCount();

  showToast('Target Ronde ' + ronde + ' (' + targets.length + ' orang) berhasil disimpan.', 'success');
}

function refreshAdminTable() {
  const tbody = document.getElementById('adminTargetBody');
  if (!tbody) return; // halaman non-adm1n (mis. dashboard) tak punya tabel ini

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

  // Sort by ronde
  const sorted = [...APP.adminTargets].sort((a, b) => a.ronde - b.ronde);

  tbody.innerHTML = sorted.map((t, index) => {
    const statusClass = t.status === 'Sudah Dieksekusi' ? 'executed' : (t.status === 'Terlewati' ? 'skipped' : 'pending');
    const statusLabel = t.status === 'Sudah Dieksekusi' ? 'Sudah Dieksekusi' : (t.status === 'Terlewati' ? 'Terlewati' : 'Menunggu');
    const detailHtml = t.targets.map(id => {
      const f = fateOf(id, t.ronde);
      return '<div style="margin-bottom:6px; line-height:1.3;"><strong>' + f.nama + '</strong><br/>' +
             '<span style="font-size:0.72rem; font-weight:600; color:' + f.color + ';">' + f.label + '</span></div>';
    }).join('');
    return '<tr>' +
      '<td><strong>' + (t.cluster || 'Semua') + '</strong></td>' +
      '<td><strong>Ronde ' + t.ronde + '</strong></td>' +
      '<td style="max-width:260px; word-break:break-word;">' + detailHtml + '</td>' +
      '<td><span class="admin-status ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td><button class="btn btn-small btn-danger" onclick="deleteAdminTarget(' + index + ')" title="Hapus target ini">Hapus</button></td>' +
      '</tr>';
  }).join('');
}

async function deleteAdminTarget(index) {
  const sorted = [...APP.adminTargets].sort((a, b) => a.ronde - b.ronde);
  const targetToDelete = sorted[index];
  
  if (!targetToDelete) return;
  
  const names = targetToDelete.targets.map(id => {
    const p = APP.dataPeserta.find(p => p.id === id);
    return p ? p.nama : id;
  }).join(', ');
  
  const ok = await showCustomConfirm(
    'Hapus Target',
    'Hapus target: "' + names + '" di Ronde ' + targetToDelete.ronde + ' (' + (targetToDelete.cluster || 'Semua') + ')? Tindakan ini tidak bisa dibatalkan.'
  );
  if (!ok) return;
  
  APP.adminTargets = APP.adminTargets.filter(t => t !== targetToDelete);
  saveAdminSettings();
  refreshAdminTable();
  showToast('Target Ronde ' + targetToDelete.ronde + ' berhasil dihapus.', 'success');
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

// ===================== SETTINGS MODAL HANDLERS =====================
function saveEventSettings() {
  const title = document.getElementById('inputEventTitle') ? document.getElementById('inputEventTitle').value.trim() : '';
  const subtitle = document.getElementById('inputEventSubtitle') ? document.getElementById('inputEventSubtitle').value.trim() : '';

  if (title) APP.settings.eventTitle = title;
  APP.settings.eventSubtitle = subtitle;

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
    titleEl.style.cssText = `
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: var(--color-primary, #38BDF8);
    `;

    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.cssText = `
      font-family: 'Inter', sans-serif;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 24px 0;
      color: var(--color-text-muted, #94A3B8);
    `;

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
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
    showWinnerModal([{ nama: '66 (Bapak Ahmad - Militer)', jenisPeserta: 'Militer', grup: 'Batalyon 1', kelompok: 'Kelompok Utama' }]);
  } else {
    showWinnerModal([
      { nama: '66 (Bapak Ahmad)', jenisPeserta: 'Militer', grup: 'Grup A', kelompok: 'Kelompok 1' },
      { nama: '14 (Ibu Siti)', jenisPeserta: 'Warga', grup: 'Grup B', kelompok: 'Kelompok 2' },
      { nama: '236 (Budi Santoso)', jenisPeserta: 'Warga', grup: 'Grup C', kelompok: 'Kelompok 3' },
      { nama: '110 (Letda Dian)', jenisPeserta: 'Militer', grup: 'Grup A', kelompok: 'Kelompok 1' }
    ]);
  }
}
window.previewWinnerModal = previewWinnerModal;

// Make deleteAdminTarget globally accessible
window.deleteAdminTarget = deleteAdminTarget;




