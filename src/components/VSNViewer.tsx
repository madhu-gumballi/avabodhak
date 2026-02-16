import { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Box, IconButton, Select, MenuItem, Tooltip, useMediaQuery, Paper, Container, Typography, Button, Dialog, DialogTitle, DialogContent, Chip, Snackbar, Alert, Tabs, Tab } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import SchoolIcon from '@mui/icons-material/School';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import GridViewIcon from '@mui/icons-material/GridView';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import linesFile from '../data/vs.lines.new.json';
// Force cache bust: v2 - data enrichment update 2026-01-26
import type { Line, TextFile, Lang } from '../data/types';
import { useWordFlow } from '../hooks/useWordFlow';
import { splitTokens, chunkOffsetsByWord } from '../lib/tokenize';
import { FlowLens } from './FlowLens';
// import { FlowTransport } from './FlowTransport';
import { FlowTimeline } from './FlowTimeline';
import { FlowMap } from './FlowMap';
import { SearchPanel } from './SearchPanel';
import { OverlayControls } from './OverlayControls';
// LineTTSBar removed — replaced by TTS auto-play toggle in header
import { PracticeView } from './PracticeView';
import { PuzzleView } from './PuzzleView';
import { OnboardingTour } from './OnboardingTour';
import { VerseDetailInline } from './VerseDetailPanel';
import { MobileModeDock } from './MobileModeDock';
import { ExploreDrawer } from './ExploreDrawer';
import { analytics } from '../lib/analytics';
import type { PracticeDifficulty } from '../lib/practice';
import { getPracticeStats } from '../lib/practice';
import { getPuzzleStats } from '../lib/puzzle';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import LoginButton from './LoginButton';
import StreakBadge from './StreakBadge';
import DailyGoalWidget from './DailyGoalWidget';
import AchievementsPanel from './AchievementsPanel';
import LeaderboardPanel from './LeaderboardPanel';
import { isTTSEnabled, isTTSSupportedForLang, LineTTSPlayer } from '../lib/tts';


