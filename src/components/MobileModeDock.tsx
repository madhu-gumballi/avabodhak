import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Drawer,
  Typography,
  Select,
  MenuItem,
  Divider,
  Badge,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SchoolIcon from '@mui/icons-material/School';
import GridViewIcon from '@mui/icons-material/GridView';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import TranslateIcon from '@mui/icons-material/Translate';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import MapIcon from '@mui/icons-material/Map';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { Lang } from '../data/types';

type ViewMode = 'reading' | 'practice' | 'puzzle';

interface MobileModeDockProps {
  viewMode: ViewMode;
  lang: Lang;
  lang2: Lang | '';
  languageOptions: Lang[];
  verseDetailOpen?: boolean;
  practiceProgress?: number; // 0-100
  puzzleProgress?: number; // 0-100
  onViewModeChange: (mode: ViewMode) => void;
  onVerseDetailToggle: () => void;
  onLangChange: (lang: Lang) => void;
  onLang2Change: (lang: Lang | '') => void;
  onHelpOpen: () => void;
  onExploreOpen: () => void;
  labelFn: (lang: Lang) => string;
  T: (key: string) => string;
}

const AUTO_HIDE_MS = 3000; // auto-collapse after action

/**
 * MobileModeDock - Collapsible right-edge dock for mobile devices.
 *
 * Collapsed: a small tab sticks out from the right edge of the screen.
 * Expanded: slides out to show mode toggles + actions, then auto-collapses
 *           after the user takes an action or after a timeout.
 */
