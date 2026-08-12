/* ============================================================
   DORPRIZE — Layout Editor (Layout Fase 2)
   Editor drag/resize untuk menata panggung undian. Bekerja pada
   kanvas 16:9 di halaman Pengaturan, menghasilkan objek
   settings.layout (koordinat ternormalisasi 0..1 terhadap stage).
   Tidak bergantung library eksternal (aman offline di venue).
   ============================================================ */
(function () {
  'use strict';

  var IDS = ['logo', 'title', 'subtitle', 'stats', 'prize', 'slot', 'controls', 'footer'];
  var LABELS = {
    logo: 'Logo', title: 'Judul', subtitle: 'Sub-judul', stats: 'Statistik',
    prize: 'Hadiah', slot: 'Mesin Slot', controls: 'Tombol Spin', footer: 'Footer'
  };
  var Z = { footer: 5, prize: 10, slot: 10, title: 20, subtitle: 20, stats: 25, controls: 25, logo: 30 };

  // Default statis yang mendekati tampilan dashboard (titik awal bila belum ada layout tersimpan).
  var DEFAULT_POS = {
    logo: { x: 0.010, y: 0.015, w: 0.130, h: 0.090 },
    title: { x: 0.300, y: 0.020, w: 0.400, h: 0.070 },
    subtitle: { x: 0.320, y: 0.095, w: 0.360, h: 0.040 },
    stats: { x: 0.800, y: 0.020, w: 0.185, h: 0.055 },
    prize: { x: 0.000, y: 0.150, w: 0.190, h: 0.800 },
    slot: { x: 0.210, y: 0.170, w: 0.760, h: 0.590 },
    controls: { x: 0.360, y: 0.800, w: 0.470, h: 0.130 },
    footer: { x: 0.000, y: 0.950, w: 1.000, h: 0.050 }
  };
  var HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  var MIN = 0.02;      // ukuran minimum item (fraksi)
  var GRID = 0.005;    // langkah snap grid (0.5%)

  var LAYOUT_VERSION = 2;   // versi skema layout saat ini

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function round1(v) { return Math.round(v * 1000) / 10; } // fraksi -> persen 1 desimal
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }

  // Migrasi + sanitasi layout dari sumber luar (Import file JSON, atau versi skema
  // lama). Koordinat ternormalisasi 0..1 stabil lintas versi, jadi v2 = identitas;
  // blok if(version) di bawah adalah titik-tempel bila skema berubah kelak. Nilai tiap
  // item diklem agar file hasil edit-tangan yang rusak tak membuat editor kacau
  // (server tetap mengklem ulang saat "Simpan Tata Letak" — pertahanan berlapis).
  function migrateLayout(input) {
    if (!input || typeof input !== 'object' || !input.items || typeof input.items !== 'object') return null;
    // if (num(input.version, 2) < 2) { /* ...ubah bentuk lama -> v2... */ }
    var rawItems = input.items;
    var items = {};
    IDS.forEach(function (id) {
      var it = rawItems[id];
      if (!it || typeof it !== 'object') return; // hilang → setLayout akan isi dari DEFAULT_POS
      items[id] = {
        x: clamp(num(it.x, 0), -0.5, 1.5),
        y: clamp(num(it.y, 0), -0.5, 1.5),
        w: clamp(num(it.w, 0.1), MIN, 2),
        h: clamp(num(it.h, 0.1), MIN, 2),
        rot: clamp(num(it.rot, 0), -180, 180),
        opacity: clamp(num(it.opacity, 1), 0, 1),
        z: Math.round(clamp(num(it.z, 10), 0, 9999)),
        visible: it.visible !== false
      };
    });
    if (!Object.keys(items).length) return null;
    var stage = input.stage && typeof input.stage === 'object' ? input.stage : {};
    return {
      version: LAYOUT_VERSION,
      stage: { w: Math.round(clamp(num(stage.w, 1920), 320, 8192)), h: Math.round(clamp(num(stage.h, 1080), 320, 8192)) },
      items: items
    };
  }

  function defaultLayout() {
    var items = {};
    IDS.forEach(function (id) {
      items[id] = { x: DEFAULT_POS[id].x, y: DEFAULT_POS[id].y, w: DEFAULT_POS[id].w, h: DEFAULT_POS[id].h, rot: 0, opacity: 1, z: Z[id], visible: true };
    });
    return { version: 2, stage: { w: 1920, h: 1080 }, items: items };
  }

  // ===================== PRESET LAYOUT (Fase 3) =====================
  // Titik mulai cepat untuk beragam tema acara. Tiap preset hanya menyebut item
  // yang BERBEDA dari DEFAULT_POS; sisanya otomatis memakai default (lihat buildPreset).
  // 'klasik' = tampilan sekarang (semua default). Operator pilih preset lalu bebas menata.
  var PRESETS = {
    klasik: { label: 'Klasik', items: {} },
    fokus_hadiah: {
      label: 'Fokus Hadiah',
      items: {
        prize: { x: 0.34, y: 0.15, w: 0.32, h: 0.50 },   // gambar hadiah besar di tengah
        slot: { x: 0.24, y: 0.67, w: 0.52, h: 0.13 },    // reel tipis di bawahnya
        controls: { x: 0.40, y: 0.82, w: 0.20, h: 0.10 }
      }
    },
    panggung_lebar: {
      label: 'Panggung Lebar',
      items: {
        title: { x: 0.20, y: 0.03, w: 0.60, h: 0.09 },
        subtitle: { x: 0.28, y: 0.135, w: 0.44, h: 0.045 },
        slot: { x: 0.05, y: 0.24, w: 0.90, h: 0.42 },    // mesin slot melebar
        prize: { x: 0.05, y: 0.70, w: 0.34, h: 0.17 },   // strip hadiah kiri-bawah
        controls: { x: 0.45, y: 0.70, w: 0.30, h: 0.17 }
      }
    },
    minimalis: {
      label: 'Minimalis',
      items: {
        logo: { x: 0.44, y: 0.05, w: 0.12, h: 0.10 },    // logo di tengah atas
        title: { x: 0.20, y: 0.17, w: 0.60, h: 0.09 },
        subtitle: { x: 0.28, y: 0.265, w: 0.44, h: 0.04 },
        stats: { visible: false },                        // sembunyikan statistik
        prize: { visible: false },                        // sembunyikan sidebar hadiah
        slot: { x: 0.22, y: 0.35, w: 0.56, h: 0.30 },
        controls: { x: 0.40, y: 0.70, w: 0.20, h: 0.10 }
      }
    }
  };

  // Bangun layout penuh dari preset: tiap field jatuh ke DEFAULT_POS bila tak disebut,
  // sehingga item apa pun selalu punya x/y/w/h valid (mis. item yang hanya di-hide).
  function buildPreset(key) {
    var p = PRESETS[key];
    if (!p || !p.items) return defaultLayout();
    var items = {};
    IDS.forEach(function (id) {
      var d = DEFAULT_POS[id];
      var src = p.items[id] || {};
      items[id] = {
        x: src.x != null ? src.x : d.x,
        y: src.y != null ? src.y : d.y,
        w: src.w != null ? src.w : d.w,
        h: src.h != null ? src.h : d.h,
        rot: src.rot || 0,
        opacity: src.opacity != null ? src.opacity : 1,
        z: src.z != null ? src.z : Z[id],
        visible: src.visible !== false
      };
    });
    return { version: 2, stage: { w: 1920, h: 1080 }, items: items };
  }

  function LayoutEditor(root, opts) {
    opts = opts || {};
    this.root = root;
    this.onSave = opts.onSave || function () {};
    this.onUseDefault = opts.onUseDefault || function () {};
    this.onNotify = opts.onNotify || function () {};
    this.getContent = opts.getContent || function () { return {}; };
    this.snap = true;
    this.lockAspect = false;
    this.selectedId = null;
    this.layout = defaultLayout();
    this.itemEls = {};
    this.inputs = {};
    this._buildUI();
    this._bindKeys();
  }

  LayoutEditor.prototype.setLayout = function (layout) {
    var base = (layout && layout.items && Object.keys(layout.items).length) ? layout : defaultLayout();
    this.layout = JSON.parse(JSON.stringify(base));
    var self = this;
    IDS.forEach(function (id) {
      if (!self.layout.items[id]) {
        self.layout.items[id] = { x: DEFAULT_POS[id].x, y: DEFAULT_POS[id].y, w: DEFAULT_POS[id].w, h: DEFAULT_POS[id].h, rot: 0, opacity: 1, z: Z[id], visible: true };
      }
    });
    if (!this.layout.stage) this.layout.stage = { w: 1920, h: 1080 };
    this.render();
  };

  LayoutEditor.prototype.getLayout = function () { return JSON.parse(JSON.stringify(this.layout)); };

  // Terapkan preset ke WORKING COPY (belum permanen sampai "Simpan Tata Letak" ditekan).
  LayoutEditor.prototype.applyPreset = function (key) {
    this.setLayout(buildPreset(key));
    this.select(null);
  };

  // Export: unduh working copy sebagai file JSON mudah-baca (untuk backup / bagi-pakai
  // antar acara). Memakai Blob + <a download> bawaan browser — tanpa library/CDN.
  LayoutEditor.prototype.exportLayout = function () {
    try {
      var data = JSON.stringify(this.getLayout(), null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'doorprize-layout-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 0);
      this.onNotify('success', 'Tata letak diekspor ke file JSON.');
    } catch (e) {
      this.onNotify('error', 'Gagal mengekspor tata letak.');
    }
  };

  // Import: baca file JSON → migrasi/sanitasi → muat ke WORKING COPY (belum permanen;
  // operator tekan "Simpan Tata Letak" untuk menerapkan & menyebarkan).
  LayoutEditor.prototype.importLayoutFile = function (file, onDone) {
    var self = this;
    onDone = onDone || function () {};
    if (!file) { onDone(false, 'Tidak ada file dipilih.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { onDone(false, 'File JSON rusak / tak bisa dibaca.'); return; }
      var migrated = migrateLayout(parsed);
      if (!migrated) { onDone(false, 'File bukan tata letak yang valid.'); return; }
      self.setLayout(migrated);
      self.select(null);
      onDone(true, 'Tata letak diimpor. Tekan "Simpan Tata Letak" untuk menerapkan.');
    };
    reader.onerror = function () { onDone(false, 'Gagal membaca file.'); };
    reader.readAsText(file);
  };

  LayoutEditor.prototype._buildUI = function () {
    var self = this;
    this.root.innerHTML = '';
    this.root.classList.add('le-root');

    // Toolbar
    var tb = document.createElement('div');
    tb.className = 'le-toolbar';
    tb.innerHTML =
      '<label class="le-check"><input type="checkbox" class="le-snap" checked> Snap grid</label>' +
      '<label class="le-check">Preset <select class="le-preset">' +
        '<option value="">— pilih —</option>' +
        '<option value="klasik">Klasik</option>' +
        '<option value="fokus_hadiah">Fokus Hadiah</option>' +
        '<option value="panggung_lebar">Panggung Lebar</option>' +
        '<option value="minimalis">Minimalis</option>' +
      '</select></label>' +
      '<button type="button" class="btn btn-outline btn-small le-export" title="Unduh tata letak sebagai file JSON">Export</button>' +
      '<button type="button" class="btn btn-outline btn-small le-import" title="Muat tata letak dari file JSON">Import</button>' +
      '<input type="file" class="le-file" accept="application/json,.json" hidden>' +
      '<div class="le-spacer"></div>' +
      '<button type="button" class="btn btn-outline btn-small le-usedefault">Pakai Bawaan (Flex)</button>' +
      '<button type="button" class="btn btn-outline btn-small le-resetall">Reset Semua</button>' +
      '<button type="button" class="btn btn-primary btn-small le-save">Simpan Tata Letak</button>';
    this.root.appendChild(tb);

    // Canvas 16:9
    var wrap = document.createElement('div');
    wrap.className = 'le-canvas-wrap';
    var canvas = document.createElement('div');
    canvas.className = 'le-canvas';
    wrap.appendChild(canvas);
    this.root.appendChild(wrap);
    this.stageEl = canvas;

    // Garis bantu (tengah X/Y) — tampil hanya saat elemen di-snap ke tengah panggung.
    var gv = document.createElement('div'); gv.className = 'le-guide le-guide-v'; gv.style.display = 'none';
    var gh = document.createElement('div'); gh.className = 'le-guide le-guide-h'; gh.style.display = 'none';
    canvas.appendChild(gv); canvas.appendChild(gh);
    this.guideV = gv; this.guideH = gh;

    // Build items
    IDS.forEach(function (id) {
      var el = document.createElement('div');
      el.className = 'le-item';
      el.dataset.item = id;
      var inner = '<span class="le-label">' + LABELS[id] + '</span><span class="le-content" data-content="' + id + '"></span>';
      inner += '<span class="le-rot" data-handle="rot" title="Putar elemen"></span>';
      HANDLES.forEach(function (h) { inner += '<span class="le-handle le-h-' + h + '" data-handle="' + h + '"></span>'; });
      el.innerHTML = inner;
      canvas.appendChild(el);
      self.itemEls[id] = el;
      el.addEventListener('pointerdown', function (e) { self._onPointerDown(e, id); });
    });
    canvas.addEventListener('pointerdown', function (e) { if (e.target === canvas) self.select(null); });

    // Properties panel
    var panel = document.createElement('div');
    panel.className = 'le-panel';
    panel.innerHTML =
      '<div class="le-panel-head"><span class="le-panel-title">Pilih elemen untuk mengatur</span></div>' +
      '<div class="le-panel-body">' +
        this._numRow('X', 'x', 0, 100, 0.1, '%') +
        this._numRow('Y', 'y', 0, 100, 0.1, '%') +
        this._numRow('Lebar', 'w', 1, 200, 0.1, '%') +
        this._numRow('Tinggi', 'h', 1, 200, 0.1, '%') +
        this._numRow('Rotasi', 'rot', -180, 180, 1, '°') +
        this._numRow('Opasitas', 'opacity', 0, 100, 1, '%') +
        this._numRow('Lapis (z)', 'z', 0, 9999, 1, '') +
        '<div class="le-row le-row-checks">' +
          '<label class="le-check"><input type="checkbox" class="le-visible" checked> Tampil</label>' +
          '<label class="le-check"><input type="checkbox" class="le-lock"> Kunci rasio</label>' +
          '<button type="button" class="btn btn-outline btn-small le-resetitem">Reset elemen</button>' +
        '</div>' +
      '</div>';
    this.root.appendChild(panel);
    this.panel = panel;

    // wire inputs
    ['x', 'y', 'w', 'h', 'rot', 'opacity', 'z'].forEach(function (k) {
      var inp = panel.querySelector('.le-in-' + k);
      self.inputs[k] = inp;
      inp.addEventListener('input', function () { self._onPanelInput(k, inp.value); });
    });
    this.visibleInput = panel.querySelector('.le-visible');
    this.lockInput = panel.querySelector('.le-lock');
    this.visibleInput.addEventListener('change', function () {
      if (!self.selectedId) return;
      self.layout.items[self.selectedId].visible = self.visibleInput.checked;
      self.render();
    });
    this.lockInput.addEventListener('change', function () { self.lockAspect = self.lockInput.checked; });

    // toolbar actions
    tb.querySelector('.le-snap').addEventListener('change', function (e) { self.snap = e.target.checked; });
    tb.querySelector('.le-preset').addEventListener('change', function (e) {
      var key = e.target.value;
      e.target.value = ''; // balikkan ke placeholder agar preset yang sama bisa dipilih ulang
      if (key) self.applyPreset(key);
    });
    var fileInput = tb.querySelector('.le-file');
    tb.querySelector('.le-export').addEventListener('click', function () { self.exportLayout(); });
    tb.querySelector('.le-import').addEventListener('click', function () { fileInput.value = ''; fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      self.importLayoutFile(f, function (ok, msg) { self.onNotify(ok ? 'success' : 'error', msg); });
    });
    tb.querySelector('.le-save').addEventListener('click', function () { self.onSave(self.getLayout()); });
    tb.querySelector('.le-resetall').addEventListener('click', function () { self.setLayout(defaultLayout()); self.select(null); });
    tb.querySelector('.le-usedefault').addEventListener('click', function () { self.onUseDefault(); });
    panel.querySelector('.le-resetitem').addEventListener('click', function () {
      if (!self.selectedId) return;
      var id = self.selectedId;
      self.layout.items[id] = { x: DEFAULT_POS[id].x, y: DEFAULT_POS[id].y, w: DEFAULT_POS[id].w, h: DEFAULT_POS[id].h, rot: 0, opacity: 1, z: Z[id], visible: true };
      self.render();
    });
  };

  LayoutEditor.prototype._numRow = function (label, key, min, max, step, unit) {
    return '<label class="le-row"><span class="le-row-label">' + label + '</span>' +
      '<input type="number" class="le-in le-in-' + key + '" min="' + min + '" max="' + max + '" step="' + step + '">' +
      '<span class="le-unit">' + unit + '</span></label>';
  };

  LayoutEditor.prototype.select = function (id) { this.selectedId = id; this.render(); };

  LayoutEditor.prototype._onPanelInput = function (key, raw) {
    if (!this.selectedId) return;
    var it = this.layout.items[this.selectedId];
    var v = parseFloat(raw);
    if (isNaN(v)) return;
    if (key === 'z') it.z = Math.round(clamp(v, 0, 9999));
    else if (key === 'rot') it.rot = clamp(v, -180, 180);
    else if (key === 'opacity') it.opacity = clamp(v / 100, 0, 1);
    else if (key === 'w') it.w = clamp(v / 100, MIN, 2);
    else if (key === 'h') it.h = clamp(v / 100, MIN, 2);
    else it[key] = clamp(v / 100, -0.5, 1.5); // x, y
    this.render();
  };

  LayoutEditor.prototype._onPointerDown = function (e, id) {
    e.stopPropagation();
    e.preventDefault();
    this.select(id);
    var self = this;
    var handle = e.target.dataset.handle || null;
    var isRot = handle === 'rot';
    var rect = this.stageEl.getBoundingClientRect();
    var s = JSON.parse(JSON.stringify(this.layout.items[id]));
    var ratio = s.h !== 0 ? s.w / s.h : 1;
    var startX = e.clientX, startY = e.clientY;
    // Pusat elemen di ruang layar (untuk rotasi).
    var cx = rect.left + (s.x + s.w / 2) * rect.width;
    var cy = rect.top + (s.y + s.h / 2) * rect.height;

    function move(ev) {
      var it = self.layout.items[id];
      if (isRot) {
        // sudut dari pusat ke pointer; handle menunjuk ke atas → offset 90°.
        var ang = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
        while (ang > 180) ang -= 360;
        while (ang < -180) ang += 360;
        ang = ev.shiftKey ? Math.round(ang / 15) * 15 : Math.round(ang);
        it.rot = clamp(ang, -180, 180);
        self.render();
        return;
      }
      var dxN = (ev.clientX - startX) / rect.width;
      var dyN = (ev.clientY - startY) / rect.height;
      if (!handle) {
        // geser
        var nx = self._snapV(s.x + dxN);
        var ny = self._snapV(s.y + dyN);
        // snap ke tengah panggung + tampilkan garis bantu
        var snapX = false, snapY = false;
        if (self.snap) {
          if (Math.abs(nx + s.w / 2 - 0.5) < 0.012) { nx = 0.5 - s.w / 2; snapX = true; }
          if (Math.abs(ny + s.h / 2 - 0.5) < 0.012) { ny = 0.5 - s.h / 2; snapY = true; }
        }
        self._showGuides(snapX, snapY);
        it.x = clamp(nx, -0.5, 1.5);
        it.y = clamp(ny, -0.5, 1.5);
      } else {
        // resize
        var x = s.x, y = s.y, w = s.w, h = s.h;
        if (handle.indexOf('e') > -1) w = s.w + dxN;
        if (handle.indexOf('s') > -1) h = s.h + dyN;
        if (handle.indexOf('w') > -1) { w = s.w - dxN; x = s.x + dxN; }
        if (handle.indexOf('n') > -1) { h = s.h - dyN; y = s.y + dyN; }
        w = Math.max(MIN, w); h = Math.max(MIN, h);
        if (self.lockAspect && handle.length === 2) { // hanya sudut
          h = w / ratio;
          if (handle.indexOf('n') > -1) y = s.y + (s.h - h);
          if (handle.indexOf('w') > -1) x = s.x + (s.w - w);
        }
        it.x = self._snapV(x); it.y = self._snapV(y);
        it.w = self._snapV(w); it.h = self._snapV(h);
      }
      self.render();
    }
    function up() {
      self._showGuides(false, false);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  LayoutEditor.prototype._snapV = function (v) {
    return this.snap ? Math.round(v / GRID) * GRID : v;
  };

  LayoutEditor.prototype._showGuides = function (x, y) {
    if (this.guideV) this.guideV.style.display = x ? 'block' : 'none';
    if (this.guideH) this.guideH.style.display = y ? 'block' : 'none';
  };

  // Perbarui HANYA isi pratinjau tiap item (logo/judul/dll) tanpa menyentuh posisi
  // atau panel — aman dipanggil berkala (sinkron 2 detik) tanpa mengganggu editing.
  LayoutEditor.prototype.refreshContent = function () {
    var content = this.getContent() || {};
    var self = this;
    IDS.forEach(function (id) {
      var el = self.itemEls[id];
      if (!el) return;
      var cont = el.querySelector('.le-content');
      if (cont) cont.innerHTML = self._contentHtml(id, content);
    });
  };

  LayoutEditor.prototype._bindKeys = function () {
    var self = this;
    this._keyHandler = function (e) {
      if (!self.selectedId) return;
      // jangan ganggu saat mengetik di input
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var it = self.layout.items[self.selectedId];
      var step = e.shiftKey ? 0.02 : 0.005;
      var handled = true;
      if (e.key === 'ArrowLeft') it.x = clamp(it.x - step, -0.5, 1.5);
      else if (e.key === 'ArrowRight') it.x = clamp(it.x + step, -0.5, 1.5);
      else if (e.key === 'ArrowUp') it.y = clamp(it.y - step, -0.5, 1.5);
      else if (e.key === 'ArrowDown') it.y = clamp(it.y + step, -0.5, 1.5);
      else if (e.key === 'Delete' || e.key === 'Backspace') it.visible = !it.visible;
      else if (e.key === 'Escape') { self.select(null); handled = true; }
      else handled = false;
      if (handled) { e.preventDefault(); self.render(); }
    };
    document.addEventListener('keydown', this._keyHandler);
  };

  LayoutEditor.prototype.destroy = function () {
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  };

  LayoutEditor.prototype._contentHtml = function (id, c) {
    switch (id) {
      case 'logo': return c.logoUrl ? '<img src="' + c.logoUrl + '" alt="logo">' : '🎁';
      case 'title': return '<b>' + (c.title || 'JUDUL ACARA') + '</b>';
      case 'subtitle': return (c.subtitle || 'Sub-judul');
      case 'stats': return '👥 120 · Ronde 1';
      case 'prize': return '🎁 HADIAH';
      case 'slot': return '777 - PST-001';
      case 'controls': return '🏆 SPIN';
      case 'footer': return (c.footer || 'Powered by SATSIBER');
    }
    return '';
  };

  LayoutEditor.prototype.render = function () {
    var self = this;
    var content = this.getContent() || {};
    IDS.forEach(function (id) {
      var el = self.itemEls[id];
      var it = self.layout.items[id];
      el.style.left = (it.x * 100) + '%';
      el.style.top = (it.y * 100) + '%';
      el.style.width = (it.w * 100) + '%';
      el.style.height = (it.h * 100) + '%';
      el.style.transform = it.rot ? ('rotate(' + it.rot + 'deg)') : '';
      // Item terpilih diangkat ke atas agar handle-nya tak tertutup item lain.
      el.style.zIndex = (self.selectedId === id) ? 1000 : (it.z != null ? it.z : 10);
      el.style.opacity = (it.visible === false) ? 0.28 : (it.opacity != null ? it.opacity : 1);
      el.classList.toggle('le-selected', self.selectedId === id);
      el.classList.toggle('le-hidden', it.visible === false);
      var cont = el.querySelector('.le-content');
      if (cont) cont.innerHTML = self._contentHtml(id, content);
    });
    this._syncPanel();
  };

  LayoutEditor.prototype._syncPanel = function () {
    var id = this.selectedId;
    var title = this.panel.querySelector('.le-panel-title');
    var body = this.panel.querySelector('.le-panel-body');
    if (!id) {
      title.textContent = 'Pilih elemen untuk mengatur';
      body.style.opacity = '0.4';
      body.style.pointerEvents = 'none';
      return;
    }
    body.style.opacity = '1';
    body.style.pointerEvents = '';
    title.textContent = 'Elemen: ' + LABELS[id];
    var it = this.layout.items[id];
    this.inputs.x.value = round1(it.x);
    this.inputs.y.value = round1(it.y);
    this.inputs.w.value = round1(it.w);
    this.inputs.h.value = round1(it.h);
    this.inputs.rot.value = Math.round(it.rot || 0);
    this.inputs.opacity.value = Math.round((it.opacity != null ? it.opacity : 1) * 100);
    this.inputs.z.value = (it.z != null ? it.z : 10);
    this.visibleInput.checked = it.visible !== false;
    this.lockInput.checked = this.lockAspect;
  };

  window.LayoutEditor = LayoutEditor;
  window.layoutEditorDefault = defaultLayout;
  window.buildLayoutPreset = buildPreset;
  window.layoutPresetKeys = Object.keys(PRESETS);
  window.migrateLayout = migrateLayout;
  window.LAYOUT_VERSION = LAYOUT_VERSION;
})();
