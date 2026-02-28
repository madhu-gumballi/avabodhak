import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import type { Lang } from '../data/types';
import type { IssueType } from '../lib/textIssueService';
import { submitTextIssue } from '../lib/textIssueService';
import { useAuth } from '../context/AuthContext';

interface ReportIssueModalProps {
  open: boolean;
  onClose: () => void;
  stotraKey: string;
  lineId: string;
  lineText: string;
  script: Lang;
}

export function ReportIssueModal({
  open,
  onClose,
  stotraKey,
  lineId,
  lineText,
  script,
}: ReportIssueModalProps) {
  const { user, userData } = useAuth();
  const [issueType, setIssueType] = useState<IssueType>('doubt');
  const [description, setDescription] = useState('');
  const [suggestedText, setSuggestedText] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewText = lineText.length > 60 ? lineText.slice(0, 60) + '…' : lineText;

  const handleClose = () => {
    if (submitting) return;
    setIssueType('doubt');
    setDescription('');
    setSuggestedText('');
    setReference('');
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!description.trim() || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitTextIssue({
        userId: user.uid,
        displayName: userData?.profile.displayName || user.displayName || 'Anonymous',
        stotraKey,
        lineId,
        lineText,
        script,
        issueType,
        description: description.trim(),
        suggestedText: suggestedText.trim() || undefined,
        reference: reference.trim() || undefined,
        appVersion: '0.80.0',
      });
      setSubmitted(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setError('Failed to submit. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <FlagOutlinedIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight="bold">
          Report a text issue
        </Typography>
      </DialogTitle>

      <DialogContent>
        {submitted ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>✓</Typography>
            <Typography color="success.main">Thank you! Your report has been submitted.</Typography>
            <Typography variant="caption" color="text.secondary">
              Our team will review it shortly.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Line preview */}
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 1,
                px: 2,
                py: 1,
                mb: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Line
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'serif', fontSize: '0.95rem' }}>
                {previewText}
              </Typography>
            </Box>

            {/* Issue type */}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              What kind of issue is this?
            </Typography>
            <RadioGroup
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as IssueType)}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="doubt"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">Something doesn't look right</Typography>
                    <Typography variant="caption" color="text.secondary">I'm unsure but want to flag it</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="variant"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">I've seen a different reading</Typography>
                    <Typography variant="caption" color="text.secondary">A sampradaya or regional variant exists</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="error"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2">I believe this is incorrect</Typography>
                    <Typography variant="caption" color="text.secondary">There's a clear mistake in the text</Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {/* Description */}
            <TextField
              label="Describe what you noticed"
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., The second word in this line seems off in the Kannada script..."
              sx={{ mb: 1.5 }}
              inputProps={{ maxLength: 500 }}
            />

            {/* Suggested text (optional) */}
            <TextField
              label="Your version or suggested text (optional)"
              multiline
              minRows={1}
              maxRows={3}
              fullWidth
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              placeholder="e.g., vinayo jayaḥ (as chanted in our mutt)"
              sx={{ mb: 1.5 }}
              inputProps={{ maxLength: 300 }}
            />

            {/* Reference (optional) */}
            <TextField
              label="Source or reference (optional)"
              fullWidth
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Pejawar Mutt parayana patha, or book title/URL"
              inputProps={{ maxLength: 200 }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      {!submitted && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={submitting} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            startIcon={submitting ? <CircularProgress size={14} /> : undefined}
            sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
