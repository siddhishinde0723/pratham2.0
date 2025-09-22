// Arrow icons removed
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  ListItemButton,
} from '@mui/material';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { useState } from 'react';
import LogoIcon from '../logo/LogoIcon';
import Buynow from './Buynow';
import Menuitems from './MenuItems';
import { getFilteredMenuItems } from './MenuItems';

//menu config dynamic
import { MENU_CONFIG, getMenuConfigForTenant } from '../../../config/menuConfig';
import Link from 'next/link';

const Sidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: any) => {
  //menu config dynamic
  const storedRole = localStorage.getItem('roleName');
  const storedProgram = localStorage.getItem('program');
  // const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  if (!storedRole && !storedProgram) return null;

  const [open, setOpen] = useState<number | null>(null);
  const filteredMenuItems = getFilteredMenuItems();

  const { t } = useTranslation();
  const lgUp = useMediaQuery((theme: any) => theme?.breakpoints?.up('lg'));

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    manageUsers: true, // Keep Manage Users expanded by default
  });
  const router = useRouter();

  const handleToggle = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getActiveStyle = (link: string) =>
    router.pathname === link
      ? { backgroundColor: '#FDBF34', color: 'black', borderRadius: '100px' }
      : {};

  // Get menu config dynamically for any tenant
  const tenantMenuConfig = getMenuConfigForTenant(storedProgram || '');
  const menuItems = Object.entries(tenantMenuConfig || {}).filter(
    ([_, item]: [string, any]) => item.roles.includes(storedRole)
  );

  // console.log('menuItems', JSON.stringify(menuItems));

  const SidebarContent = (
    <Box
      p={2}
      // minHeight="100%"
      bgcolor="#F8EFDA"
      sx={{
        background: 'linear-gradient(to bottom, white, #F8EFDA)',
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <LogoIcon />
      </Box>

      <Box mt={2}>
        <List component="nav">
          {menuItems.map(([key, item]: [string, any]) => {
            const hasSubMenu = item.subMenu && item.subMenu.length > 0;
            const isAllowed = item.roles.includes(storedRole);

            if (!isAllowed) return null;

            return (
              <div key={key}>
                <ListItemButton
                  onClick={() => {
                    if (hasSubMenu && key !== 'manageUsers') {
                      handleToggle(key);
                    } else if (!hasSubMenu) {
                      router.push(item.link);
                    }
                    // For manageUsers, do nothing on click - keep it always expanded
                  }}
                  style={getActiveStyle(item.link)}
                >
                  <ListItemIcon>
                    <Image
                      src={item.icon}
                      alt={t(item.title)}
                      width={20}
                      height={20}
                    />
                  </ListItemIcon>
                  <ListItemText primary={t(item.title)} />
                </ListItemButton>

                {hasSubMenu && (
                  <Collapse in={openMenus[key]} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subMenu
                        .filter((sub: any) => sub.roles.includes(storedRole))
                        .map((sub: any) => (
                          <ListItemButton
                            key={sub.link}
                            sx={{ pl: 4 }}
                            onClick={() => router.push(sub.link)}
                            style={getActiveStyle(sub.link)}
                          >
                            <ListItemText primary={t(sub.title)} />
                          </ListItemButton>
                        ))}
                    </List>
                  </Collapse>
                )}
              </div>
            );
          })}
        </List>
      </Box>
      <Buynow />
    </Box>
  );

  if (lgUp) {
    return (
      <Drawer
        anchor="left"
        open={isSidebarOpen}
        variant="persistent"
        PaperProps={{
          sx: {
            width: '284px',
            border: '0 !important',
            boxShadow: '0px 7px 30px 0px rgb(113 122 131 / 11%)',
          },
        }}
      >
        {SidebarContent}
      </Drawer>
    );
  }
  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      PaperProps={{
        sx: {
          width: '284px',
          border: '0 !important',
        },
      }}
      variant="temporary"
    >
      {SidebarContent}
    </Drawer>
  );
};

Sidebar.propTypes = {
  isMobileSidebarOpen: PropTypes.bool,
  onSidebarClose: PropTypes.func,
  isSidebarOpen: PropTypes.bool,
};

export default Sidebar;
