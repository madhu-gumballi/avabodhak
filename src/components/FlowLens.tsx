import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Lang, Keyword, CompoundBreakdown } from '../data/types';
import { DIACRITIC_INFO, isIASTDiacritic, simplifyIAST, extractIASTDiacritics, classifyIASTWord } from '../lib/pronounce';
import { basicSplit, chunkOffsetsByWord, segmentGraphemes } from '../lib/tokenize';
import { Paper } from '@mui/material';
import { WordInfoPopover } from './WordInfoPopover';

// Copy icon SVG component
const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

// Check icon for copy feedback
const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

interface LineData {
  meaning?: string;
  samasaVibhaga?: CompoundBreakdown[];
  note?: string;
}

interface HighlightWord {
  pattern: string; // Pattern to match (case-insensitive, partial match)
  meaning?: string; // Optional tooltip meaning
  color?: string; // Optional custom highlight color class
}

interface Props {
  tokens: string[]; // current line tokens (active language)
  rows: [string | undefined, string | undefined, string | undefined]; // [prev, current, next]
  wordIndex: number;
  lineIndex?: number; // used to retrigger mount animations on line change
  lang: Lang;
  legendOpen?: boolean;
  onLegendOpenChange?: (open: boolean) => void;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  expandedProp?: boolean;
  onExpandedChange?: (v: boolean) => void;
  playing?: boolean;
  chapter?: string;
  learnMode?: boolean; // When true, words become tappable to show etymology/meaning
  lineData?: LineData; // Enriched data for the current line
  highlightWords?: HighlightWord[]; // Special words to highlight (e.g., divine names)
}

