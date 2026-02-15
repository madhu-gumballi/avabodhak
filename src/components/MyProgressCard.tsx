import { useState } from 'react';
import { Box, Card, Typography, LinearProgress, IconButton, Tooltip } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import ExtensionIcon from '@mui/icons-material/Extension';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Lang } from '../data/types';
import { getPracticeStats, getNextUncompletedPracticeLine, getPracticeCompletionCount, resetPracticeProgress } from '../lib/practice';
import { getPuzzleStats, getNextUncompletedPuzzleLine, getPuzzleCompletionCount, resetPuzzleProgress } from '../lib/puzzle';
import { STOTRAS, getStotraLines, getStotraChapterIndices, type StotraInfo } from '../lib/stotraConfig';

interface MyProgressCardProps {
  onContinue: (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu' | 'raghavendra' | 'yantrodharaka' | 'venkateshwara', lang: Lang, mode: 'practice' | 'puzzle', lineIndex: number) => void;
  getTranslation: (key: string) => string;
}

/** Scan all languages for a stotra and return the best progress found.
 *  Uses a cheap first pass (no line-text scan) then a precise second pass
 *  only for the winning language to keep renders fast.
 */
function getBestProgress(stotra: StotraInfo) {
  let bestPracticeLang: Lang = stotra.languages[0];
  let bestPracticeCompleted = 0;

  let bestPuzzleLang: Lang = stotra.languages[0];
  let bestPuzzleCompleted = 0;

  // Cheap first pass: only count completed lines (no lines text needed)
  for (const lang of stotra.languages) {
    const ps = getPracticeStats(lang, stotra.totalLines, stotra.key);
    if (ps.completedLines > bestPracticeCompleted) {
      bestPracticeLang = lang;
      bestPracticeCompleted = ps.completedLines;
    }

    const pz = getPuzzleStats(lang, stotra.totalLines, stotra.key);
    if (pz.completed > bestPuzzleCompleted) {
      bestPuzzleLang = lang;
      bestPuzzleCompleted = pz.completed;
    }
  }

  // Precise second pass: only for the winning languages, get accurate totals
  const chapterIndices = getStotraChapterIndices(stotra.data);
  const practiceTotal = stotra.totalLines;
  const practiceProgress = practiceTotal > 0 ? bestPracticeCompleted / practiceTotal : 0;

  let puzzleTotal = stotra.totalLines;
  let puzzleProgress = 0;
  let puzzleLines: string[] | undefined;
  if (bestPuzzleCompleted > 0) {
    puzzleLines = getStotraLines(stotra.data, bestPuzzleLang);
    const pz = getPuzzleStats(bestPuzzleLang, stotra.totalLines, stotra.key, puzzleLines, chapterIndices);
    puzzleTotal = pz.total;
    puzzleProgress = pz.progress / 100;
  }

  const practiceCompletionCount = getPracticeCompletionCount(bestPracticeLang, stotra.key);
  const puzzleCompletionCount = getPuzzleCompletionCount(bestPuzzleLang, stotra.key);

  return {
    ...stotra,
    practiceLang: bestPracticeLang,
    practiceCompleted: bestPracticeCompleted,
    practiceTotal,
    practiceProgress,
    puzzleLang: bestPuzzleLang,
    puzzleCompleted: bestPuzzleCompleted,
    puzzleTotal,
    puzzleProgress,
    puzzleLines,
    puzzleCompletionCount,
    practiceCompletionCount,
    chapterIndices,
    hasProgress: bestPracticeCompleted > 0 || bestPuzzleCompleted > 0,
  };
}

const MAX_VISIBLE = 3;

export default function MyProgressCard({ onContinue, getTranslation }: MyProgressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rows = STOTRAS.filter((s) => !s.hidden).map(getBestProgress);

  const withProgress = rows.filter((r) => r.hasProgress);
  if (withProgress.length === 0) return null;

  // Sort by total progress (most active first)
  withProgress.sort((a, b) => {
    const aTotal = a.practiceCompleted + a.puzzleCompleted;
    const bTotal = b.practiceCompleted + b.puzzleCompleted;
    return bTotal - aTotal;
  });

  const visibleRows = expanded ? withProgress : withProgress.slice(0, MAX_VISIBLE);
  const hasMore = withProgress.length > MAX_VISIBLE;

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

      {visibleRows.map((row) => {
        const practiceFullyDone = row.practiceCompleted > 0 && row.practiceCompleted >= row.practiceTotal;
        const puzzleFullyDone = row.puzzleCompleted > 0 && row.puzzleCompleted >= row.puzzleTotal;

        return (
          <Box key={row.key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {getTranslation(`stotra_${row.key}`)}
              </Typography>
              {/* Show combined completion count badge */}
              {(row.practiceCompletionCount > 0 || row.puzzleCompletionCount > 0) && (
                <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.6rem' }}>
                  x{Math.max(row.practiceCompletionCount, row.puzzleCompletionCount)}
                </Typography>
              )}
            </Box>

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
                {practiceFullyDone ? (
                  <Tooltip title="Redo">
                    <IconButton
                      size="small"
                      onClick={() => {
                        resetPracticeProgress(row.practiceLang, row.totalLines, row.key);
                        onContinue(row.key, row.practiceLang, 'practice', 0);
                      }}
                      sx={{ p: 0.25, color: '#a78bfa' }}
                    >
                      <ReplayIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
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
                {puzzleFullyDone ? (
                  <Tooltip title="Redo">
                    <IconButton
                      size="small"
                      onClick={() => {
                        resetPuzzleProgress(row.puzzleLang, row.totalLines, row.key);
                        onContinue(row.key, row.puzzleLang, 'puzzle', 0);
                      }}
                      sx={{ p: 0.25, color: '#f472b6' }}
                    >
                      <ReplayIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title={getTranslation('continue')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const lines = row.puzzleLines || getStotraLines(row.data, row.puzzleLang);
                        const nextLine = getNextUncompletedPuzzleLine(row.puzzleLang, row.totalLines, row.key, lines, row.chapterIndices);
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
        );
      })}

      {hasMore && (
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 1.5,
            py: 0.5,
            cursor: 'pointer',
            borderRadius: 1,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
            {expanded ? 'Show less' : `Show all (${withProgress.length})`}
          </Typography>
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 14, color: '#64748b' }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 14, color: '#64748b' }} />
          )}
        </Box>
      )}
    </Card>
  );
}
