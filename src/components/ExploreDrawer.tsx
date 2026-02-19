import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Chip,
  Slider,
  keyframes,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import type { Lang } from '../data/types';

const pulseGold = keyframes`
  0%   { transform: scale(1);    background-color: #fbbf24; }
  50%  { transform: scale(1.35); background-color: #f59e0b; }
  100% { transform: scale(1.15); background-color: #fbbf24; }
`;

interface ExploreDrawerProps {
  open: boolean;
  onClose: () => void;
  current: number;
  total: number;
  onSeek: (index: number) => void;
  sectionMarks?: number[];
  chapterMarks?: number[];
  lang: Lang;
  T: (key: string) => string;
}

/**
 * ExploreDrawer - Full-screen verse navigation for mobile
 * Provides a visual map and quick navigation controls
 */
export function ExploreDrawer({
  open,
  onClose,
  current,
  total,
  onSeek,
  sectionMarks = [],
  chapterMarks = [],
  lang,
  T,
}: ExploreDrawerProps) {
  const [animTarget, setAnimTarget] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  // Clean up timer on unmount or when drawer closes
  useEffect(() => {
    if (!open) {
      setAnimTarget(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  // Scroll target block into view when animTarget is set
  useEffect(() => {
    if (animTarget !== null && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [animTarget]);

  const handleBlockClick = useCallback((i: number) => {
    if (i === current) return; // Already on this verse
    // Cancel any in-flight animation
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setAnimTarget(i);
    timerRef.current = setTimeout(() => {
      onSeek(i);
      onClose();
      setAnimTarget(null);
      timerRef.current = null;
    }, 600);
  }, [current, onSeek, onClose]);

  // Group verses into chunks for visual display
  const chunkSize = 10;
  const chunks = Math.ceil(total / chunkSize);

  // Get color for a verse based on its position
  const getVerseColor = (index: number) => {
    if (chapterMarks.includes(index)) return '#a78bfa'; // Chapter start - violet
    return '#475569'; // Normal - slate
  };

  // Calculate current verse info
  const currentChapter = chapterMarks.filter(c => c <= current).length || 1;
  const nextSection = sectionMarks.find(s => s > current);
  const prevSection = [...sectionMarks].reverse().find(s => s < current);

  // Determine block styling based on animation state
  const getBlockSx = (i: number) => {
    const isAnimating = animTarget !== null;
    const isCurrent = i === current;
    const isTarget = i === animTarget;

    if (isTarget) {
      // Target block: pulse golden animation
      return {
        aspectRatio: '1',
        borderRadius: 0.5,
        bgcolor: '#fbbf24',
        opacity: 1,
        cursor: 'pointer',
        animation: `${pulseGold} 0.5s ease forwards`,
        border: '2px solid #fef3c7',
        zIndex: 2,
        position: 'relative' as const,
      };
    }

    if (isCurrent && isAnimating) {
      // Current block fading out during animation
      return {
        aspectRatio: '1',
        borderRadius: 0.5,
        bgcolor: '#fbbf24',
        opacity: 0.4,
        cursor: 'pointer',
        transition: 'all 0.4s ease',
        transform: 'scale(0.9)',
        border: '2px solid #fef3c7',
      };
    }

    // Normal state
    return {
      aspectRatio: '1',
      borderRadius: 0.5,
      bgcolor: isCurrent ? '#fbbf24' : getVerseColor(i),
      opacity: isCurrent ? 1 : 0.6,
      cursor: 'pointer',
      transition: 'all 0.4s ease',
      '&:hover': {
        opacity: 1,
        transform: 'scale(1.2)',
      },
      border: isCurrent ? '2px solid #fef3c7' : 'none',
    };
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          height: '85vh',
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

      {/* Header */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
            Navigate
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Verse {current + 1} of {total}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#64748b' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Current Position Info */}
      <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          label={`Chapter ${currentChapter}`}
          sx={{
            bgcolor: 'rgba(167, 139, 250, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(167, 139, 250, 0.3)',
          }}
        />
        {nextSection && (
          <Chip
            size="small"
            label={`Next verse end: ${nextSection + 1}`}
            sx={{
              bgcolor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          />
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        {/* Visual Grid Map */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 0.5,
            mb: 3,
          }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <Box
              key={i}
              ref={i === animTarget ? targetRef : undefined}
              onClick={() => handleBlockClick(i)}
              sx={getBlockSx(i)}
              title={`Verse ${i + 1}`}
            />
          ))}
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#fbbf24' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Current</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#a78bfa' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Chapter</Typography>
          </Box>
        </Box>

        {/* Slider */}
        <Box sx={{ px: 2, mb: 3 }}>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
            Quick Jump
          </Typography>
          <Slider
            value={current}
            min={0}
            max={Math.max(0, total - 1)}
            onChange={(_, value) => onSeek(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `Verse ${v + 1}`}
            sx={{
              color: '#0ea5e9',
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
              },
              '& .MuiSlider-track': {
                height: 6,
              },
              '& .MuiSlider-rail': {
                height: 6,
                bgcolor: 'rgba(51, 65, 85, 0.6)',
              },
            }}
          />
        </Box>

        {/* Quick Nav Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
          <IconButton
            onClick={() => onSeek(0)}
            sx={{ color: '#94a3b8', bgcolor: 'rgba(51, 65, 85, 0.3)' }}
            title="First"
          >
            <FirstPageIcon />
          </IconButton>
          <IconButton
            onClick={() => onSeek(prevSection ?? Math.max(0, current - 10))}
            sx={{ color: '#94a3b8', bgcolor: 'rgba(51, 65, 85, 0.3)' }}
            title="Previous Section"
          >
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton
            onClick={() => onSeek(nextSection ?? Math.min(total - 1, current + 10))}
            sx={{ color: '#94a3b8', bgcolor: 'rgba(51, 65, 85, 0.3)' }}
            title="Next Section"
          >
            <NavigateNextIcon />
          </IconButton>
          <IconButton
            onClick={() => onSeek(total - 1)}
            sx={{ color: '#94a3b8', bgcolor: 'rgba(51, 65, 85, 0.3)' }}
            title="Last"
          >
            <LastPageIcon />
          </IconButton>
        </Box>

        {/* Chapter Jump */}
        {chapterMarks.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
              Jump to Chapter
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {chapterMarks.map((mark, i) => (
                <Chip
                  key={mark}
                  size="small"
                  label={`Ch. ${i + 1}`}
                  onClick={() => {
                    onSeek(mark);
                    onClose();
                  }}
                  sx={{
                    bgcolor: mark <= current && (chapterMarks[i + 1] ?? total) > current
                      ? 'rgba(167, 139, 250, 0.3)'
                      : 'rgba(51, 65, 85, 0.3)',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(167, 139, 250, 0.4)' },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export default ExploreDrawer;