export function FlowLens({ tokens, rows, wordIndex, lineIndex, lang, legendOpen: legendOpenProp, onLegendOpenChange, detailsOpen, onToggleDetails, expandedProp, onExpandedChange, playing, chapter, learnMode = false, lineData, highlightWords }: Props) {
  const [prev, curr, next] = rows;
  const [expanded, setExpanded] = useState(false);
  const [secVisible, setSecVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Copy current line to clipboard
  const handleCopy = useCallback(async () => {
    if (!curr) return;
    try {
      await navigator.clipboard.writeText(curr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [curr]);

  // Check if a word matches any highlight pattern (divine names, etc.)
  const getHighlightMatch = useCallback((word: string): HighlightWord | undefined => {
    if (!highlightWords?.length) return undefined;
    const normalized = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return highlightWords.find(hw => {
      const pattern = hw.pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(pattern) || pattern.includes(normalized.slice(0, Math.max(4, normalized.length)));
    });
  }, [highlightWords]);

  const [secExiting, setSecExiting] = useState(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(!!legendOpenProp);
  const [info, setInfo] = useState<{ ch: string } | null>(null);
  const [flashIndex, setFlashIndex] = useState<number>(-1);
  const T = useMemo(() => {
    const map: Record<Lang, Record<string, string>> = {
      iast: { helper: 'Pronunciation help', show_details: 'Show details', hide_details: 'Hide details' },
      deva: { helper: 'उच्चारण सहायता', show_details: 'विवरण दिखाएँ', hide_details: 'विवरण छिपाएँ' },
      knda: { helper: 'ಉಚ್ಛಾರ ಸಹಾಯ', show_details: 'ವಿವರಗಳನ್ನು ತೋರಿಸಿ', hide_details: 'ವಿವರಗಳನ್ನು ಮರೆಮಾಡಿ' },
      tel: { helper: 'ఉచ్చరణ సహాయం', show_details: 'వివరాలు చూపు', hide_details: 'వివరాలు దాచు' },
      tam: { helper: 'உச்சரிப்பு உதவி', show_details: 'விவரங்களை காட்டு', hide_details: 'விவரங்களை மறை' },
      guj: { helper: 'ઉચ્ચાર સહાય', show_details: 'વિગતો બતાવો', hide_details: 'વિગતો છુપાવો' },
      pan: { helper: 'ਉਚਾਰਣ ਮਦਦ', show_details: 'ਵੇਰਵੇ ਦਿਖਾਓ', hide_details: 'ਵੇਰਵੇ ਲੁਕਾਓ' },
      mr: { helper: 'उच्चार मदत', show_details: 'तपशील दाखवा', hide_details: 'तपशील लपवा' },
      ben: { helper: 'উচ্চারণ সহায়তা', show_details: 'বিস্তারিত দেখুন', hide_details: 'বিস্তারিত লুকান' },
      mal: { helper: 'ഉച്ചാരണ സഹായം', show_details: 'വിശദാംശങ്ങൾ കാണിക്കുക', hide_details: 'വിശദാംശങ്ങൾ മറയ്ക്കുക' },
    };
    return (k: string) => (map[lang] || map.iast)[k] || k;
  }, [lang]);

  // Classify character for subtle animation based on diacritic properties
  const classifyAnim = (char: string): string[] => {
    const classes: string[] = ['dia-anim-char'];
    if (!char) return classes;
    if (lang === 'iast') {
      if (/[ṃṁ]/u.test(char)) { classes.push('dia-anim-nasal'); return classes; }
      if (/ḥ/u.test(char)) { classes.push('dia-anim-aspirate'); return classes; }
      if (/['']/u.test(char)) { classes.push('dia-anim-glottal'); return classes; }
      if (/[śṣ]/u.test(char)) { classes.push('dia-anim-fric-l'); return classes; }
      if (/(s|h)/u.test(char)) { classes.push('dia-anim-fric-r'); return classes; }
      if (/[āīūṝḹ]/u.test(char)) { classes.push('dia-anim-long'); return classes; }
      if (/[ṭḍṇṛ]/u.test(char)) classes.push('dia-anim-glow');
      return classes;
    }
    const cp = char.codePointAt(0) || 0;
    const anusvara = [0x0901,0x0902,0x0981,0x0982,0x0A01,0x0A02,0x0A81,0x0A82,0x0B01,0x0B02,0x0C01,0x0C02,0x0C81,0x0C82,0x0D01,0x0D02];
    const visarga = [0x0903,0x0983,0x0A03,0x0B03,0x0C03,0x0D03];
    const avagraha = [0x093D];
    const jihva = [0x1CF5];
    const upadh = [0x1CF6];
    const fricL = [0x0936,0x0937];
    const fricR = [0x0938,0x0939];
    const longMatra = [0x093E,0x0940,0x0942,0x0962,0x0963];
    if (anusvara.includes(cp)) { classes.push('dia-anim-nasal'); return classes; }
    if (visarga.includes(cp)) { classes.push('dia-anim-aspirate'); return classes; }
    if (avagraha.includes(cp)) { classes.push('dia-anim-glottal'); return classes; }
    if (jihva.includes(cp)) { classes.push('dia-anim-fric-l'); return classes; }
    if (upadh.includes(cp)) { classes.push('dia-anim-fric-r'); return classes; }
    if (fricL.includes(cp)) { classes.push('dia-anim-fric-l'); return classes; }
    if (fricR.includes(cp)) { classes.push('dia-anim-fric-r'); return classes; }
    if (longMatra.includes(cp)) { classes.push('dia-anim-long'); return classes; }
    return classes;
  };

  // Check if character has diacritic
  const hasDiacritic = (char: string): boolean => {
    if (!char || char.length === 0) return false;
    if (lang === 'iast') return isIASTDiacritic(char);
    const hasCombining = /[\u0300-\u036F\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962-\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D\u0A51\u0A70-\u0A71\u0A75\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2-\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47-\u0B48\u0B4B-\u0B4D\u0B56-\u0B57\u0B62-\u0B63\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56\u0C62-\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5-\u0CD6\u0CE2-\u0CE3\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62-\u0D63]/u.test(char);
    return hasCombining;
  };

  // Render text with character-level animations for diacritics
  const renderWithAnimation = (text: string) => {
    if (!legendOpen) return text;
    // Use grapheme segmentation to keep combining marks with their base characters
    const graphemes = segmentGraphemes(text, lang);
    return graphemes.map((grapheme, idx) => {
      const isDia = hasDiacritic(grapheme);
      const cls = isDia ? classifyAnim(grapheme).join(' ') : '';
      return isDia ? (
        <span key={idx} className={cls} style={{display: 'inline-block'}}>{grapheme}</span>
      ) : grapheme;
    });
  };

  // Allow external control of legendOpen
  useEffect(() => {
    if (typeof legendOpenProp === 'boolean') setLegendOpen(legendOpenProp);
  }, [legendOpenProp]);
  
  // Allow external control of expanded (always true in current UI)
  useEffect(() => {
    if (typeof expandedProp === 'boolean') setExpanded(expandedProp);
  }, [expandedProp]);

  // Drive secondary line enter/exit animation
  useEffect(() => {
    if (expanded) {
      setSecExiting(false);
      setSecVisible(true);
    } else if (secVisible) {
      setSecExiting(true);
      const t = window.setTimeout(() => { setSecVisible(false); setSecExiting(false); }, 180);
      return () => window.clearTimeout(t);
    }
  }, [expanded]);

  useEffect(() => {
    setFlashIndex(wordIndex);
    const t = window.setTimeout(() => setFlashIndex(-1), 700);
    return () => window.clearTimeout(t);
  }, [wordIndex, lineIndex]);

  const phonetic = useMemo(() => simplifyIAST((curr || '').replace(/[|।॥]/g, ' ')), [curr]);
  const phoneticWords = useMemo(() => basicSplit(phonetic), [phonetic]);
  const phoneticWordIndex = useMemo(() => {
    if (lang !== 'iast' || !curr) return -1;
    const offsets = chunkOffsetsByWord(curr, 'iast');
    for (let i = 0; i < offsets.length - 1; i++) {
      if (wordIndex >= offsets[i] && wordIndex < offsets[i + 1]) return i; // stays until all its chunks are consumed
    }
    return -1;
  }, [curr, wordIndex, lang]);

  const diacritics = useMemo(() => (lang === 'iast' ? extractIASTDiacritics(curr || '') : []), [curr, lang]);

  // Raw word view for non-ENG scripts: highlight the raw word that contains the current segmented chunk
  const rawWords = useMemo(() => basicSplit(curr || ''), [curr]);
  const rawWordIndex = useMemo(() => {
    if (!curr) return -1;
    const offsets = chunkOffsetsByWord(curr, lang);
    for (let i = 0; i < offsets.length - 1; i++) {
      if (wordIndex >= offsets[i] && wordIndex < offsets[i + 1]) return i;
    }
    return -1;
  }, [curr, wordIndex, lang]);

  const isNumericLike = (t?: string) => !!(t && /^[\s0-9\u0966-\u096F\u0CE6-\u0CEF\u0C66-\u0C6F\u0BE6-\u0BEF\u0AE6-\u0AEF\u0A66-\u0A6F|।॥]+$/u.test(t));

  const hasDoubleDanda = (t?: string) => !!(t && (/\u0965/.test(t) || /\|\|/.test(t)));
  const DoubleDandaMark = () => (
    <span className="absolute right-1.5 top-1.5 inline-flex items-center justify-center w-4 h-4 rounded-md bg-amber-400/15 text-amber-300 text-[10px] border border-amber-300/20 select-none" title="End of verse">
      ॥
    </span>
  );

  function FullRow({ text, dim = false }: { text?: string; dim?: boolean }) {
    if (!text) return <div className="h-6" />;
    return (
      <div className={`flex items-center justify-center text-center`}>
        <div className={`relative px-3 py-2 pr-7 rounded-xl border w-full ${dim ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}>
          <span className="break-words whitespace-pre-wrap leading-relaxed">{text}</span>
          {hasDoubleDanda(text) && <DoubleDandaMark />}
        </div>
      </div>
    );
  }

  function CurrentRow() {
    // Chapter header: render as a centered section marker with no per-word highlight
    if (chapter) {
      return (
        <div className="flex items-center justify-center text-center">
          <div className="flex flex-col items-center gap-1 w-full p-2 rounded-2xl ring-1 ring-sky-500/20 bg-slate-900/40 border border-slate-700/70">
            <div className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-sky-300/85 bg-slate-900/80 border border-sky-500/40">
              {chapter}
            </div>
            {curr && (
              <div className="mt-1 px-3 py-1.5 rounded-xl bg-slate-900/70 text-slate-100 text-sm sm:text-base lg:text-lg font-semibold">
                <span className="break-words whitespace-pre-wrap leading-relaxed">{curr}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center text-center">
        {/* Grouped current block: tokens + (Pronounce, Original) auxiliary lines */}
        <div className="flex flex-col items-center gap-1 w-full p-1 rounded-2xl ring-1 ring-sky-500/10 bg-slate-900/30">
          <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 pr-6 rounded-xl bg-slate-800/60 border border-slate-700 w-full">
            {isNumericLike(curr) ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-sky-400/40 text-sky-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 opacity-80"><path d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0v-12a.75.75 0 01.75-.75zm10.5 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0v-12a.75.75 0 01.75-.75z"/></svg>
                {curr}
              </span>
            ) : (
              // Primary: for ENG (IAST), show simplified phonetics with prominent highlight and larger type
              lang === 'iast' && curr ? (
                phoneticWords.map((w, i) => {
                  const on = i === phoneticWordIndex;
                  const strong = on && !!playing;
                  const highlightMatch = getHighlightMatch(w);
                  const isHighlighted = !!highlightMatch;
                  return (
                    <span
                      key={`ph-main-${i}`}
                      className={`px-1.5 py-0.5 rounded-md leading-tight break-words text-lg sm:text-xl lg:text-2xl ${
                        strong
                          ? 'bg-amber-300 text-black shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                          : isHighlighted
                            ? 'text-violet-200 underline decoration-violet-400/60 decoration-2 underline-offset-4'
                            : 'text-slate-200'
                      }`}
                      title={highlightMatch?.meaning}
                    >
                      {w}
                    </span>
                  );
                })
              ) : (
                // Other scripts: primary becomes RAW words with amber highlight on the active raw word
                rawWords.map((w: string, i: number) => {
                  const active = i === rawWordIndex;
                  const strong = active && !!playing;
                  const highlightMatch = getHighlightMatch(w);
                  const isHighlighted = !!highlightMatch;
                  const base = `px-1.5 py-0.5 rounded-md leading-tight break-words text-lg sm:text-xl lg:text-2xl ${
                    strong
                      ? 'bg-amber-300 text-black shadow-[0_0_18px_rgba(251,191,36,0.6)]'
                      : isHighlighted
                        ? 'text-violet-200 underline decoration-violet-400/60 decoration-2 underline-offset-4'
                        : 'text-slate-200'
                  }`;
                  return (
                    <span
                      key={`raw-${i}`}
                      className={base}
                      title={highlightMatch?.meaning}
                    >
                      {w}
                    </span>
                  );
                })
              )
            )}
            {/* Do not show danda marker on the main highlighted row */}

            {/* Copy button - z-30 to be above OverlayControls (z-20) */}
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleCopy(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-1.5 top-1.5 z-30 inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-500/50 transition-colors cursor-pointer active:scale-95"
              title="Copy verse"
              type="button"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Word breakdown – show whole words with subtle diacritic highlighting (IAST/English only) */}
          {lang === 'iast' && !isNumericLike(curr) && secVisible && curr && (
            <div className={`mt-3 px-2 py-1 rounded-md border w-full overflow-hidden ${learnMode ? 'bg-amber-900/20 border-amber-400/30 text-amber-200' : 'bg-slate-900/60 border-emerald-300/35 text-emerald-200'}`}>
              <div
                className="flex flex-wrap items-center justify-center gap-1.5"
                style={{ opacity: secExiting ? 0 : 1, transform: `translateY(${secExiting ? '-6px' : '0px'})`, transition: 'opacity 180ms ease, transform 180ms ease' }}
              >
                {rawWords.map((w: string, i: number) => {
                  const active = i === rawWordIndex;
                  const strong = active && !!playing;
                  let baseCls = 'px-1.5 py-0.5 rounded-md leading-tight break-words text-sm sm:text-base lg:text-lg ';
                  const stateCls = strong
                    ? learnMode
                      ? 'animate-pulse bg-amber-200 text-black shadow-[0_0_12px_rgba(251,191,36,0.45)]'
                      : 'animate-pulse bg-emerald-200 text-black shadow-[0_0_12px_rgba(52,211,153,0.45)]'
                    : learnMode
                      ? 'text-amber-200/80'
                      : 'text-emerald-200/80';
                  let featureCls = '';
                  if (lang === 'iast' && legendOpen) {
                    const f = classifyIASTWord(w);
                    if (f.hasLongVowel) featureCls += ' iast-word-long';
                    if (f.hasRetroflex) featureCls += ' iast-word-retro';
                    if (f.hasAspirate) featureCls += ' iast-word-aspirate';
                  }
                  const cls = `${baseCls}${stateCls}${featureCls}`;

                  // Find matching compound breakdown for this word
                  const normalizeWord = (s: string) => s.toLowerCase().replace(/[।॥\s.,'"]/g, '').normalize('NFD');
                  const wordNorm = normalizeWord(w);
                  // Handle samasaVibhaga as either array or single object
                  const samasaArray = Array.isArray(lineData?.samasaVibhaga)
                    ? lineData.samasaVibhaga
                    : lineData?.samasaVibhaga ? [lineData.samasaVibhaga] : [];
                  const matchingCompound = samasaArray.find((c) => {
                    const compoundNorm = normalizeWord(c.compound || '');
                    // Match if word contains the compound or compound contains the word
                    return wordNorm.includes(compoundNorm) || compoundNorm.includes(wordNorm) ||
                           // Also try simple substring match on first 4+ chars
                           (wordNorm.length >= 4 && compoundNorm.startsWith(wordNorm.slice(0, 4)));
                  });

                  // Create keyword with meaning from line data if available
                  const keyword: Keyword | undefined = learnMode ? {
                    term: w,
                    script: lang,
                    meaning: matchingCompound?.combinedMeaning || lineData?.meaning || '',
                  } : undefined;

                  const wordSpan = (
                    <span
                      key={`word-sec-${i}`}
                      className={cls}
                    >
                      {renderWithAnimation(w)}
                    </span>
                  );

                  return learnMode ? (
                    <WordInfoPopover
                      key={`word-pop-${i}`}
                      word={w}
                      keyword={keyword}
                      compoundBreakdown={matchingCompound}
                      enabled={learnMode}
                      lang={lang}
                    >
                      {wordSpan}
                    </WordInfoPopover>
                  ) : wordSpan;
                })}
              </div>
            </div>
          )}

          {legendOpen && lang === 'iast' && diacritics.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1 px-1">
              {diacritics.slice(0, 8).map((ch) => (
                <span
                  key={`dia-${ch}`}
                  className="px-2 py-1 rounded-md text-xs sm:text-sm border border-sky-400/40 bg-slate-900/50 text-sky-200 leading-tight"
                  title={`${DIACRITIC_INFO[ch]?.name || ''}${DIACRITIC_INFO[ch]?.hint ? ' — ' + DIACRITIC_INFO[ch].hint : ''}`}
                >
                  {ch}{DIACRITIC_INFO[ch]?.devanagari ? ` (${DIACRITIC_INFO[ch]?.devanagari})` : ''}
                </span>
              ))}
            </div>
          )}

          
        </div>
      </div>
    );
  }

  return (
    <Paper className="relative space-y-3" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3 }}>
      <CurrentRow />
    </Paper>
  );
}
