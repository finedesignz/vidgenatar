module.exports = {
  apps: [
    {
      name: 'vidgenatar-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 9102',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'vidgenatar-worker',
      script: 'node_modules/.bin/tsx',
      args: 'worker/index.ts',
      env: { NODE_ENV: 'production' },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
}
