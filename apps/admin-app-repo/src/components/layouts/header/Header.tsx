import React, { useEffect, useRef, useState } from 'react';
// import FeatherIcon from "feather-icons-react";
import { AppBar, Box, IconButton, Toolbar } from '@mui/material';
// Academic year imports removed
import config from '../../../../config.json';
import PropTypes from 'prop-types';
import Image from 'next/image';
import SearchBar from './SearchBar';
import { useRouter } from 'next/router';

import { useTranslation } from 'next-i18next';
import { createTheme, useTheme } from '@mui/material/styles';
import Profile from './Profile';
// Academic year imports removed
import { Role, TenantName } from '@/utils/app.constant';
import MenuIcon from '@mui/icons-material/Menu';

const Header = ({
  sx,
  customClass,
  toggleMobileSidebar,
  position,
  showIcon,
}: any) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();
  const router = useRouter();

  const [userRole, setUserRole] = useState('');
  // Academic year useEffect removed

  useEffect(() => {
    const storedUserData = localStorage.getItem('adminInfo');
    if (storedUserData) {
      const userData = JSON.parse(storedUserData);
      setUserRole(userData.role);
    }
  }, []);
  // Academic year handleSelectChange function removed

  // Language functions removed
  return (
    <AppBar sx={sx} position={position} elevation={0} className={customClass}>
      <Toolbar sx={{ gap: '15px' }}>
        <IconButton
          size="large"
          color="inherit"
          aria-label="menu"
          onClick={toggleMobileSidebar}
          sx={{
            display: {
              color: theme.palette.warning['A400'],
              lg: 'none',
              xs: 'flex',
              '@media (max-width: 600px)': {
                padding: '0px',
              },
            },
          }}
        >
          {/* {showIcon === false ? "" : <FeatherIcon icon="menu" size="20" />} */}
          <MenuIcon />
        </IconButton>
        {/* ------------------------------------------- */}
        {/* Search Dropdown */}
        {/* ------------------------------------------- */}
        {/* <SearchBar
          placeholder={t("NAVBAR.SEARCHBAR_PLACEHOLDER")}
          backgroundColor={theme.palette.background.default}
        /> */}
        {/* ------------ End Menu icon ------------- */}

        <Box flexGrow={1} />

        {/* Academic Year dropdown removed */}

        {/* Language dropdown removed */}
        <Profile />
        {/* ------------------------------------------- */}
        {/* Profile Dropdown */}
        {/* ------------------------------------------- */}
      </Toolbar>
    </AppBar>
  );
};

Header.propTypes = {
  sx: PropTypes.object,
  customClass: PropTypes.string,
  position: PropTypes.string,
  toggleSidebar: PropTypes.func,
  toggleMobileSidebar: PropTypes.func,
  showIcon: PropTypes.bool,
};

export default Header;