export function VSNViewer({ onBack, textOverride, subtitleOverrides, availableLangs, preferredLang, initialMode, initialLineIndex: initialLineIndexProp, stotraKey = 'vsn' }: { onBack: () => void; textOverride?: TextFile; subtitleOverrides?: Partial<Record<Lang, string>>; availableLangs?: Lang[]; preferredLang?: Lang; initialMode?: 'reading' | 'practice' | 'puzzle'; initialLineIndex?: number; stotraKey?: string }) {
  const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION || '0.0.0'}`;

  // Auth and gamification context
  const { user, userData, isGuest, recordActivity, updatePreferences } = useAuth();
  const [achievementsPanelOpen, setAchievementsPanelOpen] = useState(false);
  const [leaderboardPanelOpen, setLeaderboardPanelOpen] = useState(false);

  // Record activity on mount for streak tracking
  useEffect(() => {
    recordActivity();
  }, []);

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
  const rawLanguageOptions = availableLangs ?? (['deva', 'knda', 'iast', 'tel', 'tam', 'guj', 'pan'] as Lang[]);
  const text = (textOverride ?? (linesFile as TextFile));

  // Filter language options to only include languages that have actual content in the text
  const languageOptions = useMemo(() => {
    return rawLanguageOptions.filter((langCode) => {
      // Check if at least some lines have non-empty content for this language
      const hasContent = text.lines.some((line: any) => {
        const content = line[langCode];
        return content && typeof content === 'string' && content.trim().length > 0;
      });
      return hasContent;
    });
  }, [rawLanguageOptions, text.lines]);

  // Extract highlight words from metadata (e.g., 24 Keshava names)
  const highlightWords = useMemo(() => {
    const metadata = (text as any).metadata;
    if (!metadata) return undefined;
    // Check for chaturvimshatiNama (24 Keshava names) or similar highlight patterns
    const keshavaNama = metadata.chaturvimshatiNama as Array<{ nama: string; iast?: string; meaning?: string }> | undefined;
    if (keshavaNama?.length) {
      return keshavaNama.map((n) => ({
        pattern: n.iast || n.nama.toLowerCase(),
        meaning: `${n.nama}: ${n.meaning || ''}`,
      }));
    }
    return undefined;
  }, [text]);

  const fallbackLang = (languageOptions.includes('knda') ? 'knda' : (languageOptions[0] || 'knda')) as Lang;
  const fallbackLang2 = (languageOptions.find((l) => l !== fallbackLang) || '') as Lang | '';
  const ttsEnabled = isTTSEnabled();
  const [lang, setLang] = useState<Lang>(() => {
    // Priority: preferredLang > userData (Firestore) > localStorage > fallbackLang
    if (preferredLang && languageOptions.includes(preferredLang)) {
      return preferredLang;
    }
    const userPref = userData?.preferences?.lang as Lang | undefined;
    if (userPref && languageOptions.includes(userPref)) {
      return userPref;
    }
    try {
      const raw = localStorage.getItem('lang') as Lang | null;
      return raw && languageOptions.includes(raw) ? raw : fallbackLang;
    } catch { return fallbackLang; }
  });
  const [lang2, setLang2] = useState<Lang | ''>(() => {
    const userPref2 = userData?.preferences?.lang2 as Lang | null | undefined;
    if (userPref2 && languageOptions.includes(userPref2) && userPref2 !== fallbackLang) {
      return userPref2;
    }
    try {
      const raw = localStorage.getItem('lang2') as Lang | null;
      if (raw && languageOptions.includes(raw) && raw !== fallbackLang) return raw;
      return fallbackLang2;
    } catch { return fallbackLang2; }
  });
  // Persist language to localStorage and Firestore
  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch { }
    if (user) { updatePreferences({ lang }).catch(() => {}); }
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem('lang2', lang2 || ''); } catch { }
    if (user) { updatePreferences({ lang2: lang2 || null }).catch(() => {}); }
  }, [lang2]);
  // When userData loads asynchronously (e.g. auto-login on new session),
  // sync the language from Firestore preferences so it overrides localStorage defaults.
  const userDataLangRef = useRef(false);
  useEffect(() => {
    if (userData?.preferences?.lang && !preferredLang && !userDataLangRef.current) {
      const savedLang = userData.preferences.lang as Lang;
      if (languageOptions.includes(savedLang) && savedLang !== lang) {
        setLang(savedLang);
      }
      const savedLang2 = userData.preferences.lang2 as Lang | null | undefined;
      if (savedLang2 && languageOptions.includes(savedLang2) && savedLang2 !== lang2) {
        setLang2(savedLang2);
      }
      userDataLangRef.current = true;
    }
  }, [userData]);
  useEffect(() => {
    if (lang2 && (lang2 === lang || !languageOptions.includes(lang2))) {
      setLang2(fallbackLang2);
    }
  }, [lang, lang2, languageOptions, fallbackLang2]);

  // Create TTS player instance ONCE and keep it stable across renders
  const lineTTSPlayerRef = useRef<LineTTSPlayer | null>(null);
  if (!lineTTSPlayerRef.current && ttsEnabled) {
    lineTTSPlayerRef.current = new LineTTSPlayer();
  }
  const lineTTSPlayer = lineTTSPlayerRef.current;

  // Cleanup TTS player on unmount
  useEffect(() => {
    return () => {
      lineTTSPlayerRef.current?.dispose();
      lineTTSPlayerRef.current = null;
    };
  }, []);

  // TTS playing state (line-level TTS only)
  const [ttsPlaying, setTtsPlaying] = useState(false);

  // TTS auto-play toggle: when enabled, audio plays automatically on line navigation
  const [ttsAutoPlay, setTtsAutoPlay] = useState<boolean>(() => {
    try { return localStorage.getItem('tts-autoplay') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('tts-autoplay', ttsAutoPlay.toString()); } catch { }
  }, [ttsAutoPlay]);

  // Ref to track the seekWord function for TTS word sync
  const seekWordRef = useRef<((i: number) => void) | null>(null);

  // Wire LineTTSPlayer callbacks to local state
  useEffect(() => {
    if (!lineTTSPlayer) return;
    lineTTSPlayer.setCallbacks({
      onStart: () => setTtsPlaying(true),
      onEnd: () => setTtsPlaying(false),
      onError: () => setTtsPlaying(false),
      onWordChange: (wordIndex: number) => {
        // Update word highlighting during TTS playback
        seekWordRef.current?.(wordIndex);
      },
    });
  }, [lineTTSPlayer]);

  // useWordFlow handles navigation state for word highlighting
  const flow = useWordFlow(text.lines as Line[], lang);

  // Keep seekWordRef updated for TTS word sync
  useEffect(() => {
    seekWordRef.current = flow.seekWord;
  }, [flow.seekWord]);

  // Seek to initial line on mount (for Continue Reading resume)
  useEffect(() => {
    if (initialLineIndexProp !== undefined && initialLineIndexProp > 0) {
      flow.seekLine(initialLineIndexProp);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if TTS is supported for current language AND current line has content
  const currentLineText = (text.lines[flow.state.lineIndex] as any)?.[lang] || '';
  const ttsSupported = ttsEnabled && isTTSSupportedForLang(lang) && currentLineText.trim().length > 0;

  const [detailsOpen, setDetailsOpen] = useState(true);
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
  const [legendOpen, setLegendOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'reading' | 'practice' | 'puzzle'>(initialMode || 'reading');
  const [learnMode, setLearnMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ui:learnMode') === 'true';
    } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('ui:learnMode', learnMode.toString()); } catch { } }, [learnMode]);
  const [verseDetailOpen, setVerseDetailOpen] = useState(true);
  const [exploreDrawerOpen, setExploreDrawerOpen] = useState(false);
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
      const stored = localStorage.getItem(`ui:practice:${stotraKey}:${lang}`);
      return stored === 'true';
    } catch { return false; }
  });
  const [practiceLineIndex, setPracticeLineIndex] = useState<number>(() => {
    if (initialLineIndexProp !== undefined) return initialLineIndexProp;
    try {
      const stored = localStorage.getItem(`ui:practice:line:${stotraKey}:${lang}`);
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

  // TTS auto-play: play audio automatically when line changes and toggle is on
  const prevLineRef = useRef<number>(flow.state.lineIndex);
  useEffect(() => {
    if (prevLineRef.current === flow.state.lineIndex) return;
    prevLineRef.current = flow.state.lineIndex;
    if (!ttsAutoPlay || !lineTTSPlayer || viewMode !== 'reading') return;
    const lineText = (text.lines[flow.state.lineIndex] as any)?.[lang] || '';
    if (!ttsEnabled || !isTTSSupportedForLang(lang) || !lineText.trim()) return;
    // Small delay to let the UI settle before playing
    const id = window.setTimeout(() => {
      flow.seekWord(0);
      lineTTSPlayer.playLine(lineText, lang, flow.tokens);
    }, 200);
    return () => window.clearTimeout(id);
  }, [flow.state.lineIndex, ttsAutoPlay, lineTTSPlayer, viewMode, text.lines, lang, ttsEnabled, flow.tokens, flow.seekWord]);

  // Persist current position to lastStotra for "Continue Reading" on home page
  // Writes to localStorage immediately (for guests) and debounces Firestore writes
  const lastStotraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const entry = {
      key: stotraKey,
      lang,
      timestamp: Date.now(),
      lineIndex: viewMode === 'reading' ? flow.state.lineIndex : practiceLineIndex,
      mode: viewMode,
    };
    // Always write to localStorage (instant, works for guests)
    try { localStorage.setItem('avabodhak:lastStotra', JSON.stringify(entry)); } catch {}
    // Debounce Firestore write (500ms) to avoid hammering on every line change
    if (lastStotraTimerRef.current) clearTimeout(lastStotraTimerRef.current);
    lastStotraTimerRef.current = setTimeout(() => {
      updatePreferences({ lastOpenedStotra: entry });
    }, 500);
    return () => { if (lastStotraTimerRef.current) clearTimeout(lastStotraTimerRef.current); };
  }, [flow.state.lineIndex, practiceLineIndex, viewMode, stotraKey, lang, updatePreferences]);
  const measureHeights = () => {
    const a = lensWrapRef.current?.getBoundingClientRect().height || null;
    setLensH(a);
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

  // End-of-text detection
  const atEnd = useMemo(() => {
    const lastToken = Math.max(0, flow.tokens.length - 1);
    return (flow.state.lineIndex >= flow.totalLines - 1) && (flow.state.wordIndex >= lastToken);
  }, [flow.state.lineIndex, flow.totalLines, flow.state.wordIndex, flow.tokens.length]);

  useEffect(() => {
    if (atEnd) {
      setOverlayVisible(true);
    }
  }, [atEnd]);

  // UI playing state - true when line TTS is playing
  const uiPlaying = ttsPlaying;

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
  }, [viewMode, flow.seekLine, flow.state.lineIndex, flow.totalLines]);

  // Onboarding keyboard navigation is handled inside OnboardingTour

  // Touch gesture state for swipe navigation (hybrid mode)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Auto-hide overlay a moment after interaction if TTS is playing
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

  // Bump visual nudge indicator (+/- words) with small accumulation window
  const bumpNudge = useCallback((dir: 'prev' | 'next') => {
    setNudge({ dir, count: 1, show: true });
    setTimeout(() => setNudge(n => ({ ...n, show: false })), 1200);
  }, []);



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
      // Clean dandas and verse numbers for practice/puzzle modes
      const cleaned = value
        .replace(/॥\s*[०-९೦-೯౦-౯௦-௯\d]+\s*॥/g, '')
        .replace(/\|\|\s*\d+\s*\|\|/g, '')
        .replace(/॥/g, '')
        .replace(/\|\|/g, '')
        .replace(/[।|]/g, '')
        .replace(/\s+\d+\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      linesArr.push(cleaned);
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
  const handleLineTTS = useCallback(async () => {
    if (!lineTTSPlayer || !ttsSupported) return;

    // If line TTS is currently playing, stop it.
    if (lineTTSPlayer.isPlaying()) {
      lineTTSPlayer.stop();
      return;
    }

    const currentLineText = (text.lines[flow.state.lineIndex] as any)?.[lang] as string | undefined;
    if (!currentLineText) return;

    // Reset to first word before starting TTS
    flow.seekWord(0);

    // Pass tokens for word-level synchronization
    await lineTTSPlayer.playLine(currentLineText, lang, flow.tokens);
  }, [lineTTSPlayer, ttsSupported, text.lines, flow.state.lineIndex, lang, flow.tokens, flow.seekWord]);

  // Global shortcuts: Cmd/Ctrl+K or '/' for search, Space to toggle TTS auto-play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === ' ' && !isInput && viewMode === 'reading' && ttsEnabled && isTTSSupportedForLang(lang)) {
        e.preventDefault();
        setTtsAutoPlay(prev => {
          if (prev && lineTTSPlayer?.isPlaying()) lineTTSPlayer.stop();
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, lang, ttsEnabled, lineTTSPlayer]);

  // Get current line data
  const currentLine = (text.lines as any)[flow.state.lineIndex] as any;
  const chapterLabel = currentLine?.chapter as string | undefined;

  // Persist legendOpen to localStorage per language
  useEffect(() => {
    try {
      localStorage.setItem(`ui:legend:${lang}`, legendOpen ? '1' : '0');
    } catch { }
  }, [legendOpen, lang]);

  // Persist practice line index to localStorage per language
  useEffect(() => {
    try {
      localStorage.setItem(`ui:practice:line:${stotraKey}:${lang}`, practiceLineIndex.toString());
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
        help_account_tab: 'Account & Progress',
        tip_account_login: '🔐 <strong>Sign In</strong> with Google to sync progress across devices. Use as guest — progress saves locally.',
        tip_account_streaks: '🔥 <strong>Streaks</strong>: Complete at least one line daily to build your streak.',
        tip_account_badges: '🏆 <strong>Badges</strong>: Earn achievements for milestones — first line, 7-day streak, stotra mastery, and more.',
        tip_account_leaderboard: '🏅 <strong>Leaderboard</strong>: Weekly, monthly, and all-time rankings based on your practice.',
        tip_play: '🔊 <strong>TTS Audio</strong>: Toggle the speaker icon in header (or press <strong>Space</strong>) to auto-play audio as you navigate lines. <strong>Swipe</strong> or <strong>← →</strong> to move between lines.',
        tip_pace: '📱 <strong>Mobile</strong>: Tap the <strong>⋮</strong> tab on the right edge to switch modes, view details, or open settings.',
        tip_search: '🔍 <strong>Search</strong>: Press <strong>⌘K</strong> or <strong>/</strong> to search. Tap a result to jump there.',
        tip_chapters: '📖 <strong>Verse Details</strong>: Tap <strong>Details</strong> in the dock (mobile) or info icon for meanings and word analysis.',
        practice: 'Practice', practice_mode: 'Practice Mode', difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard',
        jump_to_line: 'Go to...', reveal: 'Reveal', replay_line: 'Replay Line', revealed: 'revealed', practiced: 'practiced', progress: 'Progress', exit_practice: 'Exit Practice', line: 'Line',
        practice_hint: 'Tap blanks to reveal words', practice_complete: 'Verse practiced!', practice_progress: 'Progress',
        puzzle_mode: 'Word Puzzle', puzzle_hint: 'Tap words below to arrange them in correct order', puzzle_complete: 'Puzzle Solved!',
        tap_to_arrange: 'Available Words', your_arrangement: 'Your Arrangement', try_again: 'Not quite right! Try again',
        get_hint: 'Get a hint', hint: 'Hint', reset_puzzle: 'Reset puzzle', reset: 'Reset', check: 'Check', next_puzzle: 'Next Puzzle',
        correct: 'correct', completed: 'completed', attempts: 'attempts', hints: 'hints', keyboard_shortcuts: 'Keyboard shortcuts', to_navigate: 'to navigate',
        exit_puzzle: 'Exit Word Puzzle',
        help_play_tab: 'Play Mode', help_practice_tab: 'Practice Mode', help_puzzle_tab: 'Word Puzzle',
        tip_practice_enter: '🎯 <strong>Practice Mode</strong>: Tap <strong>Practice</strong> in the dock (mobile) or header icon (desktop). Words are masked — tap to reveal.',
        tip_practice_reveal: '👁️ <strong>Reveal</strong>: Tap masked words to reveal letters step-by-step. Use "Reveal" button to complete the line instantly.',
        tip_practice_navigate: '🧭 <strong>Navigate</strong>: Use ← → keys, swipe, or Previous/Next buttons. Chapter lines are auto-skipped. Use <strong>⌘K</strong> to search.',
        tip_puzzle_enter: '🧩 <strong>Word Puzzle</strong>: Tap <strong>Puzzle</strong> in the dock (mobile) or header icon (desktop). Arrange scrambled words in order.',
        tip_puzzle_arrange: '🧩 <strong>Play</strong>: Tap words to place them. Use hints to reveal from the start. Solve on first try for confetti!',
        tip_puzzle_navigate: '🧭 <strong>Navigate</strong>: Use ← → keys, swipe, or Previous/Next buttons between puzzles.',
        chapters_title: 'Sections',
        chapters_hint: 'Tap a section to jump; playback stays in Manual.',
        close: 'Close'
      },
      deva: {
        app_title: 'अवबोधक', app_subtitle: 'विष्णु सहस्रनाम',
        search: 'खोजें', help: 'सहायता', howto: 'कैसे उपयोग करें', play: 'चलाएँ', pause: 'मैन्युअल', pace: 'गति', tips: 'सुझाव', footer_hint: 'पंक्तियों में जाने के लिए तीर कुंजी या स्वाइप करें।',
        tip_play: '🔊 <strong>TTS ऑडियो</strong>: हेडर में स्पीकर आइकॉन टॉगल करें (या <strong>Space</strong> दबाएँ) — पंक्ति बदलने पर ऑडियो स्वतः चलता है। <strong>स्वाइप</strong> या <strong>← →</strong> से नेविगेट करें।',
        tip_pace: '📱 <strong>मोबाइल</strong>: दाईं ओर <strong>⋮</strong> टैब टैप करें — मोड बदलें, विवरण देखें, या सेटिंग्स खोलें।',
        tip_search: '🔍 <strong>खोज</strong>: <strong>⌘K</strong> या <strong>/</strong> दबाएँ। परिणाम पर टैप करके वहाँ जाएँ।',
        tip_chapters: '📖 <strong>श्लोक विवरण</strong>: डॉक में <strong>Details</strong> (मोबाइल) या info आइकॉन — अर्थ और शब्द विश्लेषण।',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'कठिनाई', easy: 'आसान', medium: 'मध्यम', hard: 'कठिन',
        jump_to_line: 'जाएँ...', reveal: 'प्रकट करें', replay_line: 'लाइन रिप्ले करें', revealed: 'प्रकट', practiced: 'अभ्यास किया', progress: 'प्रगति', exit_practice: 'अभ्यास से बाहर निकलें', line: 'लाइन',
        practice_hint: 'शब्द प्रकट करने हेतु रिक्त स्थान टैप करें', practice_complete: 'श्लोक अभ्यास किया!', practice_progress: 'प्रगति',
        puzzle_mode: 'शब्द पहेली', puzzle_hint: 'शब्दों को सही क्रम में व्यवस्थित करने के लिए नीचे टैप करें', puzzle_complete: 'पहेली हल हो गई!',
        tap_to_arrange: 'उपलब्ध शब्द', your_arrangement: 'आपकी व्यवस्था', try_again: 'बिल्कुल सही नहीं! पुनः प्रयास करें',
        get_hint: 'संकेत प्राप्त करें', hint: 'संकेत', reset_puzzle: 'पहेली रीसेट करें', reset: 'रीसेट', check: 'जांचें', next_puzzle: 'अगली पहेली',
        correct: 'सही', completed: 'पूर्ण', attempts: 'प्रयास', hints: 'संकेत', keyboard_shortcuts: 'कीबोर्ड शॉर्टकट', to_navigate: 'नेविगेट करने के लिए',
        exit_puzzle: 'शब्द पहेली से बाहर निकलें',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'शब्द पहेली',
        tip_practice_enter: '🎯 <strong>अभ्यास मोड</strong>: डॉक में <strong>Practice</strong> (मोबाइल) या हेडर आइकॉन टैप करें। शब्द छुपे होते हैं — टैप करके प्रकट करें।',
        tip_practice_reveal: '👁️ <strong>प्रकटीकरण</strong>: छुपे शब्दों को टैप करें — हर टैप अधिक अक्षर दिखाता है। "प्रकट करें" बटन से पूरी पंक्ति तुरंत देखें।',
        tip_practice_navigate: '🧭 <strong>नेविगेट</strong>: ← → कुंजी, स्वाइप, या पिछले/अगले बटन। अध्याय पंक्तियाँ स्वतः छोड़ी जाती हैं। <strong>⌘K</strong> से खोजें।',
        tip_puzzle_enter: '🧩 <strong>शब्द पहेली</strong>: डॉक में <strong>Puzzle</strong> (मोबाइल) या हेडर आइकॉन टैप करें। शब्दों को सही क्रम में लगाएँ।',
        tip_puzzle_arrange: '🧩 <strong>खेलें</strong>: शब्द टैप करें। संकेतों से शुरू के शब्द प्रकट होते हैं। पहली कोशिश में हल करें — कॉन्फेटी!',
        tip_puzzle_navigate: '🧭 <strong>नेविगेट</strong>: ← → कुंजी, स्वाइप, या पिछले/अगले बटन।',
        chapters_title: 'अध्याय',
        chapters_hint: 'किसी अध्याय पर टैप करके वहाँ जाएँ; प्लेबैक मैन्युअल पर ही रहता है।',
        close: 'बंद करें',
        help_account_tab: 'खाता एवं प्रगति',
        tip_account_login: '🔐 Google से <strong>साइन इन</strong> करें — प्रगति सभी उपकरणों पर सिंक होगी। अतिथि मोड में प्रगति स्थानीय रूप से सेव होती है।',
        tip_account_streaks: '🔥 <strong>स्ट्रीक</strong>: रोज़ कम से कम एक पंक्ति पूरी करके स्ट्रीक बनाएँ।',
        tip_account_badges: '🏆 <strong>बैज</strong>: पहली पंक्ति, 7-दिन स्ट्रीक, स्तोत्र मास्टरी जैसे मील के पत्थर पर उपलब्धियाँ अर्जित करें।',
        tip_account_leaderboard: '🏅 <strong>लीडरबोर्ड</strong>: साप्ताहिक, मासिक और सर्वकालिक रैंकिंग।'
      },
      knda: {
        app_title: 'ಅವಬೋಧಕ', app_subtitle: 'ವಿಷ್ಣು ಸಹಸ್ರನಾಮ',
        search: 'ಹುಡುಕಿ', help: 'ಸಹಾಯ', howto: 'ಹೆಗೆ ಬಳಸುವುದು', play: 'ಆಡಿಸಿ', pause: 'ಹಸ್ತಚಾಲಿತ', pace: 'ವೇಗ', tips: 'ಸಲಹೆಗಳು', footer_hint: 'ಸಾಲುಗಳ ನಡುವೆ ಹೋಗಲು ಬಾಣದ ಕೀಲಿಗಳು ಅಥವಾ ಸ್ವೈಪ್ ಬಳಸಿ.',
        tip_play: '🔊 <strong>TTS ಆಡಿಯೊ</strong>: ಹೆಡರ್‌ನಲ್ಲಿ ಸ್ಪೀಕರ್ ಐಕಾನ್ ಟಾಗಲ್ ಮಾಡಿ (ಅಥವಾ <strong>Space</strong> ಒತ್ತಿ) — ಸಾಲು ಬದಲಾದಾಗ ಆಡಿಯೊ ಸ್ವಯಂ ಪ್ಲೇ ಆಗುತ್ತದೆ. <strong>ಸ್ವೈಪ್</strong> ಅಥವಾ <strong>← →</strong> ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು.',
        tip_pace: '📱 <strong>ಮೊಬೈಲ್</strong>: ಬಲ ಅಂಚಿನ <strong>⋮</strong> ಟ್ಯಾಬ್ ಟ್ಯಾಪ್ ಮಾಡಿ — ಮೋಡ್ ಬದಲಿಸಿ, ವಿವರ ನೋಡಿ, ಅಥವಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ತೆರೆಯಿರಿ.',
        tip_search: '🔍 <strong>ಹುಡುಕಿ</strong>: <strong>⌘K</strong> ಅಥವಾ <strong>/</strong> ಒತ್ತಿ. ಫಲಿತಾಂಶ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಲ್ಲಿಗೆ ಜಿಗಿಯಿರಿ.',
        tip_chapters: '📖 <strong>ಶ್ಲೋಕ ವಿವರ</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Details</strong> (ಮೊಬೈಲ್) ಅಥವಾ info ಐಕಾನ್ — ಅರ್ಥ ಮತ್ತು ಪದ ವಿಶ್ಲೇಷಣೆ.',
        practice: 'ಅಭ್ಯಾಸ', practice_mode: 'ಅಭ್ಯಾಸ ಮೋಡ್', difficulty: 'ಕಷ್ಟತೆ', easy: 'ಸುಲಭ', medium: 'ಮಧ್ಯಮ', hard: 'ಕಠಿಣ',
        jump_to_line: 'ಹೋಗಿ...', reveal: 'ಬಹಿರಂಗಪಡಿಸಿ', replay_line: 'ಸಾಲು ಮರುಚಲಾವಣೆ', revealed: 'ಬಹಿರಂಗಪಡಿಸಲಾಗಿದೆ', practiced: 'ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ', progress: 'ಪ್ರಗತಿ', exit_practice: 'ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ', line: 'ಸಾಲು',
        practice_hint: 'ಪದಗಳನ್ನು ತೋರಿಸಲು ಖಾಲಿ ಜಾಗ ಟ್ಯಾಪ್ ಮಾಡಿ', practice_complete: 'ಶ್ಲೋಕ ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ!', practice_progress: 'ಪ್ರಗತಿ',
        puzzle_mode: 'ಪದ ಒಗಟು', puzzle_hint: 'ಪದಗಳನ್ನು ಸರಿಯಾದ ಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಲು ಕೆಳಗೆ ಟ್ಯಾಪ್ ಮಾಡಿ', puzzle_complete: 'ಒಗಟು ಪರಿಹರಿಸಲಾಗಿದೆ!',
        tap_to_arrange: 'ಲಭ್ಯವಿರುವ ಪದಗಳು', your_arrangement: 'ನಿಮ್ಮ ಜೋಡಣೆ', try_again: 'ಸರಿಯಾಗಿಲ್ಲ! ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
        get_hint: 'ಸೂಚನೆ ಪಡೆಯಿರಿ', hint: 'ಸೂಚನೆ', reset_puzzle: 'ಒಗಟು ಮರುಹೊಂದಿಸಿ', reset: 'ಮರುಹೊಂದಿಸಿ', check: 'ಪರೀಕ್ಷಿಸಿ', next_puzzle: 'ಮುಂದಿನ ಒಗಟು',
        correct: 'ಸರಿ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ', attempts: 'ಪ್ರಯತ್ನಗಳು', hints: 'ಸೂಚನೆಗಳು', keyboard_shortcuts: 'ಕೀಬೋರ್ಡ್ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು', to_navigate: 'ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು',
        exit_puzzle: 'ಪದ ಒಗಟುದಿಂದ ನಿರ್ಗಮಿಸಿ',
        help_play_tab: 'ಪ್ಲೇ ಮೋಡ್', help_practice_tab: 'ಅಭ್ಯಾಸ ಮೋಡ್', help_puzzle_tab: 'ಪದ ಒಗಟು',
        tip_practice_enter: '🎯 <strong>ಅಭ್ಯಾಸ ಮೋಡ್</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Practice</strong> (ಮೊಬೈಲ್) ಅಥವಾ ಹೆಡರ್ ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡಿ. ಪದಗಳು ಮರೆಯಾಗಿರುತ್ತವೆ — ಟ್ಯಾಪ್ ಮಾಡಿ ಬಹಿರಂಗಪಡಿಸಿ.',
        tip_practice_reveal: '👁️ <strong>ಬಹಿರಂಗಪಡಿಸಿ</strong>: ಮರೆಯಾದ ಪದಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಹಂತ ಹಂತವಾಗಿ ಅಕ್ಷರಗಳನ್ನು ತೋರಿಸಿ. "ಬಹಿರಂಗಪಡಿಸಿ" ಬಟನ್‌ನಿಂದ ಪೂರ್ಣ ಸಾಲು ತಕ್ಷಣ ನೋಡಿ.',
        tip_practice_navigate: '🧭 <strong>ನ್ಯಾವಿಗೇಟ್</strong>: ← → ಕೀಲಿಗಳು, ಸ್ವೈಪ್, ಅಥವಾ ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು. ಅಧ್ಯಾಯ ಸಾಲುಗಳು ಸ್ವಯಂ ಬಿಟ್ಟುಹೋಗುತ್ತವೆ. <strong>⌘K</strong> ಹುಡುಕಲು.',
        tip_puzzle_enter: '🧩 <strong>ಪದ ಒಗಟು</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Puzzle</strong> (ಮೊಬೈಲ್) ಅಥವಾ ಹೆಡರ್ ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡಿ. ಅಸ್ತವ್ಯಸ್ತ ಪದಗಳನ್ನು ಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.',
        tip_puzzle_arrange: '🧩 <strong>ಆಟ</strong>: ಪದಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಇರಿಸಿ. ಸೂಚನೆಗಳು ಆರಂಭದಿಂದ ಪದಗಳನ್ನು ತೋರಿಸುತ್ತವೆ. ಮೊದಲ ಪ್ರಯತ್ನದಲ್ಲೇ ಪರಿಹರಿಸಿ ಕಾನ್ಫೆಟ್ಟಿ ಪಡೆಯಿರಿ!',
        tip_puzzle_navigate: '🧭 <strong>ನ್ಯಾವಿಗೇಟ್</strong>: ← → ಕೀಲಿಗಳು, ಸ್ವೈಪ್, ಅಥವಾ ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು ಒಗಟುಗಳ ನಡುವೆ.',
        chapters_title: 'ಅಧ್ಯಾಯಗಳು',
        chapters_hint: 'ಅಧ್ಯಾಯದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಲ್ಲಿಗೆ ಜಿಗಿಯಿರಿ; ಪ್ಲೇಬ್ಯಾಕ್ ಹಸ್ತಚಾಲಿತದಲ್ಲೇ ಇರುತ್ತದೆ.',
        close: 'ಮುಚ್ಚಿ',
        help_account_tab: 'ಖಾತೆ ಮತ್ತು ಪ್ರಗತಿ',
        tip_account_login: '🔐 Google ನೊಂದಿಗೆ <strong>ಸೈನ್ ಇನ್</strong> ಮಾಡಿ — ಪ್ರಗತಿ ಎಲ್ಲಾ ಸಾಧನಗಳಲ್ಲಿ ಸಿಂಕ್ ಆಗುತ್ತದೆ. ಅತಿಥಿ ಮೋಡ್‌ನಲ್ಲಿ ಪ್ರಗತಿ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಯುತ್ತದೆ.',
        tip_account_streaks: '🔥 <strong>ಸ್ಟ್ರೀಕ್</strong>: ಪ್ರತಿದಿನ ಕನಿಷ್ಠ ಒಂದು ಸಾಲು ಪೂರ್ಣಗೊಳಿಸಿ ಸ್ಟ್ರೀಕ್ ಬೆಳೆಸಿ.',
        tip_account_badges: '🏆 <strong>ಬ್ಯಾಡ್ಜ್‌ಗಳು</strong>: ಮೊದಲ ಸಾಲು, 7-ದಿನ ಸ್ಟ್ರೀಕ್, ಸ್ತೋತ್ರ ಮಾಸ್ಟರಿ ಮುಂತಾದ ಮೈಲಿಗಲ್ಲುಗಳಿಗೆ ಸಾಧನೆಗಳನ್ನು ಗಳಿಸಿ.',
        tip_account_leaderboard: '🏅 <strong>ಲೀಡರ್‌ಬೋರ್ಡ್</strong>: ಸಾಪ್ತಾಹಿಕ, ಮಾಸಿಕ ಮತ್ತು ಸರ್ವಕಾಲಿಕ ಶ್ರೇಣಿಗಳು.'
      },
      tel: {
        app_title: 'అవబోధక', app_subtitle: 'విష్ణు సహస్రనామ',
        search: 'వెతకండి', help: 'సహాయం', howto: 'ఎలా వాడాలి', play: 'ప్లే', pause: 'మాన్యువల్', pace: 'వేగం', tips: 'సూచనలు', footer_hint: 'పంక్తుల నడువే హోగలు బాణ కీలు లేదా స్వైప్ బళసండి.',
        tip_play: '🔊 <strong>TTS ఆడియో</strong>: హెడర్‌లో స్పీకర్ ఐకాన్ టాగుల్ చేయండి (లేదా <strong>Space</strong> నొక్కండి) — పంక్తి మారినప్పుడు ఆడియో ఆటోమాటిగ్గా ప్లే అవుతుంది. <strong>స్వైప్</strong> లేదా <strong>← →</strong> నావిగేట్ చేయడానికి.',
        tip_pace: '📱 <strong>మొబైల్</strong>: కుడి అంచున <strong>⋮</strong> ట్యాబ్ ట్యాప్ చేయండి — మోడ్ మార్చండి, వివరాలు చూడండి, లేదా సెట్టింగ్స్ తెరవండి.',
        tip_search: '🔍 <strong>సెర్చ్</strong>: <strong>⌘K</strong> లేదా <strong>/</strong> నొక్కండి. ఫలితంపై ట్యాప్ చేసి అక్కడికి వెళ్లండి.',
        tip_chapters: '📖 <strong>శ్లోక వివరాలు</strong>: డాక్‌లో <strong>Details</strong> (మొబైల్) లేదా info ఐకాన్ — అర్థాలు మరియు పద విశ్లేషణ.',
        practice: 'అభ్యాసం', practice_mode: 'అభ్యాస మోడ్', difficulty: 'కష్టం', easy: 'సులభం', medium: 'మధ్యస్థ', hard: 'కఠినం',
        jump_to_line: 'వెళ్లు...', reveal: 'వెల్లడించు', replay_line: 'లైన్ రీప్లే', revealed: 'వెల్లడించబడింది', practiced: 'అభ్యసించబడింది', progress: 'పురోగతి', exit_practice: 'అభ్యాసం నుండి నిష్క్రమించు', line: 'లైన్',
        practice_hint: 'పదాలను చూపించడానికి ఖాళీలను ట్యాప్ చేయండి', practice_complete: 'శ్లోకం అభ్యసించబడింది!', practice_progress: 'పురోగతి',
        puzzle_mode: 'పజిల్ మోడ్', puzzle_hint: 'పదాలను సరైన క్రమంలో అమర్చడానికి క్రింద ట్యాప్ చేయండి', puzzle_complete: 'పజిల్ పరిష్కరించబడింది!',
        tap_to_arrange: 'అందుబాటులో ఉన్న పదాలు', your_arrangement: 'మీ అమరిక', try_again: 'సరిగ్గా లేదు! మళ్లీ ప్రయత్నించండి',
        get_hint: 'సూచన పొందండి', hint: 'సూచన', reset_puzzle: 'పజిల్ రీసెట్ చేయండి', reset: 'రీసెట్', check: 'తనిఖీ చేయండి', next_puzzle: 'తదుపరి పజిల్',
        correct: 'సరైనది', completed: 'పూర్తయింది', attempts: 'ప్రయత్నాలు', hints: 'సూచనలు', keyboard_shortcuts: 'కీబోర్డ్ షార్ట్‌కట్‌లు', to_navigate: 'నావిగేట్ చేయడానికి',
        help_play_tab: 'ప్లే మోడ్', help_practice_tab: 'అభ్యాస మోడ్', help_puzzle_tab: 'పజిల్ మోడ్',
        tip_practice_enter: '🎯 <strong>అభ్యాస మోడ్</strong>: డాక్‌లో <strong>Practice</strong> (మొబైల్) లేదా హెడర్ ఐకాన్ ట్యాప్ చేయండి. పదాలు దాచబడతాయి — ట్యాప్ చేసి వెల్లడించండి.',
        tip_practice_reveal: '👁️ <strong>వెల్లడించు</strong>: దాచిన పదాలను ట్యాప్ చేసి అక్షరాలను దశలవారీగా చూడండి. "వెల్లడించు" బటన్‌తో పూర్తి పంక్తి వెంటనే చూడండి.',
        tip_practice_navigate: '🧭 <strong>నావిగేట్</strong>: ← → కీలు, స్వైప్, లేదా మునుపటి/తర్వాత బటన్‌లు. అధ్యాయ పంక్తులు స్వయంచాలకంగా దాటవేయబడతాయి. <strong>⌘K</strong> సెర్చ్ కోసం.',
        tip_puzzle_enter: '🧩 <strong>పజిల్ మోడ్</strong>: డాక్‌లో <strong>Puzzle</strong> (మొబైల్) లేదా హెడర్ ఐకాన్ ట్యాప్ చేయండి. అస్తవ్యస్త పదాలను క్రమంలో అమర్చండి.',
        tip_puzzle_arrange: '🧩 <strong>ఆడండి</strong>: పదాలను ట్యాప్ చేసి అమర్చండి. సూచనలు మొదటి నుండి పదాలను వెల్లడిస్తాయి. మొదటి ప్రయత్నంలో పరిష్కరించి కాన్ఫెట్టి పొందండి!',
        tip_puzzle_navigate: '🧭 <strong>నావిగేట్</strong>: ← → కీలు, స్వైప్, లేదా మునుపటి/తర్వాత బటన్‌లు పజిల్స్ మధ్య.',
        chapters_title: 'అధ్యాయాలు',
        chapters_hint: 'అధ్యాయం పై ట్యాప్ చేసి అక్కడికి జంప్ అవ్వండి; ప్లేబ్యాక్ మాన్యువల్‌లోనే ఉంటుంది.',
        close: 'మూసివేయి',
        help_account_tab: 'ఖాతా & పురోగతి',
        tip_account_login: '🔐 Google తో <strong>సైన్ ఇన్</strong> చేయండి — పురోగతి అన్ని పరికరాలలో సింక్ అవుతుంది. అతిథి మోడ్‌లో పురోగతి స్థానికంగా సేవ్ అవుతుంది.',
        tip_account_streaks: '🔥 <strong>స్ట్రీక్</strong>: ప్రతిరోజూ కనీసం ఒక పంక్తి పూర్తి చేసి స్ట్రీక్ పెంచండి.',
        tip_account_badges: '🏆 <strong>బ్యాడ్జీలు</strong>: మొదటి లైన్, 7-రోజుల స్ట్రీక్, స్తోత్ర మాస్టరీ వంటి మైలురాళ్లకు సాధనలు సంపాదించండి.',
        tip_account_leaderboard: '🏅 <strong>లీడర్‌బోర్డ్</strong>: వారపు, నెలవారీ మరియు సర్వకాలిక ర్యాంకింగ్‌లు.',

      },
      tam: {
        app_title: 'அவபோதக', app_subtitle: 'விஷ்ணு ஸஹஸ்ரநாமம்',
        search: 'தேடு', help: 'உதவி', howto: 'பயன்படுத்துவது எப்படி', play: 'இயக்கு', pause: 'கைமுறை', pace: 'வேகம்', tips: 'உதவிக்குறிப்புகள்', footer_hint: 'தொடங்க ப்ளே அழுத்தவும்; வேகத்தை விருப்பப்படி அமைக்கவும்.',
        tip_play: '🔊 <strong>TTS ஆடியோ</strong>: ஹெடரில் ஸ்பீக்கர் ஐகானை டாகிள் செய்யுங்கள் (அல்லது <strong>Space</strong> அழுத்தவும்) — வரி மாறும்போது ஆடியோ தானாகவே இயங்கும். <strong>ஸ்வைப்</strong> அல்லது <strong>← →</strong> வழிசெலுத்த.',
        tip_pace: '📱 <strong>மொபைல்</strong>: வலது ஓரத்தில் <strong>⋮</strong> டேப்பைத் தட்டவும் — முறைகள் மாற்ற, விவரங்கள் பார்க்க, அமைப்புகள் திறக்க.',
        tip_search: '🔍 <strong>தேடு</strong>: <strong>⌘K</strong> அல்லது <strong>/</strong> அழுத்தவும். முடிவைத் தட்டி அங்கு செல்லவும்.',
        tip_chapters: '📖 <strong>ஸ்லோக விவரங்கள்</strong>: டாக்கில் <strong>Details</strong> (மொபைல்) அல்லது info ஐகான் — அர்த்தங்கள் மற்றும் சொல் பகுப்பாய்வு.',
        practice: 'பயிற்சி', practice_mode: 'பயிற்சி முறை', difficulty: 'சிரமம்', easy: 'எளிது', medium: 'நடுத்தரம்', hard: 'கடினம்',
        jump_to_line: 'செல்லு...', reveal: 'வெளிப்படுத்து', replay_line: 'வரியை மீண்டும் இயக்கு', revealed: 'வெளிப்படுத்தப்பட்டது', practiced: 'பயிற்சி செய்யப்பட்டது', progress: 'முன்னேற்றம்', exit_practice: 'பயிற்சியில் இருந்து வெளியேறு', line: 'வரி',
        practice_hint: 'சொற்களைக் காட்ட வெற்றிடங்களைத் தட்டவும்', practice_complete: 'சொக்கம் பயிற்சி செய்யப்பட்டது!', practice_progress: 'முன்னேற்றம்',
        puzzle_mode: 'புதிர் முறை', puzzle_hint: 'சொற்களை சரியான வரிசையில் அமைக்க கீழே தட்டவும்', puzzle_complete: 'புதிர் தீர்க்கப்பட்டது!',
        tap_to_arrange: 'கிடைக்கும் சொற்கள்', your_arrangement: 'உங்கள் அமைப்பு', try_again: 'சரியல்ல! மீண்டும் முயற்சிக்கவும்',
        get_hint: 'குறிப்பு பெறு', hint: 'குறிப்பு', reset_puzzle: 'புதிரை மீட்டமை', reset: 'மீட்டமை', check: 'சரிபார்', next_puzzle: 'அடுத்த புதிர்',
        correct: 'சரி', completed: 'முடிந்தது', attempts: 'முயற்சிகள்', hints: 'குறிப்புகள்', keyboard_shortcuts: 'கீபோர்ட் குறுக்குவழிகள்', to_navigate: 'நகர்த்த',
        help_play_tab: 'ப்ளே முறை', help_practice_tab: 'பயிற்சி முறை', help_puzzle_tab: 'புதிர் முறை',
        tip_practice_enter: '🎯 <strong>பயிற்சி முறை</strong>: டாக்கில் <strong>Practice</strong> (மொபைல்) அல்லது ஹெடர் ஐகான் தட்டவும். சொற்கள் மறைக்கப்பட்டிருக்கும் — தட்டி வெளிப்படுத்தவும்.',
        tip_practice_reveal: '👁️ <strong>வெளிப்படுத்து</strong>: மறைக்கப்பட்ட சொற்களைத் தட்டி படிப்படியாக எழுத்துக்களைக் காட்டவும். "வெளிப்படுத்து" பொத்தானால் முழு வரியையும் உடனடியாகக் காணலாம்.',
        tip_practice_navigate: '🧭 <strong>நகர்த்து</strong>: ← → விசைகள், ஸ்வைப், அல்லது முந்தைய/அடுத்த பொத்தான்கள். அத்தியாய வரிகள் தானாகத் தவிர்க்கப்படும். <strong>⌘K</strong> தேடலுக்கு.',
        tip_puzzle_enter: '🧩 <strong>புதிர் முறை</strong>: டாக்கில் <strong>Puzzle</strong> (மொபைல்) அல்லது ஹெடர் ஐகான் தட்டவும். குழப்பமான சொற்களை வரிசையில் அமைக்கவும்.',
        tip_puzzle_arrange: '🧩 <strong>விளையாடு</strong>: சொற்களைத் தட்டி அமைக்கவும். குறிப்புகள் ஆரம்பத்திலிருந்து சொற்களை வெளிப்படுத்தும். முதல் முயற்சியிலேயே தீர்க்க கான்ஃபெட்டி!',
        tip_puzzle_navigate: '🧭 <strong>நகர்த்து</strong>: ← → விசைகள், ஸ்வைப், அல்லது முந்தைய/அடுத்த பொத்தான்கள் புதிர்களுக்கிடையே.',
        chapters_title: 'அத்தியாயங்கள்',
        chapters_hint: 'ஒரு அத்தியாயத்தைத் தட்டினால் அந்த இடத்திற்குச் செல்கிறது; பிளே மானுவல் நிலையிலேயே இருக்கும்.',
        close: 'மூடு',
        help_account_tab: 'கணக்கு & முன்னேற்றம்',
        tip_account_login: '🔐 Google மூலம் <strong>உள்நுழையவும்</strong> — முன்னேற்றம் அனைத்து சாதனங்களிலும் ஒத்திசைக்கப்படும். விருந்தினர் முறையில் முன்னேற்றம் உள்ளூரில் சேமிக்கப்படும்.',
        tip_account_streaks: '🔥 <strong>ஸ்ட்ரீக்</strong>: ஒவ்வொரு நாளும் குறைந்தது ஒரு வரியை முடித்து ஸ்ட்ரீக்கை வளர்க்கவும்.',
        tip_account_badges: '🏆 <strong>பேட்ஜ்கள்</strong>: முதல் வரி, 7-நாள் ஸ்ட்ரீக், ஸ்தோத்திர மாஸ்டரி போன்ற மைல்கற்களுக்கு சாதனைகள் பெறுங்கள்.',
        tip_account_leaderboard: '🏅 <strong>தரவரிசை</strong>: வாராந்திர, மாதாந்திர மற்றும் அனைத்து-நேர தரவரிசைகள்.',

      },
      guj: {
        app_title: 'અવબોધક', app_subtitle: 'વિષ્ણુ સહસ્રનામ',
        search: 'શોધો', help: 'મદદ', howto: 'કેવી રીતે વાપરવું', play: 'ચાલુ', pause: 'મેન્યુઅલ', pace: 'ગતિ', tips: 'સૂચનો', footer_hint: 'શરૂ કરવા પ્લે દબાવો; ગતિને પસંદ મુજબ સમાયોજિત કરો.',
        tip_play: '🔊 <strong>TTS ઓડિયો</strong>: હેડરમાં સ્પીકર આઇકન ટૉગલ કરો (અથવા <strong>Space</strong> દબાવો) — લાઇન બદલાય ત્યારે ઓડિયો આપોઆપ વાગે છે. <strong>સ્વાઇપ</strong> અથવા <strong>← →</strong> નેવિગેટ કરવા.',
        tip_pace: '📱 <strong>મોબાઇલ</strong>: જમણી ધારે <strong>⋮</strong> ટૅબ ટૅપ કરો — મોડ બદલો, વિગત જુઓ, અથવા સેટિંગ્સ ખોલો.',
        tip_search: '🔍 <strong>શોધ</strong>: <strong>⌘K</strong> અથવા <strong>/</strong> દબાવો. પરિણામ ટૅપ કરી ત્યાં જાઓ.',
        tip_chapters: '📖 <strong>શ્લોક વિગત</strong>: ડોકમાં <strong>Details</strong> (મોબાઇલ) અથવા info આઇકન — અર્થો અને શબ્દ વિશ્લેષણ.',
        practice: 'પ્રેક્ટિસ', practice_mode: 'પ્રેક્ટિસ મોડ', difficulty: 'મુશ્કેલી', easy: 'સરળ', medium: 'મધ્યમ', hard: 'મુશ્કેલ',
        jump_to_line: 'જાઓ...', reveal: 'દેખાડો', replay_line: 'લાઈન રિપ્લે કરો', revealed: 'દેખાડ્યું', practiced: 'અભ્યાસ કર્યો', progress: 'પ્રગતિ', exit_practice: 'પ્રેક્ટિસમાંથી બહાર નીકળો', line: 'લાઈન',
        practice_hint: 'શબ્દો દર્શાવવા માટે ખાલી જગ્યાઓ ટૅપ કરો', practice_complete: 'શ્લોક અભ્યાસ કર્યો!', practice_progress: 'પ્રગતિ',
        help_play_tab: 'પ્લે મોડ', help_practice_tab: 'પ્રેક્ટિસ મોડ', help_puzzle_tab: 'વર્ડ પઝલ',
        tip_practice_enter: '🎯 <strong>પ્રેક્ટિસ મોડ</strong>: ડોકમાં <strong>Practice</strong> (મોબાઇલ) અથવા હેડર આઇકન ટૅપ કરો. શબ્દો છુપાયેલા હોય છે — ટૅપ કરી દેખાડો.',
        tip_practice_reveal: '👁️ <strong>દેખાડો</strong>: છુપાયેલા શબ્દો ટૅપ કરી ધીમે ધીમે અક્ષરો જુઓ. "દેખાડો" બટનથી પૂરી લાઇન તરત જુઓ.',
        tip_practice_navigate: '🧭 <strong>નેવિગેટ</strong>: ← → કી, સ્વાઇપ, અથવા Previous/Next બટન. અધ્યાય લાઇન આપોઆપ છોડાય છે. <strong>⌘K</strong> શોધવા.',
        tip_puzzle_enter: '🧩 <strong>પઝલ મોડ</strong>: ડોકમાં <strong>Puzzle</strong> (મોબાઇલ) અથવા હેડર આઇકન ટૅપ કરો. ગૂંચવાયેલા શબ્દો ક્રમમાં ગોઠવો.',
        tip_puzzle_arrange: '🧩 <strong>રમો</strong>: શબ્દો ટૅપ કરી ગોઠવો. સંકેતો શરૂઆતથી શબ્દો દેખાડે છે. પ્રથમ પ્રયત્ને ઉકેલો — કન્ફેટી!',
        tip_puzzle_navigate: '🧭 <strong>નેવિગેટ</strong>: ← → કી, સ્વાઇપ, અથવા Previous/Next બટન પઝલ વચ્ચે.',
        help_account_tab: 'એકાઉન્ટ અને પ્રગતિ',
        tip_account_login: '🔐 Google વડે <strong>સાઇન ઇન</strong> કરો — પ્રગતિ બધા ઉપકરણો પર સિંક થશે. મહેમાન મોડમાં પ્રગતિ સ્થાનિક રીતે સેવ થાય છે.',
        tip_account_streaks: '🔥 <strong>સ્ટ્રીક</strong>: દરરોજ ઓછામાં ઓછી એક લાઇન પૂર્ણ કરી સ્ટ્રીક વધારો.',
        tip_account_badges: '🏆 <strong>બેજ</strong>: પહેલી લાઇન, 7-દિવસ સ્ટ્રીક, સ્તોત્ર માસ્ટરી જેવા મુકામ પર સિદ્ધિઓ મેળવો.',
        tip_account_leaderboard: '🏅 <strong>લીડરબોર્ડ</strong>: સાપ્તાહિક, માસિક અને સર્વકાલીન રેન્કિંગ.',

      },
      pan: {
        app_title: 'ਅਵਬੋਧਕ', app_subtitle: 'ਵਿਸ਼੍ਣੁ ਸਹਸ੍ਰ ਨਾਮ',
        search: 'ਖੋਜ', help: 'ਮਦਦ', howto: 'ਕਿਵੇਂ ਵਰਤਣਾ ਹੈ', play: 'ਚਲਾਓ', pause: 'ਮੈਨੁਅਲ', pace: 'ਗਤੀ', tips: 'ਸੁਝਾਅ', footer_hint: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਪਲੇ ਦਬਾਓ; ਗਤੀ ਆਪਣੀ ਪਸੰਦ ਅਨੁਸਾਰ ਸੈੱਟ ਕਰੋ।',
        tip_play: '🔊 <strong>TTS ਆਡੀਓ</strong>: ਹੇਡਰ ਵਿੱਚ ਸਪੀਕਰ ਆਈਕਨ ਟੌਗਲ ਕਰੋ (ਜਾਂ <strong>Space</strong> ਦਬਾਓ) — ਲਾਈਨ ਬਦਲਣ ਤੇ ਆਡੀਓ ਆਪਣੇ ਆਪ ਚੱਲਦੀ ਹੈ। <strong>ਸਵਾਈਪ</strong> ਜਾਂ <strong>← →</strong> ਨੇਵੀਗੇਟ ਕਰਨ ਲਈ।',
        tip_pace: '📱 <strong>ਮੋਬਾਈਲ</strong>: ਸੱਜੇ ਪਾਸੇ <strong>⋮</strong> ਟੈਬ ਟੈਪ ਕਰੋ — ਮੋਡ ਬਦਲੋ, ਵੇਰਵੇ ਵੇਖੋ, ਜਾਂ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੋ।',
        tip_search: '🔍 <strong>ਖੋਜ</strong>: <strong>⌘K</strong> ਜਾਂ <strong>/</strong> ਦਬਾਓ। ਨਤੀਜੇ ਟੈਪ ਕਰੋ ਉੱਥੇ ਜਾਣ ਲਈ।',
        tip_chapters: '📖 <strong>ਸ਼ਲੋਕ ਵੇਰਵੇ</strong>: ਡੌਕ ਵਿੱਚ <strong>Details</strong> (ਮੋਬਾਈਲ) ਜਾਂ info ਆਈਕਨ — ਅਰਥ ਅਤੇ ਸ਼ਬਦ ਵਿਸ਼ਲੇਸ਼ਣ।',
        practice: 'ਅਭਿਆਸ', practice_mode: 'ਅਭਿਆਸ ਮੋਡ', difficulty: 'ਮੁਸ਼ਕਲ', easy: 'ਆਸਾਨ', medium: 'ਮੱਧਮ', hard: 'ਔਖਾ',
        jump_to_line: 'ਜਾਓ...', reveal: 'ਦਿਖਾਓ', replay_line: 'ਲਾਈਨ ਦੁਹਰਾਓ', revealed: 'ਦਿਖਾਇਆ ਗਿਆ', practiced: 'ਅਭਿਆਸ ਕੀਤਾ', progress: 'ਤਰੱਕੀ', exit_practice: 'ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ', line: 'ਲਾਈਨ',
        practice_hint: 'ਸ਼ਬਦ ਦਿਖਾਉਣ ਲਈ ਖਾਲੀ ਟੈਪ ਕਰੋ', practice_complete: 'ਸ਼ਲੋਕ ਅਭਿਆਸ ਕੀਤਾ!', practice_progress: 'ਤਰੱਕੀ',
        help_play_tab: 'ਪਲੇ ਮੋਡ', help_practice_tab: 'ਅਭਿਆਸ ਮੋਡ', help_puzzle_tab: 'ਵਰਡ ਪਜ਼ਲ',
        tip_practice_enter: '🎯 <strong>ਅਭਿਆਸ ਮੋਡ</strong>: ਡੌਕ ਵਿੱਚ <strong>Practice</strong> (ਮੋਬਾਈਲ) ਜਾਂ ਹੇਡਰ ਆਈਕਨ ਟੈਪ ਕਰੋ। ਸ਼ਬਦ ਲੁਕੇ ਹੁੰਦੇ ਹਨ — ਟੈਪ ਕਰੋ ਦਿਖਾਉਣ ਲਈ।',
        tip_practice_reveal: '👁️ <strong>ਦਿਖਾਓ</strong>: ਲੁਕੇ ਸ਼ਬਦ ਟੈਪ ਕਰੋ — ਹਰ ਟੈਪ ਨਾਲ ਹੋਰ ਅੱਖਰ ਦਿੱਸਦੇ ਹਨ। "ਦਿਖਾਓ" ਬਟਨ ਨਾਲ ਪੂਰੀ ਲਾਈਨ ਫੌਰਨ ਦੇਖੋ।',
        tip_practice_navigate: '🧭 <strong>ਨੇਵੀਗੇਟ</strong>: ← → ਕੁੰਜੀਆਂ, ਸਵਾਈਪ, ਜਾਂ ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨ। ਅਧਿਆਇ ਲਾਈਨਾਂ ਆਪਣੇ ਆਪ ਛੱਡੀਆਂ ਜਾਂਦੀਆਂ ਹਨ। <strong>⌘K</strong> ਖੋਜਣ ਲਈ।',
        tip_puzzle_enter: '🧩 <strong>ਪਜ਼ਲ ਮੋਡ</strong>: ਡੌਕ ਵਿੱਚ <strong>Puzzle</strong> (ਮੋਬਾਈਲ) ਜਾਂ ਹੇਡਰ ਆਈਕਨ ਟੈਪ ਕਰੋ। ਗੁੰਝਲਦਾਰ ਸ਼ਬਦਾਂ ਨੂੰ ਸਹੀ ਕ੍ਰਮ ਵਿੱਚ ਲਗਾਓ।',
        tip_puzzle_arrange: '🧩 <strong>ਖੇਡੋ</strong>: ਸ਼ਬਦ ਟੈਪ ਕਰਕੇ ਲਗਾਓ। ਸੰਕੇਤ ਸ਼ੁਰੂ ਤੋਂ ਸ਼ਬਦ ਦਿਖਾਉਂਦੇ ਹਨ। ਪਹਿਲੇ ਯਤਨ ਵਿੱਚ ਹੱਲ ਕਰੋ — ਕਨਫੈਟੀ!',
        tip_puzzle_navigate: '🧭 <strong>ਨੇਵੀਗੇਟ</strong>: ← → ਕੁੰਜੀਆਂ, ਸਵਾਈਪ, ਜਾਂ ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨ ਪਜ਼ਲਾਂ ਵਿਚਕਾਰ।',
        chapters_title: 'ਅਧਿਆਇ',
        chapters_hint: "ਅਧਿਆਇ 'ਤੇ ਟੈਪ ਕਰਕੇ ਉੱਥੇ ਜਾਓ; ਪਲੇਬੈਕ ਮੈਨੁਅਲ ਸਥਿਤੀ ਵਿੱਚ ਹੀ ਰਹਿੰਦਾ ਹੈ।",
        close: 'ਬੰਦ ਕਰੋ',
        help_account_tab: 'ਖਾਤਾ ਅਤੇ ਤਰੱਕੀ',
        tip_account_login: '🔐 Google ਨਾਲ <strong>ਸਾਈਨ ਇਨ</strong> ਕਰੋ — ਤਰੱਕੀ ਸਾਰੇ ਡਿਵਾਈਸਾਂ ਤੇ ਸਿੰਕ ਹੋਵੇਗੀ। ਮਹਿਮਾਨ ਮੋਡ ਵਿੱਚ ਤਰੱਕੀ ਸਥਾਨਕ ਤੌਰ ਤੇ ਸੇਵ ਹੁੰਦੀ ਹੈ।',
        tip_account_streaks: '🔥 <strong>ਸਟ੍ਰੀਕ</strong>: ਰੋਜ਼ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਲਾਈਨ ਪੂਰੀ ਕਰਕੇ ਸਟ੍ਰੀਕ ਵਧਾਓ।',
        tip_account_badges: '🏆 <strong>ਬੈਜ</strong>: ਪਹਿਲੀ ਲਾਈਨ, 7-ਦਿਨ ਸਟ੍ਰੀਕ, ਸਤੋਤਰ ਮਾਸਟਰੀ ਵਰਗੇ ਮੀਲ ਪੱਥਰਾਂ ਲਈ ਪ੍ਰਾਪਤੀਆਂ ਕਮਾਓ।',
        tip_account_leaderboard: '🏅 <strong>ਲੀਡਰਬੋਰਡ</strong>: ਹਫ਼ਤਾਵਾਰੀ, ਮਹੀਨਾਵਾਰ ਅਤੇ ਸਰਬ-ਸਮੇਂ ਦੀ ਰੈਂਕਿੰਗ।',

      },
      mr: {
        app_title: 'अवबोधक', app_subtitle: 'विष्णु सहस्रनाम',
        search: 'शोधा', help: 'मदत', howto: 'कसे वापरायचे', play: 'प्ले', pause: 'मॅन्युअल', pace: 'गती', tips: 'सूचना', footer_hint: 'सुरू करण्यासाठी प्ले दाबा; गती समायोजित करा.',
        tip_play: '🔊 <strong>TTS ऑडिओ</strong>: हेडरमधील स्पीकर आयकॉन टॉगल करा (किंवा <strong>Space</strong> दाबा) — ओळ बदलताना ऑडिओ आपोआप वाजतो. <strong>स्वाइप</strong> किंवा <strong>← →</strong> नेव्हिगेट करण्यासाठी.',
        tip_pace: '📱 <strong>मोबाइल</strong>: उजव्या कडेला <strong>⋮</strong> टॅब टॅप करा — मोड बदला, तपशील पहा, किंवा सेटिंग्ज उघडा.',
        tip_search: '🔍 <strong>शोध</strong>: <strong>⌘K</strong> किंवा <strong>/</strong> दाबा. निकालावर टॅप करा तेथे जाण्यासाठी.',
        tip_chapters: '📖 <strong>श्लोक तपशील</strong>: डॉकमध्ये <strong>Details</strong> (मोबाइल) किंवा info आयकॉन — अर्थ आणि शब्द विश्लेषण.',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'अडचण', easy: 'सोपे', medium: 'मध्यम', hard: 'कठीण',
        jump_to_line: 'जा...', reveal: 'दाखवा', replay_line: 'ओळ पुन्हा चालू करा', revealed: 'दाखवले', practiced: 'अभ्यास केला', progress: 'प्रगती', exit_practice: 'अभ्यासातून बाहेर पडा', line: 'ओळ',
        practice_hint: 'शब्द दाखवण्यासाठी रिक्त ठिकाणे टॅप करा', practice_complete: 'श्लोक सराव केला!', practice_progress: 'प्रगती',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'वर्ड पझल',
        tip_practice_enter: '🎯 <strong>अभ्यास मोड</strong>: डॉकमध्ये <strong>Practice</strong> (मोबाइल) किंवा हेडर आयकॉन टॅप करा. शब्द लपलेले असतात — टॅप करून दाखवा.',
        tip_practice_reveal: '👁️ <strong>दाखवा</strong>: लपलेले शब्द टॅप करा — प्रत्येक टॅप अधिक अक्षरे दाखवतो. "दाखवा" बटणाने पूर्ण ओळ लगेच पहा.',
        tip_practice_navigate: '🧭 <strong>नेव्हिगेट</strong>: ← → की, स्वाइप, किंवा मागील/पुढील बटणे. अध्याय ओळी आपोआप वगळल्या जातात. <strong>⌘K</strong> शोधासाठी.',
        tip_puzzle_enter: '🧩 <strong>पझल मोड</strong>: डॉकमध्ये <strong>Puzzle</strong> (मोबाइल) किंवा हेडर आयकॉन टॅप करा. गोंधळलेले शब्द क्रमाने लावा.',
        tip_puzzle_arrange: '🧩 <strong>खेळा</strong>: शब्द टॅप करून ठेवा. संकेत सुरुवातीपासून शब्द दाखवतात. पहिल्याच प्रयत्नात सोडवा — कॉन्फेटी!',
        tip_puzzle_navigate: '🧭 <strong>नेव्हिगेट</strong>: ← → की, स्वाइप, किंवा मागील/पुढील बटणे पझलमध्ये.',
        help_account_tab: 'खाते आणि प्रगती',
        tip_account_login: '🔐 Google ने <strong>साइन इन</strong> करा — प्रगती सर्व उपकरणांवर सिंक होईल. अतिथी मोडमध्ये प्रगती स्थानिक पातळीवर जतन होते.',
        tip_account_streaks: '🔥 <strong>स्ट्रीक</strong>: दररोज किमान एक ओळ पूर्ण करून स्ट्रीक वाढवा.',
        tip_account_badges: '🏆 <strong>बॅज</strong>: पहिली ओळ, 7-दिवस स्ट्रीक, स्तोत्र मास्टरी यांसारख्या टप्प्यांसाठी उपलब्धी मिळवा.',
        tip_account_leaderboard: '🏅 <strong>लीडरबोर्ड</strong>: साप्ताहिक, मासिक आणि सर्वकालीन रँकिंग.',

      },
      ben: {
        app_title: 'অববোধক', app_subtitle: 'বিষ্ণু সহস্রনাম',
        search: 'খুঁজুন', help: 'সহায়তা', howto: 'কিভাবে ব্যবহার করবেন', play: 'চালান', pause: 'ম্যানুয়াল', pace: 'গতি', tips: 'টিপস', footer_hint: 'শুরু করতে প্লে চাপুন; গতি সামঞ্জস্য করুন।',
        tip_play: '🔊 <strong>TTS অডিও</strong>: হেডারে স্পিকার আইকন টগল করুন (বা <strong>Space</strong> চাপুন) — লাইন বদলালে অডিও স্বয়ংক্রিয়ভাবে চলে। <strong>সোয়াইপ</strong> বা <strong>← →</strong> নেভিগেট করতে।',
        tip_pace: '📱 <strong>মোবাইল</strong>: ডান প্রান্তে <strong>⋮</strong> ট্যাব ট্যাপ করুন — মোড বদলান, বিবরণ দেখুন, বা সেটিংস খুলুন।',
        tip_search: '🔍 <strong>খোঁজ</strong>: <strong>⌘K</strong> বা <strong>/</strong> চাপুন। ফলাফলে ট্যাপ করে সেখানে যান।',
        tip_chapters: '📖 <strong>শ্লোক বিবরণ</strong>: ডকে <strong>Details</strong> (মোবাইল) বা info আইকন — অর্থ ও শব্দ বিশ্লেষণ।',
        practice: 'অনুশীলন', practice_mode: 'অনুশীলন মোড', difficulty: 'কঠিনতা', easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন',
        jump_to_line: 'যাও...', reveal: 'দেখাও', replay_line: 'লাইন রিপ্লে করুন', revealed: 'দেখানো হয়েছে', practiced: 'অনুশীলন করা হয়েছে', progress: 'অগ্রগতি', exit_practice: 'অনুশীলন থেকে বেরোন', line: 'লাইন',
        practice_hint: 'শব্দ প্রকাশ করতে ফাঁকা জায়গা ট্যাপ করুন', practice_complete: 'শ্লোক অনুশীলন করা হয়েছে!', practice_progress: 'অগ্রগতি',
        help_play_tab: 'প্লে মোড', help_practice_tab: 'অনুশীলন মোড', help_puzzle_tab: 'শব্দ ধাঁধা',
        tip_practice_enter: '🎯 <strong>অনুশীলন মোড</strong>: ডকে <strong>Practice</strong> (মোবাইল) বা হেডার আইকন ট্যাপ করুন। শব্দ লুকানো থাকে — ট্যাপ করে প্রকাশ করুন।',
        tip_practice_reveal: '👁️ <strong>প্রকাশ</strong>: লুকানো শব্দ ট্যাপ করুন — প্রতিটি ট্যাপে আরও অক্ষর দেখায়। "দেখাও" বোতামে সম্পূর্ণ লাইন তাৎক্ষণিকভাবে দেখুন।',
        tip_practice_navigate: '🧭 <strong>নেভিগেট</strong>: ← → কী, সোয়াইপ, বা পূর্ববর্তী/পরবর্তী বোতাম। অধ্যায় লাইন স্বয়ংক্রিয়ভাবে এড়িয়ে যায়। <strong>⌘K</strong> খোঁজার জন্য।',
        tip_puzzle_enter: '🧩 <strong>শব্দ ধাঁধা</strong>: ডকে <strong>Puzzle</strong> (মোবাইল) বা হেডার আইকন ট্যাপ করুন। এলোমেলো শব্দ সঠিক ক্রমে সাজান।',
        tip_puzzle_arrange: '🧩 <strong>খেলুন</strong>: শব্দ ট্যাপ করে সাজান। সংকেত শুরু থেকে শব্দ দেখায়। প্রথম চেষ্টায় সমাধান করে কনফেটি পান!',
        tip_puzzle_navigate: '🧭 <strong>নেভিগেট</strong>: ← → কী, সোয়াইপ, বা পূর্ববর্তী/পরবর্তী বোতাম পাজলের মধ্যে।',
        help_account_tab: 'অ্যাকাউন্ট ও অগ্রগতি',
        tip_account_login: '🔐 Google দিয়ে <strong>সাইন ইন</strong> করুন — অগ্রগতি সব ডিভাইসে সিঙ্ক হবে। অতিথি মোডে অগ্রগতি স্থানীয়ভাবে সংরক্ষিত হয়।',
        tip_account_streaks: '🔥 <strong>স্ট্রিক</strong>: প্রতিদিন কমপক্ষে একটি লাইন সম্পূর্ণ করে স্ট্রিক বাড়ান।',
        tip_account_badges: '🏆 <strong>ব্যাজ</strong>: প্রথম লাইন, 7-দিনের স্ট্রিক, স্তোত্র মাস্টারি এর মতো মাইলফলকে অর্জন করুন।',
        tip_account_leaderboard: '🏅 <strong>লিডারবোর্ড</strong>: সাপ্তাহিক, মাসিক এবং সর্বকালের র্যাঙ্কিং।',

      },
      mal: {
        app_title: 'അവബോധക', app_subtitle: 'വിഷ്ണു സഹസ്രനാമം',
        search: 'തിരയുക', help: 'സഹായം', howto: 'എങ്ങനെ ഉപയോഗിക്കാം', play: 'പ്ലേ', pause: 'മാനുവൽ', pace: 'വേഗം', tips: 'ടിപ്സ്', footer_hint: 'പ്ലേ അമർത്തി ആരംഭിക്കുക; വേഗം ക്രമീകരിക്കുക.',
        tip_play: '🔊 <strong>TTS ഓഡിയോ</strong>: ഹെഡറിലെ സ്പീക്കർ ഐക്കൺ ടോഗിൾ ചെയ്യുക (അല്ലെങ്കിൽ <strong>Space</strong> അമർത്തുക) — ലൈൻ മാറുമ്പോൾ ഓഡിയോ സ്വയം പ്ലേ ആകും. <strong>സ്വൈപ്പ്</strong> അല്ലെങ്കിൽ <strong>← →</strong> നാവിഗേറ്റ് ചെയ്യാൻ.',
        tip_pace: '📱 <strong>മൊബൈൽ</strong>: വലത് അറ്റത്തെ <strong>⋮</strong> ടാബ് ടാപ്പ് ചെയ്യുക — മോഡ് മാറ്റുക, വിശദാംശങ്ങൾ കാണുക, അല്ലെങ്കിൽ സെറ്റിംഗ്സ് തുറക്കുക.',
        tip_search: '🔍 <strong>തിരയൽ</strong>: <strong>⌘K</strong> അല്ലെങ്കിൽ <strong>/</strong> അമർത്തുക. ഫലത്തിൽ ടാപ്പ് ചെയ്ത് അവിടേക്ക് പോകുക.',
        tip_chapters: '📖 <strong>ശ്ലോക വിശദാംശങ്ങൾ</strong>: ഡോക്കിൽ <strong>Details</strong> (മൊബൈൽ) അല്ലെങ്കിൽ info ഐക്കൺ — അർത്ഥവും പദ വിശകലനവും.',
        practice: 'അഭ്യസിക്കുക', practice_mode: 'അഭ്യാസ മോഡ്', difficulty: 'സങ്കീർണ്ണത', easy: 'എളുപ്പം', medium: 'ഇടത്തരം', hard: 'കഠിനം',
        jump_to_line: 'പോകൂ...', reveal: 'കാണിക്കുക', replay_line: 'ലൈൻ വീണ്ടും പ്ലേ ചെയ്യുക', revealed: 'കാണിച്ചു', practiced: 'അഭ്യസിച്ചു', progress: 'പുരോഗതി', exit_practice: 'അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക', line: 'ലൈൻ',
        practice_hint: 'വാക്കുകൾ വെളിപ്പെടുത്താൻ ശൂന്യ ഇടങ്ങൾ ടാപ്പ് ചെയ്യുക', practice_complete: 'ശ്ലോകം പരിശീലിച്ചു!', practice_progress: 'പുരോഗതി',
        help_play_tab: 'പ്ലേ മോഡ്', help_practice_tab: 'അഭ്യാസ മോഡ്', help_puzzle_tab: 'വേഡ് പസിൽ',
        tip_practice_enter: '🎯 <strong>അഭ്യാസ മോഡ്</strong>: ഡോക്കിൽ <strong>Practice</strong> (മൊബൈൽ) അല്ലെങ്കിൽ ഹെഡർ ഐക്കൺ ടാപ്പ് ചെയ്യുക. വാക്കുകൾ മറഞ്ഞിരിക്കുന്നു — ടാപ്പ് ചെയ്ത് വെളിപ്പെടുത്തുക.',
        tip_practice_reveal: '👁️ <strong>വെളിപ്പെടുത്തുക</strong>: മറഞ്ഞ വാക്കുകൾ ടാപ്പ് ചെയ്യുക — ഓരോ ടാപ്പിലും കൂടുതൽ അക്ഷരങ്ങൾ കാണിക്കുന്നു. "കാണിക്കുക" ബട്ടണിൽ മുഴുവൻ ലൈൻ ഉടനെ കാണുക.',
        tip_practice_navigate: '🧭 <strong>നാവിഗേറ്റ്</strong>: ← → കീകൾ, സ്വൈപ്പ്, അല്ലെങ്കിൽ മുൻപുള്ള/അടുത്ത ബട്ടണുകൾ. അധ്യായ വരികൾ സ്വയം ഒഴിവാക്കപ്പെടുന്നു. <strong>⌘K</strong> തിരയാൻ.',
        tip_puzzle_enter: '🧩 <strong>പസിൽ മോഡ്</strong>: ഡോക്കിൽ <strong>Puzzle</strong> (മൊബൈൽ) അല്ലെങ്കിൽ ഹെഡർ ഐക്കൺ ടാപ്പ് ചെയ്യുക. കലർന്ന വാക്കുകൾ ക്രമത്തിൽ വയ്ക്കുക.',
        tip_puzzle_arrange: '🧩 <strong>കളിക്കുക</strong>: വാക്കുകൾ ടാപ്പ് ചെയ്ത് ക്രമത്തിൽ വയ്ക്കുക. സൂചനകൾ തുടക്കം മുതൽ വാക്കുകൾ കാണിക്കുന്നു. ആദ്യ ശ്രമത്തിൽ പരിഹരിച്ച് കോൺഫെറ്റി നേടുക!',
        tip_puzzle_navigate: '🧭 <strong>നാവിഗേറ്റ്</strong>: ← → കീകൾ, സ്വൈപ്പ്, അല്ലെങ്കിൽ മുൻപുള്ള/അടുത്ത ബട്ടണുകൾ പസിലുകൾക്കിടയിൽ.',
        help_account_tab: 'അക്കൗണ്ട് & പുരോഗതി',
        tip_account_login: '🔐 Google ഉപയോഗിച്ച് <strong>സൈൻ ഇൻ</strong> ചെയ്യുക — പുരോഗതി എല്ലാ ഉപകരണങ്ങളിലും സിൻക്ക് ആകും. അതിഥി മോഡിൽ പുരോഗതി പ്രാദേശികമായി സംഭരിക്കും.',
        tip_account_streaks: '🔥 <strong>സ്ട്രീക്ക്</strong>: ദിവസവും കുറഞ്ഞത് ഒരു വരി പൂർത്തിയാക്കി സ്ട്രീക്ക് വളർത്തുക.',
        tip_account_badges: '🏆 <strong>ബാഡ്ജുകൾ</strong>: ആദ്യ വരി, 7-ദിവസ സ്ട്രീക്ക്, സ്തോത്ര മാസ്റ്ററി എന്നിവ പോലുള്ള നാഴികക്കല്ലുകൾക്ക് നേട്ടങ്ങൾ നേടുക.',
        tip_account_leaderboard: '🏅 <strong>ലീഡർബോർഡ്</strong>: ആഴ്ചതോറും, പ്രതിമാസം, എക്കാലവും റാങ്കിംഗുകൾ.',

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
            {/* Desktop Controls - Full toolbar */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
              <Select size="small" value={lang} onChange={(e: SelectChangeEvent) => { const newLang = e.target.value as Lang; setLang(newLang); analytics.languageChange(newLang); ensurePlayPauseReady(); }} sx={{ minWidth: 140 }}>
                {languageOptions.map((code) => (
                  <MenuItem key={code} value={code}>1 · {label(code)}</MenuItem>
                ))}
              </Select>
              <Select size="small" value={lang2 || ''} onChange={(e: SelectChangeEvent) => { const newLang = (e.target.value || '') as any; setLang2(newLang); if (newLang) analytics.languageChange(`${newLang}_secondary`); ensurePlayPauseReady(); }} sx={{ minWidth: 140 }} displayEmpty>
                <MenuItem value=""><em>2 · —</em></MenuItem>
                {languageOptions.filter(code => code !== lang).map((code) => (
                  <MenuItem key={code} value={code}>2 · {label(code)}</MenuItem>
                ))}
              </Select>
              <Tooltip title={verseDetailOpen ? "Hide Verse Details" : "Show Verse Details"}>
                <IconButton
                  color={verseDetailOpen ? 'primary' : 'inherit'}
                  onClick={() => {
                    setVerseDetailOpen(prev => !prev);
                    analytics.featureAction('verse_detail', verseDetailOpen ? 'closed' : 'opened');
                  }}
                  aria-label={verseDetailOpen ? "Hide Verse Details" : "View Verse Details"}
                  sx={{
                    bgcolor: verseDetailOpen ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                    '&:hover': { bgcolor: verseDetailOpen ? 'rgba(14, 165, 233, 0.25)' : 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={viewMode === 'reading' ? 'Practice Mode' : 'Reading Mode'}>
                <IconButton
                  color={viewMode === 'practice' ? 'primary' : 'inherit'}
                  onClick={() => {
                    const currentMode = viewMode === 'reading' ? 'play' : viewMode === 'practice' ? 'practice' : 'puzzle';
                    const newMode = viewMode === 'reading' ? 'practice' : 'reading';

                    // Auto-stop TTS when switching to practice mode
                    if (newMode === 'practice' && ttsPlaying && lineTTSPlayer) {
                      lineTTSPlayer.stop();
                      analytics.playAction('pause');
                    }

                    // Track mode exit with time spent and actions
                    const durationSeconds = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
                    analytics.modeExit(currentMode === 'puzzle' ? 'practice' : currentMode as 'play' | 'practice', durationSeconds, modeActionCountRef.current);

                    // Sync line position across modes
                    if (newMode === 'practice') {
                      setPracticeLineIndex(flow.state.lineIndex);
                    } else {
                      flow.seekLine(practiceLineIndex);
                    }

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

                    // Auto-stop TTS when switching to puzzle mode
                    if (newMode === 'puzzle' && ttsPlaying && lineTTSPlayer) {
                      lineTTSPlayer.stop();
                      analytics.playAction('pause');
                    }

                    // Track mode exit with time spent and actions
                    const durationSeconds = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
                    analytics.modeExit(currentMode === 'puzzle' ? 'practice' : currentMode as 'play' | 'practice', durationSeconds, modeActionCountRef.current);

                    // Sync line position across modes
                    if (newMode === 'puzzle') {
                      setPracticeLineIndex(flow.state.lineIndex);
                    } else {
                      flow.seekLine(practiceLineIndex);
                    }

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
              {/* TTS Auto-play toggle - only when TTS is supported for current language */}
              {ttsEnabled && isTTSSupportedForLang(lang) && (
                <Tooltip title={ttsAutoPlay ? 'TTS Auto-play On' : 'TTS Auto-play Off'}>
                  <IconButton
                    onClick={() => { setTtsAutoPlay(prev => !prev); if (ttsAutoPlay && lineTTSPlayer?.isPlaying()) lineTTSPlayer.stop(); }}
                    sx={{ color: ttsAutoPlay ? '#f59e0b' : 'inherit', bgcolor: ttsAutoPlay ? 'rgba(245,158,11,0.12)' : 'transparent' }}
                    aria-label="Toggle TTS Auto-play"
                  >
                    {ttsAutoPlay ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={T('help')}>
                <IconButton color={helpOpen ? 'primary' : 'inherit'} onClick={() => { setHelpOpen(true); analytics.helpOpen(); }} aria-label={T('help')}>
                  <HelpOutlineRoundedIcon />
                </IconButton>
              </Tooltip>
              {/* User menu with streak badge */}
              {(user || isGuest) ? (
                <UserMenu
                  lang={lang}
                  onShowAchievements={() => setAchievementsPanelOpen(true)}
                  onShowLeaderboard={() => setLeaderboardPanelOpen(true)}
                />
              ) : (
                <LoginButton variant="text" />
              )}
            </Box>
            {/* Mobile Controls - Simplified header, mode controls in bottom dock */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 0.5 }}>
              <Select
                size="small"
                value={lang}
                onChange={(e: SelectChangeEvent) => { const newLang = e.target.value as Lang; setLang(newLang); analytics.languageChange(newLang); ensurePlayPauseReady(); }}
                sx={{ minWidth: 64, '& .MuiSelect-select': { py: 0.75, px: 1 } }}
              >
                {languageOptions.map((code) => (
                  <MenuItem key={code} value={code}>{label(code)}</MenuItem>
                ))}
              </Select>
              <Tooltip title={`${T('search')} (⌘K /)`}>
                <IconButton color="inherit" onClick={() => { setSearchOpen(true); }} aria-label="Search" size="small">
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* TTS Auto-play toggle - mobile */}
              {ttsEnabled && isTTSSupportedForLang(lang) && (
                <Tooltip title={ttsAutoPlay ? 'TTS Auto-play On' : 'TTS Auto-play Off'}>
                  <IconButton
                    onClick={() => { setTtsAutoPlay(prev => !prev); if (ttsAutoPlay && lineTTSPlayer?.isPlaying()) lineTTSPlayer.stop(); }}
                    sx={{ color: ttsAutoPlay ? '#f59e0b' : 'inherit', bgcolor: ttsAutoPlay ? 'rgba(245,158,11,0.12)' : 'transparent' }}
                    aria-label="Toggle TTS Auto-play"
                    size="small"
                  >
                    {ttsAutoPlay ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={T('help')}>
                <IconButton color={helpOpen ? 'primary' : 'inherit'} onClick={() => { setHelpOpen(true); analytics.helpOpen(); }} aria-label={T('help')} size="small">
                  <HelpOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* User menu for mobile */}
              {(user || isGuest) ? (
                <UserMenu
                  lang={lang}
                  onShowAchievements={() => setAchievementsPanelOpen(true)}
                  onShowLeaderboard={() => setLeaderboardPanelOpen(true)}
                />
              ) : (
                <LoginButton variant="icon" />
              )}
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
              // In reading mode, seek to the line
              flow.seekLine(i);
              if (typeof w === 'number') flow.seekWord(w);
            }
          }}
          onResults={handleSearchResults}
        />

        {/* Conditional Rendering: Puzzle View, Practice View, or Reading View */}
        {viewMode === 'puzzle' ? (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', pb: { xs: 10, sm: 0 } }}>
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
              stotraKey={stotraKey}
              initialLineIndex={practiceLineIndex}
              onExit={() => { flow.seekLine(practiceLineIndex); setViewMode('reading'); }}
              onLineIndexChange={setPracticeLineIndex}
              T={T}
            />
          </Box>
        ) : viewMode === 'practice' ? (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', pb: { xs: 10, sm: 0 } }}>
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
              stotraKey={stotraKey}
              initialLineIndex={practiceLineIndex}
              onExit={() => { flow.seekLine(practiceLineIndex); setViewMode('reading'); }}
              onSearchRequest={() => setSearchOpen(true)}
              onLineIndexChange={setPracticeLineIndex}
              T={T}
            />
          </Box>
        ) : (
          <Box sx={{ position: 'relative', zIndex: 10, flex: 1, display: 'grid', gridTemplateRows: '1fr auto' }}>
            <Container maxWidth={false} sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 12, md: 4 } }}>
              <Box sx={{ mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: verseDetailOpen ? '56px 1fr 320px' : '56px 1fr',
                    lg: verseDetailOpen ? '56px 1fr 380px' : '56px 1fr',
                  },
                  columnGap: { md: 3, lg: 4 },
                  rowGap: { xs: 2, md: 3 },
                  alignItems: 'start'
                }}>
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
                        {/* Status pill: shows when TTS is not playing */}
                        {!ttsPlaying && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-slate-800/90 text-slate-100 border border-slate-600/60 shadow-sm`}>
                            {T('pause')}
                          </span>
                        )}
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
                            // Auto-stop TTS on swipe
                            if (ttsPlaying && lineTTSPlayer) {
                              lineTTSPlayer.stop();
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
                          learnMode={learnMode}
                          lineData={{
                            meaning: (text.lines[flow.state.lineIndex] as any)?.meaning,
                            samasaVibhaga: (text.lines[flow.state.lineIndex] as any)?.samasaVibhaga,
                            note: (text.lines[flow.state.lineIndex] as any)?.note,
                          }}
                          highlightWords={highlightWords}
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
                                // Simply use the start of the mapped word group in secondary language
                                secWordIdx = start2;
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
                                  learnMode={learnMode}
                                  lineData={{
                                    meaning: (text.lines[flow.state.lineIndex] as any)?.meaning,
                                    samasaVibhaga: (text.lines[flow.state.lineIndex] as any)?.samasaVibhaga,
                                    note: (text.lines[flow.state.lineIndex] as any)?.note,
                                  }}
                                  highlightWords={highlightWords}
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
                          setTimeout(() => { setFreezing(false); setLensH(null); }, 120);
                        }}
                        lang={lang}
                        legendActive={legendOpen}
                        onToggleLegend={() => setLegendOpen(v => !v)}
                        onLineCounterClick={() => {
                          if (!chapters.length) return;
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
                          Text Credit: {' '}
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

                    {/* Mobile Inline Verse Details - shows below main content when toggled */}
                    <Box
                      sx={{
                        display: { xs: verseDetailOpen ? 'block' : 'none', md: 'none' },
                        mt: 2,
                        mb: 10, // Extra margin for mobile dock
                      }}
                    >
                      <VerseDetailInline
                        lineNumber={flow.state.lineIndex}
                        lineText={(text.lines[flow.state.lineIndex] as any)?.[lang] || ''}
                        lineIast={(text.lines[flow.state.lineIndex] as any)?.iast}
                        lang={lang}
                        compact={true}
                        enrichedData={(() => {
                          const line = text.lines[flow.state.lineIndex] as any;
                          if (line?.samasaVibhaga || line?.chandas || line?.alamkara || line?.rasa || line?.devataSvarupa || line?.upadesha || line?.imagery || line?.meaning || line?.namaAnalysis || line?.note || line?.bhaktiRasa || line?.regionalGlossary || line?.translation || line?.padachchheda || line?.wordByWord) {
                            return { stotraType: 'verse' as const, ...line };
                          }
                          return undefined;
                        })()}
                      />
                    </Box>
                  </Box>

                  {/* Desktop Verse Details Panel - Third column */}
                  <Box
                    sx={{
                      display: { xs: 'none', md: verseDetailOpen ? 'block' : 'none' },
                      position: 'sticky',
                      top: 80,
                      maxHeight: 'calc(100vh - 120px)',
                      overflow: 'hidden',
                    }}
                  >
                    <VerseDetailInline
                      lineNumber={flow.state.lineIndex}
                      lineText={(text.lines[flow.state.lineIndex] as any)?.[lang] || ''}
                      lineIast={(text.lines[flow.state.lineIndex] as any)?.iast}
                      lang={lang}
                      enrichedData={(() => {
                        const line = text.lines[flow.state.lineIndex] as any;
                        if (line?.samasaVibhaga || line?.chandas || line?.alamkara || line?.rasa || line?.devataSvarupa || line?.upadesha || line?.imagery || line?.meaning || line?.namaAnalysis || line?.note || line?.bhaktiRasa || line?.regionalGlossary || line?.translation || line?.padachchheda || line?.wordByWord) {
                          return { stotraType: 'verse' as const, ...line };
                        }
                        return undefined;
                      })()}
                    />
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
              <Tab
                label={isSmall ? null : T('help_account_tab')}
                icon={<EmojiEventsOutlinedIcon />}
                iconPosition={isSmall ? undefined : "start"}
              />
            </Tabs>
          </DialogTitle>
          <DialogContent dividers>
            {helpTab === 0 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_play')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_pace')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_search')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_chapters')}` }} />
              </div>
            )}
            {helpTab === 1 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_enter')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_reveal')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_practice_navigate')}` }} />
              </div>
            )}
            {helpTab === 2 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_enter')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_arrange')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_puzzle_navigate')}` }} />
              </div>
            )}
            {helpTab === 3 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_login')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_streaks')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_badges')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_leaderboard')}` }} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <OnboardingTour open={onboardingOpen} setOpen={setOnboardingOpen} />

        {/* LineTTSBar removed — TTS auto-play toggle is now in header */}

        {/* Explore Drawer - Mobile navigation map */}
        <ExploreDrawer
          open={exploreDrawerOpen}
          onClose={() => setExploreDrawerOpen(false)}
          current={flow.state.lineIndex}
          total={flow.totalLines}
          onSeek={(index) => { flow.seekLine(index); setExploreDrawerOpen(false); }}
          sectionMarks={sectionMarks}
          chapterMarks={chapterMarks}
          lang={lang}
          T={T}
        />

        {/* Mobile Mode Dock - Bottom navigation for mobile */}
        {isSmall && (
          <MobileModeDock
            viewMode={viewMode}
            lang={lang}
            lang2={lang2}
            languageOptions={languageOptions}
            verseDetailOpen={verseDetailOpen}
            practiceProgress={getPracticeStats(lang, flow.totalLines, stotraKey).progress * 100}
            puzzleProgress={getPuzzleStats(lang, flow.totalLines, stotraKey).progress}
            onViewModeChange={(newMode) => {
              const currentMode = viewMode === 'reading' ? 'play' : viewMode === 'practice' ? 'practice' : 'puzzle';

              // Auto-stop TTS when switching modes
              if (newMode !== 'reading' && ttsPlaying && lineTTSPlayer) {
                lineTTSPlayer.stop();
                analytics.playAction('pause');
              }

              // Track mode exit
              const durationSeconds = Math.round((Date.now() - modeStartTimeRef.current) / 1000);
              analytics.modeExit(currentMode === 'puzzle' ? 'practice' : currentMode as 'play' | 'practice', durationSeconds, modeActionCountRef.current);

              // Sync line position across modes
              if (newMode === 'reading') {
                flow.seekLine(practiceLineIndex);
              } else if (viewMode === 'reading') {
                setPracticeLineIndex(flow.state.lineIndex);
              }

              // Enter new mode
              setViewMode(newMode);
              analytics.modeEnter(newMode === 'reading' ? 'play' : 'practice', flow.state.lineIndex);
              if (newMode === 'practice') analytics.practiceToggle(true);

              // Reset tracking
              modeStartTimeRef.current = Date.now();
              modeActionCountRef.current = 0;
            }}
            onVerseDetailToggle={() => {
              setVerseDetailOpen(prev => !prev);
              analytics.featureAction('verse_detail', verseDetailOpen ? 'closed' : 'opened');
            }}
            onLangChange={(newLang) => {
              setLang(newLang);
              analytics.languageChange(newLang);
              ensurePlayPauseReady();
            }}
            onLang2Change={(newLang) => {
              setLang2(newLang);
              if (newLang) analytics.languageChange(`${newLang}_secondary`);
              ensurePlayPauseReady();
            }}
            onHelpOpen={() => {
              setHelpOpen(true);
              analytics.helpOpen();
            }}
            onExploreOpen={() => setExploreDrawerOpen(true)}
            labelFn={label}
            T={T}
          />
        )}

        {/* Achievements Panel */}
        <AchievementsPanel
          open={achievementsPanelOpen}
          onClose={() => setAchievementsPanelOpen(false)}
          lang={lang}
        />

        {/* Leaderboard Panel */}
        <LeaderboardPanel
          open={leaderboardPanelOpen}
          onClose={() => setLeaderboardPanelOpen(false)}
          lang={lang}
        />

      </div>
    </ThemeProvider>
  );
}
