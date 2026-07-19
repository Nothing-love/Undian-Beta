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
  currentCluster: 'Semua',
  isSpinning: false,
  lastWinners: [],
  settings: {
    eventTitle: 'DORPRIZE',
    eventSubtitle: 'Aplikasi Undian Digital',
    logoBase64: null,
    theme: 'professional_blue',
    customColors: { primary: '#2563EB', secondary: '#7C3AED', accent: '#F59E0B' },
    prizes: []
  }
};

// Admin stored under innocuous key
const ADMIN_STORAGE_KEY = '_sys_pref_cache';
const SETTINGS_STORAGE_KEY = 'dorprize_settings';
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

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  loadAdminSettings();
  checkRemoteAccess();
  bindEvents();
  
  // Ambil state utuh dari server pada saat startup
  await syncPesertaDataFromRemote();
  
  // Jika ini halaman pengaturan, populasi data input settings
  const inputTitle = document.getElementById('inputEventTitle');
  if (inputTitle && !inputTitle.isDummy) {
    openSettingsModal();
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

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(APP.settings, parsed);
    }
  } catch (e) { /* ignore */ }
  applyTheme(APP.settings.theme);
  applyEventSettings();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(APP.settings));
  const ts = Date.now();
  APP.lastSyncTs = ts;

  if (window.location.protocol !== 'file:') {
    const payloadPeserta = {
      dataPeserta: APP.dataPeserta || [],
      availableClusters: APP.availableClusters || [],
      hasilUndian: APP.hasilUndian || [],
      currentRonde: APP.currentRonde || 1,
      settings: APP.settings,
      timestamp: ts
    };

    const payload = {
      settings: APP.settings,
      peserta: payloadPeserta,
      admin: {
        targets: APP.adminTargets || [],
        password: APP.adminPassword || 'admin'
      },
      timestamp: ts
    };

    fetch('/api/peserta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadPeserta)
    }).catch(e => console.log('Peserta sync POST error'));

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.log('State sync POST error'));
  }
}

function loadAdminSettings() {
  try {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(atob(saved));
      APP.adminTargets = parsed.targets || [];
      APP.adminPassword = parsed.password || 'admin2026';
    } else {
      APP.adminTargets = [];
      APP.adminPassword = 'admin2026';
    }
  } catch (e) {
    APP.adminTargets = [];
    APP.adminPassword = 'admin2026';
  }
}

