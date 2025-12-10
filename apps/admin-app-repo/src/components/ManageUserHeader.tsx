import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  AppBar,
  Toolbar,
  Button,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import TranslateIcon from '@mui/icons-material/Translate';
import config from '../../config.json';

const ManageUserHeader = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const open = Boolean(anchorEl);
  const languageOpen = Boolean(languageAnchorEl);
  const theme = useTheme<any>();

  const userName = localStorage.getItem('name') || 'Anonymous';
  const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
  const language = i18n.language;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/logout';
  };

  const handleEditPassword = () => {
    handleMenuClose();
    router.push('/edit-password');
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    handleLanguageClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const firstLetterInUpperCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#78590C',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontSize: '22px',
            fontWeight: 400,
          }}
        >
          Manage Users
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Language Selector */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'white',
            }}
            onClick={handleLanguageOpen}
          >
            <TranslateIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              {config.languages.find((lang) => lang.code === language)?.label ||
                'EN'}
            </Typography>
          </Box>

          <Menu
            anchorEl={languageAnchorEl}
            open={languageOpen}
            onClose={handleLanguageClose}
            PaperProps={{
              style: {
                width: '20ch',
              },
            }}
          >
            {config.languages.map((lang) => (
              <MenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                sx={{
                  backgroundColor:
                    lang.code === language ? 'rgba(0, 0, 0, 0.08)' : 'inherit',
                  '&:hover': {
                    backgroundColor:
                      lang.code === language
                        ? 'rgba(0, 0, 0, 0.12)'
                        : 'rgba(0, 0, 0, 0.08)',
                  },
                }}
              >
                {lang.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Profile Dropdown */}
          <Button
            aria-label="menu"
            color="inherit"
            aria-controls="profile-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{
              border: 'none',
              paddingLeft: '0px !important',
              paddingRight: '0px !important',
            }}
          >
            <Box display="flex" alignItems="center" color="white">
              <AccountCircleIcon />
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Typography
                  variant="body1"
                  fontWeight="400"
                  sx={{
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '16px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('Hi',)} {localStorage.getItem('name')}
                </Typography>
              </Box>
            </Box>
          </Button>

          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                minWidth: '320px',
                borderRadius: '12px',
              },
            }}
            MenuListProps={{
              sx: {
                paddingTop: '50px !important',
                paddingBottom: '0px !important',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '-25px',
              }}
            >
              <Box
                sx={{
                  backgroundColor: '#78590C',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="h6"
                  color="white"
                  sx={{ fontWeight: 'bold', fontSize: '18px' }}
                >
                  {getInitials(userName)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                position: 'relative',
                backgroundColor: 'white',
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  marginBottom: '15px',
                  marginTop: '10px',
                  textAlign: 'center',
                  px: '20px',
                  fontSize: '16px',
                }}
              >
                {userName}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  marginBottom: '20px',
                  textAlign: 'center',
                  px: '20px',
                  color: '#7C766F',
                  fontSize: '14px',
                }}
              >
                {adminInfo?.role}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  px: '20px',
                }}
              >
                <PhoneIcon sx={{ marginRight: '10px' }} />
                <Typography variant="body1" sx={{ fontSize: '14px' }}>
                  {adminInfo?.mobile}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '20px',
                  px: '20px',
                }}
              >
                <MailIcon sx={{ marginRight: '10px' }} />
                <Typography variant="body1" sx={{ fontSize: '14px' }}>
                  {adminInfo?.email}
                </Typography>
              </Box>

              <Divider sx={{ color: '#D0C5B4' }} />
              <Box
                sx={{
                  px: '20px',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  onClick={handleEditPassword}
                  sx={{
                    fontSize: '16px',
                    backgroundColor: 'white',
                    border: '0.6px solid #1E1B16',
                    my: '20px',
                    width: '100%',
                  }}
                >
                  {t('COMMON.EDIT_PASSWORD')}
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleLogout}
                  sx={{
                    fontSize: '16px',
                    backgroundColor: '#78590C',
                    my: '20px',
                    width: '100%',
                    '&:hover': {
                      backgroundColor: '#5a4209',
                    },
                  }}
                >
                 Logout
                </Button>
              </Box>
            </Box>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ManageUserHeader;
