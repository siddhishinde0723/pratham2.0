import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
import TenantService from '../services/TenantService';
import { TenantConfig } from '../utils/fetchTenantConfig';

interface DynamicLogoProps {
  type: 'sidebar' | 'login' | 'favicon';
  width?: number;
  height?: number;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DynamicLogo: React.FC<DynamicLogoProps> = ({
  type,
  width = 100,
  height = 100,
  alt,
  fallbackSrc,
  className,
  style,
}) => {
  const [logoConfig, setLogoConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogoConfig = async () => {
      try {
        setLoading(true);
        console.log('🟢 DynamicLogo: Fetching tenant config for type:', type);

        const tenantService = TenantService;
        const tenantId = tenantService.getTenantId();
        console.log('🟢 DynamicLogo: Tenant ID:', tenantId);

        // Check if tenantId exists before attempting to fetch
        if (!tenantId) {
          console.warn('⚠️ DynamicLogo: No tenant ID found, using fallback logo');
          setError(true);
          setLoading(false);
          return;
        }

        const config: any = await tenantService.getTenantConfig();
        console.log('🟢 DynamicLogo: Full config:', config);

        // ✅ Support both shapes safely, without TS error
        let resolvedLogoConfig: any = null;

        if (config?.LOGO_CONFIG) {
          resolvedLogoConfig = config.LOGO_CONFIG;
        } else if ((config as any)?.result?.LOGO_CONFIG) {
          resolvedLogoConfig = (config as any).result.LOGO_CONFIG;
        } else if ((config as any)?.result) {
          resolvedLogoConfig = (config as any).result;
        } else {
          resolvedLogoConfig = config;
        }

        console.log('🟢 DynamicLogo: Resolved logo config:', resolvedLogoConfig);
        setLogoConfig(resolvedLogoConfig);
      } catch (err) {
        // Silently handle errors - use fallback logo instead
        console.warn('⚠️ DynamicLogo: Error fetching tenant logo config, using fallback:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLogoConfig();
  }, []);

  const getDefaultLogoSrc = (): string => {
    switch (type) {
      case 'sidebar':
        return '/assets/images/logo.png';
      case 'login':
        return '/assets/images/appLogo.png';
      default:
        return '/assets/images/logo.png';
    }
  };

  const getDefaultFaviconSrc = (): string => '/favicon.ico';

  const getLogoSrc = (): string => {
    if (error || !logoConfig) {
      const fallback = fallbackSrc || getDefaultLogoSrc();
      console.log('⚠️ DynamicLogo: Using fallback:', fallback);
      return fallback;
    }

    let logoSrc = '';
    switch (type) {
      case 'sidebar':
        logoSrc = logoConfig.sidebar || logoConfig.login || fallbackSrc || getDefaultLogoSrc();
        break;
      case 'login':
        logoSrc = logoConfig.login || logoConfig.sidebar || fallbackSrc || getDefaultLogoSrc();
        break;
      case 'favicon':
        logoSrc = logoConfig.favicon || fallbackSrc || getDefaultFaviconSrc();
        break;
      default:
        logoSrc = fallbackSrc || getDefaultLogoSrc();
    }

    console.log('✅ DynamicLogo: Final logo source:', logoSrc);
    return logoSrc;
  };

  const getAltText = (): string => {
    if (alt) return alt;
    if (logoConfig?.alt) return logoConfig.alt;
    return 'Logo';
  };

  if (loading) {
    return (
      <Skeleton
        variant="rectangular"
        width={width}
        height={height}
        animation="wave"
        className={className}
        style={style}
      />
    );
  }

  const logoSrc = getLogoSrc();
  const altText = getAltText();

  if (type === 'favicon') {
    return (
      <link
        rel="icon"
        type="image/x-icon"
        href={logoSrc}
        className={className}
      />
    );
  }

  return (
    <Box className={className} style={style}>
      <img
        src={logoSrc}
        alt={altText}
        width={width}
        height={height}
        onError={() => {
          console.warn(`⚠️ Failed to load logo: ${logoSrc}`);
          setError(true);
        }}
      />
    </Box>
  );
};

export default DynamicLogo;
