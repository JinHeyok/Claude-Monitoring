module.exports = {
  apps: [
    {
      name: 'claude-monitoring',
      script: 'pnpm',
      args: 'dev',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
  ],
};
