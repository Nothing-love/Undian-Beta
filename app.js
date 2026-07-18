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
    primary: '#C9A84C', primaryLight: '#D4B96A', primaryDark: '#A68B3A', primaryRgb: '201, 168, 76',
    secondary: '#1A1A2E', secondaryLight: '#2D2D4A', secondaryRgb: '26, 26, 46',
    accent: '#F4E4BA', accentLight: '#F8EDD0', accentRgb: '244, 228, 186',
    bg: '#0F0F1A', bgSecondary: '#1A1A2E', surface: '#16162B',
    text: '#F4E4BA', textSecondary: '#C9A84C', textMuted: '#7A6F50',
    border: '#2D2D4A', borderLight: '#232340'
  },
  festive_red: {
    primary: '#DC2626', primaryLight: '#EF4444', primaryDark: '#B91C1C', primaryRgb: '220, 38, 38',
    secondary: '#991B1B', secondaryLight: '#B91C1C', secondaryRgb: '153, 27, 27',
    accent: '#FCD34D', accentLight: '#FDE68A', accentRgb: '252, 211, 77',
    bg: '#FEF2F2', bgSecondary: '#FEE2E2', surface: '#FFFFFF',
    text: '#1F2937', textSecondary: '#6B7280', textMuted: '#9CA3AF',
    border: '#FECACA', borderLight: '#FEE2E2'
  },
  nature_green: {
    primary: '#059669', primaryLight: '#10B981', primaryDark: '#047857', primaryRgb: '5, 150, 105',
    secondary: '#047857', secondaryLight: '#059669', secondaryRgb: '4, 120, 87',
    accent: '#A7F3D0', accentLight: '#D1FAE5', accentRgb: '167, 243, 208',
    bg: '#F0FDF4', bgSecondary: '#DCFCE7', surface: '#FFFFFF',
    text: '#14532D', textSecondary: '#166534', textMuted: '#6B7280',
    border: '#BBF7D0', borderLight: '#DCFCE7'
  },
  royal_purple: {
    primary: '#7C3AED', primaryLight: '#8B5CF6', primaryDark: '#6D28D9', primaryRgb: '124, 58, 237',
    secondary: '#4C1D95', secondaryLight: '#5B21B6', secondaryRgb: '76, 29, 149',
    accent: '#C4B5FD', accentLight: '#DDD6FE', accentRgb: '196, 181, 253',
    bg: '#F5F3FF', bgSecondary: '#EDE9FE', surface: '#FFFFFF',
    text: '#1E1B4B', textSecondary: '#4338CA', textMuted: '#7C72B8',
    border: '#C4B5FD', borderLight: '#EDE9FE'
  }
};

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
  
  // Start syncing admin settings from remote if on laptop or phone
  setInterval(() => {
    syncAdminSettings();
    if (APP.isRemoteMode) syncPesertaDataFromRemote();
  }, 2000);
});

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
  syncPesertaDataToServer();
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
    }).catch(e => console.log('Remote sync skipped'));
  }
}

// Automatically pull admin settings from server
async function syncAdminSettings() {
  if (window.location.protocol === 'file:') return;
  try {
    const res = await fetch('/api/admin');
    if (res.ok) {
      const data = await res.json();
      if (data && data.targets) {
        // Simple check if there are changes
        const currentTargetsStr = JSON.stringify(APP.adminTargets);
        const newTargetsStr = JSON.stringify(data.targets);
        
        if (currentTargetsStr !== newTargetsStr) {
          APP.adminTargets = data.targets;
          if (data.password) APP.adminPassword = data.password;
          
          // Save locally so it's persistent
          const localData = btoa(JSON.stringify(data));
          localStorage.setItem(ADMIN_STORAGE_KEY, localData);
          
          // Refresh UI if admin panel is open
          if (document.getElementById('adminModal').classList.contains('active')) {
            refreshAdminTable();
          }
        }
      }
    }
  } catch (e) {
    // Ignore fetch errors if server is down
  }
}

