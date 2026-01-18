import { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, IconButton, Select, MenuItem, Tooltip, useMediaQuery, Paper, Container, Typography, Button, Dialog, DialogTitle, DialogContent, Chip, Snackbar, Alert, Tabs, Tab } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import SchoolIcon from '@mui/icons-material/School';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import GridViewIcon from '@mui/icons-material/GridView';
import linesFile from '../data/vs.lines.new.json';
import type { Line, TextFile, Lang } from '../data/types';
import { useWordFlow } from '../hooks/useWordFlow';
import { splitTokens, chunkOffsetsByWord } from '../lib/tokenize';
import { FlowLens } from './FlowLens';
// import { FlowTransport } from './FlowTransport';
import { FlowTimeline } from './FlowTimeline';
import { FlowMap } from './FlowMap';
import { FadingImage } from './FadingImage';
import { SearchPanel } from './SearchPanel';
import { OverlayControls } from './OverlayControls';
import { PracticeView } from './PracticeView';
import { PuzzleView } from './PuzzleView';
import { OnboardingTour } from './OnboardingTour';
import { analytics } from '../lib/analytics';
import type { PracticeDifficulty } from '../lib/practice';
import { isTTSEnabled, isTTSSupportedForLang, LineTTSPlayer, WordTTSPlayer } from '../lib/tts';


