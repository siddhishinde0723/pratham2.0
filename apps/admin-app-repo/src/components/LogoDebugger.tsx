import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import TenantService from '../services/TenantService';
import { TenantConfig } from '../utils/fetchTenantConfig';

const LogoDebugger: React.FC = () => {
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const debugTenantConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get tenant ID from localStorage
      const storedTenantId = localStorage.getItem('tenantId');
      setTenantId(storedTenantId || 'No tenant ID found');
      
      if (!storedTenantId) {
        setError('No tenant ID found in localStorage');
        setLoading(false);
        return;
      }

      // Get tenant service instance
      const tenantService = TenantService;
      const config = await tenantService.getTenantConfig();
      setTenantConfig(config);
      
      console.log('Tenant Config Debug:', {
        tenantId: storedTenantId,
        config: config,
        logoConfig: config.LOGO_CONFIG
      });
      
    } catch (err) {
      setError(`Error fetching tenant config: ${err}`);
      console.error('Tenant config debug error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testLogoUrl = (url: string) => {
    const img = new Image();
    img.onload = () => {
      console.log(`✅ Logo loaded successfully: ${url}`);
      alert(`✅ Logo loaded successfully: ${url}`);
    };
    img.onerror = () => {
      console.log(`❌ Logo failed to load: ${url}`);
      alert(`❌ Logo failed to load: ${url}`);
    };
    img.src = url;
  };

  useEffect(() => {
    debugTenantConfig();
  }, []);

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 1, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Logo Debugger
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={debugTenantConfig} 
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Loading...' : 'Debug Tenant Config'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Tenant ID:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 1 }}>
          {tenantId}
        </Typography>
      </Box>

      {tenantConfig && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Tenant Configuration:</Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 1, mb: 2 }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(tenantConfig, null, 2)}
            </pre>
          </Box>

          {tenantConfig.LOGO_CONFIG && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Logo Configuration:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {tenantConfig.LOGO_CONFIG.sidebar && (
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => testLogoUrl(tenantConfig.LOGO_CONFIG!.sidebar!)}
                  >
                    Test Sidebar Logo
                  </Button>
                )}
                {tenantConfig.LOGO_CONFIG.login && (
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => testLogoUrl(tenantConfig.LOGO_CONFIG!.login!)}
                  >
                    Test Login Logo
                  </Button>
                )}
                {tenantConfig.LOGO_CONFIG.favicon && (
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => testLogoUrl(tenantConfig.LOGO_CONFIG!.favicon!)}
                  >
                    Test Favicon
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LogoDebugger;
