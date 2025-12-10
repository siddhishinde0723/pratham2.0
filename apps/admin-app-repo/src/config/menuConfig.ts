/* eslint-disable @nx/enforce-module-boundaries */
import { Role } from '@/utils/app.constant';

// ✅ Universal Admin Menu (applies to all tenants)
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
      {
        title: 'Teacher',
        link: '/TeacherList',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Students',
        link: '/StudentList',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
    ],
  },

  // ✅ Groups menu now available for all tenants
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
  classes: {
    title: 'Classes',
    icon: '/images/centers.svg',
    link: '/classes',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
  },
};

// ✅ Universal menu config function (no tenant logic)
export const getMenuConfigForTenant = (p0: string) => {
  return { ...UNIVERSAL_ADMIN_MENU };
};

// ✅ Legacy placeholder for backward compatibility
export const MENU_CONFIG = {};
