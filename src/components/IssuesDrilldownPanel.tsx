import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FlagIcon from '@mui/icons-material/Flag';
import type { PublicIssueView, IssueStatus, IssueType } from '../lib/textIssueService';
import { getPublicIssues } from '../lib/textIssueService';

// ============================================================================
// Status badge helpers
// ============================================================================

const STATUS_COLORS: Record<IssueStatus, { bg: string; color: string; border: string; label: string }> = {
  open:         { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)', label: 'Open' },
  acknowledged: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.4)', label: 'Acknowledged' },
  resolved:     { bg: 'rgba(74,222,128,0.18)', color: '#4ade80', border: 'rgba(74,222,128,0.5)', label: 'Resolved' },
  wontfix:      { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', label: "Won't Fix" },
};

const TYPE_LABELS: Record<IssueType, { emoji: string; label: string }> = {
  doubt:   { emoji: '🤔', label: 'Doubt' },
  variant: { emoji: '🔀', label: 'Variant' },
  error:   { emoji: '⚠️', label: 'Error' },
};

// ============================================================================
// Component
// ============================================================================

interface IssuesDrilldownPanelProps {
  open: boolean;
  onClose: () => void;
  stotraKey: string;
  lineId?: string; // If undefined: stotra-level view
}

export function IssuesDrilldownPanel({
  open,
  onClose,
  stotraKey,
  lineId,
}: IssuesDrilldownPanelProps) {
  const [issues, setIssues] = useState<PublicIssueView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getPublicIssues(stotraKey, lineId)
      .then(setIssues)
      .catch(() => setError('Failed to load issues'))
      .finally(() => setLoading(false));
  }, [open, stotraKey, lineId]);

  const title = lineId
    ? `Issues — Line ${lineId}`
    : `Issues — ${stotraKey.toUpperCase()}`;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          maxHeight: '70vh',
          borderRadius: '16px 16px 0 0',
          bgcolor: 'rgba(15, 23, 42, 0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlagIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ overflow: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography color="error.main" sx={{ textAlign: 'center', py: 3 }}>
            {error}
          </Typography>
        ) : issues.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: '2rem', mb: 1 }}>✓</Typography>
            <Typography color="success.main" variant="body2">No reported issues</Typography>
            <Typography variant="caption" color="text.secondary">
              Be the first to flag a discrepancy — tap the ⚑ on any line.
            </Typography>
          </Box>
        ) : (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))
        )}
      </Box>
    </Drawer>
  );
}

// ============================================================================
// Issue Card
// ============================================================================

function IssueCard({ issue }: { issue: PublicIssueView }) {
  const statusInfo = STATUS_COLORS[issue.status];
  const typeInfo = TYPE_LABELS[issue.issueType];

  return (
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Card header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.06em' }}>
          {typeInfo.emoji} {typeInfo.label.toUpperCase()}
        </Typography>
        {issue.lineId && (
          <Typography variant="caption" color="text.secondary">
            · Line {issue.lineId}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Chip
          label={statusInfo.label}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.6rem',
            fontWeight: 700,
            bgcolor: statusInfo.bg,
            color: statusInfo.color,
            border: `1px solid ${statusInfo.border}`,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>

      {/* Card body */}
      <Box sx={{ px: 1.5, py: 1.25 }}>
        <Typography variant="body2" sx={{ color: '#cbd5e1', mb: issue.suggestedText || issue.reference || issue.resolutionNote ? 1 : 0 }}>
          "{issue.description}"
        </Typography>

        {issue.suggestedText && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
            Suggested: <em style={{ color: '#e2e8f0' }}>{issue.suggestedText}</em>
          </Typography>
        )}

        {issue.reference && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
            Reference: {issue.reference}
          </Typography>
        )}

        {issue.resolutionNote && (
          <>
            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
            <Box
              sx={{
                bgcolor: 'rgba(74,222,128,0.06)',
                border: '1px solid rgba(74,222,128,0.15)',
                borderRadius: 1,
                px: 1.25,
                py: 0.75,
              }}
            >
              <Typography variant="caption" sx={{ color: '#4ade80', fontWeight: 600, display: 'block', mb: 0.25 }}>
                Avabodhak team:
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                {issue.resolutionNote}
              </Typography>
            </Box>
          </>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {issue.reportCount} {issue.reportCount === 1 ? 'user' : 'users'}
          </Typography>
          <Typography variant="caption" color="text.secondary">·</Typography>
          <Typography variant="caption" color="text.secondary">
            {issue.ageLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
