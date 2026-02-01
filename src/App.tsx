import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnhancedLandingPage } from './components/EnhancedLandingPage';
import { VSNViewer } from './components/VSNViewer';
import { HariStotramViewer } from './components/HariStotramViewer';
import { KeshavaNamaViewer } from './components/KeshavaNamaViewer';
import { VayuStutiViewer } from './components/VayuStutiViewer';
import LoginPrompt from './components/LoginPrompt';
import AchievementToast from './components/AchievementToast';
import { analytics } from './lib/analytics';
import type { Lang } from './data/types';

type ViewState = 'landing' | 'vsn' | 'hari' | 'keshava' | 'vayu';

// Simple dark theme for the outer shell/landing page
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

function AppContent() {
  const [view, setView] = useState<ViewState>('landing');
  const [preferredLang, setPreferredLang] = useState<Lang | undefined>(undefined);
  const { showLoginPrompt, loading } = useAuth();

  const handleStotraSelect = (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu', lang?: Lang) => {
    setView(stotra);
    setPreferredLang(lang);
    analytics.selectStotra(stotra);
  };

  const handleBack = () => {
    setView('landing');
    setPreferredLang(undefined);
  };

  // Show nothing while loading auth state
  if (loading) {
    return null;
  }

  return (
    <>
      {/* Login prompt modal */}
      <LoginPrompt open={showLoginPrompt} />

      {/* Achievement toast notifications */}
      <AchievementToast />

      {/* Main content */}
      {view === 'landing' && (
        <EnhancedLandingPage onSelectStotra={handleStotraSelect} />
      )}
      {view === 'vsn' && (
        <VSNViewer onBack={handleBack} preferredLang={preferredLang} />
      )}
      {view === 'hari' && (
        <HariStotramViewer onBack={handleBack} preferredLang={preferredLang} />
      )}
      {view === 'keshava' && (
        <KeshavaNamaViewer onBack={handleBack} preferredLang={preferredLang} />
      )}
      {view === 'vayu' && (
        <VayuStutiViewer onBack={handleBack} preferredLang={preferredLang} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
