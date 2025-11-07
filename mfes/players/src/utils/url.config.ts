export const URL_CONFIG = {
  PARAMS: {
    CONTENT_GET:
      'transcripts,ageGroup,appIcon,artifactUrl,attributions,attributions,audience,author,badgeAssertions,body,channel,code,concepts,contentCredits,contentType,contributors,copyright,copyrightYear,createdBy,createdOn,creator,creators,description,displayScore,domain,editorState,flagReasons,flaggedBy,flags,framework,identifier,itemSetPreviewUrl,keywords,language,languageCode,lastUpdatedOn,license,mediaType,mimeType,name,originData,osId,owner,pkgVersion,publisher,questions,resourceType,scoreDisplayConfig,status,streamingUrl,template,templateId,totalQuestions,totalScore,versionKey,visibility,year,primaryCategory,additionalCategories,interceptionPoints,interceptionType',
    LICENSE_DETAILS: 'name,description,url',
    HIERARCHY_FEILDS: 'instructions,outcomeDeclaration',
  },
  API: {
    CONTENT_READ: `${process.env.NEXT_PUBLIC_SSUNBIRD_BASE_URL}/api/content/v1/read/`,
    HIERARCHY_API: `${process.env.NEXT_PUBLIC_SSUNBIRD_BASE_URL}/action/questionset/v2/hierarchy/`,
    QUESTIONSET_READ: `${process.env.NEXT_PUBLIC_SSUNBIRD_BASE_URL}/action/questionset/v2/read/`,
    COMPOSITE_SEARCH: `${process.env.NEXT_PUBLIC_SSUNBIRD_BASE_URL}/action/composite/v3/search`,
    CONTENT_HIERARCHY: `${process.env.NEXT_PUBLIC_SSUNBIRD_BASE_URL}/action/content/v3/hierarchy`,
  },
};

export interface Pdata {
  id: string;
  pid?: string;
  ver?: string;
}

export interface ContextRollup {
  l1?: string;
  l2?: string;
  l3?: string;
  l4?: string;
}

export interface Cdata {
  type: string;
  id: string;
}

export interface ObjectRollup {
  l1?: string;
  l2?: string;
  l3?: string;
  l4?: string;
}

export interface Context {
  mode?: string;
  authToken?: string;
  sid?: string;
  did?: any;
  uid?: string;
  channel: string;
  pdata: Pdata;
  contextRollup?: ContextRollup;
  tags?: string[];
  cdata?: Cdata[];
  timeDiff?: number;
  objectRollup?: ObjectRollup;
  host?: string;
  endpoint?: string;
  dispatcher?: object;
  partner?: any[];
  contentId?: any;
  dims?: any[];
  app?: string[];
  userData?: {
    firstName: string;
    lastName: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Config {
  toolBar?: {
    showZoomButtons?: boolean;
    showPagesButton?: boolean;
    showPagingButtons?: boolean;
    showSearchButton?: boolean;
    showRotateButton?: boolean;
  };
  sideMenu?: {
    showShare?: boolean;
    showDownload?: boolean;
    showReplay?: boolean;
    showExit?: boolean;
    showPrint?: boolean;
  };
  [propName: string]: any;
}

export interface Metadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  isAvailableLocally?: boolean;
  basePath?: string;
  baseDir?: string;
}
export interface PlayerConfig {
  context?: Context;
  config?: Config;
  metadata?: Metadata;
  data?: any;
}

export const MIME_TYPE = {
  QUESTION_SET_MIME_TYPE: 'application/vnd.sunbird.questionset',
  INTERACTIVE_MIME_TYPE: [
    'application/vnd.ekstep.h5p-archive',
    'application/vnd.ekstep.html-archive',
  ],
};

let userName = 'arif';
if (typeof window !== 'undefined' && window.localStorage) {
  userName = localStorage.getItem('userName') || '';
}

const DeviceId = '12345';

export const V2PlayerConfig: PlayerConfig = {
  context: {
    mode: 'play',
    partner: [],
    pdata: {
      id: 'shiksha.admin.portal',
      ver: '1.0.0',
      pid: 'admin-portal',
    },
    contentId: '',
    sid: '',
    uid: '',
    timeDiff: -0.089,
    channel: process.env.NEXT_PUBLIC_CHANNEL_ID || '',
    tags: [process.env.NEXT_PUBLIC_CHANNEL_ID || ''],
    did: DeviceId,
    contextRollup: { l1: process.env.NEXT_PUBLIC_CHANNEL_ID || '' },
    objectRollup: {},
    userData: { firstName: userName, lastName: '' },
    host: '',
    endpoint: '/v1/telemetry',
  },
  config: {
    showEndPage: false,
    endPage: [{ template: 'assessment', contentType: ['SelfAssess'] }],
    showStartPage: true,
    host: '',
    overlay: { showUser: false },
    splash: {
      text: '',
      icon: '',
      bgImage: 'assets/icons/splacebackground_1.png',
      webLink: '',
    },
    apislug: '',
    repos: ['/sunbird-plugins/renderer'],
    plugins: [
      { id: 'org.sunbird.iframeEvent', ver: 1, type: 'plugin' },
      { id: 'org.sunbird.player.endpage', ver: 1.1, type: 'plugin' },
    ],
    sideMenu: {
      showShare: false,
      showDownload: true,
      showExit: true,
      showPrint: false,
      showReplay: true,
    },
  },
  data: {},
};

export const V1PlayerConfig: PlayerConfig = {
  config: {
    whiteListUrl: [],
    showEndPage: true,
    endPage: [
      {
        template: 'assessment',
        contentType: ['SelfAssess'],
      },
    ],
    showStartPage: true,
    host: '',
    overlay: {
      enableUserSwitcher: true,
      showOverlay: true,
      showNext: true,
      showPrevious: true,
      showSubmit: false,
      showReload: false,
      showUser: false,
      showExit: true,
      menu: {
        showTeachersInstruction: false,
      },
    },
    splash: {
      text: '',
      icon: '',
      bgImage: 'assets/icons/splacebackground_1.png',
      webLink: '',
    },
    apislug: '',
    repos: ['/sunbird-plugins/renderer'],
    plugins: [
      {
        id: 'org.sunbird.iframeEvent',
        ver: 1,
        type: 'plugin',
      },
      {
        id: 'org.sunbird.player.endpage',
        ver: 1.1,
        type: 'plugin',
      },
    ],
    sideMenu: {
      showShare: true,
      showDownload: true,
      showExit: true,
    },
    enableTelemetryValidation: false,
  },
  context: {
    mode: 'play',
    // partner: [],
    pdata: {
      id: 'shiksha.admin.portal',
      ver: '1.0.0',
      pid: 'admin-portal',
    },
    contentId: '',
    sid: '',
    uid: '',
    timeDiff: -1.129,
    contextRollup: {},
    channel: process.env.NEXT_PUBLIC_CHANNEL_ID || '',
    did: '',
    dims: [],
    tags: [process.env.NEXT_PUBLIC_CHANNEL_ID || ''],
    app: [process.env.NEXT_PUBLIC_CHANNEL_ID || ''],
    cdata: [],
    userData: {
      firstName: userName,
      lastName: '',
    },
  },
  data: {},
};
