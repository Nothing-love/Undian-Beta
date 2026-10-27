module.exports = {
  apps: [
    {
      name: 'doorprize-satsiber',
      script: './server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // PORT & TUNNEL_PROVIDER sengaja TIDAK diset di sini: env PM2 mengalahkan .env,
      // jadi port yang diatur operator di .env (mis. PORT=8000) akan diabaikan.
      // Atur keduanya di .env (default server: 8082 & none).
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
