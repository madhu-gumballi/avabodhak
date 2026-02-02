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
import { LineTTSBar } from './LineTTSBar';
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


export function VSNViewer({ onBack, textOverride, subtitleOverrides, availableLangs, preferredLang }: { onBack: () => void; textOverride?: TextFile; subtitleOverrides?: Partial<Record<Lang, string>>; availableLangs?: Lang[]; preferredLang?: Lang }) {
  const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION || '0.0.0'}`;

  // Auth and gamification context
  const { user, userData, isGuest, recordActivity } = useAuth();
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
    // Priority: preferredLang (if supported) > localStorage > fallbackLang
    if (preferredLang && languageOptions.includes(preferredLang)) {
      return preferredLang;
    }
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
  const [viewMode, setViewMode] = useState<'reading' | 'practice' | 'puzzle'>('reading');
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
        help_account_tab: 'Account & Progress',
        tip_account_login: '🔐 <strong>Sign In</strong>: Sign in with Google to sync your progress across devices. Your achievements, streaks, and practice data will be saved in the cloud.',
        tip_account_guest: '👤 <strong>Guest Mode</strong>: You can use all features without signing in. Your progress is saved locally. Sign in anytime to sync to the cloud.',
        tip_account_streaks: '🔥 <strong>Streaks</strong>: Practice daily to build your streak! Complete at least one line each day. Your current and longest streaks are tracked.',
        tip_account_daily: '🎯 <strong>Daily Goals</strong>: Set personal targets for lines (default: 10) and puzzles (default: 5) per day. Track your progress in the header.',
        tip_account_badges: '🏆 <strong>Badges</strong>: Earn achievements for milestones like first line, 7-day streak, completing stotras, and more. Each stotra has a mastery badge!',
        tip_account_share: '📤 <strong>Share</strong>: When you unlock an achievement, tap the share button to celebrate on social media (X, WhatsApp, etc.) or copy to clipboard.',
        tip_account_leaderboard: '🏅 <strong>Leaderboard</strong>: Compete with other learners! Weekly, monthly, and all-time rankings based on your practice.',
        tip_play: '🔊 <strong>Text-to-Speech</strong>: Tap <strong>Play Line</strong> at the bottom to hear the current line. On desktop, press <strong>Space</strong>. <strong>Swipe</strong> or use <strong>← →</strong> to navigate.',
        tip_pace: '📱 <strong>Mobile Dock</strong>: Use the bottom bar to switch modes (Read/Practice/Puzzle), open <strong>Details</strong> for verse meanings, or tap <strong>More</strong> for settings.',
        tip_timeline: '🧭 <strong>Timeline</strong>: Drag the slider to jump between lines. Tap the line counter to see sections.',
        tip_pronun: '🎧 <strong>Pronunciation</strong>: Toggle in settings to see character animations for nasals, aspirates, and long vowels.',
        tip_search: '🔍 <strong>Search</strong>: Press <strong>⌘K</strong> or <strong>/</strong> to search. Fuzzy match finds partial text. Tap a result to jump there.',
        tip_chapters: '📖 <strong>Verse Details</strong>: Tap <strong>Details</strong> in the dock (mobile) or info icon to see meanings, word analysis, and etymology.',
        practice: 'Practice', practice_mode: 'Practice Mode', difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard',
        jump_to_line: 'Go to...', reveal: 'Reveal', replay_line: 'Replay Line', revealed: 'revealed', practiced: 'practiced', progress: 'Progress', exit_practice: 'Exit Practice', line: 'Line',
        practice_hint: 'Tap blanks to reveal words', practice_complete: 'Verse practiced!', practice_progress: 'Progress',
        puzzle_mode: 'Word Puzzle', puzzle_hint: 'Tap words below to arrange them in correct order', puzzle_complete: 'Puzzle Solved!',
        tap_to_arrange: 'Available Words', your_arrangement: 'Your Arrangement', try_again: 'Not quite right! Try again',
        get_hint: 'Get a hint', hint: 'Hint', reset_puzzle: 'Reset puzzle', reset: 'Reset', check: 'Check', next_puzzle: 'Next Puzzle',
        correct: 'correct', completed: 'completed', attempts: 'attempts', hints: 'hints', keyboard_shortcuts: 'Keyboard shortcuts', to_navigate: 'to navigate',
        exit_puzzle: 'Exit Word Puzzle',
        help_play_tab: 'Play Mode', help_practice_tab: 'Practice Mode', help_puzzle_tab: 'Word Puzzle',
        tip_practice_enter: '🎯 <strong>Practice Mode</strong>: Tap <strong>Practice</strong> in the bottom dock (mobile) or the book icon in header (desktop).',
        tip_puzzle_enter: '🧩 <strong>Word Puzzle</strong>: Tap <strong>Puzzle</strong> in the bottom dock (mobile) or the grid icon in header (desktop).',
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
        tip_play: '🔊 <strong>टेक्स्ट-टू-स्पीच</strong>: नीचे <strong>Play Line</strong> टैप करें। डेस्कटॉप पर <strong>Space</strong> दबाएँ। <strong>स्वाइप</strong> या <strong>← →</strong> से नेविगेट करें।',
        tip_pace: '📱 <strong>मोबाइल डॉक</strong>: नीचे की बार से मोड बदलें (Read/Practice/Puzzle), <strong>Details</strong> से अर्थ देखें, या <strong>More</strong> से सेटिंग्स।',
        tip_timeline: '🧭 <strong>टाइमलाइन</strong>: स्लाइडर खींचकर पंक्तियों में जाएँ। लाइन काउंटर टैप करें अध्याय देखने हेतु।',
        tip_pronun: '🎧 <strong>उच्चारण</strong>: सेटिंग्स में सक्षम करें—अनुस्वार, विसर्ग, दीर्घ स्वर के एनिमेशन देखें।',
        tip_search: '🔍 <strong>खोज</strong>: <strong>⌘K</strong> या <strong>/</strong> दबाएँ। आंशिक टेक्स्ट से भी खोज सकते हैं।',
        tip_chapters: '📖 <strong>श्लोक विवरण</strong>: डॉक में <strong>Details</strong> (मोबाइल) या info आइकॉन टैप करें—अर्थ, शब्द विश्लेषण देखें।',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'कठिनाई', easy: 'आसान', medium: 'मध्यम', hard: 'कठिन',
        jump_to_line: 'जाएँ...', reveal: 'प्रकट करें', replay_line: 'लाइन रिप्ले करें', revealed: 'प्रकट', practiced: 'अभ्यास किया', progress: 'प्रगति', exit_practice: 'अभ्यास से बाहर निकलें', line: 'लाइन',
        practice_hint: 'शब्द प्रकट करने हेतु रिक्त स्थान टैप करें', practice_complete: 'श्लोक अभ्यास किया!', practice_progress: 'प्रगति',
        puzzle_mode: 'शब्द पहेली', puzzle_hint: 'शब्दों को सही क्रम में व्यवस्थित करने के लिए नीचे टैप करें', puzzle_complete: 'पहेली हल हो गई!',
        tap_to_arrange: 'उपलब्ध शब्द', your_arrangement: 'आपकी व्यवस्था', try_again: 'बिल्कुल सही नहीं! पुनः प्रयास करें',
        get_hint: 'संकेत प्राप्त करें', hint: 'संकेत', reset_puzzle: 'पहेली रीसेट करें', reset: 'रीसेट', check: 'जांचें', next_puzzle: 'अगली पहेली',
        correct: 'सही', completed: 'पूर्ण', attempts: 'प्रयास', hints: 'संकेत', keyboard_shortcuts: 'कीबोर्ड शॉर्टकट', to_navigate: 'नेविगेट करने के लिए',
        exit_puzzle: 'शब्द पहेली से बाहर निकलें',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'शब्द पहेली',
        tip_practice_enter: '🎯 <strong>अभ्यास मोड</strong>: डॉक में <strong>Practice</strong> (मोबाइल) या हेडर में पुस्तक आइकॉन टैप करें।',
        tip_practice_hints: '💡 संकेत: शब्द प्रारंभिक अक्षर दिखाते हैं—आसान (50%), मध्यम (33%), कठिन (25%)',
        tip_practice_reveal: '👁️ क्रमिक प्रकटीकरण: शब्द को कई बार टैप करें—हर टैप अधिक अक्षर प्रकट करता है। पूरी लाइन तुरंत पूरा करने के लिए "प्रकट करें" बटन का उपयोग करें',
        tip_practice_replay: '🔁 पुनरावृत्ति: लाइन पूरा करने के बाद, इसे फिर से अभ्यास करने के लिए "लाइन रिप्ले करें" टैप करें',
        tip_practice_navigate: '🧭 नेविगेट: ← → तीर कुंजी, पिछले/अगले बटन, या स्वाइप जेस्चर का उपयोग करें। पहले/अंतिम बटन शुरुआत/अंत में जाते हैं। होम/एंड कुंजी भी काम करती हैं। अध्याय पंक्तियाँ स्वतः छोड़ दी जाती हैं',
        tip_practice_progress: '📈 प्रगति: नीचे रंगीन डॉट पूर्ण लाइनें (हरा) और वर्तमान स्थिति (नीला) दिखाते हैं। काउंटर कुल अभ्यास की गई लाइनें दिखाता है',
        tip_practice_jump: '⏩ लाइन में जाएँ: किसी भी लाइन संख्या पर जल्दी नेविगेट करने के लिए सर्च बॉक्स का उपयोग करें',
        tip_practice_exit: '⏹️ अभ्यास से बाहर निकलें: रीडिंग मोड में वापस जाने के लिए हेडर में "अभ्यास से बाहर निकलें" बटन का उपयोग करें',
        tip_practice_search: '🔍 खोज: अभ्यास मोड में भी <strong>⌘K</strong> या <strong>/</strong> दबाएँ',
        tip_puzzle_enter: '🧩 <strong>शब्द पहेली</strong>: डॉक में <strong>Puzzle</strong> (मोबाइल) या हेडर में ग्रिड आइकॉन टैप करें।',
        tip_puzzle_arrange: '🧩 व्यवस्थित करें: नीचे दिए गए अव्यवस्थित शब्दों को टैप करके उन्हें क्रम में रखें। रखे गए शब्दों को हटाने के लिए उन्हें टैप करें',
        tip_puzzle_hints: '💡 संकेत: हर संकेत शुरुआत से एक और शब्द प्रकट करता है। अधिकतम संकेत = शब्द - 1 (अधिकतम 4)',
        tip_puzzle_reveal: '👁️ प्रकट करें: तुरंत पूरा समाधान दिखाता है',
        tip_puzzle_replay: '🔁 फिर से खेलें: हल करने के बाद, फिर से प्रयास करने के लिए "फिर से खेलें" टैप करें',
        tip_puzzle_confetti: '🎉 कॉन्फेटी: पहली सही कोशिश में हल करने पर जश्न मनाएं!',
        tip_puzzle_navigate: '🧭 नेविगेट: ← → तीर कुंजी, पिछले/अगले बटन, या पहेलियों के बीच स्वाइप जेस्चर का उपयोग करें',
        chapters_title: 'अध्याय',
        chapters_hint: 'किसी अध्याय पर टैप करके वहाँ जाएँ; प्लेबैक मैन्युअल पर ही रहता है।',
        close: 'बंद करें',
        help_account_tab: 'खाता एवं प्रगति',
        tip_account_login: '🔐 <strong>साइन इन</strong>: Google से साइन इन करें और अपनी प्रगति सभी उपकरणों पर सिंक करें। आपकी उपलब्धियाँ, स्ट्रीक और अभ्यास डेटा क्लाउड में सेव होगा।',
        tip_account_guest: '👤 <strong>अतिथि मोड</strong>: बिना साइन इन किए सभी सुविधाएँ उपयोग करें। आपकी प्रगति स्थानीय रूप से सहेजी जाती है। कभी भी साइन इन करके क्लाउड पर सिंक करें।',
        tip_account_streaks: '🔥 <strong>स्ट्रीक</strong>: रोज़ाना अभ्यास करके अपनी स्ट्रीक बनाएँ! हर दिन कम से कम एक पंक्ति पूरी करें।',
        tip_account_daily: '🎯 <strong>दैनिक लक्ष्य</strong>: पंक्तियों (डिफ़ॉल्ट: 10) और पहेलियों (डिफ़ॉल्ट: 5) के लिए व्यक्तिगत लक्ष्य निर्धारित करें।',
        tip_account_badges: '🏆 <strong>बैज</strong>: पहली पंक्ति, 7-दिन स्ट्रीक, स्तोत्र पूर्ण करने जैसे मील के पत्थर पर उपलब्धियाँ अर्जित करें। प्रत्येक स्तोत्र का मास्टरी बैज है!',
        tip_account_share: '📤 <strong>शेयर करें</strong>: जब आप कोई उपलब्धि अनलॉक करते हैं, सोशल मीडिया (X, WhatsApp आदि) पर साझा करने के लिए शेयर बटन टैप करें।',
        tip_account_leaderboard: '🏅 <strong>लीडरबोर्ड</strong>: अन्य शिक्षार्थियों के साथ प्रतिस्पर्धा करें! साप्ताहिक, मासिक और सर्वकालिक रैंकिंग।'
      },
      knda: {
        app_title: 'ಅವಬೋಧಕ', app_subtitle: 'ವಿಷ್ಣು ಸಹಸ್ರನಾಮ',
        search: 'ಹುಡುಕಿ', help: 'ಸಹಾಯ', howto: 'ಹೆಗೆ ಬಳಸುವುದು', play: 'ಆಡಿಸಿ', pause: 'ಹಸ್ತಚಾಲಿತ', pace: 'ವೇಗ', tips: 'ಸಲಹೆಗಳು', footer_hint: 'ಸಾಲುಗಳ ನಡುವೆ ಹೋಗಲು ಬಾಣದ ಕೀಲಿಗಳು ಅಥವಾ ಸ್ವೈಪ್ ಬಳಸಿ.',
        tip_play: '🔊 <strong>ಟೆಕ್ಸ್ಟ್-ಟು-ಸ್ಪೀಚ್</strong>: ಕೆಳಗಿನ <strong>Play Line</strong> ಟ್ಯಾಪ್ ಮಾಡಿ. ಡೆಸ್ಕ್‌ಟಾಪ್‌ನಲ್ಲಿ <strong>Space</strong> ಒತ್ತಿ. <strong>ಸ್ವೈಪ್</strong> ಅಥವಾ <strong>← →</strong> ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು.',
        tip_pace: '📱 <strong>ಮೊಬೈಲ್ ಡಾಕ್</strong>: ಕೆಳಗಿನ ಬಾರ್‌ನಿಂದ ಮೋಡ್ ಬದಲಿಸಿ (Read/Practice/Puzzle), <strong>Details</strong> ಅರ್ಥಕ್ಕಾಗಿ, <strong>More</strong> ಸೆಟ್ಟಿಂಗ್‌ಗಳಿಗಾಗಿ.',
        tip_timeline: '🧭 <strong>ಟೈಮ್‌ಲೈನ್</strong>: ಸ್ಲೈಡರ್ ಎಳೆಯಿರಿ ಸಾಲುಗಳಿಗೆ ಜಿಗಿಯಲು. ಸಾಲು ಎಣಿಕೆ ಟ್ಯಾಪ್ ಮಾಡಿ ವಿಭಾಗಗಳು ನೋಡಲು.',
        tip_pronun: '🎧 <strong>ಉಚ್ಛಾರ</strong>: ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಸಕ್ರಿಯಗೊಳಿಸಿ—ಅನುಸ್ವಾರ, ವಿಸರ್ಗ, ದೀರ್ಘ ಸ್ವರ ಅನಿಮೇಶನ್ ನೋಡಿ.',
        tip_search: '🔍 <strong>ಹುಡುಕಿ</strong>: <strong>⌘K</strong> ಅಥವಾ <strong>/</strong> ಒತ್ತಿ. ಭಾಗಶಃ ಪಠ್ಯದಿಂದಲೂ ಹುಡುಕಬಹುದು.',
        tip_chapters: '📖 <strong>ಶ್ಲೋಕ ವಿವರ</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Details</strong> (ಮೊಬೈಲ್) ಅಥವಾ info ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡಿ—ಅರ್ಥ, ಪದ ವಿಶ್ಲೇಷಣೆ ನೋಡಿ.',
        practice: 'ಅಭ್ಯಾಸ', practice_mode: 'ಅಭ್ಯಾಸ ಮೋಡ್', difficulty: 'ಕಷ್ಟತೆ', easy: 'ಸುಲಭ', medium: 'ಮಧ್ಯಮ', hard: 'ಕಠಿಣ',
        jump_to_line: 'ಹೋಗಿ...', reveal: 'ಬಹಿರಂಗಪಡಿಸಿ', replay_line: 'ಸಾಲು ಮರುಚಲಾವಣೆ', revealed: 'ಬಹಿರಂಗಪಡಿಸಲಾಗಿದೆ', practiced: 'ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ', progress: 'ಪ್ರಗತಿ', exit_practice: 'ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ', line: 'ಸಾಲು',
        practice_hint: 'ಪದಗಳನ್ನು ತೋರಿಸಲು ಖಾಲಿ ಜಾಗ ಟ್ಯಾಪ್ ಮಾಡಿ', practice_complete: 'ಶ್ಲೋಕ ಅಭ್ಯಾಸ ಮಾಡಲಾಗಿದೆ!', practice_progress: 'ಪ್ರಗತಿ',
        puzzle_mode: 'ಪದ ಒಗಟು', puzzle_hint: 'ಪದಗಳನ್ನು ಸರಿಯಾದ ಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಲು ಕೆಳಗೆ ಟ್ಯಾಪ್ ಮಾಡಿ', puzzle_complete: 'ಒಗಟು ಪರಿಹರಿಸಲಾಗಿದೆ!',
        tap_to_arrange: 'ಲಭ್ಯವಿರುವ ಪದಗಳು', your_arrangement: 'ನಿಮ್ಮ ಜೋಡಣೆ', try_again: 'ಸರಿಯಾಗಿಲ್ಲ! ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
        get_hint: 'ಸೂಚನೆ ಪಡೆಯಿರಿ', hint: 'ಸೂಚನೆ', reset_puzzle: 'ಒಗಟು ಮರುಹೊಂದಿಸಿ', reset: 'ಮರುಹೊಂದಿಸಿ', check: 'ಪರೀಕ್ಷಿಸಿ', next_puzzle: 'ಮುಂದಿನ ಒಗಟು',
        correct: 'ಸರಿ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ', attempts: 'ಪ್ರಯತ್ನಗಳು', hints: 'ಸೂಚನೆಗಳು', keyboard_shortcuts: 'ಕೀಬೋರ್ಡ್ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು', to_navigate: 'ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು',
        exit_puzzle: 'ಪದ ಒಗಟುದಿಂದ ನಿರ್ಗಮಿಸಿ',
        help_play_tab: 'ಪ್ಲೇ ಮೋಡ್', help_practice_tab: 'ಅಭ್ಯಾಸ ಮೋಡ್', help_puzzle_tab: 'ಪದ ಒಗಟು',
        tip_practice_enter: '🎯 <strong>ಅಭ್ಯಾಸ ಮೋಡ್</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Practice</strong> (ಮೊಬೈಲ್) ಅಥವಾ ಹೆಡರ್‌ನಲ್ಲಿ ಪುಸ್ತಕ ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡಿ.',
        tip_practice_hints: '💡 ಸೂಚನೆಗಳು: ನೀವು ಟ್ಯಾಪ್ ಮಾಡುವಂತೆ ಪದಗಳು ಕ್ರಮವಾಗಿ ಪ್ರಾರಂಭದ ಅಕ್ಷರಗಳನ್ನು ತೋರಿಸುತ್ತವೆ.',
        tip_practice_reveal: '👁️ ಹಂತ ಹಂತದ ಬಹಿರಂಗಪಡಿಸುವಿಕೆ: ಪದವನ್ನು ಹಲವು ಬಾರಿ ಟ್ಯಾಪ್ ಮಾಡಿ—ಪ್ರತಿ ಟ್ಯಾಪ್ ಹೆಚ್ಚು ಅಕ್ಷರಗಳನ್ನು ತೋರಿಸುತ್ತದೆ. ಸಂಪೂರ್ಣ ಸಾಲನ್ನು ತಕ್ಷಣವೇ ಪೂರ್ಣಗೊಳಿಸಲು "ಬಹಿರಂಗಪಡಿಸಿ" ಬಟನ್ ಬಳಸಿ',
        tip_practice_replay: '🔁 ಪುನರಾವರ್ತನೆ: ಸಾಲು ಪೂರ್ಣಗೊಂಡ ನಂತರ, ಅದನ್ನು ಮತ್ತೆ ಅಭ್ಯಾಸ ಮಾಡಲು "ಸಾಲು ಮರುಚಲಾವಣೆ" ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_practice_navigate: '🧭 ನ್ಯಾವಿಗೇಟ್: ← → ಬಾಣದ ಕೀಲಿಗಳು, ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು, ಅಥವಾ ಸ್ವೈಪ್ ಜೆಸ್ಚರ್‌ಗಳನ್ನು ಬಳಸಿ. ಮೊದಲು/ಕೊನೆಯ ಬಟನ್‌ಗಳು ಆರಂಭ/ಅಂತ್ಯಕ್ಕೆ ಜಿಗಿಯುತ್ತವೆ. ಹೋಮ್/ಎಂಡ್ ಕೀಗಳೂ ಕೆಲಸ ಮಾಡುತ್ತವೆ. ಅಧ್ಯಾಯ ಸಾಲುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬಿಟ್ಟುಬಿಡಲಾಗುತ್ತದೆ',
        tip_practice_progress: '📈 ಪ್ರಗತಿ: ಕೆಳಗಿನ ಬಣ್ಣದ ಡಾಟ್‌ಗಳು ಪೂರ್ಣಗೊಂಡ ಸಾಲುಗಳನ್ನು (ಹಸಿರು) ಮತ್ತು ಪ್ರಸ್ತುತ ಸ್ಥಾನವನ್ನು (ನೀಲಿ) ತೋರಿಸುತ್ತವೆ. ಕೌಂಟರ್ ಒಟ್ಟು ಅಭ್ಯಾಸ ಮಾಡಲಾದ ಸಾಲುಗಳನ್ನು ತೋರಿಸುತ್ತದೆ',
        tip_practice_jump: '⏩ ಸಾಲಿಗೆ ಹೋಗಿ: ಯಾವುದೇ ಸಾಲು ಸಂಖ್ಯೆಗೆ ತ್ವರಿತವಾಗಿ ನ್ಯಾವಿಗೇಟ್ ಮಾಡಲು ಹುಡುಕಾಟ ಬಾಕ್ಸ್ ಬಳಸಿ',
        tip_practice_exit: '⏹️ ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ: ಓದುವ ಮೋಡ್‌ಗೆ ಮರಳಲು ಹೆಡರ್‌ನಲ್ಲಿ "ಅಭ್ಯಾಸದಿಂದ ನಿರ್ಗಮಿಸಿ" ಬಟನ್ ಬಳಸಿ',
        tip_practice_search: '🔍 ಹುಡುಕಿ: ಅಭ್ಯಾಸ ಮೋಡ್‌ನಲ್ಲಿಯೂ <strong>⌘K</strong> ಅಥವಾ <strong>/</strong> ಒತ್ತಿ',
        tip_puzzle_enter: '🧩 <strong>ಪದ ಒಗಟು</strong>: ಡಾಕ್‌ನಲ್ಲಿ <strong>Puzzle</strong> (ಮೊಬೈಲ್) ಅಥವಾ ಹೆಡರ್‌ನಲ್ಲಿ ಗ್ರಿಡ್ ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡಿ.',
        tip_puzzle_arrange: '🧩 ವ್ಯವಸ್ಥೆ ಮಾಡಿ: ಕೆಳಗಿನ ಅಸ್ತವ್ಯಸ್ತ ಪದಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಅವುಗಳನ್ನು ಕ್ರಮದಲ್ಲಿ ಇರಿಸಿ. ಇರಿಸಿದ ಪದಗಳನ್ನು ತೆಗೆದುಹಾಕಲು ಅವುಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_puzzle_hints: '💡 ಸೂಚನೆಗಳು: ಪ್ರತಿ ಸೂಚನೆಯೂ ಆರಂಭದಿಂದ ಒಂದು ಹೆಚ್ಚು ಪದವನ್ನು ಬಹಿರಂಗಪಡಿಸುತ್ತದೆ. ಗರಿಷ್ಠ ಸೂಚನೆಗಳು = ಪದಗಳು - 1 (ಗರಿಷ್ಠ 4)',
        tip_puzzle_reveal: '👁️ ಬಹಿರಂಗಪಡಿಸಿ: ತತ್ಕ್ಷಣವೇ ಸಂಪೂರ್ಣ ಪರಿಹಾರವನ್ನು ತೋರಿಸುತ್ತದೆ',
        tip_puzzle_replay: '🔁 ಮರುಚಲಾವಣೆ: ಪರಿಹರಿಸಿದ ನಂತರ, ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು "ಮರುಚಲಾವಣೆ" ಟ್ಯಾಪ್ ಮಾಡಿ',
        tip_puzzle_confetti: '🎉 ಕಾನ್ಫೆಟ್ಟಿ: ಮೊದಲ ಸರಿಯಾದ ಪ್ರಯತ್ನದಲ್ಲಿ ಪರಿಹರಿಸಿ ಆಚರಣೆಗೆ!',
        tip_puzzle_navigate: '🧭 ನ್ಯಾವಿಗೇಟ್: ← → ಬಾಣದ ಕೀಲಿಗಳು, ಹಿಂದಿನ/ಮುಂದಿನ ಬಟನ್‌ಗಳು, ಅಥವಾ ಒಗಟುಗಳ ನಡುವೆ ಸ್ವೈಪ್ ಜೆಸ್ಚರ್‌ಗಳನ್ನು ಬಳಸಿ',
        chapters_title: 'ಅಧ್ಯಾಯಗಳು',
        chapters_hint: 'ಅಧ್ಯಾಯದ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಲ್ಲಿಗೆ ಜಿಗಿಯಿರಿ; ಪ್ಲೇಬ್ಯಾಕ್ ಹಸ್ತಚಾಲಿತದಲ್ಲೇ ಇರುತ್ತದೆ.',
        close: 'ಮುಚ್ಚಿ',
        help_account_tab: 'ಖಾತೆ ಮತ್ತು ಪ್ರಗತಿ',
        tip_account_login: '🔐 <strong>ಸೈನ್ ಇನ್</strong>: Google ನೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ ಮತ್ತು ಎಲ್ಲಾ ಸಾಧನಗಳಲ್ಲಿ ನಿಮ್ಮ ಪ್ರಗತಿಯನ್ನು ಸಿಂಕ್ ಮಾಡಿ।',
        tip_account_guest: '👤 <strong>ಅತಿಥಿ ಮೋಡ್</strong>: ಸೈನ್ ಇನ್ ಮಾಡದೆ ಎಲ್ಲಾ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಬಳಸಿ। ನಿಮ್ಮ ಪ್ರಗತಿ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗುತ್ತದೆ.',
        tip_account_streaks: '🔥 <strong>ಸ್ಟ್ರೀಕ್‌ಗಳು</strong>: ಪ್ರತಿದಿನ ಅಭ್ಯಾಸ ಮಾಡಿ ನಿಮ್ಮ ಸ್ಟ್ರೀಕ್ ಬೆಳೆಸಿ! ಪ್ರತಿ ದಿನ ಕನಿಷ್ಠ ಒಂದು ಸಾಲು ಪೂರ್ಣಗೊಳಿಸಿ.',
        tip_account_daily: '🎯 <strong>ದೈನಿಕ ಗುರಿಗಳು</strong>: ಸಾಲುಗಳು (ಡೀಫಾಲ್ಟ್: 10) ಮತ್ತು ಒಗಟುಗಳಿಗೆ (ಡೀಫಾಲ್ಟ್: 5) ವೈಯಕ್ತಿಕ ಗುರಿಗಳನ್ನು ಹೊಂದಿಸಿ.',
        tip_account_badges: '🏆 <strong>ಬ್ಯಾಡ್ಜ್‌ಗಳು</strong>: ಮೊದಲ ಸಾಲು, 7-ದಿನ ಸ್ಟ್ರೀಕ್, ಸ್ತೋತ್ರ ಪೂರ್ಣಗೊಳಿಸುವಿಕೆ ಮುಂತಾದ ಮೈಲಿಗಲ್ಲುಗಳಿಗೆ ಸಾಧನೆಗಳನ್ನು ಗಳಿಸಿ.',
        tip_account_share: '📤 <strong>ಹಂಚಿಕೊಳ್ಳಿ</strong>: ನೀವು ಸಾಧನೆಯನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಿದಾಗ, ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮದಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಲು ಶೇರ್ ಬಟನ್ ಟ್ಯಾಪ್ ಮಾಡಿ.',
        tip_account_leaderboard: '🏅 <strong>ಲೀಡರ್‌ಬೋರ್ಡ್</strong>: ಇತರ ಕಲಿಯುವವರೊಂದಿಗೆ ಸ್ಪರ್ಧಿಸಿ! ಸಾಪ್ತಾಹಿಕ, ಮಾಸಿಕ ಮತ್ತು ಸರ್ವಕಾಲಿಕ ಶ್ರೇಣಿಗಳು.'
      },
      tel: {
        app_title: 'అవబోధక', app_subtitle: 'విష్ణు సహస్రనామ',
        search: 'వెతకండి', help: 'సహాయం', howto: 'ఎలా వాడాలి', play: 'ప్లే', pause: 'మాన్యువల్', pace: 'వేగం', tips: 'సూచనలు', footer_hint: 'పంక్తుల నడువే హోగలు బాణ కీలు లేదా స్వైప్ బళసండి.',
        tip_play: '🔊 <strong>టెక్స్ట్-టు-స్పీచ్</strong>: క్రింద <strong>Play Line</strong> ట్యాప్ చేయండి. డెస్క్‌టాప్‌లో <strong>Space</strong> నొక్కండి. <strong>స్వైప్</strong> లేదా <strong>← →</strong> నావిగేట్ చేయడానికి.',
        tip_pace: '📱 <strong>మొబైల్ డాక్</strong>: క్రింది బార్ నుండి మోడ్ మార్చండి (Read/Practice/Puzzle), <strong>Details</strong> అర్థాలకు, <strong>More</strong> సెట్టింగ్స్‌కు.',
        tip_timeline: '🧭 <strong>టైమ్‌లైన్</strong>: స్లైడర్ లాగి పంక్తులకు జంప్ చేయండి. లైన్ కౌంటర్ ట్యాప్ చేసి విభాగాలు చూడండి.',
        tip_pronun: '🎧 <strong>ఉచ్చారణ</strong>: సెట్టింగ్స్‌లో ఆన్ చేయండి—అనుస్వారం, విసర్గం, దీర్ఘ స్వర యానిమేషన్లు చూడండి.',
        tip_search: '🔍 <strong>సెర్చ్</strong>: <strong>⌘K</strong> లేదా <strong>/</strong> నొక్కండి. పాక్షిక టెక్స్ట్‌తో కూడా సెర్చ్ చేయవచ్చు.',
        tip_chapters: '📖 <strong>శ్లోక వివరాలు</strong>: డాక్‌లో <strong>Details</strong> (మొబైల్) లేదా info ఐకాన్ ట్యాప్ చేయండి—అర్థాలు, పద విశ్లేషణ చూడండి.',
        practice: 'అభ్యాసం', practice_mode: 'అభ్యాస మోడ్', difficulty: 'కష్టం', easy: 'సులభం', medium: 'మధ్యస్థ', hard: 'కఠినం',
        jump_to_line: 'వెళ్లు...', reveal: 'వెల్లడించు', replay_line: 'లైన్ రీప్లే', revealed: 'వెల్లడించబడింది', practiced: 'అభ్యసించబడింది', progress: 'పురోగతి', exit_practice: 'అభ్యాసం నుండి నిష్క్రమించు', line: 'లైన్',
        practice_hint: 'పదాలను చూపించడానికి ఖాళీలను ట్యాప్ చేయండి', practice_complete: 'శ్లోకం అభ్యసించబడింది!', practice_progress: 'పురోగతి',
        puzzle_mode: 'పజిల్ మోడ్', puzzle_hint: 'పదాలను సరైన క్రమంలో అమర్చడానికి క్రింద ట్యాప్ చేయండి', puzzle_complete: 'పజిల్ పరిష్కరించబడింది!',
        tap_to_arrange: 'అందుబాటులో ఉన్న పదాలు', your_arrangement: 'మీ అమరిక', try_again: 'సరిగ్గా లేదు! మళ్లీ ప్రయత్నించండి',
        get_hint: 'సూచన పొందండి', hint: 'సూచన', reset_puzzle: 'పజిల్ రీసెట్ చేయండి', reset: 'రీసెట్', check: 'తనిఖీ చేయండి', next_puzzle: 'తదుపరి పజిల్',
        correct: 'సరైనది', completed: 'పూర్తయింది', attempts: 'ప్రయత్నాలు', hints: 'సూచనలు', keyboard_shortcuts: 'కీబోర్డ్ షార్ట్‌కట్‌లు', to_navigate: 'నావిగేట్ చేయడానికి',
        help_play_tab: 'ప్లే మోడ్', help_practice_tab: 'అభ్యాస మోడ్', help_puzzle_tab: 'పజిల్ మోడ్',
        tip_practice_enter: '🎯 <strong>అభ్యాస మోడ్</strong>: డాక్‌లో <strong>Practice</strong> (మొబైల్) లేదా హెడర్‌లో బుక్ ఐకాన్ ట్యాప్ చేయండి.',
        tip_practice_hints: '💡 సూచనలు: పదాలు ప్రారంభ అక్షరాలను చూపిస్తాయి—సులభం (50%), మధ్యస్థ (33%), కఠినం (25%)',
        tip_practice_reveal: '👁️ క్రమంగా బహిర్గతం: పదాన్ని పలు సార్లు ట్యాప్ చేయండి—ప్రతి ట్యాప్ మరిన్ని అక్షరాలను చూపిస్తుంది. మొత్తం లైన్‌ను వెంటనే పూర్తి చేయడానికి "వెల్లడించు" బటన్‌ను ఉపయోగించండి',
        tip_practice_replay: '🔁 పునరావృతం: లైన్ పూర్తైన తర్వాత, దాన్ని మళ్లీ అభ్యసించడానికి "లైన్ రీప్లే" ట్యాప్ చేయండి',
        tip_practice_navigate: '🧭 నావిగేట్: ← → బాణ కీలు, మునుపటి/తర్వాత బటన్‌లు, లేదా స్వైప్ జెస్చర్‌లను ఉపయోగించండి. మొదటి/చివరి బటన్‌లు ప్రారంభం/ముగింపుకు వెళుతాయి. హోమ్/ఎండ్ కీలు కూడా పని చేస్తాయి. అధ్యాయ పంక్తులు స్వయంచాలకంగా దాటవేయబడతాయి',
        tip_practice_progress: '📈 పురోగతి: క్రింద రంగు చుక్కలు పూర్తైన లైన్‌లను (పచ్చ) మరియు ప్రస్తుత స్థానాన్ని (నీలం) చూపిస్తాయి. కౌంటర్ మొత్తం అభ్యసించిన లైన్‌లను 보여స్తుంది',
        tip_practice_jump: '⏩ లైన్‌కు వెళ్లు: ఎంతైనా లైన్ నంబర్‌కు వేగంగా నావిగేట్ చేయడానికి సెర్చ్ బాక్స్‌ను ఉపయోగించండి',
        tip_practice_exit: '⏹️ అభ్యాసం నుండి నిష్క్రమించు: రీడింగ్ మోడ్‌కు తిరిగి వెళ్లడానికి హెడర్‌లో "అభ్యాసం నుండి నిష్క్రమించు" బటన్‌ను ఉపయోగించండి',
        tip_practice_search: '🔍 వెతకండి: అభ్యాస మోడ్‌లో కూడా <strong>⌘K</strong> లేదా <strong>/</strong> నొక్కండి',
        tip_puzzle_enter: '🧩 <strong>పజిల్ మోడ్</strong>: డాక్‌లో <strong>Puzzle</strong> (మొబైల్) లేదా హెడర్‌లో గ్రిడ్ ఐకాన్ ట్యాప్ చేయండి.',
        tip_puzzle_arrange: '🧩 అమర్చు: క్రింద అస్తవ్యస్త పదాలను ట్యాప్ చేసి వాటిని క్రమంలో ఉంచండి. ఉంచిన పదాలను తీసివేయడానికి వాటిని ట్యాప్ చేయండి',
        tip_puzzle_hints: '💡 సూచనలు: ప్రతి సూచన ప్రారంభం నుండి ఒక పదాన్ని మరింత వెల్లడిస్తుంది. గరిష్ట సూచనలు = పదాలు - 1 (గరిష్ట 4)',
        tip_puzzle_reveal: '👁️ వెల్లడించు: వెంటనే పూర్తి పరిష్కారాన్ని చూపిస్తుంది',
        tip_puzzle_replay: '🔁 రీప్లే: పరిష్కరించిన తర్వాత, మళ్లీ ప్రయత్నించడానికి "రీప్లే" ట్యాప్ చేయండి',
        tip_puzzle_confetti: '🎉 కాన్ఫెట్టి: మొదటి సరైన ప్రయత్నంలో పరిష్కరించండి జరుపుకోండి!',
        tip_puzzle_navigate: '🧭 నావిగేట్: ← → బాణ కీలు, మునుపటి/తర్వాత బటన్‌లు, లేదా పజిల్స్ మధ్య స్వైప్ జెస్చర్‌లను ఉపయోగించండి',
        chapters_title: 'అధ్యాయాలు',
        chapters_hint: 'అధ్యాయం పై ట్యాప్ చేసి అక్కడికి జంప్ అవ్వండి; ప్లేబ్యాక్ మాన్యువల్‌లోనే ఉంటుంది.',
        close: 'మూసివేయి',
        help_account_tab: 'ఖాతా & పురోగతి',
        tip_account_login: '🔐 <strong>సైన్ ఇన్</strong>: Google తో సైన్ ఇన్ చేసి అన్ని పరికరాలలో మీ పురోగతిని సింక్ చేయండి।',
        tip_account_guest: '👤 <strong>అతిథి మోడ్</strong>: సైన్ ఇన్ చేయకుండా అన్ని ఫీచర్లు ఉపయోగించండి. మీ పురోగతి స్థానికంగా సేవ్ అవుతుంది.',
        tip_account_streaks: '🔥 <strong>స్ట్రీక్‌లు</strong>: ప్రతిరోజూ అభ్యాసం చేసి మీ స్ట్రీక్ పెంచండి! ప్రతి రోజు కనీసం ఒక లైన్ పూర్తి చేయండి.',
        tip_account_daily: '🎯 <strong>దైనిక లక్ష్యాలు</strong>: లైన్‌లు (డీఫాల్ట్: 10) మరియు పజిల్స్ (డీఫాల్ట్: 5) కోసం వ్యక్తిగత లక్ష్యాలను సెట్ చేయండి.',
        tip_account_badges: '🏆 <strong>బ్యాడ్జీలు</strong>: మొదటి లైన్, 7-రోజుల స్ట్రీక్, స్తోత్రాలు పూర్తి చేయడం వంటి మైలురాళ్లకు సాధనలు సంపాదించండి.',
        tip_account_share: '📤 <strong>షేర్ చేయండి</strong>: మీరు సాధన అన్‌లాక్ చేసినప్పుడు, సోషల్ మీడియాలో షేర్ చేయడానికి షేర్ బటన్ ట్యాప్ చేయండి.',
        tip_account_leaderboard: '🏅 <strong>లీడర్‌బోర్డ్</strong>: ఇతర అభ్యాసకులతో పోటీ పడండి! వారపు, నెలవారీ మరియు సర్వకాలిక ర్యాంకింగ్‌లు.'
      },
      tam: {
        app_title: 'அவபோதக', app_subtitle: 'விஷ்ணு ஸஹஸ்ரநாமம்',
        search: 'தேடு', help: 'உதவி', howto: 'பயன்படுத்துவது எப்படி', play: 'இயக்கு', pause: 'கைமுறை', pace: 'வேகம்', tips: 'உதவிக்குறிப்புகள்', footer_hint: 'தொடங்க ப்ளே அழுத்தவும்; வேகத்தை விருப்பப்படி அமைக்கவும்.',
        tip_play: '🔊 <strong>உரை-உச்சாரணம்</strong>: நடப்பு வரியைக் கேட்க கீழே <strong>Play Line</strong> தட்டவும். டெஸ்க்டாப்பில் <strong>Space</strong>. <strong>ஸ்வைப்</strong>/<strong>← →</strong> வழிசெலுத்த.',
        tip_pace: '📱 <strong>மொபைல் டாக்</strong>: கீழ் பட்டியில் முறைகள் (Read/Practice/Puzzle) மாற்றவும், <strong>Details</strong> அர்த்தங்கள் பார்க்க, <strong>More</strong> அமைப்புகளுக்கு.',
        tip_timeline: '🧭 காலவரிசை: இழுத்து வரிகளைத் தாண்டவும். நடப்பு சொல் மஞ்சள் நிறத்தில் வெளிப்படும்.',
        tip_pronun: '🎧 உச்சாரணம்: அமைப்புகளில் இயக்கவும்—அனுஸ்வாரம், விஸர்கம், நீண்ட உயிர்கள் காட்சி குறிகளுடன்.',
        tip_search: '🔍 தேடு: <strong>⌘K</strong>/<strong>/</strong> திறக்கவும். எந்த சொல்/ஸ்லோகமும் எழுதலாம் (ஃபஜி தேடல்). முடிவு தட்டி அங்கு செல்லவும்.',
        tip_chapters: '📚 அத்தியாயங்கள்: "அத்தியாயங்கள்" சிப் தட்டி நேரடியாக அத்தியாய தொடக்கத்திற்கு செல்லவும்.',
        practice: 'பயிற்சி', practice_mode: 'பயிற்சி முறை', difficulty: 'சிரமம்', easy: 'எளிது', medium: 'நடுத்தரம்', hard: 'கடினம்',
        jump_to_line: 'செல்லு...', reveal: 'வெளிப்படுத்து', replay_line: 'வரியை மீண்டும் இயக்கு', revealed: 'வெளிப்படுத்தப்பட்டது', practiced: 'பயிற்சி செய்யப்பட்டது', progress: 'முன்னேற்றம்', exit_practice: 'பயிற்சியில் இருந்து வெளியேறு', line: 'வரி',
        practice_hint: 'சொற்களைக் காட்ட வெற்றிடங்களைத் தட்டவும்', practice_complete: 'சொக்கம் பயிற்சி செய்யப்பட்டது!', practice_progress: 'முன்னேற்றம்',
        puzzle_mode: 'புதிர் முறை', puzzle_hint: 'சொற்களை சரியான வரிசையில் அமைக்க கீழே தட்டவும்', puzzle_complete: 'புதிர் தீர்க்கப்பட்டது!',
        tap_to_arrange: 'கிடைக்கும் சொற்கள்', your_arrangement: 'உங்கள் அமைப்பு', try_again: 'சரியல்ல! மீண்டும் முயற்சிக்கவும்',
        get_hint: 'குறிப்பு பெறு', hint: 'குறிப்பு', reset_puzzle: 'புதிரை மீட்டமை', reset: 'மீட்டமை', check: 'சரிபார்', next_puzzle: 'அடுத்த புதிர்',
        correct: 'சரி', completed: 'முடிந்தது', attempts: 'முயற்சிகள்', hints: 'குறிப்புகள்', keyboard_shortcuts: 'கீபோர்ட் குறுக்குவழிகள்', to_navigate: 'நகர்த்த',
        help_play_tab: 'ப்ளே முறை', help_practice_tab: 'பயிற்சி முறை', help_puzzle_tab: 'புதிர் முறை',
        tip_practice_enter: '🎯 <strong>பயிற்சி முறை</strong>: டாக்கில் <strong>Practice</strong> (மொபைல்) அல்லது தலைப்பில் புத்தக ஐகான் தட்டவும்.',
        tip_practice_hints: 'குறிப்புகள்: சொற்கள் தொடக்க எழுத்துக்களைக் காட்டும்—எளிது (50%), நடுத்தரம் (33%), கடினம் (25%)',
        tip_practice_reveal: 'படிப்படியாக வெளிப்படுத்தல்: சொல்லை பல முறை தட்டவும்—ஒவ்வொரு தட்டலும் மேலும் எழுத்துக்களைக் காட்டும். முழு வரியையும் உடனடியாக முடிக்க "வெளிப்படுத்து" பொத்தானைப் பயன்படுத்தவும்',
        tip_practice_replay: 'மீண்டும் செய்: வரி முடிந்ததும், அதை மீண்டும் பயிற்சி செய்ய "வரியை மீண்டும் இயக்கு" தட்டவும்',
        tip_practice_navigate: 'நகர்த்து: ← → அம்பு விசைகள், முந்தைய/அடுத்த பொத்தான்கள், அல்லது ஸ்வைப் ஜெஸ்சர்களைப் பயன்படுத்தவும். முதல்/இறுதி பொத்தான்கள் தொடக்கம்/முடிவுக்கு செல்கின்றன. ஹோம்/எண்ட் விசைகளும் வேலை செய்கின்றன. அத்தியாய வரிகள் தானாக தவிர்க்கப்படும்',
        tip_practice_progress: 'முன்னேற்றம்: கீழே உள்ள வண்ண புள்ளிகள் முடிந்த வரிகளை (பச்சை) மற்றும் தற்போதைய நிலையை (நீலம்) காட்டுகின்றன. எண்ணிக்கை மொத்த பயிற்சி செய்யப்பட்ட வரிகளைக் காட்டுகிறது',
        tip_practice_jump: 'வரிக்குச் செல்: எந்த வரி எண்ணுக்கும் விரைவாக செல்ல தேடல் பெட்டியைப் பயன்படுத்தவும்',
        tip_practice_exit: 'பயிற்சியில் இருந்து வெளியேறு: வாசிப்பு முறைக்குத் திரும்ப தலைப்பில் "பயிற்சியில் இருந்து வெளியேறு" பொத்தானைப் பயன்படுத்தவும்',
        tip_practice_search: 'தேடு: பயிற்சி முறையிலும் <strong>⌘K</strong> அல்லது <strong>/</strong> அழுத்தவும்',
        tip_puzzle_enter: '🧩 <strong>புதிர் முறை</strong>: டாக்கில் <strong>Puzzle</strong> (மொபைல்) அல்லது தலைப்பில் கிரிட் ஐகான் தட்டவும்.',
        tip_puzzle_arrange: 'அமை: கீழே குழப்பமான சொற்களைத் தட்டி அவற்றை வரிசையில் வைக்கவும். வைக்கப்பட்ட சொற்களை அகற்ற அவற்றைத் தட்டவும்',
        tip_puzzle_hints: 'குறிப்புகள்: ஒவ்வொரு குறிப்பும் தொடக்கத்திலிருந்து ஒரு சொல்லை மேலும் வெளிப்படுத்தும். அதிகபட்ச குறிப்புகள் = சொற்கள் - 1 (அதிகபட்ச 4)',
        tip_puzzle_reveal: 'வெளிப்படுத்து: உடனடியாக முழு தீர்வையும் காட்டுகிறது',
        tip_puzzle_replay: 'மீண்டும் செய்: தீர்த்த பிறகு, மீண்டும் முயற்சிக்க "மீண்டும் செய்" தட்டவும்',
        tip_puzzle_confetti: 'கான்பெட்டி: முதல் சரியான முயற்சியில் தீர்க்க விழா எடுங்கள்!',
        tip_puzzle_navigate: 'நகர்த்து: ← → அம்பு விசைகள், முந்தைய/அடுத்த பொத்தான்கள், அல்லது புதிர்களுக்கு இடையே ஸ்வைப் ஜெஸ்சர்களைப் பயன்படுத்தவும்',
        chapters_title: 'அத்தியாயங்கள்',
        chapters_hint: 'ஒரு அத்தியாயத்தைத் தட்டினால் அந்த இடத்திற்குச் செல்கிறது; பிளே மானுவல் நிலையிலேயே இருக்கும்.',
        close: 'மூடு',
        help_account_tab: 'கணக்கு & முன்னேற்றம்',
        tip_account_login: '🔐 <strong>உள்நுழையவும்</strong>: Google மூலம் உள்நுழைந்து அனைத்து சாதனங்களிலும் உங்கள் முன்னேற்றத்தை ஒத்திசைக்கவும்।',
        tip_account_guest: '👤 <strong>விருந்தினர் முறை</strong>: உள்நுழையாமல் அனைத்து அம்சங்களையும் பயன்படுத்தவும். உங்கள் முன்னேற்றம் உள்ளூரில் சேமிக்கப்படும்.',
        tip_account_streaks: '🔥 <strong>ஸ்ட்ரீக்குகள்</strong>: தினமும் பயிற்சி செய்து உங்கள் ஸ்ட்ரீக்கை வளர்க்கவும்! ஒவ்வொரு நாளும் குறைந்தது ஒரு வரியை முடிக்கவும்.',
        tip_account_daily: '🎯 <strong>தினசரி இலக்குகள்</strong>: வரிகள் (இயல்புநிலை: 10) மற்றும் புதிர்கள் (இயல்புநிலை: 5) க்கு தனிப்பட்ட இலக்குகளை அமைக்கவும்.',
        tip_account_badges: '🏆 <strong>பேட்ஜ்கள்</strong>: முதல் வரி, 7-நாள் ஸ்ட்ரீக், ஸ்தோத்திரங்களை முடித்தல் போன்ற மைல்கற்களுக்கு சாதனைகளைப் பெறுங்கள்.',
        tip_account_share: '📤 <strong>பகிர்</strong>: நீங்கள் சாதனையை திறக்கும்போது, சமூக ஊடகத்தில் பகிர பகிர் பட்டனை தட்டவும்.',
        tip_account_leaderboard: '🏅 <strong>தரவரிசை</strong>: மற்ற கற்பவர்களுடன் போட்டியிடுங்கள்! வாராந்திர, மாதாந்திர மற்றும் அனைத்து-நேர தரவரிசைகள்.'
      },
      guj: {
        app_title: 'અવબોધક', app_subtitle: 'વિષ્ણુ સહસ્રનામ',
        search: 'શોધો', help: 'મદદ', howto: 'કેવી રીતે વાપરવું', play: 'ચાલુ', pause: 'મેન્યુઅલ', pace: 'ગતિ', tips: 'સૂચનો', footer_hint: 'શરૂ કરવા પ્લે દબાવો; ગતિને પસંદ મુજબ સમાયોજિત કરો.',
        tip_play: '🔊 <strong>ટેક્સ્ટ-ટુ-સ્પીચ</strong>: વર્તમાન લાઇન સાંભળવા <strong>Play Line</strong> ટૅપ કરો. ડેસ્કટોપ પર <strong>Space</strong>. <strong>સ્વાઇપ</strong>/<strong>← →</strong> નેવિગેટ કરવા.',
        tip_pace: '📱 <strong>મોબાઇલ ડોક</strong>: નીચેની બારથી મોડ (Read/Practice/Puzzle) બદલો, <strong>Details</strong> અર્થો જુઓ, <strong>More</strong> સેટિંગ્સ માટે.',
        tip_timeline: '🧭 ટાઇમલાઇન: ખેંચીને લાઇન પર જાઓ. વર્તમાન શબ્દ પીળા રંગમાં હાઇલાઇટ.',
        tip_pronun: '🎧 ઉચ્ચારણ: સેટિંગ્સમાં સક્રિય કરો—અનુસ્વાર, વિસર્ગ, લાંબા સ્વરો વિઝ્યુઅલ સંકેતો સાથે.',
        tip_search: '🔍 શોધ: <strong>⌘K</strong>/<strong>/</strong> ખોલો. કોઈપણ શબ્દ/શ્લોક લખો (ફઝી સર્ચ). પરિણામ ટૅપ કરી ત્યાં જાઓ.',
        tip_chapters: '📚 અધ્યાય: "અધ્યાય" ચિપ ટૅપ કરી સીધા અધ્યાયની શરૂઆત પર જાઓ.',
        practice: 'પ્રેક્ટિસ', practice_mode: 'પ્રેક્ટિસ મોડ', difficulty: 'મુશ્કેલી', easy: 'સરળ', medium: 'મધ્યમ', hard: 'મુશ્કેલ',
        jump_to_line: 'જાઓ...', reveal: 'દેખાડો', replay_line: 'લાઈન રિપ્લે કરો', revealed: 'દેખાડ્યું', practiced: 'અભ્યાસ કર્યો', progress: 'પ્રગતિ', exit_practice: 'પ્રેક્ટિસમાંથી બહાર નીકળો', line: 'લાઈન',
        practice_hint: 'શબ્દો દર્શાવવા માટે ખાલી જગ્યાઓ ટૅપ કરો', practice_complete: 'શ્લોક અભ્યાસ કર્યો!', practice_progress: 'પ્રગતિ',
        help_play_tab: 'પ્લે મોડ', help_practice_tab: 'પ્રેક્ટિસ મોડ', help_puzzle_tab: 'વર્ડ પઝલ',
        tip_practice_enter: '🎯 <strong>પ્રેક્ટિસ મોડ</strong>: ડોકમાં <strong>Practice</strong> (મોબાઇલ) અથવા હેડરમાં પુસ્તક આઇકન ટૅપ કરો.',
        tip_practice_hints: '💡 સંકેત: શબ્દો શરૂઆતના અક્ષરો બતાવે છે—સરળ (50%), મધ્યમ (33%), મુશ્કેલ (25%)',
        tip_practice_reveal: '👁️ ધીમે ધીમે પ્રગટ: શબ્દ વારંવાર ટૅપ કરો—દરેક ટૅપ વધુ અક્ષરો બતાવે છે. સંપૂર્ણ લાઇન માટે "દેખાડો" બટન વાપરો',
        tip_practice_replay: '🔁 ફરીથી: લાઇન પૂર્ણ થયા પછી, ફરી અભ્યાસ કરવા "લાઈન રિપ્લે કરો" ટૅપ કરો',
        tip_practice_navigate: '🧭 નેવિગેટ: ← → એરો કી, Previous/Next બટન, અથવા સ્વાઇપ વાપરો. અધ્યાય લાઇન આપોઆપ છોડાય છે',
        tip_practice_progress: '📈 પ્રગતિ: નીચે રંગીન ડોટ પૂર્ણ લાઇન (લીલો) અને વર્તમાન સ્થાન (વાદળી) બતાવે છે',
        tip_practice_jump: '⏩ લાઇન પર જાઓ: કોઈપણ લાઇન નંબર પર ઝડપથી જવા શોધ બોક્સ વાપરો',
        tip_practice_exit: '⏹️ પ્રેક્ટિસ છોડો: વાંચન મોડમાં પાછા જવા હેડરમાં "પ્રેક્ટિસમાંથી બહાર નીકળો" વાપરો',
        tip_practice_search: '🔍 શોધ: પ્રેક્ટિસ મોડમાં પણ <strong>⌘K</strong>/<strong>/</strong> દબાવો',
        tip_puzzle_enter: '🧩 <strong>પઝલ મોડ</strong>: ડોકમાં <strong>Puzzle</strong> (મોબાઇલ) અથવા હેડરમાં ગ્રિડ આઇકન ટૅપ કરો.',
        tip_puzzle_arrange: '🧩 ગોઠવો: નીચે ગૂંચવાયેલા શબ્દો ટૅપ કરી ક્રમમાં મૂકો. મૂકેલા શબ્દો દૂર કરવા ટૅપ કરો',
        tip_puzzle_hints: '💡 સંકેત: દરેક સંકેત શરૂઆતથી એક વધુ શબ્દ પ્રગટ કરે છે. મહત્તમ = શબ્દો - 1 (4 સુધી)',
        tip_puzzle_reveal: '👁️ પ્રગટ: તરત સંપૂર્ણ ઉકેલ બતાવે છે',
        tip_puzzle_replay: '🔁 ફરીથી: ઉકેલ્યા પછી, ફરી પ્રયાસ કરવા "Replay" ટૅપ કરો',
        tip_puzzle_confetti: '🎉 કન્ફેટી: પ્રથમ સાચા પ્રયત્ને ઉકેલો અને ઉજવણી કરો!',
        tip_puzzle_navigate: '🧭 નેવિગેટ: ← → એરો કી, Previous/Next બટન, અથવા પઝલ વચ્ચે સ્વાઇપ વાપરો',
        help_account_tab: 'એકાઉન્ટ અને પ્રગતિ',
        tip_account_login: '🔐 <strong>સાઇન ઇન</strong>: Google વડે સાઇન ઇન કરો અને બધા ઉપકરણો પર તમારી પ્રગતિ સિંક કરો।',
        tip_account_guest: '👤 <strong>મહેમાન મોડ</strong>: સાઇન ઇન કર્યા વિના બધી સુવિધાઓ વાપરો. તમારી પ્રગતિ સ્થાનિક રીતે સેવ થાય છે.',
        tip_account_streaks: '🔥 <strong>સ્ટ્રીક</strong>: દરરોજ અભ્યાસ કરો અને તમારી સ્ટ્રીક વધારો! દર દિવસે ઓછામાં ઓછી એક લાઇન પૂર્ણ કરો.',
        tip_account_daily: '🎯 <strong>દૈનિક લક્ષ્યો</strong>: લાઇનો (ડિફોલ્ટ: 10) અને પઝલ (ડિફોલ્ટ: 5) માટે વ્યક્તિગત લક્ષ્યો સેટ કરો.',
        tip_account_badges: '🏆 <strong>બેજ</strong>: પહેલી લાઇન, 7-દિવસ સ્ટ્રીક, સ્તોત્ર પૂર્ણ કરવા જેવા મુકામ પર સિદ્ધિઓ મેળવો.',
        tip_account_share: '📤 <strong>શેર કરો</strong>: જ્યારે તમે સિદ્ધિ અનલોક કરો, સોશિયલ મીડિયા પર શેર કરવા શેર બટન ટૅપ કરો.',
        tip_account_leaderboard: '🏅 <strong>લીડરબોર્ડ</strong>: અન્ય શીખનારાઓ સાથે સ્પર્ધા કરો! સાપ્તાહિક, માસિક અને સર્વકાલીન રેન્કિંગ.'
      },
      pan: {
        app_title: 'ਅਵਬੋਧਕ', app_subtitle: 'ਵਿਸ਼੍ਣੁ ਸਹਸ੍ਰ ਨਾਮ',
        search: 'ਖੋਜ', help: 'ਮਦਦ', howto: 'ਕਿਵੇਂ ਵਰਤਣਾ ਹੈ', play: 'ਚਲਾਓ', pause: 'ਮੈਨੁਅਲ', pace: 'ਗਤੀ', tips: 'ਸੁਝਾਅ', footer_hint: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਪਲੇ ਦਬਾਓ; ਗਤੀ ਆਪਣੀ ਪਸੰਦ ਅਨੁਸਾਰ ਸੈੱਟ ਕਰੋ।',
        tip_play: '🔊 <strong>ਟੈਕਸਟ-ਟੂ-ਸਪੀਚ</strong>: ਮੌਜੂਦਾ ਲਾਈਨ ਸੁਣਨ ਲਈ ਥੱਲੇ <strong>Play Line</strong> ਟੈਪ ਕਰੋ। ਡੈਸਕਟਾਪ ਤੇ <strong>Space</strong>। <strong>ਸਵਾਈਪ</strong>/<strong>← →</strong> ਨੇਵੀਗੇਟ ਕਰਨ ਲਈ।',
        tip_pace: '📱 <strong>ਮੋਬਾਈਲ ਡੌਕ</strong>: ਥੱਲੇ ਬਾਰ ਨਾਲ ਮੋਡ (Read/Practice/Puzzle) ਬਦਲੋ, <strong>Details</strong> ਅਰਥ ਵੇਖੋ, <strong>More</strong> ਸੈਟਿੰਗਾਂ ਲਈ।',
        tip_timeline: '🧭 ਟਾਈਮਲਾਈਨ: ਖਿੱਚ ਕੇ ਲਾਈਨਾਂ ਤੇ ਜਾਓ। ਮੌਜੂਦਾ ਸ਼ਬਦ ਪੀਲੇ ਰੰਗ ਵਿੱਚ ਹਾਈਲਾਈਟ।',
        tip_pronun: '🎧 ਉਚਾਰਣ: ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਓਨ ਕਰੋ—ਅਨੁਸਵਾਰ, ਵਿਸਰਗ, ਲੰਬੇ ਸਵਰ ਵਿਜ਼ੂਅਲ ਸੰਕੇਤਾਂ ਨਾਲ।',
        tip_search: '🔍 ਖੋਜ: <strong>⌘K</strong>/<strong>/</strong> ਖੋਲ੍ਹੋ। ਕੋਈ ਸ਼ਬਦ/ਸ਼ਲੋਕ ਲਿਖੋ (ਫਜ਼ੀ ਸਰਚ)। ਨਤੀਜੇ ਟੈਪ ਕਰੋ ਉੱਥੇ ਜਾਣ ਲਈ।',
        tip_chapters: '📚 ਅਧਿਆਇ: "ਅਧਿਆਇ" ਚਿਪ ਟੈਪ ਕਰਕੇ ਸਿੱਧੇ ਅਧਿਆਇ ਦੀ ਸ਼ੁਰੂਆਤ ਤੇ ਜਾਓ।',
        practice: 'ਅਭਿਆਸ', practice_mode: 'ਅਭਿਆਸ ਮੋਡ', difficulty: 'ਮੁਸ਼ਕਲ', easy: 'ਆਸਾਨ', medium: 'ਮੱਧਮ', hard: 'ਔਖਾ',
        jump_to_line: 'ਜਾਓ...', reveal: 'ਦਿਖਾਓ', replay_line: 'ਲਾਈਨ ਦੁਹਰਾਓ', revealed: 'ਦਿਖਾਇਆ ਗਿਆ', practiced: 'ਅਭਿਆਸ ਕੀਤਾ', progress: 'ਤਰੱਕੀ', exit_practice: 'ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ', line: 'ਲਾਈਨ',
        practice_hint: 'ਸ਼ਬਦ ਦਿਖਾਉਣ ਲਈ ਖਾਲੀ ਟੈਪ ਕਰੋ', practice_complete: 'ਸ਼ਲੋਕ ਅਭਿਆਸ ਕੀਤਾ!', practice_progress: 'ਤਰੱਕੀ',
        help_play_tab: 'ਪਲੇ ਮੋਡ', help_practice_tab: 'ਅਭਿਆਸ ਮੋਡ', help_puzzle_tab: 'ਵਰਡ ਪਜ਼ਲ',
        tip_practice_enter: '🎯 <strong>ਅਭਿਆਸ ਮੋਡ</strong>: ਡੌਕ ਵਿੱਚ <strong>Practice</strong> (ਮੋਬਾਈਲ) ਜਾਂ ਹੇਡਰ ਵਿੱਚ ਕਿਤਾਬ ਆਈਕਨ ਟੈਪ ਕਰੋ।',
        tip_practice_hints: '💡 ਸੰਕੇਤ: ਸ਼ਬਦ ਸ਼ੁਰੂਆਤੀ ਅੱਖਰ ਦਿਖਾਉਂਦੇ ਹਨ—ਆਸਾਨ (50%), ਮੱਧਮ (33%), ਔਖਾ (25%)',
        tip_practice_reveal: '👁️ ਧੀਰੇ ਧੀਰੇ ਖੁਲਾਸਾ: ਸ਼ਬਦ ਨੂੰ ਕਈ ਵਾਰ ਟੈਪ ਕਰੋ—ਹਰ ਟੈਪ ਵਧੇਰੇ ਅੱਖਰ ਦਿਖਾਉਂਦਾ ਹੈ। ਪੂਰੀ ਲਾਈਨ ਫੌਰਨ ਪੂਰੀ ਕਰਨ ਲਈ "ਦਿਖਾਓ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_replay: '🔁 ਦੁਹਰਾਓ: ਲਾਈਨ ਪੂਰੀ ਹੋਣ ਦੇ ਬਾਅਦ, ਇਸਨੂੰ ਦੁਬਾਰਾ ਅਭਿਆਸ ਕਰਨ ਲਈ "ਲਾਈਨ ਦੁਹਰਾਓ" ਟੈਪ ਕਰੋ',
        tip_practice_navigate: '🧭 ਨੇਵੀਗੇਟ: ← → ਤੀਰ ਕੁੰਜੀਆਂ, ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨਾਂ, ਜਾਂ ਸਵਾਈਪ ਜੈਸਚਰਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ। ਪਹਿਲਾ/ਆਖਿਰੀ ਬਟਨਾਂ ਸ਼ੁਰੂਆਤ/ਅੰਤ ਵਿੱਚ ਜਾਂਦੇ ਹਨ। ਹੋਮ/ਐਂਡ ਕੁੰਜੀਆਂ ਵੀ ਕੰਮ ਕਰਦੀਆਂ ਹਨ। ਅਧਿਆਇ ਲਾਈਨਾਂ ਆਪਣੇ ਆਪ ਛੱਡੀਆਂ ਜਾਂਦੀਆਂ ਹਨ',
        tip_practice_progress: '📈 ਤਰੱਕੀ: ਹੇਠਾਂ ਰੰਗੀਨ ਡੌਟ ਪੂਰੀਆਂ ਲਾਈਨਾਂ (ਹਰਾ) ਅਤੇ ਮੌਜੂਦਾ ਸਥਿਤੀ (ਨੀਲਾ) ਦਿਖਾਉਂਦੇ ਹਨ। ਕਾਊਂਟਰ ਕੁੱਲ ਅਭਿਆਸ ਕੀਤੀਆਂ ਲਾਈਨਾਂ ਦਿਖਾਉਂਦਾ ਹੈ',
        tip_practice_jump: '⏩ ਲਾਈਨ ਵਿੱਚ ਜਾਓ: ਕਿਸੇ ਵੀ ਲਾਈਨ ਨੰਬਰ ਤੇ ਤੇਜ਼ੀ ਨਾਲ ਨੇਵੀਗੇਟ ਕਰਨ ਲਈ ਸਰਚ ਬਾਕਸ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_exit: '⏹️ ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ: ਰੀਡਿੰਗ ਮੋਡ ਵਿੱਚ ਵਾਪਸ ਜਾਣ ਲਈ ਹੇਡਰ ਵਿੱਚ "ਅਭਿਆਸ ਵਿੱਚੋਂ ਬਾਹਰ ਨਿਕਲੋ" ਬਟਨ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        tip_practice_search: '🔍 ਖੋਜੋ: ਅਭਿਆਸ ਮੋਡ ਵਿੱਚ ਵੀ <strong>⌘K</strong> ਜਾਂ <strong>/</strong> ਦਬਾਓ',
        tip_puzzle_enter: '🧩 <strong>ਪਜ਼ਲ ਮੋਡ</strong>: ਡੌਕ ਵਿੱਚ <strong>Puzzle</strong> (ਮੋਬਾਈਲ) ਜਾਂ ਹੇਡਰ ਵਿੱਚ ਗ੍ਰਿਡ ਆਈਕਨ ਟੈਪ ਕਰੋ।',
        tip_puzzle_arrange: '🧩 ਗੋਢੋ: ਹੇਠਾਂ ਦਿੱਤੇ ਗੁਲਮਲ ਸ਼ਬਦਾਂ ’ਤੇ ਟੈਪ ਕਰੋ ਤਾਂ ਜੋ ਉਹਨਾਂ ਨੂੰ ਸਹੀ ਕ੍ਰਮ ਵਿੱਚ ਰੱਖ ਸਕੋ। ਰੱਖੇ ਸ਼ਬਦਾਂ ਨੂੰ ਹਟਾਉਣ ਲਈ ਉਨ੍ਹਾਂ ’ਤੇ ਟੈਪ ਕਰੋ',
        tip_puzzle_hints: '💡 ਸੰਕੇਤ: ਹਰ ਸੰਕੇਤ ਸ਼ੁਰੂ ਤੋਂ ਇੱਕ ਹੋਰ ਸ਼ਬਦ ਦਿਖਾਉਂਦਾ ਹੈ। ਵੱਧ ਤੋਂ ਵੱਧ ਸੰਕੇਤ = ਸ਼ਬਦ - 1 (ਜ਼ਿਆਦਾ ਤੋਂ ਜ਼ਿਆਦਾ 4)',
        tip_puzzle_reveal: '👁️ ਦਿਖਾਓ: ਤੁਰੰਤ ਪੂਰਾ ਹੱਲ ਦਿਖਾਉਂਦਾ ਹੈ',
        tip_puzzle_replay: '🔁 ਦੁਹਰਾਓ: ਹੱਲ ਕਰਨ ਤੋਂ ਬਾਅਦ, ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰਨ ਲਈ "ਰੀਪਲੇ" ਟੈਪ ਕਰੋ',
        tip_puzzle_confetti: "🎉 ਕਨਫੈਟੀ: ਪਹਿਲੇ ਸਹੀ ਯਤਨ 'ਤੇ ਹੱਲ ਕਰੋ ਅਤੇ ਜਸ਼ਨ ਮਨਾਓ!",
        tip_puzzle_navigate: '🧭 ਨੇਵੀਗੇਟ: ← → ਤੀਰ ਕੁੰਜੀਆਂ, ਪਿਛਲਾ/ਅਗਲਾ ਬਟਨਾਂ, ਜਾਂ ਪਜ਼ਲਾਂ ਦੇ ਵਿਚਕਾਰ ਸਵਾਈਪ ਜੈਸਚਰਾਂ ਦੀ ਵਰਤੋਂ ਕਰੋ',
        chapters_title: 'ਅਧਿਆਇ',
        chapters_hint: "ਅਧਿਆਇ 'ਤੇ ਟੈਪ ਕਰਕੇ ਉੱਥੇ ਜਾਓ; ਪਲੇਬੈਕ ਮੈਨੁਅਲ ਸਥਿਤੀ ਵਿੱਚ ਹੀ ਰਹਿੰਦਾ ਹੈ।",
        close: 'ਬੰਦ ਕਰੋ',
        help_account_tab: 'ਖਾਤਾ ਅਤੇ ਤਰੱਕੀ',
        tip_account_login: '🔐 <strong>ਸਾਈਨ ਇਨ</strong>: Google ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ ਅਤੇ ਸਾਰੇ ਡਿਵਾਈਸਾਂ ਤੇ ਆਪਣੀ ਤਰੱਕੀ ਸਿੰਕ ਕਰੋ।',
        tip_account_guest: '👤 <strong>ਮਹਿਮਾਨ ਮੋਡ</strong>: ਸਾਈਨ ਇਨ ਕੀਤੇ ਬਿਨਾਂ ਸਾਰੀਆਂ ਸੁਵਿਧਾਵਾਂ ਵਰਤੋ। ਤੁਹਾਡੀ ਤਰੱਕੀ ਸਥਾਨਕ ਤੌਰ ਤੇ ਸੁਰੱਖਿਅਤ ਹੈ।',
        tip_account_streaks: '🔥 <strong>ਸਟ੍ਰੀਕ</strong>: ਰੋਜ਼ਾਨਾ ਅਭਿਆਸ ਕਰੋ ਅਤੇ ਆਪਣੀ ਸਟ੍ਰੀਕ ਵਧਾਓ! ਹਰ ਦਿਨ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਲਾਈਨ ਪੂਰੀ ਕਰੋ।',
        tip_account_daily: '🎯 <strong>ਰੋਜ਼ਾਨਾ ਟੀਚੇ</strong>: ਲਾਈਨਾਂ (ਡਿਫਾਲਟ: 10) ਅਤੇ ਪਜ਼ਲ (ਡਿਫਾਲਟ: 5) ਲਈ ਨਿੱਜੀ ਟੀਚੇ ਸੈੱਟ ਕਰੋ।',
        tip_account_badges: '🏆 <strong>ਬੈਜ</strong>: ਪਹਿਲੀ ਲਾਈਨ, 7-ਦਿਨ ਸਟ੍ਰੀਕ, ਸਤੋਤਰ ਪੂਰੇ ਕਰਨ ਵਰਗੇ ਮੀਲ ਪੱਥਰਾਂ ਲਈ ਪ੍ਰਾਪਤੀਆਂ ਕਮਾਓ।',
        tip_account_share: '📤 <strong>ਸ਼ੇਅਰ ਕਰੋ</strong>: ਜਦੋਂ ਤੁਸੀਂ ਪ੍ਰਾਪਤੀ ਅਨਲੌਕ ਕਰੋ, ਸੋਸ਼ਲ ਮੀਡੀਆ ਤੇ ਸ਼ੇਅਰ ਕਰਨ ਲਈ ਸ਼ੇਅਰ ਬਟਨ ਟੈਪ ਕਰੋ।',
        tip_account_leaderboard: '🏅 <strong>ਲੀਡਰਬੋਰਡ</strong>: ਹੋਰ ਸਿੱਖਣ ਵਾਲਿਆਂ ਨਾਲ ਮੁਕਾਬਲਾ ਕਰੋ! ਹਫ਼ਤਾਵਾਰੀ, ਮਹੀਨਾਵਾਰ ਅਤੇ ਸਰਬ-ਸਮੇਂ ਦੀ ਰੈਂਕਿੰਗ।'
      },
      mr: {
        app_title: 'अवबोधक', app_subtitle: 'विष्णु सहस्रनाम',
        search: 'शोधा', help: 'मदत', howto: 'कसे वापरायचे', play: 'प्ले', pause: 'मॅन्युअल', pace: 'गती', tips: 'सूचना', footer_hint: 'सुरू करण्यासाठी प्ले दाबा; गती समायोजित करा.',
        tip_play: '🔊 <strong>टेक्स्ट-टू-स्पीच</strong>: सध्याची ओळ ऐकण्यासाठी खाली <strong>Play Line</strong> टॅप करा। डेस्कटॉपवर <strong>Space</strong>। <strong>स्वाइप</strong>/<strong>← →</strong> नेव्हिगेट करण्यासाठी।',
        tip_pace: '📱 <strong>मोबाइल डॉक</strong>: खालच्या बारने मोड (Read/Practice/Puzzle) बदला, <strong>Details</strong> अर्थ पहा, <strong>More</strong> सेटिंग्ज साठी.',
        tip_timeline: '🧭 टाइमलाइन: ओढून ओळींवर जा. सध्याचा शब्द पिवळ्या रंगात हायलाइट.',
        tip_pronun: '🎧 उच्चारण: सेटिंग्ज मध्ये सक्रिय करा—अनुस्वार, विसर्ग, दीर्घ स्वर व्हिज्युअल संकेतांसह.',
        tip_search: '🔍 शोध: <strong>⌘K</strong>/<strong>/</strong> उघडा. कोणताही शब्द/श्लोक लिहा (फझी सर्च). निकालावर टॅप करा तेथे जाण्यासाठी.',
        tip_chapters: '📚 अध्याय: "अध्याय" चिप टॅप करून थेट अध्यायाच्या सुरुवातीला जा.',
        practice: 'अभ्यास', practice_mode: 'अभ्यास मोड', difficulty: 'अडचण', easy: 'सोपे', medium: 'मध्यम', hard: 'कठीण',
        jump_to_line: 'जा...', reveal: 'दाखवा', replay_line: 'ओळ पुन्हा चालू करा', revealed: 'दाखवले', practiced: 'अभ्यास केला', progress: 'प्रगती', exit_practice: 'अभ्यासातून बाहेर पडा', line: 'ओळ',
        practice_hint: 'शब्द दाखवण्यासाठी रिक्त ठिकाणे टॅप करा', practice_complete: 'श्लोक सराव केला!', practice_progress: 'प्रगती',
        help_play_tab: 'प्ले मोड', help_practice_tab: 'अभ्यास मोड', help_puzzle_tab: 'वर्ड पझल',
        tip_practice_enter: '🎯 <strong>अभ्यास मोड</strong>: डॉकमध्ये <strong>Practice</strong> (मोबाइल) किंवा हेडरमध्ये पुस्तक आयकॉन टॅप करा.',
        tip_practice_hints: 'सूचना: शब्द सुरुवातीचे अक्षरे दाखवतात—सोपे (50%), मध्यम (33%), कठीण (25%)',
        tip_practice_reveal: 'क्रमशः प्रकटीकरण: शब्द अनेकदा टॅप करा—प्रत्येक टॅप अधिक अक्षरे प्रकट करतो. संपूर्ण ओळ त्वरित पूर्ण करण्यासाठी "दाखवा" बटन वापरा',
        tip_practice_replay: 'पुन्हा चालू करा: ओळ पूर्ण झाल्यानंतर, ती पुन्हा अभ्यास करण्यासाठी "ओळ पुन्हा चालू करा" टॅप करा',
        tip_practice_navigate: 'नॅव्हिगेट: ← → बाण की, मागील/पुढील बटणे, किंवा स्वाइप जेश्चर वापरा. पहिली/शेवटची बटणे सुरुवात/शेवटी जातात. होम/एंड की देखील कार्य करतात. अध्याय ओळी आपोआप वगळल्या जातात',
        tip_practice_progress: 'प्रगती: खाली रंगीत डॉट पूर्ण झालेल्या ओळी (हिरवा) आणि सद्यस्थिती (निळा) दाखवतात. काउंटर एकूण अभ्यास केलेल्या ओळी दाखवतो',
        tip_practice_jump: 'ओळमध्ये जा: कोणत्याही ओळ क्रमांकावर त्वरित नेव्हिगेट करण्यासाठी शोध बॉक्स वापरा',
        tip_practice_exit: 'अभ्यासातून बाहेर पडा: वाचन मोडमध्ये परत जाण्यासाठी हेडरमध्ये "अभ्यासातून बाहेर पडा" बटन वापरा',
        tip_practice_search: 'शोधा: अभ्यास मोडमध्ये देखील <strong>⌘K</strong> किंवा <strong>/</strong> दाबा',
        tip_puzzle_enter: '🧩 <strong>पझल मोड</strong>: डॉकमध्ये <strong>Puzzle</strong> (मोबाइल) किंवा हेडरमध्ये ग्रिड आयकॉन टॅप करा.',
        tip_puzzle_arrange: '🧩 लावा: खाली गोंधळलेले शब्द टॅप करून क्रमाने ठेवा. ठेवलेले शब्द काढण्यासाठी टॅप करा',
        tip_puzzle_hints: '💡 संकेत: प्रत्येक संकेत सुरुवातीपासून आणखी एक शब्द दाखवतो. कमाल = शब्द - 1 (4 पर्यंत)',
        tip_puzzle_reveal: '👁️ दाखवा: लगेच संपूर्ण उत्तर दाखवतो',
        tip_puzzle_replay: '🔁 पुन्हा: सोडवल्यानंतर, पुन्हा प्रयत्न करण्यासाठी "Replay" टॅप करा',
        tip_puzzle_confetti: '🎉 कॉन्फेटी: पहिल्याच बरोबर प्रयत्नात सोडवा आणि उत्सव साजरा करा!',
        tip_puzzle_navigate: '🧭 नेव्हिगेट: ← → एरो की, Previous/Next बटणे, किंवा पझल मध्ये स्वाइप वापरा',
        help_account_tab: 'खाते आणि प्रगती',
        tip_account_login: '🔐 <strong>साइन इन</strong>: Google ने साइन इन करा आणि सर्व उपकरणांवर तुमची प्रगती सिंक करा.',
        tip_account_guest: '👤 <strong>अतिथी मोड</strong>: साइन इन न करता सर्व वैशिष्ट्ये वापरा. तुमची प्रगती स्थानिक पातळीवर जतन केली जाते.',
        tip_account_streaks: '🔥 <strong>स्ट्रीक</strong>: रोज अभ्यास करा आणि तुमची स्ट्रीक वाढवा! दररोज किमान एक ओळ पूर्ण करा.',
        tip_account_daily: '🎯 <strong>दैनिक लक्ष्य</strong>: ओळी (डीफॉल्ट: 10) आणि पझल (डीफॉल्ट: 5) साठी वैयक्तिक लक्ष्य सेट करा.',
        tip_account_badges: '🏆 <strong>बॅज</strong>: पहिली ओळ, 7-दिवस स्ट्रीक, स्तोत्र पूर्ण करणे यांसारख्या टप्प्यांसाठी उपलब्धी मिळवा.',
        tip_account_share: '📤 <strong>शेअर करा</strong>: जेव्हा तुम्ही उपलब्धी अनलॉक करता, सोशल मीडियावर शेअर करण्यासाठी शेअर बटण टॅप करा.',
        tip_account_leaderboard: '🏅 <strong>लीडरबोर्ड</strong>: इतर शिकणाऱ्यांशी स्पर्धा करा! साप्ताहिक, मासिक आणि सर्वकालीन रँकिंग.'
      },
      ben: {
        app_title: 'অববোধক', app_subtitle: 'বিষ্ণু সহস্রনাম',
        search: 'খুঁজুন', help: 'সহায়তা', howto: 'কিভাবে ব্যবহার করবেন', play: 'চালান', pause: 'ম্যানুয়াল', pace: 'গতি', tips: 'টিপস', footer_hint: 'শুরু করতে প্লে চাপুন; গতি সামঞ্জস্য করুন।',
        tip_play: '🔊 <strong>টেক্সট-টু-স্পিচ</strong>: বর্তমান লাইন শুনতে নিচে <strong>Play Line</strong> ট্যাপ করুন। ডেস্কটপে <strong>Space</strong>। <strong>সোয়াইপ</strong>/<strong>← →</strong> নেভিগেট করতে।',
        tip_pace: '📱 <strong>মোবাইল ডক</strong>: নিচের বার দিয়ে মোড (Read/Practice/Puzzle) বদলান, <strong>Details</strong> অর্থ দেখুন, <strong>More</strong> সেটিংসের জন্য।',
        tip_timeline: '🧭 টাইমলাইন: টেনে লাইনে যান। বর্তমান শব্দ হলুদ রঙে হাইলাইট।',
        tip_pronun: '🎧 উচ্চারণ: সেটিংসে সক্রিয় করুন—অনুস্বার, বিসর্গ, দীর্ঘ স্বর ভিজুয়াল সংকেত সহ।',
        tip_search: '🔍 খোঁজ: <strong>⌘K</strong>/<strong>/</strong> খুলুন। যেকোনো শব্দ/শ্লোক লিখুন (ফাজি সার্চ)। ফলাফলে ট্যাপ করে সেখানে যান।',
        tip_chapters: '📚 অধ্যায়: "অধ্যায়" চিপ ট্যাপ করে সরাসরি অধ্যায়ের শুরুতে যান।',
        practice: 'অনুশীলন', practice_mode: 'অনুশীলন মোড', difficulty: 'কঠিনতা', easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন',
        jump_to_line: 'যাও...', reveal: 'দেখাও', replay_line: 'লাইন রিপ্লে করুন', revealed: 'দেখানো হয়েছে', practiced: 'অনুশীলন করা হয়েছে', progress: 'অগ্রগতি', exit_practice: 'অনুশীলন থেকে বেরোন', line: 'লাইন',
        practice_hint: 'শব্দ প্রকাশ করতে ফাঁকা জায়গা ট্যাপ করুন', practice_complete: 'শ্লোক অনুশীলন করা হয়েছে!', practice_progress: 'অগ্রগতি',
        help_play_tab: 'প্লে মোড', help_practice_tab: 'অনুশীলন মোড', help_puzzle_tab: 'শব্দ ধাঁধা',
        tip_practice_enter: '🎯 <strong>অনুশীলন মোড</strong>: ডকে <strong>Practice</strong> (মোবাইল) বা হেডারে বই আইকন ট্যাপ করুন।',
        tip_practice_hints: 'সূচনা: শব্দগুলো শুরুর অক্ষর দেখায়—সহজ (50%), মাঝারি (33%), কঠিন (25%)',
        tip_practice_reveal: 'ধাপে ধাপে প্রকাশ: শব্দটি একাধিকবার ট্যাপ করুন—প্রতিটি ট্যাপ আরও অক্ষর প্রকাশ করে। সম্পূর্ণ লাইন তাৎক্ষণিকভাবে সম্পূর্ণ করতে "দেখাও" বোতামটি ব্যবহার করুন',
        tip_practice_replay: 'পুনরায় চালান: একটি লাইন সম্পূর্ণ হওয়ার পর, এটি আবার অনুশীলন করতে "লাইন রিপ্লে করুন" ট্যাপ করুন',
        tip_practice_navigate: 'নেভিগেট: ← → তীর কী, পূর্ববর্তী/পরবর্তী বোতাম, বা সোয়াইপ অঙ্গভঙ্গি ব্যবহার করুন। প্রথম/শেষ বোতামগুলো শুরু/শেষে যায়। হোম/এন্ড কীগুলোও কাজ করে। অধ্যায় লাইনগুলো স্বয়ংক্রিয়ভাবে এড়িয়ে যায়',
        tip_practice_progress: 'অগ্রগতি: নিচের রঙিন বিন্দুগুলো সম্পূর্ণ লাইনগুলো (সবুজ) এবং বর্তমান অবস্থান (নীল) দেখায়। গণনাকারী মোট অনুশীলন করা লাইনগুলো দেখায়',
        tip_practice_jump: 'লাইনে যান: যেকোনো লাইন নম্বরে দ্রুত নেভিগেট করতে সার্চ বক্স ব্যবহার করুন',
        tip_practice_exit: 'অনুশীলন থেকে বেরোন: রিডিং মোডে ফিরে যেতে হেডারে "অনুশীলন থেকে বেরোন" বোতামটি ব্যবহার করুন',
        tip_practice_search: 'খোঁজ করুন: অনুশীলন মোডেও <strong>⌘K</strong> বা <strong>/</strong> চাপুন',
        tip_puzzle_enter: '🧩 <strong>পাজল মোড</strong>: ডকে <strong>Puzzle</strong> (মোবাইল) বা হেডারে গ্রিড আইকন ট্যাপ করুন।',
        tip_puzzle_arrange: '🧩 সাজান: নিচে গুলিয়ে যাওয়া শব্দ ট্যাপ করে ক্রমে রাখুন। রাখা শব্দ সরাতে ট্যাপ করুন',
        tip_puzzle_hints: '💡 সংকেত: প্রতিটি সংকেত শুরু থেকে আরও একটি শব্দ দেখায়। সর্বোচ্চ = শব্দ - 1 (4 পর্যন্ত)',
        tip_puzzle_reveal: '👁️ দেখান: তাৎক্ষণিক সম্পূর্ণ সমাধান দেখায়',
        tip_puzzle_replay: '🔁 পুনরায়: সমাধান করার পর, আবার চেষ্টা করতে "Replay" ট্যাপ করুন',
        tip_puzzle_confetti: '🎉 কনফেটি: প্রথম সঠিক প্রচেষ্টায় সমাধান করে উদযাপন করুন!',
        tip_puzzle_navigate: '🧭 নেভিগেট: ← → তীর কী, Previous/Next বোতাম, বা পাজলের মধ্যে সোয়াইপ ব্যবহার করুন',
        help_account_tab: 'অ্যাকাউন্ট ও অগ্রগতি',
        tip_account_login: '🔐 <strong>সাইন ইন</strong>: Google দিয়ে সাইন ইন করুন এবং সব ডিভাইসে আপনার অগ্রগতি সিঙ্ক করুন।',
        tip_account_guest: '👤 <strong>অতিথি মোড</strong>: সাইন ইন ছাড়াই সব বৈশিষ্ট্য ব্যবহার করুন। আপনার অগ্রগতি স্থানীয়ভাবে সংরক্ষিত হয়।',
        tip_account_streaks: '🔥 <strong>স্ট্রিক</strong>: প্রতিদিন অনুশীলন করুন এবং আপনার স্ট্রিক বাড়ান! প্রতিদিন কমপক্ষে একটি লাইন সম্পূর্ণ করুন।',
        tip_account_daily: '🎯 <strong>দৈনিক লক্ষ্য</strong>: লাইন (ডিফল্ট: 10) এবং পাজল (ডিফল্ট: 5) এর জন্য ব্যক্তিগত লক্ষ্য সেট করুন।',
        tip_account_badges: '🏆 <strong>ব্যাজ</strong>: প্রথম লাইন, 7-দিনের স্ট্রিক, স্তোত্র সম্পূর্ণ করার মতো মাইলফলকে অর্জন করুন।',
        tip_account_share: '📤 <strong>শেয়ার করুন</strong>: যখন আপনি অর্জন আনলক করেন, সোশ্যাল মিডিয়ায় শেয়ার করতে শেয়ার বোতাম ট্যাপ করুন।',
        tip_account_leaderboard: '🏅 <strong>লিডারবোর্ড</strong>: অন্য শিক্ষার্থীদের সাথে প্রতিযোগিতা করুন! সাপ্তাহিক, মাসিক এবং সর্বকালের র্যাঙ্কিং।'
      },
      mal: {
        app_title: 'അവബോധക', app_subtitle: 'വിഷ്ണു സഹസ്രനാമം',
        search: 'തിരയുക', help: 'സഹായം', howto: 'എങ്ങനെ ഉപയോഗിക്കാം', play: 'പ്ലേ', pause: 'മാനുവൽ', pace: 'വേഗം', tips: 'ടിപ്സ്', footer_hint: 'പ്ലേ അമർത്തി ആരംഭിക്കുക; വേഗം ക്രമീകരിക്കുക.',
        tip_play: '🔊 <strong>ടെക്സ്റ്റ്-ടു-സ്പീച്ച്</strong>: നിലവിലെ ലൈൻ കേൾക്കാൻ താഴെ <strong>Play Line</strong> ടാപ്പ് ചെയ്യുക. ഡെസ്ക്ടോപ്പിൽ <strong>Space</strong>. <strong>സ്വൈപ്പ്</strong>/<strong>← →</strong> നാവിഗേറ്റ് ചെയ്യാൻ.',
        tip_pace: '📱 <strong>മൊബൈൽ ഡോക്ക്</strong>: താഴെയുള്ള ബാർ വഴി മോഡ് (Read/Practice/Puzzle) മാറ്റുക, <strong>Details</strong> അർത്ഥം കാണുക, <strong>More</strong> സെറ്റിംഗ്സിനായി.',
        tip_timeline: '🧭 ടൈംലൈൻ: വലിച്ച് ലൈനുകളിലേക്ക് പോകുക. നിലവിലെ വാക്ക് മഞ്ഞ നിറത്തിൽ ഹൈലൈറ്റ്.',
        tip_pronun: '🎧 ഉച്ചാരണം: സെറ്റിംഗ്സിൽ സജീവമാക്കുക—അനുസ്വാരം, വിസർഗം, ദീർഘ സ്വരങ്ങൾ വിഷ്വൽ സൂചനകളോടെ.',
        tip_search: '🔍 തിരയൽ: <strong>⌘K</strong>/<strong>/</strong> തുറക്കുക. ഏതെങ്കിലും വാക്ക്/ശ്ലോകം എഴുതുക (ഫസി സെർച്ച്). ഫലത്തിൽ ടാപ്പ് ചെയ്ത് അവിടേക്ക് പോകുക.',
        tip_chapters: '📚 അധ്യായങ്ങൾ: "അധ്യായങ്ങൾ" ചിപ്പ് ടാപ്പ് ചെയ്ത് നേരിട്ട് അധ്യായത്തിന്റെ തുടക്കത്തിലേക്ക് പോകുക.',
        practice: 'അഭ്യസിക്കുക', practice_mode: 'അഭ്യാസ മോഡ്', difficulty: 'സങ്കീർണ്ണത', easy: 'എളുപ്പം', medium: 'ഇടത്തരം', hard: 'കഠിനം',
        jump_to_line: 'പോകൂ...', reveal: 'കാണിക്കുക', replay_line: 'ലൈൻ വീണ്ടും പ്ലേ ചെയ്യുക', revealed: 'കാണിച്ചു', practiced: 'അഭ്യസിച്ചു', progress: 'പുരോഗതി', exit_practice: 'അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക', line: 'ലൈൻ',
        practice_hint: 'വാക്കുകൾ വെളിപ്പെടുത്താൻ ശൂന്യ ഇടങ്ങൾ ടാപ്പ് ചെയ്യുക', practice_complete: 'ശ്ലോകം പരിശീലിച്ചു!', practice_progress: 'പുരോഗതി',
        help_play_tab: 'പ്ലേ മോഡ്', help_practice_tab: 'അഭ്യാസ മോഡ്', help_puzzle_tab: 'വേഡ് പസിൽ',
        tip_practice_enter: '🎯 <strong>അഭ്യാസ മോഡ്</strong>: ഡോക്കിൽ <strong>Practice</strong> (മൊബൈൽ) അല്ലെങ്കിൽ ഹെഡറിൽ പുസ്തക ഐക്കൺ ടാപ്പ് ചെയ്യുക.',
        tip_practice_hints: 'സൂചനകൾ: വാക്കുകൾ ആരംഭ അക്ഷരങ്ങൾ കാണിക്കുന്നു—എളുപ്പം (50%), ഇടത്തരം (33%), കഠിനം (25%)',
        tip_practice_reveal: 'ഘട്ടം ഘട്ടമായി വെളിപ്പെടുത്തൽ: വാക്ക് ഒന്നിലധികം തവണ ടാപ്പ് ചെയ്യുക—ഓരോ ടാപ്പും കൂടുതൽ അക്ഷരങ്ങൾ വെളിപ്പെടുത്തുന്നു. മുഴുവൻ ലൈൻ ഉടനെ പൂർത്തിയാക്കാൻ "കാണിക്കുക" ബട്ടൺ ഉപയോഗിക്കുക',
        tip_practice_replay: 'വീണ്ടും പ്ലേ ചെയ്യുക: ഒരു വരി പൂർത്തിയായതിന് ശേഷം, അത് വീണ്ടും അഭ്യസിക്കാൻ "ലൈൻ വീണ്ടും പ്ലേ ചെയ്യുക" ടാപ്പ് ചെയ്യുക',
        tip_practice_navigate: 'നാവിഗേറ്റ് ചെയ്യുക: ← → അമ്പ് കീകൾ, മുൻപുള്ള/അടുത്ത ബട്ടണുകൾ, അല്ലെങ്കിൽ സ്വൈപ്പ് ജെസ്ച്ചറുകൾ ഉപയോഗിക്കുക. ആദ്യം/അവസാനം ബട്ടണുകൾ ആരംഭം/അവസാനത്തിലേക്ക് പോകുന്നു. ഹോം/എൻഡ് കീകളും പ്രവർത്തിക്കുന്നു. അധ്യായ വരികൾ സ്വയം ഒഴിവാക്കപ്പെടുന്നു',
        tip_practice_progress: 'പുരോഗതി: താഴെ വർണ്ണ ഡോട്ടുകൾ പൂർത്തിയായ ലൈനുകൾ (പച്ച) മറിയും നിലവിലെ സ്ഥാനം (നീല) കാണിക്കുന്നു. എണ്ണക്കൂട്ട് ആകെ അഭ്യസിച്ച ലൈനുകൾ കാണിക്കുന്നു',
        tip_practice_jump: 'ലൈനിലേക്ക് പോകുക: ഏതെങ്കിലും ലൈൻ നമ്പറിലേക്ക് വേഗം നാവിഗേറ്റ് ചെയ്യാൻ തിരയൽ ബോക്സ് ഉപയോഗിക്കുക',
        tip_practice_exit: 'അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക: റീഡിംഗ് മോഡിലേക്ക് മടങ്ങാൻ ഹെഡറിൽ "അഭ്യാസത്തിൽ നിന്ന് പുറത്തുകടക്കുക" ബട്ടൺ ഉപയോഗിക്കുക',
        tip_practice_search: 'തിരയുക: അഭ്യാസ മോഡിലും <strong>⌘K</strong> അല്ലെങ്കിൽ <strong>/</strong> അമർത്തുക',
        tip_puzzle_enter: '🧩 <strong>പസിൽ മോഡ്</strong>: ഡോക്കിൽ <strong>Puzzle</strong> (മൊബൈൽ) അല്ലെങ്കിൽ ഹെഡറിൽ ഗ്രിഡ് ഐക്കൺ ടാപ്പ് ചെയ്യുക.',
        tip_puzzle_arrange: '🧩 ക്രമീകരിക്കുക: താഴെ കലർന്ന വാക്കുകൾ ടാപ്പ് ചെയ്ത് ക്രമത്തിൽ വയ്ക്കുക. വച്ച വാക്കുകൾ നീക്കം ചെയ്യാൻ ടാപ്പ് ചെയ്യുക',
        tip_puzzle_hints: '💡 സൂചനകൾ: ഓരോ സൂചനയും തുടക്കം മുതൽ ഒരു വാക്ക് കൂടി കാണിക്കുന്നു. പരമാവധി = വാക്കുകൾ - 1 (4 വരെ)',
        tip_puzzle_reveal: '👁️ കാണിക്കുക: ഉടനെ പൂർണ്ണ പരിഹാരം കാണിക്കുന്നു',
        tip_puzzle_replay: '🔁 വീണ്ടും: പരിഹരിച്ച ശേഷം, വീണ്ടും ശ്രമിക്കാൻ "Replay" ടാപ്പ് ചെയ്യുക',
        tip_puzzle_confetti: '🎉 കോൺഫെറ്റി: ആദ്യ ശരിയായ ശ്രമത്തിൽ പരിഹരിച്ച് ആഘോഷിക്കുക!',
        tip_puzzle_navigate: '🧭 നാവിഗേറ്റ്: ← → ആരോ കീകൾ, Previous/Next ബട്ടണുകൾ, അല്ലെങ്കിൽ പസിലുകൾക്കിടയിൽ സ്വൈപ്പ് ഉപയോഗിക്കുക',
        help_account_tab: 'അക്കൗണ്ട് & പുരോഗതി',
        tip_account_login: '🔐 <strong>സൈൻ ഇൻ</strong>: Google ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക, എല്ലാ ഉപകരണങ്ങളിലും നിങ്ങളുടെ പുരോഗതി സിൻക്ക് ചെയ്യുക.',
        tip_account_guest: '👤 <strong>അതിഥി മോഡ്</strong>: സൈൻ ഇൻ ചെയ്യാതെ എല്ലാ സവിശേഷതകളും ഉപയോഗിക്കുക. നിങ്ങളുടെ പുരോഗതി പ്രാദേശികമായി സംഭരിക്കും.',
        tip_account_streaks: '🔥 <strong>സ്ട്രീക്കുകൾ</strong>: ദിവസവും പരിശീലിച്ച് നിങ്ങളുടെ സ്ട്രീക്ക് വളർത്തുക! ഓരോ ദിവസവും കുറഞ്ഞത് ഒരു വരി പൂർത്തിയാക്കുക.',
        tip_account_daily: '🎯 <strong>ദൈനിക ലക്ഷ്യങ്ങൾ</strong>: വരികൾ (ഡിഫോൾട്ട്: 10), പസിലുകൾ (ഡിഫോൾട്ട്: 5) എന്നിവയ്ക്ക് വ്യക്തിഗത ലക്ഷ്യങ്ങൾ സജ്ജമാക്കുക.',
        tip_account_badges: '🏆 <strong>ബാഡ്ജുകൾ</strong>: ആദ്യ വരി, 7-ദിവസ സ്ട്രീക്ക്, സ്തോത്രങ്ങൾ പൂർത്തിയാക്കൽ എന്നിവ പോലുള്ള നാഴികക്കല്ലുകൾക്ക് നേട്ടങ്ങൾ നേടുക.',
        tip_account_share: '📤 <strong>പങ്കിടുക</strong>: നേട്ടം അൺലോക്ക് ചെയ്യുമ്പോൾ, സോഷ്യൽ മീഡിയയിൽ പങ്കിടാൻ ഷെയർ ബട്ടൺ ടാപ്പ് ചെയ്യുക.',
        tip_account_leaderboard: '🏅 <strong>ലീഡർബോർഡ്</strong>: മറ്റ് പഠിതാക്കളുമായി മത്സരിക്കുക! ആഴ്ചതോറും, പ്രതിമാസം, എക്കാലവും റാങ്കിംഗുകൾ.'
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
              {/* User menu with streak badge */}
              {(user || isGuest) ? (
                <UserMenu
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
              <Tooltip title={T('help')}>
                <IconButton color={helpOpen ? 'primary' : 'inherit'} onClick={() => { setHelpOpen(true); analytics.helpOpen(); }} aria-label={T('help')} size="small">
                  <HelpOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* User menu for mobile */}
              {(user || isGuest) ? (
                <UserMenu
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
            {helpTab === 3 && (
              <div className="space-y-2 text-sm text-slate-300">
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_login')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_guest')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_streaks')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_daily')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_badges')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_share')}` }} />
                <p dangerouslySetInnerHTML={{ __html: `• ${T('tip_account_leaderboard')}` }} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <OnboardingTour open={onboardingOpen} setOpen={setOnboardingOpen} />

        {/* Always-visible Line TTS Bar - only in reading mode */}
        {viewMode === 'reading' && (
          <LineTTSBar
            ttsPlaying={ttsPlaying}
            onTTSToggle={handleLineTTS}
            ttsSupported={ttsSupported}
            currentLine={flow.state.lineIndex + 1}
            totalLines={flow.totalLines}
            bottomOffset={isSmall ? 80 : 0}
          />
        )}

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
            practiceProgress={getPracticeStats(lang, flow.totalLines).progress * 100}
            puzzleProgress={getPuzzleStats(lang, flow.totalLines).progress}
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
        />

        {/* Leaderboard Panel */}
        <LeaderboardPanel
          open={leaderboardPanelOpen}
          onClose={() => setLeaderboardPanelOpen(false)}
        />

      </div>
    </ThemeProvider>
  );
}
