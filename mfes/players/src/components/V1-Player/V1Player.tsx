import React, { useRef, useEffect } from 'react';

interface PlayerProps {
  playerConfig: any;
}

const V1Player = ({ playerConfig }: PlayerProps) => {
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const preview: any = previewRef.current;

    if (preview) {
      const originalSrc = preview.src;
      preview.src = '';
      preview.src = originalSrc;

      const handleLoad = () => {
        setTimeout(() => {
          if (
            preview.contentWindow &&
            preview.contentWindow.initializePreview
          ) {
            preview.contentWindow.initializePreview(playerConfig);
          }

          // Handle cross-origin messages securely
          const messageHandler = (event: MessageEvent) => {
            // Allow all origins but validate the message structure
            console.log('V1 player event', event);

            // Example validation: Check for expected message data
            if (
              event.data &&
              typeof event.data === 'object' &&
              event.data.type === 'expectedType'
            ) {
              console.log('Valid message received:', event.data);
              // Process the message
            } else {
              console.warn('Unexpected message format:', event.data);
            }
          };

          // Add listener for 'message' events
          preview.contentWindow.addEventListener('message', messageHandler);

          // Handle telemetry events
          const telemetryHandler = (event: CustomEvent) => {
            console.log('V1 player telemetry event ===>', event);

            if (event.detail.telemetryData?.eid === 'START') {
              console.log('V1 player telemetry START event ===>', event);
            }
            if (event.detail.telemetryData?.eid === 'END') {
              console.log('V1 player telemetry END event ===>', event);
            }
          };

          // Add listener for 'renderer:telemetry:event'
          preview.addEventListener(
            'renderer:telemetry:event',
            telemetryHandler
          );
        }, 100);
      };

      preview.addEventListener('load', handleLoad);

      return () => {
        preview.removeEventListener('load', handleLoad);

        // Reset iframe to prevent residual styles or memory leaks
        // Commenting below code - Content Preview is only work due to below code
        // if (preview) {
        //   preview.src = "";
        // }
      };
    }
  }, [playerConfig]);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height:'calc(100vh - 160px)'
      }}
    >
      <iframe
        ref={previewRef}
        id="contentPlayer"
        title="Content Player"
        src="/content/preview/preview.html?webview=true"
        aria-label="Content Player"
        style={{ width: '100%', height: 'calc(100vh - 160px)', border: 'none' }}
      ></iframe>
    </div>
  );
};

export default V1Player;
