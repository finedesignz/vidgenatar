const fs = require('fs')

// Load /app/.env into process.env (Coolify writes runtime env vars here)
if (fs.existsSync('/app/.env')) {
  require('dotenv').config({ path: '/app/.env' })
}

module.exports = {
  apps: [
    {
      name: 'vidgenatar-web',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '9102',
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        ADMIN_API_KEY: process.env.ADMIN_API_KEY,
        NEXT_PUBLIC_ADMIN_KEY: process.env.NEXT_PUBLIC_ADMIN_KEY,
      },
    },
    {
      name: 'vidgenatar-worker',
      script: 'node_modules/.bin/tsx',
      args: '--tsconfig tsconfig.worker.json worker/index.ts',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
}
