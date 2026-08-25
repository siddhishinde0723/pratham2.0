import { getTelemetryEvents, handleExitEvent } from '../utils/Helper';
import React, { useEffect, useRef } from 'react';

interface PlayerConfigProps {
  playerConfig: any;
}

const SunbirdVideoPlayer = ({ playerConfig }: PlayerConfigProps) => {
  const sunbirdVideoPlayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load jQuery
    const jqueryScript = document.createElement('script');
    jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
    jqueryScript.async = true;
    document.body.appendChild(jqueryScript);

    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-video-player-web-component@1.2.5/sunbird-video-player.js';
    script.async = true;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://cdn.jsdelivr.net/npm/@project-sunbird/sunbird-video-player-web-component@1.2.5/styles.css';

    jqueryScript.onload = () => {
      document.body.appendChild(script);
      document.head.appendChild(link);
    };

    const playerElement = sunbirdVideoPlayerRef.current;

    const handlePlayerEvent = (event: any) => {
      console.log('Player Event', event.detail);
      if (event?.detail?.type === 'EXIT') {
        handleExitEvent();
      }
    };

    const handleTelemetryEvent = (event: any) => {
      console.log('Telemetry Event', event.detail);
      getTelemetryEvents(event.detail, 'video');
    };

    script.onload = () => {
      playerElement?.addEventListener('playerEvent', handlePlayerEvent);
      playerElement?.addEventListener('telemetryEvent', handleTelemetryEvent);
    };

    return () => {
      playerElement?.removeEventListener('playerEvent', handlePlayerEvent);
      playerElement?.removeEventListener(
        'telemetryEvent',
        handleTelemetryEvent
      );

      if (document.body.contains(jqueryScript)) {
        document.body.removeChild(jqueryScript);
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="player" style={{ height: 'calc(100vh - 160px)' }}>
      {/* @ts-ignore */}
      <sunbird-video-player
        player-config={JSON.stringify(playerConfig)}
        ref={sunbirdVideoPlayerRef}
      >
        {/* @ts-ignore */}
      </sunbird-video-player>
    </div>
  );
};

export default SunbirdVideoPlayer;
