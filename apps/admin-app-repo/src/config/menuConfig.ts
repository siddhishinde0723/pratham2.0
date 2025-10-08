/* eslint-disable @nx/enforce-module-boundaries */
import { Role, TenantName } from '@/utils/app.constant';
import { getCurrentTenantName } from '@/utils/tenantMapping';

// Universal menu items for all admins (Groups menu removed - only available for Swadhaar)
const UNIVERSAL_ADMIN_MENU = {
  manageUsers: {
    title: 'Manage Users',
    icon: '/images/group.svg',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
    subMenu: [
      {
        title: 'Learners',
        link: '/learners',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Content Creator',
        link: '/content-creator',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Content Reviewer',
        link: '/content-reviewer',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
    ],
  },
};


// Function to get menu config for any tenant
export const getMenuConfigForTenant = (tenantName: string) => {
  // If tenantName is empty or not found, try to get it from tenant ID mapping
  let resolvedTenantName = tenantName;
  if (!resolvedTenantName || !Object.values(TenantName).includes(resolvedTenantName as TenantName)) {
    const mappedTenantName = getCurrentTenantName();
    if (mappedTenantName) {
      resolvedTenantName = mappedTenantName;
    }
  }
  
  // Base universal admin menu for all tenants (Manage Users only)
  let menuConfig: any = { ...UNIVERSAL_ADMIN_MENU };
  
  // Only Swadhaar tenant gets Groups menu in addition to Manage Users
  if (resolvedTenantName === TenantName.SWADHAAR) {
    menuConfig = {
      ...menuConfig, // Include Manage Users
      groups: {
        title: 'SIDEBAR.GROUPS',
        icon: '/images/group.svg',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        subMenu: [
          {
            title: 'SIDEBAR.GROUPS_OVERVIEW',
            link: '/groups-overview',
            roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
          },
          {
            title: 'SIDEBAR.CREATE_GROUPS',
            link: '/create-groups',
            roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
          },
          {
            title: 'SIDEBAR.ADD_USERS_TO_GROUPS',
            link: '/add-users-to-groups',
            roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
          },
          {
            title: 'SIDEBAR.ADD_CONTENT_TO_GROUPS',
            link: '/add-content-to-groups',
            roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
          },
        ],
      },
    };
  }
  
  // All other tenants (YouthNet, Second Chance Program, etc.) get only Manage Users menu
  return menuConfig;
};

// Legacy MENU_CONFIG - kept for backward compatibility but not used in new dynamic system
// The new system uses getMenuConfigForTenant() function above
export const MENU_CONFIG = {};
