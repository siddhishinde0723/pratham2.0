import masterIcon from '../../../../public/images/database.svg';
import centerIcon from '../../../../public/images/centers.svg';
import dashboardIcon from '../../../../public/images/dashboard.svg';
import userIcon from '../../../../public/images/group.svg';
import programIcon from '../../../../public/images/programIcon.svg';
import certificateIcon from '../../../../public/images/certificate_custom.svg';
import support from '../../../assets/images/Support.svg';

import coursePlannerIcon from '../../../../public/images/event_available.svg';
import { store } from '@/store/store';
import { Role, TenantName } from '@/utils/app.constant';
const isActiveYear = store.getState().isActiveYearSelected;

const Menuitems = [
  {
    title: 'SIDEBAR.CENTERS',
    icon: centerIcon,
    href: ['/centers'],
  },
  {
    title: 'PROGRAM_MANAGEMENT.PROGRAMS',
    icon: programIcon,
    href: ['/programs'],
  },

  {
    title: 'SIDEBAR.MANAGE_USERS',
    icon: userIcon,
    subOptions: [
      {
        title: 'SIDEBAR.TEAM_LEADERS',
        href: ['/team-leader'],
      },
      {
        title: 'SIDEBAR.FACILITATORS',
        href: ['/faciliator'],
      },
      {
        title: 'SIDEBAR.LEARNERS',
        href: ['/learners'],
      },
      {
        title: 'SIDEBAR.CONTENT_CREATOR',
        href: ['/content-creator'],
      },
      {
        title: 'SIDEBAR.CONTENT_REVIEWER',
        href: ['/content-reviewer'],
      },
      {
        title: 'SIDEBAR.MENTOR',
        href: ['/mentor'],
      },
      {
        title: 'SIDEBAR.MENTOR_LEADER',
        href: ['/mentor-leader'],
      },
    ],
  },
  {
    title: 'SIDEBAR.CERTIFICATE_ISSUANCE',
    icon: certificateIcon,
    href: ['/certificate-issuance'],
  },
  {
    title: 'MASTER.MASTER',
    icon: masterIcon,
    subOptions: [
      {
        title: 'MASTER.STATE',
        href: ['/state'],
      },
      {
        title: 'MASTER.DISTRICTS',
        href: ['/district'],
      },
      {
        title: 'MASTER.BLOCKS',
        href: ['/block'],
      },
      {
        title: 'Village',
        href: ['/village'],
      },
    ],
  },
  {
    title: 'SIDEBAR.MANAGE_NOTIFICATION',
    icon: centerIcon,
    href: ['/notification-templates'],
  },
  {
    title: 'SIDEBAR.SUPPORT_REQUEST',
    icon: support,
    href: ['/support-request'],
  },
  ...(isActiveYear
    ? [
        {
          title: 'SIDEBAR.COURSE_PLANNER',
          icon: coursePlannerIcon,
          href: [
            '/course-planner',
            '/stateDetails',
            '/subjectDetails',
            '/importCsv',
            '/resourceList',
            '/play/content/[identifier]',
          ],
        },
      ]
    : []),
  ...(isActiveYear
    ? [
        {
          title: 'SIDEBAR.WORKSPACE',
          icon: dashboardIcon,
          href: ['/workspace', '/course-hierarchy/[identifier]'],
        },
      ]
    : []),
];

export const getFilteredMenuItems = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const adminInfo = localStorage.getItem('adminInfo');
    let userInfo;

    if (adminInfo && adminInfo !== 'undefined') {
      userInfo = JSON.parse(adminInfo || '{}');
    }

    if (userInfo?.role === Role.SCTA || userInfo?.role === Role.CCTA) {
      if (
        userInfo?.tenantData[0]?.tenantName != TenantName.SECOND_CHANCE_PROGRAM
      ) {
        return Menuitems.filter((item) => item.title === 'SIDEBAR.WORKSPACE');
      }
      // For SCTA and CCTA, show only Course Planner and Workspace
      return Menuitems.filter(
        (item) =>
          item.title === 'SIDEBAR.COURSE_PLANNER' ||
          item.title === 'SIDEBAR.WORKSPACE' ||
          item.title === 'SIDEBAR.SUPPORT_REQUEST'
      );
    }

    if (userInfo?.role === Role.ADMIN) {
      // For ADMIN users, show only Manage Users tab
      const manageUsersItem = Menuitems.find(
        (item) => item.title === 'SIDEBAR.MANAGE_USERS'
      );

      if (manageUsersItem) {
        if (manageUsersItem.subOptions) {
          // For YouthNet tenant, show only Mentor and Mentor Leader
          if (userInfo?.tenantData[0]?.tenantName === TenantName.YOUTHNET) {
            return [
              {
                ...manageUsersItem,
                subOptions: manageUsersItem.subOptions.filter(
                  (subItem) =>
                    subItem.title === 'SIDEBAR.MENTOR' ||
                    subItem.title === 'SIDEBAR.MENTOR_LEADER'
                ),
              },
            ];
          }
          // For Second Chance Program tenant, show Team Leaders, Facilitators, Learners
          else if (
            userInfo?.tenantData[0]?.tenantName ===
            TenantName.SECOND_CHANCE_PROGRAM
          ) {
            return [
              {
                ...manageUsersItem,
                subOptions: manageUsersItem.subOptions.filter(
                  (subItem) =>
                    subItem.title === 'SIDEBAR.TEAM_LEADERS' ||
                    subItem.title === 'SIDEBAR.FACILITATORS' ||
                    subItem.title === 'SIDEBAR.LEARNERS'
                ),
              },
            ];
          }
          // For other tenants (like Key Education Foundation), show only Learners, Content Creator, Content Reviewer
          else {
            return [
              {
                ...manageUsersItem,
                subOptions: manageUsersItem.subOptions.filter(
                  (subItem) =>
                    subItem.title === 'SIDEBAR.LEARNERS' ||
                    subItem.title === 'SIDEBAR.CONTENT_CREATOR' ||
                    subItem.title === 'SIDEBAR.CONTENT_REVIEWER'
                ),
              },
            ];
          }
        }
        return [manageUsersItem];
      }

      // Fallback: return empty array if Manage Users not found
      return [];
    }

    if (
      userInfo?.role === Role.CENTRAL_ADMIN &&
      userInfo?.tenantData[0]?.tenantName === TenantName.SECOND_CHANCE_PROGRAM
    ) {
      // Exclude Course Planner and Workspace for Central Admin
      return Menuitems.filter(
        (item) =>
          item.title !== 'SIDEBAR.COURSE_PLANNER' &&
          item.title !== 'SIDEBAR.WORKSPACE' &&
          item.title !== 'PROGRAM_MANAGEMENT.PROGRAMS' &&
          item.title !== 'SIDEBAR.MANAGE_NOTIFICATION'
      );
    }

    return Menuitems;
  }
};

export default Menuitems;
