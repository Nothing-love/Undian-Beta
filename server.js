const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/admin') {
    const stateFile = path.join(ROOT, 'admin_state.json');
    
    if (req.method === 'GET') {
      fs.readFile(stateFile, 'utf8', (err, data) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (err) {
          res.end('[]');
        } else {
          res.end(data);
        }
      });
      return;
    } 
    else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        fs.writeFile(stateFile, body, 'utf8', err => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      });
      return;
    }
  }
  else if (req.url === '/api/peserta') {
    const stateFile = path.join(ROOT, 'peserta_state.json');
    
    if (req.method === 'GET') {
      fs.readFile(stateFile, 'utf8', (err, data) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (err) {
          res.end('[]');
        } else {
          res.end(data);
        }
      });
      return;
    } 
    else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        fs.writeFile(stateFile, body, 'utf8', err => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      });
      return;
    }
  }

  // Static file serving
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  filePath = decodeURIComponent(filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // Get network IP addresses
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║         DORPRIZE — Server Running             ║');
  console.log('  ╠═══════════════════════════════════════════════╣');
  console.log(`  ║  Local:    http://localhost:${PORT}              ║`);
  if (addresses.length > 0) {
    addresses.forEach(addr => {
      const url = `http://${addr}:${PORT}`;
      const pad = ' '.repeat(Math.max(0, 33 - url.length));
      console.log(`  ║  Network:  ${url}${pad}║`);
    });
    console.log('  ╠═══════════════════════════════════════════════╣');
    console.log('  ║  Remote Admin Access:                         ║');
    addresses.forEach(addr => {
      const url = `http://${addr}:${PORT}/?rc=true`;
      const pad = ' '.repeat(Math.max(0, 33 - url.length));
      console.log(`  ║  ${url}${pad}║`);
    });
  }
  console.log('  ╠═══════════════════════════════════════════════╣');
  console.log('  ║  Press Ctrl+C to stop                        ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
});
