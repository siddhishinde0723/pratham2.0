import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
} from '@mui/material';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import {
  getLocalStoredUserName,
  syncUserDataToCookies,
  needsUserDataSync,
} from '../services/LocalStorageService';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
const loginUrl = process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL;

const WorkspaceHeader = () => {
  const router = useRouter();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme<any>();

  // Sync user data from localStorage to cookies on component mount
  useEffect(() => {
    if (needsUserDataSync()) {
      console.log('WorkspaceHeader: User data sync needed, performing sync...');
      syncUserDataToCookies();
    }
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    // Clear cookies
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    Cookies.remove('userId');
    Cookies.remove('userData');
    Cookies.remove('adminInfo');
    
    // Clear localStorage (preserve some keys if needed)
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToKeep = [
        'preferredLanguage',
        'mui-mode',
        'mui-color-scheme-dark',
        'mui-color-scheme-light',
        'hasSeenTutorial',
      ];
      const valuesToKeep: { [key: string]: any } = {};
      keysToKeep.forEach((key: string) => {
        valuesToKeep[key] = localStorage.getItem(key);
      });
      localStorage.clear();
      keysToKeep.forEach((key: string) => {
        if (valuesToKeep[key] !== null) {
          localStorage.setItem(key, valuesToKeep[key]);
        }
      });
    }
    
    // In MFE architecture, redirect to admin app login page
    // Get the base URL and construct login URL
    if (typeof window !== 'undefined') {
      try {
        // Get the base URL from current location
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const adminLoginUrl = loginUrl || `${baseUrl}/login`;
        
        console.log('🔄 Logout - Base URL:', baseUrl);
        console.log('🔄 Logout - Admin Login URL:', adminLoginUrl);
        console.log('🔄 Logout - Current URL:', window.location.href);
        console.log('🔄 Logout - Is in iframe?', window.parent !== window);
        console.log('🔄 Logout - Is top window?', window.top !== window);
        
        // Try to access top window first (for nested iframes)
        // Then try parent window, then fallback to current window
        if (window.top && window.top !== window) {
          console.log('🔄 Redirecting via window.top to:', adminLoginUrl);
          window.top.location.href = adminLoginUrl;
        } else if (window.parent && window.parent !== window) {
          console.log('🔄 Redirecting via window.parent to:', adminLoginUrl);
          window.parent.location.href = adminLoginUrl;
        } else {
          // Not in iframe, redirect directly
          console.log('🔄 Redirecting directly to:', adminLoginUrl);
          window.location.href = adminLoginUrl;
        }
      } catch (error) {
        // If cross-origin error, use direct redirect with constructed URL
        console.warn('⚠️ Cannot access parent/top window, using direct redirect:', error);
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const adminLoginUrl = loginUrl || `${baseUrl}/login`;
        window.location.href = adminLoginUrl;
      }
    }
  };

  const handleMenuCollapse = () => {
    setAnchorEl(null);
  };

  const userName = getLocalStoredUserName();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'linear-gradient(to right, white, #F8EFDA)',
        borderBottom: '1px solid #ddd',
      }}
    >
      <Typography
        variant="h2"
        sx={{
          color: '#635E57',
          marginRight: '10px',
          fontSize: '22px',
          fontWeight: 400,
          '@media (max-width: 900px)': { paddingLeft: '34px' },
        }}
      >
        Admin Workspace
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ width: 32, height: 32, mr: 1 }} />
        <Typography variant="body1">{userName}</Typography>
        <IconButton onClick={handleMenuOpen} size="small">
          <ArrowDropDownIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuCollapse}
          PaperProps={{ elevation: 3 }}
        >
          <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default WorkspaceHeader;
