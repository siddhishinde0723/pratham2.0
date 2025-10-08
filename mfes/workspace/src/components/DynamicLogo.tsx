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
  const [logoConfig, setLogoConfig] = useState<TenantConfig['LOGO_CONFIG'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogoConfig = async () => {
      try {
        setLoading(true);
        console.log('Workspace DynamicLogo: Fetching tenant config for type:', type);
        
        const tenantService = TenantService;
        const tenantId = tenantService.getTenantId();
        console.log('Workspace DynamicLogo: Tenant ID:', tenantId);
        
        const config = await tenantService.getTenantConfig();
        console.log('Workspace DynamicLogo: Full config:', config);
        console.log('Workspace DynamicLogo: Logo config:', config.LOGO_CONFIG);
        console.log('Workspace DynamicLogo: Config type:', typeof config);
        console.log('Workspace DynamicLogo: Config keys:', Object.keys(config || {}));
        
        setLogoConfig(config.LOGO_CONFIG || null);
      } catch (err) {
        console.error('Error fetching tenant logo config:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLogoConfig();
  }, []);

  // Determine the logo source based on type
  const getLogoSrc = (): string => {
    console.log('Workspace DynamicLogo: Getting logo source for type:', type);
    console.log('Workspace DynamicLogo: Error state:', error);
    console.log('Workspace DynamicLogo: Logo config:', logoConfig);
    
    if (error || !logoConfig) {
      const fallback = fallbackSrc || getDefaultLogoSrc();
      console.log('Workspace DynamicLogo: Using fallback:', fallback);
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
    
    console.log('Workspace DynamicLogo: Final logo source:', logoSrc);
    return logoSrc;
  };

  // Default logo sources
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

  const getDefaultFaviconSrc = (): string => {
    return '/favicon.ico';
  };

  // Get alt text
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

  // For favicon, return a link element instead of Image
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
          console.warn(`Failed to load logo: ${logoSrc}`);
          setError(true);
        }}
      />
    </Box>
  );
};

export default DynamicLogo;
