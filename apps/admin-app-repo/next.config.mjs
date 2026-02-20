/** @type {import('next').NextConfig} */
import nextI18nextConfig from "./next-i18next.config.js";

import { NextFederationPlugin } from '@module-federation/nextjs-mf';
const CLOUD_STORAGE_URL = process.env.CLOUD_STORAGE_URL || 'https://saas-prod.s3.ap-south-1.amazonaws.com';
const PORTAL_BASE_URL = "https://sunbird-editor.tekdinext.com";
const cleanCloudStorageUrl = CLOUD_STORAGE_URL.replace(/\/sunbird-content-prod\/?$/, '').replace(/\/$/, '');
const remotes = (isServer) => {
  const location = isServer ? 'ssr' : 'chunks';
  const PLAYERS_BASE_URL = process.env.NEXT_PUBLIC_PLAYERS_BASE_URL || 'http://localhost:4108/mfe_players';
  const WORKSPACE_BASE_URL = process.env.NEXT_PUBLIC_WORKSPACE_BASE_URL || 'http://localhost:3001/mfe_workspace';

  return {
    editor: `editor@${WORKSPACE_BASE_URL}/_next/static/${location}/remoteEntry.js`,
    players: `players@${PLAYERS_BASE_URL}/_next/static/${location}/remoteEntry.js`,
  };
};

const CONTENT_EDITOR_BASE_URL = 'https://shiksha-dev-ge.tekdinext.com';
const routes = {
  API: {
    GENERAL: {
      CONTENT_PREVIEW: '/content/preview/:path*',
      CONTENT_PLUGINS: '/content-plugins/:path*',
      GENERIC_EDITOR: '/generic-editor/:path*',
      // CONTENT_EDITOR: '/content-editor/:path*',
    },
  },
};

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: false,
  reactStrictMode: true,
  i18n: nextI18nextConfig.i18n,
  distDir: "build",
  images: {
    unoptimized: true,
  },
  experimental: {
    esmExternals: false,
  },
  webpack: (config, { dev, isServer }) => {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'admin',
        filename: 'static/chunks/remoteEntry.js',
        remotes: remotes(isServer),
        exposes: {},
      })
    );
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  async rewrites() {
    // Get environment variables with fallbacks
    const WORKSPACE_BASE_URL = process.env.NEXT_PUBLIC_WORKSPACE_BASE_URL || 'http://localhost:3001';
    const TELEMETRY_URL = process.env.NEXT_PUBLIC_TELEMETRY_URL || 'http://localhost:3001';
    const CLOUD_STORAGE_URL = process.env.CLOUD_STORAGE_URL || 'https://saas-prod.s3.ap-south-1.amazonaws.com';

    console.log('Environment variables:', {
      WORKSPACE_BASE_URL,
      TELEMETRY_URL,
      CLOUD_STORAGE_URL
    });

    return [
      {
        source: '/action/asset/v1/upload/:identifier*',
        destination: '/api/fileUpload',
      },
      {
        source: '/assets/pdfjs/:path*',
        destination: `${WORKSPACE_BASE_URL}/assets/pdfjs/:path*`,
      },
      {
        source: '/play/content/assets/pdfjs/:path*',
        destination: `${WORKSPACE_BASE_URL}/assets/pdfjs/:path*`,
      },
      {
        source: '/play/content/assets/:path*',
        destination: `${WORKSPACE_BASE_URL}/assets/:path*`,
      },
      {
        source: '/action/content/v3/upload/url/:identifier*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/action/content/v3/upload/url/:identifier*`,
      },
      {
        source: '/action/content/v3/upload/:identifier*',
        destination: '/api/fileUpload',
      },
      {
        source: '/mfe_workspace/workspace/content/assets/:path*',
        destination: `/assets/:path*`,
      },
      {
        source: '/workspace/content/assets/:path*',
        destination: `/assets/:path*`,
      },
      {
        source: '/mfe_workspace/assets/:path*', // Match all requests under /mfe_workspace/assets
        destination: '/mfe_workspace/assets/:path*', // Serve from public/
      },
      {
        source: '/action/asset/:path*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/action/asset/:path*`,
      },
      {
        source: '/action/v1/telemetry',
        destination: `${TELEMETRY_URL}/v1/telemetry`,
      },
      {
        source: '/action/data/v3/telemetry',
        destination: `${TELEMETRY_URL}/v1/telemetry`,
      },
      {
        source: '/data/v3/telemetry',
        destination: `${TELEMETRY_URL}/v1/telemetry`,
      },
       {
        source: '/action/content/v3/read/:identifier*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/action/content/v3/read/:identifier*`,
      },
      {
        source: '/action/content/:path*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/action/content/:path*`,
      },
      {
        source: '/api/tenantConfig/:path*',
        destination: `${WORKSPACE_BASE_URL}/api/tenantConfig/:path*`,
      },
      {
        source: '/action/:path*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/action/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${WORKSPACE_BASE_URL}/api/proxy?path=/api/:path*`,
      },
        {
        source: '/content/assets/:path*',
        destination: `${cleanCloudStorageUrl}/content/assets/:path*`,
      },
      {
        source: '/assets/public/:path*',
        destination: `${cleanCloudStorageUrl}/:path*`,
      },
      {
        source: routes.API.GENERAL.CONTENT_PREVIEW,
        destination: `${PORTAL_BASE_URL}${routes.API.GENERAL.CONTENT_PREVIEW}`,
      },
      {
        source: routes.API.GENERAL.CONTENT_PLUGINS,
        destination: `${PORTAL_BASE_URL}${routes.API.GENERAL.CONTENT_PLUGINS}`,
      },
      {
        source: routes.API.GENERAL.GENERIC_EDITOR,
        destination: `${PORTAL_BASE_URL}/:path*`,
      },
      // {
      //   source: routes.API.GENERAL.CONTENT_EDITOR,
      //   destination: `${CONTENT_EDITOR_BASE_URL}/:path*`, // Proxy to generic editor portal
      // },
      {
        source: '/sunbird-plugins/renderer/:path*',
        destination: `${WORKSPACE_BASE_URL}/sunbird-plugins/renderer/:path*`,
      },
      {
        source: '/app/telemetry',
        destination: `${WORKSPACE_BASE_URL}/api/telemetry`,
      },
      {
        source: '/mfe_workspace/:path*',
        destination: `http://localhost:4104/mfe_workspace/:path*`,
      },
      {
        source: '/content-editor/telemetry', // Match telemetry route
        destination: `${WORKSPACE_BASE_URL}/api/telemetry`, // Redirect to telemetry proxy
      },
      {
        source: '/mfe_players/:path*',
        destination: `http://localhost:4108/mfe_players/:path*`,
      },
    ];
  },
};

export default nextConfig;
