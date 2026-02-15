import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type {
  Lang,
  VerseEnrichedLine,
  MeterInfo,
  PoeticDevice,
  RasaType,
  DevataSvarupa,
  CompoundBreakdown,
} from '../data/types';

// Rasa (sentiment) display info
const RASA_INFO: Record<RasaType, { label: string; color: string; icon?: string }> = {
  shanta: { label: 'Peace', color: '#94a3b8' },
  dasya: { label: 'Servitude', color: '#60a5fa' },
  sakhya: { label: 'Friendship', color: '#4ade80' },
  vatsalya: { label: 'Parental Love', color: '#f472b6' },
  madhurya: { label: 'Divine Romance', color: '#fb7185' },
  vira: { label: 'Heroism', color: '#f97316' },
  adbhuta: { label: 'Wonder', color: '#a78bfa' },
  karuna: { label: 'Compassion', color: '#22d3ee' },
  bhakti: { label: 'Devotion', color: '#fbbf24' },
};

interface VerseDetailPanelProps {
  open: boolean;
  onClose: () => void;
  lineNumber: number;
  lineText: string;
  lineIast?: string;
  lang: Lang;
  enrichedData?: VerseEnrichedLine & {
    meaning?: string;
    note?: string;
    namaAnalysis?: any[];
    bhaktiRasa?: string;
    regionalGlossary?: { term: string; meaning: string }[];
    translation?: string;
    padachchheda?: string;
    wordByWord?: { word: string; meaning: string }[];
  };
}

// Props for inline display (no drawer)
interface VerseDetailInlineProps {
  lineNumber: number;
  lineText: string;
  lineIast?: string;
  lang: Lang;
  enrichedData?: VerseDetailPanelProps['enrichedData'];
  compact?: boolean; // More compact layout for mobile
}

/**
 * VerseDetailPanel - Swipe-up panel showing verse metadata
 * Displays meter, poetic devices, sentiment, deity form, compound breakdowns
 */
