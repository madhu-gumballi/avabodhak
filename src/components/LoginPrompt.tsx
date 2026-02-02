import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import CloudIcon from '@mui/icons-material/Cloud'
import SchoolIcon from '@mui/icons-material/School'
import ExtensionIcon from '@mui/icons-material/Extension'
import TranslateIcon from '@mui/icons-material/Translate'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

interface LoginPromptProps {
  open: boolean
}

export default function LoginPrompt({ open }: LoginPromptProps) {
  const { signInWithGoogle, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (error: any) {
      console.error('Failed to sign in:', error)
      setError(error?.message || 'Failed to sign in. Please try again.')
    }
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header with gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            p: 4,
            textAlign: 'center',
          }}
        >
          <img
            src="/icons/stotra-mala-logo.svg"
            alt="Avabodhak"
            style={{ width: 64, height: 64, marginBottom: 16, borderRadius: 12 }}
          />
          <Typography variant="h4" fontWeight="800" sx={{ mb: 1 }}>
            Avabodhak
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Master Sanskrit stotras through interactive practice
          </Typography>
        </Box>

        {/* Sign in section - prominent at top */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Sign in button */}
          {!isFirebaseConfigured ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Sign-in is not configured. Please contact the administrator.
            </Alert>
          ) : (
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 2,
                bgcolor: 'white',
                color: '#1f2937',
                fontSize: '1.1rem',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: 'grey.100',
                },
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(255,255,255,0.25)',
              }}
            >
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
          >
            Sign in to track your progress and compete on leaderboards
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ px: 3 }}>
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        </Box>

        {/* Features showcase - scrollable on small devices */}
        <Box sx={{ p: 3, pt: 2 }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', display: 'block', mb: 1.5, textAlign: 'center', fontSize: '0.65rem' }}
          >
            What you can do
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
            <FeatureCard
              icon={<SchoolIcon sx={{ color: '#a78bfa', fontSize: 20 }} />}
              title="Practice Mode"
              description="Guided word masking"
            />
            <FeatureCard
              icon={<ExtensionIcon sx={{ color: '#f472b6', fontSize: 20 }} />}
              title="Puzzle Mode"
              description="Word scrambles"
            />
            <FeatureCard
              icon={<TranslateIcon sx={{ color: '#fbbf24', fontSize: 20 }} />}
              title="10 Scripts"
              description="Multiple languages"
            />
            <FeatureCard
              icon={<CloudIcon sx={{ color: '#38bdf8', fontSize: 20 }} />}
              title="Cloud Sync"
              description="Cross-device progress"
            />
          </Box>

          {/* Gamification highlights - compact */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
              py: 1.5,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <LocalFireDepartmentIcon sx={{ color: '#fb923c', fontSize: 22 }} />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Streaks
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ color: '#fbbf24', fontSize: 22 }} />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Achievements
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <LeaderboardIcon sx={{ color: '#38bdf8', fontSize: 22 }} />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Leaderboards
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        {icon}
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        {description}
      </Typography>
    </Box>
  )
}
