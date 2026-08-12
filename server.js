'use strict';

require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const { spawn } = require('child_process');

const app = express();
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
// DATA_DIR default = <root>/data. Bisa dioverride via env DORPRIZE_DATA_DIR
// (mis. volume terpasang, atau instance staging/uji terisolasi). Backward-compatible.
const DATA_DIR = process.env.DORPRIZE_DATA_DIR
  ? path.resolve(process.env.DORPRIZE_DATA_DIR)
  : path.join(ROOT, 'data');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const PORT = Number.parseInt(process.env.PORT || '8082', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const STATE_FILES = {
  settings: path.join(DATA_DIR, 'settings_state.json'),
  peserta: path.join(DATA_DIR, 'peserta_state.json'),
  admin: path.join(DATA_DIR, 'admin_state.json')
};

// Rahasia autentikasi disimpan TERPISAH dari admin_state.json dan TIDAK PERNAH
// dikirim ke klien mana pun: loginPassword (operator, diubah di Pengaturan) dan
// adminPassword (khusus dev, diubah di halaman adm1n).
const AUTH_FILE = path.join(DATA_DIR, 'auth_state.json');

const DEFAULT_STATE = {
  settings: {
    eventTitle: 'DOORPRIZE',
    eventSubtitle: 'Aplikasi Undian Digital',
    logoUrl: null,
    bgUrl: null,
    winnerBgUrl: null,
    theme: 'professional_blue',
    customColors: {
      primary: '#2563EB',
      secondary: '#7C3AED',
      accent: '#F59E0B'
    },
    prizes: [],
    layout: null,
    timestamp: 0
  },
  peserta: {
    dataPeserta: [],
    availableClusters: [],
    hasilUndian: [],
    currentRonde: 1,
    rev: 0,
    timestamp: 0
  },
  admin: {
    targets: [],
    timestamp: 0
  }
};

// Nilai kosong = "belum diset"; getter di bawah akan jatuh ke ENV lalu default.
// auth_state.json yang asli dibuat saat boot oleh migrateAuthState().
const DEFAULT_AUTH = {
  loginPassword: '',
  adminPassword: '',
  updatedAt: 0
};

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SESSION_DIR, { recursive: true });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return clone(fallback);
  }
}

// Tulis JSON atomik (temp + rename). Di Windows, rename-over kadang gagal
// EPERM/EBUSY/EACCES (antivirus/indexing/OneDrive mengunci file sesaat) — dalam
// kasus itu fallback ke tulis langsung agar data (mis. auth_state.json) tetap
// tersimpan dan ganti-password tidak gagal. Di Linux (produksi) jalur rename
// atomik normal yang dipakai.
function writeJsonAtomic(filePath, value) {
  const data = JSON.stringify(value, null, 2);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempPath, data, 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      fs.writeFileSync(filePath, data, 'utf8');
    } finally {
      try { fs.unlinkSync(tempPath); } catch (cleanupError) { /* ignore */ }
    }
  }
}

function safeStringEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sanitizeCategory(value) {
  const cleaned = String(value || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return cleaned || 'image';
}

function detectImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return { extension: 'gif', mimeType: 'image/gif' };
  }

  return null;
}

