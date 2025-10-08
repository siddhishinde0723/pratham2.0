import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import DynamicLogo from './DynamicLogo';
import TenantService from '../services/TenantService';

const LogoTest: React.FC = () => {
  const testTenantConfig = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      console.log('Current tenant ID:', tenantId);
      
      const response = await fetch(`/api/tenantConfig?tenantId=${tenantId}`);
      const config = await response.json();
      console.log('Tenant config from API:', config);
      
      if (config.LOGO_CONFIG) {
        console.log('Logo config found:', config.LOGO_CONFIG);
        console.log('Sidebar logo URL:', config.LOGO_CONFIG.sidebar);
      } else {
        console.log('No logo config found in tenant configuration');
      }
    } catch (error) {
      console.error('Error testing tenant config:', error);
    }
  };

  return (
    <Box sx={{ p: 2, border: '2px solid red', m: 2 }}>
      <Typography variant="h6" color="error">
        Logo Test Component
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testTenantConfig}
        sx={{ mb: 2 }}
      >
        Test Tenant Config API
      </Button>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Dynamic Sidebar Logo:</Typography>
        <DynamicLogo 
          type="sidebar" 
          width={100} 
          height={100} 
          fallbackSrc="/images/Logo.svg"
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Dynamic Login Logo:</Typography>
        <DynamicLogo 
          type="login" 
          width={200} 
          height={80} 
          fallbackSrc="/images/appLogo.png"
        />
      </Box>
    </Box>
  );
};

export default LogoTest;
