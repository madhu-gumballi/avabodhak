import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Chip,
  Divider,
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
  enrichedData?: VerseEnrichedLine & { meaning?: string; note?: string; namaAnalysis?: any[] };
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
    enrichedData.namaAnalysis?.length
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
                  fontSize: '0.7rem',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Translations and interpretations are approximations for learning purposes.
                For deeper understanding, please consult a qualified guru or attend traditional satsangs.
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
