import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Select,
  MenuItem,
  Button,
  TextField,
  Chip,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useAuth } from '../context/AuthContext';
import type { TextIssueReport, IssueType, IssueStatus } from '../lib/textIssueService';
import { getOpenIssues, resolveIssue, getVerifierUsers, setUserRole } from '../lib/textIssueService';

// ============================================================================
// Types
// ============================================================================

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  open:         { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)', label: 'Open' },
  acknowledged: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.4)', label: 'Acknowledged' },
  resolved:     { bg: 'rgba(74,222,128,0.18)', color: '#4ade80', border: 'rgba(74,222,128,0.5)', label: 'Resolved' },
  wontfix:      { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', label: "Won't Fix" },
};

const TYPE_EMOJIS: Record<string, string> = {
  doubt: '🤔',
  variant: '🔀',
  error: '⚠️',
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

interface VerifierDashboardProps {
  open: boolean;
  onClose: () => void;
}

export function VerifierDashboard({ open, onClose }: VerifierDashboardProps) {
  const { isVerifier, isAdmin } = useAuth();
  const [tab, setTab] = useState(0);

  if (!isVerifier && !isAdmin) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 600, md: 720 },
          maxWidth: '100vw',
          bgcolor: 'rgba(9, 14, 33, 0.98)',
          border: '1px solid rgba(255,255,255,0.07)',
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
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          bgcolor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettingsIcon sx={{ color: '#60a5fa', fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight="bold" color="#e2e8f0">
            Verifier Dashboard
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' },
          '& .Mui-selected': { color: '#60a5fa' },
          '& .MuiTabs-indicator': { bgcolor: '#60a5fa' },
        }}
      >
        <Tab label="Issues" />
        {isAdmin && <Tab label="Team" />}
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 0 && <IssuesTab />}
        {tab === 1 && isAdmin && <TeamTab />}
      </Box>
    </Drawer>
  );
}

// ============================================================================
// Issues Tab
// ============================================================================

