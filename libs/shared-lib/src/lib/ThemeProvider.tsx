// libs/ui-theme/src/lib/ThemeProvider.tsx
import React, {
  ReactNode,
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from './theme';

const ThemeContext = createContext({
  mode: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedMode = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme', newMode);
  };
  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);
  const currentTheme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
