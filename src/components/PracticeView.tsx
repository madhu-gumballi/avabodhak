import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Button, LinearProgress, Select, MenuItem, IconButton, Chip, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Lang } from '../data/types';
import { MaskedWord } from './MaskedWord';
import { shouldMaskWord, getPracticeState, savePracticeState, getHintLetterCount, isChapterOrSectionLine, type PracticeDifficulty } from '../lib/practice';
import { basicSplit } from '../lib/tokenize';
import { analytics } from '../lib/analytics';
import { useAuth } from '../context/AuthContext';
import { playSuccessSoundIfEnabled } from '../lib/sound';

// Haptic feedback utility
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
  lines: string[]; // All lines in current language
  chapterIndices?: number[]; // indices of lines that are chapter headers
  lang: Lang;
  stotraKey?: string; // Stotra identifier for storage isolation
  initialLineIndex?: number;
  onExit: () => void;
  onSearchRequest?: () => void; // Callback to open search panel
  onLineIndexChange?: (newIndex: number) => void; // Callback when line index changes
  T: (key: string) => string; // Translation function
}

export function PracticeView({ lines, chapterIndices = [], lang, stotraKey, initialLineIndex = 0, onExit, onSearchRequest, onLineIndexChange, T }: Props) {
  const { recordLineComplete } = useAuth();
  const [lineIndex, setLineIndex] = useState(initialLineIndex);
  const difficulty = 'medium'; // Fixed to medium only
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const [completedLines, setCompletedLines] = useState<Set<number>>(new Set());
  const [jumpInput, setJumpInput] = useState('');
  const actionCountRef = useRef(0);
  
  // Swipe gesture detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const chapterIndexSet = useMemo(() => new Set(chapterIndices), [chapterIndices]);

  const isSkipIndex = useCallback((idx: number): boolean => {
    if (idx < 0 || idx >= lines.length) return true;
    if (chapterIndexSet.has(idx)) return true;
    const line = lines[idx] || '';
    return isChapterOrSectionLine(line);
  }, [chapterIndexSet, lines]);

  const currentLine = lines[lineIndex] || '';
  const words = basicSplit(currentLine);
  
  // Sync lineIndex with initialLineIndex prop changes (e.g., from search navigation)
  useEffect(() => {
    setLineIndex(initialLineIndex);
  }, [initialLineIndex]);
  
  // Calculate which words should be masked
  const maskedIndices = words
    .map((w, i) => shouldMaskWord(w, i, words.length, difficulty, lineIndex) ? i : -1)
    .filter(i => i !== -1);
  
  const totalMasked = maskedIndices.length;
  const progress = totalMasked > 0 ? (revealedWords.size / totalMasked) * 100 : 100;
  const isLineComplete = revealedWords.size >= totalMasked;


  // Load all completed line indices from storage
  const loadCompletedLines = (): Set<number> => {
    const completed = new Set<number>();
    try {
      for (let i = 0; i < lines.length; i++) {
        const state = getPracticeState(lang, i, stotraKey);
        if (state && state.completed) {
          completed.add(i);
        }
      }
    } catch {
      // Silent fail
    }
    return completed;
  };

  // Load saved progress when line changes
  useEffect(() => {
    const state = getPracticeState(lang, lineIndex, stotraKey);
    if (state) {
      setRevealedWords(state.revealedIndices);
      if (state.completed) {
        setCompletedLines(prev => new Set([...prev, lineIndex]));
      }
    } else {
      // First line (title) is always fully revealed
      if (lineIndex === 0) {
        const currentLine = lines[lineIndex] || '';
        const words = basicSplit(currentLine);
        const allIndices = words.map((_, i) => i);
        setRevealedWords(new Set(allIndices));
        setCompletedLines(prev => new Set([...prev, lineIndex]));
        savePracticeState(lang, {
          lineNumber: lineIndex,
          revealedIndices: new Set(allIndices),
          totalMasked: allIndices.length,
          completed: true,
        }, stotraKey);
      } else {
        setRevealedWords(new Set());
      }
    }
  }, [lineIndex, lang, lines]);

  // Load all completed lines on component mount
  useEffect(() => {
    const allCompleted = loadCompletedLines();
    setCompletedLines(allCompleted);
  }, [lang, lines]); // Only run when language or lines change

  // Handle line index changes
  useEffect(() => {
    if (onLineIndexChange) {
      onLineIndexChange(lineIndex);
    }
  }, [lineIndex]);

  // Skip chapter/section lines on initial load
  useEffect(() => {
    if (isSkipIndex(lineIndex)) {
      // Find next valid line
      let validIndex = lineIndex + 1;
      while (validIndex < lines.length && isSkipIndex(validIndex)) {
        validIndex++;
      }
      if (validIndex < lines.length) {
        setLineIndex(validIndex);
      }
    }
  }, []); // Only run on mount

  const handleReveal = (wordIndex: number) => {
    const newRevealed = new Set(revealedWords);
    newRevealed.add(wordIndex);
    setRevealedWords(newRevealed);

    // Haptic feedback on word reveal
    triggerHaptic('light');

    // Save progress
    const completed = newRevealed.size >= totalMasked;
    savePracticeState(lang, {
      lineNumber: lineIndex,
      revealedIndices: newRevealed,
      totalMasked,
      completed,
    }, stotraKey);

    // Track analytics
    actionCountRef.current++;
    analytics.practiceAction('word_reveal');
    analytics.practiceWordReveal(lineIndex, wordIndex);
    if (completed) {
      analytics.practiceAction('line_complete');
      analytics.practiceVerseComplete(lineIndex, difficulty);
      setCompletedLines(prev => new Set([...prev, lineIndex]));
      // Haptic feedback on line complete
      triggerHaptic('success');
      playSuccessSoundIfEnabled();
      // Record completion for gamification (achievements, daily goals, leaderboard)
      recordLineComplete();
    }
  };

  const stateRef = useRef({ lineIndex, lines });

  // Update state ref without causing re-renders (using ref callback)
  stateRef.current = { lineIndex, lines };

  const jumpToLine = useCallback((targetLine: number) => {
    const normalized = Math.max(0, Math.min(targetLine - 1, stateRef.current.lines.length - 1));
    actionCountRef.current++;
    analytics.practiceAction('jump');
    triggerHaptic('medium');
    setLineIndex(normalized);
    setJumpInput('');
  }, []); // Stable - uses stateRef

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Minimum swipe distance (50px) and maximum time (300ms)
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
      const currentState = stateRef.current;
      
      if (deltaX > 0) {
        // Swipe right - go to previous line
        let newIndex = currentState.lineIndex - 1;
        while (newIndex >= 0 && isSkipIndex(newIndex)) {
          newIndex--;
        }
        if (newIndex >= 0) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          triggerHaptic('light');
          setLineIndex(newIndex);
        }
      } else {
        // Swipe left - go to next line
        let newIndex = currentState.lineIndex + 1;
        while (newIndex < currentState.lines.length && isSkipIndex(newIndex)) {
          newIndex++;
        }
        if (newIndex < currentState.lines.length) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          triggerHaptic('light');
          setLineIndex(newIndex);
        }
      }
    }

    touchStartRef.current = null;
  }, []);

  const handleJumpKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const num = parseInt(jumpInput);
      if (!isNaN(num)) jumpToLine(num);
    }
  }, [jumpInput, jumpToLine]);

  // Keyboard shortcuts - single stable handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentState = stateRef.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let newIndex = currentState.lineIndex - 1;
        // Skip chapter/section lines
        while (newIndex >= 0 && isSkipIndex(newIndex)) {
          newIndex--;
        }
        if (newIndex >= 0) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          setLineIndex(newIndex);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        let newIndex = currentState.lineIndex + 1;
        // Skip chapter/section lines
        while (newIndex < currentState.lines.length && isSkipIndex(newIndex)) {
          newIndex++;
        }
        if (newIndex < currentState.lines.length) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          setLineIndex(newIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onSearchRequest) onSearchRequest();
      } else if (e.key === 'Home') {
        e.preventDefault();
        // Find first valid line (skip chapter/section lines)
        let firstIndex = 0;
        while (firstIndex < currentState.lines.length && isSkipIndex(firstIndex)) {
          firstIndex++;
        }
        if (firstIndex < currentState.lines.length) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          triggerHaptic('medium');
          setLineIndex(firstIndex);
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        // Find last valid line (skip chapter/section lines)
        let lastIndex = currentState.lines.length - 1;
        while (lastIndex >= 0 && isSkipIndex(lastIndex)) {
          lastIndex--;
        }
        if (lastIndex >= 0) {
          actionCountRef.current++;
          analytics.practiceAction('navigate');
          triggerHaptic('medium');
          setLineIndex(lastIndex);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        if (onSearchRequest) onSearchRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // No dependencies - runs once

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
            {/* Title - Icon only on mobile, full text on larger screens */}
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'white', 
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              🎯 {T('practice_mode')}
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'white',
                display: { xs: 'block', sm: 'none' },
                fontSize: '1.5rem'
              }}
            >
              🎯
            </Typography>
            
            <Chip
              label={`${T('line')} ${lineIndex + 1} / ${lines.length}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                placeholder={T('jump_to_line')}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={handleJumpKeyDown}
                sx={{
                  width: 90,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                  '& input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
                }}
              />
            </Box>
          </Box>
          {/* Exit button - Icon only on mobile */}
          <Button
            variant="outlined"
            startIcon={<CloseIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
            onClick={onExit}
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              minWidth: { xs: 40, sm: 'auto' },
              px: { xs: 1, sm: 2 }
            }}
          >
            <span style={{ display: 'none' }} className="sm:inline">{T('exit_practice')}</span>
            <CloseIcon sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '1.25rem' }} />
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {T('exit_practice')}
            </Box>
          </Button>
        </Box>

        {/* Progress Dots - Mini visualization */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap', maxWidth: 600, mx: 'auto' }}>
          {lines.slice(0, 50).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: completedLines.has(i) ? '#10b981' : i === lineIndex ? '#3b82f6' : 'rgba(255,255,255,0.2)',
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
              {T('progress')}: {revealedWords.size} / {totalMasked} {T('revealed')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {completedLines.size} {T('practiced')}
              </Typography>
              {isLineComplete && (
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
                bgcolor: isLineComplete ? '#10b981' : '#3b82f6',
                transition: 'all 0.3s ease',
              },
            }}
          />
        </Box>
        {/* <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {T('difficulty')}:
          </Typography>
          <Select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as PracticeDifficulty)}
            size="small"
            sx={{
              minWidth: 150,
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            }}
          >
            <MenuItem value="easy">{T('easy')}</MenuItem>
            <MenuItem value="medium">{T('medium')}</MenuItem>
            <MenuItem value="hard">{T('hard')}</MenuItem>
          </Select>
        </Box> */}

        {/* Main Practice Area - ONLY MASKED LINE */}
        <Paper
          elevation={8}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            p: { xs: 3, sm: 5, md: 6 },
            mb: 4,
            minHeight: 260,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            touchAction: 'pan-y', // Allow vertical scrolling but enable horizontal swipes
          }}
        >
          {/* Hint or Replay */}
          {isLineComplete ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(16, 185, 129, 0.9)',
                  fontWeight: 500,
                }}
              >
                {T('practice_complete')}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  actionCountRef.current++;
                  analytics.practiceAction('replay');
                  triggerHaptic('medium');
                  const resetRevealed = new Set<number>();
                  setRevealedWords(resetRevealed);
                  // Remove from completed lines since we're replaying
                  setCompletedLines(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(lineIndex);
                    return newSet;
                  });
                  // Save reset state
                  savePracticeState(lang, {
                    lineNumber: lineIndex,
                    revealedIndices: resetRevealed,
                    totalMasked,
                    completed: false,
                  }, stotraKey);
                }}
                sx={{
                  color: '#10b981',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  '&:hover': {
                    borderColor: 'rgba(16, 185, 129, 0.6)',
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                  },
                }}
              >
                {T('replay_line')}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  fontStyle: 'italic',
                }}
              >
                {T('practice_hint')}
              </Typography>
              {/* Subtle complete line option for advanced users */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  actionCountRef.current++;
                  analytics.practiceAction('complete_line');
                  triggerHaptic('success');
                  playSuccessSoundIfEnabled();
                  const allRevealed = new Set<number>(maskedIndices);
                  setRevealedWords(allRevealed);
                  setCompletedLines(prev => new Set([...prev, lineIndex]));
                  // Save revealed state
                  savePracticeState(lang, {
                    lineNumber: lineIndex,
                    revealedIndices: allRevealed,
                    totalMasked,
                    completed: true,
                  }, stotraKey);
                }}
                sx={{
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  textTransform: 'none',
                  minHeight: 'auto',
                  py: 0.5,
                  px: 1,
                  '&:hover': {
                    color: 'rgba(255,255,255,0.6)',
                    borderColor: 'rgba(255,255,255,0.4)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                {T('reveal')}
              </Button>
            </Box>
          )}

          {/* Masked Words - NO PRIMARY LINE VISIBLE */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
              fontSize: words.length > 20 ? { xs: '0.9rem', sm: '1.1rem', md: '1.4rem', lg: '1.8rem' } : { xs: '1.2rem', sm: '1.5rem', md: '2rem', lg: '2.5rem' }, // Smaller font for very long lines
              lineHeight: 1.4,
              maxWidth: '100%',
              overflowX: 'visible',
              overflowY: 'visible',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              scrollbarWidth: 'thin', // Firefox
              '&::-webkit-scrollbar': { // Chrome/Safari
                height: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255,255,255,0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
              },
            }}
          >
          {words.map((word, i) => {
            const isMasked = maskedIndices.includes(i);
            const isRevealed = revealedWords.has(i);

            if (isMasked && !isRevealed) {
              const hintCount = getHintLetterCount(word, difficulty);
              return (
                <MaskedWord
                  key={`practice-word-${i}`}
                  word={word}
                  masked={true}
                  alreadyRevealed={false}
                  onReveal={() => handleReveal(i)}
                  hintLetterCount={hintCount}
                />
              );
            }

            return (
              <span
                key={`practice-word-${i}`}
                style={{
                  color: isRevealed ? '#fbbf24' : '#a5b4fc',
                  fontWeight: isRevealed ? 600 : 400,
                  transition: 'all 0.3s ease',
                }}
              >
                {word}
              </span>
            );
          })}
        </Box>
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
              onClick={() => {
                // Find first valid line (skip chapter/section lines)
                let firstIndex = 0;
                while (firstIndex < lines.length && isChapterOrSectionLine(lines[firstIndex])) {
                  firstIndex++;
                }
                if (firstIndex < lines.length) {
                  actionCountRef.current++;
                  analytics.practiceAction('navigate');
                  triggerHaptic('light');
                  setLineIndex(firstIndex);
                }
              }}
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
              aria-label="Go to first line"
            >
              <FirstPageIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                let newIndex = lineIndex - 1;
                // Skip chapter/section lines
                while (newIndex >= 0 && isChapterOrSectionLine(lines[newIndex])) {
                  newIndex--;
                }
                if (newIndex >= 0) {
                  actionCountRef.current++;
                  analytics.practiceAction('navigate');
                  triggerHaptic('light');
                  setLineIndex(newIndex);
                }
              }}
              disabled={lineIndex === 0}
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.2)',
                color: 'white',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.3)' },
                '&:disabled': { 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  color: 'rgba(255,255,255,0.3)' 
                },
              }}
              aria-label="Go to previous line"
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {T('line')} {lineIndex + 1}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton
              onClick={() => {
                let newIndex = lineIndex + 1;
                // Skip chapter/section lines
                while (newIndex < lines.length && isChapterOrSectionLine(lines[newIndex])) {
                  newIndex++;
                }
                if (newIndex < lines.length) {
                  actionCountRef.current++;
                  analytics.practiceAction('navigate');
                  triggerHaptic('light');
                  setLineIndex(newIndex);
                }
              }}
              disabled={lineIndex === lines.length - 1}
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.2)',
                color: 'white',
                borderRadius: 2,
                width: 48,
                height: 48,
                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.3)' },
                '&:disabled': { 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  color: 'rgba(255,255,255,0.3)' 
                },
              }}
              aria-label="Go to next line"
            >
              <ArrowForwardIcon />
            </IconButton>
            <IconButton
              onClick={() => {
                // Find last valid line (skip chapter/section lines)
                let lastIndex = lines.length - 1;
                while (lastIndex >= 0 && isChapterOrSectionLine(lines[lastIndex])) {
                  lastIndex--;
                }
                if (lastIndex >= 0) {
                  actionCountRef.current++;
                  analytics.practiceAction('navigate');
                  triggerHaptic('light');
                  setLineIndex(lastIndex);
                }
              }}
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
              aria-label="Go to last line"
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
            color: 'rgba(255,255,255,0.3)',
            mt: 3,
          }}
        >
          {T('tip_practice_navigate')}
        </Typography>
      </Box>
    </Box>
  );
}
