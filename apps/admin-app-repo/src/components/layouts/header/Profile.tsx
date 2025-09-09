import { TelemetryEventType } from '@/utils/app.constant';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useTranslation } from 'next-i18next';
import React, { useEffect } from 'react';

import { firstLetterInUpperCase, getUserFullName } from '@/utils/Helper';
import { telemetryFactory } from '@/utils/telemetry';
import LogoutIcon from '@mui/icons-material/Logout';
import { Box, Button, Menu, Typography } from '@mui/material';
import { useRouter } from 'next/router';

const Profile = () => {
  const [anchorEl4, setAnchorEl4] = React.useState<null | HTMLElement>(null);
  const [userName, setUserName] = React.useState<string | null>('');

  const { t } = useTranslation();
  const router = useRouter();

  const handleClick4 = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl4(event.currentTarget);
    const windowUrl = window.location.pathname;
    const cleanedUrl = windowUrl.replace(/^\//, '');
    const env = cleanedUrl.split('/')[0];

    const telemetryInteract = {
      context: {
        env: env,
        cdata: [],
      },
      edata: {
        id: 'click-on-profile',
        type: TelemetryEventType.CLICK,
        subtype: '',
        pageid: cleanedUrl,
      },
    };
    telemetryFactory.interact(telemetryInteract);
  };

  const handleClose4 = () => {
    setAnchorEl4(null);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('token');
    }
    router.push('/logout');
  };

  const getUserName = () => {
    setUserName(getUserFullName());
  };

  useEffect(() => {
    getUserName();
  }, []);

  return (
    <>
      <Button
        aria-label="menu"
        color="inherit"
        aria-controls="profile-menu"
        aria-haspopup="true"
        onClick={handleClick4}
        sx={{
          border: 'none',
          paddingLeft: '0px !important',
          paddingRight: '0px !important',
          '@media (max-width: 600px)': {
            minWidth: '0px !important',
          },
        }}
      >
        <Box display="flex" alignItems="center" color="white">
          <AccountCircleIcon />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              // ml: 1,
              '@media (max-width: 600px)': {
                display: 'none',
              },
            }}
          >
            <Typography
              variant="body1"
              fontWeight="400"
              sx={{
                ml: 1,
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '16px',
                whiteSpace: 'nowrap',
              }}
            >
              {t('COMMON.HI', { name: firstLetterInUpperCase(userName ?? '') })}
            </Typography>
            {/* 
            <FeatherIcon icon="chevron-down" size="20" /> */}
          </Box>
        </Box>
      </Button>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl4}
        open={Boolean(anchorEl4)}
        onClose={handleClose4}
        sx={{
          paddingTop: '0px',
        }}
        PaperProps={{
          sx: {
            minWidth: '200px',
            borderRadius: '12px',
          },
        }}
        MenuListProps={{
          sx: {
            paddingTop: '10px !important',
            paddingBottom: '10px !important',
          },
        }}
      >
        <Box sx={{ px: '10px' }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleLogout}
            sx={{
              fontSize: '16px',
              backgroundColor: '#FDBE16',
              border: '0.6px solid #1E1B16',
              py: '10px',
            }}
            endIcon={<LogoutIcon />}
          >
            {t('COMMON.LOGOUT')}
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default Profile;
