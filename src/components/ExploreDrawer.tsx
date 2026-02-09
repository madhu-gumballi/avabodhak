import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Chip,
  Slider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import type { Lang } from '../data/types';

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
              onClick={() => {
                onSeek(i);
                onClose();
              }}
              sx={{
                aspectRatio: '1',
                borderRadius: 0.5,
                bgcolor: i === current
                  ? '#fbbf24'
                  : getVerseColor(i),
                opacity: i === current ? 1 : 0.6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  opacity: 1,
                  transform: 'scale(1.2)',
                },
                border: i === current ? '2px solid #fef3c7' : 'none',
              }}
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
