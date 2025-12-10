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
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import LogoIcon from '../logo/LogoIcon';
import Buynow from './Buynow';
import Menuitems from './MenuItems';
import { getFilteredMenuItems } from './MenuItems';

//menu config dynamic
import {
  MENU_CONFIG,
  getMenuConfigForTenant,
} from '../../../config/menuConfig';
import Link from 'next/link';

const Sidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
}: any) => {
  //menu config dynamic
  const storedRole = localStorage.getItem('roleName');
  const storedProgram = localStorage.getItem('program');

  if (!storedRole && !storedProgram) return null;

  const [open, setOpen] = useState<number | null>(null);
  const filteredMenuItems = getFilteredMenuItems();

  const { t } = useTranslation();
  const lgUp = useMediaQuery((theme: any) => theme?.breakpoints?.up('lg'));

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    manageUsers: true,
    groups: false,
  });

  const [filteredMenuConfig, setFilteredMenuConfig] = useState<any>(null);
  const router = useRouter();

  // Check if program is OBLF
  const isOBLFProgram = localStorage.getItem('channelId') === 'oblf-channel';

  useEffect(() => {
    // Get menu config dynamically for any tenant
    const tenantMenuConfig = getMenuConfigForTenant(storedProgram || '');

    // Process and filter menu items
    const processedMenuConfig: any = {};

    Object.entries(tenantMenuConfig || {}).forEach(
      ([key, item]: [string, any]) => {
        // Check if user role has access
        const isAllowed = item.roles.includes(storedRole);

        if (!isAllowed) return;

        // For non-OBLF programs, hide specific items
        if (!isOBLFProgram) {
          // Hide "Classes" for non-OBLF programs
          if (key === 'classes') {
            return;
          }

          // Filter subMenu items for "manageUsers" to hide Teacher and Students
          if (key === 'manageUsers' && item.subMenu) {
            const filteredSubMenu = item.subMenu.filter((sub: any) => {
              // Hide Teacher and Students from submenu for non-OBLF
              return !(sub.title === 'Teacher' || sub.title === 'Students');
            });

            // Only add manageUsers if it has subMenu items after filtering
            if (filteredSubMenu.length > 0) {
              processedMenuConfig[key] = {
                ...item,
                subMenu: filteredSubMenu,
              };
            }
            return;
          }
        }

        // For OBLF programs or other items, add as is
        processedMenuConfig[key] = item;
      }
    );

    setFilteredMenuConfig(processedMenuConfig);
  }, [storedRole, storedProgram, isOBLFProgram]);

  const handleToggle = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getActiveStyle = (link: string) =>
    router.pathname === link
      ? { backgroundColor: '#FDBF34', color: 'black', borderRadius: '100px' }
      : {};

  // Don't render until menu config is processed
  if (!filteredMenuConfig) return null;

  const SidebarContent = (
    <Box
      p={2}
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
          {Object.entries(filteredMenuConfig || {}).map(
            ([key, item]: [string, any]) => {
              const hasSubMenu = item.subMenu && item.subMenu.length > 0;

              return (
                <div key={key}>
                  <ListItemButton
                    onClick={() => {
                      if (hasSubMenu) {
                        handleToggle(key);
                      } else if (!hasSubMenu) {
                        try {
                          router.push(item.link);
                        } catch (error) {
                          console.error('Navigation error:', error);
                        }
                      }
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
                    {hasSubMenu &&
                      (openMenus[key] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      ))}
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
                              onClick={() => {
                                try {
                                  router.push(sub.link);
                                } catch (error) {
                                  console.error('Navigation error:', error);
                                }
                              }}
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
            }
          )}
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