function saveAdminSettings() {
  APP.lastAdminSaveTime = Date.now();
  const ts = Date.now();
  APP.lastSyncTs = ts;

  const payload = {
    targets: APP.adminTargets,
    password: APP.adminPassword
  };
  
  const data = btoa(JSON.stringify(payload));
  localStorage.setItem(ADMIN_STORAGE_KEY, data);

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

async function syncStateWithServer() {
  if (window.location.protocol === 'file:') return;
  if (APP.isSpinning) return; // Do not interrupt rolling animation

  try {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;

    const serverTs = data.timestamp || 0;

    if (serverTs > (APP.lastSyncTs + 500)) {
      APP.lastSyncTs = serverTs;

      // 1. Sync Settings
      if (data.settings && data.settings.eventTitle !== undefined) {
        Object.assign(APP.settings, data.settings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(APP.settings));
        applyTheme(APP.settings.theme);
        applyEventSettings();
      }

      // 2. Sync Peserta & Winners
      if (data.peserta) {
        if (data.peserta.dataPeserta && (data.peserta.dataPeserta.length > 0 || (APP.dataPeserta || []).length === 0)) {
          APP.dataPeserta = data.peserta.dataPeserta;
          computeUniqueCategories();
        }
        if (data.peserta.availableClusters && data.peserta.availableClusters.length > 0) {
          APP.availableClusters = data.peserta.availableClusters;
        }
        if (data.peserta.hasilUndian) APP.hasilUndian = data.peserta.hasilUndian;
        if (data.peserta.currentRonde !== undefined) APP.currentRonde = data.peserta.currentRonde;
        if (data.peserta.settings && (!data.settings || !data.settings.eventTitle)) {
          Object.assign(APP.settings, data.peserta.settings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(APP.settings));
          applyTheme(APP.settings.theme);
          applyEventSettings();
        }
      }

      // 3. Sync Admin Targets
      if (data.admin && data.admin.targets) {
        const currentTargetsStr = JSON.stringify(APP.adminTargets);
        const newTargetsStr = JSON.stringify(data.admin.targets);
        
        if (currentTargetsStr !== newTargetsStr) {
          APP.adminTargets = data.admin.targets;
          if (data.admin.password) APP.adminPassword = data.admin.password;
          
          const localData = btoa(JSON.stringify(data.admin));
          localStorage.setItem(ADMIN_STORAGE_KEY, localData);
        }
      }

      // 4. Update UI Components
      updateUI();
      if (typeof updatePrizeSidebar === 'function') updatePrizeSidebar();
      if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();
      if (typeof refreshAdminTable === 'function') refreshAdminTable();
      if (typeof renderPrizeSettings === 'function') renderPrizeSettings();
    }
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

async function syncPesertaDataFromRemote() {
  if (window.location.protocol === 'file:') return;
  try {
    const res = await fetch('/api/peserta');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (data.dataPeserta) {
          APP.dataPeserta = data.dataPeserta;
          computeUniqueCategories();
        }
        if (data.availableClusters) APP.availableClusters = data.availableClusters;
        if (data.hasilUndian) APP.hasilUndian = data.hasilUndian;
        if (data.currentRonde !== undefined) APP.currentRonde = data.currentRonde;
        if (data.settings) {
          APP.settings = data.settings;
          // Apply settings immediately
          applyTheme(APP.settings.theme);
          applyEventSettings();
        }
        
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
    }
  } catch(e) {}
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
  const titleColor = APP.settings.titleColor || '#FFFFFF';
  const titleSize = (APP.settings.titleSize || 2.2) + 'rem';
  const subColor = APP.settings.subtitleColor || '#FFE042';
  const subSize = (APP.settings.subtitleSize || 1.0) + 'rem';
  const logoShape = APP.settings.logoShape || 'rounded';
  const bgStyle = APP.settings.bgStyle || 'glass';
  const bgOpacity = APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.65;

  const prizeFont = APP.settings.prizeFontFamily || "'Outfit', sans-serif";
  const prizeTitleColor = APP.settings.prizeTitleColor || '#B91C1C';
  const reelNumColor = APP.settings.reelNumberColor || '';
  const winnerNumColor = APP.settings.winnerNumberColor || '';

  root.style.setProperty('--font-event', font);
  root.style.setProperty('--text-transform-event', transform);
  root.style.setProperty('--title-color-event', titleColor);
  root.style.setProperty('--title-size-event', titleSize);
  root.style.setProperty('--subtitle-color-event', subColor);
  root.style.setProperty('--subtitle-size-event', subSize);
  root.style.setProperty('--prize-font-family', prizeFont);
  root.style.setProperty('--prize-title-color', prizeTitleColor);
  if (reelNumColor) root.style.setProperty('--reel-number-color', reelNumColor);
  if (winnerNumColor) root.style.setProperty('--winner-number-color', winnerNumColor);

  const titleEls = document.querySelectorAll('.event-title, .header-title, #eventTitleDisplay, #miniTitle');
  titleEls.forEach(el => {
    if (el) {
      if (APP.settings.eventTitle && el.id !== 'miniTitle') el.textContent = APP.settings.eventTitle;
      el.style.fontFamily = font;
      el.style.textTransform = transform;
      el.style.color = titleColor;
      el.style.fontSize = titleSize;
    }
  });

  const subEls = document.querySelectorAll('.event-subtitle, .header-subtitle, #eventSubtitleDisplay, #miniSubtitle');
  subEls.forEach(el => {
    if (el) {
      if (APP.settings.eventSubtitle && el.id !== 'miniSubtitle') el.textContent = APP.settings.eventSubtitle;
      el.style.fontFamily = font;
      el.style.textTransform = transform;
      el.style.color = subColor;
      el.style.fontSize = subSize;
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

  if (APP.settings.logoBase64) {
    if (defaultLogo) defaultLogo.style.display = 'none';
    if (customLogo) {
      customLogo.src = APP.settings.logoBase64;
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

  if (APP.settings.bgBase64) {
    root.style.setProperty('--bg-image', `url(${APP.settings.bgBase64})`);
    root.style.setProperty('--bg-opacity', bgOpacity);
    document.body.classList.add('has-bg');
  } else {
    root.style.setProperty('--bg-image', 'none');
    document.body.classList.remove('has-bg');
  }
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

  const titleVal = document.getElementById('inputEventTitle') ? document.getElementById('inputEventTitle').value.trim() : '';
  const subtitleVal = document.getElementById('inputEventSubtitle') ? document.getElementById('inputEventSubtitle').value.trim() : '';

  const miniTitle = document.getElementById('miniTitle');
  const miniSubtitle = document.getElementById('miniSubtitle');
  if (miniTitle) {
    miniTitle.textContent = titleVal || APP.settings.eventTitle || 'DORPRIZE EVENT';
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

  const logoPrev = document.getElementById('logoPreview');
  if (logoPrev) {
    logoPrev.className = logoPrev.className.replace(/logo-shape-\w+/g, '').trim();
    logoPrev.classList.add(`logo-shape-${logoShape}`);
  }

  document.body.className = document.body.className.replace(/bg-filter-\w+/g, '').trim();
  document.body.classList.add(`bg-filter-${bgStyle}`);
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

  if (miniTitle) miniTitle.textContent = titleVal || APP.settings.eventTitle || 'DORPRIZE EVENT';
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

function applyEventSettings() {
  const titleEl = document.getElementById('eventTitle');
  const subtitleEl = document.getElementById('eventSubtitle');
  const customLogoEl = document.getElementById('customLogo');
  const defaultLogoEl = document.getElementById('headerLogo');

  // Update Main App Header
  if (titleEl) titleEl.textContent = APP.settings.eventTitle || 'DORPRIZE';
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

  if (APP.settings.logoBase64) {
    if (customLogoEl) customLogoEl.src = APP.settings.logoBase64;
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

  if (upTitle) upTitle.textContent = APP.settings.eventTitle || 'DORPRIZE';
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

  if (APP.settings.logoBase64) {
    if (upLogoImg) {
      upLogoImg.src = APP.settings.logoBase64;
      upLogoImg.style.display = 'block';
    }
    if (upDefLogo) upDefLogo.style.display = 'none';
  } else {
    if (upLogoImg) upLogoImg.style.display = 'none';
    if (upDefLogo) upDefLogo.style.display = 'block';
  }

  // Apply Background Image to body
  if (APP.settings.bgBase64) {
    document.documentElement.style.setProperty('--bg-image', `url("${APP.settings.bgBase64}")`);
    document.documentElement.style.setProperty('--bg-opacity', APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.15);
    document.body.classList.add('has-bg');
  } else {
    document.documentElement.style.setProperty('--bg-image', 'none');
    document.body.classList.remove('has-bg');
  }
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
    resetBtn.addEventListener('click', () => {
      if (APP.dataPeserta.length === 0) {
        showToast('Belum ada data peserta yang dimuat.', 'warning');
        return;
      }
      if (!confirm('⚠️ PERINGATAN!\n\nApakah Anda yakin ingin mereset hasil undian?\nTindakan ini akan mengembalikan Ronde ke ronde 1, menghapus daftar pemenang yang keluar, dan membuat semua peserta aktif kembali.')) {
        return;
      }

      // Reset state
      APP.hasilUndian = [];
      APP.currentRonde = 1;
      APP.dataPeserta.forEach(p => {
        p.status = 'Belum Diundi';
      });

      // Reset admin targets
      if (APP.adminTargets) {
        APP.adminTargets.forEach(t => {
          t.status = 'Belum Dieksekusi';
        });
        saveAdminSettings();
      }

      // Save and sync settings
      saveSettings();

      // Reset slot machine UI
      const slotMachine = document.getElementById('slotMachine');
      if (slotMachine) {
        slotMachine.className = 'slot-machine';
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

  // Secret keyboard shortcut: Ctrl+Shift+F12
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
      e.preventDefault();
      openAdminLogin();
    }
  });
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

        return {
          id: idVal || `PST-${String(index + 1).padStart(3, '0')}`,
          nama: nameVal,
          jenisPeserta: jVal,
          grup: gVal,
          kelompok: kVal,
          cluster: jVal,
          status: sVal === 'Sudah Diundi' ? 'Sudah Diundi' : 'Belum Diundi'
        };
      }).filter(Boolean);

      if (APP.dataPeserta.length === 0) {
        showToast('Tidak ada data peserta valid yang ditemukan di file Excel.', 'error');
        return;
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

      // Parse Sheet 2 (Hasil_Undian if present)
      let sheet2 = APP.workbook.Sheets['Hasil_Undian'] || APP.workbook.Sheets['Hasil Undian'] || APP.workbook.Sheets['Hasil'];
      if (sheet2) {
        APP.hasilUndian = XLSX.utils.sheet_to_json(sheet2);
        APP.currentRonde = APP.hasilUndian.length + 1;
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

function computeUniqueCategories() {
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

  const changed = sanitizePrizeRules();
  if (changed && typeof saveSettings === 'function') {
    saveSettings();
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
  // Collect all winners from history (rigged or not) to prevent duplicates
  const winners = new Set();
  APP.dataPeserta.forEach(p => {
    if (p.status === 'Sudah Diundi') winners.add(p.nama);
  });
  // Also check admin targets for future rounds that have been executed
  if (APP.adminTargets) {
    APP.adminTargets.forEach(t => {
      if (t.status === 'Sudah Dieksekusi') {
        t.targets.forEach(name => winners.add(name));
      }
    });
  }
  return winners;
}

function updatePesertaStatus(winners) {
  winners.forEach(winner => {
    const peserta = APP.dataPeserta.find(p => p.nama === winner.nama && p.status === 'Belum Diundi');
    if (peserta) {
      peserta.status = 'Sudah Diundi';
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

  const record = {
    Ronde_Ke: ronde,
    Waktu_Pengundian: waktu,
    Cluster_Diundi: APP.currentCluster,
    Jumlah_Pemenang: winners.length,
    Daftar_Pemenang_Keluar: winners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', '),
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

  if (totalCount > activePesertaTotal.length) {
    showToast(`Total pemenang yang diminta (${totalCount}) melebihi jumlah peserta aktif yang tersisa (${activePesertaTotal.length}).`, 'error');
    return;
  }

  if (totalCount === 0) return;

  executeSpinMulti(rules, totalCount);
}

function executeSpinMulti(rules, totalCount, isReplacement = false) {
  APP.isSpinning = true;
  APP.isReplacementSpin = isReplacement;
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

  buildSlotReels(totalCount, winners, isManual);

  if (!isManual) {
    const totalDuration = BASE_DURATION + (totalCount - 1) * STAGGER_DELAY + 800;
    setTimeout(() => {
      finishSpinMulti();
    }, totalDuration);
  }
}

window.finishSpinMulti = function() {
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
    const rondeIndex = APP.currentRonde - 1;
    const record = APP.hasilUndian.find(r => r.Ronde_Ke === rondeIndex);
    if (record) {
      if (record.Daftar_Pemenang_Keluar === 'DIBATALKAN') {
        record.Daftar_Pemenang_Keluar = winners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');
      } else {
        record.Daftar_Pemenang_Keluar += ', ' + winners.map(w => `${w.id} - ${w.nama} (${w.jenisPeserta || w.cluster || 'Umum'} | ${w.grup || 'Umum'} | ${w.kelompok || 'Umum'})`).join(', ');
      }
    }
    APP.lastWinners = APP.lastWinners.concat(winners);
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
  const previousWinners = getAllPreviousWinners();
  let allWinners = [];
  let currentActive = getActivePeserta().filter(p => !previousWinners.has(p.nama));

  // Ambil semua target aktif untuk ronde ini
  let activeTargets = (APP.adminTargets || [])
    .filter(t => t.ronde === APP.currentRonde && t.status !== 'Sudah Dieksekusi');

  // Track target names dynamically per rules loop
  let targetStates = activeTargets.map(t => ({
    original: t,
    remainingNames: [...t.targets]
  }));

  rules.forEach(rule => {
    let ruleWinners = [];

    // Cari targetState yang cocok dengan rule ini
    targetStates.forEach(state => {
      const validNames = state.remainingNames.filter(targetName => {
        return currentActive.some(p => p.nama === targetName && 
                                       matchParticipantCluster(p, state.original.cluster) &&
                                       matchRuleParticipant(p, rule));
      });

      validNames.forEach(targetName => {
        if (ruleWinners.length >= rule.count) return;
        const pesertaIdx = currentActive.findIndex(p => p.nama === targetName);
        if (pesertaIdx > -1) {
          const peserta = currentActive[pesertaIdx];
          ruleWinners.push({
            id: peserta.id,
            nama: peserta.nama,
            jenisPeserta: peserta.jenisPeserta,
            grup: peserta.grup,
            kelompok: peserta.kelompok,
            cluster: peserta.cluster
          });
          currentActive.splice(pesertaIdx, 1);
          
          const nameIdx = state.remainingNames.indexOf(targetName);
          if (nameIdx > -1) state.remainingNames.splice(nameIdx, 1);
        }
      });
    });

    if (ruleWinners.length < rule.count) {
      const available = currentActive.filter(p => matchRuleParticipant(p, rule));
      const shuffled = [...available];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (let i = 0; i < shuffled.length && ruleWinners.length < rule.count; i++) {
        ruleWinners.push({
          id: shuffled[i].id,
          nama: shuffled[i].nama,
          jenisPeserta: shuffled[i].jenisPeserta,
          grup: shuffled[i].grup,
          kelompok: shuffled[i].kelompok,
          cluster: shuffled[i].cluster
        });
        const pIdx = currentActive.findIndex(p => p.id === shuffled[i].id);
        if (pIdx > -1) currentActive.splice(pIdx, 1);
      }
    }

    // Fallback: if category filter produced fewer winners than requested, fill remaining from any active participants
    if (ruleWinners.length < rule.count && currentActive.length > 0) {
      const remainingShuffled = [...currentActive];
      for (let i = remainingShuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingShuffled[i], remainingShuffled[j]] = [remainingShuffled[j], remainingShuffled[i]];
      }
      for (let i = 0; i < remainingShuffled.length && ruleWinners.length < rule.count; i++) {
        ruleWinners.push({
          id: remainingShuffled[i].id,
          nama: remainingShuffled[i].nama,
          jenisPeserta: remainingShuffled[i].jenisPeserta,
          grup: remainingShuffled[i].grup,
          kelompok: remainingShuffled[i].kelompok,
          cluster: remainingShuffled[i].cluster
        });
        const pIdx = currentActive.findIndex(p => p.id === remainingShuffled[i].id);
        if (pIdx > -1) currentActive.splice(pIdx, 1);
      }
    }

    allWinners = allWinners.concat(ruleWinners);
  });

  // Mark original targets as executed if all target names have been drawn
  let updatedAny = false;
  targetStates.forEach(state => {
    if (state.remainingNames.length === 0) {
      state.original.status = 'Sudah Dieksekusi';
      updatedAny = true;
    }
  });

  if (updatedAny) {
    saveAdminSettings();
  }

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

function updateCellText(cell, text) {
  cell.textContent = text;
  if (/^\d+$/.test(text.trim())) {
    cell.classList.add('is-number');
    cell.classList.remove('is-name');
  } else {
    cell.classList.add('is-name');
    cell.classList.remove('is-number');
  }
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
    updateCellText(cell, winnerName);
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
function showWinnerModal(winners) {
  const rondeSpan = document.getElementById('winnerRonde');
  if (rondeSpan) rondeSpan.textContent = APP.currentRonde - 1;

  const cardsContainer = document.getElementById('winnerCards');
  if (cardsContainer) {
    cardsContainer.innerHTML = '';

    winners.forEach((winner, idx) => {
      const card = document.createElement('div');
      card.className = 'winner-card';
      card.style.animationDelay = (idx * 0.12) + 's';

      // Build category breadcrumb from non-empty properties
      const categoryParts = [];
      if (winner.jenisPeserta && winner.jenisPeserta.trim()) categoryParts.push(winner.jenisPeserta.trim());
      if (winner.grup && winner.grup.trim()) categoryParts.push(winner.grup.trim());
      if (winner.kelompok && winner.kelompok.trim()) categoryParts.push(winner.kelompok.trim());
      const categoryText = categoryParts.join(' | ');
      const categoryBadge = categoryText ? `<span class="winner-card-cluster" style="font-size:0.75rem;color:var(--color-text-muted);margin-left:auto;background:var(--color-bg-secondary);padding:2px 6px;border-radius:4px;">${categoryText}</span>` : '';

      card.innerHTML =
        '<div class="winner-card-info">' +
          '<div class="winner-card-header" style="display:flex;justify-content:flex-start;align-items:center;gap:8px;padding-right:15px;">' +
            '<span class="winner-card-number">#' + (idx + 1) + '</span>' +
            categoryBadge +
          '</div>' +
          '<div class="winner-card-name" title="' + winner.nama + '">' + winner.nama + '</div>' +
        '</div>' +
        '<button class="btn-disqualify" title="Gugurkan peserta ini" onclick="disqualifyWinner(' + idx + ')">&times;</button>';
      cardsContainer.appendChild(card);
    });

    cardsContainer.scrollTop = 0;
  }

  // Apply background preset / custom image to Winner Modal
  const modalEl = document.getElementById('winnerModal');
  const bgEl = document.getElementById('winnerModalBg');

  if (modalEl) {
    modalEl.className = 'modal-overlay active';
    const preset = APP.settings.winnerBgPreset || 'gold_gala';
    modalEl.classList.add(`winner-preset-${preset}`);

    if (preset === 'custom' && APP.settings.winnerBgBase64 && bgEl) {
      bgEl.style.backgroundImage = `url(${APP.settings.winnerBgBase64})`;
    } else if (bgEl) {
      bgEl.style.backgroundImage = '';
    }
  }

  openModal('winnerModal');
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
window.disqualifyWinner = function(idx) {
  if (!confirm('Yakin gugurkan pemenang ini? Sistem akan otomatis mengundi pengganti.')) return;

  const disqualified = APP.lastWinners[idx];
  if (!disqualified) return;

  // Tandai peserta sebagai gugur
  const personData = APP.dataPeserta.find(function(p) { return p.id === disqualified.id; });
  if (personData) personData.status = 'Gugur';

  // Hapus dari list pemenang
  APP.lastWinners.splice(idx, 1);

  // Update histori
  const rondeIndex = APP.currentRonde - 1;
  const record = APP.hasilUndian.find(function(r) { return r.Ronde_Ke === rondeIndex; });
  if (record) {
    const sisa = APP.lastWinners.map(function(w) { return w.id + ' - ' + w.nama + ' (' + (w.cluster || 'Umum') + ')'; }).join(', ');
    record.Daftar_Pemenang_Keluar = sisa || 'DIBATALKAN';
  }

  saveSettings();
  if (typeof updateUI === 'function') updateUI();
  if (typeof updatePesertaDatalist === 'function') updatePesertaDatalist();

  closeModal('winnerModal');
  showToast('Mencari pengganti untuk ' + disqualified.nama + '...', 'info');

  setTimeout(function() {
    var replacementCluster = disqualified.cluster || 'Semua';
    var available = APP.dataPeserta.filter(function(p) {
      return p.status === 'Belum Diundi' && (replacementCluster === 'Semua' || p.cluster === replacementCluster);
    });
    if (available.length === 0) {
      showToast('Tidak ada peserta tersisa di cluster ' + replacementCluster + ' untuk pengganti.', 'error');
      if (APP.lastWinners.length > 0) showWinnerModal(APP.lastWinners);
      return;
    }
    var rules = [{ cluster: replacementCluster, count: 1 }];
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
    const imageBase64 = (prize.imageBase64 || '').trim();

    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.count += count;
      // If existing entry didn't have photo but this rule has one, attach photo!
      if (!existing.imageBase64 && imageBase64) {
        existing.imageBase64 = imageBase64;
      }
    } else {
      groupedMap.set(key, {
        name: rawName,
        imageBase64: imageBase64,
        count: count
      });
    }
  });

  const mergedPrizes = Array.from(groupedMap.values());

  if (mergedPrizes.length > 1) {
    displayEl.innerHTML = `<div style="display: grid; grid-template-columns: repeat(${Math.min(mergedPrizes.length, 2)}, 1fr); gap: 14px; width: 100%; align-items: start;">` + 
      mergedPrizes.map((prize) => {
        const imageHtml = prize.imageBase64 ? 
          `<div class="prize-image-container" style="width: 110px; height: 110px; border-radius: var(--radius-lg); overflow: hidden; background: #FFFFFF; display: flex; align-items: center; justify-content: center; border: 2px solid #FCA5A5; box-shadow: var(--shadow-sm); margin: 0 auto;">
            <img src="${prize.imageBase64}" alt="${prize.name}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
          </div>` : '';
        const countBadge = prize.count ? `<div style="font-size: 0.9rem; font-weight: 700; color: #E11D48; margin-top: 2px; display: flex; align-items: center; justify-content: center; gap: 4px;">🏆 ${prize.count} Pemenang</div>` : '';
        return `
          <div class="prize-item-grid" style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; padding: 4px;">
            ${imageHtml}
            <h4 class="prize-name" style="font-size: 0.95rem; font-weight: 900; font-family: var(--prize-font-family, 'Outfit', sans-serif); color: var(--prize-title-color, #B91C1C); margin: 4px 0 0 0; line-height: 1.2; word-break: break-word; text-transform: uppercase;">${prize.name}</h4>
            ${countBadge}
          </div>
        `;
      }).join('') + `</div>`;
  } else if (mergedPrizes.length === 1) {
    const prize = mergedPrizes[0];
    const countBadge = prize.count ? `<div style="font-size: 1rem; font-weight: 700; color: #E11D48; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 4px;">🏆 ${prize.count} Pemenang</div>` : '';
    const imageHtml = prize.imageBase64 ? 
      `<div class="prize-image-container" style="width: 180px; height: 180px; border-radius: var(--radius-xl); overflow: hidden; background: #FFFFFF; display: flex; align-items: center; justify-content: center; border: 2.5px solid #FCA5A5; box-shadow: var(--shadow-md); margin: 0 auto 8px auto;">
        <img src="${prize.imageBase64}" alt="${prize.name}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
      </div>` : '';
    displayEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 100%; text-align: center;">
        ${imageHtml}
        <h3 class="prize-name" style="font-size: 1.4rem; font-weight: 900; font-family: var(--prize-font-family, 'Outfit', sans-serif); color: var(--prize-title-color, #B91C1C); margin: 4px 0 0 0; line-height: 1.2; text-transform: uppercase; word-break: break-word;">${prize.name}</h3>
        ${countBadge}
      </div>
    `;
  } else {
    displayEl.innerHTML = `
      <div class="prize-item-multiple" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 20px 10px;">
        <h3 class="prize-name" style="font-size: 1.2rem; font-weight: 800; color: var(--color-text-muted); margin: 0;">Ronde ${APP.currentRonde}</h3>
      </div>
    `;
  }
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
    if (p.imageBase64) {
      imgPreview = `<img src="${p.imageBase64}" style="${imgStyle}" />`;
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
            ${p.imageBase64 ? `<button class="btn btn-outline btn-small" onclick="removePrizeImage('${p.id}')" style="color:#ef4444; border-color:rgba(239,68,68,0.2); padding:2px 6px; font-size:0.75rem; height:26px; border-width:1px;">Hapus Foto</button>` : ''}
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
    imageBase64: null
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

window.removePrize = function(id) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  APP.settings.prizes = APP.settings.prizes.filter(p => p.id !== id);
  renderPrizeSettings();
  saveSettings();
  if (prize && APP.currentRonde == prize.ronde) updatePrizeSidebar();
};

window.removePrizeImage = function(id) {
  const prize = APP.settings.prizes.find(p => p.id === id);
  if (prize) prize.imageBase64 = null;
  renderPrizeSettings();
  saveSettings();
  if (prize && APP.currentRonde == prize.ronde) updatePrizeSidebar();
};

window.handlePrizeImageUpload = function(e, id) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const prize = APP.settings.prizes.find(p => p.id === id);
      if (prize) {
        prize.imageBase64 = dataUrl;
        renderPrizeSettings();
        saveSettings();
        if (APP.currentRonde == prize.ronde) updatePrizeSidebar();
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
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

function handleAdminLogin() {
  const input = document.getElementById('adminPassword').value;
  if (input === APP.adminPassword) {
    closeModal('adminLoginModal');
    const loginBox = document.getElementById('adminLoginModal');
    if (loginBox) loginBox.style.display = 'none';
    openAdminPanel();
  } else {
    document.getElementById('adminLoginError').style.display = 'block';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
  }
}

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
window.addTargetChip = function(nama) {
  nama = nama.trim();
  if (!nama) return;

  const container = document.getElementById('targetChipContainer');
  if (!container) return;

  // Cegah duplikat
  const existing = Array.from(container.querySelectorAll('.target-chip')).map(c => c.dataset.nama);
  if (existing.includes(nama)) {
    showToast('"' + nama + '" sudah ditambahkan.', 'info');
    return;
  }

  // Sembunyikan placeholder
  const ph = document.getElementById('chipPlaceholder');
  if (ph) ph.style.display = 'none';

  const chip = document.createElement('span');
  chip.className = 'target-chip';
  chip.dataset.nama = nama;
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
  const selectedNames = chipContainer ? Array.from(chipContainer.querySelectorAll('.target-chip')).map(c => c.dataset.nama) : [];
  
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
    const isWinner = prevWinners.has(p.nama);
    const isSelected = selectedNames.includes(p.nama);
    
    const metaParts = [];
    if (p.id) metaParts.push('ID: ' + p.id);
    if (p.jenisPeserta && p.jenisPeserta.trim()) metaParts.push(p.jenisPeserta.trim());
    if (p.grup && p.grup.trim()) metaParts.push(p.grup.trim());
    if (p.kelompok && p.kelompok.trim()) metaParts.push(p.kelompok.trim());
    if (metaParts.length === 1 && p.cluster && p.cluster.trim()) metaParts.push(p.cluster.trim());
    const metaStr = metaParts.join(' | ');

    html += `
      <div style="padding: 12px 8px; border-bottom: 1px solid var(--color-border-light); display: flex; justify-content: space-between; align-items: center; ${isWinner ? 'opacity:0.5;' : ''}">
        <div style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; margin-right:12px;">
          <strong>${p.nama}</strong><br/>
          <span style="color:var(--color-text-muted); font-size:0.75rem;">${metaStr}</span>
        </div>
        ${isWinner 
          ? '<span style="color:var(--color-text-muted); font-size:0.75rem; font-weight:600;">Sudah Menang</span>' 
          : isSelected
            ? '<button class="btn btn-small" style="padding:6px 12px; font-size:0.75rem; background:var(--color-bg-tertiary); color:var(--color-text-muted); border:1px solid var(--color-border);" disabled>Terpilih</button>'
            : `<button class="btn btn-small btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="selectPesertaFromList('${p.nama.replace(/'/g, "\\'")}')">Pilih</button>`
        }
      </div>
    `;
  }
  
  if (filtered.length > limit) {
    html += `<div style="padding:12px; text-align:center; color:var(--color-text-muted); font-size:0.75rem;">Menampilkan ${limit} dari ${filtered.length}. Gunakan pencarian untuk lebih spesifik.</div>`;
  }
  
  container.innerHTML = html;
};

window.selectPesertaFromList = function(nama) {
  addTargetChip(nama);
  showToast('"' + nama + '" dipilih.', 'success');
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
    ? Array.from(chipContainer.querySelectorAll('.target-chip')).map(c => c.dataset.nama).filter(Boolean)
    : [];

  if (targets.length === 0) {
    showToast('Minimal 1 target pemenang harus dipilih.', 'error');
    return;
  }

  // Validate: targets must not be previous winners
  const prevWinners = getAllPreviousWinners();
  const invalidTargets = targets.filter(t => prevWinners.has(t));
  if (invalidTargets.length > 0) {
    showToast('Target "' + invalidTargets.join(', ') + '" sudah pernah menang dan tidak bisa dipilih lagi!', 'error');
    return;
  }

  // Validate: targets must exist in data for the selected cluster (or any if Semua)
  const validPeserta = APP.dataPeserta.filter(p => matchParticipantCluster(p, cluster));
  const validNames = validPeserta.map(p => p.nama);

  const notFound = targets.filter(t => !validNames.includes(t));
  if (notFound.length > 0) {
    showToast('Nama "' + notFound.join(', ') + '" tidak ditemukan di kategori ' + cluster + '.', 'error');
    return;
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

  if (!APP.adminTargets || APP.adminTargets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Belum ada target yang disimpan</td></tr>';
    return;
  }

  // Sort by ronde
  const sorted = [...APP.adminTargets].sort((a, b) => a.ronde - b.ronde);

  tbody.innerHTML = sorted.map((t, index) => {
    const statusClass = t.status === 'Sudah Dieksekusi' ? 'executed' : 'pending';
    const statusLabel = t.status === 'Sudah Dieksekusi' ? 'Sudah Dieksekusi' : 'Menunggu';
    const targetsText = t.targets.join(', ');
    return '<tr>' +
      '<td><strong>' + (t.cluster || 'Semua') + '</strong></td>' +
      '<td><strong>Ronde ' + t.ronde + '</strong></td>' +
      '<td style="max-width:160px; word-break:break-word;">' + targetsText + '</td>' +
      '<td><span class="admin-status ' + statusClass + '">' + statusLabel + '</span></td>' +
      '<td><button class="btn btn-small btn-danger" onclick="deleteAdminTarget(' + index + ')" title="Hapus target ini">Hapus</button></td>' +
      '</tr>';
  }).join('');
}

function deleteAdminTarget(index) {
  const sorted = [...APP.adminTargets].sort((a, b) => a.ronde - b.ronde);
  const targetToDelete = sorted[index];
  
  if (!targetToDelete) return;
  
  const names = targetToDelete.targets.join(', ');
  if (!confirm('Hapus target:\n"' + names + '" di Ronde ' + targetToDelete.ronde + ' (' + (targetToDelete.cluster || 'Semua') + ')?\n\nTindakan ini tidak bisa dibatalkan.')) return;
  
  APP.adminTargets = APP.adminTargets.filter(t => t !== targetToDelete);
  saveAdminSettings();
  refreshAdminTable();
  showToast('Target Ronde ' + targetToDelete.ronde + ' berhasil dihapus.', 'success');
}
window.deleteAdminTarget = deleteAdminTarget;

function changeAdminPassword() {
  const newPass = document.getElementById('newAdminPassword').value.trim();
  if (newPass.length < 4) {
    showToast('Password minimal 4 karakter.', 'error');
    return;
  }
  APP.adminPassword = newPass;
  saveAdminSettings();
  document.getElementById('newAdminPassword').value = '';
  showToast('Password berhasil diubah.', 'success');
}

function exportAdminConfig() {
  const config = btoa(JSON.stringify({
    targets: APP.adminTargets,
    password: APP.adminPassword
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
      APP.adminPassword = parsed.password || APP.adminPassword;
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

function handleWinnerBgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    APP.settings.winnerBgBase64 = ev.target.result;
    APP.settings.winnerBgPreset = 'custom';
    if (document.getElementById('inputWinnerBgPreset')) {
      document.getElementById('inputWinnerBgPreset').value = 'custom';
    }
    const preview = document.getElementById('winnerBgPreview');
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'none';
    if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeWinnerBg() {
  APP.settings.winnerBgBase64 = null;
  const preview = document.getElementById('winnerBgPreview');
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'block';
  if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.add('hidden');
  if (document.getElementById('winnerBgFileInput')) document.getElementById('winnerBgFileInput').value = '';
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    APP.settings.logoBase64 = ev.target.result;
    const preview = document.getElementById('logoPreview');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    document.getElementById('logoUploadText').style.display = 'none';
    document.getElementById('removeLogoBtn').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  APP.settings.logoBase64 = null;
  const preview = document.getElementById('logoPreview');
  preview.src = '';
  preview.style.display = 'none';
  document.getElementById('logoUploadText').style.display = 'block';
  document.getElementById('removeLogoBtn').classList.add('hidden');
  document.getElementById('logoFileInput').value = '';
}

function handleBgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    APP.settings.bgBase64 = ev.target.result;
    const preview = document.getElementById('bgPreview');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    document.getElementById('bgUploadText').style.display = 'none';
    document.getElementById('removeBgBtn').classList.remove('hidden');
    document.getElementById('bgOpacityGroup').classList.remove('hidden');
    
    // Set default opacity if not set
    if (APP.settings.bgOpacity === undefined) {
      APP.settings.bgOpacity = 0.15;
    }
    document.documentElement.style.setProperty('--bg-image', `url(${ev.target.result})`);
    document.documentElement.style.setProperty('--bg-opacity', APP.settings.bgOpacity);
    document.body.classList.add('has-bg');
  };
  reader.readAsDataURL(file);
}

function removeBg() {
  APP.settings.bgBase64 = null;
  const preview = document.getElementById('bgPreview');
  preview.src = '';
  preview.style.display = 'none';
  document.getElementById('bgUploadText').style.display = 'block';
  document.getElementById('removeBgBtn').classList.add('hidden');
  document.getElementById('bgOpacityGroup').classList.add('hidden');
  document.getElementById('bgFileInput').value = '';
  document.documentElement.style.setProperty('--bg-image', 'none');
  document.body.classList.remove('has-bg');
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
  if (APP.settings.logoBase64) {
    const preview = document.getElementById('logoPreview');
    preview.src = APP.settings.logoBase64;
    preview.style.display = 'block';
    if (document.getElementById('logoUploadText')) document.getElementById('logoUploadText').style.display = 'none';
    if (document.getElementById('removeLogoBtn')) document.getElementById('removeLogoBtn').classList.remove('hidden');
  } else {
    if (document.getElementById('logoPreview')) document.getElementById('logoPreview').style.display = 'none';
    if (document.getElementById('logoUploadText')) document.getElementById('logoUploadText').style.display = 'block';
    if (document.getElementById('removeLogoBtn')) document.getElementById('removeLogoBtn').classList.add('hidden');
  }

  if (APP.settings.bgBase64) {
    const preview = document.getElementById('bgPreview');
    preview.src = APP.settings.bgBase64;
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

  if (APP.settings.winnerBgBase64) {
    const preview = document.getElementById('winnerBgPreview');
    if (preview) {
      preview.src = APP.settings.winnerBgBase64;
      preview.style.display = 'block';
    }
    if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'none';
    if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.remove('hidden');
  } else {
    if (document.getElementById('winnerBgPreview')) document.getElementById('winnerBgPreview').style.display = 'none';
    if (document.getElementById('winnerBgUploadText')) document.getElementById('winnerBgUploadText').style.display = 'block';
    if (document.getElementById('removeWinnerBgBtn')) document.getElementById('removeWinnerBgBtn').classList.add('hidden');
  }

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

// Make deleteAdminTarget globally accessible
window.deleteAdminTarget = deleteAdminTarget;




