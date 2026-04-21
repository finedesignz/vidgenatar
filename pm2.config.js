module.exports = {
  apps: [
    {
      name: 'vidgenatar-web',
      script: 'server.js',
      env: { NODE_ENV: 'production', PORT: '9102', HOSTNAME: '0.0.0.0' },
    },
    {
      name: 'vidgenatar-worker',
      script: 'node_modules/.bin/tsx',
      args: '--tsconfig tsconfig.worker.json worker/index.ts',
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
}
