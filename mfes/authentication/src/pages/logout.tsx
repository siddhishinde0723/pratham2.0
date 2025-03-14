import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { logout } from '../services/LoginService';
import { telemetryFactory } from '../utils/telemetry';
import ReactGA from 'react-ga4';
import { Telemetry } from '../utils/app.constant';
import { useQueryClient } from '@tanstack/react-query';
// import useStore from '@/store/store';


type LogoutPageProps = {
  onLogoutSuccess: (response: any) => void;
};

const Logout: React.FC<LogoutPageProps> = ({ onLogoutSuccess }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  // const setCohorts = useStore((state) => state.setCohorts);

  const clearLocalStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Specify the keys you want to keep
      const keysToKeep = [
        'preferredLanguage',
        'mui-mode',
        'mui-color-scheme-dark',
        'mui-color-scheme-light',
        'hasSeenTutorial',
        // 'deviceID',
      ];
      // Retrieve the values of the keys to keep
      const valuesToKeep: { [key: string]: any } = {};
      keysToKeep.forEach((key: string) => {
        valuesToKeep[key] = localStorage.getItem(key);
      });

      // Clear all local storage
      localStorage.clear();
      queryClient.clear();
      // setCohorts([]);
      // Re-add the keys to keep with their values
      keysToKeep.forEach((key: string) => {
        if (valuesToKeep[key] !== null) {
          // Check if the key exists and has a value
          localStorage.setItem(key, valuesToKeep[key]);
        }
      });
    }
  };

  useEffect(() => {
    const userLogout = async () => {
      const telemetryInteract = {
        context: {
          env: 'sign-out',
          cdata: [],
        },
        edata: {
          id: 'logout-success',
          type: Telemetry.CLICK,
          subtype: '',
          pageid: 'sign-out',
        },
      };
      telemetryFactory.interact(telemetryInteract);

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const userId = localStorage.getItem('userId');
        if (refreshToken) {
          await logout(refreshToken);
          ReactGA.event('logout-success', {
            userId: userId,
          });
        }
      } catch (error) {
        console.log(error);
        ReactGA.event('logout-fail', {
          error: error,
        });
      }
    };
    userLogout();
    clearLocalStorage();

    if (onLogoutSuccess) {
      onLogoutSuccess('loggedOut');
    }
  }, []);

  return '';
};

export default Logout;
