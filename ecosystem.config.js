module.exports = {
  apps: [
    {
      name: 'traqq-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,

      // env is always applied regardless of --env flag
      env: {
        NODE_ENV: 'production',
        PORT: 3000
        // Secrets (DATABASE_URL, JWT_SECRET, STRIPE_*, etc.) must be in backend/.env
        // or set in the VPS system environment — never hardcoded here.
      },

      // env_production is merged when you run: pm2 start ecosystem.config.js --env production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // PM2 will honour SIGTERM from server.js graceful shutdown handler (10 s window)
      kill_timeout: 12000,
      wait_ready: false,

      error_file: '../logs/backend-error.log',
      out_file:   '../logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '5s'
    }
  ]
};
