import { Box, Paper, Slider, Button, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface Props {
  playing: boolean;
  pace: number; // words per minute
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPace: (wpm: number) => void;
}

export function FlowTransport({ playing, pace, onToggle, onPrev, onNext, onPace }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(2,6,23,0.6)', borderColor: 'rgba(51,65,85,0.8)' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: { md: 'space-between' }, gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, order: { xs: 1, md: 2 } }}>
          <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'inline' } }}>PACE</Typography>
          <Slider
            aria-label="PACE"
            size="small"
            min={30}
            max={240}
            step={1}
            value={pace}
            onChange={(_, v) => onPace(Array.isArray(v) ? v[0] : (v as number))}
            sx={{ width: 200 }}
          />
          <Typography variant="caption">{pace} wpm</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, order: { xs: 2, md: 1 } }}>
          <IconButton color="inherit" onClick={onPrev} aria-label="Prev word"><ChevronLeftIcon /></IconButton>
          <Button
            onClick={onToggle}
            variant="contained"
            color={playing ? 'warning' : 'success'}
            startIcon={playing ? <PauseIcon /> : <PlayArrowIcon />}
            sx={{ borderRadius: 999 }}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
          <IconButton color="inherit" onClick={onNext} aria-label="Next word"><ChevronRightIcon /></IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
