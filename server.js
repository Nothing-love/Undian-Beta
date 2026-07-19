require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const app = express();
const PORT = 8080;
const ROOT = __dirname;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'dorprize-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Hardcoded user/pass for simple security
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD || 'rahasia123';

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.redirect('/login');
    }
  }
}

// Middleware to enforce clean URLs and block direct static HTML access
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const cleanPath = req.path.slice(0, -5); // remove '.html'
    if (cleanPath === '/login') {
      return res.redirect('/login');
    }
    // Redirect other HTML views to their clean routes, which will run requireAuth
    if (['/dashboard', '/setting', '/adm1n'].includes(cleanPath)) {
      return res.redirect(cleanPath);
    }
    // Block any other direct HTML access
    return res.redirect('/login');
  }
  next();
});

// Serve static assets unconditionally (CSS, JS, images)
// Restrict static files to only allow app.js and style.css
app.use((req, res, next) => {
  const allowedStatic = ['/app.js', '/style.css'];
  if (allowedStatic.includes(req.path.toLowerCase())) {
    return next();
  }
  if (path.extname(req.path)) {
    return res.status(403).send('Access Denied');
  }
  next();
});

app.use(express.static(ROOT, {
  index: false,
  setHeaders: (res, filePath) => {
    // Disable caching for all files during upgrade
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');
  }
}));

// Routes for HTML views
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/dashboard');
  res.sendFile(path.join(ROOT, 'login.html'));
});

app.post('/login', (req, res) => {
  let { username, password } = req.body;
  
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.redirect('/login?error=1');
  }
  if (username.length > 50 || password.length > 50) {
    return res.redirect('/login?error=1');
  }

  username = username.replace(/[<>'"&]/g, '').trim();
  password = password.trim();

  if (username === USERNAME && password === PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected routes
app.get('/', requireAuth, (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(ROOT, 'dashboard.html')));
app.get('/setting', requireAuth, (req, res) => res.sendFile(path.join(ROOT, 'setting.html')));
app.get('/adm1n', requireAuth, (req, res) => res.sendFile(path.join(ROOT, 'adm1n.html')));

// APIs
app.get('/api/admin', requireAuth, (req, res) => {
  const stateFile = path.join(ROOT, 'admin_state.json');
  fs.readFile(stateFile, 'utf8', (err, data) => {
    if (err) return res.json({ targets: [], password: 'admin' });
    try { res.json(JSON.parse(data)); } catch(e) { res.json({ targets: [] }); }
  });
});

app.post('/api/admin', requireAuth, (req, res) => {
  const stateFile = path.join(ROOT, 'admin_state.json');
  fs.writeFile(stateFile, JSON.stringify(req.body), 'utf8', err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/peserta', requireAuth, (req, res) => {
  const stateFile = path.join(ROOT, 'peserta_state.json');
  fs.readFile(stateFile, 'utf8', (err, data) => {
    if (err) return res.json({ dataPeserta: [], availableClusters: [] });
    try { res.json(JSON.parse(data)); } catch(e) { res.json({ dataPeserta: [] }); }
  });
});

app.post('/api/peserta', requireAuth, (req, res) => {
  const stateFile = path.join(ROOT, 'peserta_state.json');
  fs.writeFile(stateFile, JSON.stringify(req.body), 'utf8', err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n  ✅ Server berjalan di http://localhost:${PORT}`);
  
  // Start ngrok if token is provided
  const ngrokToken = process.env.NGROK_AUTHTOKEN;
  if (ngrokToken) {
    try {
      // Terminate any hanging/orphan ngrok.exe processes to prevent "account limited to 1 active tunnel" errors
      try {
        execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' });
      } catch (e) {
        // Ignore if no ngrok processes were running
      }

      console.log('  Membuka tunnel Ngrok (CLI Mode)...');
      const ngrokPath = path.join(__dirname, 'node_modules', 'ngrok', 'bin', 'ngrok.exe');
      
      const ngrokProcess = spawn(ngrokPath, ['http', PORT.toString(), '--authtoken', ngrokToken]);
      
      let ngrokErrorOutput = '';
      if (ngrokProcess.stderr) {
        ngrokProcess.stderr.on('data', (data) => {
          ngrokErrorOutput += data.toString();
        });
      }

      ngrokProcess.on('close', (code) => {
        if (code && code !== 0) {
          console.error(`\n  ❌ Proses Ngrok keluar dengan kode ${code}`);
          if (ngrokErrorOutput) {
            console.error(`  Detail Error Ngrok:\n${ngrokErrorOutput}`);
          }
        }
      });

      // Polling setiap 3 detik (maksimal 15 kali) untuk mendapatkan url public
      let attempts = 0;
      const checkInterval = setInterval(async () => {
        attempts++;
        try {
          const response = await fetch('http://127.0.0.1:4040/api/tunnels');
          const data = await response.json();
          if (data && data.tunnels && data.tunnels.length > 0) {
            const url = data.tunnels[0].public_url;
            console.log('  ========================================');
            console.log(`  🌐 Akses Publik: ${url}`);
            console.log('  ========================================');
            console.log(`  Login   : ${url}/login`);
            console.log(`  Undian  : ${url}/dashboard`);
            console.log(`  Setting : ${url}/setting`);
            console.log(`  Admin   : ${url}/adm1n`);
            console.log('  ========================================');
            clearInterval(checkInterval);
          } else if (attempts >= 15) {
             console.log('  ⚠️ Ngrok berjalan, tetapi koneksi Anda sangat lambat. Silakan cek http://127.0.0.1:4040 di browser.');
             clearInterval(checkInterval);
          }
        } catch (err) {
          if (attempts >= 15) {
            console.error('  ❌ Gagal mendapatkan URL Ngrok setelah 45 detik:', err.message);
            clearInterval(checkInterval);
          }
        }
      }, 3000);
    } catch (err) {
      console.error('  ❌ Gagal menjalankan Ngrok CLI:', err.message);
    }
  } else {
    console.log('  ⚠️ NGROK_AUTHTOKEN tidak ditemukan di .env. Aplikasi hanya bisa diakses secara lokal.');
  }
});