function persistImageBuffer(buffer, category = 'image') {
  const detected = detectImage(buffer);
  if (!detected) {
    const error = new Error('Isi file bukan gambar JPG, PNG, WEBP, atau GIF yang valid.');
    error.status = 415;
    throw error;
  }

  const prefix = sanitizeCategory(category);
  const uniqueId = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}`;
  const filename = `${prefix}-${uniqueId}.${detected.extension}`;
  const destination = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(destination, buffer, { flag: 'wx' });
  return `/uploads/${filename}`;
}

function migrateDataUrl(value, category) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/uploads/')) return value;

  const match = value.match(/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) return null;

  try {
    return persistImageBuffer(Buffer.from(match[2], 'base64'), category);
  } catch (error) {
    console.warn(`Gagal memigrasikan gambar ${category}:`, error.message);
    return null;
  }
}

// Item panggung yang boleh ditata (whitelist). Id asing dibuang.
const LAYOUT_ITEM_IDS = ['logo', 'title', 'subtitle', 'stats', 'prize', 'slot', 'controls', 'footer'];
// Versi skema layout saat ini. normalizeLayout() membangun ulang SETIAP field dari
// nol & mengklem rentang → apa pun versi input otomatis ternormalisasi ke versi ini
// (koordinat 0..1 stabil lintas versi). Titik-tempel bila bentuk skema berubah kelak.
const LAYOUT_VERSION = 2;

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Sanitasi objek layout dari klien: paksa tipe angka, klem rentang, whitelist id,
// buang key asing. Return null bila kosong/invalid → dashboard pakai layout flex.
function normalizeLayout(input) {
  if (!input || typeof input !== 'object') return null;
  const rawItems = input.items && typeof input.items === 'object' ? input.items : null;
  if (!rawItems) return null;

  const items = {};
  for (const id of LAYOUT_ITEM_IDS) {
    const it = rawItems[id];
    if (!it || typeof it !== 'object') continue;
    items[id] = {
      x: clampNumber(it.x, -0.5, 1.5, 0),
      y: clampNumber(it.y, -0.5, 1.5, 0),
      w: clampNumber(it.w, 0.01, 2, 0.1),
      h: clampNumber(it.h, 0.01, 2, 0.1),
      rot: clampNumber(it.rot, -180, 180, 0),
      opacity: clampNumber(it.opacity, 0, 1, 1),
      z: Math.round(clampNumber(it.z, 0, 9999, 10)),
      visible: it.visible !== false
    };
  }
  if (Object.keys(items).length === 0) return null;

  return {
    version: LAYOUT_VERSION,
    stage: {
      w: Math.round(clampNumber(input.stage && input.stage.w, 320, 8192, 1920)),
      h: Math.round(clampNumber(input.stage && input.stage.h, 320, 8192, 1080))
    },
    items
  };
}

function normalizeSettings(input) {
  const source = input && typeof input === 'object' ? { ...input } : {};

  const imageMappings = [
    ['logoUrl', 'logoBase64', 'logo'],
    ['bgUrl', 'bgBase64', 'background'],
    ['winnerBgUrl', 'winnerBgBase64', 'winner-background']
  ];

  for (const [urlKey, legacyKey, category] of imageMappings) {
    const candidate = source[urlKey] || source[legacyKey];
    const migrated = migrateDataUrl(candidate, category);
    source[urlKey] = migrated || (typeof candidate === 'string' && candidate.startsWith('/uploads/') ? candidate : null);
    delete source[legacyKey];
  }

  source.prizes = Array.isArray(source.prizes)
    ? source.prizes.map((prize, index) => {
        if (!prize || typeof prize !== 'object') return null;
        const cleanPrize = { ...prize };
        const candidate = cleanPrize.imageUrl || cleanPrize.imageBase64;
        const migrated = migrateDataUrl(candidate, `prize-${index + 1}`);
        cleanPrize.imageUrl = migrated || (typeof candidate === 'string' && candidate.startsWith('/uploads/') ? candidate : null);
        delete cleanPrize.imageBase64;
        return cleanPrize;
      }).filter(Boolean)
    : [];

  source.layout = normalizeLayout(source.layout);

  return source;
}

function normalizePeserta(input) {
  const source = input && typeof input === 'object' ? { ...input } : {};
  delete source.settings;
  return {
    dataPeserta: Array.isArray(source.dataPeserta) ? source.dataPeserta : [],
    availableClusters: Array.isArray(source.availableClusters) ? source.availableClusters : [],
    hasilUndian: Array.isArray(source.hasilUndian) ? source.hasilUndian : [],
    currentRonde: Number.isFinite(Number(source.currentRonde)) ? Number(source.currentRonde) : 1,
    rev: Number.isFinite(Number(source.rev)) ? Number(source.rev) : 0,
    timestamp: Number(source.timestamp) || 0
  };
}

// Winner-status advancement order: once a peserta leaves 'Belum Diundi' it must
// never be pulled back (that reversal is the multi-device duplicate-winner bug).
const STATUS_RANK = { 'Belum Diundi': 0, 'Sudah Diundi': 1, 'Gugur': 2 };

function mergeHasilUndian(stored, incoming) {
  const byRonde = new Map();
  for (const rec of Array.isArray(stored) ? stored : []) {
    if (rec && rec.Ronde_Ke !== undefined) byRonde.set(rec.Ronde_Ke, rec);
  }
  for (const rec of Array.isArray(incoming) ? incoming : []) {
    if (!rec || rec.Ronde_Ke === undefined) continue;
    const prev = byRonde.get(rec.Ronde_Ke);
    // Keep whichever record for a round has more winners; ties keep the first stored.
    if (!prev || (Number(rec.Jumlah_Pemenang) || 0) > (Number(prev.Jumlah_Pemenang) || 0)) {
      byRonde.set(rec.Ronde_Ke, rec);
    }
  }
  return Array.from(byRonde.values()).sort((x, y) => (Number(x.Ronde_Ke) || 0) - (Number(y.Ronde_Ke) || 0));
}

// Reconcile an incoming peserta state against what is stored so /api/state is no
// longer blind last-write-wins. `rev` is a generation counter: a higher rev (a
// Reset Undian) is authoritative; a lower rev is stale and discarded; the same
// rev is monotonically merged so a lagging device can never resurrect a winner.
function mergePeserta(storedRaw, incomingRaw) {
  const stored = normalizePeserta(storedRaw);
  const incoming = normalizePeserta(incomingRaw);

  if (incoming.rev > stored.rev) return incoming;   // reset / newer generation wins
  if (incoming.rev < stored.rev) return stored;     // stale writer — discard its peserta

  const storedById = new Map((stored.dataPeserta || []).map(p => [p.id, p]));
  const seen = new Set();
  const dataPeserta = (incoming.dataPeserta || []).map(p => {
    seen.add(p.id);
    const prev = storedById.get(p.id);
    if (!prev) return p;
    const keepStored = (STATUS_RANK[prev.status] || 0) > (STATUS_RANK[p.status] || 0);
    return keepStored ? { ...p, status: prev.status } : p;
  });
  // Locked participants present only in stored (incoming had a stale/partial roster).
  for (const p of stored.dataPeserta || []) {
    if (!seen.has(p.id)) dataPeserta.push(p);
  }

  return {
    dataPeserta,
    availableClusters: (incoming.availableClusters && incoming.availableClusters.length)
      ? incoming.availableClusters : stored.availableClusters,
    hasilUndian: mergeHasilUndian(stored.hasilUndian, incoming.hasilUndian),
    currentRonde: Math.max(stored.currentRonde, incoming.currentRonde),
    rev: stored.rev,
    timestamp: incoming.timestamp
  };
}

function normalizeAdmin(input) {
  const source = input && typeof input === 'object' ? input : {};
  // CATATAN KEAMANAN: password sengaja TIDAK lagi disimpan di slice admin maupun
  // dikembalikan ke klien. Rahasia login/panel ada di auth_state.json (server-only).
  return {
    targets: Array.isArray(source.targets) ? source.targets : [],
    timestamp: Number(source.timestamp) || 0
  };
}

function migrateLegacyStateFiles() {
  for (const [key, destination] of Object.entries(STATE_FILES)) {
    const legacyPath = path.join(ROOT, `${key === 'peserta' ? 'peserta' : key}_state.json`);
    if (!fs.existsSync(destination) && fs.existsSync(legacyPath)) {
      fs.copyFileSync(legacyPath, destination);
    }
  }

  const settings = normalizeSettings(readJson(STATE_FILES.settings, DEFAULT_STATE.settings));
  const peserta = normalizePeserta(readJson(STATE_FILES.peserta, DEFAULT_STATE.peserta));
  const admin = normalizeAdmin(readJson(STATE_FILES.admin, DEFAULT_STATE.admin));

  writeJsonAtomic(STATE_FILES.settings, settings);
  writeJsonAtomic(STATE_FILES.peserta, peserta);
  writeJsonAtomic(STATE_FILES.admin, admin);
}

function readLegacyAdminPassword() {
  for (const candidate of [STATE_FILES.admin, path.join(ROOT, 'admin_state.json')]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (parsed && typeof parsed.password === 'string' && parsed.password.trim()) {
        return parsed.password.trim();
      }
    } catch (error) { /* file tidak ada / bukan JSON — lanjut */ }
  }
  return '';
}

// Seed auth_state.json sekali dari password lama (admin_state.json) + ENV agar
// login lama tetap jalan. WAJIB sebelum migrateLegacyStateFiles() menormalisasi
// admin_state.json (yang kini membuang field password).
function migrateAuthState() {
  if (fs.existsSync(AUTH_FILE)) return;
  const legacyPass = readLegacyAdminPassword();
  const envLogin = String(process.env.ADMIN_PASSWORD || '').trim();
  const envPanel = String(process.env.ADMIN_PANEL_PASSWORD || '').trim();
  writeJsonAtomic(AUTH_FILE, {
    loginPassword: legacyPass || envLogin || 'admin2026',
    adminPassword: envPanel || legacyPass || 'admin2026',
    updatedAt: Date.now()
  });
}

migrateAuthState();
migrateLegacyStateFiles();

if (IS_PRODUCTION) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: false }));

const sessionSecret = process.env.SESSION_SECRET || 'CHANGE-ME-DOORPRIZE-SESSION-SECRET';
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️ SESSION_SECRET belum diatur di .env. Ganti sebelum produksi.');
}

// Session store berbasis file yang tahan EPERM Windows: tulis lewat
// writeJsonAtomic (punya fallback tulis-langsung) dan destroy best-effort (tak
// pernah error) agar req.session.regenerate saat login tidak gagal ketika file
// sesi ter-lock antivirus. Tetap persist di disk (aman untuk pm2 reload di prod).
class RobustFileStore extends session.Store {
  constructor(dir, ttlSeconds = 24 * 60 * 60) {
    super();
    this.dir = dir;
    this.ttlMs = ttlSeconds * 1000;
  }
  _path(sid) {
    const safe = String(sid).replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.dir, `${safe}.json`);
  }
  get(sid, cb) {
    fs.readFile(this._path(sid), 'utf8', (err, raw) => {
      if (err) return cb(err.code === 'ENOENT' ? null : err, null);
      let parsed;
      try { parsed = JSON.parse(raw); } catch (parseError) { return cb(null, null); }
      if (parsed.__expires && Date.now() > parsed.__expires) {
        return this.destroy(sid, () => cb(null, null));
      }
      return cb(null, parsed.sess || null);
    });
  }
  set(sid, sess, cb) {
    const maxAge = sess && sess.cookie && typeof sess.cookie.maxAge === 'number' ? sess.cookie.maxAge : this.ttlMs;
    try {
      writeJsonAtomic(this._path(sid), { __expires: Date.now() + maxAge, sess });
      return cb && cb(null);
    } catch (error) {
      return cb && cb(error);
    }
  }
  touch(sid, sess, cb) {
    return this.set(sid, sess, cb);
  }
  destroy(sid, cb) {
    // best-effort: JANGAN pernah error agar regenerate/login tak gagal di Windows.
    fs.unlink(this._path(sid), () => (cb ? cb(null) : undefined));
  }
}

app.use(session({
  name: 'doorprize.sid',
  store: new RobustFileStore(SESSION_DIR),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function readAuthState() {
  return readJson(AUTH_FILE, DEFAULT_AUTH);
}

// Password login (luar) — dipakai POST /login. Sumber: auth_state.json →
// ENV ADMIN_PASSWORD → default. Diubah operator lewat Pengaturan.
function getLoginPassword() {
  const auth = readAuthState();
  const filePass = auth && typeof auth.loginPassword === 'string' ? auth.loginPassword.trim() : '';
  const envPass = String(process.env.ADMIN_PASSWORD || '').trim();
  return filePass || envPass || 'admin2026';
}

// Password panel admin (dalam) — dipakai POST /api/admin/unlock. Sumber:
// auth_state.json → ENV ADMIN_PANEL_PASSWORD → default. Hanya dev. TIDAK PERNAH
// dikirim ke klien.
function getAdminPanelPassword() {
  const auth = readAuthState();
  const filePass = auth && typeof auth.adminPassword === 'string' ? auth.adminPassword.trim() : '';
  const envPass = String(process.env.ADMIN_PANEL_PASSWORD || '').trim();
  return filePass || envPass || 'admin2026';
}

function writeAuthPatch(patch) {
  const current = readAuthState();
  const next = { ...DEFAULT_AUTH, ...current, ...patch, updatedAt: Date.now() };
  writeJsonAtomic(AUTH_FILE, next);
  return next;
}

function isValidNewPassword(value) {
  return typeof value === 'string' && value.trim().length >= 4 && value.length <= 128;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn === true) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login');
}

// Gate tambahan untuk konfigurasi & rahasia panel admin: butuh sesi login DAN
// unlock panel admin (POST /api/admin/unlock) yang diverifikasi server-side.
function requireAdminUnlocked(req, res, next) {
  if (req.session && req.session.loggedIn === true && req.session.adminUnlocked === true) return next();
  return res.status(403).json({ error: 'Panel admin terkunci. Masukkan password panel admin.' });
}

app.use((req, res, next) => {
  if (!req.path.endsWith('.html')) return next();
  const cleanPath = req.path.slice(0, -5);
  if (['/login', '/dashboard', '/setting', '/adm1n'].includes(cleanPath)) {
    return res.redirect(cleanPath);
  }
  return res.redirect('/login');
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  immutable: true,
  maxAge: '30d',
  fallthrough: false
}));

app.use(express.static(PUBLIC_DIR, {
  index: false,
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.(?:js|css|html)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/login', (req, res) => {
  if (req.session && req.session.loggedIn) return res.redirect('/dashboard');
  return res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.post('/login', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (username.length > 50 || password.length > 128) {
    return res.redirect('/login?error=1');
  }

  // Kredensial valid HANYA yang dikonfigurasi: ADMIN_USERNAME (.env) dan password
  // LOGIN dari auth_state.json → ENV ADMIN_PASSWORD → default 'admin2026' via
  // getLoginPassword(). Password panel adm1n TERPISAH (getAdminPanelPassword) dan
  // tak dipakai di sini. Tidak ada backdoor; mengganti password login benar-benar
  // menonaktifkan yang lama.
  const validUsername = String(process.env.ADMIN_USERNAME || 'admin').trim();
  const validPassword = getLoginPassword();

  const isUsernameValid = safeStringEqual(username, validUsername);
  const isPasswordValid = safeStringEqual(password, validPassword);

  if (isUsernameValid && isPasswordValid) {
    return req.session.regenerate((error) => {
      if (error) return res.redirect('/login?error=1');
      req.session.loggedIn = true;
      return req.session.save(() => res.redirect('/dashboard'));
    });
  }

  return res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  if (!req.session) return res.redirect('/login');
  return req.session.destroy(() => {
    res.clearCookie('doorprize.sid');
    res.redirect('/login');
  });
});

app.get('/', requireAuth, (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html')));
app.get('/setting', requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'setting.html')));
app.get('/adm1n', requireAuth, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'adm1n.html')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024
  }
});

app.post('/api/upload/image', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'File gambar tidak ditemukan.' });
  }

  const url = persistImageBuffer(req.file.buffer, req.body.category);
  return res.status(201).json({ success: true, url });
});

app.delete('/api/upload/image', requireAuth, (req, res) => {
  const url = typeof req.body.url === 'string' ? req.body.url : '';
  const match = url.match(/^\/uploads\/([a-zA-Z0-9._-]+)$/);
  if (!match) return res.status(400).json({ error: 'URL upload tidak valid.' });

  const filename = path.basename(match[1]);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    return res.status(400).json({ error: 'Path upload tidak valid.' });
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  return res.json({ success: true });
});

app.get('/api/settings', requireAuth, (req, res) => {
  return res.json(readJson(STATE_FILES.settings, DEFAULT_STATE.settings));
});

app.post('/api/settings', requireAuth, (req, res) => {
  const payload = {
    ...normalizeSettings(req.body),
    timestamp: Date.now()
  };
  writeJsonAtomic(STATE_FILES.settings, payload);
  return res.json({ success: true, timestamp: payload.timestamp });
});

app.get('/api/peserta', requireAuth, (req, res) => {
  return res.json(readJson(STATE_FILES.peserta, DEFAULT_STATE.peserta));
});

app.post('/api/peserta', requireAuth, (req, res) => {
  const storedPeserta = readJson(STATE_FILES.peserta, DEFAULT_STATE.peserta);
  const payload = mergePeserta(storedPeserta, req.body);
  payload.timestamp = Date.now();
  writeJsonAtomic(STATE_FILES.peserta, payload);
  return res.json({ success: true, timestamp: payload.timestamp });
});

// Konfigurasi target = khusus dev (butuh unlock). Kembalikan targets saja.
app.get('/api/admin', requireAuth, requireAdminUnlocked, (req, res) => {
  const admin = normalizeAdmin(readJson(STATE_FILES.admin, DEFAULT_STATE.admin));
  return res.json({ targets: admin.targets });
});

// Tulis konfigurasi target penuh (tambah/ubah/hapus) — khusus dev (butuh unlock).
app.post('/api/admin', requireAuth, requireAdminUnlocked, (req, res) => {
  const payload = {
    ...normalizeAdmin(req.body),
    timestamp: Date.now()
  };
  writeJsonAtomic(STATE_FILES.admin, payload);
  return res.json({ success: true, timestamp: payload.timestamp });
});

// Update HANYA status (dari layar undian/operator, TANPA unlock). Server hanya
// menyalin `status` ke target yang SUDAH ada dengan keanggotaan identik; payload
// tak bisa menambah target atau mengubah siapa yang ditarget → operator tidak
// bisa merekayasa pemenang lewat endpoint ini.
app.post('/api/admin/status', requireAuth, (req, res) => {
  const stored = normalizeAdmin(readJson(STATE_FILES.admin, DEFAULT_STATE.admin));
  const incoming = Array.isArray(req.body.targets) ? req.body.targets : [];
  const identity = (t) =>
    `${t.ronde}|${t.cluster || 'Semua'}|${[...(Array.isArray(t.targets) ? t.targets : [])].sort().join(',')}`;

  const statusByKey = new Map();
  for (const t of incoming) {
    if (t && typeof t.status === 'string') statusByKey.set(identity(t), t.status.slice(0, 40));
  }

  stored.targets = stored.targets.map((t) => {
    const status = statusByKey.get(identity(t));
    return typeof status === 'string' ? { ...t, status } : t;
  });
  stored.timestamp = Date.now();
  writeJsonAtomic(STATE_FILES.admin, stored);
  return res.json({ success: true, timestamp: stored.timestamp });
});

// Buka kunci panel admin (verifikasi server-side; password tak pernah ke klien).
// Ada lockout sederhana per-sesi untuk menghambat brute-force.
app.post('/api/admin/unlock', requireAuth, (req, res) => {
  const now = Date.now();
  if (req.session.adminLockUntil && now < req.session.adminLockUntil) {
    const waitSec = Math.ceil((req.session.adminLockUntil - now) / 1000);
    return res.status(429).json({ error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${waitSec} detik.` });
  }

  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (password.length > 128) return res.status(400).json({ error: 'Password tidak valid.' });

  if (safeStringEqual(password, getAdminPanelPassword())) {
    req.session.adminUnlocked = true;
    req.session.adminFails = 0;
    req.session.adminLockUntil = 0;
    return req.session.save(() => res.json({ success: true }));
  }

  req.session.adminFails = (Number(req.session.adminFails) || 0) + 1;
  if (req.session.adminFails >= 5) {
    req.session.adminLockUntil = now + 30 * 1000;
    req.session.adminFails = 0;
  }
  return req.session.save(() => res.status(401).json({ error: 'Password panel admin salah.' }));
});

