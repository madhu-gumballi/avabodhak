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

        {/* Features showcase */}
        <Box sx={{ p: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', display: 'block', mb: 2, textAlign: 'center' }}
          >
            What you can do
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <FeatureCard
              icon={<SchoolIcon sx={{ color: '#a78bfa' }} />}
              title="Practice Mode"
              description="Learn verses with guided word masking"
            />
            <FeatureCard
              icon={<ExtensionIcon sx={{ color: '#f472b6' }} />}
              title="Puzzle Mode"
              description="Test recall with word scrambles"
            />
            <FeatureCard
              icon={<TranslateIcon sx={{ color: '#fbbf24' }} />}
              title="10 Scripts"
              description="Devanagari, Kannada, Telugu & more"
            />
            <FeatureCard
              icon={<CloudIcon sx={{ color: '#38bdf8' }} />}
              title="Cloud Sync"
              description="Progress saved across all devices"
            />
          </Box>

          {/* Gamification highlights */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              py: 2,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              mb: 3,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <LocalFireDepartmentIcon sx={{ color: '#fb923c', fontSize: 28 }} />
              <Typography variant="caption" display="block" color="text.secondary">
                Streaks
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
              <Typography variant="caption" display="block" color="text.secondary">
                Achievements
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <LeaderboardIcon sx={{ color: '#38bdf8', fontSize: 28 }} />
              <Typography variant="caption" display="block" color="text.secondary">
                Leaderboards
              </Typography>
            </Box>
          </Box>

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
                py: 1.75,
                bgcolor: 'white',
                color: '#1f2937',
                fontSize: '1rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'grey.100',
                },
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            Sign in to track your progress and compete on leaderboards
          </Typography>
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
        p: 2,
        borderRadius: 2,
        bgcolor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  )
}
