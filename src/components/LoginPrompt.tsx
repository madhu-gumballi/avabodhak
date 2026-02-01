import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

interface LoginPromptProps {
  open: boolean
}

export default function LoginPrompt({ open }: LoginPromptProps) {
  const { signInWithGoogle, continueAsGuest, loading } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Failed to sign in:', error)
    }
  }

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h5" fontWeight="bold" color="primary.light">
          Welcome to Avabodhak
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Learn Sanskrit stotras through practice and puzzles
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 3,
              flexWrap: 'wrap',
              mb: 3,
            }}
          >
            <FeatureItem icon="🔥" text="Daily streaks" />
            <FeatureItem icon="🏆" text="Achievements" />
            <FeatureItem icon="📊" text="Leaderboards" />
            <FeatureItem icon="☁️" text="Cloud sync" />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
          {isFirebaseConfigured && (
            <Button
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: 'white',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Sign in with Google
            </Button>
          )}

          <Button
            variant="outlined"
            size="large"
            startIcon={<PersonOutlineIcon />}
            onClick={continueAsGuest}
            disabled={loading}
            sx={{
              py: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
              textTransform: 'none',
            }}
          >
            Continue as Guest
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 3 }}
        >
          {isFirebaseConfigured
            ? 'Sign in to save progress across devices and unlock achievements'
            : 'Your progress will be saved locally on this device'}
        </Typography>
      </DialogContent>
    </Dialog>
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  )
}
