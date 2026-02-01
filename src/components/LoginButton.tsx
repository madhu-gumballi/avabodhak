import React from 'react'
import { Button, IconButton, Tooltip, Box, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'

interface LoginButtonProps {
  variant?: 'icon' | 'text' | 'banner'
}

export default function LoginButton({ variant = 'icon' }: LoginButtonProps) {
  const { signInWithGoogle, isGuest, user, loading } = useAuth()

  // Don't show if already logged in
  if (user && !isGuest) {
    return null
  }

  // Don't show if Firebase is not configured
  if (!isFirebaseConfigured) {
    return null
  }

  const handleClick = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Failed to sign in:', error)
    }
  }

  if (variant === 'banner') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          py: 1,
          px: 2,
          bgcolor: 'rgba(14, 165, 233, 0.1)',
          borderRadius: 2,
          border: '1px solid rgba(14, 165, 233, 0.3)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Sign in to save progress across devices
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={handleClick}
          disabled={loading}
          sx={{
            textTransform: 'none',
            borderColor: 'rgba(14, 165, 233, 0.5)',
            color: 'primary.light',
          }}
        >
          Sign in
        </Button>
      </Box>
    )
  }

  if (variant === 'text') {
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<LoginIcon />}
        onClick={handleClick}
        disabled={loading}
        sx={{
          textTransform: 'none',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          color: 'text.secondary',
        }}
      >
        Sign in
      </Button>
    )
  }

  return (
    <Tooltip title="Sign in to save progress">
      <IconButton
        onClick={handleClick}
        disabled={loading}
        size="small"
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.light',
          },
        }}
      >
        <LoginIcon />
      </IconButton>
    </Tooltip>
  )
}