app.post('/api/admin/lock', requireAuth, (req, res) => {
  req.session.adminUnlocked = false;
  return req.session.save(() => res.json({ success: true }));
});

// Ganti password panel admin (di halaman adm1n) — butuh unlock + password lama.
app.post('/api/admin/password', requireAuth, requireAdminUnlocked, (req, res) => {
  const current = typeof req.body.current === 'string' ? req.body.current : '';
  const next = typeof req.body.next === 'string' ? req.body.next : '';
  if (!safeStringEqual(current, getAdminPanelPassword())) {
    return res.status(401).json({ error: 'Password panel admin saat ini salah.' });
  }
  if (!isValidNewPassword(next)) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }
  writeAuthPatch({ adminPassword: next.trim() });
  return res.json({ success: true });
});

// Ganti password login/operator (di Pengaturan) — butuh login + password lama.
app.post('/api/login-password', requireAuth, (req, res) => {
  const current = typeof req.body.current === 'string' ? req.body.current : '';
  const next = typeof req.body.next === 'string' ? req.body.next : '';
  if (!safeStringEqual(current, getLoginPassword())) {
    return res.status(401).json({ error: 'Password login saat ini salah.' });
  }
  if (!isValidNewPassword(next)) {
    return res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
  }
  writeAuthPatch({ loginPassword: next.trim() });
  return res.json({ success: true });
});