export function MobileModeDock({
  viewMode,
  lang,
  lang2,
  languageOptions,
  verseDetailOpen = false,
  practiceProgress,
  puzzleProgress,
  onViewModeChange,
  onVerseDetailToggle,
  onLangChange,
  onLang2Change,
  onHelpOpen,
  onExploreOpen,
  labelFn,
  T,
}: MobileModeDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setExpanded(false);
    }, AUTO_HIDE_MS) as unknown as number;
  }, [clearHideTimer]);

  // When dock expands, start the auto-hide timer
  useEffect(() => {
    if (expanded) {
      scheduleHide();
    } else {
      clearHideTimer();
    }
    return clearHideTimer;
  }, [expanded, scheduleHide, clearHideTimer]);

  // After an action, collapse the dock
  const handleAction = useCallback(
    (action: () => void) => {
      action();
      // Short delay so the user sees visual feedback before collapse
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setExpanded(false);
      }, 400) as unknown as number;
    },
    [clearHideTimer],
  );

  const DockButton = ({
    active,
    color,
    onClick,
    icon,
    label,
    badge,
    progress,
  }: {
    active?: boolean;
    color?: string;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: boolean;
    progress?: number;
  }) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        minWidth: 48,
      }}
    >
      <IconButton
        onClick={() => handleAction(onClick)}
        sx={{
          color: active ? color || '#0ea5e9' : '#94a3b8',
          bgcolor: active ? `${color || '#0ea5e9'}20` : 'transparent',
          '&:hover': {
            bgcolor: active ? `${color || '#0ea5e9'}30` : 'rgba(255,255,255,0.05)',
          },
          transition: 'all 0.2s ease',
          position: 'relative',
          p: 1,
        }}
      >
        {progress !== undefined && progress > 0 && (
          <CircularProgress
            variant="determinate"
            value={progress}
            size={32}
            thickness={2}
            sx={{
              position: 'absolute',
              color: progress >= 100 ? '#22c55e' : color || '#0ea5e9',
              opacity: 0.6,
            }}
          />
        )}
        {badge ? (
          <Badge
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: color || '#0ea5e9',
                width: 6,
                height: 6,
                minWidth: 6,
              },
            }}
          >
            {icon}
          </Badge>
        ) : (
          icon
        )}
      </IconButton>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.55rem',
          color: active ? color || '#0ea5e9' : '#64748b',
          mt: 0.125,
          fontWeight: active ? 600 : 400,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      {progress !== undefined && progress >= 100 && (
        <Box
          sx={{
            position: 'absolute',
            top: -2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.45rem',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          ✓
        </Box>
      )}
    </Box>
  );

  // --- Collapsed tab (right edge) ---
  if (!expanded) {
    return (
      <Box
        onClick={() => setExpanded(true)}
        sx={{
          position: 'fixed',
          right: 0,
          bottom: '40%',
          zIndex: 1200,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          // Small tab that sticks out from right edge
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          px: 0.5,
          py: 1.5,
          boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          '&:active': { transform: 'scale(0.95)' },
        }}
      >
        <MoreVertIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
      </Box>
    );
  }

  // --- Expanded dock ---
  return (
    <>
      {/* Backdrop to dismiss */}
      <Box
        onClick={() => setExpanded(false)}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1199,
        }}
      />

      {/* Expanded panel on right edge */}
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          right: 0,
          bottom: '18%',
          zIndex: 1200,
          borderRadius: '16px 0 0 16px',
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(51, 65, 85, 0.6)',
          borderRight: 'none',
          py: 1.5,
          px: 0.75,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
          animation: 'slideInRight 200ms ease-out',
          '@keyframes slideInRight': {
            from: { transform: 'translateX(100%)' },
            to: { transform: 'translateX(0)' },
          },
        }}
      >
        {/* Practice */}
        <DockButton
          active={viewMode === 'practice'}
          color="#3b82f6"
          onClick={() => onViewModeChange(viewMode === 'practice' ? 'reading' : 'practice')}
          icon={<SchoolIcon fontSize="small" />}
          label="Practice"
          progress={practiceProgress}
        />

        {/* Puzzle */}
        <DockButton
          active={viewMode === 'puzzle'}
          color="#8b5cf6"
          onClick={() => onViewModeChange(viewMode === 'puzzle' ? 'reading' : 'puzzle')}
          icon={<GridViewIcon fontSize="small" />}
          label="Puzzle"
          progress={puzzleProgress}
        />

        <Divider sx={{ borderColor: 'rgba(51,65,85,0.6)', width: '80%', my: 0.25 }} />

        {/* Read */}
        <DockButton
          active={viewMode === 'reading'}
          color="#0ea5e9"
          onClick={() => {
            if (viewMode !== 'reading') onViewModeChange('reading');
          }}
          icon={<AutoStoriesIcon fontSize="small" />}
          label="Read"
        />

        {/* Verse Details */}
        <DockButton
          active={verseDetailOpen}
          color="#a78bfa"
          onClick={onVerseDetailToggle}
          icon={<InfoOutlinedIcon fontSize="small" />}
          label="Details"
        />

        <Divider sx={{ borderColor: 'rgba(51,65,85,0.6)', width: '80%', my: 0.25 }} />

        {/* Settings/More */}
        <DockButton
          onClick={() => setSettingsOpen(true)}
          icon={<SettingsIcon fontSize="small" />}
          label="More"
          badge={!!lang2}
        />
      </Paper>

      {/* Settings Drawer */}
      <Drawer
        anchor="bottom"
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setExpanded(false);
        }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(15, 23, 42, 0.98)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '60vh',
            backdropFilter: 'blur(12px)',
          },
        }}
      >
        {/* Drag handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'rgba(148, 163, 184, 0.3)',
              borderRadius: 2,
            }}
          />
        </Box>

        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 600 }}>
            Settings
          </Typography>

          {/* Language Selection */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TranslateIcon sx={{ fontSize: 18, color: '#60a5fa' }} />
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                SCRIPT SELECTION
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', mb: 0.5, display: 'block' }}>
                  Primary Script
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={lang}
                  onChange={(e: SelectChangeEvent) => onLangChange(e.target.value as Lang)}
                  sx={{
                    bgcolor: 'rgba(51, 65, 85, 0.3)',
                    '& .MuiSelect-select': { py: 1 },
                  }}
                >
                  {languageOptions.map((code) => (
                    <MenuItem key={code} value={code}>
                      {labelFn(code)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', mb: 0.5, display: 'block' }}>
                  Secondary Script (optional)
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={lang2}
                  displayEmpty
                  onChange={(e: SelectChangeEvent) => onLang2Change((e.target.value || '') as Lang | '')}
                  sx={{
                    bgcolor: 'rgba(51, 65, 85, 0.3)',
                    '& .MuiSelect-select': { py: 1 },
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {languageOptions
                    .filter((code) => code !== lang)
                    .map((code) => (
                      <MenuItem key={code} value={code}>
                        {labelFn(code)}
                      </MenuItem>
                    ))}
                </Select>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(51, 65, 85, 0.4)', my: 2 }} />

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box
              onClick={() => {
                setSettingsOpen(false);
                setExpanded(false);
                onExploreOpen();
              }}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(51, 65, 85, 0.2)',
                border: '1px solid rgba(51, 65, 85, 0.4)',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.3)' },
              }}
            >
              <MapIcon sx={{ color: '#22d3ee' }} />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Navigate Map
              </Typography>
            </Box>

            <Box
              onClick={() => {
                setSettingsOpen(false);
                setExpanded(false);
                onHelpOpen();
              }}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(51, 65, 85, 0.2)',
                border: '1px solid rgba(51, 65, 85, 0.4)',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.3)' },
              }}
            >
              <HelpOutlineRoundedIcon sx={{ color: '#a78bfa' }} />
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {T('help')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

export default MobileModeDock;
