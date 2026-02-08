import { Box, Paper, Slider, Typography, IconButton, Tooltip, Popover, MenuList, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Lang } from '../data/types';

interface Props {
  current: number;
  total: number;
  onSeek: (lineIndex: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  // i18n
  lang: Lang;
  // Pronunciation helper
  legendActive?: boolean;
  onToggleLegend?: () => void;
  // Expose dragging state for parent to show line number overlay
  onDraggingChange?: (dragging: boolean, lineNumber?: number) => void;
  // Optional callback when the line counter chip (current/total) is clicked
  onLineCounterClick?: () => void;
}

export function FlowTimeline({
  current,
  total,
  onSeek,
  onSeekStart,
  onSeekEnd,
  lang,
  legendActive,
  onToggleLegend,
  onLineCounterClick,
}: Props) {
  const max = Math.max(0, total - 1);
  const value = Math.max(0, Math.min(current, max));
  const [dragging, setDragging] = useState(false);
  const [dragVal, setDragVal] = useState<number | null>(null);

  const T = (k: string): string => {
    const m: Record<string, Record<string, string>> = {
      iast: { helper: 'Pronunciation', settings: 'Settings', chapters: 'Sections' },
      deva: { helper: 'उच्चारण', settings: 'सेटिंग्स', chapters: 'अध्याय' },
      knda: { helper: 'ಉಚ್ಛಾರ', settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್', chapters: 'ಅಧ್ಯಾಯಗಳು' },
      tel: { helper: 'ఉచ్చారణ', settings: 'సెట్టింగ్స్', chapters: 'అధ్యాయాలు' },
      tam: { helper: 'உச்சரிப்பு', settings: 'அமைப்புகள்', chapters: 'அத்தியாயங்கள்' },
      guj: { helper: 'ઉચ્ચાર', settings: 'સેટિંગ્સ', chapters: 'અધ્યાય' },
      pan: { helper: 'ਉਚਾਰਣ', settings: 'ਸੈਟਿੰਗਜ਼', chapters: 'ਅਧਿਆਇ' },
    };
    return (m[lang] || m.iast)[k] || k;
  };

  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(2,6,23,0.6)', borderColor: 'rgba(51,65,85,0.8)', position: 'relative' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '1fr auto' }, alignItems: 'center', gap: 1, position: 'relative' }}>
        {/* Centered combined line indicator (current/total) with Chapters affordance */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: -44,
            px: 1.5,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: 'rgba(2,6,23,0.94)',
            border: '1px solid rgba(51,65,85,0.9)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'rgba(96,165,250,0.9)',
              boxShadow: '0 10px 28px rgba(30,64,175,0.7)',
            },
          }}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (onLineCounterClick) {
              onLineCounterClick();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onLineCounterClick) {
                onLineCounterClick();
              }
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              component="span"
              sx={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'rgba(148,163,184,0.95)',
              }}
            >
              {T('chapters')}
            </Typography>
            <ExpandMoreIcon sx={{ fontSize: 14, color: 'rgba(148,163,184,0.9)' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25, mt: 0.25 }}>
            <Typography component="span" sx={{ fontWeight: 800, letterSpacing: 0.3, fontSize: 16 }}>
              {(dragVal != null ? dragVal : value) + 1}
            </Typography>
            <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
              / {total}
            </Typography>
          </Box>
        </Box>

        {/* Timeline slider */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Slider
            aria-label="Timeline"
            size="small"
            min={0}
            max={max}
            value={value}
            onChange={(_, v) => {
              const nv = Array.isArray(v) ? v[0] : (v as number);
              setDragVal(nv);
              onSeek(nv);
            }}
            onChangeCommitted={(_, v) => {
              const nv = Array.isArray(v) ? v[0] : (v as number);
              onSeek(nv);
              setDragging(false);
              setDragVal(null);
              onSeekEnd && onSeekEnd();
            }}
            onMouseDown={() => { setDragging(true); onSeekStart && onSeekStart(); }}
            onTouchStart={() => { setDragging(true); onSeekStart && onSeekStart(); }}
            sx={{
              mx: 1,
              height: 6,
              touchAction: 'none',
              '& .MuiSlider-rail': { opacity: 0.9, bgcolor: 'rgba(148,163,184,0.55)' },
              '& .MuiSlider-track': { bgcolor: 'rgba(14,165,233,0.9)' },
              '& .MuiSlider-thumb': { width: 20, height: 20 },
              width: '100%'
            }}
          />
        </Box>

        {/* Settings button — only shown for IAST since it only contains the pronunciation helper toggle */}
        {lang === 'iast' && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, bgcolor: 'rgba(15,23,42,0.4)', borderRadius: 2, px: 1, py: 0.5 }}>
            <Tooltip title={T('settings')}>
              <IconButton
                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                aria-label="Settings"
                size="small"
                sx={{
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Settings popover */}
      <Popover
        open={Boolean(settingsAnchor)}
        anchorEl={settingsAnchor}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 0.5, bgcolor: 'rgba(2,6,23,0.95)' } }}
      >
        <MenuList dense>
          <MenuItem onClick={() => { onToggleLegend && onToggleLegend(); setSettingsAnchor(null); }}>
            <ListItemIcon>{legendActive ? <CheckIcon fontSize="small" /> : <span style={{ width: 16 }} />}</ListItemIcon>
            <ListItemText primary={T('helper')} />
          </MenuItem>
        </MenuList>
      </Popover>
    </Paper>
  );
}