function syncPesertaDataToServer() {
  if (window.location.protocol === 'file:') return;
  const payload = {
    dataPeserta: APP.dataPeserta,
    availableClusters: APP.availableClusters || [],
    hasilUndian: APP.hasilUndian || [],
    currentRonde: APP.currentRonde || 1,
    settings: APP.settings
  };
  fetch('/api/peserta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(e => console.log('Sync peserta error'));
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
function bindEvents() {
  // Upload screen
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadExcelFile(file);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadExcelFile(e.target.files[0]);
  });
  downloadTemplateBtn.addEventListener('click', generateTemplate);

  const clusterSelect = document.getElementById('clusterSelect');
  if (clusterSelect) {
    clusterSelect.addEventListener('change', e => {
      APP.currentCluster = e.target.value;
      updateUI();
      updatePesertaDatalist();
    });
  }

  // Upload new button (in header)
  document.getElementById('uploadNewBtn').addEventListener('click', () => {
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('uploadScreen').classList.add('active');
    fileInput.value = '';
  });
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
  document.getElementById('saveSettingsBtn').addEventListener('click', saveEventSettings);
  
  document.getElementById('logoUploadArea').addEventListener('click', () => document.getElementById('logoFileInput').click());
  document.getElementById('logoFileInput').addEventListener('change', handleLogoUpload);
  document.getElementById('removeLogoBtn').addEventListener('click', removeLogo);

  document.getElementById('bgUploadArea').addEventListener('click', () => document.getElementById('bgFileInput').click());
  document.getElementById('bgFileInput').addEventListener('change', handleBgUpload);
  document.getElementById('removeBgBtn').addEventListener('click', removeBg);

  const opacitySlider = document.getElementById('inputBgOpacity');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      document.getElementById('bgOpacityValue').textContent = Math.round(e.target.value * 100) + '%';
      APP.settings.bgOpacity = parseFloat(e.target.value);
      document.documentElement.style.setProperty('--bg-opacity', e.target.value);
    });
  }

  const subtitleColorPicker = document.getElementById('inputSubtitleColor');
  if (subtitleColorPicker) {
    subtitleColorPicker.addEventListener('input', (e) => {
      document.getElementById('subtitleColorValue').textContent = e.target.value.toUpperCase();
    });
  }

  const subtitleSizeSlider = document.getElementById('inputSubtitleSize');
  if (subtitleSizeSlider) {
    subtitleSizeSlider.addEventListener('input', (e) => {
      document.getElementById('subtitleSizeValue').textContent = e.target.value + 'rem';
    });
  }

  // Theme swatches
  document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const theme = swatch.dataset.theme;
      if (theme === 'custom') {
        document.getElementById('customColorSection').classList.remove('hidden');
      } else {
        document.getElementById('customColorSection').classList.add('hidden');
      }
    });
  });

  // Excel download
  document.getElementById('downloadExcelBtn').addEventListener('click', downloadUpdatedExcel);
  document.getElementById('winnerCloseBtn').addEventListener('click', () => closeModal('winnerModal'));

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

      showToast('Undian berhasil di-reset ke awal!', 'success');
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

  // Admin
  document.getElementById('adminLoginBtn').addEventListener('click', handleAdminLogin);
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdminLogin();
  });
  document.getElementById('saveAdminTargetBtn').addEventListener('click', saveAdminTarget);
  document.getElementById('changePasswordBtn').addEventListener('click', changeAdminPassword);
  document.getElementById('exportConfigBtn').addEventListener('click', exportAdminConfig);
  document.getElementById('importConfigBtn').addEventListener('click', importAdminConfig);

  // Remote URL copy button
  document.getElementById('copyRemoteUrlBtn').addEventListener('click', copyRemoteUrl);

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
  a.download = 'Database_Undian_Template.xlsx';
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

      // Parse Sheet 1: Data_Peserta
      const sheet1 = APP.workbook.Sheets['Data_Peserta'];
      if (!sheet1) {
        showToast('Sheet "Data_Peserta" tidak ditemukan!', 'error');
        return;
      }
      const rawData = XLSX.utils.sheet_to_json(sheet1);
      APP.dataPeserta = rawData.map(row => {
        const jVal = row['Jenis_Peserta'] !== undefined && row['Jenis_Peserta'] !== null ? String(row['Jenis_Peserta']).trim() :
                     row['Jenis Peserta'] !== undefined && row['Jenis Peserta'] !== null ? String(row['Jenis Peserta']).trim() :
                     row['Cluster_Kategori'] !== undefined && row['Cluster_Kategori'] !== null ? String(row['Cluster_Kategori']).trim() :
                     row['Cluster'] !== undefined && row['Cluster'] !== null ? String(row['Cluster']).trim() :
                     row['Kategori'] !== undefined && row['Kategori'] !== null ? String(row['Kategori']).trim() : '';

        const gVal = row['Grup'] !== undefined && row['Grup'] !== null ? String(row['Grup']).trim() :
                     row['Group'] !== undefined && row['Group'] !== null ? String(row['Group']).trim() : '';

        const kVal = row['Kelompok_Dalam_Grup'] !== undefined && row['Kelompok_Dalam_Grup'] !== null ? String(row['Kelompok_Dalam_Grup']).trim() :
                     row['Kelompok Dalam Grup'] !== undefined && row['Kelompok Dalam Grup'] !== null ? String(row['Kelompok Dalam Grup']).trim() :
                     row['Kelompok'] !== undefined && row['Kelompok'] !== null ? String(row['Kelompok']).trim() : '';

        return {
          id: String(row['ID_Peserta'] || '').trim(),
          nama: String(row['Nama_atau_Angka'] || '').trim(),
          jenisPeserta: jVal,
          grup: gVal,
          kelompok: kVal,
          cluster: jVal, // fallback compatibility
          status: String(row['Status_Undian'] || 'Belum Diundi').trim()
        };
      });

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

      // Parse Sheet 2: Hasil_Undian
      const sheet2 = APP.workbook.Sheets['Hasil_Undian'];
      if (sheet2) {
        APP.hasilUndian = XLSX.utils.sheet_to_json(sheet2);
        APP.currentRonde = APP.hasilUndian.length + 1;
      }

      // Update datalist for admin autocomplete
      updatePesertaDatalist();
      syncPesertaDataToServer();

      // Switch to main app
      document.getElementById('uploadScreen').classList.remove('active');
      document.getElementById('mainApp').classList.add('active');

      updateUI();
      showToast(`Data berhasil dimuat! ${getActivePeserta().length} peserta aktif.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal membaca file Excel. Pastikan format benar.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function computeUniqueCategories() {
  const uniqueJenis = new Set();
  const uniqueGrup = new Set();
  const uniqueKelompok = new Set();

  (APP.dataPeserta || []).forEach(p => {
    uniqueJenis.add(p.jenisPeserta || '');
    uniqueGrup.add(p.grup || '');
    uniqueKelompok.add(p.kelompok || '');
  });

  APP.uniqueJenis = Array.from(uniqueJenis).sort();
  APP.uniqueGrup = Array.from(uniqueGrup).sort();
  APP.uniqueKelompok = Array.from(uniqueKelompok).sort();
}

function matchRuleParticipant(p, rule) {
  if (rule.cluster) {
    return matchParticipantCluster(p, rule.cluster);
  }
  if (rule.jenis && rule.jenis !== 'Semua' && (p.jenisPeserta || '') !== rule.jenis) return false;
  if (rule.grup && rule.grup !== 'Semua' && (p.grup || '') !== rule.grup) return false;
  if (rule.kelompok && rule.kelompok !== 'Semua' && (p.kelompok || '') !== rule.kelompok) return false;
  return true;
}

function matchParticipantCluster(p, category) {
  if (!category || category === 'Semua') return true;
  if (category.startsWith('Jenis: ')) {
    const val = category.substring(7);
    return p.jenisPeserta === val;
  } else if (category.startsWith('Grup: ')) {
    const val = category.substring(6);
    return p.grup === val;
  } else if (category.startsWith('Kelompok: ')) {
    const val = category.substring(10);
    return p.kelompok === val;
  } else {
    return p.cluster === category || 
           p.jenisPeserta === category || 
           p.grup === category || 
           p.kelompok === category;
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
    option.textContent = `ID: ${p.id} | Cluster: ${p.cluster}`;
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

  // Read rules from settings if no DOM elements found (which is the case on dashboard)
  let rules = [];
  const domRows = document.querySelectorAll('.draw-rule-row');
  if (domRows.length > 0) {
    domRows.forEach(row => {
      const jenis = row.querySelector('.jenis-select').value;
      const grup = row.querySelector('.grup-select').value;
      const kelompok = row.querySelector('.kelompok-select').value;
      const count = parseInt(row.querySelector('.rule-count').value) || 1;
      rules.push({ jenis, grup, kelompok, count });
    });
    APP.settings.drawRules = rules; // keep in sync
  } else {
    rules = APP.settings.drawRules || [{ jenis: 'Semua', grup: 'Semua', kelompok: 'Semua', count: 1 }];
  }

  let totalCount = 0;
  for (const rule of rules) {
    totalCount += rule.count;
    let available = APP.dataPeserta.filter(p => p.status === 'Belum Diundi' && matchRuleParticipant(p, rule));
    if (available.length < rule.count) {
      // Build a friendly text for target category
      const parts = [];
      if (rule.jenis && rule.jenis !== 'Semua') parts.push(`Jenis: ${rule.jenis === '' ? '(Kosong)' : rule.jenis}`);
      if (rule.grup && rule.grup !== 'Semua') parts.push(`Grup: ${rule.grup === '' ? '(Kosong)' : rule.grup}`);
      if (rule.kelompok && rule.kelompok !== 'Semua') parts.push(`Kelompok: ${rule.kelompok === '' ? '(Kosong)' : rule.kelompok}`);
      const ruleText = parts.length > 0 ? parts.join(' | ') : 'Semua';
      
      showToast(`Peserta aktif di target (${ruleText}) hanya ${available.length}, tidak cukup untuk ${rule.count} pemenang.`, 'error');
      return;
    }
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
  } else if (count >= 2 && count <= 5) {
    slotMachine.classList.add('large-reels');
  } else if (count >= 20) {
    slotMachine.classList.add('micro-reels');
    CELL_HEIGHT = 24;
  } else if (count >= 6) {
    slotMachine.classList.add('compact-reels');
    CELL_HEIGHT = 36;
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

function adjustWinnerCount(delta) {
  const input = document.getElementById('winnerCount');
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(50, val + delta));
  input.value = val;
}

// ===================== WINNER MODAL & CONFETTI =====================
function showWinnerModal(winners) {
  const rondeSpan = document.getElementById('winnerRonde');
  rondeSpan.textContent = APP.currentRonde - 1;

  const cardsContainer = document.getElementById('winnerCards');
  cardsContainer.innerHTML = '';

  winners.forEach((winner, idx) => {
    const card = document.createElement('div');
    card.className = 'winner-card';
    card.style.animationDelay = (idx * 0.12) + 's';

    // Build category breadcrumb from non-empty properties
    const categoryParts = [];
    if (winner.jenisPeserta) categoryParts.push(winner.jenisPeserta);
    if (winner.grup) categoryParts.push(winner.grup);
    if (winner.kelompok) categoryParts.push(winner.kelompok);
    const categoryText = categoryParts.join(' | ') || 'Umum';

    card.innerHTML =
      '<div class="winner-card-info">' +
        '<div class="winner-card-header" style="display:flex;justify-content:flex-start;align-items:center;gap:8px;padding-right:15px;">' +
          '<span class="winner-card-number">#' + (idx + 1) + '</span>' +
          '<span class="winner-card-cluster" style="font-size:0.75rem;color:var(--color-text-muted);margin-left:auto;background:var(--color-bg-secondary);padding:2px 6px;border-radius:4px;">' + categoryText + '</span>' +
        '</div>' +
        '<div class="winner-card-name" title="' + winner.nama + '">' + winner.nama + '</div>' +
      '</div>' +
      '<button class="btn-disqualify" title="Gugurkan peserta ini" onclick="disqualifyWinner(' + idx + ')">&times;</button>';
    cardsContainer.appendChild(card);
  });

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

  if (typeof saveState === 'function') saveState();
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
  const currentPrizes = prizes.filter(p => parseInt(p.ronde) === APP.currentRonde);

  if (currentPrizes.length > 1) {
    displayEl.innerHTML = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; align-items: start;">` + 
      currentPrizes.map((prize) => `
        <div class="prize-item-grid" style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;">
          <div class="prize-image-container" style="width: 100px; height: 100px; border-radius: var(--radius-md); overflow: hidden; background: rgba(var(--color-primary-rgb), 0.05); display: flex; align-items: center; justify-content: center; border: 1.5px dashed rgba(var(--color-primary-rgb), 0.2); box-shadow: var(--shadow-sm); margin: 0 auto;">
            ${prize.imageBase64 ? `<img src="${prize.imageBase64}" alt="Hadiah" style="width: 100%; height: 100%; object-fit: contain; display: block;" />` : 
              `<div class="prize-placeholder" style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 600;">🎁 Misteri</div>`}
          </div>
          <h4 class="prize-name" style="font-size: 0.9rem; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.2; word-break: break-word;">${prize.name || 'Hadiah'}</h4>
        </div>
      `).join('') + `</div>`;
  } else if (currentPrizes.length === 1) {
    const prize = currentPrizes[0];
    displayEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-md); width: 100%;">
        <div class="prize-image-container" style="width: 180px; height: 180px; border-radius: var(--radius-lg); overflow: hidden; background: rgba(var(--color-primary-rgb), 0.05); display: flex; align-items: center; justify-content: center; border: 2px dashed rgba(var(--color-primary-rgb), 0.2); box-shadow: var(--shadow-md); margin: 0 auto;">
          ${prize.imageBase64 ? `<img src="${prize.imageBase64}" alt="Hadiah" style="width: 100%; height: 100%; object-fit: contain; display: block;" />` : 
            `<div class="prize-placeholder" style="font-size: 1.1rem; color: var(--color-text-muted); font-weight: 600;">🎁 Hadiah Misteri</div>`}
        </div>
        <h3 class="prize-name" style="font-size: 1.5rem; font-weight: 800; color: var(--color-text); margin: 0; background: var(--gradient-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.3;">${prize.name || 'Hadiah Spesial'}</h3>
      </div>
    `;
  } else {
    displayEl.innerHTML = `
      <div class="prize-item-multiple">
        <div class="prize-image-container" style="margin: 0 auto;">
          <img src="" alt="Hadiah" style="display:none;" />
          <div class="prize-placeholder" style="display:flex;">
            🎁 Hadiah Misteri
          </div>
        </div>
        <h3 class="prize-name">Menunggu...</h3>
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
    list.innerHTML = '<p class="small text-muted" style="color:var(--color-text-muted);">Belum ada hadiah yang diatur.</p>';
    return;
  }

  prizes.forEach((p, index) => {
    const item = document.createElement('div');
    item.className = 'prize-setting-item';
    item.style.cssText = 'padding: 10px; gap: 10px;';
    
    // Pastikan setiap prize punya ID unik
    if (!p.id) p.id = Date.now().toString() + Math.random().toString().substring(2,5);

    let imgPreview = '';
    const imgStyle = 'width: 50px; height: 50px; flex-shrink: 0; border-radius: var(--radius-sm); object-fit: contain; border: 1px solid var(--color-border); background: var(--color-surface);';
    if (p.imageBase64) {
      imgPreview = `<img src="${p.imageBase64}" style="${imgStyle}" />`;
    } else {
      imgPreview = `<div style="${imgStyle} display:flex; align-items:center; justify-content:center; font-size:0.65rem; text-align:center; color:var(--color-text-muted); line-height:1.1;">No Image</div>`;
    }

    item.innerHTML = `
      ${imgPreview}
      <div class="prize-setting-info" style="display:flex; flex-direction:column; gap:6px; flex:1;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.8rem; font-weight:600; color:var(--color-text-secondary);">Rnd:</span>
          <input type="number" class="input-modern" style="width: 50px; height: 30px; padding: 0 4px; font-size: 0.8rem; text-align:center; font-weight:bold;" value="${p.ronde}" onchange="updatePrizeRonde('${p.id}', this.value)" min="1" />
          <input type="text" class="input-modern" style="flex:1; height: 30px; padding: 0 8px; font-size: 0.8rem; font-weight:500;" placeholder="Nama Hadiah" value="${p.name || ''}" onchange="updatePrizeName('${p.id}', this.value)" />
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-outline btn-small" style="padding:4px 8px; font-size:0.75rem; height:26px; border-width:1px;" onclick="document.getElementById('prizeImgUpload_${p.id}').click()">Upload Gambar</button>
          ${p.imageBase64 ? `<button class="btn btn-outline btn-small" onclick="removePrizeImage('${p.id}')" style="color:#ef4444; border-color:rgba(239,68,68,0.2); padding:4px 8px; font-size:0.75rem; height:26px; border-width:1px;">Hapus</button>` : ''}
          <input type="file" id="prizeImgUpload_${p.id}" accept="image/*" style="display:none;" onchange="handlePrizeImageUpload(event, '${p.id}')" />
        </div>
      </div>
      <button class="btn-remove-rule" onclick="removePrize('${p.id}')" title="Hapus Hadiah" style="align-self:center; display:flex; font-size:1.1rem; border:none; background:transparent; color:#ef4444; cursor:pointer; padding: 0 2px;">&times;</button>
    `;
    list.appendChild(item);
  });
}

function addPrizeRule() {
  APP.settings.prizes = APP.settings.prizes || [];
  let nextRonde = 1;
  if (APP.settings.prizes.length > 0) {
    nextRonde = Math.max(...APP.settings.prizes.map(p => parseInt(p.ronde) || 1));
  }
  APP.settings.prizes.push({ id: Date.now().toString(), ronde: nextRonde, name: '', imageBase64: null });
  renderPrizeSettings();
  saveSettings();
}

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
      : [...new Set(APP.dataPeserta.map(p => p.cluster || 'Umum'))];
    
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
  
  // Populate filter select
  const filterSel = document.getElementById('filterClusterSelect');
  if (filterSel) {
    const currentFilter = filterSel.value;
    filterSel.innerHTML = '<option value="Semua">Semua</option>' + 
      (APP.availableClusters || []).map(c => `<option value="${c}">${c}</option>`).join('');
    // Try to pre-select based on adminCluster selection
    const adminCluster = document.getElementById('adminCluster');
    filterSel.value = adminCluster && adminCluster.value !== 'Semua' ? adminCluster.value : (currentFilter || 'Semua');
  }

  document.getElementById('searchPesertaInput').value = '';
  filterPesertaList();
  openModal('pesertaListModal');
};

window.filterPesertaList = function() {
  const q = document.getElementById('searchPesertaInput').value.toLowerCase();
  const filterCluster = document.getElementById('filterClusterSelect').value;
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
    
    html += `
      <div style="padding: 12px 8px; border-bottom: 1px solid var(--color-border-light); display: flex; justify-content: space-between; align-items: center; ${isWinner ? 'opacity:0.5;' : ''}">
        <div style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; margin-right:12px;">
          <strong>${p.nama}</strong><br/>
          <span style="color:var(--color-text-muted); font-size:0.75rem;">ID: ${p.id} | ${p.jenisPeserta || p.cluster || 'Umum'} | ${p.grup || 'Umum'} | ${p.kelompok || 'Umum'}</span>
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

window.deleteAdminTarget = function(index) {
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
  const title = document.getElementById('inputEventTitle').value.trim();
  const subtitle = document.getElementById('inputEventSubtitle').value.trim();
  const subColor = document.getElementById('inputSubtitleColor').value;
  const subSize = parseFloat(document.getElementById('inputSubtitleSize').value) || 0.78;

  if (title) APP.settings.eventTitle = title;
  APP.settings.eventSubtitle = subtitle;
  APP.settings.subtitleColor = subColor;
  APP.settings.subtitleSize = subSize;

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

  // Read target rules from settings
  const rules = [];
  document.querySelectorAll('.draw-rule-row').forEach(row => {
    const jenis = row.querySelector('.jenis-select').value;
    const grup = row.querySelector('.grup-select').value;
    const kelompok = row.querySelector('.kelompok-select').value;
    const count = parseInt(row.querySelector('.rule-count').value) || 1;
    rules.push({ jenis, grup, kelompok, count });
  });
  APP.settings.drawRules = rules;

  applyTheme(APP.settings.theme);
  applyEventSettings();
  saveSettings();
  closeModal('settingsModal');
  showToast('Pengaturan berhasil disimpan!', 'success');
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
  document.getElementById('inputEventTitle').value = APP.settings.eventTitle || '';
  document.getElementById('inputEventSubtitle').value = APP.settings.eventSubtitle || '';

  const subColor = APP.settings.subtitleColor || '#94A3B8';
  const subSize = APP.settings.subtitleSize || 0.78;
  document.getElementById('inputSubtitleColor').value = subColor;
  document.getElementById('subtitleColorValue').textContent = subColor.toUpperCase();
  document.getElementById('inputSubtitleSize').value = subSize;
  document.getElementById('subtitleSizeValue').textContent = subSize + 'rem';

  // Set active theme swatch
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

  // Show logo preview if exists
  if (APP.settings.logoBase64) {
    const preview = document.getElementById('logoPreview');
    preview.src = APP.settings.logoBase64;
    preview.style.display = 'block';
    document.getElementById('logoUploadText').style.display = 'none';
    document.getElementById('removeLogoBtn').classList.remove('hidden');
  } else {
    document.getElementById('logoPreview').style.display = 'none';
    document.getElementById('logoUploadText').style.display = 'block';
    document.getElementById('removeLogoBtn').classList.add('hidden');
  }

  if (APP.settings.bgBase64) {
    const preview = document.getElementById('bgPreview');
    preview.src = APP.settings.bgBase64;
    preview.style.display = 'block';
    document.getElementById('bgUploadText').style.display = 'none';
    document.getElementById('removeBgBtn').classList.remove('hidden');
    document.getElementById('bgOpacityGroup').classList.remove('hidden');
    
    // Set slider value
    const opacityVal = APP.settings.bgOpacity !== undefined ? APP.settings.bgOpacity : 0.15;
    document.getElementById('inputBgOpacity').value = opacityVal;
    document.getElementById('bgOpacityValue').textContent = Math.round(opacityVal * 100) + '%';
  } else {
    document.getElementById('bgPreview').style.display = 'none';
    document.getElementById('bgUploadText').style.display = 'block';
    document.getElementById('removeBgBtn').classList.add('hidden');
    document.getElementById('bgOpacityGroup').classList.add('hidden');
  }

  // Populate draw targets
  const rulesContainer = document.getElementById('drawRulesContainer');
  if (rulesContainer) {
    rulesContainer.innerHTML = '';
    const rules = APP.settings.drawRules || [{ cluster: 'Semua', count: 1 }];
    rules.forEach((rule, idx) => {
      const row = document.createElement('div');
      row.className = 'draw-rule-row';
      
      // Parse backward compatibility if needed
      let rJenis = rule.jenis || 'Semua';
      let rGrup = rule.grup || 'Semua';
      let rKelompok = rule.kelompok || 'Semua';
      if (rule.cluster && rule.cluster !== 'Semua') {
        if (rule.cluster.startsWith('Jenis: ')) {
          rJenis = rule.cluster.substring(7);
        } else if (rule.cluster.startsWith('Grup: ')) {
          rGrup = rule.cluster.substring(6);
        } else if (rule.cluster.startsWith('Kelompok: ')) {
          rKelompok = rule.cluster.substring(10);
        } else {
          rJenis = rule.cluster;
        }
      }
      
      let jenisOptions = '<option value="Semua">Semua Jenis</option>';
      if (APP.uniqueJenis) {
        APP.uniqueJenis.forEach(j => {
          jenisOptions += `<option value="${j}" ${j === rJenis ? 'selected' : ''}>${j === '' ? '(Kosong)' : j}</option>`;
        });
      }
      
      let grupOptions = '<option value="Semua">Semua Grup</option>';
      if (APP.uniqueGrup) {
        APP.uniqueGrup.forEach(g => {
          grupOptions += `<option value="${g}" ${g === rGrup ? 'selected' : ''}>${g === '' ? '(Kosong)' : g}</option>`;
        });
      }
      
      let kelompokOptions = '<option value="Semua">Semua Kelompok</option>';
      if (APP.uniqueKelompok) {
        APP.uniqueKelompok.forEach(k => {
          kelompokOptions += `<option value="${k}" ${k === rKelompok ? 'selected' : ''}>${k === '' ? '(Kosong)' : k}</option>`;
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
          <input type="number" class="rule-count" value="${rule.count}" min="1" max="50" style="width: 40px; text-align: center;" />
          <button class="btn-num rule-increase" onclick="increaseRule(this)">+</button>
        </div>
        <button class="btn-remove-rule" onclick="removeRule(this)" style="${rules.length > 1 ? 'display:block;' : 'display:none;'}" title="Hapus">&times;</button>
      `;
      rulesContainer.appendChild(row);
    });
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
    statusText.textContent = `Siap â€” ${active.length} peserta aktif${clusterInfo} | Ronde ke-${APP.currentRonde}`;
    spinBtn.disabled = active.length === 0;
    downloadExcelBtn.disabled = false;
  } else {
    statusText.textContent = 'Siap â€” Upload file Excel untuk memulai';
    spinBtn.disabled = true;
    downloadExcelBtn.disabled = true;
  }
}

// Make deleteAdminTarget globally accessible
window.deleteAdminTarget = deleteAdminTarget;




