module.exports = {
  apps: [
    {
      name: 'admin-app-repo',
      script: '/workspace/node_modules/.bin/next',
      args: 'start -p 3002',
      cwd: '/workspace/apps/admin-app-repo',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'workspace',
      script: '/workspace/node_modules/.bin/next',
      args: 'start -p 4104',
      cwd: '/workspace/mfes/workspace',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
