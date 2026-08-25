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
      {
        title: 'Staff',
        link: '/staff',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Supervisor',
        link: '/supervisor',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
    ],
  },

  // ✅ Groups menu now available for all tenants
  groups: {
    title: 'Groups',
    icon: '/images/group.svg',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
    subMenu: [
      {
        title: 'Groups Overview',
        link: '/groups-overview',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Create Groups',
        link: '/create-groups',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Add users to Groups',
        link: '/add-users-to-groups',
        roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      },
      {
        title: 'Add content to Groups',
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
  centers: {
    title: 'Centers',
    icon: '/images/centers.svg',
    link: '/centers',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
  },
  clusters: {
    title: 'Clusters',
    icon: '/images/group.svg',
    link: '/clusters',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
  },
  content: {
    title: 'Content',
    icon: '/images/assessment.svg',
    link: '/content',
    roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
  },
};

// ✅ Universal menu config function (no tenant logic)
export const getMenuConfigForTenant = (p0: string) => {
  return { ...UNIVERSAL_ADMIN_MENU };
};

// ✅ Legacy placeholder for backward compatibility
export const MENU_CONFIG = {};