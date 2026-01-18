import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LandingPage } from './components/LandingPage';
import { VSNViewer } from './components/VSNViewer';
import { HariStotramViewer } from './components/HariStotramViewer';
import { analytics } from './lib/analytics';

type ViewState = 'landing' | 'vsn' | 'hari';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');

  // Simple dark theme for the outer shell/landing page
  // Note: VSNViewer has its own internal theme definition that might override this when mounted,
  // but it's good to have a baseline.
  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#0ea5e9' },
      secondary: { main: '#f59e0b' },
      background: { default: '#0f172a', paper: '#1e293b' }
    },
    typography: {
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji"',
    }
  });

  const handleStotraSelect = (stotra: 'vsn' | 'hari') => {
    setView(stotra);
    analytics.selectStotra(stotra);
  };

  const handleBack = () => {
    setView('landing');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {view === 'landing' && (
        <LandingPage onSelectStotra={handleStotraSelect} />
      )}
      {view === 'vsn' && (
        <VSNViewer onBack={handleBack} />
      )}
      {view === 'hari' && (
        <HariStotramViewer onBack={handleBack} />
      )}
    </ThemeProvider>
  );
}
