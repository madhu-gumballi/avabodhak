import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Button, IconButton, Chip, LinearProgress, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import type { Lang } from '../data/types';
import {
  scrambleSegments,
  validateArrangement,
  getCorrectPositions,
  applyHint,
  getMaxHints,
  savePuzzleState,
  getPuzzleState,
  isPuzzleSuitable,
  type PuzzleSegment,
  type PuzzleState,
} from '../lib/puzzle';
import { basicSplit } from '../lib/tokenize';
import { isChapterOrSectionLine } from '../lib/practice';
import { analytics } from '../lib/analytics';

// Haptic feedback utility (reused from PracticeView)
const triggerHaptic = (pattern: 'light' | 'medium' | 'success' | 'error' = 'light') => {
  if ('vibrate' in navigator) {
    switch (pattern) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'success':
        navigator.vibrate([10, 50, 10]);
        break;
      case 'error':
        navigator.vibrate([50, 100, 50]);
        break;
    }
  }
};

interface Props {
  lines: string[];
  chapterIndices?: number[]; // indices of lines that are chapter headers
  lang: Lang;
  initialLineIndex?: number;
  onExit: () => void;
  T: (key: string) => string;
}

export function PuzzleView({ lines, chapterIndices = [], lang, initialLineIndex = 0, onExit, T }: Props) {
  const [lineIndex, setLineIndex] = useState(initialLineIndex);
  const [correctSegments, setCorrectSegments] = useState<PuzzleSegment[]>([]);
  const [availableSegments, setAvailableSegments] = useState<PuzzleSegment[]>([]);
  const [userArrangement, setUserArrangement] = useState<(PuzzleSegment | null)[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const startTimeRef = useRef(Date.now());
  const actionCountRef = useRef(0);

  // Swipe gesture detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const chapterIndexSet = useMemo(() => new Set(chapterIndices), [chapterIndices]);

  const isSkipIndex = useCallback((idx: number): boolean => {
    if (idx < 0 || idx >= lines.length) return true;
    if (chapterIndexSet.has(idx)) return true;
    const line = lines[idx] || '';
    return !isPuzzleSuitable(line);
  }, [chapterIndexSet, lines]);

  const currentLine = lines[lineIndex] || '';

  // Initialize puzzle for current line
  const initializePuzzle = useCallback(() => {
    const words = basicSplit(currentLine);
    const correct = words.map((word, index) => ({
      id: `seg-${index}-${Math.random().toString(36).substr(2, 9)}`,
      text: word,
      originalIndex: index,
    }));

    const scrambled = scrambleSegments(currentLine);
    setCorrectSegments(correct);
    setAvailableSegments(scrambled);
    setUserArrangement(new Array(correct.length).fill(null));
    setHintsUsed(0);
    setAttempts(0);
    setIsComplete(false);
    setShowFeedback(false);
    startTimeRef.current = Date.now();
  }, [currentLine]);

  // Load saved state or initialize new puzzle
  useEffect(() => {
    const savedState = getPuzzleState(lang, lineIndex);
    if (savedState) {
      // Resume saved or completed puzzle - load full state
      const words = basicSplit(currentLine);
      const correct = words.map((word, index) => ({
        id: `seg-${index}-correct`,
        text: word,
        originalIndex: index,
      }));
      
      setCorrectSegments(correct);
      setUserArrangement(savedState.userArrangement);
      setHintsUsed(savedState.hintsUsed);
      setAttempts(savedState.attempts);
      setIsComplete(savedState.completed);
      startTimeRef.current = savedState.startTime;
      
      // Calculate available segments for incomplete puzzles
      if (!savedState.completed) {
        const scrambled = savedState.scrambledSegments || scrambleSegments(currentLine);
        setAvailableSegments(
          scrambled.filter(
            seg => !savedState.userArrangement.some(arr => arr?.id === seg.id)
          )
        );
      } else {
        // For completed puzzles, no available segments
        setAvailableSegments([]);
        setCompletedLines(prev => new Set([...prev, lineIndex]));
      }
    } else {
      // New puzzle
      initializePuzzle();
    }
  }, [lineIndex, lang, currentLine, initializePuzzle]);

  // Load all completed puzzles
  useEffect(() => {
    const completed = new Set<number>();
    try {
      for (let i = 0; i < lines.length; i++) {
        const state = getPuzzleState(lang, i);
        if (state && state.completed) {
          completed.add(i);
        }
      }
    } catch {
      // Silent fail
    }
    setCompletedLines(completed);
  }, [lang, lines]);

  // Skip to next suitable puzzle line on mount
  useEffect(() => {
    let validIndex = lineIndex;
    while (validIndex < lines.length && isSkipIndex(validIndex)) {
      validIndex++;
    }
    if (validIndex !== lineIndex && validIndex < lines.length) {
      setLineIndex(validIndex);
    }
  }, []); // Only run on mount

  // Handle segment selection from available pool
  const handleSegmentSelect = (segment: PuzzleSegment) => {
    if (isComplete) return; // Don't allow changes when complete
    
    // Find first empty slot
    const emptyIndex = userArrangement.findIndex(slot => slot === null);
    if (emptyIndex === -1) return;

    const newArrangement = [...userArrangement];
    newArrangement[emptyIndex] = segment;
    setUserArrangement(newArrangement);

    // Remove from available
    setAvailableSegments(prev => prev.filter(s => s.id !== segment.id));

    triggerHaptic('light');

    // Save state
    saveCurrentState(newArrangement, false);
    
    // Check if solved with confetti
    const correct = validateArrangement(newArrangement, correctSegments);
    if (correct && newArrangement.every(s => s !== null)) {
      // Auto-complete with confetti
      setTimeout(() => {
        triggerHaptic('success');
        setIsComplete(true);
        setShowFeedback(true);
        setCompletedLines(prev => new Set([...prev, lineIndex]));
        
        // Save completed state
        const completionTime = Date.now();
        const state: PuzzleState = {
          lineNumber: lineIndex,
          scrambledSegments: correctSegments,
          userArrangement: newArrangement,
          completed: true,
          attempts: attempts + 1,
          hintsUsed,
          startTime: startTimeRef.current,
          completionTime,
        };
        savePuzzleState(lang, state);
        
        // Trigger confetti
        triggerConfetti();
      }, 100);
    }
  };

  // Handle segment removal from arrangement
  const handleSegmentRemove = (index: number) => {
    const segment = userArrangement[index];
    if (!segment) return;

    const newArrangement = [...userArrangement];
    newArrangement[index] = null;
    setUserArrangement(newArrangement);

    // Add back to available
    setAvailableSegments(prev => [...prev, segment]);

    triggerHaptic('light');

    // Save state
    saveCurrentState(newArrangement, false);
  };

  // Check if arrangement is correct
  const handleCheck = () => {
    setAttempts(prev => prev + 1);
    actionCountRef.current++;

    const isCorrect = validateArrangement(userArrangement, correctSegments);

    if (isCorrect) {
      triggerHaptic('success');
      setIsComplete(true);
      setShowFeedback(true);
      setCompletedLines(prev => new Set([...prev, lineIndex]));

      // Save completed state
      const completionTime = Date.now();
      const state: PuzzleState = {
        lineNumber: lineIndex,
        scrambledSegments: correctSegments,
        userArrangement,
        completed: true,
        attempts,
        hintsUsed,
        startTime: startTimeRef.current,
        completionTime,
      };
      savePuzzleState(lang, state);

      // Analytics
      analytics.practiceAction('line_complete');
    } else {
      triggerHaptic('error');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);

      // Save state
      saveCurrentState(userArrangement, false);
    }
  };

  // Confetti animation
  const triggerConfetti = () => {
    // Confetti using bright glyphs with contrasting colors
    const textGlyphs = ['हरे कृष्ण','રાધે રાધે','ॐ','श्री','हरे कृष्ण','ૐ','શ્રી'];
    const iconGlyphs = ['✦','𓃔', '𓃖','✿','𓀤','❀','🪈','༗','🪕','📿'];
    const allGlyphs = [...textGlyphs, ...iconGlyphs];
    const palette = ['#f59e0b','#f43f5e','#22d3ee','#10b981','#a78bfa','#eab308','#06b6d4','#ef4444','#34d399','#60a5fa'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(container);
    
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      const glyph = allGlyphs[Math.floor(Math.random() * allGlyphs.length)];
      particle.textContent = glyph;
      let size = 22 + Math.random() * 10;
      if (iconGlyphs.includes(glyph)) size = Math.round(size * 1.35);
      const hue = palette[Math.floor(Math.random() * palette.length)];
      particle.style.cssText = `
        position:absolute;
        font-size:${size}px;
        font-weight:900;
        color:${hue};
        text-shadow:0 1px 2px rgba(0,0,0,0.6);
        left:${Math.random()*100}%;
        top:-16px;
        animation:confetti-fall ${2.2 + Math.random()*1.8}s ease-out forwards;
      `;
      container.appendChild(particle);
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `@keyframes confetti-fall{to{transform:translateY(100vh) rotate(${Math.random()*360}deg);opacity:0;}}`;
    document.head.appendChild(style);
    
    setTimeout(() => {
      document.body.removeChild(container);
      document.head.removeChild(style);
    }, 3200);
  };

  // Apply hint
  const handleHint = () => {
    if (isComplete) return; // Don't allow hints on completed puzzles
    
    const newHintsUsed = hintsUsed + 1;
    setHintsUsed(newHintsUsed);
    actionCountRef.current++;

    const { newArrangement, newAvailable, wordsRevealed } = applyHint(
      correctSegments,
      userArrangement,
      newHintsUsed,
      availableSegments
    );

    setUserArrangement(newArrangement);
    setAvailableSegments(newAvailable);

    triggerHaptic(wordsRevealed > 0 ? 'medium' : 'light');

    // Save state
    saveCurrentState(newArrangement, false);
  };

  // Reveal entire solution
  const handleReveal = () => {
    setUserArrangement(correctSegments);
    setAvailableSegments([]);
    setIsComplete(true);
    setShowFeedback(true);
    setCompletedLines(prev => new Set([...prev, lineIndex]));
    triggerHaptic('success');
    
    // Save completed state
    const completionTime = Date.now();
    const state: PuzzleState = {
      lineNumber: lineIndex,
      scrambledSegments: correctSegments,
      userArrangement: correctSegments,
      completed: true,
      attempts: attempts + 1,
      hintsUsed: hintsUsed + 1, // Count reveal as a hint
      startTime: startTimeRef.current,
      completionTime,
    };
    savePuzzleState(lang, state);
    actionCountRef.current++;
  };

  // Replay completed puzzle
  const handleReplay = () => {
    initializePuzzle();
    triggerHaptic('medium');
    actionCountRef.current++;
  };

  // Reset puzzle (clear current attempt)
  const handleReset = () => {
    if (isComplete) return; // Use Replay button for completed puzzles
    initializePuzzle();
    triggerHaptic('medium');
    actionCountRef.current++;
  };

  // Save current puzzle state
  const saveCurrentState = (arrangement: (PuzzleSegment | null)[], completed: boolean) => {
    const state: PuzzleState = {
      lineNumber: lineIndex,
      scrambledSegments: correctSegments,
      userArrangement: arrangement,
      completed,
      attempts,
      hintsUsed,
      startTime: startTimeRef.current,
    };
    savePuzzleState(lang, state);
  };

  // Navigation
  const navigateToLine = (newIndex: number) => {
    let validIndex = newIndex;
    const direction = newIndex > lineIndex ? 1 : -1;

    // Skip unsuitable and chapter lines
    while (
      validIndex >= 0 &&
      validIndex < lines.length &&
      isSkipIndex(validIndex)
    ) {
      validIndex += direction;
    }

    if (validIndex >= 0 && validIndex < lines.length) {
      setLineIndex(validIndex);
      actionCountRef.current++;
      triggerHaptic('light');
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (deltaX > 0) {
        navigateToLine(lineIndex - 1);
      } else {
        navigateToLine(lineIndex + 1);
      }
    }

    touchStartRef.current = null;
  }, [lineIndex]);

  // Keyboard navigation: Left/Right arrows to move across suitable puzzle lines
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || '').toLowerCase();
      if (t?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToLine(lineIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToLine(lineIndex + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lineIndex, navigateToLine]);

  const correctCount = getCorrectPositions(userArrangement, correctSegments);
  const maxHints = getMaxHints(correctSegments.length);
  const allCorrect = correctCount === correctSegments.length && userArrangement.every(seg => seg !== null);
  const progress = correctSegments.length > 0 ? (correctCount / correctSegments.length) * 100 : 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              🧩 {T('puzzle_mode')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                display: { xs: 'block', sm: 'none' },
                fontSize: '1.5rem',
              }}
            >
              🧩
            </Typography>

            <Chip
              label={`${T('line')} ${lineIndex + 1} / ${lines.length}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
            />
          </Box>

          <Button
            variant="outlined"
            onClick={onExit}
            size="small"
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            {T('exit_puzzle')}
          </Button>
        </Box>

        {/* Progress Dots */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap', maxWidth: 600, mx: 'auto' }}>
          {lines.slice(0, 50).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: completedLines.has(i) ? '#10b981' : i === lineIndex ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {T('progress')}: {correctCount} / {correctSegments.length} {T('correct')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {completedLines.size} {T('completed')}
              </Typography>
              {isComplete && (
                <CheckCircleIcon sx={{ color: '#10b981', animation: 'bounce-subtle 0.6s ease' }} />
              )}
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: isComplete ? '#10b981' : '#8b5cf6',
                transition: 'all 0.3s ease',
              },
            }}
          />
        </Box>

        {/* Main Puzzle Area */}
        <Paper
          elevation={8}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            p: { xs: 3, sm: 4 },
            mb: 3,
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            touchAction: 'pan-y',
          }}
        >
          {/* Instructions */}
          {!isComplete && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                mb: 3,
                fontStyle: 'italic',
              }}
            >
              {T('puzzle_hint')}
            </Typography>
          )}

          {/* Completed State */}
          {isComplete && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#10b981',
                  fontWeight: 500,
                }}
              >
                {T('puzzle_complete')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  label={`${attempts} ${T('attempts')}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(139, 92, 246, 0.2)', color: 'white' }}
                />
                <Chip
                  label={`${hintsUsed} ${T('hints')}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(139, 92, 246, 0.2)', color: 'white' }}
                />
              </Box>
            </Box>
          )}

          {/* Available Segments Pool */}
          {!isComplete && availableSegments.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, display: 'block' }}>
                {T('tap_to_arrange')}:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {availableSegments.map(segment => (
                  <Button
                    key={segment.id}
                    onClick={() => handleSegmentSelect(segment)}
                    variant="contained"
                    sx={{
                      bgcolor: 'rgba(139, 92, 246, 0.3)',
                      color: 'white',
                      fontSize: { xs: '0.9rem', sm: '1.1rem' },
                      fontWeight: 500,
                      px: 2,
                      py: 1,
                      lineHeight: 1.25,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'rgba(139, 92, 246, 0.5)',
                      },
                    }}
                  >
                    {segment.text}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {/* User Arrangement */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1, display: 'block' }}>
              {T('your_arrangement')}:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', minHeight: 60 }}>
              {userArrangement.map((segment, index) => (
                <Box
                  key={index}
                  onClick={() => segment && !isComplete && handleSegmentRemove(index)}
                  sx={{
                    bgcolor: segment
                      ? correctSegments[index]?.originalIndex === segment.originalIndex
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(59, 130, 246, 0.3)'
                      : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: { xs: '0.9rem', sm: '1.1rem' },
                    fontWeight: 500,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    minWidth: 80,
                    lineHeight: 1.25,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                    cursor: segment && !isComplete ? 'pointer' : 'default',
                    border: segment ? '1px solid rgba(255,255,255,0.2)' : '2px dashed rgba(255,255,255,0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': segment && !isComplete
                      ? {
                          bgcolor: 'rgba(239, 68, 68, 0.3)',
                          borderColor: 'rgba(239, 68, 68, 0.5)',
                        }
                      : {},
                  }}
                >
                  {segment ? segment.text : '___'}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Feedback Message */}
          {showFeedback && !isComplete && (
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                color: '#ef4444',
                fontWeight: 500,
                animation: 'shake 0.5s ease',
              }}
            >
              {T('try_again')}
            </Typography>
          )}

          {/* Action Buttons */}
          {!isComplete && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
              <Tooltip title={T('get_hint')}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<LightbulbIcon />}
                    onClick={handleHint}
                    disabled={isComplete || hintsUsed >= maxHints}
                    sx={{
                      color: '#fbbf24',
                      borderColor: 'rgba(251, 191, 36, 0.4)',
                      '&:hover': {
                        borderColor: 'rgba(251, 191, 36, 0.6)',
                        bgcolor: 'rgba(251, 191, 36, 0.1)',
                      },
                      '&:disabled': {
                        color: 'rgba(255,255,255,0.3)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {T('hint')} ({hintsUsed}/{maxHints})
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={T('reveal')}>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={handleReveal}
                    disabled={isComplete}
                    sx={{
                      color: '#06b6d4',
                      borderColor: 'rgba(6, 182, 212, 0.4)',
                      '&:hover': {
                        borderColor: 'rgba(6, 182, 212, 0.6)',
                        bgcolor: 'rgba(6, 182, 212, 0.1)',
                      },
                      '&:disabled': {
                        color: 'rgba(255,255,255,0.3)',
                        borderColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {T('reveal')}
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={T('reset_puzzle')}>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={handleReset}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  {T('reset')}
                </Button>
              </Tooltip>
            </Box>
          )}

          {/* Replay and Next Buttons (when complete) */}
          {isComplete && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<ReplayIcon />}
                onClick={handleReplay}
                sx={{
                  color: '#f59e0b',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  '&:hover': {
                    borderColor: 'rgba(245, 158, 11, 0.6)',
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                  },
                }}
              >
                {T('replay_line')}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigateToLine(lineIndex + 1)}
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.8)',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  '&:hover': {
                    bgcolor: 'rgba(16, 185, 129, 1)',
                  },
                }}
              >
                {T('next_puzzle')}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Navigation Controls */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton
              onClick={() => navigateToLine(0)}
              disabled={lineIndex === 0}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.4)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.3)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              }}
              aria-label="Go to first puzzle"
            >
              <FirstPageIcon />
            </IconButton>
            <IconButton
              onClick={() => navigateToLine(lineIndex - 1)}
              disabled={lineIndex === 0}
              sx={{
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                color: 'white',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.3)' },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
              aria-label="Go to previous puzzle"
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {T('line')} {lineIndex + 1}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton
              onClick={() => navigateToLine(lineIndex + 1)}
              disabled={lineIndex === lines.length - 1}
              sx={{
                bgcolor: 'rgba(139, 92, 246, 0.2)',
                color: 'white',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.3)' },
                '&:disabled': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.3)',
                },
              }}
              aria-label="Go to next puzzle"
            >
              <ArrowForwardIcon />
            </IconButton>
            <IconButton
              onClick={() => navigateToLine(lines.length - 1)}
              disabled={lineIndex === lines.length - 1}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderColor: 'rgba(255,255,255,0.4)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.3)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              }}
              aria-label="Go to last puzzle"
            >
              <LastPageIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Keyboard Shortcuts Hint */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            mt: 2,
          }}
        >
          {T('keyboard_shortcuts')}: ← → {T('to_navigate')}
        </Typography>
      </Box>
    </Box>
  );
}
