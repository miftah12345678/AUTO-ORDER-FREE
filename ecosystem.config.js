// ecosystem.config.js - Konfigurasi PM2 untuk menjalankan bot 24/7 di VPS
// Cara pakai: pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: 'hams-auto-order',
      script: 'main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Jakarta'
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
