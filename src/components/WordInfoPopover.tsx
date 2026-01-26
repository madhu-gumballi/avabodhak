import { useState, useRef, useEffect, ReactNode } from 'react';
import { Paper, Popper, Fade, IconButton, Typography, Box, Chip, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import type { Keyword, Etymology, CompoundBreakdown, NamaAnalysis, GunaCategory } from '../data/types';

// Guna category display info
const GUNA_INFO: Record<GunaCategory, { label: string; color: string }> = {
  paramarthika: { label: 'Ultimate Reality', color: '#a78bfa' },
  srishti: { label: 'Creation', color: '#34d399' },
  sthiti: { label: 'Preservation', color: '#60a5fa' },
  samhara: { label: 'Dissolution', color: '#f87171' },
  rakshana: { label: 'Protection', color: '#fbbf24' },
  anugraha: { label: 'Grace', color: '#f472b6' },
  jnana: { label: 'Knowledge', color: '#818cf8' },
  shakti: { label: 'Power', color: '#fb923c' },
  karuna: { label: 'Compassion', color: '#4ade80' },
  saundarya: { label: 'Beauty', color: '#f9a8d4' },
  vyapti: { label: 'All-pervasiveness', color: '#22d3ee' },
};

interface WordInfoPopoverProps {
  children: ReactNode;
  word: string;
  keyword?: Keyword;
  namaAnalysis?: NamaAnalysis;
  compoundBreakdown?: CompoundBreakdown;
  enabled?: boolean;
  lang?: string;
}

/**
 * WordInfoPopover - Tap-to-reveal word information
 * Shows etymology, meaning, guna categories, compound breakdowns
 */
export function WordInfoPopover({
  children,
  word,
  keyword,
  namaAnalysis,
  compoundBreakdown,
  enabled = true,
  lang = 'deva',
}: WordInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);

  // In learn mode, always show popover even with minimal info (word itself)
  const hasInfo = keyword || namaAnalysis || compoundBreakdown;

  if (!enabled) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <>
      <span
        ref={anchorRef}
        onClick={handleClick}
        className="cursor-pointer transition-all duration-200 hover:bg-sky-500/20 rounded-md active:scale-95"
        style={{
          borderBottom: open ? '2px solid rgba(56, 189, 248, 0.6)' : '2px dotted rgba(56, 189, 248, 0.3)',
        }}
      >
        {children}
      </span>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom"
        transition
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 16 } },
        ]}
        sx={{ zIndex: 1300, maxWidth: 'min(360px, 90vw)' }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={8}
              sx={{
                p: 2,
                bgcolor: 'rgba(15, 23, 42, 0.98)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 2,
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Header with word and close button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ color: '#f1f5f9', fontWeight: 600, lineHeight: 1.2 }}
                  >
                    {word}
                  </Typography>
                  {(keyword?.iast || namaAnalysis?.iast) && (
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {keyword?.iast || namaAnalysis?.iast}
                    </Typography>
                  )}
                </Box>
                <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#64748b' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Meaning */}
              {(keyword?.meaning || namaAnalysis?.etymology?.meaning) && (
                <Typography sx={{ color: '#e2e8f0', mb: 1.5 }}>
                  {keyword?.meaning || namaAnalysis?.etymology?.meaning}
                </Typography>
              )}

              {/* Placeholder when no enriched data is available */}
              {!hasInfo && (
                <Box sx={{
                  bgcolor: 'rgba(100, 116, 139, 0.1)',
                  borderRadius: 1.5,
                  p: 1.5,
                  border: '1px dashed rgba(100, 116, 139, 0.3)',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    Etymology and meaning data coming soon
                  </Typography>
                </Box>
              )}

              {/* Etymology for Nama */}
              {namaAnalysis?.etymology && (
                <Box sx={{ mb: 1.5 }}>
                  <EtymologyDisplay etymology={namaAnalysis.etymology} />
                </Box>
              )}

              {/* Keyword Etymology */}
              {keyword?.etymology && (
                <Box sx={{ mb: 1.5 }}>
                  <EtymologyDisplay etymology={keyword.etymology} />
                </Box>
              )}

              {/* Compound Breakdown */}
              {compoundBreakdown && (
                <Box sx={{ mb: 1.5 }}>
                  <CompoundBreakdownDisplay breakdown={compoundBreakdown} />
                </Box>
              )}

              {/* Guna Categories */}
              {namaAnalysis?.gunaVarga && namaAnalysis.gunaVarga.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    Quality Categories
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {namaAnalysis.gunaVarga.map((guna) => (
                      <Chip
                        key={guna}
                        label={GUNA_INFO[guna]?.label || guna}
                        size="small"
                        sx={{
                          bgcolor: `${GUNA_INFO[guna]?.color || '#64748b'}20`,
                          color: GUNA_INFO[guna]?.color || '#64748b',
                          border: `1px solid ${GUNA_INFO[guna]?.color || '#64748b'}40`,
                          fontSize: '0.7rem',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Avatar Reference */}
              {namaAnalysis?.avataraSambandha && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    Avatar Reference
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoStoriesIcon sx={{ fontSize: 16, color: '#fbbf24' }} />
                    <Typography sx={{ color: '#fbbf24' }}>
                      {namaAnalysis.avataraSambandha.avatar}
                      {namaAnalysis.avataraSambandha.leela && (
                        <Typography component="span" sx={{ color: '#94a3b8', ml: 0.5 }}>
                          - {namaAnalysis.avataraSambandha.leela}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Related Names */}
              {namaAnalysis?.relatedNamas && namaAnalysis.relatedNamas.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    Related Names
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {namaAnalysis.relatedNamas.join(' \u2022 ')}
                  </Typography>
                </Box>
              )}

              {/* Commentary Preview */}
              {namaAnalysis?.commentaries && namaAnalysis.commentaries.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(100, 116, 139, 0.2)' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    {namaAnalysis.commentaries[0].source}
                  </Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    "{namaAnalysis.commentaries[0].text.slice(0, 100)}
                    {namaAnalysis.commentaries[0].text.length > 100 ? '...' : ''}"
                  </Typography>
                </Box>
              )}
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}

/**
 * Etymology display component
 */
function EtymologyDisplay({ etymology }: { etymology: Etymology }) {
  return (
    <Box sx={{ bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1.5, p: 1.5, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
      <Typography variant="caption" sx={{ color: '#a78bfa', display: 'block', mb: 0.5, fontWeight: 600 }}>
        Etymology (Vyutpatti)
      </Typography>
      {etymology.dhatu && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Root:</Typography>
          <Typography sx={{ color: '#c4b5fd', fontWeight: 500 }}>{etymology.dhatu}</Typography>
          {etymology.pratyaya && (
            <>
              <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>+ Suffix:</Typography>
              <Typography sx={{ color: '#c4b5fd' }}>{etymology.pratyaya}</Typography>
            </>
          )}
        </Box>
      )}
      <Typography sx={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
        {etymology.meaning}
      </Typography>
      {etymology.alternates && etymology.alternates.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Alternative derivations: {etymology.alternates.join(', ')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/**
 * Compound breakdown display component
 */
function CompoundBreakdownDisplay({ breakdown }: { breakdown: CompoundBreakdown }) {
  return (
    <Box sx={{ bgcolor: 'rgba(52, 211, 153, 0.1)', borderRadius: 1.5, p: 1.5, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
      <Typography variant="caption" sx={{ color: '#34d399', display: 'block', mb: 1, fontWeight: 600 }}>
        Compound Breakdown (Samasa Vibhaga)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 1 }}>
        {breakdown.breakdown.map((part, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#6ee7b7', fontWeight: 500, fontSize: '0.95rem' }}>
                {part}
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                {breakdown.meanings[i]}
              </Typography>
            </Box>
            {i < breakdown.breakdown.length - 1 && (
              <Typography sx={{ color: '#475569', mx: 0.5 }}>+</Typography>
            )}
          </Box>
        ))}
      </Box>
      <Divider sx={{ borderColor: 'rgba(52, 211, 153, 0.2)', my: 1 }} />
      <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
        {breakdown.combinedMeaning}
      </Typography>
      {breakdown.samasaType && (
        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
          Type: {breakdown.samasaType}
        </Typography>
      )}
    </Box>
  );
}

export default WordInfoPopover;
