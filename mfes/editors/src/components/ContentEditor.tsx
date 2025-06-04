'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import _ from 'lodash';
import 'izimodal/js/iziModal';
import editorConfig from './editor.config.json';
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
    window.$ = window.jQuery = $;
    if (window.parent) {
      window.parent.$ = window.$;
      window.parent.jQuery = window.jQuery;
    }

    if (identifier) {
      getContentDetails(identifier)
        .then((data) => {
          initEditor();
          setWindowContext(data);
          setWindowConfig();
          $('#contentEditor').iziModal('open');
          setShowLoader(false);
        })
        .catch(() => {
          closeModal();
        });
    } else {
      setShowLoader(false);
    }

    return () => {
      $('#contentEditor').iziModal('destroy');
    };
  }, [tenantConfig?.CHANNEL_ID, tenantConfig?.CONTENT_FRAMEWORK, identifier]);

  const getContentDetails = async (contentId: any) => {
    if (!contentId) {
      return {};
    }

    try {
      const response = await fetch(
        `/action/content/v3/read/${contentId}?mode=edit`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      return data.result.content;
    } catch (err: any) {
      console.error(err);
      return null;
    }
  };

  const initEditor = () => {
    if (typeof window !== 'undefined') {
      let iframeURL = `${contentEditorURL}?${buildNumber}`;
      $('#contentEditor').iziModal({
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
      window['context'] = _.cloneDeep(
        editorConfig.CONTENT_EDITOR.WINDOW_CONTEXT
      );
      if (identifier) {
        window['context'].contentId = identifier;
      }
      window['context'].user = {
        id: getLocalStoredUserId(),
        name: getLocalStoredUserName() || 'Anonymous User',
        orgIds: [contentChannel],
        organisations: {
          [contentChannel]: contentChannel,
        },
      };
      window['context'].uid = getLocalStoredUserId();
      window['context'].contextRollUp.l1 = contentChannel;
      window['context'].tags = [contentChannel];
      window['context'].channel = contentChannel;
      window['context'].framework = contentFramework;
    }
  };

  const setWindowConfig = () => {
    if (typeof window !== 'undefined') {
      window['config'] = _.cloneDeep(editorConfig.CONTENT_EDITOR.WINDOW_CONFIG);
      window['config'].build_number = buildNumber;
      window['config'].headerLogo = '/logo.png';
      window['config'].lock = {};
      window['config'].enableTelemetryValidation = false;
      window['config'].videoMaxSize = videoMaxSize;
      window['config'].cloudStorage = {
        // provider: 'aws',
        provider: 'azure',
        presigned_headers: {
          // 'x-amz-acl': 'private',
          'x-ms-blob-type': 'BlockBlob', // This header sets access control; it's specific to AWS S3.
        },
      };
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
