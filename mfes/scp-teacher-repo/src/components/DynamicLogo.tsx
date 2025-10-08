import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
        const tenantService = TenantService;
        const config = await tenantService.getTenantConfig();
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
    if (error || !logoConfig) {
      return fallbackSrc || getDefaultLogoSrc();
    }

    switch (type) {
      case 'sidebar':
        return logoConfig.sidebar || logoConfig.login || fallbackSrc || getDefaultLogoSrc();
      case 'login':
        return logoConfig.login || logoConfig.sidebar || fallbackSrc || getDefaultLogoSrc();
      case 'favicon':
        return logoConfig.favicon || fallbackSrc || getDefaultFaviconSrc();
      default:
        return fallbackSrc || getDefaultLogoSrc();
    }
  };

  // Default logo sources
  const getDefaultLogoSrc = (): string => {
    switch (type) {
      case 'sidebar':
        return '/images/appLogo.png';
      case 'login':
        return '/images/appLogo.png';
      default:
        return '/images/appLogo.png';
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
      <Image
        src={logoSrc}
        alt={altText}
        width={width}
        height={height}
        priority
        onError={() => {
          console.warn(`Failed to load logo: ${logoSrc}`);
          setError(true);
        }}
      />
    </Box>
  );
};

export default DynamicLogo;
