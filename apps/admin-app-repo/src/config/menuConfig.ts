import { Role, TenantName } from '@/utils/app.constant';

export const MENU_CONFIG = {
  [TenantName.SECOND_CHANCE_PROGRAM]: {
    batch: {
      title: 'Batch',
      icon: '/images/centers.svg',
      link: '/batch',
      roles: [
        Role.ADMIN,
        // Role.CENTRAL_ADMIN, //check
      ],
    },
    centers: {
      title: 'Centers',
      icon: '/images/centers.svg',
      link: '/centers',
      roles: [
        Role.ADMIN,
        // Role.CENTRAL_ADMIN, // check
      ],
    },
    manageUsers: {
      title: 'Manage Users',
      icon: '/images/group.svg',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      subMenu: [
        {
          title: 'Team Leaders',
          link: '/team-leader',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Facilitators',
          link: '/facilitator',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Learners',
          link: '/learners',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Content Creator',
          link: '/content-creator',
          roles: [Role.CENTRAL_ADMIN],
        },
        {
          title: 'Content Reviewer',
          link: '/content-reviewer',
          roles: [Role.CENTRAL_ADMIN],
        },
        {
          title: 'State Lead',
          link: '/state-lead',
          roles: [Role.CENTRAL_ADMIN],
        },
      ],
    },

    master: {
      title: 'Master',
      icon: '/images/database.svg',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      subMenu: [
        {
          title: 'States',
          link: '/state',
          roles: [
            // Role.ADMIN,
            Role.CENTRAL_ADMIN,
          ],
        },
        {
          title: 'Districts',
          link: '/district',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Blocks',
          link: '/block',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Village',
          link: '/village',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
      ],
    },
    programs: {
      title: 'Programs',
      icon: '/images/programIcon.svg',
      link: '/programs',
      roles: [Role.CENTRAL_ADMIN],
    },
    manageNotificationTemplates: {
      title: 'Manage Notification Templates',
      icon: '/images/centers.svg',
      link: '/notification-templates',
      roles: [Role.CENTRAL_ADMIN],
    },
    coursePlanner: {
      title: 'Curriculum Planner',
      icon: '/images/event_available.svg',
      link: '/course-planner',
      roles: [Role.CCTA, Role.SCTA],
    },
    workspace: {
      title: 'Workspace',
      icon: '/images/dashboard.svg',
      link: '/workspace',
      roles: [Role.CCTA, Role.SCTA],
    },

    supportRequest: {
      title: 'Support Request',
      icon: '/images/Support.svg',
      link: '/support-request',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN, Role.CCTA, Role.SCTA],
    },
  },
  [TenantName.YOUTHNET]: {
    manageUsers: {
      title: 'Manage Users',
      icon: '/images/group.svg',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      subMenu: [
        {
          title: 'Mentor',
          link: '/mentor',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Mentor Leader',
          link: '/mentor-leader',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Youth',
          link: '/youth',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN], // yet to come
        },
        {
          title: 'Content Creator',
          link: '/content-creator',
          roles: [Role.CENTRAL_ADMIN],
        },
        {
          title: 'Content Reviewer',
          link: '/content-reviewer',
          roles: [Role.CENTRAL_ADMIN],
        },
        {
          title: 'State Lead',
          link: '/state-lead',
          roles: [Role.CENTRAL_ADMIN],
        },
      ],
    },
    master: {
      title: 'Master',
      icon: '/images/database.svg',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
      subMenu: [
        {
          title: 'States',
          link: '/state',
          roles: [
            // Role.ADMIN,
            Role.CENTRAL_ADMIN,
          ],
        },
        {
          title: 'Districts',
          link: '/district',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Blocks',
          link: '/block',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
        {
          title: 'Village',
          link: '/village',
          roles: [Role.ADMIN, Role.CENTRAL_ADMIN],
        },
      ],
    },
    certificateIssuance: {
      title: 'Certificate Issuance',
      icon: '/images/certificate_custom.svg',
      link: '/certificate-issuance',
      roles: [Role.ADMIN],
    },
    supportRequest: {
      title: 'Support Request',
      icon: '/images/Support.svg',
      link: '/support-request',
      roles: [Role.ADMIN, Role.CENTRAL_ADMIN, Role.CCTA, Role.SCTA],
    },
    workspace: {
      title: 'Workspace',
      icon: '/images/dashboard.svg',
      link: '/workspace',
      roles: [Role.CCTA, Role.SCTA],
    },
  },
};