app.get('/api/state', requireAuth, (req, res) => {
  const settings = normalizeSettings(readJson(STATE_FILES.settings, DEFAULT_STATE.settings));
  const peserta = normalizePeserta(readJson(STATE_FILES.peserta, DEFAULT_STATE.peserta));
  const admin = normalizeAdmin(readJson(STATE_FILES.admin, DEFAULT_STATE.admin));
  const timestamp = Math.max(settings.timestamp || 0, peserta.timestamp || 0, admin.timestamp || 0);
  const clientTimestamp = Number(req.query.ts) || 0;

  if (clientTimestamp >= timestamp && timestamp > 0) {
    return res.json({ changed: false, timestamp });
  }

  return res.json({ changed: true, settings, peserta, admin, timestamp });
});

app.post('/api/state', requireAuth, (req, res) => {
  const timestamp = Date.now();

  if (req.body.settings && typeof req.body.settings === 'object') {
    writeJsonAtomic(STATE_FILES.settings, {
      ...normalizeSettings(req.body.settings),
      timestamp
    });
  }

  if (req.body.peserta && typeof req.body.peserta === 'object') {
    const storedPeserta = readJson(STATE_FILES.peserta, DEFAULT_STATE.peserta);
    const mergedPeserta = mergePeserta(storedPeserta, req.body.peserta);
    mergedPeserta.timestamp = timestamp;
    writeJsonAtomic(STATE_FILES.peserta, mergedPeserta);
  }

  // Slice `admin` sengaja TIDAK ditulis di sini. Semua perubahan target/password
  // admin hanya melalui POST /api/admin (satu-satunya pemilik state admin), agar
  // sinkron peserta dari dashboard tidak menimpa/menghapus target admin aktif
  // (last-write-wins clobber antar-perangkat).

  return res.json({ success: true, timestamp });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint tidak ditemukan.' });
  return res.status(404).send('Not Found');
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Ukuran gambar maksimal 10 MB.' });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error && (error.type === 'request.aborted' || error.code === 'ECONNRESET')) {
    return res.status(400).json({ error: 'Request dibatalkan oleh client.' });
  }

  const status = Number(error.status) || 500;
  console.error('Express error:', error.stack || error.message || error);
  if (res.headersSent) return next(error);
  return res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : error.message });
});

