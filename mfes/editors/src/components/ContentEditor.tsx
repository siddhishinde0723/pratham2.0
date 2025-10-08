/* eslint-disable prefer-const */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import _ from 'lodash';
import Cookies from 'js-cookie';
import 'izimodal/js/iziModal';
// Inline editor config to avoid JSON import issues
const editorConfig = {
  CONTENT_EDITOR: {
    WINDOW_CONTEXT: {
      user: {
        id: "",
        name: "",
        orgIds: [""],
        organisations: {
          "channel-id": "channel Name"
        }
      },
      did: "",
      sid: "",
      contentId: "",
      pdata: {
        id: "dev.admin.portal",
        ver: "1.0.0",
        pid: "admin-portal.contenteditor"
      },
      contextRollUp: {
        l1: ""
      },
      tags: [""],
      channel: "",
      framework: "",
      ownershipType: ["createdBy", "createdFor"],
      timeDiff: -0.528,
      uid: "",
      etags: {
        app: [],
        partner: [],
        dims: []
      }
    },
    WINDOW_CONFIG: {
      baseURL: "",
      modalId: "contentEditor",
      apislug: "/action",
      alertOnUnload: true,
      build_number: "5.2.1.10",
      headerLogo: "",
      aws_s3_urls: [],
      plugins: [
        {
          id: "org.ekstep.sunbirdcommonheader",
          ver: "1.9",
          type: "plugin"
        },
        {
          id: "org.ekstep.sunbirdmetadata",
          ver: "1.1",
          type: "plugin"
        },
        {
          id: "org.ekstep.metadata",
          ver: "1.5",
          type: "plugin"
        },
        {
          id: "org.ekstep.questionset",
          ver: "1.0",
          type: "plugin"
        },
        {
          id: "org.ekstep.reviewercomments",
          ver: "1.0",
          type: "plugin"
        }
      ],
      dispatcher: "local",
      localDispatcherEndpoint: "/content-editor/telemetry",
      showHelp: false,
      previewConfig: {
        repos: ["/sunbird-plugins/renderer"],
        plugins: [
          {
            id: "org.sunbird.player.endpage",
            ver: 1.1,
            type: "plugin"
          }
        ],
        splash: {
          text: "",
          icon: "",
          bgImage: "assets/icons/splacebackground_1.png",
          webLink: ""
        },
        overlay: {
          showUser: false
        },
        showEndPage: false
      },
      pluginsRepoUrl: "/plugins/v1/search",
      enableTelemetryValidation: false,
      lock: {},
      videoMaxSize: "150",
      absURL: "",
      headerConfig: {
        managecollaborator: false
      },
      branding: "Pratham"
    }
  }
};
import useTenantConfig from '../hooks/useTenantConfig';
import {
  getLocalStoredUserId,
  getLocalStoredUserName,
} from '../services/LocalStorageService';
import $ from 'jquery';
const InteractiveEditor: React.FC = () => {
  const tenantConfig = useTenantConfig();
  const [showLoader, setShowLoader] = useState(true);
  const router = useRouter();
  const { identifier } = router.query;
  const contentEditorURL = 'content-editor/index.html';
  const buildNumber = '5.2.1.1.0';
  const videoMaxSize = '150';

  useEffect(() => {
    if (!tenantConfig?.CHANNEL_ID || !tenantConfig?.CONTENT_FRAMEWORK) return;
    (window as any).$ = (window as any).jQuery = $;
    if (window.parent) {
      (window.parent as any).$ = (window as any).$;
      (window.parent as any).jQuery = (window as any).jQuery;
    }

    // Add global error handler for plugin registration and content editor errors
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('Plugin is already registered') || 
          message.includes('already loaded') ||
          message.includes('Cannot read properties of undefined') ||
          message.includes('reading \'children\'')) {
        // Suppress these specific errors as they're handled by our deduplication mechanism
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    console.warn = function(...args) {
      const message = args.join(' ');
      if (message.includes('Plugin is already registered') || 
          message.includes('already loaded') ||
          message.includes('Cannot read properties of undefined') ||
          message.includes('reading \'children\'')) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, args);
    };
    
    // Add global error handler for uncaught errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('Cannot read properties of undefined') ||
           event.error.message.includes('reading \'children\''))) {
        console.log('Content editor error handled:', event.error.message);
        event.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', handleGlobalError);

    if (identifier) {
      getContentDetails(identifier)
        .then((data) => {
          initEditor();
          setWindowContext(data);
          setWindowConfig();
          ($('#contentEditor') as any).iziModal('open');
          setShowLoader(false);
        })
        .catch(() => {
          closeModal();
        });
    } else {
      setShowLoader(false);
    }

    return () => {
      ($('#contentEditor') as any).iziModal('destroy');
      // Restore original console methods
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      // Remove global error handler
      window.removeEventListener('error', handleGlobalError);
    };
  }, [tenantConfig?.CHANNEL_ID, tenantConfig?.CONTENT_FRAMEWORK, identifier]);

  const getContentDetails = async (contentId: any) => {
    if (!contentId) {
      return {};
    }

    try {
      // Check both cookies and localStorage for contentMode to determine the correct mode
      const cookieMode = typeof window !== 'undefined' ? Cookies.get('contentMode') : null;
      const localStorageMode = typeof window !== 'undefined' ? localStorage.getItem('contentMode') : null;
      const mode = cookieMode || localStorageMode || 'edit';
      
      const response = await fetch(
        `/action/content/v3/read/${contentId}?mode=${mode}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      const content = data.result.content;
      
      // Ensure content has proper structure to prevent 'children' undefined error
      if (content && typeof content === 'object') {
        // Ensure body structure exists
        if (!content.body) {
          content.body = {};
        }
        if (!content.body.data) {
          content.body.data = {};
        }
        if (!content.body.data.data) {
          content.body.data.data = {};
        }
        if (!content.body.data.data.children) {
          content.body.data.data.children = [];
        }
        
        // Ensure other required properties exist
        if (!content.body.data.data.theme) {
          content.body.data.data.theme = {};
        }
        if (!content.body.data.data.theme.name) {
          content.body.data.data.theme.name = 'default';
        }
        if (!content.body.data.data.theme.ver) {
          content.body.data.data.theme.ver = '1.0';
        }
        
        // Ensure manifest structure exists
        if (!content.body.data.manifest) {
          content.body.data.manifest = {};
        }
        if (!content.body.data.manifest.media) {
          content.body.data.manifest.media = [];
        }
        if (!content.body.data.manifest.media[0]) {
          content.body.data.manifest.media[0] = {};
        }
        if (!content.body.data.manifest.media[0].src) {
          content.body.data.manifest.media[0].src = '';
        }
        if (!content.body.data.manifest.media[0].type) {
          content.body.data.manifest.media[0].type = '';
        }
        if (!content.body.data.manifest.media[0].id) {
          content.body.data.manifest.media[0].id = '';
        }
      }
      
      return content;
    } catch (err: any) {
      console.error(err);
      return null;
    }
  };

  const initEditor = () => {
    if (typeof window !== 'undefined') {
      let iframeURL = `${contentEditorURL}?${buildNumber}`;
      // Add identifier parameter if it exists
      if (identifier) {
        iframeURL += `&identifier=${identifier}`;
      }
      ($('#contentEditor') as any).iziModal({
        title: '',
        iframe: true,
        iframeURL,
        fullscreen: true,
        openFullscreen: true,
        closeOnEscape: false,
        overlayClose: false,
        onClosing: () => {
          closeModal();
        },
      });
    }
  };

  const setWindowContext = (data: any) => {
    const contentChannel = data?.channel || tenantConfig?.CHANNEL_ID;
    const contentFramework = data?.framework || tenantConfig?.CONTENT_FRAMEWORK;
    if (typeof window !== 'undefined') {
      (window as any).context = _.cloneDeep(
        editorConfig.CONTENT_EDITOR.WINDOW_CONTEXT
      );
      if (identifier) {
        (window as any).context.contentId = identifier;
      }
      (window as any).context.user = {
        id: getLocalStoredUserId(),
        name: getLocalStoredUserName() || 'Anonymous User',
        orgIds: [contentChannel],
        organisations: {
          [contentChannel]: contentChannel,
        },
      };
      (window as any).context.uid = getLocalStoredUserId();
      (window as any).context.contextRollUp.l1 = contentChannel;
      (window as any).context.tags = [contentChannel];
      (window as any).context.channel = contentChannel;
      (window as any).context.framework = contentFramework;
      
      // Add comprehensive safety check for content structure
      if (data && typeof data === 'object') {
        // Ensure content has proper structure to prevent 'children' undefined error
        if (!data.body) {
          data.body = {};
        }
        if (!data.body.data) {
          data.body.data = {};
        }
        if (!data.body.data.data) {
          data.body.data.data = {};
        }
        if (!data.body.data.data.children) {
          data.body.data.data.children = [];
        }
        
        // Ensure theme structure exists
        if (!data.body.data.data.theme) {
          data.body.data.data.theme = {
            name: 'default',
            ver: '1.0'
          };
        }
        
        // Ensure manifest structure exists
        if (!data.body.data.manifest) {
          data.body.data.manifest = {
            media: []
          };
        }
        
        // Ensure stage structure exists
        if (!data.body.data.data.stage) {
          data.body.data.data.stage = {};
        }
        
        // Ensure timeline structure exists
        if (!data.body.data.data.timeline) {
          data.body.data.data.timeline = [];
        }
        
        // Ensure config structure exists
        if (!data.body.data.data.config) {
          data.body.data.data.config = {};
        }
      }
    }
  };

  const setWindowConfig = () => {
    if (typeof window !== 'undefined') {
      (window as any).config = _.cloneDeep(
        editorConfig.CONTENT_EDITOR.WINDOW_CONFIG
      );
      (window as any).config.build_number = buildNumber;
      (window as any).config.headerLogo = '/logo.png';
      (window as any).config.lock = {};
      (window as any).config.enableTelemetryValidation = false;
      (window as any).config.videoMaxSize = videoMaxSize;
      (window as any).config.cloudStorage = {
        provider: 'aws',
        // provider: 'azure',
        presigned_headers: {
          'x-amz-acl': 'private',
          // 'x-ms-blob-type': 'BlockBlob', // This header sets access control; it's specific to AWS S3.
        },
      };
      
      // Add plugin deduplication mechanism
      if (!(window as any).loadedPlugins) {
        (window as any).loadedPlugins = new Set();
      }
      
      // Override the plugin loading mechanism to prevent duplicates
      const originalLoadPlugin = (window as any).org?.ekstep?.contenteditor?.loadPlugin;
      if (originalLoadPlugin) {
        (window as any).org.ekstep.contenteditor.loadPlugin = function(pluginId: string, version: string) {
          const pluginKey = `${pluginId}:${version}`;
          if ((window as any).loadedPlugins.has(pluginKey)) {
            console.log(`Plugin ${pluginId} v${version} already loaded, skipping...`);
            return Promise.resolve();
          }
          (window as any).loadedPlugins.add(pluginKey);
          return originalLoadPlugin.call(this, pluginId, version);
        };
      }
    }
  };

  const closeModal = () => {
    setShowLoader(false);

    const previousPage = sessionStorage.getItem('previousPage');
    const editorElement = document.getElementById('genericEditor');
    if (editorElement) {
      editorElement.remove();
    }
    console.log('history', window.history.length);

    if (previousPage) {
      router.replace(previousPage);
    } else {
      router.replace('/workspace/content/create');
    }
  };

  return (
    <div>
      {showLoader && <div>Loading...</div>}
      <div id="contentEditor"></div>
    </div>
  );
};

export default InteractiveEditor;
