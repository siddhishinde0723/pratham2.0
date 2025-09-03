module.exports = {
  apps: [
    {
      name: 'admin-app-repo',
      script: 'sh',
      args: '-c "cd /workspace/apps/admin-app-repo && /workspace/node_modules/.bin/next start -p 3002"',
      cwd: '/workspace',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'workspace',
      script: 'sh',
      args: '-c "cd /workspace/mfes/workspace && /workspace/node_modules/.bin/next start -p 4104"',
      cwd: '/workspace',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