function startOptionalTunnel() {
  const provider = String(process.env.TUNNEL_PROVIDER || 'none').trim().toLowerCase();
  if (!provider || provider === 'none' || provider === 'off') return;

  let command;
  let args;

  if (provider === 'cloudflare' || provider === 'cloudflared' || provider === 'claudflare') {
    command = 'cloudflared';
    args = ['tunnel', '--url', `http://127.0.0.1:${PORT}`];
  } else if (provider === 'localtunnel') {
    command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    args = ['-y', 'localtunnel', '--port', String(PORT)];
  } else if (provider === 'ngrok') {
    command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    args = ['ngrok', 'http', String(PORT)];
    if (process.env.NGROK_AUTHTOKEN) args.push('--authtoken', process.env.NGROK_AUTHTOKEN);
  } else {
    console.warn(`⚠️ TUNNEL_PROVIDER tidak dikenal: ${provider}`);
    return;
  }

  try {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (data) => process.stdout.write(`[tunnel] ${data}`));
    child.stderr.on('data', (data) => process.stderr.write(`[tunnel] ${data}`));
    child.on('error', (error) => console.warn(`⚠️ Tunnel tidak dapat dijalankan: ${error.message}`));
    child.on('exit', (code) => console.warn(`⚠️ Tunnel berhenti dengan kode ${code}`));
  } catch (error) {
    console.warn(`⚠️ Gagal menjalankan tunnel: ${error.message}`);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Doorprize berjalan di http://0.0.0.0:${PORT}`);
  console.log(`📁 Upload tersimpan di ${UPLOAD_DIR}`);
  startOptionalTunnel();
});
