import { Box, Card, Typography, LinearProgress, IconButton, Tooltip } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import ExtensionIcon from '@mui/icons-material/Extension';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { Lang } from '../data/types';
import { getPracticeStats, getNextUncompletedPracticeLine } from '../lib/practice';
import { getPuzzleStats, getNextUncompletedPuzzleLine } from '../lib/puzzle';

interface StotraInfo {
  key: 'vsn' | 'hari' | 'keshava' | 'vayu';
  totalLines: number;
  languages: Lang[];
}

const STOTRAS: StotraInfo[] = [
  { key: 'vsn', totalLines: 495, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'mr', 'ben', 'mal', 'iast'] },
  { key: 'hari', totalLines: 11, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'iast'] },
  { key: 'keshava', totalLines: 26, languages: ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'iast'] },
  { key: 'vayu', totalLines: 42, languages: ['deva', 'knda', 'tel', 'tam', 'iast'] },
];

interface MyProgressCardProps {
  onContinue: (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu', lang: Lang, mode: 'practice' | 'puzzle', lineIndex: number) => void;
  getTranslation: (key: string) => string;
}

/** Scan all languages for a stotra and return the best progress found */
function getBestProgress(stotra: StotraInfo) {
  let bestPracticeLang: Lang = stotra.languages[0];
  let bestPracticeCompleted = 0;
  let bestPracticeTotal = stotra.totalLines;
  let bestPracticeProgress = 0;

  let bestPuzzleLang: Lang = stotra.languages[0];
  let bestPuzzleCompleted = 0;
  let bestPuzzleProgress = 0;

  for (const lang of stotra.languages) {
    const ps = getPracticeStats(lang, stotra.totalLines, stotra.key);
    if (ps.completedLines > bestPracticeCompleted) {
      bestPracticeLang = lang;
      bestPracticeCompleted = ps.completedLines;
      bestPracticeTotal = ps.totalLines;
      bestPracticeProgress = ps.progress;
    }

    const pz = getPuzzleStats(lang, stotra.totalLines, stotra.key);
    if (pz.completed > bestPuzzleCompleted) {
      bestPuzzleLang = lang;
      bestPuzzleCompleted = pz.completed;
      bestPuzzleProgress = pz.progress / 100;
    }
  }

  return {
    ...stotra,
    practiceLang: bestPracticeLang,
    practiceCompleted: bestPracticeCompleted,
    practiceTotal: bestPracticeTotal,
    practiceProgress: bestPracticeProgress,
    puzzleLang: bestPuzzleLang,
    puzzleCompleted: bestPuzzleCompleted,
    puzzleTotal: stotra.totalLines,
    puzzleProgress: bestPuzzleProgress,
    hasProgress: bestPracticeCompleted > 0 || bestPuzzleCompleted > 0,
  };
}

export default function MyProgressCard({ onContinue, getTranslation }: MyProgressCardProps) {
  const rows = STOTRAS.map(getBestProgress);

  const anyProgress = rows.some((r) => r.hasProgress);
  if (!anyProgress) return null;

  return (
    <Card
      sx={{
        bgcolor: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: 3,
        p: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 600 }}>
        {getTranslation('myProgress')}
      </Typography>

      {rows.filter((r) => r.hasProgress).map((row) => (
        <Box key={row.key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            {getTranslation(`stotra_${row.key}`)}
          </Typography>

          {/* Practice progress */}
          {row.practiceCompleted > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SchoolIcon sx={{ fontSize: 14, color: '#a78bfa', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LinearProgress
                  variant="determinate"
                  value={row.practiceProgress * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#a78bfa', borderRadius: 2 },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 36, textAlign: 'right', fontSize: '0.65rem' }}>
                {row.practiceCompleted}/{row.practiceTotal}
              </Typography>
              {row.practiceCompleted < row.practiceTotal && (
                <Tooltip title={getTranslation('continue')}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const nextLine = getNextUncompletedPracticeLine(row.practiceLang, row.totalLines, row.key);
                      onContinue(row.key, row.practiceLang, 'practice', nextLine);
                    }}
                    sx={{ p: 0.25, color: '#a78bfa' }}
                  >
                    <PlayArrowIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Puzzle progress */}
          {row.puzzleCompleted > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExtensionIcon sx={{ fontSize: 14, color: '#f472b6', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LinearProgress
                  variant="determinate"
                  value={row.puzzleProgress * 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#f472b6', borderRadius: 2 },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', minWidth: 36, textAlign: 'right', fontSize: '0.65rem' }}>
                {row.puzzleCompleted}/{row.puzzleTotal}
              </Typography>
              {row.puzzleCompleted < row.puzzleTotal && (
                <Tooltip title={getTranslation('continue')}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const nextLine = getNextUncompletedPuzzleLine(row.puzzleLang, row.totalLines, row.key);
                      onContinue(row.key, row.puzzleLang, 'puzzle', nextLine);
                    }}
                    sx={{ p: 0.25, color: '#f472b6' }}
                  >
                    <PlayArrowIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
      ))}
    </Card>
  );
}