function IssuesTab() {
  const [issues, setIssues] = useState<(TextIssueReport & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStotra, setFilterStotra] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('open');

  const loadIssues = useCallback(() => {
    setLoading(true);
    getOpenIssues({
      stotraKey: filterStotra || undefined,
      issueType: filterType as IssueType || undefined,
      status: filterStatus as IssueStatus || undefined,
    }).then(result => setIssues(result as (TextIssueReport & { id: string })[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStotra, filterType, filterStatus]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Select
          size="small"
          value={filterStotra}
          onChange={(e: SelectChangeEvent) => setFilterStotra(e.target.value)}
          displayEmpty
          sx={{ minWidth: 150, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <MenuItem value="">All Stotras</MenuItem>
          {['vsn', 'hari', 'keshava', 'vayu', 'raghavendra', 'yantrodharaka', 'venkateshwara'].map(k => (
            <MenuItem key={k} value={k} sx={{ fontSize: '0.75rem' }}>{k.toUpperCase()}</MenuItem>
          ))}
        </Select>

        <Select
          size="small"
          value={filterType}
          onChange={(e: SelectChangeEvent) => setFilterType(e.target.value)}
          displayEmpty
          sx={{ minWidth: 120, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <MenuItem value="">All Types</MenuItem>
          <MenuItem value="doubt" sx={{ fontSize: '0.75rem' }}>🤔 Doubt</MenuItem>
          <MenuItem value="variant" sx={{ fontSize: '0.75rem' }}>🔀 Variant</MenuItem>
          <MenuItem value="error" sx={{ fontSize: '0.75rem' }}>⚠️ Error</MenuItem>
        </Select>

        <Select
          size="small"
          value={filterStatus}
          onChange={(e: SelectChangeEvent) => setFilterStatus(e.target.value)}
          displayEmpty
          sx={{ minWidth: 130, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="open" sx={{ fontSize: '0.75rem' }}>Open</MenuItem>
          <MenuItem value="acknowledged" sx={{ fontSize: '0.75rem' }}>Acknowledged</MenuItem>
          <MenuItem value="resolved" sx={{ fontSize: '0.75rem' }}>Resolved</MenuItem>
          <MenuItem value="wontfix" sx={{ fontSize: '0.75rem' }}>Won't Fix</MenuItem>
        </Select>
      </Box>

      {/* Issue list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : issues.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>✓</Typography>
          <Typography color="success.main" variant="body2">No issues match these filters</Typography>
        </Box>
      ) : (
        issues.map(issue => (
          <IssueReviewCard
            key={issue.id}
            issue={issue}
            onResolved={loadIssues}
          />
        ))
      )}
    </Box>
  );
}

// ============================================================================
// Issue Review Card (full identity shown — verifier view)
// ============================================================================

function IssueReviewCard({
  issue,
  onResolved,
}: {
  issue: TextIssueReport & { id: string };
  onResolved: () => void;
}) {
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  const act = async (status: 'acknowledged' | 'resolved' | 'wontfix') => {
    setActing(true);
    setErr('');
    try {
      await resolveIssue({
        issueId: issue.id,
        status,
        resolutionNote: note,
        stotraKey: issue.stotraKey,
        lineId: issue.lineId,
        issueType: issue.issueType,
        previousStatus: issue.status,
      });
      setSuccess(`Marked as ${status}`);
      setTimeout(() => { setSuccess(''); onResolved(); }, 1500);
    } catch (e) {
      setErr('Failed to update issue');
    } finally {
      setActing(false);
    }
  };

  const statusInfo = STATUS_COLORS[issue.status];

  return (
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
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
          {TYPE_EMOJIS[issue.issueType]} {issue.issueType.toUpperCase()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          · {issue.stotraKey.toUpperCase()} · Line {issue.lineId}
        </Typography>
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

      {/* Body */}
      <Box sx={{ px: 1.5, py: 1.25 }}>
        {/* User says */}
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          User says:
        </Typography>
        <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>
          "{issue.description}"
        </Typography>

        {issue.suggestedText && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
            Suggested: <em style={{ color: '#e2e8f0' }}>{issue.suggestedText}</em>
          </Typography>
        )}
        {issue.reference && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
            Reference: {issue.reference}
          </Typography>
        )}

        {/* Line text */}
        <Box
          sx={{
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 1,
            px: 1.25,
            py: 0.75,
            mb: 1.25,
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Line text ({issue.script}):
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'serif', color: '#e2e8f0', fontSize: '0.85rem' }}>
            {issue.lineText}
          </Typography>
        </Box>

        {/* Meta */}
        <Typography variant="caption" color="text.secondary">
          Reported by: {issue.displayName} · {issue.createdAt ? new Date(issue.createdAt.toMillis?.() || issue.createdAt as unknown as number).toLocaleDateString() : '—'}
        </Typography>

        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Resolution */}
        <TextField
          label="Resolution note (optional)"
          multiline
          minRows={2}
          fullWidth
          size="small"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for users explaining the resolution..."
          sx={{ mb: 1.5, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
        />

        {success && <Alert severity="success" sx={{ mb: 1, py: 0.5, fontSize: '0.75rem' }}>{success}</Alert>}
        {err && <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.75rem' }}>{err}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
            onClick={() => act('acknowledged')}
            disabled={acting || issue.status === 'acknowledged'}
            sx={{ fontSize: '0.7rem', borderColor: 'rgba(96,165,250,0.4)', color: '#60a5fa' }}
          >
            Acknowledge
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
            onClick={() => act('resolved')}
            disabled={acting}
            sx={{ fontSize: '0.7rem', borderColor: 'rgba(74,222,128,0.4)', color: '#4ade80' }}
          >
            Resolve
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
            onClick={() => act('wontfix')}
            disabled={acting}
            sx={{ fontSize: '0.7rem', borderColor: 'rgba(148,163,184,0.3)', color: '#94a3b8' }}
          >
            Won't Fix
          </Button>
          {acting && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================================
// Team Tab (admin only)
// ============================================================================

function TeamTab() {
  const [teamMembers, setTeamMembers] = useState<Array<{ uid: string; displayName: string; email: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteRole, setPromoteRole] = useState<'verifier' | 'admin'>('verifier');
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState('');

  const loadTeam = useCallback(() => {
    setLoading(true);
    getVerifierUsers().then(setTeamMembers).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handlePromote = async () => {
    if (!promoteUid.trim()) return;
    setActing(true);
    setMessage('');
    try {
      await setUserRole(promoteUid.trim(), promoteRole);
      setMessage(`Role updated to ${promoteRole}`);
      setPromoteUid('');
      loadTeam();
    } catch {
      setMessage('Failed to update role');
    } finally {
      setActing(false);
    }
  };

  const handleDemote = async (uid: string) => {
    setActing(true);
    try {
      await setUserRole(uid, 'user');
      loadTeam();
    } catch {
      setMessage('Failed to demote');
    } finally {
      setActing(false);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Team Members (Verifiers & Admins)
      </Typography>

      {loading ? (
        <CircularProgress size={24} />
      ) : teamMembers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No team members yet.</Typography>
      ) : (
        teamMembers.map(m => (
          <Box
            key={m.uid}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 1.5,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="bold">{m.displayName || m.email}</Typography>
              <Typography variant="caption" color="text.secondary">{m.uid}</Typography>
            </Box>
            <Chip
              label={m.role}
              size="small"
              sx={{
                fontSize: '0.6rem',
                bgcolor: m.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.12)',
                color: m.role === 'admin' ? '#f59e0b' : '#60a5fa',
                border: m.role === 'admin' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(96,165,250,0.3)',
              }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleDemote(m.uid)}
              disabled={acting}
              sx={{ fontSize: '0.65rem', borderColor: 'rgba(148,163,184,0.3)', color: '#94a3b8', minWidth: 0, px: 1 }}
            >
              Demote
            </Button>
          </Box>
        ))
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      <Typography variant="subtitle2" color="text.secondary">Promote User</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          label="User UID"
          size="small"
          value={promoteUid}
          onChange={e => setPromoteUid(e.target.value)}
          placeholder="Firebase UID"
          sx={{ flex: 1, minWidth: 180, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
        />
        <Select
          size="small"
          value={promoteRole}
          onChange={(e: SelectChangeEvent) => setPromoteRole(e.target.value as 'verifier' | 'admin')}
          sx={{ minWidth: 100, fontSize: '0.75rem' }}
        >
          <MenuItem value="verifier" sx={{ fontSize: '0.75rem' }}>Verifier</MenuItem>
          <MenuItem value="admin" sx={{ fontSize: '0.75rem' }}>Admin</MenuItem>
        </Select>
        <Button
          variant="contained"
          size="small"
          onClick={handlePromote}
          disabled={acting || !promoteUid.trim()}
          sx={{ bgcolor: '#60a5fa', '&:hover': { bgcolor: '#3b82f6' }, fontSize: '0.75rem' }}
        >
          Promote
        </Button>
      </Box>
      {message && (
        <Typography variant="caption" color={message.includes('Failed') ? 'error.main' : 'success.main'}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
