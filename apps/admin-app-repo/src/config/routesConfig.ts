/* eslint-disable @nx/enforce-module-boundaries */
import { Role, TenantName } from '@/utils/app.constant';

export const PUBLIC_ROUTES = [
  '/',
  '/404',
  '/login',
  '/demo',
  '/logout',
  '/workspace',
];
// Universal role-based routes for all tenants
const UNIVERSAL_ROLE_ROUTES = {
  [Role.ADMIN]: ['/edit-password','/TeacherList',
    '/StudentList',
    '/classes',],
  [Role.CENTRAL_ADMIN]: ['/edit-password','/TeacherList',
    '/StudentList',
    '/classes',],
  [Role.CCTA]: ['/edit-password', '/subjectDetails', '/importCsv'],
  [Role.SCTA]: ['/edit-password', '/subjectDetails', '/importCsv'],
};

// Function to get role-based routes for any tenant
export const getRoleBasedRoutes = (tenantName: string, role: string) => {
  // Return universal routes for all tenants
 return UNIVERSAL_ROLE_ROUTES[role as keyof typeof UNIVERSAL_ROLE_ROUTES] || [];
};

export const ROLE_BASED_ROUTES = {
  [TenantName.SECOND_CHANCE_PROGRAM]: {
    [Role.ADMIN]: [],
    [Role.CENTRAL_ADMIN]: [
      '/notification-templates/create',
      '/notification-templates/update/[identifier]',
      '/edit-password',
    ],
    [Role.CCTA]: ['/subjectDetails', '/importCsv', '/edit-password'],
    [Role.SCTA]: ['/subjectDetails', '/importCsv ', '/edit-password'],
  },
  [TenantName.YOUTHNET]: {
    [Role.ADMIN]: ['/edit-password'],
    [Role.CENTRAL_ADMIN]: ['/edit-password'],
    [Role.CCTA]: ['/edit-password', '/subjectDetails', '/importCsv '],
    [Role.SCTA]: ['/edit-password', '/subjectDetails', '/importCsv '],
  },
};