export function VerseDetailPanel({
  open,
  onClose,
  lineNumber,
  lineText,
  lineIast,
  lang,
  enrichedData,
}: VerseDetailPanelProps) {
  // Normalize samasaVibhaga to always be an array (handles both array and single object cases)
  const samasaVibhagaArray = enrichedData?.samasaVibhaga
    ? (Array.isArray(enrichedData.samasaVibhaga) ? enrichedData.samasaVibhaga : [enrichedData.samasaVibhaga])
    : [];

  const hasEnrichedData = enrichedData && (
    enrichedData.chandas ||
    enrichedData.alamkara?.length ||
    enrichedData.rasa?.length ||
    enrichedData.devataSvarupa ||
    samasaVibhagaArray.length > 0 ||
    enrichedData.upadesha ||
    enrichedData.imagery?.length ||
    enrichedData.meaning ||
    enrichedData.note ||
    enrichedData.namaAnalysis?.length ||
    enrichedData.bhaktiRasa ||
    enrichedData.regionalGlossary?.length ||
    enrichedData.translation ||
    enrichedData.padachchheda ||
    enrichedData.wordByWord?.length
  );

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '70vh',
          backdropFilter: 'blur(12px)',
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: 'rgba(148, 163, 184, 0.3)',
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Header */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
            Verse {lineNumber + 1}
          </Typography>
          <Typography
            sx={{
              color: '#f1f5f9',
              fontSize: '1.1rem',
              fontWeight: 500,
              lineHeight: 1.4,
              maxWidth: 280,
            }}
          >
            {lineText.length > 50 ? lineText.slice(0, 50) + '...' : lineText}
          </Typography>
          {lineIast && (
            <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
              {lineIast.length > 60 ? lineIast.slice(0, 60) + '...' : lineIast}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#64748b' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(100, 116, 139, 0.2)' }} />

      {/* Content */}
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {hasEnrichedData ? (
          <>
            {/* Meaning (Translation) */}
            {enrichedData.meaning && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>📖</span>}
                title="Meaning"
                color="#60a5fa"
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.6 }}>
                  {enrichedData.meaning}
                </Typography>
              </DetailSection>
            )}

            {/* Padachchheda (Word Splitting for Pronunciation) */}
            {enrichedData.padachchheda && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>🔤</span>}
                title="Word Splitting (Padachchheda)"
                color="#f472b6"
              >
                <Typography
                  sx={{
                    color: '#fce7f3',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    lineHeight: 1.8,
                    letterSpacing: '0.02em',
                    bgcolor: 'rgba(244, 114, 182, 0.08)',
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid rgba(244, 114, 182, 0.2)',
                  }}
                >
                  {enrichedData.padachchheda}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
                  Words are separated by "/" to help with pronunciation of compound words
                </Typography>
              </DetailSection>
            )}

            {/* Word by Word Breakdown */}
            {enrichedData.wordByWord && enrichedData.wordByWord.length > 0 && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>📚</span>}
                title="Word-by-Word Meaning"
                color="#8b5cf6"
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1,
                    bgcolor: 'rgba(139, 92, 246, 0.05)',
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                  }}
                >
                  {enrichedData.wordByWord.map((item, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'baseline',
                        py: 0.5,
                        borderBottom: i < enrichedData.wordByWord!.length - 1 ? '1px dashed rgba(139, 92, 246, 0.15)' : 'none',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#c4b5fd',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          fontFamily: 'monospace',
                          minWidth: 120,
                        }}
                      >
                        {item.word}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>→</Typography>
                      <Typography sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                        {item.meaning}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </DetailSection>
            )}

            {/* Translation (if different from meaning) */}
            {enrichedData.translation && enrichedData.translation !== enrichedData.meaning && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>🔄</span>}
                title="Translation"
                color="#818cf8"
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.6 }}>
                  {enrichedData.translation}
                </Typography>
              </DetailSection>
            )}

            {/* Bhakti Rasa (Devotional Mood) */}
            {enrichedData.bhaktiRasa && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>💝</span>}
                title="Devotional Mood (Bhakti Rasa)"
                color="#ec4899"
              >
                <Chip
                  label={
                    enrichedData.bhaktiRasa === 'sharanagati' ? 'Surrender (Sharanagati)' :
                    enrichedData.bhaktiRasa === 'prema' ? 'Divine Love (Prema)' :
                    enrichedData.bhaktiRasa === 'viraha' ? 'Longing (Viraha)' :
                    enrichedData.bhaktiRasa === 'seva' ? 'Service (Seva)' :
                    enrichedData.bhaktiRasa === 'stuti' ? 'Praise (Stuti)' :
                    enrichedData.bhaktiRasa
                  }
                  sx={{
                    bgcolor: 'rgba(236, 72, 153, 0.15)',
                    color: '#ec4899',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    fontWeight: 500,
                  }}
                />
              </DetailSection>
            )}

            {/* Regional Glossary */}
            {enrichedData.regionalGlossary && enrichedData.regionalGlossary.length > 0 && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>📚</span>}
                title="Regional Terms"
                color="#14b8a6"
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {enrichedData.regionalGlossary.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                      <Typography sx={{ color: '#2dd4bf', fontWeight: 500, fontSize: '0.9rem' }}>
                        {item.term}
                      </Typography>
                      <Typography sx={{ color: '#64748b' }}>—</Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        {item.meaning}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </DetailSection>
            )}

            {/* Meter (Chandas) */}
            {enrichedData.chandas && (
              <DetailSection
                icon={<MusicNoteIcon sx={{ fontSize: 18 }} />}
                title="Meter (Chandas)"
                color="#a78bfa"
              >
                <Typography sx={{ color: '#e2e8f0', fontWeight: 500 }}>
                  {enrichedData.chandas.name}
                </Typography>
                {enrichedData.chandas.pattern && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    Pattern: {enrichedData.chandas.pattern}
                  </Typography>
                )}
                {enrichedData.chandas.description && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                    {enrichedData.chandas.description}
                  </Typography>
                )}
              </DetailSection>
            )}

            {/* Poetic Devices (Alamkara) */}
            {enrichedData.alamkara && enrichedData.alamkara.length > 0 && (
              <DetailSection
                icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
                title="Poetic Devices (Alamkara)"
                color="#fbbf24"
              >
                {enrichedData.alamkara.map((device, i) => (
                  <Box key={i} sx={{ mb: i < enrichedData.alamkara!.length - 1 ? 1.5 : 0 }}>
                    <Typography sx={{ color: '#fbbf24', fontWeight: 500 }}>
                      {device.type}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      {device.description}
                    </Typography>
                    {device.examples && device.examples.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {device.examples.map((ex, j) => (
                          <Chip
                            key={j}
                            label={ex}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(251, 191, 36, 0.1)',
                              color: '#fbbf24',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              fontSize: '0.7rem',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </DetailSection>
            )}

            {/* Sentiment (Rasa) */}
            {enrichedData.rasa && enrichedData.rasa.length > 0 && (
              <DetailSection
                icon={<FavoriteIcon sx={{ fontSize: 18 }} />}
                title="Sentiment (Rasa)"
                color="#f472b6"
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {enrichedData.rasa.map((rasa) => (
                    <Chip
                      key={rasa}
                      label={RASA_INFO[rasa]?.label || rasa}
                      size="small"
                      sx={{
                        bgcolor: `${RASA_INFO[rasa]?.color || '#64748b'}20`,
                        color: RASA_INFO[rasa]?.color || '#64748b',
                        border: `1px solid ${RASA_INFO[rasa]?.color || '#64748b'}40`,
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </Box>
              </DetailSection>
            )}

            {/* Deity Form (Devata Svarupa) */}
            {enrichedData.devataSvarupa && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>🙏</span>}
                title="Deity Form (Devata Svarupa)"
                color="#60a5fa"
              >
                <Typography sx={{ color: '#e2e8f0', fontWeight: 500 }}>
                  {enrichedData.devataSvarupa.form}
                </Typography>
                {enrichedData.devataSvarupa.attributes && enrichedData.devataSvarupa.attributes.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Attributes:</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {enrichedData.devataSvarupa.attributes.join(' • ')}
                    </Typography>
                  </Box>
                )}
                {enrichedData.devataSvarupa.weapons && enrichedData.devataSvarupa.weapons.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Ayudhas:</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {enrichedData.devataSvarupa.weapons.join(' • ')}
                    </Typography>
                  </Box>
                )}
              </DetailSection>
            )}

            {/* Compound Breakdowns */}
            {samasaVibhagaArray.length > 0 && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>📝</span>}
                title="Compound Breakdowns (Samasa Vibhaga)"
                color="#34d399"
              >
                {samasaVibhagaArray.map((breakdown, i) => (
                  <CompoundBreakdownCard key={i} breakdown={breakdown} isLast={i === samasaVibhagaArray.length - 1} />
                ))}
              </DetailSection>
            )}

            {/* Teaching/Wisdom (Upadesha) */}
            {enrichedData.upadesha && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>💡</span>}
                title="Teaching (Upadesha)"
                color="#22d3ee"
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic' }}>
                  "{enrichedData.upadesha}"
                </Typography>
              </DetailSection>
            )}

            {/* Imagery */}
            {enrichedData.imagery && enrichedData.imagery.length > 0 && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>🎨</span>}
                title="Key Imagery"
                color="#f97316"
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {enrichedData.imagery.map((img, i) => (
                    <Chip
                      key={i}
                      label={img}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(249, 115, 22, 0.1)',
                        color: '#f97316',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </Box>
              </DetailSection>
            )}

            {/* Note (Commentary/Context) */}
            {enrichedData.note && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>📝</span>}
                title="Commentary"
                color="#94a3b8"
              >
                <Typography sx={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {enrichedData.note}
                </Typography>
              </DetailSection>
            )}

            {/* Nama Analysis (for Sahasranama) */}
            {enrichedData.namaAnalysis && enrichedData.namaAnalysis.length > 0 && (
              <DetailSection
                icon={<span style={{ fontSize: 18 }}>🔱</span>}
                title="Divine Names (Nama Vyakhyana)"
                color="#f59e0b"
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {enrichedData.namaAnalysis.map((nama: any, i: number) => (
                    <Box
                      key={i}
                      sx={{
                        bgcolor: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: 1.5,
                        p: 1.5,
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ color: '#fbbf24', fontWeight: 600, fontSize: '1rem' }}>
                          {nama.nama}
                        </Typography>
                        {nama.number && (
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            #{nama.number}
                          </Typography>
                        )}
                      </Box>
                      {nama.iast && (
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                          {nama.iast}
                        </Typography>
                      )}
                      {nama.etymology && (
                        <Box sx={{ mt: 1 }}>
                          {nama.etymology.dhatu && (
                            <Typography variant="caption" sx={{ color: '#78716c', display: 'block' }}>
                              Root: <span style={{ color: '#d4d4aa' }}>{nama.etymology.dhatu}</span>
                            </Typography>
                          )}
                          {nama.etymology.meaning && (
                            <Typography sx={{ color: '#e2e8f0', fontSize: '0.875rem', mt: 0.5 }}>
                              {nama.etymology.meaning}
                            </Typography>
                          )}
                          {nama.etymology.explanation && (
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.5, fontStyle: 'italic' }}>
                              {nama.etymology.explanation}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </DetailSection>
            )}

            {/* Disclaimer */}
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: '1px dashed rgba(100, 116, 139, 0.2)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  display: 'block',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Translations are approximations and may not fully convey the intended meaning in the original language due to
                interpretive and transcription limitations. Consult a qualified guru for deeper understanding.
              </Typography>
            </Box>
          </>
        ) : (
          /* Placeholder when no enriched data is available */
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              px: 2,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 48, color: '#475569', mb: 2 }} />
            <Typography sx={{ color: '#94a3b8', mb: 1 }}>
              Verse analysis coming soon
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 280, mx: 'auto' }}>
              Detailed information about meter, poetic devices, sentiment, and compound breakdowns will be added in future updates.
            </Typography>

            {/* Preview of what will be available */}
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5, textAlign: 'center' }}>
                Coming features:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { icon: <MusicNoteIcon sx={{ fontSize: 16 }} />, label: 'Chandas (Meter)', color: '#a78bfa' },
                  { icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, label: 'Alamkara (Poetic Devices)', color: '#fbbf24' },
                  { icon: <FavoriteIcon sx={{ fontSize: 16 }} />, label: 'Rasa (Sentiment)', color: '#f472b6' },
                  { icon: '📝', label: 'Samasa Vibhaga (Compounds)', color: '#34d399' },
                ].map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'rgba(100, 116, 139, 0.1)',
                      border: '1px dashed rgba(100, 116, 139, 0.2)',
                    }}
                  >
                    <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                      {typeof item.icon === 'string' ? item.icon : item.icon}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

