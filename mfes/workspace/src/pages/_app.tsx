import { AppProps } from 'next/app';
import Head from 'next/head';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import { useEffect } from 'react';
import '../styles/global.css';
import customTheme from '../styles/CustomTheme';
import TenantService from '../services/TenantService';

function CustomApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Listen for postMessage from parent window (for iframe scenarios)
    const handleMessage = (event: MessageEvent) => {
      // In production, validate event.origin for security
      if (event.data && event.data.type === 'SET_TENANT_ID' && event.data.tenantId) {
        console.log('Workspace: Received tenant ID from parent via postMessage:', event.data.tenantId);
        TenantService.setTenantId(event.data.tenantId);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Welcome to workspace!</title>
      </Head>
      <main className="app">
        <CssVarsProvider theme={customTheme}>
          <Component {...pageProps} />
        </CssVarsProvider>
      </main>
    </>
  );
}

export default CustomApp;
