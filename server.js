'use strict';

require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { spawn } = require('child_process');

const app = express();
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const DATA_DIR = path.join(ROOT, 'data');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const PORT = Number.parseInt(process.env.PORT || '8082', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const STATE_FILES = {
  settings: path.join(DATA_DIR, 'settings_state.json'),
  peserta: path.join(DATA_DIR, 'peserta_state.json'),
  admin: path.join(DATA_DIR, 'admin_state.json')
};

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
    timestamp: 0
  },
  peserta: {
    dataPeserta: [],
    availableClusters: [],
    hasilUndian: [],
    currentRonde: 1,
    timestamp: 0
  },
  admin: {
    targets: [],
    password: 'admin2026',
    timestamp: 0
  }
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

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
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
    timestamp: Number(source.timestamp) || 0
  };
}

function normalizeAdmin(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    targets: Array.isArray(source.targets) ? source.targets : [],
    password: typeof source.password === 'string' && source.password ? source.password.slice(0, 128) : 'admin2026',
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

app.use(session({
  name: 'doorprize.sid',
  store: new FileStore({
    path: SESSION_DIR,
    ttl: 24 * 60 * 60,
    retries: 1,
    logFn: () => {}
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION ? 'auto' : false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'rahasia123';

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn === true) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login');
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
  if (req.session.loggedIn) return res.redirect('/dashboard');
  return res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.post('/login', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (username.length > 50 || password.length > 128) {
    return res.redirect('/login?error=1');
  }

  if (safeStringEqual(username, USERNAME) && safeStringEqual(password, PASSWORD)) {
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
  const payload = {
    ...normalizePeserta(req.body),
    timestamp: Date.now()
  };
  writeJsonAtomic(STATE_FILES.peserta, payload);
  return res.json({ success: true, timestamp: payload.timestamp });
});

app.get('/api/admin', requireAuth, (req, res) => {
  return res.json(readJson(STATE_FILES.admin, DEFAULT_STATE.admin));
});

app.post('/api/admin', requireAuth, (req, res) => {
  const payload = {
    ...normalizeAdmin(req.body),
    timestamp: Date.now()
  };
  writeJsonAtomic(STATE_FILES.admin, payload);
  return res.json({ success: true, timestamp: payload.timestamp });
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
    writeJsonAtomic(STATE_FILES.peserta, {
      ...normalizePeserta(req.body.peserta),
      timestamp
    });
  }

  if (req.body.admin && typeof req.body.admin === 'object') {
    writeJsonAtomic(STATE_FILES.admin, {
      ...normalizeAdmin(req.body.admin),
      timestamp
    });
  }

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
