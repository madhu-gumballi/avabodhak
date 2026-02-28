import { Chip, Tooltip, Box } from '@mui/material';
import type { QualityTier } from '../data/types';

interface TierInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dot: string;
  description: string;
}

const TIER_INFO: Record<QualityTier, TierInfo> = {
  1: {
    label: 'Scholarly',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.5)',
    dot: '#f59e0b',
    description: 'Based on a scholarly critical edition reviewed by Sanskrit scholars.',
  },
  2: {
    label: 'Attributed',
    color: '#60a5fa',
    bgColor: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.4)',
    dot: '#60a5fa',
    description: 'Based on a named print edition from a reputable publisher or mutt.',
  },
  3: {
    label: 'Community',
    color: '#4ade80',
    bgColor: 'rgba(74,222,128,0.1)',
    borderColor: 'rgba(74,222,128,0.35)',
    dot: '#4ade80',
    description: 'Sourced from a community digital archive (e.g., vignanam.org, stotranidhi.com). May contain minor variations.',
  },
  4: {
    label: 'Unverified',
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.08)',
    borderColor: 'rgba(148,163,184,0.3)',
    dot: '#94a3b8',
    description: 'Source is unknown or unverified. Use with caution.',
  },
};

interface TextQualityBadgeProps {
  tier: QualityTier;
  size?: 'small' | 'medium';
  onClick?: () => void;
}

export function TextQualityBadge({ tier, size = 'small', onClick }: TextQualityBadgeProps) {
  const info = TIER_INFO[tier];
  const isSmall = size === 'small';

  return (
    <Tooltip
      title={
        <Box>
          <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>Tier {tier}: {info.label}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>{info.description}</Box>
        </Box>
      }
      arrow
      placement="top"
    >
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              component="span"
              sx={{
                width: isSmall ? 6 : 8,
                height: isSmall ? 6 : 8,
                borderRadius: '50%',
                bgcolor: info.dot,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {info.label}
          </Box>
        }
        size="small"
        onClick={onClick}
        sx={{
          height: isSmall ? 20 : 24,
          fontSize: isSmall ? '0.65rem' : '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          bgcolor: info.bgColor,
          color: info.color,
          border: `1px solid ${info.borderColor}`,
          cursor: onClick ? 'pointer' : 'default',
          '& .MuiChip-label': { px: isSmall ? 0.75 : 1 },
          '&:hover': onClick ? { opacity: 0.85 } : {},
        }}
      />
    </Tooltip>
  );
}
