module.exports = {
  apps: [
    {
      name: 'traqq-backend',
      script: 'server.js',
      cwd: '/var/www/traqq/backend',

      // Production environment overrides
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Development environment overrides
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000
      },

      // Restart policy
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Log files
      out_file: '/var/log/traqq/backend-out.log',
      error_file: '/var/log/traqq/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown — matches the 10s force-exit guard in server.js
      kill_timeout: 12000,
      wait_ready: false,
      listen_timeout: 8000
    }
  ]
};
