import React, { useState, useEffect } from 'react'
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Collapse,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAuth } from '../context/AuthContext'
import { submitFeedback, hasRecentFeedback } from '../lib/feedbackService'

interface FeedbackWidgetProps {
  open: boolean
  onClose: () => void
}

const EMOJI_OPTIONS = [
  { emoji: '😕', label: 'Not great', value: 1 },
  { emoji: '🙂', label: 'Okay', value: 2 },
  { emoji: '😊', label: 'Good', value: 3 },
  { emoji: '🤩', label: 'Amazing', value: 4 },
]

export default function FeedbackWidget({ open, onClose }: FeedbackWidgetProps) {
  const { user, userData, recordFeedbackSubmit } = useAuth()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [throttled, setThrottled] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check throttle on open
  useEffect(() => {
    if (open && user) {
      setChecking(true)
      setRating(null)
      setComment('')
      setSubmitted(false)
      setThrottled(false)
      hasRecentFeedback(user.uid)
        .then((recent) => {
          setThrottled(recent)
        })
        .catch(() => {})
        .finally(() => setChecking(false))
    } else if (open) {
      setChecking(false)
    }
  }, [open, user])

  const handleSubmit = async () => {
    if (!rating || !user) return
    setSubmitting(true)

    try {
      await submitFeedback(
        user.uid,
        userData?.profile.displayName || 'User',
        rating,
        comment.trim()
      )
      setSubmitted(true)

      // Trigger achievement
      await recordFeedbackSubmit()

      // Auto-close after 2s
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Feedback submission failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          maxWidth: 400,
          width: '90vw',
          m: 2,
        },
      }}
    >
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'text.secondary',
          zIndex: 1,
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <Box sx={{ p: 3, textAlign: 'center' }}>
        {checking ? (
          <Box sx={{ py: 4 }}>
            <CircularProgress size={32} sx={{ color: 'rgb(245, 158, 11)' }} />
          </Box>
        ) : submitted ? (
          /* Thank you state */
          <Box sx={{ py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Thank you!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your feedback helps us improve
            </Typography>
          </Box>
        ) : throttled ? (
          /* Already submitted this month */
          <Box sx={{ py: 2 }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>💬</Typography>
            <Typography variant="h6" fontWeight="bold">
              Already submitted
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              You can submit feedback once per month. Thank you for sharing!
            </Typography>
          </Box>
        ) : (
          /* Feedback form */
          <>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, pr: 3 }}>
              How's your experience?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Help us improve Avabodhak
            </Typography>

            {/* Emoji rating buttons */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: { xs: 1.5, sm: 2.5 },
                mb: 2.5,
              }}
            >
              {EMOJI_OPTIONS.map((option) => (
                <Box
                  key={option.value}
                  onClick={() => setRating(option.value)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    transform: rating === option.value ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor:
                        rating === option.value
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                      border:
                        rating === option.value
                          ? '2px solid rgba(245, 158, 11, 0.6)'
                          : '2px solid transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
                      {option.emoji}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        rating === option.value
                          ? 'rgb(245, 158, 11)'
                          : 'text.secondary',
                      fontSize: '0.65rem',
                      fontWeight: rating === option.value ? 600 : 400,
                    }}
                  >
                    {option.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Optional comment (slides in after emoji select) */}
            <Collapse in={rating !== null}>
              <TextField
                multiline
                minRows={2}
                maxRows={4}
                placeholder="Tell us more (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                fullWidth
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(245, 158, 11, 0.5)',
                    },
                  },
                }}
              />
            </Collapse>

            {/* Submit button */}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!rating || submitting}
              startIcon={
                submitting ? <CircularProgress size={16} color="inherit" /> : undefined
              }
              fullWidth
              sx={{
                bgcolor: 'rgb(245, 158, 11)',
                color: '#0f172a',
                fontWeight: 600,
                borderRadius: 2,
                py: 1.25,
                '&:hover': { bgcolor: 'rgb(217, 119, 6)' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(245, 158, 11, 0.3)',
                  color: 'rgba(15, 23, 42, 0.5)',
                },
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  )
}