/**
 * VerseDetailInline - Inline display of verse details alongside the main content
 * Shows verse metadata in a scrollable panel that sits beside (desktop) or below (mobile) the verse
 */
export function VerseDetailInline({
  lineNumber,
  lineText,
  lineIast,
  lang,
  enrichedData,
  compact = false,
}: VerseDetailInlineProps) {
  // Normalize samasaVibhaga to always be an array
  const samasaVibhagaArray = enrichedData?.samasaVibhaga
    ? (Array.isArray(enrichedData.samasaVibhaga) ? enrichedData.samasaVibhaga : [enrichedData.samasaVibhaga])
    : [];

  const hasEnrichedData = enrichedData && (
    enrichedData.chandas ||
    enrichedData.alamkara?.length ||
    enrichedData.rasa?.length ||
    enrichedData.devataSvarupa ||
    samasaVibhagaArray.length > 0 ||
    enrichedData.upadesha ||
    enrichedData.imagery?.length ||
    enrichedData.meaning ||
    enrichedData.note ||
    enrichedData.namaAnalysis?.length ||
    enrichedData.bhaktiRasa ||
    enrichedData.regionalGlossary?.length ||
    enrichedData.translation ||
    enrichedData.padachchheda ||
    enrichedData.wordByWord?.length
  );

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 3,
        border: '1px solid rgba(51, 65, 85, 0.6)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: compact ? 1.5 : 2,
          py: compact ? 1 : 1.5,
          borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
          bgcolor: 'rgba(15, 23, 42, 0.4)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon sx={{ fontSize: compact ? 16 : 18, color: '#a78bfa' }} />
          <Typography
            variant="caption"
            sx={{
              color: '#a78bfa',
              fontWeight: 600,
              letterSpacing: '0.05em',
              fontSize: compact ? '0.65rem' : '0.7rem',
            }}
          >
            VERSE DETAILS
          </Typography>
        </Box>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: compact ? 1.5 : 2,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(51, 65, 85, 0.2)',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(100, 116, 139, 0.4)',
            borderRadius: 3,
            '&:hover': {
              bgcolor: 'rgba(100, 116, 139, 0.6)',
            },
          },
        }}
      >
        {hasEnrichedData ? (
          <Box sx={{ '& > *': { mb: compact ? 2 : 2.5, '&:last-child': { mb: 0 } } }}>
            {/* Meaning (Translation) */}
            {enrichedData.meaning && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>📖</span>}
                title="Meaning"
                color="#60a5fa"
                compact={compact}
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.5, fontSize: compact ? '0.8rem' : '0.875rem' }}>
                  {enrichedData.meaning}
                </Typography>
              </DetailSectionCompact>
            )}

            {/* Padachchheda (Word Splitting) */}
            {enrichedData.padachchheda && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>🔤</span>}
                title="Word Splitting"
                color="#f472b6"
                compact={compact}
              >
                <Typography
                  sx={{
                    color: '#fce7f3',
                    fontFamily: 'monospace',
                    fontSize: compact ? '0.75rem' : '0.85rem',
                    lineHeight: 1.6,
                    bgcolor: 'rgba(244, 114, 182, 0.08)',
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid rgba(244, 114, 182, 0.2)',
                  }}
                >
                  {enrichedData.padachchheda}
                </Typography>
              </DetailSectionCompact>
            )}

            {/* Word by Word */}
            {enrichedData.wordByWord && enrichedData.wordByWord.length > 0 && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>📚</span>}
                title="Word-by-Word"
                color="#8b5cf6"
                compact={compact}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 0.75,
                    bgcolor: 'rgba(139, 92, 246, 0.05)',
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                  }}
                >
                  {enrichedData.wordByWord.map((item, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'baseline',
                        py: 0.25,
                        borderBottom: i < enrichedData.wordByWord!.length - 1 ? '1px dashed rgba(139, 92, 246, 0.15)' : 'none',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#c4b5fd',
                          fontWeight: 600,
                          fontSize: compact ? '0.75rem' : '0.8rem',
                          fontFamily: 'monospace',
                          minWidth: compact ? 80 : 100,
                        }}
                      >
                        {item.word}
                      </Typography>
                      <Typography sx={{ color: '#e2e8f0', fontSize: compact ? '0.7rem' : '0.75rem' }}>
                        {item.meaning}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </DetailSectionCompact>
            )}

            {/* Translation (if different from meaning) */}
            {enrichedData.translation && enrichedData.translation !== enrichedData.meaning && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>🔄</span>}
                title="Translation"
                color="#818cf8"
                compact={compact}
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.5, fontSize: compact ? '0.8rem' : '0.875rem' }}>
                  {enrichedData.translation}
                </Typography>
              </DetailSectionCompact>
            )}

            {/* Bhakti Rasa */}
            {enrichedData.bhaktiRasa && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>💝</span>}
                title="Devotional Mood"
                color="#ec4899"
                compact={compact}
              >
                <Chip
                  label={
                    enrichedData.bhaktiRasa === 'sharanagati' ? 'Surrender' :
                    enrichedData.bhaktiRasa === 'prema' ? 'Divine Love' :
                    enrichedData.bhaktiRasa === 'viraha' ? 'Longing' :
                    enrichedData.bhaktiRasa === 'seva' ? 'Service' :
                    enrichedData.bhaktiRasa === 'stuti' ? 'Praise' :
                    enrichedData.bhaktiRasa
                  }
                  size="small"
                  sx={{
                    bgcolor: 'rgba(236, 72, 153, 0.15)',
                    color: '#ec4899',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    fontWeight: 500,
                    fontSize: compact ? '0.65rem' : '0.7rem',
                  }}
                />
              </DetailSectionCompact>
            )}

            {/* Regional Glossary */}
            {enrichedData.regionalGlossary && enrichedData.regionalGlossary.length > 0 && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>📚</span>}
                title="Regional Terms"
                color="#14b8a6"
                compact={compact}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {enrichedData.regionalGlossary.map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                      <Typography sx={{ color: '#2dd4bf', fontWeight: 500, fontSize: compact ? '0.75rem' : '0.8rem' }}>
                        {item.term}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: compact ? '0.7rem' : '0.75rem' }}>
                        {item.meaning}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </DetailSectionCompact>
            )}

            {/* Meter (Chandas) */}
            {enrichedData.chandas && (
              <DetailSectionCompact
                icon={<MusicNoteIcon sx={{ fontSize: compact ? 14 : 16 }} />}
                title="Meter (Chandas)"
                color="#a78bfa"
                compact={compact}
              >
                <Typography sx={{ color: '#e2e8f0', fontWeight: 500, fontSize: compact ? '0.8rem' : '0.875rem' }}>
                  {enrichedData.chandas.name}
                </Typography>
                {enrichedData.chandas.pattern && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: compact ? '0.65rem' : '0.7rem' }}>
                    {enrichedData.chandas.pattern}
                  </Typography>
                )}
              </DetailSectionCompact>
            )}

            {/* Poetic Devices */}
            {enrichedData.alamkara && enrichedData.alamkara.length > 0 && (
              <DetailSectionCompact
                icon={<AutoAwesomeIcon sx={{ fontSize: compact ? 14 : 16 }} />}
                title="Poetic Devices"
                color="#fbbf24"
                compact={compact}
              >
                {enrichedData.alamkara.map((device, i) => (
                  <Box key={i} sx={{ mb: i < enrichedData.alamkara!.length - 1 ? 1 : 0 }}>
                    <Typography sx={{ color: '#fbbf24', fontWeight: 500, fontSize: compact ? '0.75rem' : '0.8rem' }}>
                      {device.type}
                    </Typography>
                    <Typography sx={{ color: '#e2e8f0', fontSize: compact ? '0.7rem' : '0.75rem' }}>
                      {device.description}
                    </Typography>
                  </Box>
                ))}
              </DetailSectionCompact>
            )}

            {/* Sentiment (Rasa) */}
            {enrichedData.rasa && enrichedData.rasa.length > 0 && (
              <DetailSectionCompact
                icon={<FavoriteIcon sx={{ fontSize: compact ? 14 : 16 }} />}
                title="Sentiment"
                color="#f472b6"
                compact={compact}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {enrichedData.rasa.map((rasa) => (
                    <Chip
                      key={rasa}
                      label={RASA_INFO[rasa]?.label || rasa}
                      size="small"
                      sx={{
                        bgcolor: `${RASA_INFO[rasa]?.color || '#64748b'}20`,
                        color: RASA_INFO[rasa]?.color || '#64748b',
                        border: `1px solid ${RASA_INFO[rasa]?.color || '#64748b'}40`,
                        fontSize: compact ? '0.6rem' : '0.65rem',
                        height: compact ? 20 : 24,
                      }}
                    />
                  ))}
                </Box>
              </DetailSectionCompact>
            )}

            {/* Deity Form */}
            {enrichedData.devataSvarupa && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>🙏</span>}
                title="Deity Form"
                color="#60a5fa"
                compact={compact}
              >
                <Typography sx={{ color: '#e2e8f0', fontWeight: 500, fontSize: compact ? '0.8rem' : '0.875rem' }}>
                  {enrichedData.devataSvarupa.form}
                </Typography>
                {enrichedData.devataSvarupa.attributes && enrichedData.devataSvarupa.attributes.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: compact ? '0.65rem' : '0.7rem' }}>
                    {enrichedData.devataSvarupa.attributes.join(' • ')}
                  </Typography>
                )}
              </DetailSectionCompact>
            )}

            {/* Compound Breakdowns */}
            {samasaVibhagaArray.length > 0 && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>📝</span>}
                title="Compounds"
                color="#34d399"
                compact={compact}
              >
                {samasaVibhagaArray.map((breakdown, i) => (
                  <CompoundBreakdownCardCompact key={i} breakdown={breakdown} isLast={i === samasaVibhagaArray.length - 1} compact={compact} />
                ))}
              </DetailSectionCompact>
            )}

            {/* Teaching */}
            {enrichedData.upadesha && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>💡</span>}
                title="Teaching"
                color="#22d3ee"
                compact={compact}
              >
                <Typography sx={{ color: '#e2e8f0', fontStyle: 'italic', fontSize: compact ? '0.8rem' : '0.875rem' }}>
                  "{enrichedData.upadesha}"
                </Typography>
              </DetailSectionCompact>
            )}

            {/* Imagery */}
            {enrichedData.imagery && enrichedData.imagery.length > 0 && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>🎨</span>}
                title="Imagery"
                color="#f97316"
                compact={compact}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {enrichedData.imagery.map((img, i) => (
                    <Chip
                      key={i}
                      label={img}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(249, 115, 22, 0.1)',
                        color: '#f97316',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        fontSize: compact ? '0.6rem' : '0.65rem',
                        height: compact ? 20 : 24,
                      }}
                    />
                  ))}
                </Box>
              </DetailSectionCompact>
            )}

            {/* Note */}
            {enrichedData.note && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>📝</span>}
                title="Commentary"
                color="#94a3b8"
                compact={compact}
              >
                <Typography sx={{ color: '#cbd5e1', fontSize: compact ? '0.75rem' : '0.8rem', lineHeight: 1.5 }}>
                  {enrichedData.note}
                </Typography>
              </DetailSectionCompact>
            )}

            {/* Nama Analysis (for Sahasranama) */}
            {enrichedData.namaAnalysis && enrichedData.namaAnalysis.length > 0 && (
              <DetailSectionCompact
                icon={<span style={{ fontSize: compact ? 14 : 16 }}>🔱</span>}
                title="Divine Names"
                color="#f59e0b"
                compact={compact}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {enrichedData.namaAnalysis.map((nama: any, i: number) => (
                    <Box
                      key={i}
                      sx={{
                        bgcolor: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: 1,
                        p: 1,
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                      }}
                    >
                      <Typography sx={{ color: '#fbbf24', fontWeight: 600, fontSize: compact ? '0.8rem' : '0.875rem' }}>
                        {nama.nama}
                        {nama.number && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 4 }}>#{nama.number}</span>}
                      </Typography>
                      {nama.etymology?.meaning && (
                        <Typography sx={{ color: '#e2e8f0', fontSize: compact ? '0.7rem' : '0.75rem', mt: 0.5 }}>
                          {nama.etymology.meaning}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </DetailSectionCompact>
            )}

            {/* Disclaimer */}
            <Box sx={{ pt: 1.5, borderTop: '1px dashed rgba(100, 116, 139, 0.2)' }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  display: 'block',
                  fontSize: compact ? '0.63rem' : '0.68rem',
                  lineHeight: 1.4,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Translations are approximations and may not fully convey the intended meaning in the original language due to
                interpretive and transcription limitations. Consult a qualified guru for deeper understanding.
              </Typography>
            </Box>
          </Box>
        ) : (
          /* Placeholder when no enriched data */
          <Box sx={{ textAlign: 'center', py: compact ? 2 : 3 }}>
            <InfoOutlinedIcon sx={{ fontSize: compact ? 32 : 40, color: '#475569', mb: 1 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: compact ? '0.75rem' : '0.85rem' }}>
              Verse analysis coming soon
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontSize: compact ? '0.6rem' : '0.65rem' }}>
              Meter, poetic devices, and more will be added.
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

/**
 * Compact section wrapper for inline detail panel
 */
function DetailSectionCompact({
  icon,
  title,
  color,
  children,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{
            color,
            fontWeight: 600,
            letterSpacing: '0.03em',
            fontSize: compact ? '0.6rem' : '0.65rem',
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ pl: compact ? 2.5 : 3 }}>{children}</Box>
    </Box>
  );
}

/**
 * Compact compound breakdown card
 */
function CompoundBreakdownCardCompact({
  breakdown,
  isLast,
  compact = false,
}: {
  breakdown: CompoundBreakdown;
  isLast: boolean;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        bgcolor: 'rgba(52, 211, 153, 0.1)',
        borderRadius: 1,
        p: compact ? 0.75 : 1,
        border: '1px solid rgba(52, 211, 153, 0.2)',
        mb: isLast ? 0 : 1,
      }}
    >
      <Typography sx={{ color: '#6ee7b7', fontWeight: 500, fontSize: compact ? '0.75rem' : '0.8rem' }}>
        {breakdown.compound}
      </Typography>
      <Typography sx={{ color: '#e2e8f0', fontSize: compact ? '0.65rem' : '0.7rem', mt: 0.5 }}>
        {breakdown.combinedMeaning}
      </Typography>
    </Box>
  );
}

/**
 * Section wrapper for detail panel
 */
function DetailSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="caption" sx={{ color, fontWeight: 600, letterSpacing: '0.05em' }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ pl: 3.5 }}>{children}</Box>
    </Box>
  );
}

/**
 * Compound breakdown card
 */
function CompoundBreakdownCard({
  breakdown,
  isLast,
}: {
  breakdown: CompoundBreakdown;
  isLast: boolean;
}) {
  return (
    <Box
      sx={{
        bgcolor: 'rgba(52, 211, 153, 0.1)',
        borderRadius: 1.5,
        p: 1.5,
        border: '1px solid rgba(52, 211, 153, 0.2)',
        mb: isLast ? 0 : 1.5,
      }}
    >
      <Typography sx={{ color: '#6ee7b7', fontWeight: 500, mb: 0.5 }}>
        {breakdown.compound}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 1 }}>
        {breakdown.breakdown.map((part, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#6ee7b7', fontSize: '0.9rem' }}>{part}</Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.65rem' }}>
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

export default VerseDetailPanel;