export function VSNViewer({ onBack, textOverride, subtitleOverrides, availableLangs }: { onBack: () => void; textOverride?: TextFile; subtitleOverrides?: Partial<Record<Lang, string>>; availableLangs?: Lang[] }) {
  const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION || '0.0.0'}`;
  const theme = useMemo(() => createTheme({
    palette: { mode: 'dark', primary: { main: '#0ea5e9' }, secondary: { main: '#f59e0b' } },
    shape: { borderRadius: 12 },
    typography: {
      fontSize: 13,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji"',
      h6: { fontWeight: 800 },
      caption: { opacity: 0.8 }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(2,6,23,0.6)',
            borderColor: 'rgba(51,65,85,0.8)',
            boxShadow: '0 1px 0 rgba(148,163,184,0.06), inset 0 1px 0 rgba(0,0,0,0.2)'
          }
        },
        defaultProps: { variant: 'outlined' }
      },
      MuiButton: { defaultProps: { size: 'small' } },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiSlider: { defaultProps: { size: 'small' } }
    }
  }), []);
  const languageOptions = availableLangs ?? (['deva', 'knda', 'iast', 'tel', 'tam', 'guj', 'pan'] as Lang[]);
  const fallbackLang = (languageOptions.includes('iast') ? 'iast' : (languageOptions[0] || 'iast')) as Lang;
  const fallbackLang2 = (languageOptions.find((l) => l !== fallbackLang) || '') as Lang | '';
  const text = (textOverride ?? (linesFile as TextFile));
  const ttsEnabled = isTTSEnabled();
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const raw = localStorage.getItem('lang') as Lang | null;
      return raw && languageOptions.includes(raw) ? raw : fallbackLang;
    } catch { return fallbackLang; }
  });
  const [lang2, setLang2] = useState<Lang | ''>(() => {
    try {
      const raw = localStorage.getItem('lang2') as Lang | null;
      if (raw && languageOptions.includes(raw) && raw !== fallbackLang) return raw;
      return fallbackLang2;
    } catch { return fallbackLang2; }
  });
  useEffect(() => { try { localStorage.setItem('lang', lang); } catch { } }, [lang]);
  useEffect(() => { try { localStorage.setItem('lang2', lang2 || ''); } catch { } }, [lang2]);
  useEffect(() => {
    if (lang2 && (lang2 === lang || !languageOptions.includes(lang2))) {
      setLang2(fallbackLang2);
    }
  }, [lang, lang2, languageOptions, fallbackLang2]);

  const [pace, setPaceState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('ui:pace');
      return stored ? parseInt(stored) : 90;
    } catch { return 90; }
  });
  useEffect(() => { try { localStorage.setItem('ui:pace', pace.toString()); } catch { } }, [pace]);

  // Create TTS player instance ONCE and keep it stable across renders
  const lineTTSPlayerRef = useRef<LineTTSPlayer | null>(null);
  if (!lineTTSPlayerRef.current && ttsEnabled) {
    lineTTSPlayerRef.current = new LineTTSPlayer();
  }
  const lineTTSPlayer = lineTTSPlayerRef.current;

  // WordTTSPlayer for chanting/reading mode
  const wordTTSPlayerRef = useRef<WordTTSPlayer | null>(null);
  if (!wordTTSPlayerRef.current && ttsEnabled) {
    wordTTSPlayerRef.current = new WordTTSPlayer();
  }
  const wordTTSPlayer = wordTTSPlayerRef.current;

  // Check if TTS is supported for current language
  const ttsSupported = ttsEnabled && isTTSSupportedForLang(lang);

  // Cleanup TTS player ONLY on unmount, not on re-renders
  useEffect(() => {
    return () => {
      lineTTSPlayerRef.current?.dispose();
      lineTTSPlayerRef.current = null;
      wordTTSPlayerRef.current?.dispose();
      wordTTSPlayerRef.current = null;
    };
  }, []);

  // Wire LineTTSPlayer callbacks to local state
  useEffect(() => {
    if (!lineTTSPlayer) return;
    lineTTSPlayer.setCallbacks({
      onStart: () => setTtsMode('line'),
      onEnd: () => setTtsMode('off'),
      onError: () => setTtsMode('off'),
    });
  }, [lineTTSPlayer]);

  // useWordFlow handles navigation and word-by-word TTS playback
  const flow = useWordFlow(text.lines as Line[], lang, wordTTSPlayer || undefined, pace);

  // Unified TTS mode: 'off' | 'line' | 'word' - ensures mutual exclusivity
  const [ttsMode, setTtsMode] = useState<'off' | 'line' | 'word'>('off');
  const ttsModeRef = useRef<'off' | 'line' | 'word'>('off');
  useEffect(() => {
    ttsModeRef.current = ttsMode;
  }, [ttsMode]);

  // Derived states for backward compatibility
  const ttsPlaying = ttsMode === 'line';
  const wordTtsPlaying = ttsMode === 'word';

  // Sync ttsMode when word flow stops naturally (e.g., end of text)
  useEffect(() => {
    if (!flow.state.playing && ttsModeRef.current === 'word') {
      setTtsMode('off');
    }
  }, [flow.state.playing]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  // Word breakdown is always ON (no toggle in UI)
  const [expanded, setExpanded] = useState<boolean>(true);
  // When language changes, load pronunciation preference (defaults to true)
  useEffect(() => {
    try {
      const legendKey = `ui:legend:${lang}`;
      const legendV = localStorage.getItem(legendKey);
      setLegendOpen(legendV == null ? true : legendV === '1');
    } catch {
      setLegendOpen(true);
    }
  }, [lang]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [searchMarks, setSearchMarks] = useState<number[]>([]);
  const [freezing, setFreezing] = useState(false);
  const [lensH, setLensH] = useState<number | null>(null);
  const [sideH, setSideH] = useState<number | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'reading' | 'practice' | 'puzzle'>('reading');
  const [modeHint, setModeHint] = useState<'reading' | 'practice' | 'puzzle' | null>(null);
  const modeHintSeenRef = useRef<{ reading: boolean; practice: boolean; puzzle: boolean }>({
    reading: false,
    practice: false,
    puzzle: false,
  });
  const modeStartTimeRef = useRef<number>(Date.now());
  const modeActionCountRef = useRef<number>(0);
  const [practiceMode, setPracticeMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`ui:practice:${lang}`);
      return stored === 'true';
    } catch { return false; }
  });
  const [practiceLineIndex, setPracticeLineIndex] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`ui:practice:line:${lang}`);
      return stored ? parseInt(stored) : 0;
    } catch { return 0; }
  });
  const [practiceDifficulty, setPracticeDifficulty] = useState<PracticeDifficulty>(() => {
    try {
      const stored = localStorage.getItem('ui:practice:difficulty');
      return (stored as PracticeDifficulty) || 'medium';
    } catch { return 'medium'; }
  });
  const lensWrapRef = useRef<HTMLDivElement>(null);
  const lensInnerRef = useRef<HTMLDivElement>(null);
  const [lensMaxH, setLensMaxH] = useState<number>(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [nudge, setNudge] = useState<{ dir: 'prev' | 'next'; count: number; show: boolean }>({ dir: 'next', count: 1, show: false });
  const [navLineNumber, setNavLineNumber] = useState<number | null>(null); // Show line number during navigation
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false);

  // Always show current line number
  useEffect(() => setNavLineNumber(flow.state.lineIndex + 1), [flow.state.lineIndex]);
  const nudgeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [groupProgress, setGroupProgress] = useState(0); // 0..1 within current raw-word group dwell
  const [holdingGroup, setHoldingGroup] = useState(false);
  const [showSyncPill, setShowSyncPill] = useState(false);
  const playingRef = useRef(flow.state.playing);
  const holdingRef = useRef(holdingGroup);
  const wasPlayingBeforeHoldRef = useRef(false);
  useEffect(() => { playingRef.current = flow.state.playing; }, [flow.state.playing]);
  useEffect(() => { holdingRef.current = holdingGroup; }, [holdingGroup]);
  // If user manually pauses while a hold is active, do not auto-resume
  useEffect(() => {
    if (!flow.state.playing && holdingGroup) {
      wasPlayingBeforeHoldRef.current = false;
    }
  }, [flow.state.playing, holdingGroup]);
  const sideWrapMobileRef = useRef<HTMLDivElement>(null);
  const sideWrapDesktopRef = useRef<HTMLDivElement>(null);
  const measureHeights = () => {
    const a = lensWrapRef.current?.getBoundingClientRect().height || null;
    const bm = sideWrapMobileRef.current?.getBoundingClientRect().height || 0;
    const bd = sideWrapDesktopRef.current?.getBoundingClientRect().height || 0;
    const b = Math.max(bm, bd) || null;
    setLensH(a);
    setSideH(b);
  };
  useLayoutEffect(() => { if (freezing) measureHeights(); }, [freezing, flow.state.lineIndex]);

  // First-time onboarding
  useEffect(() => {
    try {
      const k = 'ui:onboarded:v1';
      if (!localStorage.getItem(k)) {
        setOnboardingOpen(true);
      }
    } catch { }
  }, []);

  // Stable callback for search result marks
  const handleSearchResults = useCallback((idxs: number[]) => {
    setSearchMarks((prev) => {
      if (prev.length === idxs.length && prev.every((v, i) => v === idxs[i])) return prev;
      return idxs;
    });
  }, []);

  // End-of-text detection and handling
  const atEnd = useMemo(() => {
    const lastToken = Math.max(0, flow.tokens.length - 1);
    return (flow.state.lineIndex >= flow.totalLines - 1) && (flow.state.wordIndex >= lastToken);
  }, [flow.state.lineIndex, flow.totalLines, flow.state.wordIndex, flow.tokens.length]);

  useEffect(() => {
    if (atEnd) {
      if (holdingGroup) setHoldingGroup(false);
      flow.setHold(false);
      setOverlayVisible(true);
    }
  }, [atEnd]);

  const uiPlaying = ttsMode !== 'off' || holdingGroup;

  // Lightweight per-mode inline hints (shown once per mode, then remembered)
  useEffect(() => {
    const key = viewMode;
    let timeoutId: number | null = null;
    const seen = modeHintSeenRef.current[key];
    if (!seen) {
      try {
        if (localStorage.getItem(`ui:hint:${key}`) === '1') {
          modeHintSeenRef.current[key] = true;
          setModeHint(null);
          return;
        }
      } catch { }
      setModeHint(key);
      modeHintSeenRef.current[key] = true;
      try { localStorage.setItem(`ui:hint:${key}`, '1'); } catch { }
      timeoutId = window.setTimeout(() => setModeHint(null), 7000) as unknown as number;
    } else {
      setModeHint(null);
    }
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [viewMode]);

  // Track max observed FlowLens height to prevent layout shifts
  useLayoutEffect(() => {
    const h = lensInnerRef.current?.getBoundingClientRect().height || 0;
    if (h > 0) setLensMaxH((prev) => Math.max(prev, h));
  }, [flow.state.lineIndex, lang, flow.tokens.length]);



  // Global keyboard shortcuts (reading mode only): Left/Right navigate by lines
  useEffect(() => {
    if (viewMode !== 'reading') return; // do not bind in puzzle/practice
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const tag = (t?.tagName || '').toLowerCase();
      if (t?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newLine = Math.max(0, flow.state.lineIndex - 1);
        flow.seekLine(newLine);
        setOverlayVisible(true);
        bumpNudge('prev');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newLine = Math.min(flow.totalLines - 1, flow.state.lineIndex + 1);
        flow.seekLine(newLine);
        setOverlayVisible(true);
        bumpNudge('next');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, flow.toggle, flow.seekLine, flow.state.lineIndex, flow.totalLines]);

  // Onboarding keyboard navigation is handled inside OnboardingTour

  // Touch gesture state for swipe navigation (hybrid mode)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Auto-hide overlay a moment after interaction if playing or holding
  useEffect(() => {
    if (!overlayVisible || !uiPlaying) return;
    const id = window.setTimeout(() => setOverlayVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [overlayVisible, uiPlaying]);

  // Memoized primary raw-word group index for current line
  const primaryGroupIndex = useMemo(() => {
    const L = flow.state.lineIndex;
    const currPrimary = (text.lines as any)[L]?.[lang] as string | undefined;
    const offsP = chunkOffsetsByWord(currPrimary || '', lang);
    let gi = Math.max(0, offsP.length - 2);
    for (let i = 0; i < offsP.length - 1; i++) {
      if (flow.state.wordIndex >= offsP[i] && flow.state.wordIndex < offsP[i + 1]) { gi = i; break; }
    }
    return gi;
  }, [flow.state.lineIndex, flow.state.wordIndex, lang, text.lines]);

  // Debounce showing the 'Syncing…' pill so very short holds don't flash
  useEffect(() => {
    let id: number | null = null;
    if (holdingGroup) {
      id = window.setTimeout(() => setShowSyncPill(true), 150) as unknown as number;
    } else {
      setShowSyncPill(false);
    }
    return () => { if (id) window.clearTimeout(id); };
  }, [holdingGroup]);

  // Animate within-group progression to drive secondary sub-word highlighting, even if primary group has 1 chunk
  useEffect(() => {
    // cancel existing RAF if any
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    // guards
    if (!lang2) { setGroupProgress(0); return; }
    if (atEnd) { setGroupProgress(1); if (holdingRef.current) setHoldingGroup(false); return; }
    const L = flow.state.lineIndex;
    const currPrimary = (text.lines as any)[L]?.[lang] as string | undefined;
    const currSecondary = (text.lines as any)[L]?.[lang2 as Lang] as string | undefined;
    const offsP = chunkOffsetsByWord(currPrimary || '', lang);
    const offsS = chunkOffsetsByWord(currSecondary || '', lang2 as Lang);
    const gi = Math.max(0, Math.min(primaryGroupIndex, Math.max(0, offsP.length - 2)));
    const startP = offsP[gi]; const endP = offsP[gi + 1] ?? startP + 1; const lenP = Math.max(1, endP - startP);
    const giS = Math.max(0, Math.min(gi, Math.max(0, offsS.length - 2)));
    const startS = offsS[giS]; const endS = offsS[giS + 1] ?? startS + 1; const lenS = Math.max(1, endS - startS);
    // Use a fixed duration per word (audio-driven flow handles actual timing)
    const baseMsPerWord = 600; // ~100 WPM equivalent for secondary sync animation
    const dwellMs = Math.max(lenP, lenS) * baseMsPerWord;
    // start RAF for dwell of this group in current line/language pair
    setGroupProgress(0);
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = ts - startTs;
      const prog = Math.max(0, Math.min(1, t / dwellMs));
      setGroupProgress(prog);
      if (prog < 1 && (playingRef.current || holdingRef.current)) { rafRef.current = requestAnimationFrame(step); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [flow.state.lineIndex, primaryGroupIndex, lang, lang2, text.lines, atEnd]);

  // Hold primary advancement at end of current raw-word group until RAF completes (ensures secondary finishes all sub-words)
  useEffect(() => {
    if (!lang2) { return; }
    if (!flow.state.playing) { return; }
    // Do not engage hold if we are already at the end of the final line
    if (atEnd) return;
    const L = flow.state.lineIndex;
    const currPrimary = (text.lines as any)[L]?.[lang] as string | undefined;
    const currSecondary = (text.lines as any)[L]?.[lang2 as Lang] as string | undefined;
    const offsP = chunkOffsetsByWord(currPrimary || '', lang);
    const offsS = chunkOffsetsByWord(currSecondary || '', lang2 as Lang);
    const gi = Math.max(0, Math.min(primaryGroupIndex, Math.max(0, offsP.length - 2)));
    const startP = offsP[gi];
    const endP = offsP[gi + 1] ?? startP + 1;
    const lenP = Math.max(1, (offsP[gi + 1] ?? (startP + 1)) - startP);
    const giS = Math.max(0, Math.min(gi, Math.max(0, offsS.length - 2)));
    const startS = offsS[giS];
    const lenS = Math.max(1, (offsS[giS + 1] ?? (startS + 1)) - startS);
    const lastIdxInGroup = Math.max(startP, endP - 1);
    const meaningfulGroup = (lenS > lenP) && (lenS > 1);
    if (meaningfulGroup && groupProgress < 0.999 && flow.state.wordIndex >= lastIdxInGroup && !holdingGroup) {
      wasPlayingBeforeHoldRef.current = flow.state.playing;
      flow.setHold(true);
      setHoldingGroup(true);
    }
  }, [flow.state.playing, flow.state.wordIndex, flow.state.lineIndex, lang, lang2, text.lines, primaryGroupIndex, groupProgress, atEnd]);

  // Resume once secondary finished its within-group progression (only if playback was active)
  useEffect(() => {
    if (holdingGroup && groupProgress >= 0.999) {
      setHoldingGroup(false);
      flow.setHold(false);
      wasPlayingBeforeHoldRef.current = false;
    }
  }, [holdingGroup, groupProgress, flow.start]);

  // Safety watchdog: if a group-hold lingers too long, auto-resume to avoid appearing "stuck"
  useEffect(() => {
    if (!holdingGroup) return;
    const id = window.setTimeout(() => {
      if (holdingRef.current) {
        wasPlayingBeforeHoldRef.current = false;
        setHoldingGroup(false);
        flow.setHold(false);
      }
    }, 450) as unknown as number;
    return () => window.clearTimeout(id);
  }, [holdingGroup, flow.start]);

  // Bump visual nudge indicator (+/- words) with small accumulation window
  const bumpNudge = useCallback((dir: 'prev' | 'next') => {
    setNudge({ dir, count: 1, show: true });
    setTimeout(() => setNudge(n => ({ ...n, show: false })), 1200);
  }, []);

  useEffect(() => () => { if (nudgeTimerRef.current) window.clearTimeout(nudgeTimerRef.current); }, []);



  const sectionMarks = useMemo(() => {
    const lines = (text.lines as any[]) || [];
    const idxs: number[] = [];
    lines.forEach((ln, i) => {
      const pool = `${ln?.deva || ''} ${ln?.knda || ''} ${ln?.iast || ''} ${ln?.tel || ''} ${ln?.tam || ''} ${ln?.guj || ''} ${ln?.pan || ''}`;
      if (/\u0965|\|\|/.test(pool)) idxs.push(i);
    });
    return idxs;
  }, [text.lines]);

  const chapterMarks = useMemo(() => {
    const lines = (text.lines as any[]) || [];
    const idxs: number[] = [];
    lines.forEach((ln, i) => {
      if (ln && ln.chapter) idxs.push(i);
    });
    return idxs;
  }, [text.lines]);

  const chapters = useMemo(() => {
    const lines = (text.lines as Line[]) || [];
    const items: { index: number; label: string; display: string }[] = [];
    lines.forEach((ln, i) => {
      const anyLn = ln as any;
      if (anyLn && anyLn.chapter) {
        const chapterName = String(anyLn.chapter);
        const displayLine = (anyLn[lang] as string | undefined) || chapterName;
        items.push({ index: i, label: chapterName, display: displayLine });
      }
    });
    return items;
  }, [text.lines, lang]);

  const currentChapterIndex = useMemo(() => {
    if (!chapterMarks.length) return -1;
    const cur = flow.state.lineIndex;
    let last = -1;
    for (let i = 0; i < chapterMarks.length; i++) {
      const idx = chapterMarks[i];
      if (idx <= cur) {
        last = idx;
      } else {
        break;
      }
    }
    return last;
  }, [chapterMarks, flow.state.lineIndex]);

  const practicePuzzleLines = useMemo(() => {
    const linesArr: string[] = [];
    const chapterIdxs: number[] = [];
    (text.lines as Line[]).forEach((ln) => {
      const value = (ln as any)[lang] as string | undefined;
      if (!value) return;
      const idx = linesArr.length;
      linesArr.push(value);
      if (ln.chapter) chapterIdxs.push(idx);
    });
    return { lines: linesArr, chapterIndices: chapterIdxs };
  }, [text.lines, lang]);

  const isSmall = useMediaQuery('(max-width:600px)');

  // Context-aware pronunciation micro-tip for IAST lines; shown only when pronunciation helper is enabled
  const microTip = useMemo(() => {
    if (lang !== 'iast') return '';
    if (!legendOpen) return '';
    const L = flow.state.lineIndex;
    const lineObj = (text.lines as any)[L] as any;
    const line = lineObj?.iast as string | undefined;
    if (!line) return '';
    const hasLong = /[āīūṝḹ]/u.test(line);
    const hasRetro = /[ṭḍṇṛ]/u.test(line);
    const hasAspCluster = /(kh|gh|ch|jh|ṭh|ḍh|th|dh|ph|bh)/u.test(line);
    const hasNasal = /[ṃṁ]/u.test(line);
    const hasVisarga = /ḥ/u.test(line);
    const hasSh = /[śṣ]/u.test(line);

    const compact = isSmall;

    if (!compact && hasLong && hasRetro) {
      return (
        <>
          Tip:{' '}
          <span className="inline-block px-1 rounded-sm iast-word-long">Teal outline</span>{' '}=
          {' '}long vowels (ā ī ū ṝ);{' '}
          <span className="inline-block px-1 rounded-sm iast-word-retro">golden underline</span>{' '}=
          {' '}retroflex consonants—tip of the tongue curls slightly back (ṭ ḍ ṇ ṛ).
        </>
      );
    }
    if (hasLong) {
      return (
        <>
          Tip:{' '}
          <span className="inline-block px-1 rounded-sm iast-word-long">Teal outline</span>{' '}
          {compact
            ? '= long vowels (ā ī ū ṝ).'
            : 'marks long vowels (ā ī ū ṝ held a bit longer).'}
        </>
      );
    }
    if (hasRetro) {
      return (
        <>
          Tip:{' '}
          <span className="inline-block px-1 rounded-sm iast-word-retro">golden underline</span>{' '}
          {compact
            ? '= retroflex consonants (ṭ ḍ ṇ ṛ).'
            : 'marks retroflex consonants—tip of the tongue curls slightly back (ṭ ḍ ṇ ṛ).'}
        </>
      );
    }
    if (hasAspCluster) {
      return (
        <>
          Tip:{' '}
          <span className="inline-block px-1 rounded-sm iast-word-aspirate">Dashed top edge</span>{' '}marks
          {' '}aspirates (kh, gh, th… add a light breath after the consonant).
        </>
      );
    }
    if (hasNasal || hasVisarga) {
      if (hasNasal && hasVisarga) {
        return (
          <>
            Tip:{' '}
            <span className="dia-anim-char dia-anim-nasal">ṃ/ṁ</span>{' '}and{' '}
            <span className="dia-anim-char dia-anim-aspirate">ḥ</span>{' '}both animate—hum softly, then release a gentle
            {' '}breath after the vowel.
          </>
        );
      }
      if (hasNasal) {
        return (
          <>
            Tip:{' '}
            Nasal dots{' '}
            <span className="dia-anim-char dia-anim-nasal">(ṃ/ṁ)</span>{' '}gently pulse—think soft "m/ng" hum into the
            {' '}vowel.
          </>
        );
      }
      return (
        <>
          Tip:{' '}
          <span className="dia-anim-char dia-anim-aspirate">ḥ</span>{' '}flickers after vowels—add a soft breath after the
          {' '}syllable.
        </>
      );
    }
    if (hasSh) {
      return (
        <>
          Tip:{' '}
          <span className="dia-anim-char dia-anim-fric-l">ś/ṣ</span>{' '}= "sh" sounds; their side-to-side glow marks a
          {' '}fricative hiss, not plain s.
        </>
      );
    }
    if (lang2) {
      return (
        <>
          Tip: With two scripts on, the lower line walks every sub-word in the group before the main script moves on.
        </>
      );
    }
    return '';
  }, [lang, legendOpen, flow.state.lineIndex, text.lines, lang2, isSmall]);

  // TTS playback handler: toggle line-level TTS for current line.
  // Ensures mutual exclusivity: stops word-by-word TTS if active.
  const handleLineTTS = useCallback(async () => {
    if (!lineTTSPlayer || !ttsSupported) return;

    // If line TTS is currently playing, stop it.
    if (ttsModeRef.current === 'line') {
      lineTTSPlayer.stop();
      setTtsMode('off');
      return;
    }

    // Stop word-by-word TTS if active (mutual exclusivity)
    if (ttsModeRef.current === 'word' || flow.state.playing) {
      flow.pause();
    }

    const currentLineText = (text.lines[flow.state.lineIndex] as any)?.[lang] as string | undefined;
    if (!currentLineText) return;

    setTtsMode('line');
    try {
      await lineTTSPlayer.playLine(currentLineText, lang);
    } finally {
      setTtsMode('off');
    }
  }, [lineTTSPlayer, ttsSupported, text.lines, flow.state.lineIndex, lang, flow]);

  // Word-by-word TTS toggle handler.
  // Ensures mutual exclusivity: stops line TTS if active.
  const handleWordTTS = useCallback(() => {
    // Stop line TTS if active (mutual exclusivity)
    if (ttsModeRef.current === 'line' && lineTTSPlayer) {
      lineTTSPlayer.stop();
      setTtsMode('off');
    }

    // Toggle word-by-word playback
    if (flow.state.playing) {
      flow.pause();
      setTtsMode('off');
    } else {
      setTtsMode('word');
      flow.start();
    }
  }, [flow, lineTTSPlayer]);

  // Global shortcuts: Cmd/Ctrl+K or '/' for search, Space for TTS
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === ' ' && !isInput && viewMode === 'reading') {
        e.preventDefault();
        handleLineTTS();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleLineTTS, viewMode]);

  // Resolve image via media mapping (per 12-line chunk)
  const currentLine = (text.lines as any)[flow.state.lineIndex] as any;
  const chapterLabel = currentLine?.chapter as string | undefined;
  const mediaSrc = (() => {
    const id = currentLine?.id;
    const m = (text.media || []) as any[];
    const hit = m.find((x) => Array.isArray(x.lines) && x.lines.includes(id));
    return hit?.src || '';
  })();

  // Preload adjacent images to smooth navigation (based on neighbor lines' media mapping)
  useEffect(() => {
    const neighborIds = [
      (text.lines as any)[Math.max(0, flow.state.lineIndex - 1)]?.id,
      (text.lines as any)[Math.min(flow.totalLines - 1, flow.state.lineIndex + 1)]?.id,
    ].filter(Boolean);
    const sources = (text.media || []).filter((m: any) => neighborIds.some((id: string) => m.lines?.includes(id))) as any[];
    sources.forEach((mm) => {
      if (!mm?.src) return;
      const img = new Image();
      img.src = mm.src;
    });
  }, [flow.state.lineIndex, flow.totalLines, text.lines, text.media]);

  // Persist legendOpen to localStorage per language
  useEffect(() => {
    try {
      localStorage.setItem(`ui:legend:${lang}`, legendOpen ? '1' : '0');
    } catch { }
  }, [legendOpen, lang]);

  // Persist practice line index to localStorage per language
  useEffect(() => {
    try {
      localStorage.setItem(`ui:practice:line:${lang}`, practiceLineIndex.toString());
    } catch { }
  }, [practiceLineIndex, lang]);

  // Persist practice difficulty to localStorage (global)
  useEffect(() => {
    try {
      localStorage.setItem('ui:practice:difficulty', practiceDifficulty);
    } catch { }
  }, [practiceDifficulty]);

  const subtitleOverride = subtitleOverrides?.[lang];
  const T = useMemo(() => {
    const map: Record<Lang, Record<string, string>> = {
      iast: {
        app_title: 'Avabodhak', app_subtitle: 'Vishnu Sahasranama',
        search: 'Search', help: 'Help', howto: 'How to use', play: 'Play', pause: 'Manual', pace: 'Pace', tips: 'Tips', footer_hint: 'Use arrow keys or swipe to navigate lines.',
        tip_play: '🔊 <strong>Text-to-Speech</strong>: <strong>Tap center</strong> or press <strong>Space</strong> to play audio for the current line. Press again to stop. <strong>Swipe left/right</strong> or use <strong>← / →</strong> arrow keys to navigate between lines.',
        tip_pace: '⏱️ <strong>Navigation</strong>: Use arrow keys, swipe gestures, or the timeline to browse through verses at your own pace.',
        tip_timeline: '🧭 <strong>Timeline</strong>: Drag to jump between lines. The line counter shows your current position.',
        tip_pronun: '🎧 Pronunciation: Toggle in settings (cog) to see character animations—nasals elongate vertically, aspirates stretch horizontally, long vowels pulse gently.',
        tip_search: '🔍 <strong>Search</strong>: Press <strong>⌘K</strong> or <strong>/</strong> to open search. Type any word or part of a verse (fuzzy match—no need for exact text). Tap a result (or press <strong>Enter</strong>) to jump to that line.',
        tip_chapters: '📚 Sections: Tap the <strong>Sections</strong> chip above the timeline (line counter) to jump straight to a section heading.',
        practice: 'Practice', practice_mode: 'Practice Mode', difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard',
        jump_to_line: 'Go to...', reveal: 'Reveal', replay_line: 'Replay Line', revealed: 'revealed', practiced: 'practiced', progress: 'Progress', exit_practice: 'Exit Practice', line: 'Line',
        practice_hint: 'Tap blanks to reveal words', practice_complete: 'Verse practiced!', practice_progress: 'Progress',
        puzzle_mode: 'Word Puzzle', puzzle_hint: 'Tap words below to arrange them in correct order', puzzle_complete: 'Puzzle Solved!',
        tap_to_arrange: 'Available Words', your_arrangement: 'Your Arrangement', try_again: 'Not quite right! Try again',
        get_hint: 'Get a hint', hint: 'Hint', reset_puzzle: 'Reset puzzle', reset: 'Reset', check: 'Check', next_puzzle: 'Next Puzzle',
        correct: 'correct', completed: 'completed', attempts: 'attempts', hints: 'hints', keyboard_shortcuts: 'Keyboard shortcuts', to_navigate: 'to navigate',
        exit_puzzle: 'Exit Word Puzzle',
        help_play_tab: 'Play Mode', help_practice_tab: 'Practice Mode', help_puzzle_tab: 'Word Puzzle',
        tip_practice_enter: '🎯 Practice Mode: Toggle using the book icon in the header.',
        tip_puzzle_enter: '🧩 Word Puzzle: Toggle using the grid icon in the header.',
        tip_puzzle_arrange: '🧩 Arrange: Tap scrambled words below to place them in order. Tap placed words to remove them.',
        tip_puzzle_hints: '💡 Hints: Each hint reveals one more word from the beginning. Maximum hints = words - 1 (up to 4).',
        tip_puzzle_reveal: '👁️ Reveal: Instantly shows the complete solution.',
        tip_puzzle_replay: '🔁 Replay: After solving, tap "Replay" to try again.',
        tip_puzzle_confetti: '🎉 Confetti: Solve on first correct attempt for a celebration!',
        tip_puzzle_navigate: '🧭 Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures between puzzles.',
        tip_practice_hints: '💡 Hints: Words show starting letters progressively as you tap them.',
        tip_practice_reveal: '👁️ Progressive Reveal: Tap masked words multiple times to reveal letters step-by-step. Use the "Reveal" button to instantly complete the entire line.',
        tip_practice_replay: '🔁 Replay: After completing a line, tap "Replay Line" to practice it again.',
        tip_practice_navigate: '🧭 Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures. First/Last buttons jump to beginning/end. Home/End keys work too. Chapter lines are auto-skipped.',
        tip_practice_progress: '📈 Progress: Colored dots below show completed lines (green) and current position (blue). The counter shows total lines practiced.',
        tip_practice_jump: '⏩ Jump to Line: Use the search box to quickly navigate to any line number.',
        tip_practice_exit: '⏹️ Exit Practice: Use the "Exit Practice" button in the header to return to reading mode.',
        tip_practice_search: '🔍 Search (Practice): Press <strong>⌘K</strong> or <strong>/</strong> to search and jump to any line in Practice Mode.',
        chapters_title: 'Sections',
        chapters_hint: 'Tap a section to jump; playback stays in Manual.',
        close: 'Close'
      },
      deva: {
        app_title: 'अवबोधक', app_subtitle: 'विष्णु सहस्रनाम',
        search: 'खोजें', help: 'सहायता', howto: 'कैसे उपयोग करें', play: 'चलाएँ', pause: 'मैन्युअल', pace: 'गति', tips: 'सुझाव', footer_hint: 'पंक्तियों में जाने के लिए तीर कुंजी या स्वाइप करें।',
        tip_play: '🔊 <strong>टेक्स्ट-टू-स्पीच</strong>: <strong>केंद्र टैप करें</strong> या <strong>Space</strong> दबाएँ वर्तमान पंक्ति के लिए ऑडियो चलाने हेतु। रोकने के लिए फिर से दबाएँ। <strong>बाएँ/दाएँ स्वाइप</strong> या <strong>← / →</strong> तीर कुंजी से पंक्तियों के बीच जाएँ।',
        tip_pace: '⏱️ <strong>नेविगेशन</strong>: तीर कुंजी, स्वाइप जेस्चर, या टाइमलाइन का उपयोग करके अपनी गति से श्लोकों में जाएँ।',
        tip_timeline: '🧭 <strong>टाइमलाइन</strong>: खींचकर पंक्तियों पर जाएँ। लाइन काउंटर आपकी वर्तमान स्थिति दिखाता है।',
        tip_pronun: '🎧 उच्चारण: सेटिंग्स (गियर) में <strong>उच्चारण</strong> सक्षम करें—अनुस्वार ऊर्ध्वाधर, विसर्ग क्षैतिज, दीर्घ स्वर धीरे स्पंदित।',
        tip_search: '🔍 खोज: <strong>⌘K</strong> या <strong>/</strong> दबाकर खोज खोलें। किसी शब्द या श्लोक का अंश टाइप करें (धुंधली खोज—सटीक मिलान ज़रूरी नहीं)। परिणाम पर टैप करें या <strong>Enter</strong> दबाएँ, सीधे उसी पंक्ति पर पहुँचने के लिए।',
        tip_chapters: '📚 अध्याय: टाइमलाइन के ऊपर "अध्याय" लाइन-काउंटर चिप पर टैप करके सीधे अध्याय शीर्षक पर जाएँ।',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'कठिनाई', easy: 'आसान', medium: 'मध्यम', hard: 'कठिन',
        jump_to_line: 'जाएँ...', reveal: 'प्रकट करें', replay_line: 'लाइन रिप्ले करें', revealed: 'प्रकट', practiced: 'अभ्यास किया', progress: 'प्रगति', exit_practice: 'अभ्यास से बाहर निकलें', line: 'लाइन',
        practice_hint: 'शब्द प्रकट करने हेतु रिक्त स्थान टैप करें', practice_complete: 'श्लोक अभ्यास किया!', practice_progress: 'प्रगति',
        puzzle_mode: 'शब्द पहेली', puzzle_hint: 'शब्दों को सही क्रम में व्यवस्थित करने के लिए नीचे टैप करें', puzzle_complete: 'पहेली हल हो गई!',
        tap_to_arrange: 'उपलब्ध शब्द', your_arrangement: 'आपकी व्यवस्था', try_again: 'बिल्कुल सही नहीं! पुनः प्रयास करें',
        get_hint: 'संकेत प्राप्त करें', hint: 'संकेत', reset_puzzle: 'पहेली रीसेट करें', reset: 'रीसेट', check: 'जांचें', next_puzzle: 'अगली पहेली',
        correct: 'सही', completed: 'पूर्ण', attempts: 'प्रयास', hints: 'संकेत', keyboard_shortcuts: 'कीबोर्ड शॉर्टकट', to_navigate: 'नेविगेट करने के लिए',
        exit_puzzle: 'शब्द पहेली से बाहर निकलें',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'शब्द पहेली',
        tip_practice_enter: '🎯 हेडर में पुस्तक आइकॉन का उपयोग करके अभ्यास मोड में टॉगल करें',
        tip_practice_hints: '💡 संकेत: शब्द प्रारंभिक अक्षर दिखाते हैं—आसान (50%), मध्यम (33%), कठिन (25%)',
        tip_practice_reveal: '👁️ क्रमिक प्रकटीकरण: शब्द को कई बार टैप करें—हर टैप अधिक अक्षर प्रकट करता है। पूरी लाइन तुरंत पूरा करने के लिए "प्रकट करें" बटन का उपयोग करें',
        tip_practice_replay: '🔁 पुनरावृत्ति: लाइन पूरा करने के बाद, इसे फिर से अभ्यास करने के लिए "लाइन रिप्ले करें" टैप करें',
        tip_practice_navigate: '🧭 नेविगेट: ← → तीर कुंजी, पिछले/अगले बटन, या स्वाइप जेस्चर का उपयोग करें। पहले/अंतिम बटन शुरुआत/अंत में जाते हैं। होम/एंड कुंजी भी काम करती हैं। अध्याय पंक्तियाँ स्वतः छोड़ दी जाती हैं',
        tip_practice_progress: '📈 प्रगति: नीचे रंगीन डॉट पूर्ण लाइनें (हरा) और वर्तमान स्थिति (नीला) दिखाते हैं। काउंटर कुल अभ्यास की गई लाइनें दिखाता है',
        tip_practice_jump: '⏩ लाइन में जाएँ: किसी भी लाइन संख्या पर जल्दी नेविगेट करने के लिए सर्च बॉक्स का उपयोग करें',
        tip_practice_exit: '⏹️ अभ्यास से बाहर निकलें: रीडिंग मोड में वापस जाने के लिए हेडर में "अभ्यास से बाहर निकलें" बटन का उपयोग करें',
        tip_practice_search: '🔍 खोज: अभ्यास मोड में भी <strong>⌘K</strong> या <strong>/</strong> दबाएँ',
        tip_puzzle_enter: '🧩 हेडर में ग्रिड आइकॉन का उपयोग करके शब्द पहेली में टॉगल करें',
        tip_puzzle_arrange: '🧩 व्यवस्थित करें: नीचे दिए गए अव्यवस्थित शब्दों को टैप करके उन्हें क्रम में रखें। रखे गए शब्दों को हटाने के लिए उन्हें टैप करें',
        tip_puzzle_hints: '💡 संकेत: हर संकेत शुरुआत से एक और शब्द प्रकट करता है। अधिकतम संकेत = शब्द - 1 (अधिकतम 4)',
        tip_puzzle_reveal: '👁️ प्रकट करें: तुरंत पूरा समाधान दिखाता है',
        tip_puzzle_replay: '🔁 फिर से खेलें: हल करने के बाद, फिर से प्रयास करने के लिए "फिर से खेलें" टैप करें',
        tip_puzzle_confetti: '🎉 कॉन्फेटी: पहली सही कोशिश में हल करने पर जश्न मनाएं!',
        tip_puzzle_navigate: '🧭 नेविगेट: ← → तीर कुंजी, पिछले/अगले बटन, या पहेलियों के बीच स्वाइप जेस्चर का उपयोग करें',
        chapters_title: 'अध्याय',
        chapters_hint: 'किसी अध्याय पर टैप करके वहाँ जाएँ; प्लेबैक मैन्युअल पर ही रहता है।',
        close: 'बंद करें'
      },
      knda: {
        app_title: 'ಅವಬೋಧಕ', app_subtitle: 'ವಿಷ್ಣು ಸಹಸ್ರನಾಮ',
        search: 'ಹುಡುಕಿ', help: 'ಸಹಾಯ', howto: 'ಹೆಗೆ ಬಳಸುವುದು', play: 'ಆಡಿಸಿ', pause: 'ಹಸ್ತಚಾಲಿತ', pace: 'ವೇಗ', tips: 'ಸಲಹೆಗಳು', footer_hint: 'ಸಾಲುಗಳ ನಡುವೆ ಹೋಗಲು ಬಾಣದ ಕೀಲಿಗಳು ಅಥವಾ ಸ್ವೈಪ್ ಬಳಸಿ.',
        tip_play: '🔊 <strong>ಟೆಕ್ಸ್ಟ್-ಟು-ಸ್ಪೀಚ್</strong>: <strong>ಮಧ್ಯ ಟ್ಯಾಪ್ ಮಾಡಿ</strong> ಅಥವಾ <strong>Space</strong> ಒತ್ತಿ ಪ್ರಸ್ತುತ ಸಾಲಿಗೆ ಆಡಿಯೋ ಪ್ಲೇ ಮಾಡಲು. ನಿಲ್ಲಿಸಲು ಮತ್ತೆ ಒತ್ತಿ. <strong>ಎಡ/ಬಲ ಸ್ವೈಪ್</strong> ಅಥವಾ <strong>← / →</strong> ಬಾಣದ ಕೀಲಿಗಳಿಂದ ಸಾಲುಗಳ ನಡುವೆ ಹೋಗಿ.',
        tip_pace: '⏱️ <strong>ನ್ಯಾವಿಗೇಶನ್</strong>: ಬಾಣದ ಕೀಲಿಗಳು, ಸ್ವೈಪ್ ಜೆಸ್ಚರ್‌ಗಳು, ಅಥವಾ ಟೈಮ್‌ಲೈನ್ ಬಳಸಿ ನಿಮ್ಮ ವೇಗದಲ್ಲಿ ಶ್ಲೋಕಗಳನ್ನು ಓದಿ.',
        tip_timeline: '🧭 <strong>ಟೈಮ್‌ಲೈನ್</strong>: ಎಳೆಯುವುದರಿಂದ ಸಾಲುಗಳಿಗೆ ಜಿಗಿಯಿರಿ. ಲೈನ್ ಕೌಂಟರ್ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಾನವನ್ನು ತೋರಿಸುತ್ತದೆ.',
        tip_pronun: '🎧 ಉಚ್ಛಾರ: ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ <strong>ಉಚ್ಛಾರ</strong> ಸಕ್ರಿಯಗೊಳಿಸಿ—ಅನುಸ್ವಾರ ಲಂಬವಾಗಿ, ವಿಸರ್ಗ ಅಡ್ಡವಾಗಿ, ದೀರ್ಘ ಸ್ವರಗಳು ನಿಧಾನವಾಗಿ ಸ್ಪಂದಿಸುತ್ತವೆ.',
        tip_search: '🔍 ಹುಡುಕಿ: <strong>⌘K</strong> ಅಥವಾ <strong>/</strong> ಒತ್ತಿ ಹುಡುಕಾಟ ತೆರೆಯಲು. ಯಾವುದೇ ಪದ ಅಥವಾ ಶ್ಲೋಕದ ಭಾಗವನ್ನು ಟೈಪ್ ಮಾಡಿ (ಫಜಿ ಸರ್ಚ್—ಹುಬ್ಬುಹುಬ್ಬು ಹೊಂದಿಕೆಯಾಗಬೇಕೆಂಬ ಅವಶ್ಯಕತೆ ಇಲ್ಲ). ಫಲಿತಾಂಶದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿದರೆ (ಅಥವಾ <strong>Enter</strong> ಒತ್ತಿದರೆ) ಆ ಸಾಲಿಗೆ ನೇರವಾಗಿ ಜಿಗಿಯುತ್ತೀರಿ.',
        tip_chapters: '📚 ಅಧ್ಯಾಯಗಳು: ಟೈಮ್‌ಲೈನ್ ಮೇಲಿರುವ "ಅಧ್ಯಾಯಗಳು" ಚಿಪ್ (ಸಾಲು ಎಣಿಕೆ) ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಧ್ಯಾಯ ಶೀರ್ಷಿಕೆಗೆ ನೇರವಾಗಿ ಜಿಗಿಯಿರಿ.',
        practice: 'ಅಭ್ಯಾಸ', practice_mode: 'ಅಭ್ಯಾಸ ಮೋಡ್', difficulty: 'ಕಷ್ಟತೆ', easy: 'ಸುಲಭ', medium: 'ಮಧ್ಯಮ', hard: 'ಕಠಿಣ',
        jump_to_line: 'ಹೋಗಿ...', reveal: 'ಬಹಿರಂಗಪಡಿಸಿ', replay_line: 'ಸಾಲು ಮರುಚಲಾವಣೆ', revealed: 'ಬಹಿರಂಗಪಡಿಸಲಾಗಿದೆ', practiced: 'ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ', progress: 'ಪ್ರಗತಿ', exit_practice: 'ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ', line: 'ಸಾಲು',
        practice_hint: 'ಪದಗಳನ್ನು ತೋರಿಸಲು ಖಾಲಿ ಜಾಗ ಟ್ಯಾಪ್ ಮಾಡಿ', practice_complete: 'ಶ್ಲೋಕ ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ!', practice_progress: 'ಪ್ರಗತಿ',
        puzzle_mode: 'ಪದ ಒಗಟು', puzzle_hint: 'ಪದಗಳನ್ನು ಸರಿಯಾದ ಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಲು ಕೆಳಗೆ ಟ್ಯಾಪ್ ಮಾಡಿ', puzzle_complete: 'ಒಗಟು ಪರಿಹರಿಸಲಾಗಿದೆ!',
        tap_to_arrange: 'ಲಭ್ಯವಿರುವ ಪದಗಳು', your_arrangement: 'ನಿಮ್ಮ ಜೋಡಣೆ', try_again: 'ಸರಿಯಾಗಿಲ್ಲ! ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
        get_hint: 'ಸೂಚನೆ ಪಡೆಯಿರಿ', hint: 'ಸೂಚನೆ', reset_puzzle: 'ಒಗಟು ಮರುಹೊಂದಿಸಿ', reset: 'ಮರುಹೊಂದಿಸಿ', check: 'ಪರೀಕ್ಷಿಸಿ', next_puzzle: 'ಮುಂದಿನ ಒಗಟು',
        correct: 'ಸರಿ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ', attempts: 'ಪ್ರಯತ್ನಗಳು', hints: 'ಸೂಚನೆಗಳು', keyboard_shortcuts: 'ಕೀಬೋರ್ಡ್ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು', to_navigate: 'ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು',
        exit_puzzle: 'ಪದ ಒಗಟುದಿಂದ ನಿರ್ಗಮಿಸಿ',
        help_play_tab: 'ಪ್ಲೇ ಮೋಡ್', help_practice_tab: 'ಅಭ್ಯಾಸ ಮೋಡ್', help_puzzle_tab: 'ಪದ ಒಗಟು',
        tip_practice_enter: '🎯 ಹೆಡರ್‌ನಲ್ಲಿ ಪುಸ್ತಕ ಐಕಾನ್ ಬಳಸಿ ಅಭ್ಯಾಸ ಮೋಡ್‌ಗೆ ಟಾಗಲ್ ಮಾಡಿ',
        tip_practice_hints: '💡 ಸೂಚನೆಗಳು: ನೀವು ಟ್ಯಾಪ್ ಮಾಡುವಂತೆ ಪದಗಳು ಕ್ರಮವಾಗಿ ಪ್ರಾರಂಭದ ಅಕ್ಷರಗಳನ್ನು ತೋರಿಸುತ್ತವೆ.',
        tip_practice_reveal: '👁️ ಹಂತ ಹಂತದ ಬಹಿರಂಗಪಡಿಸುವಿಕೆ: ಪದವನ್ನು ಹಲವು ಬಾರಿ ಟ್ಯಾಪ್ ಮಾಡಿ—ಪ್ರತಿ ಟ್ಯಾಪ್ ಹೆಚ್ಚು ಅಕ್ಷರಗಳನ್ನು ತೋರಿಸುತ್ತದೆ. ಸಂಪೂರ್ಣ ಸಾಲನ್ನು ತಕ್ಷಣವೇ ಪೂರ್ಣಗೊಳಿಸಲು "ಬಹಿರಂಗಪಡಿಸಿ" ಬಟನ್ ಬಳಸಿ',
        tip_practice_replay: '🔁 ಪುನರಾವರ್ತನೆ: ಸಾಲು ಪೂರ್ಣಗೊಂಡ ನಂತರ, ಅದನ್ನು ಮತ್ತೆ ಅಭ್ಯಾಸ ಮಾಡಲು "ಸಾಲು ಮರುಚಲಾವಣೆ" ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_practice_navigate: '🧭 ನ್ಯಾವಿಗೇಟ್: ← → ಬಾಣದ ಕೀಲಿಗಳು, ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು, ಅಥವಾ ಸ್ವೈಪ್ ಜೆಸ್ಚರ್‌ಗಳನ್ನು ಬಳಸಿ. ಮೊದಲು/ಕೊನೆಯ ಬಟನ್‌ಗಳು ಆರಂಭ/ಅಂತ್ಯಕ್ಕೆ ಜಿಗಿಯುತ್ತವೆ. ಹೋಮ್/ಎಂಡ್ ಕೀಗಳೂ ಕೆಲಸ ಮಾಡುತ್ತವೆ. ಅಧ್ಯಾಯ ಸಾಲುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬಿಟ್ಟುಬಿಡಲಾಗುತ್ತದೆ',
        tip_practice_progress: '📈 ಪ್ರಗತಿ: ಕೆಳಗಿನ ಬಣ್ಣದ ಡಾಟ್‌ಗಳು ಪೂರ್ಣಗೊಂಡ ಸಾಲುಗಳನ್ನು (ಹಸಿರು) ಮತ್ತು ಪ್ರಸ್ತುತ ಸ್ಥಾನವನ್ನು (ನೀಲಿ) ತೋರಿಸುತ್ತವೆ. ಕೌಂಟರ್ ಒಟ್ಟು ಅಭ್ಯಾಸ ಮಾಡಲಾದ ಸಾಲುಗಳನ್ನು ತೋರಿಸುತ್ತದೆ',
        tip_practice_jump: '⏩ ಸಾಲಿಗೆ ಹೋಗಿ: ಯಾವುದೇ ಸಾಲು ಸಂಖ್ಯೆಗೆ ತ್ವರಿತವಾಗಿ ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು ಹುಡುಕಾಟ ಬಾಕ್ಸ್ ಬಳಸಿ',
        tip_practice_exit: '⏹️ ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ: ಓದುವ ಮೋಡ್‌ಗೆ ಮರಳಲು ಹೆಡರ್‌ನಲ್ಲಿ "ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ" ಬಟನ್ ಬಳಸಿ',
        tip_practice_search: '🔍 ಹುಡುಕಿ: ಅಭ್ಯಾಸ ಮೋಡ್‌ನಲ್ಲಿಯೂ <strong>⌘K</strong> ಅಥವಾ <strong>/</strong> ಒತ್ತಿ',
        tip_puzzle_enter: '🧩 ಹೆಡರ್‌ನಲ್ಲಿ ಗ್ರಿಡ್ ಐಕಾನ್ ಬಳಸಿ ಪದ ಒಗಟುಗೆ ಟಾಗಲ್ ಮಾಡಿ',
        tip_puzzle_arrange: '🧩 ವ್ಯವಸ್ಥೆ ಮಾಡಿ: ಕೆಳಗಿನ ಅಸ್ತವ್ಯಸ್ತ ಪದಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಅವುಗಳನ್ನು ಕ್ರಮದಲ್ಲಿ ಇರಿಸಿ. ಇರಿಸಿದ ಪದಗಳನ್ನು ತೆಗೆದುಹಾಕಲು ಅವುಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_puzzle_hints: '💡 ಸೂಚನೆಗಳು: ಪ್ರತಿ ಸೂಚನೆಯೂ ಆರಂಭದಿಂದ ಒಂದು ಹೆಚ್ಚು ಪದವನ್ನು ಬಹಿರಂಗಪಡಿಸುತ್ತದೆ. ಗರಿಷ್ಠ ಸೂಚನೆಗಳು = ಪದಗಳು - 1 (ಗರಿಷ್ಠ 4)',
        tip_puzzle_reveal: '👁️ ಬಹಿರಂಗಪಡಿಸಿ: ತತ್ಕ್ಷಣವೇ ಸಂಪೂರ್ಣ ಪರಿಹಾರವನ್ನು ತೋರಿಸುತ್ತದೆ',
        tip_puzzle_replay: '🔁 ಮರುಚಲಾವಣೆ: ಪರಿಹರಿಸಿದ ನಂತರ, ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು "ಮರುಚಲಾವಣೆ" ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_puzzle_confetti: '🎉 ಕಾನ್ಫೆಟ್ಟಿ: ಮೊದಲ ಸರಿಯಾದ ಪ್ರಯತ್ನದಲ್ಲಿ ಪರಿಹರಿಸಿ ಆಚರಣೆಗೆ!',
        tip_puzzle_navigate: '🧭 ನ್ಯಾವಿಗೇಟ್: ← → ಬಾಣದ ಕೀಲಿಗಳು, ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು, ಅಥವಾ ಒಗಟುಗಳ ನಡುವೆ ಸ್ವೈಪ್ ಜೆಸ್ಚರ್‌ಗಳನ್ನು ಬಳಸಿ',
        chapters_title: 'ಅಧ್ಯಾಯಗಳು',
        chapters_hint: 'ಅಧ್ಯಾಯದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಲ್ಲಿಗೆ ಜಿಗಿಯಿರಿ; ಪ್ಲೇಬ್ಯಾಕ್ ಹಸ್ತಚಾಲಿತದಲ್ಲೇ ಇರುತ್ತದೆ.',
        close: 'ಮುಚ್ಚಿ'
      },
      tel: {
        app_title: 'అవబోధక', app_subtitle: 'విష్ణు సహస్రనామ',
        search: 'వెతకండి', help: 'సహాయం', howto: 'ఎలా వాడాలి', play: 'ప్లే', pause: 'మాన్యువల్', pace: 'వేగం', tips: 'సూచనలు', footer_hint: 'పంక్తుల నడువే హోగలు బాణ కీలు లేదా స్వైప్ బళసండి.',
        tip_play: '🔊 <strong>టెక్స్ట్-టు-స్పీచ్</strong>: <strong>మధ్యలో ట్యాప్ చేయండి</strong> లేదా <strong>Space</strong> నొక్కండి ప్రస్తుత లైన్‌కు ఆడియో ప్లే చేయడానికి. నిలిపివేయడానికి మళ్లీ నొక్కండి. <strong>ఎడమ/కుడి స్వైప్</strong> లేదా <strong>← / →</strong> బాణ కీలుతో పంక్తుల నడువే హోగండి.',
        tip_pace: '⏱️ <strong>నావిగేట్</strong>: బాణ కీలు, స్వైప్ జెస్చర్‌లు, లేదా టైమ్‌లైన్ బళసి మీ వేగంలో శ్లోకాలను చదవండి.',
        tip_timeline: '🧭 <strong>టైమ్‌లైన్</strong>: లాగి పంక్తులకు జంప్ చేయండి. లైన్ కౌంటర్ మీ ప్రస్తుత స్థానాన్ని చూపిస్తుంది.',
        tip_pronun: '🎧 ఉచ్చారణ: సెట్టింగ్స్‌లో <strong>ఉచ్చారణ</strong> ఆన్ చేయండి—అనుస్వారం నిలువుగా, విసర్గం అడ్డంగా, దీర్ఘ స్వరాలు నెమ్మదిగా స్పందిస్తాయి.',
        tip_search: '🔍 సెర్చ్: <strong>⌘K</strong> లేదా <strong>/</strong> నొక్కి సెర్చ్ తెరచండి. ఏ పదం అయినా లేదా శ్లోకంలోని భాగాన్ని టైప్ చేయండి (ఫజీ సెర్చ్—పూర్తి మ్యాచ్ అవసరం లేదు). ఫలితంపై ట్యాప్ చేస్తే (లేదా <strong>Enter</strong> నొక్కితే) ఆ లైన్‌కే నేరుగా వెళ్తారు.',
        tip_chapters: '📚 అధ్యాయాలు: టైమ్‌లైన్ పై ఉన్న "అధ్యాయాలు" చిప్ (లైన్ కౌంటర్) పై ట్యాప్ చేసి నేరుగా అధ్యాయ ప్రారంభానికి వెళ్లండి.',
        practice: 'అభ్యాసం', practice_mode: 'అభ్యాస మోడ్', difficulty: 'కష్టం', easy: 'సులభం', medium: 'మధ్యస్థ', hard: 'కఠినం',
        jump_to_line: 'వెళ్లు...', reveal: 'వెల్లడించు', replay_line: 'లైన్ రీప్లే', revealed: 'వెల్లడించబడింది', practiced: 'అభ్యసించబడింది', progress: 'పురోగతి', exit_practice: 'అభ్యాసం నుండి నిష్క్రమించు', line: 'లైన్',
        practice_hint: 'పదాలను చూపించడానికి ఖాళీలను ట్యాప్ చేయండి', practice_complete: 'శ్లోకం అభ్యసించబడింది!', practice_progress: 'పురోగతి',
        puzzle_mode: 'పజిల్ మోడ్', puzzle_hint: 'పదాలను సరైన క్రమంలో అమర్చడానికి క్రింద ట్యాప్ చేయండి', puzzle_complete: 'పజిల్ పరిష్కరించబడింది!',
        tap_to_arrange: 'అందుబాటులో ఉన్న పదాలు', your_arrangement: 'మీ అమరిక', try_again: 'సరిగ్గా లేదు! మళ్లీ ప్రయత్నించండి',
        get_hint: 'సూచన పొందండి', hint: 'సూచన', reset_puzzle: 'పజిల్ రీసెట్ చేయండి', reset: 'రీసెట్', check: 'తనిఖీ చేయండి', next_puzzle: 'తదుపరి పజిల్',
        correct: 'సరైనది', completed: 'పూర్తయింది', attempts: 'ప్రయత్నాలు', hints: 'సూచనలు', keyboard_shortcuts: 'కీబోర్డ్ షార్ట్‌కట్‌లు', to_navigate: 'నావిగేట్ చేయడానికి',
        help_play_tab: 'ప్లే మోడ్', help_practice_tab: 'అభ్యాస మోడ్', help_puzzle_tab: 'పజిల్ మోడ్',
        tip_practice_enter: '🎯 హెడర్‌లో బుక్ ఐకాన్‌ను ఉపయోగించి అభ్యాస మోడ్‌కు టాగుల్ చేయండి',
        tip_practice_hints: '💡 సూచనలు: పదాలు ప్రారంభ అక్షరాలను చూపిస్తాయి—సులభం (50%), మధ్యస్థ (33%), కఠినం (25%)',
        tip_practice_reveal: '👁️ క్రమంగా బహిర్గతం: పదాన్ని పలు సార్లు ట్యాప్ చేయండి—ప్రతి ట్యాప్ మరిన్ని అక్షరాలను చూపిస్తుంది. మొత్తం లైన్‌ను వెంటనే పూర్తి చేయడానికి "వెల్లడించు" బటన్‌ను ఉపయోగించండి',
        tip_practice_replay: '🔁 పునరావృతం: లైన్ పూర్తైన తర్వాత, దాన్ని మళ్లీ అభ్యసించడానికి "లైన్ రీప్లే" ట్యాప్ చేయండి',
        tip_practice_navigate: '🧭 నావిగేట్: ← → బాణ కీలు, మునుపటి/తర్వాత బటన్‌లు, లేదా స్వైప్ జెస్చర్‌లను ఉపయోగించండి. మొదటి/చివరి బటన్‌లు ప్రారంభం/ముగింపుకు వెళుతాయి. హోమ్/ఎండ్ కీలు కూడా పని చేస్తాయి. అధ్యాయ పంక్తులు స్వయంచాలకంగా దాటవేయబడతాయి',
        tip_practice_progress: '📈 పురోగతి: క్రింద రంగు చుక్కలు పూర్తైన లైన్‌లను (పచ్చ) మరియు ప్రస్తుత స్థానాన్ని (నీలం) చూపిస్తాయి. కౌంటర్ మొత్తం అభ్యసించిన లైన్‌లను 보여స్తుంది',
        tip_practice_jump: '⏩ లైన్‌కు వెళ్లు: ఎంతైనా లైన్ నంబర్‌కు వేగంగా నావిగేట్ చేయడానికి సెర్చ్ బాక్స్‌ను ఉపయోగించండి',
        tip_practice_exit: '⏹️ అభ్యాసం నుండి నిష్క్రమించు: రీడింగ్ మోడ్‌కు తిరిగి వెళ్లడానికి హెడర్‌లో "అభ్యాసం నుండి నిష్క్రమించు" బటన్‌ను ఉపయోగించండి',
        tip_practice_search: '🔍 వెతకండి: అభ్యాస మోడ్‌లో కూడా <strong>⌘K</strong> లేదా <strong>/</strong> నొక్కండి',
        tip_puzzle_enter: '🧩 హెಡర్‌లో గ్రిడ్ ఐకాన్‌ను ఉపయోగించి పజిల్ మోడ్‌కు టాగుల్ చేయండి',
        tip_puzzle_arrange: '🧩 అమర్చు: క్రింద అస్తవ్యస్త పదాలను ట్యాప్ చేసి వాటిని క్రమంలో ఉంచండి. ఉంచిన పదాలను తీసివేయడానికి వాటిని ట్యాప్ చేయండి',
        tip_puzzle_hints: '💡 సూచనలు: ప్రతి సూచన ప్రారంభం నుండి ఒక పదాన్ని మరింత వెల్లడిస్తుంది. గరిష్ట సూచనలు = పదాలు - 1 (గరిష్ట 4)',
        tip_puzzle_reveal: '👁️ వెల్లడించు: వెంటనే పూర్తి పరిష్కారాన్ని చూపిస్తుంది',
        tip_puzzle_replay: '🔁 రీప్లే: పరిష్కరించిన తర్వాత, మళ్లీ ప్రయత్నించడానికి "రీప్లే" ట్యాప్ చేయండి',
        tip_puzzle_confetti: '🎉 కాన్ఫెట్టి: మొదటి సరైన ప్రయత్నంలో పరిష్కరించండి జరుపుకోండి!',
        tip_puzzle_navigate: '🧭 నావిగేట్: ← → బాణ కీలు, మునుపటి/తర్వాత బటన్‌లు, లేదా పజిల్స్ మధ్య స్వైప్ జెస్చర్‌లను ఉపయోగించండి',
        chapters_title: 'అధ్యాయాలు',
        chapters_hint: 'అధ్యాయం పై ట్యాప్ చేసి అక్కడికి జంప్ అవ్వండి; ప్లేబ్యాక్ మాన్యువల్‌లోనే ఉంటుంది.',
        close: 'మూసివేయి'
      },
      tam: {
        app_title: 'அவபோதக', app_subtitle: 'விஷ்ணு ஸஹஸ்ரநாமம்',
        search: 'தேடு', help: 'உதவி', howto: 'பயன்படுத்துவது எப்படி', play: 'இயக்கு', pause: 'கைமுறை', pace: 'வேகம்', tips: 'உதவிக்குறிப்புகள்', footer_hint: 'தொடங்க ப்ளே அழுத்தவும்; வேகத்தை விருப்பப்படி அமைக்கவும்.',
        tip_play: '▶️ இயக்கு/இடைநிறுத்து: <strong>மையத்தில் தட்டவும்</strong> அல்லது <strong>Space</strong> அழுத்தவும். சொல்-சொல்லாக செல்ல விளிம்புகளில் <strong>இரட்டை-தட்டவும்</strong>.',
        tip_pace: '⏱️ வேகம்: சொல்களின் சிக்கலுக்கு (நீளம், குறிகள்/நீட்சி, கூட்டெழுத்துகள்) ஏற்ப நேரம் மாறும். WPM ஸ்பீடோமீட்டர் ஸ்லைடரைப் பயன்படுத்தி உங்கள் மொத்த வேகத்தை அமைக்கவும்.',
        tip_timeline: '🧭 காலவரிசை: இழுத்து வரிகளைத் தாண்டிச் செல்லவும். நடப்பு சொல் மஞ்சள் நிறத்தில் சூழலுடன் வெளிப்படுத்தப்படும்.',
        tip_pronun: '🎧 உச்சாரண: அமைப்புகளில் <strong>உச்சாரண</strong> இயக்கவும்—அனுஸ்வாரம் செங்குத்தாக, விஸர்கம் கிடைமட்டமாக, நீண்ட உயிர்கள் மெதுவாக துடிக்கும்.',
        tip_search: '🔍 தேடு: <strong>⌘K</strong> அல்லது <strong>/</strong> அழுத்தி தேடல் திறக்கவும். எந்தச் சொல் அல்லது ஸ்லோகத்தின் ஒரு பகுதியையும் எழுதலாம் (ஃபஜி தேடல்—அச்சுக் கூட்டுத் துல்லியம் தேவையில்லை). முடிவைத் தட்டினால் (அல்லது <strong>Enter</strong> அழுத்தினால்) அந்த வரியிலேயே செல்லலாம்.',
        tip_chapters: '📚 அத்தியாயங்கள்: காலவரிசை மேல் உள்ள "அத்தியாயங்கள்" சிப் (வரி எண்ணிக்கை) மீது தட்டுவதன் மூலம் நேராக அத்தியாயத்தின் தொடக்கத்திற்கு செல்லலாம்.',
        practice: 'பயிற்சி', practice_mode: 'பயிற்சி முறை', difficulty: 'சிரமம்', easy: 'எளிது', medium: 'நடுத்தரம்', hard: 'கடினம்',
        jump_to_line: 'செல்லு...', reveal: 'வெளிப்படுத்து', replay_line: 'வரியை மீண்டும் இயக்கு', revealed: 'வெளிப்படுத்தப்பட்டது', practiced: 'பயிற்சி செய்யப்பட்டது', progress: 'முன்னேற்றம்', exit_practice: 'பயிற்சியில் இருந்து வெளியேறு', line: 'வரி',
        practice_hint: 'சொற்களைக் காட்ட வெற்றிடங்களைத் தட்டவும்', practice_complete: 'சொக்கம் பயிற்சி செய்யப்பட்டது!', practice_progress: 'முன்னேற்றம்',
        puzzle_mode: 'புதிர் முறை', puzzle_hint: 'சொற்களை சரியான வரிசையில் அமைக்க கீழே தட்டவும்', puzzle_complete: 'புதிர் தீர்க்கப்பட்டது!',
        tap_to_arrange: 'கிடைக்கும் சொற்கள்', your_arrangement: 'உங்கள் அமைப்பு', try_again: 'சரியல்ல! மீண்டும் முயற்சிக்கவும்',
        get_hint: 'குறிப்பு பெறு', hint: 'குறிப்பு', reset_puzzle: 'புதிரை மீட்டமை', reset: 'மீட்டமை', check: 'சரிபார்', next_puzzle: 'அடுத்த புதிர்',
        correct: 'சரி', completed: 'முடிந்தது', attempts: 'முயற்சிகள்', hints: 'குறிப்புகள்', keyboard_shortcuts: 'கீபோர்ட் குறுக்குவழிகள்', to_navigate: 'நகர்த்த',
        help_play_tab: 'ப்ளே முறை', help_practice_tab: 'பயிற்சி முறை', help_puzzle_tab: 'புதிர் முறை',
        tip_practice_enter: 'பயிற்சி முறைக்கு மாற்ற தலைப்பில் 🎯 ஐகானைப் பயன்படுத்தவும் (படிப்பு மற்றும் பயிற்சி முறைகளுக்கு இடையே மாறுகிறது)',
        tip_practice_hints: 'குறிப்புகள்: சொற்கள் தொடக்க எழுத்துக்களைக் காட்டும்—எளிது (50%), நடுத்தரம் (33%), கடினம் (25%)',
        tip_practice_reveal: 'படிப்படியாக வெளிப்படுத்தல்: சொல்லை பல முறை தட்டவும்—ஒவ்வொரு தட்டலும் மேலும் எழுத்துக்களைக் காட்டும். முழு வரியையும் உடனடியாக முடிக்க "வெளிப்படுத்து" பொத்தானைப் பயன்படுத்தவும்',
        tip_practice_replay: 'மீண்டும் செய்: வரி முடிந்ததும், அதை மீண்டும் பயிற்சி செய்ய "வரியை மீண்டும் இயக்கு" தட்டவும்',
        tip_practice_navigate: 'நகர்த்து: ← → அம்பு விசைகள், முந்தைய/அடுத்த பொத்தான்கள், அல்லது ஸ்வைப் ஜெஸ்சர்களைப் பயன்படுத்தவும். முதல்/இறுதி பொத்தான்கள் தொடக்கம்/முடிவுக்கு செல்கின்றன. ஹோம்/எண்ட் விசைகளும் வேலை செய்கின்றன. அத்தியாய வரிகள் தானாக தவிர்க்கப்படும்',
        tip_practice_progress: 'முன்னேற்றம்: கீழே உள்ள வண்ண புள்ளிகள் முடிந்த வரிகளை (பச்சை) மற்றும் தற்போதைய நிலையை (நீலம்) காட்டுகின்றன. எண்ணிக்கை மொத்த பயிற்சி செய்யப்பட்ட வரிகளைக் காட்டுகிறது',
        tip_practice_jump: 'வரிக்குச் செல்: எந்த வரி எண்ணுக்கும் விரைவாக செல்ல தேடல் பெட்டியைப் பயன்படுத்தவும்',
        tip_practice_exit: 'பயிற்சியில் இருந்து வெளியேறு: வாசிப்பு முறைக்குத் திரும்ப தலைப்பில் "பயிற்சியில் இருந்து வெளியேறு" பொத்தானைப் பயன்படுத்தவும்',
        tip_practice_search: 'தேடு: பயிற்சி முறையிலும் <strong>⌘K</strong> அல்லது <strong>/</strong> அழுத்தவும்',
        tip_puzzle_enter: 'புதிர் முறைக்கு மாற்ற தலைப்பில் கிரிட் ஐகானைப் பயன்படுத்தவும்',
        tip_puzzle_arrange: 'அமை: கீழே குழப்பமான சொற்களைத் தட்டி அவற்றை வரிசையில் வைக்கவும். வைக்கப்பட்ட சொற்களை அகற்ற அவற்றைத் தட்டவும்',
        tip_puzzle_hints: 'குறிப்புகள்: ஒவ்வொரு குறிப்பும் தொடக்கத்திலிருந்து ஒரு சொல்லை மேலும் வெளிப்படுத்தும். அதிகபட்ச குறிப்புகள் = சொற்கள் - 1 (அதிகபட்ச 4)',
        tip_puzzle_reveal: 'வெளிப்படுத்து: உடனடியாக முழு தீர்வையும் காட்டுகிறது',
        tip_puzzle_replay: 'மீண்டும் செய்: தீர்த்த பிறகு, மீண்டும் முயற்சிக்க "மீண்டும் செய்" தட்டவும்',
        tip_puzzle_confetti: 'கான்பெட்டி: முதல் சரியான முயற்சியில் தீர்க்க விழா எடுங்கள்!',
        tip_puzzle_navigate: 'நகர்த்து: ← → அம்பு விசைகள், முந்தைய/அடுத்த பொத்தான்கள், அல்லது புதிர்களுக்கு இடையே ஸ்வைப் ஜெஸ்சர்களைப் பயன்படுத்தவும்',
        chapters_title: 'அத்தியாயங்கள்',
        chapters_hint: 'ஒரு அத்தியாயத்தைத் தட்டினால் அந்த இடத்திற்குச் செல்கிறது; பிளே மானுவல் நிலையிலேயே இருக்கும்.',
        close: 'மூடு'
      },
      guj: {
        app_title: 'અવબોધક', app_subtitle: 'વિષ્ણુ સહસ્રનામ',
        search: 'શોધો', help: 'મદદ', howto: 'કેવી રીતે વાપરવું', play: 'ચાલુ', pause: 'મેન્યુઅલ', pace: 'ગતિ', tips: 'સૂચનો', footer_hint: 'શરૂ કરવા પ્લે દબાવો; ગતિને પસંદ મુજબ સમાયોજિત કરો.',
        tip_play: '▶️ ચાલુ/વિરામ: <strong>મધ્યમાં ટૅપ કરો</strong> અથવા <strong>Space</strong> દબાવો. શબ્દ-દર-શબ્દ જવા કિનારાઓ પર <strong>ડબલ-ટૅપ</strong> કરો.',
        tip_pace: '⏱️ ગતિ: સમય શબ્દની જટિલતા (લંબાઈ, ચિહ્નો/માત્રા, સંયુક્ત અક્ષર) મુજબ બદલાય છે. WPM સ્પીડોમીટર સ્લાઇડરથી તમારી કુલ ગતિ સેટ કરો.',
        tip_timeline: '🧭 સમયરેખા: ખેંચીને પંક્તિઓ પર જાઓ. વર્તમાન શબ્દ પીળા રંગમાં સંદર્ભ સાથે હાઇલાઇટ થાય છે.',
        tip_pronun: '🎧 ઉચ્ચાર: સેટિંગ્સમાં <strong>ઉચ્ચાર</strong> સક્રિય કરો—અનુસ્વાર ઊભી રીતે, વિસર્ગ આડી રીતે, લાંબા સ્વરો ધીમે ધબકે છે.',
        tip_search: '🔍 શોધો: <strong>⌘K</strong> અથવા <strong>/</strong> દબાવી શોધ વિંડો ખોલો. કોઈપણ શબ્દ અથવા શ્લોકનો ભાગ લખો (ફઝી સર્ચ—સચોટ મેળાપ જરૂરી નથી). પરિણામ પર ટૅપ કરો અથવા <strong>Enter</strong> દબાવો, સીધા તે લાઇન પર જવા માટે.',
        tip_chapters: '📚 અધ્યાય: ટાઇમલાઇન ઉપરના "અધ્યાય" ચિપ (લાઇન કાઉન્ટર) પર ટૅપ કરીને સીધું અધ્યાય શીર્ષક પર જાઓ.',
        practice: 'પ્રેક્ટિસ', practice_mode: 'પ્રેક્ટિસ મોડ', difficulty: 'મુશ્કેલી', easy: 'સરળ', medium: 'મધ્યમ', hard: 'મુશ્કેલ',
        jump_to_line: 'જાઓ...', reveal: 'દેખાડો', replay_line: 'લાઈન રિપ્લે કરો', revealed: 'દેખાડ્યું', practiced: 'અભ્યાસ કર્યો', progress: 'પ્રગતિ', exit_practice: 'પ્રેક્ટિસમાંથી બહાર નીકળો', line: 'લાઈન',
        practice_hint: 'શબ્દો દર્શાવવા માટે ખાલી જગ્યાઓ ટૅપ કરો', practice_complete: 'શ્લોક અભ્યાસ કર્યો!', practice_progress: 'પ્રગતિ',
        tip_practice_hints: '� ਸੰਕੇਤ: ਸ਼ਬਦ ਸ਼ੁਰੂਆਤੀ ਅੱਖਰ ਦਿਖਾਉਂਦੇ ਹਨ—ਆਸਾਨ (50%), ਮੱਧਮ (33%), ਔਖਾ (25%)',
        tip_practice_reveal: '👁️ ਧੀਰੇ ਧੀਰੇ ਖੁਲਾਸਾ: ਸ਼ਬਦ ਨੂੰ ਕਈ ਵਾਰ ਟੈਪ ਕਰੋ—ਹਰ ਟੈਪ ਵਧੇਰੇ ਅੱਖਰ ਦਿਖਾਉਂਦਾ ਹੈ। ਪੂਰੀ ਲਾਈਨ ਫੌਰਨ ਪੂਰੀ ਕਰਨ ਲਈ "ਦਿਖਾਓ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_replay: '🔁 ਦੁਹਰਾਓ: ਲਾਈਨ ਪੂਰੀ ਹੋਣ ਦੇ ਬਾਅਦ, ਇਸਨੂੰ ਦੁਬਾਰਾ ਅਭਿਆਸ ਕਰਨ ਲਈ "ਲਾਈਨ ਦੁਹਰਾਓ" ਟੈਪ ਕਰੋ',
        tip_practice_navigate: '🧭 ਨੇਵੀਗੇਟ: ← → ਤੀਰ ਕੁੰਜੀਆਂ, ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨਾਂ, ਜਾਂ ਸਵਾਈਪ ਜੈਸਚਰਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ। ਪਹਿਲਾ/ਆਖਿਰੀ ਬਟਨਾਂ ਸ਼ੁਰੂਆਤ/ਅੰਤ ਵਿੱਚ ਜਾਂਦੇ ਹਨ। ਹੋਮ/ਐਂਡ ਕੁੰਜੀਆਂ ਵੀ ਕੰਮ ਕਰਦੀਆਂ ਹਨ। ਅਧਿਆਇ ਲਾਈਨਾਂ ਆਪਣੇ ਆਪ ਛੱਡੀਆਂ ਜਾਂਦੀਆਂ ਹਨ',
        tip_practice_progress: '📈 ਤਰੱਕੀ: ਹੇਠਾਂ ਰੰਗੀਨ ਡੌਟ ਪੂਰੀਆਂ ਲਾਈਨਾਂ (ਹਰਾ) ਅਤੇ ਮੌਜੂਦਾ ਸਥਿਤੀ (ਨੀਲਾ) ਦਿਖਾਉਂਦੇ ਹਨ। ਕਾਊਂਟਰ ਕੁੱਲ ਅਭਿਆਸ ਕੀਤੀਆਂ ਲਾਈਨਾਂ ਦਿਖਾਉਂਦਾ ਹੈ',
        tip_practice_jump: '⏩ ਲਾਈਨ ਵਿੱਚ ਜਾਓ: ਕਿਸੇ ਵੀ ਲਾਈਨ ਨੰਬਰ ਤੇ ਤੇਜ਼ੀ ਨਾਲ ਨੇਵੀਗੇਟ ਕਰਨ ਲਈ ਸਰਚ ਬਾਕਸ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_exit: '⏹️ ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ: ਰੀਡਿੰਗ ਮੋਡ ਵਿੱਚ ਵਾਪਸ ਜਾਣ ਲਈ ਹੇਡਰ ਵਿੱਚ "ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_search: '🔍 ਖੋਜੋ: ਅਭਿਆਸ ਮੋਡ ਵਿੱਚ ਵੀ <strong>⌘K</strong> ਜਾਂ <strong>/</strong> ਦਬਾਓ',
        tip_puzzle_enter: '🧩 Toggle to Word Puzzle using the grid icon in the header',
        tip_puzzle_arrange: '🧩 Arrange: Tap scrambled words below to place them in order. Tap placed words to remove them',
        tip_puzzle_hints: '💡 Hints: Each hint reveals one more word from the beginning. Maximum hints = words - 1 (up to 4)',
        tip_puzzle_reveal: '👁️ Reveal: Instantly shows the complete solution',
        tip_puzzle_replay: '🔁 Replay: After solving, tap "Replay" to try again',
        tip_puzzle_confetti: '🎉 Confetti: Solve on first correct attempt for a celebration!',
        tip_puzzle_navigate: '🧭 Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures between puzzles'
      },
      pan: {
        app_title: 'ਅਵਬੋਧਕ', app_subtitle: 'ਵਿਸ਼੍ਣੁ ਸਹਸ੍ਰ ਨਾਮ',
        search: 'ਖੋਜ', help: 'ਮਦਦ', howto: 'ਕਿਵੇਂ ਵਰਤਣਾ ਹੈ', play: 'ਚਲਾਓ', pause: 'ਮੈਨੁਅਲ', pace: 'ਗਤੀ', tips: 'ਸੁਝਾਅ', footer_hint: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਪਲੇ ਦਬਾਓ; ਗਤੀ ਆਪਣੀ ਪਸੰਦ ਅਨੁਸਾਰ ਸੈੱਟ ਕਰੋ।',
        tip_play: '▶️ ਚਲਾਓ/ਰੋਕੋ: <strong>ਕੇਂਦਰ ’ਤੇ ਟੈਪ ਕਰੋ</strong> ਜਾਂ <strong>Space</strong> ਦਬਾਓ। ਸ਼ਬਦ-ਸ਼ਬਦ ਜਾਣ ਲਈ ਕਿਨਾਰਿਆਂ ’ਤੇ <strong>ਡਬਲ-ਟੈਪ</strong> ਕਰੋ।',
        tip_pace: '⏱️ ਗਤੀ: ਸਮਾਂ ਸ਼ਬਦ ਦੀ ਜਟਿਲਤਾ (ਲੰਬਾਈ, ਮਾਤਰਾ/ਚਿੰਨ੍ਹ, ਸੰਯੁਕਤ ਅੱਖਰ) ਮੁਤਾਬਕ ਬਦਲਦਾ ਹੈ। WPM ਸਪੀਡੋਮੀਟਰ ਸਲਾਈਡਰ ਨਾਲ ਆਪਣੀ ਕੁੱਲ ਗਤੀ ਸੈੱਟ ਕਰੋ।',
        tip_timeline: '🧭 ਟਾਈਮਲਾਈਨ: ਡ੍ਰੈਗ ਕਰਕੇ ਲਾਈਨਾਂ ’ਤੇ ਜਾਓ। ਮੌਜੂਦਾ ਸ਼ਬਦ ਪੀਲੇ ਰੰਗ ਵਿੱਚ ਸੰਦਰਭ ਸਮੇਤ ਹਾਈਲਾਈਟ ਹੁੰਦਾ ਹੈ।',
        tip_pronun: '🎧 ਉਚਾਰਣ: ਸੈਟਿੰਗਜ਼ (ਗਿਅਰ) ਵਿੱਚ <strong>ਉਚਾਰਣ</strong> ਓਨ ਕਰੋ—ਅਨੁਸਵਾਰ ਖੜਾ, ਵਿਸਰਗ ਹਰੇਕ, ਲੰਬੇ ਸਵਰ ਹੌਲੀ ਧੜਕਦੇ ਹਨ।',
        tip_search: '🔍 ਖੋਜ: <strong>⌘K</strong> ਜਾਂ <strong>/</strong> ਦਬਾ ਕੇ ਖੋਜ ਖੋਲ੍ਹੋ। ਕੋਈ ਵੀ ਸ਼ਬਦ ਜਾਂ ਸ਼ਲੋਕ ਦਾ ਹਿੱਸਾ ਲਿਖੋ (ਫਜ਼ੀ ਸਰਚ—ਬਿਲਕੁਲ ਸਹੀ ਮਿਲਾਪ ਲਾਜ਼ਮੀ ਨਹੀਂ)। ਨਤੀਜੇ ’ਤੇ ਟੈਪ ਕਰੋ ਜਾਂ <strong>Enter</strong> ਦਬਾਓ, ਉਸੇ ਲਾਈਨ ’ਤੇ ਸਿਧੇ ਜਾਣ ਲਈ।',
        tip_chapters: '📚 ਅਧਿਆਇ: ਟਾਈਮਲਾਈਨ ਤੋਂ ਉੱਪਰ ਵਾਲੇ "ਅਧਿਆਇ" ਚਿਪ (ਲਾਈਨ ਗਿਣਤੀ) ’ਤੇ ਟੈਪ ਕਰਕੇ ਸਿੱਧੇ ਅਧਿਆਇ ਸਿਰਲੇਖ ’ਤੇ ਜਾਓ।',
        practice: 'ਅਭਿਆਸ', practice_mode: 'ਅਭਿਆਸ ਮੋਡ', difficulty: 'ਮੁਸ਼ਕਲ', easy: 'ਆਸਾਨ', medium: 'ਮੱਧਮ', hard: 'ਔਖਾ',
        jump_to_line: 'ਜਾਓ...', reveal: 'ਦਿਖਾਓ', replay_line: 'ਲਾਈਨ ਦੁਹਰਾਓ', revealed: 'ਦਿਖਾਇਆ ਗਿਆ', practiced: 'ਅਭਿਆਸ ਕੀਤਾ', progress: 'ਤਰੱਕੀ', exit_practice: 'ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ', line: 'ਲਾਈਨ',
        practice_hint: 'ਸ਼ਬਦ ਦਿਖਾਉਣ ਲਈ ਖਾਲੀ ਟੈਪ ਕਰੋ', practice_complete: 'ਸ਼ਲੋਕ ਅਭਿਆਸ ਕੀਤਾ!', practice_progress: 'ਤਰੱਕੀ',
        help_play_tab: 'ਪਲੇ ਮੋਡ', help_practice_tab: 'ਅਭਿਆਸ ਮੋਡ', help_puzzle_tab: 'ਵਰਡ ਪਜ਼ਲ',
        tip_practice_enter: '🎯 ਹੇਡਰ ਵਿੱਚ ਆਈਕਾਨ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਅਭਿਆਸ ਮੋਡ ਵਿੱਚ ਟੌਗਲ ਕਰੋ (ਰੀਡਿੰਗ ਅਤੇ ਅਭਿਆਸ ਮੋਡ ਵਿਚਕਾਰ ਸਵਿੱਚ ਕਰਦਾ ਹੈ)',
        tip_practice_hints: '💡 ਸੰਕੇਤ: ਸ਼ਬਦ ਸ਼ੁਰੂਆਤੀ ਅੱਖਰ ਦਿਖਾਉਂਦੇ ਹਨ—ਆਸਾਨ (50%), ਮੱਧਮ (33%), ਔਖਾ (25%)',
        tip_practice_reveal: '👁️ ਧੀਰੇ ਧੀਰੇ ਖੁਲਾਸਾ: ਸ਼ਬਦ ਨੂੰ ਕਈ ਵਾਰ ਟੈਪ ਕਰੋ—ਹਰ ਟੈਪ ਵਧੇਰੇ ਅੱਖਰ ਦਿਖਾਉਂਦਾ ਹੈ। ਪੂਰੀ ਲਾਈਨ ਫੌਰਨ ਪੂਰੀ ਕਰਨ ਲਈ "ਦਿਖਾਓ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_replay: '🔁 ਦੁਹਰਾਓ: ਲਾਈਨ ਪੂਰੀ ਹੋਣ ਦੇ ਬਾਅਦ, ਇਸਨੂੰ ਦੁਬਾਰਾ ਅਭਿਆਸ ਕਰਨ ਲਈ "ਲਾਈਨ ਦੁਹਰਾਓ" ਟੈਪ ਕਰੋ',
        tip_practice_navigate: '🧭 ਨੇਵੀਗੇਟ: ← → ਤੀਰ ਕੁੰਜੀਆਂ, ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨਾਂ, ਜਾਂ ਸਵਾਈਪ ਜੈਸਚਰਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ। ਪਹਿਲਾ/ਆਖਿਰੀ ਬਟਨਾਂ ਸ਼ੁਰੂਆਤ/ਅੰਤ ਵਿੱਚ ਜਾਂਦੇ ਹਨ। ਹੋਮ/ਐਂਡ ਕੁੰਜੀਆਂ ਵੀ ਕੰਮ ਕਰਦੀਆਂ ਹਨ। ਅਧਿਆਇ ਲਾਈਨਾਂ ਆਪਣੇ ਆਪ ਛੱਡੀਆਂ ਜਾਂਦੀਆਂ ਹਨ',
        tip_practice_progress: '📈 ਤਰੱਕੀ: ਹੇਠਾਂ ਰੰਗੀਨ ਡੌਟ ਪੂਰੀਆਂ ਲਾਈਨਾਂ (ਹਰਾ) ਅਤੇ ਮੌਜੂਦਾ ਸਥਿਤੀ (ਨੀਲਾ) ਦਿਖਾਉਂਦੇ ਹਨ। ਕਾਊਂਟਰ ਕੁੱਲ ਅਭਿਆਸ ਕੀਤੀਆਂ ਲਾਈਨਾਂ ਦਿਖਾਉਂਦਾ ਹੈ',
        tip_practice_jump: '⏩ ਲਾਈਨ ਵਿੱਚ ਜਾਓ: ਕਿਸੇ ਵੀ ਲਾਈਨ ਨੰਬਰ ਤੇ ਤੇਜ਼ੀ ਨਾਲ ਨੇਵੀਗੇਟ ਕਰਨ ਲਈ ਸਰਚ ਬਾਕਸ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_exit: '⏹️ ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ: ਰੀਡਿੰਗ ਮੋਡ ਵਿੱਚ ਵਾਪਸ ਜਾਣ ਲਈ ਹੇਡਰ ਵਿੱਚ "ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_search: '🔍 ਖੋਜੋ: ਅਭਿਆਸ ਮੋਡ ਵਿੱਚ ਵੀ <strong>⌘K</strong> ਜਾਂ <strong>/</strong> ਦਬਾਓ',
        tip_puzzle_enter: '🧩 ਹੇਡਰ ਵਿੱਚ ਗ੍ਰਿਡ ਆਈਕਾਨ ਦੀ ਵਰਤੋਂ ਕਰਕੇ ਵਰਡ ਪਜ਼ਲ ਵਿੱਚ ਟੌਗਲ ਕਰੋ',
        tip_puzzle_arrange: '🧩 ਗੋਢੋ: ਹੇਠਾਂ ਦਿੱਤੇ ਗੁਲਮਲ ਸ਼ਬਦਾਂ ’ਤੇ ਟੈਪ ਕਰੋ ਤਾਂ ਜੋ ਉਹਨਾਂ ਨੂੰ ਸਹੀ ਕ੍ਰਮ ਵਿੱਚ ਰੱਖ ਸਕੋ। ਰੱਖੇ ਸ਼ਬਦਾਂ ਨੂੰ ਹਟਾਉਣ ਲਈ ਉਨ੍ਹਾਂ ’ਤੇ ਟੈਪ ਕਰੋ',
        tip_puzzle_hints: '💡 ਸੰਕੇਤ: ਹਰ ਸੰਕੇਤ ਸ਼ੁਰੂ ਤੋਂ ਇੱਕ ਹੋਰ ਸ਼ਬਦ ਦਿਖਾਉਂਦਾ ਹੈ। ਵੱਧ ਤੋਂ ਵੱਧ ਸੰਕੇਤ = ਸ਼ਬਦ - 1 (ਜ਼ਿਆਦਾ ਤੋਂ ਜ਼ਿਆਦਾ 4)',
        tip_puzzle_reveal: '👁️ ਦਿਖਾਓ: ਤੁਰੰਤ ਪੂਰਾ ਹੱਲ ਦਿਖਾਉਂਦਾ ਹੈ',
        tip_puzzle_replay: '🔁 ਦੁਹਰਾਓ: ਹੱਲ ਕਰਨ ਤੋਂ ਬਾਅਦ, ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰਨ ਲਈ "ਰੀਪਲੇ" ਟੈਪ ਕਰੋ',
        tip_puzzle_confetti: '🎉 ਕਨਫੈਟੀ: ਪਹਿਲੇ ਸਹੀ ਯਤਨ ’ਤੇ ਹੱਲ ਕਰੋ ਅਤੇ ਜਸ਼ਨ ਮਨਾਓ!',
        tip_puzzle_navigate: '🧭 ਨੇਵੀਗੇਟ: ← → ਤੀਰ ਕੁੰਜੀਆਂ, ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨਾਂ, ਜਾਂ ਪਜ਼ਲਾਂ ਦੇ ਵਿਚਕਾਰ ਸਵਾਈਪ ਜੈਸਚਰਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        chapters_title: 'ਅਧਿਆਇ',
        chapters_hint: 'ਅਧਿਆਇ ’ਤੇ ਟੈਪ ਕਰਕੇ ਉੱਥੇ ਜਾਓ; ਪਲੇਬੈਕ ਮੈਨੁਅਲ ਸਥਿਤੀ ਵਿੱਚ ਹੀ ਰਹਿੰਦਾ ਹੈ।',
        close: 'ਬੰਦ ਕਰੋ'
      },
      mr: {
        app_title: 'अवबोधक', app_subtitle: 'विष्णु सहस्रनाम',
        search: 'शोधा', help: 'मदत', howto: 'कसे वापरायचे', play: 'प्ले', pause: 'मॅन्युअल', pace: 'गती', tips: 'सूचना', footer_hint: 'सुरू करण्यासाठी प्ले दाबा; गती समायोजित करा.',
        tip_play: 'चालू/थांबा: टाइमलाइनजवळील नियंत्रण वापरा किंवा Space दाबा.',
        tip_pace: 'गती: शब्दाच्या गुंतागुंतीनुसार वेळ अनुकूलित होतो.',
        tip_timeline: 'टाइमलाइन: ओढून ओळींवर जा.',
        tip_details: 'तपशील: मुख्य ओळीखालील बटन वापरा.',
        tip_pronun: 'उच्चारण: स्पीकर आयकॉन वापरा.',
        tip_search: 'शोध: ⌘K किंवा /; जाण्यासाठी Enter.',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'अडचण', easy: 'सोपे', medium: 'मध्यम', hard: 'कठीण',
        jump_to_line: 'जा...', reveal: 'दाखवा', replay_line: 'ओळ पुन्हा चालू करा', revealed: 'दाखवले', practiced: 'अभ्यास केला', progress: 'प्रगती', exit_practice: 'अभ्यासातून बाहेर पडा', line: 'ओळ',
        practice_hint: 'शब्द दाखवण्यासाठी रिक्त ठिकाणे टॅप करा', practice_complete: 'श्लोक सराव केला!', practice_progress: 'प्रगती',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'वर्ड पझल',
        tip_practice_enter: 'हेडरमध्ये 🎯 आयकॉन वापरून अभ्यास मोडमध्ये टॉगल करा (वाचन आणि अभ्यास मोडमध्ये स्विच करते)',
        tip_practice_hints: 'सूचना: शब्द सुरुवातीचे अक्षरे दाखवतात—सोपे (50%), मध्यम (33%), कठीण (25%)',
        tip_practice_reveal: 'क्रमशः प्रकटीकरण: शब्द अनेकदा टॅप करा—प्रत्येक टॅप अधिक अक्षरे प्रकट करतो. संपूर्ण ओळ त्वरित पूर्ण करण्यासाठी "दाखवा" बटन वापरा',
        tip_practice_replay: 'पुन्हा चालू करा: ओळ पूर्ण झाल्यानंतर, ती पुन्हा अभ्यास करण्यासाठी "ओळ पुन्हा चालू करा" टॅप करा',
        tip_practice_navigate: 'नॅव्हिगेट: ← → बाण की, मागील/पुढील बटणे, किंवा स्वाइप जेश्चर वापरा. पहिली/शेवटची बटणे सुरुवात/शेवटी जातात. होम/एंड की देखील कार्य करतात. अध्याय ओळी आपोआप वगळल्या जातात',
        tip_practice_progress: 'प्रगती: खाली रंगीत डॉट पूर्ण झालेल्या ओळी (हिरवा) आणि सद्यस्थिती (निळा) दाखवतात. काउंटर एकूण अभ्यास केलेल्या ओळी दाखवतो',
        tip_practice_jump: 'ओळमध्ये जा: कोणत्याही ओळ क्रमांकावर त्वरित नेव्हिगेट करण्यासाठी शोध बॉक्स वापरा',
        tip_practice_exit: 'अभ्यासातून बाहेर पडा: वाचन मोडमध्ये परत जाण्यासाठी हेडरमध्ये "अभ्यासातून बाहेर पडा" बटन वापरा',
        tip_practice_search: 'शोधा: अभ्यास मोडमध्ये देखील <strong>⌘K</strong> किंवा <strong>/</strong> दाबा',
        tip_puzzle_enter: 'Toggle to Word Puzzle using the grid icon in the header',
        tip_puzzle_arrange: 'Arrange: Tap scrambled words below to place them in order. Tap placed words to remove them',
        tip_puzzle_hints: 'Hints: Each hint reveals one more word from the beginning. Maximum hints = words - 1 (up to 4)',
        tip_puzzle_reveal: 'Reveal: Instantly shows the complete solution',
        tip_puzzle_replay: 'Replay: After solving, tap "Replay" to try again',
        tip_puzzle_confetti: 'Confetti: Solve on first correct attempt for a celebration!',
        tip_puzzle_navigate: 'Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures between puzzles'
      },
      ben: {
        app_title: 'অববোধক', app_subtitle: 'বিষ্ণু সহস্রনাম',
        search: 'খুঁজুন', help: 'সহায়তা', howto: 'কিভাবে ব্যবহার করবেন', play: 'চালান', pause: 'ম্যানুয়াল', pace: 'গতি', tips: 'টিপস', footer_hint: 'শুরু করতে প্লে চাপুন; গতি সামঞ্জস্য করুন।',
        tip_play: 'চালান/বিরতি: টাইমলাইনের কাছে নিয়ন্ত্রণ ব্যবহার করুন বা Space চাপুন।',
        tip_pace: 'গতি: শব্দের জটিলতার উপর সময় ঠিক হয়।',
        tip_timeline: 'টাইমলাইন: টেনে লাইন পরিবর্তন করুন।',
        tip_details: 'বিস্তারিত: প্রধান লাইনের নিচের বোতাম ব্যবহার করুন।',
        tip_pronun: 'উচ্চারণ: স্পিকার আইকন ব্যবহার করুন।',
        tip_search: 'খোঁজ: ⌘K বা /; যেতে Enter।',
        practice: 'অনুশীলন', practice_mode: 'অনুশীলন মোড', difficulty: 'কঠিনতা', easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন',
        jump_to_line: 'যাও...', reveal: 'দেখাও', replay_line: 'লাইন রিপ্লে করুন', revealed: 'দেখানো হয়েছে', practiced: 'অনুশীলন করা হয়েছে', progress: 'অগ্রগতি', exit_practice: 'অনুশীলন থেকে বেরোন', line: 'লাইন',
        practice_hint: 'শব্দ প্রকাশ করতে ফাঁকা জায়গা ট্যাপ করুন', practice_complete: 'শ্লোক অনুশীলন করা হয়েছে!', practice_progress: 'অগ্রগতি',
        help_play_tab: 'প্লে মোড', help_practice_tab: 'অনুশীলন মোড', help_puzzle_tab: 'শব্দ ধাঁধা',
        tip_practice_enter: 'হেডারে 🎯 আইকন ব্যবহার করে অনুশীলন মোডে টগল করুন (পড়া এবং অনুশীলন মোডের মধ্যে সুইচ করে)',
        tip_practice_hints: 'সূচনা: শব্দগুলো শুরুর অক্ষর দেখায়—সহজ (50%), মাঝারি (33%), কঠিন (25%)',
        tip_practice_reveal: 'ধাপে ধাপে প্রকাশ: শব্দটি একাধিকবার ট্যাপ করুন—প্রতিটি ট্যাপ আরও অক্ষর প্রকাশ করে। সম্পূর্ণ লাইন তাৎক্ষণিকভাবে সম্পূর্ণ করতে "দেখাও" বোতামটি ব্যবহার করুন',
        tip_practice_replay: 'পুনরায় চালান: একটি লাইন সম্পূর্ণ হওয়ার পর, এটি আবার অনুশীলন করতে "লাইন রিপ্লে করুন" ট্যাপ করুন',
        tip_practice_navigate: 'নেভিগেট: ← → তীর কী, পূর্ববর্তী/পরবর্তী বোতাম, বা সোয়াইপ অঙ্গভঙ্গি ব্যবহার করুন। প্রথম/শেষ বোতামগুলো শুরু/শেষে যায়। হোম/এন্ড কীগুলোও কাজ করে। অধ্যায় লাইনগুলো স্বয়ংক্রিয়ভাবে এড়িয়ে যায়',
        tip_practice_progress: 'অগ্রগতি: নিচের রঙিন বিন্দুগুলো সম্পূর্ণ লাইনগুলো (সবুজ) এবং বর্তমান অবস্থান (নীল) দেখায়। গণনাকারী মোট অনুশীলন করা লাইনগুলো দেখায়',
        tip_practice_jump: 'লাইনে যান: যেকোনো লাইন নম্বরে দ্রুত নেভিগেট করতে সার্চ বক্স ব্যবহার করুন',
        tip_practice_exit: 'অনুশীলন থেকে বেরোন: রিডিং মোডে ফিরে যেতে হেডারে "অনুশীলন থেকে বেরোন" বোতামটি ব্যবহার করুন',
        tip_practice_search: 'খোঁজ করুন: অনুশীলন মোডেও <strong>⌘K</strong> বা <strong>/</strong> চাপুন',
        tip_puzzle_enter: 'Toggle to Word Puzzle using the grid icon in the header',
        tip_puzzle_arrange: 'Arrange: Tap scrambled words below to place them in order. Tap placed words to remove them',
        tip_puzzle_hints: 'Hints: Each hint reveals one more word from the beginning. Maximum hints = words - 1 (up to 4)',
        tip_puzzle_reveal: 'Reveal: Instantly shows the complete solution',
        tip_puzzle_replay: 'Replay: After solving, tap "Replay" to try again',
        tip_puzzle_confetti: 'Confetti: Solve on first correct attempt for a celebration!',
        tip_puzzle_navigate: 'Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures between puzzles'
      },
      mal: {
        app_title: 'അവബോധക', app_subtitle: 'വിഷ്ണു സഹസ്രനാമം',
        search: 'തിരയുക', help: 'സഹായം', howto: 'എങ്ങനെ ഉപയോഗിക്കാം', play: 'പ്ലേ', pause: 'മാനുവൽ', pace: 'വേഗം', tips: 'ടിപ്സ്', footer_hint: 'പ്ലേ അമർത്തി ആരംഭിക്കുക; വേഗം ക്രമീകരിക്കുക.',
        tip_play: 'പ്ലേ/പോസ്: ടൈംലൈൻ സമീപമുള്ള നിയന്ത്രണങ്ങൾ ഉപയോഗിക്കുക അല്ലെങ്കിൽ Space അമർത്തുക.',
        tip_pace: 'വേഗം: വാക്കിന്റെ സങ്കീർണ്ണത അനുസരിച്ചു സമയം മാറുന്നു.',
        tip_timeline: 'ടൈംലൈൻ: വലിച്ചുനീക്കി ലൈനുകൾ മാറുക.',
        tip_details: 'വിശദാംശങ്ങൾ: പ്രധാന വരിയ്ക്ക് കീഴിലെ ബട്ടൺ ഉപയോഗിക്കുക.',
        tip_pronun: 'ഉച്ചാരണം: സ്പീക്കർ ഐക്കൺ ഉപയോഗിക്കുക.',
        tip_search: 'തിരയുക: ⌘K അല്ലെങ്കിൽ /; പോകാൻ Enter.',
        practice: 'അഭ്യസിക്കുക', practice_mode: 'അഭ്യാസ മോഡ്', difficulty: 'സങ്കീർണ്ണത', easy: 'എളുപ്പം', medium: 'ഇടത്തരം', hard: 'കഠിനം',
        jump_to_line: 'പോകൂ...', reveal: 'കാണിക്കുക', replay_line: 'ലൈൻ വീണ്ടും പ്ലേ ചെയ്യുക', revealed: 'കാണിച്ചു', practiced: 'അഭ്യസിച്ചു', progress: 'പുരോഗതി', exit_practice: 'അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക', line: 'ലൈൻ',
        practice_hint: 'വാക്കുകൾ വെളിപ്പെടുത്താൻ ശൂന്യ ഇടങ്ങൾ ടാപ്പ് ചെയ്യുക', practice_complete: 'ശ്ലോകം പരിശീലിച്ചു!', practice_progress: 'പുരോഗതി',
        help_play_tab: 'പ്ലേ മോഡ്', help_practice_tab: 'അഭ്യാസ മോഡ്', help_puzzle_tab: 'വേഡ് പസിൽ',
        tip_practice_enter: 'ഹെഡറിൽ 🎯 ഐക്കൺ ഉപയോഗിച്ച് അഭ്യാസ മോഡിലേക്ക് ടോഗിൾ ചെയ്യുക (വായനയും അഭ്യാസ മോഡും തമ്മിൽ മാറുന്നു)',
        tip_practice_hints: 'സൂചനകൾ: വാക്കുകൾ ആരംഭ അക്ഷരങ്ങൾ കാണിക്കുന്നു—എളുപ്പം (50%), ഇടത്തരം (33%), കഠിനം (25%)',
        tip_practice_reveal: 'ഘട്ടം ഘട്ടമായി വെളിപ്പെടുത്തൽ: വാക്ക് ഒന്നിലധികം തവണ ടാപ്പ് ചെയ്യുക—ഓരോ ടാപ്പും കൂടുതൽ അക്ഷരങ്ങൾ വെളിപ്പെടുത്തുന്നു. മുഴുവൻ ലൈൻ ഉടനെ പൂർത്തിയാക്കാൻ "കാണിക്കുക" ബട്ടൺ ഉപയോഗിക്കുക',
        tip_practice_replay: 'വീണ്ടും പ്ലേ ചെയ്യുക: ഒരു വരി പൂർത്തിയായതിന് ശേഷം, അത് വീണ്ടും അഭ്യസിക്കാൻ "ലൈൻ വീണ്ടും പ്ലേ ചെയ്യുക" ടാപ്പ് ചെയ്യുക',
        tip_practice_navigate: 'നാവിഗേറ്റ് ചെയ്യുക: ← → അമ്പ് കീകൾ, മുൻപുള്ള/അടുത്ത ബട്ടണുകൾ, അല്ലെങ്കിൽ സ്വൈപ്പ് ജെസ്ച്ചറുകൾ ഉപയോഗിക്കുക. ആദ്യം/അവസാനം ബട്ടണുകൾ ആരംഭം/അവസാനത്തിലേക്ക് പോകുന്നു. ഹോം/എൻഡ് കീകളും പ്രവർത്തിക്കുന്നു. അധ്യായ വരികൾ സ്വയം ഒഴിവാക്കപ്പെടുന്നു',
        tip_practice_progress: 'പുരോഗതി: താഴെ വർണ്ണ ഡോട്ടുകൾ പൂർത്തിയായ ലൈനുകൾ (പച്ച) മറിയും നിലവിലെ സ്ഥാനം (നീല) കാണിക്കുന്നു. എണ്ണക്കൂട്ട് ആകെ അഭ്യസിച്ച ലൈനുകൾ കാണിക്കുന്നു',
        tip_practice_jump: 'ലൈനിലേക്ക് പോകുക: ഏതെങ്കിലും ലൈൻ നമ്പറിലേക്ക് വേഗം നാവിഗേറ്റ് ചെയ്യാൻ തിരയൽ ബോക്സ് ഉപയോഗിക്കുക',
        tip_practice_exit: 'അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക: റീഡിംഗ് മോഡിലേക്ക് മടങ്ങാൻ ഹെഡറിൽ "അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക" ബട്ടൺ ഉപയോഗിക്കുക',
        tip_practice_search: 'തിരയുക: അഭ്യാസ മോഡിലും <strong>⌘K</strong> അല്ലെങ്കിൽ <strong>/</strong> അമർത്തുക',
        tip_puzzle_enter: 'Toggle to Word Puzzle using the grid icon in the header',
        tip_puzzle_arrange: 'Arrange: Tap scrambled words below to place them in order. Tap placed words to remove them',
        tip_puzzle_hints: 'Hints: Each hint reveals one more word from the beginning. Maximum hints = words - 1 (up to 4)',
        tip_puzzle_reveal: 'Reveal: Instantly shows the complete solution',
        tip_puzzle_replay: 'Replay: After solving, tap "Replay" to try again',
        tip_puzzle_confetti: 'Confetti: Solve on first correct attempt for a celebration!',
        tip_puzzle_navigate: 'Navigate: Use ← → arrow keys, Previous/Next buttons, or swipe gestures between puzzles'
      },
    };
    return (k: string) => {
      if (k === 'app_subtitle' && subtitleOverride) return subtitleOverride;
      return (map[lang] || map.iast)[k] || k;
    };
  }, [lang, subtitleOverride]);
  const label = (code: Lang) => {
    if (isSmall) return code === 'deva' ? 'दे' : code === 'knda' ? 'ಕ' : code === 'tel' ? 'తె' : code === 'tam' ? 'த' : code === 'guj' ? 'ગુ' : code === 'pan' ? 'ਪੰ' : code === 'mr' ? 'म' : code === 'ben' ? 'ব' : code === 'mal' ? 'മ' : 'ENG';
    return code === 'deva' ? 'देवनागरी' : code === 'knda' ? 'ಕನ್ನಡ' : code === 'tel' ? 'తెలుగు' : code === 'tam' ? 'தமிழ்' : code === 'guj' ? 'ગુજરાતી' : code === 'pan' ? 'ਪੰਜਾਬੀ' : code === 'mr' ? 'मराठी' : code === 'ben' ? 'বাংলা' : code === 'mal' ? 'മലയാളം' : 'ENG';
  };

  // Ensure overlay is ready for play/pause after any interaction
  const ensurePlayPauseReady = useCallback(() => {
    setOverlayVisible(true);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="relative min-h-full flex flex-col bg-gradient-to-b from-slate-900 to-black">
        <AppBar position="sticky" color="default" elevation={0} sx={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(2,6,23,0.8)', borderBottom: '1px solid rgba(51,65,85,0.6)' }}>
          <Toolbar sx={{ gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <IconButton onClick={onBack} size="small" sx={{ color: 'text.secondary', mr: 0.5 }}>
                <ArrowBackIcon />
              </IconButton>
              <img src="/icons/stotra-mala-logo.svg" alt="Stotra Maala" style={{ width: 28, height: 28, borderRadius: 6 }} />
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="h6" sx={{ lineHeight: 1, letterSpacing: '-0.01em' }}>{T('app_title')}</Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>{T('app_subtitle')}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Select size="small" value={lang} onChange={(e: SelectChangeEvent) => { const newLang = e.target.value as Lang; setLang(newLang); analytics.languageChange(newLang); ensurePlayPauseReady(); }} sx={{ minWidth: isSmall ? 72 : 140 }}>
                {languageOptions.map((code) => (
                  <MenuItem key={code} value={code}>1 · {label(code)}</MenuItem>
                ))}
              </Select>
              <Select size="small" value={lang2 || ''} onChange={(e: SelectChangeEvent) => { const newLang = (e.target.value || '') as any; setLang2(newLang); if (newLang) analytics.languageChange(`${newLang}_secondary`); ensurePlayPauseReady(); }} sx={{ minWidth: isSmall ? 72 : 140 }} displayEmpty>
                <MenuItem value=""><em>2 · —</em></MenuItem>
                {languageOptions.filter(code => code !== lang).map((code) => (
                  <MenuItem key={code} value={code}>2 · {label(code)}</MenuItem>
                ))}
              </Select>
              <Tooltip title={viewMode === 'reading' ? 'Practice Mode' : 'Reading Mode'}>
                <IconButton
                  color={viewMode === 'practice' ? 'primary' : 'inherit'}
                  onClick={() => {
                    const currentMode = viewMode === 'reading' ? 'play' : viewMode === 'practice' ? 'practice' : 'puzzle';
                    const newMode = viewMode === 'reading' ? 'practice' : 'reading';

                    // Auto-stop any TTS when switching to practice mode
                    if (newMode === 'practice' && ttsMode !== 'off') {
                      if (ttsMode === 'line' && lineTTSPlayer) lineTTSPlayer.stop();
                      if (ttsMode === 'word') flow.pause();
                      setTtsMode('off');
                      analytics.playAction('pause');
                    }

                    // Track mode exit with time spent and actions
                    const durationSeconds = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
                    analytics.modeExit(currentMode === 'puzzle' ? 'practice' : currentMode as 'play' | 'practice', durationSeconds, modeActionCountRef.current);

                    // Enter new mode
                    setViewMode(newMode);
                    analytics.modeEnter(newMode === 'reading' ? 'play' : 'practice', flow.state.lineIndex);
                    analytics.practiceToggle(newMode === 'practice');

                    // Reset tracking
                    modeStartTimeRef.current = Date.now();
                    modeActionCountRef.current = 0;
                  }}
                  aria-label="Toggle Practice Mode"
                  sx={{
                    bgcolor: viewMode === 'practice' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    '&:hover': { bgcolor: viewMode === 'practice' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' }
                  }}
                >
                  {viewMode === 'reading' ? <SchoolIcon /> : <AutoStoriesIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={viewMode === 'puzzle' ? 'Reading Mode' : 'Puzzle Mode'}>
                <IconButton
                  color={viewMode === 'puzzle' ? 'secondary' : 'inherit'}
                  onClick={() => {
                    const currentMode = viewMode === 'reading' ? 'play' : viewMode === 'practice' ? 'practice' : 'puzzle';
                    const newMode = viewMode === 'puzzle' ? 'reading' : 'puzzle';

                    // Auto-stop any TTS when switching to puzzle mode
                    if (newMode === 'puzzle' && ttsMode !== 'off') {
                      if (ttsMode === 'line' && lineTTSPlayer) lineTTSPlayer.stop();
                      if (ttsMode === 'word') flow.pause();
                      setTtsMode('off');
                      analytics.playAction('pause');
                    }

                    // Track mode exit with time spent and actions
                    const durationSeconds = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
                    analytics.modeExit(currentMode === 'puzzle' ? 'practice' : currentMode as 'play' | 'practice', durationSeconds, modeActionCountRef.current);

                    // Enter new mode
                    setViewMode(newMode);
                    analytics.modeEnter(newMode === 'puzzle' ? 'practice' : 'play', flow.state.lineIndex);

                    // Reset tracking
                    modeStartTimeRef.current = Date.now();
                    modeActionCountRef.current = 0;
                  }}
                  aria-label="Toggle Puzzle Mode"
                  sx={{
                    bgcolor: viewMode === 'puzzle' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    '&:hover': { bgcolor: viewMode === 'puzzle' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <GridViewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={`${T('search')} (⌘K /)`}>
                <IconButton color="inherit" onClick={() => { setSearchOpen(true); }} aria-label="Search">
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={T('help')}>
                <IconButton color={helpOpen ? 'primary' : 'inherit'} onClick={() => { setHelpOpen(true); analytics.helpOpen(); }} aria-label={T('help')}>
                  <HelpOutlineRoundedIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
        <SearchPanel
          open={searchOpen}
          onClose={() => { setSearchOpen(false); ensurePlayPauseReady(); }}
          lines={text.lines as any}
          lang={lang}
          onJump={(i: number, w?: number) => {
            if (viewMode === 'practice') {
              // In practice mode, update the practice line index
              setPracticeLineIndex(i);
              setSearchOpen(false); // Close search panel
              analytics.practiceAction('jump');
            } else if (viewMode === 'puzzle') {
              // In puzzle mode, update the driving index and remount PuzzleView via key
              setPracticeLineIndex(i);
              setSearchOpen(false);
            } else {
              // In reading/play mode, use the flow
              flow.seekLine(i);
              if (typeof w === 'number') flow.seekWord(w);
              flow.pause();
            }
          }}
          onResults={handleSearchResults}
        />

        {/* Conditional Rendering: Puzzle View, Practice View, or Reading View */}
        {viewMode === 'puzzle' ? (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {modeHint === 'puzzle' && (
              <div className="px-3 pt-2 pb-1 text-[10px] sm:text-xs text-violet-100 bg-violet-900/40 border-b border-violet-700/40 text-center">
                Hint: Tap words below to arrange them in order. Use ← → arrow keys or swipe to move between puzzles.
              </div>
            )}
            <PuzzleView
              key={`puzzle-${practiceLineIndex}`}
              lines={practicePuzzleLines.lines}
              chapterIndices={practicePuzzleLines.chapterIndices}
              lang={lang}
              initialLineIndex={practiceLineIndex}
              onExit={() => setViewMode('reading')}
              T={T}
            />
          </Box>
        ) : viewMode === 'practice' ? (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {modeHint === 'practice' && (
              <div className="px-3 pt-2 pb-1 text-[10px] sm:text-xs text-emerald-100 bg-emerald-900/40 border-b border-emerald-700/40 text-center">
                Hint: Tap blanks to reveal words. Replay a line after you complete it to reinforce tricky phrases.
              </div>
            )}
            <PracticeView
              key={`practice-${practiceLineIndex}`}
              lines={practicePuzzleLines.lines}
              chapterIndices={practicePuzzleLines.chapterIndices}
              lang={lang}
              initialLineIndex={practiceLineIndex}
              onExit={() => setViewMode('reading')}
              onSearchRequest={() => setSearchOpen(true)}
              onLineIndexChange={setPracticeLineIndex}
              T={T}
            />
          </Box>
        ) : (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'grid', gridTemplateRows: '1fr auto' }}>
            <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
              <Box sx={{ mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '56px 1fr' }, columnGap: { md: 16 }, rowGap: 16, alignItems: 'start' }}>
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                    <Box sx={{ position: 'sticky', top: 80 }}>
                      <FlowMap
                        current={flow.state.lineIndex}
                        total={flow.totalLines}
                        windowSize={3}
                        onSeek={flow.seekLine}
                        marks={searchMarks}
                        sectionMarks={sectionMarks}
                        chapterMarks={chapterMarks}
                        lang={lang}
                      />
                    </Box>
                  </Box>
                  <Box>
                    {modeHint === 'reading' && (
                      <div className="mb-2 text-[10px] sm:text-xs text-sky-100 bg-slate-900/80 border border-sky-700/40 rounded px-2 py-1 text-center">
                        Hint: Swipe left/right (or ← → arrow keys) to move between lines manually. Tap Play when youre ready for auto-advance.
                      </div>
                    )}
                    {/* Status row: Pronunciation micro-tip (left) + Paused/Syncing (right) — single-line, no layout shift */}
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex-1 min-h-[1.5rem]">
                        {!uiPlaying && microTip && (
                          <span className="block text-[10px] sm:text-[11px] md:text-[12px] leading-tight text-slate-300">
                            {microTip}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-shrink-0">
                        {/* Paused pill: only when no TTS is active (not while group-hold animation is driving) */}
                        {ttsMode === 'off' && !holdingGroup && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-slate-800/90 text-slate-100 border border-slate-600/60 shadow-sm`}>
                            {T('pause')}
                          </span>
                        )}
                        {/* Syncing pill: low-contrast, faded, non-blocking; keeps mounted to avoid blink */}
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ml-2"
                          style={{
                            opacity: (holdingGroup && showSyncPill) ? 0.75 : 0,
                            transition: 'opacity 240ms ease',
                            backgroundColor: 'rgba(2,6,23,0.4)',
                            color: 'rgba(148,163,184,0.85)',
                            border: '1px solid rgba(71,85,105,0.35)'
                          }}
                        >
                          Syncing…
                        </span>
                      </div>
                    </div>
                    <Box ref={lensWrapRef} sx={{ transition: 'height 180ms ease', height: freezing && lensH ? `${lensH}px` : undefined, overflow: freezing ? 'hidden' : undefined }}>
                      <Box
                        ref={lensInnerRef}
                        sx={{ position: 'relative', minHeight: lensMaxH ? `${lensMaxH}px` : undefined, touchAction: 'pan-y' }}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          touchStartRef.current = {
                            x: touch.clientX,
                            y: touch.clientY,
                            time: Date.now()
                          };
                        }}
                        onTouchEnd={(e) => {
                          if (!touchStartRef.current) return;
                          const touch = e.changedTouches[0];
                          const deltaX = touch.clientX - touchStartRef.current.x;
                          const deltaY = touch.clientY - touchStartRef.current.y;
                          const deltaTime = Date.now() - touchStartRef.current.time;
                          touchStartRef.current = null;

                          // Swipe detection: minimum 50px horizontal, max 300ms, more horizontal than vertical
                          if (Math.abs(deltaX) > 50 && deltaTime < 300 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                            // Auto-stop any TTS on swipe (hybrid mode)
                            if (ttsMode !== 'off') {
                              if (ttsMode === 'line' && lineTTSPlayer) {
                                lineTTSPlayer.stop();
                              }
                              if (ttsMode === 'word') {
                                flow.pause();
                              }
                              setTtsMode('off');
                              setOverlayVisible(true);
                            }

                            if (deltaX > 0) {
                              // Swipe right -> previous line
                              const newLine = Math.max(0, flow.state.lineIndex - 1);
                              flow.seekLine(newLine);
                            } else {
                              // Swipe left -> next line
                              const newLine = Math.min(flow.totalLines - 1, flow.state.lineIndex + 1);
                              flow.seekLine(newLine);
                            }
                          }
                        }}
                      >
                        <OverlayControls
                          visible={overlayVisible}
                          onVisibleChange={setOverlayVisible}
                          ttsPlaying={ttsPlaying}
                          ttsSupported={ttsSupported}
                          atEnd={atEnd}
                          onReplay={() => { flow.seekLine(0); flow.restartLine(); setOverlayVisible(true); }}
                          onTTSToggle={handleLineTTS}
                          onPrevLine={() => {
                            const newLine = Math.max(0, flow.state.lineIndex - 1);
                            flow.seekLine(newLine);
                          }}
                          onNextLine={() => {
                            const newLine = Math.min(flow.totalLines - 1, flow.state.lineIndex + 1);
                            flow.seekLine(newLine);
                          }}
                          onNudged={bumpNudge}
                          indicator={nudge}
                        />
                        <FlowLens
                          tokens={flow.tokens}
                          rows={flow.rows}
                          wordIndex={flow.state.wordIndex}
                          lineIndex={flow.state.lineIndex}
                          lang={lang}
                          legendOpen={legendOpen}
                          onLegendOpenChange={setLegendOpen}
                          detailsOpen={detailsOpen}
                          onToggleDetails={() => setDetailsOpen(o => !o)}
                          expandedProp={expanded}
                          onExpandedChange={setExpanded}
                          playing={uiPlaying}
                          chapter={chapterLabel}
                        />
                        {lang2 && (
                          <Box sx={{ mt: 1.5 }}>
                            {(() => {
                              const L = flow.state.lineIndex;
                              const prev = (text.lines as any)[L - 1]?.[lang2 as Lang] as string | undefined;
                              const curr = (text.lines as any)[L]?.[lang2 as Lang] as string | undefined;
                              const next = (text.lines as any)[L + 1]?.[lang2 as Lang] as string | undefined;
                              const tokens2 = splitTokens(curr || '', lang2 as Lang);
                              // Map primary chunk index to its raw-word index, then highlight that raw word in secondary
                              const currPrimary = (text.lines as any)[L]?.[lang] as string | undefined;
                              let secWordIdx = 0;
                              try {
                                const offsPrimary = chunkOffsetsByWord(currPrimary || '', lang);
                                // Determine current raw-word group index in primary
                                let rawIdx = Math.max(0, offsPrimary.length - 2);
                                for (let i = 0; i < offsPrimary.length - 1; i++) {
                                  if (flow.state.wordIndex >= offsPrimary[i] && flow.state.wordIndex < offsPrimary[i + 1]) { rawIdx = i; break; }
                                }
                                const startP = offsPrimary[rawIdx];
                                const endP = offsPrimary[rawIdx + 1];
                                const lenP = Math.max(1, endP - startP);
                                const offs2 = chunkOffsetsByWord(curr || '', lang2 as Lang);
                                const rawIdx2 = Math.max(0, Math.min(rawIdx, Math.max(0, offs2.length - 2)));
                                const start2 = offs2[rawIdx2];
                                const end2 = offs2[rawIdx2 + 1];
                                const len2 = Math.max(1, end2 - start2);
                                // Progress through every sub-word without skipping using floor
                                const prog2 = Math.max(0, Math.min(1, groupProgress));
                                if (len2 <= 1) {
                                  secWordIdx = start2;
                                } else {
                                  const step = Math.min(len2 - 1, Math.floor(prog2 * len2));
                                  secWordIdx = start2 + step;
                                }
                              } catch { }
                              return (
                                <FlowLens
                                  tokens={tokens2}
                                  rows={[prev, curr, next]}
                                  wordIndex={Math.min(secWordIdx, Math.max(0, tokens2.length - 1))}
                                  lineIndex={flow.state.lineIndex}
                                  lang={lang2 as Lang}
                                  legendOpen={legendOpen}
                                  onLegendOpenChange={setLegendOpen}
                                  detailsOpen={detailsOpen}
                                  onToggleDetails={() => setDetailsOpen(o => !o)}
                                  expandedProp={expanded}
                                  onExpandedChange={setExpanded}
                                  playing={uiPlaying}
                                  chapter={chapterLabel}
                                />
                              );
                            })()}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <FlowTimeline
                        current={flow.state.lineIndex}
                        total={flow.totalLines}
                        onSeek={flow.seekLine}
                        onSeekStart={() => { setFreezing(true); measureHeights(); setOverlayVisible(true); }}
                        onSeekEnd={() => {
                          setOverlayVisible(true);
                          try {
                            const ae = document.activeElement as HTMLElement | null;
                            if (ae && ae !== document.body) ae.blur();
                          } catch { }
                          setTimeout(() => { setFreezing(false); setLensH(null); setSideH(null); }, 120);
                        }}
                        lang={lang}
                        muted={flow.state.muted}
                        onToggleMute={flow.toggleMute}
                        ttsSupported={ttsSupported}
                        legendActive={legendOpen}
                        onToggleLegend={() => setLegendOpen(v => !v)}
                        artActive={detailsOpen}
                        onToggleArt={() => setDetailsOpen(o => !o)}
                        playing={wordTtsPlaying}
                        onTogglePlay={handleWordTTS}
                        pace={pace}
                        onPaceChange={(p) => { setPaceState(p); flow.setPace(p); }}
                        onLineCounterClick={() => {
                          if (!chapters.length) return;
                          // Pause autoplay when opening chapter navigation
                          if (flow.state.playing) {
                            flow.pause();
                            analytics.playAction('pause');
                          }
                          setOverlayVisible(true);
                          setChapterSheetOpen(true);
                        }}
                      />
                    </Box>
                    {/* Copyright notice for vignanam.org translations */}
                    {text.sources && Object.values(text.sources).some((url: string) => url?.includes('vignanam.org')) && (
                      <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 9,
                            color: 'rgba(148,163,184,0.5)',
                            letterSpacing: 0.3,
                          }}
                        >
                          Text courtesy of{' '}
                          <a
                            href="https://vignanam.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'rgba(148,163,184,0.7)', textDecoration: 'none' }}
                          >
                            vignanam.org
                          </a>
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ mt: 2, display: { xs: detailsOpen ? 'block' : 'none', md: 'none' } }} ref={sideWrapMobileRef}>
                      <Box sx={{ transition: 'height 180ms ease', height: freezing && sideH ? `${sideH}px` : 'auto', overflow: freezing ? 'hidden' : 'visible' }}>
                        <Paper sx={{ p: 2, borderRadius: 3 }}>
                          <FadingImage src={mediaSrc} className="w-full" />
                        </Paper>
                      </Box>
                    </Box>
                    <Box sx={{ display: { xs: 'none', md: detailsOpen ? 'block' : 'none' }, mt: 2 }}>
                      <Box ref={sideWrapDesktopRef as any} sx={{ transition: 'height 180ms ease', height: freezing && sideH ? `${sideH}px` : undefined, overflow: freezing ? 'hidden' : undefined }}>
                        <Paper sx={{ p: 2, borderRadius: 3 }}>
                          <FadingImage src={mediaSrc} className="w-full" />
                        </Paper>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Container>
            {/* Footer transport removed: controls are integrated into the timeline */}
          </Box>
        )}

        {/* Chapter selection bottom sheet (reading/play mode) */}
        <Dialog
          open={chapterSheetOpen && viewMode === 'reading'}
          onClose={() => setChapterSheetOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              bgcolor: 'rgba(2,6,23,0.96)',
              borderRadius: { xs: '16px 16px 0 0', sm: 3 },
              position: { xs: 'fixed', sm: 'relative' },
              bottom: { xs: 0, sm: 'auto' },
              m: 0,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{T('chapters_title')}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {T('chapters_hint')}
                </Typography>
              </Box>
              <Button size="small" onClick={() => setChapterSheetOpen(false)} sx={{ textTransform: 'none' }}>
                {T('close')}
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 1, maxHeight: 320 }}>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {chapters.map((ch) => {
                const isCurrent = ch.index === currentChapterIndex;
                return (
                  <Box
                    key={ch.index}
                    component="li"
                    sx={{
                      mb: 0.5,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: isCurrent ? '1px solid rgba(56,189,248,0.9)' : '1px solid rgba(51,65,85,0.9)',
                      bgcolor: isCurrent ? 'rgba(8,47,73,0.9)' : 'rgba(15,23,42,0.85)',
                    }}
                  >
                    <Button
                      fullWidth
                      onClick={() => {
                        flow.seekLine(ch.index);
                        flow.pause();
                        analytics.playAction('seek');
                        setChapterSheetOpen(false);
                        setOverlayVisible(true);
                      }}
                      sx={{
                        justifyContent: 'space-between',
                        textTransform: 'none',
                        py: 1,
                        px: 1.5,
                      }}
                    >
                      <Box sx={{ textAlign: 'left', minWidth: 0, mr: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isCurrent ? 700 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ch.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ch.display}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 52 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {T('line')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {ch.index + 1} / {flow.totalLines}
                        </Typography>
                      </Box>
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </DialogContent>
        </Dialog>

        <footer className="relative z-10 pb-4 text-center text-[10px] text-slate-500">
          <span>{APP_VERSION}</span>
        </footer>

        {/* Help dialog */}
        <Dialog
          open={helpOpen}
          onClose={() => { setHelpOpen(false); ensurePlayPauseReady(); }}
          fullWidth
          maxWidth="md"
          BackdropProps={{ sx: { backgroundColor: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(4px)' } }}
          PaperProps={{ sx: { bgcolor: 'rgba(2,6,23,0.96)' } }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <span>{T('howto')}</span>
                <Button variant="outlined" size="small" onClick={() => {
                  setHelpOpen(false);
                  try { localStorage.removeItem('ui:onboarded:v1'); } catch { }
                  setOnboardingOpen(true);
                }}>Replay Tutorial</Button>
              </Box>
              <Chip label={APP_VERSION} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'rgba(148,163,184,0.3)' }} />
            </Box>
            <Tabs
              value={helpTab}
              onChange={(_, v) => setHelpTab(v)}
              sx={{
                mt: 1,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)' },
                '& .Mui-selected': { color: '#3b82f6' }
              }}
            >
              <Tab
                label={isSmall ? null : T('help_play_tab')}
                icon={<AutoStoriesIcon />}
                iconPosition={isSmall ? undefined : "start"}
              />
              <Tab
                label={isSmall ? null : T('help_practice_tab')}
                icon={<SchoolIcon />}
                iconPosition={isSmall ? undefined : "start"}
              />
              <Tab
                label={isSmall ? null : T('help_puzzle_tab')}
                icon={<GridViewIcon />}
                iconPosition={isSmall ? undefined : "start"}
              />
            </Tabs>
          </DialogTitle>
          <DialogContent dividers>
            {helpTab === 0 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_play')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_pace')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_timeline')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_chapters')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_pronun')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_search')}` }} />
              </div>
            )}
            {helpTab === 1 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_enter')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_hints')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_reveal')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_replay')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_navigate')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_search')}` }} />
              </div>
            )}
            {helpTab === 2 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_enter')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_arrange')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_hints')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_reveal')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_replay')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_confetti')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_navigate')}` }} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <OnboardingTour open={onboardingOpen} setOpen={setOnboardingOpen} />

      </div>
    </ThemeProvider>
  );
}
