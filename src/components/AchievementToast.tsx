import React, { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ShareIcon from '@mui/icons-material/Share'
import { useAuth } from '../context/AuthContext'
import { ACHIEVEMENTS } from '../lib/achievements'
import {
  getAchievementShareContent,
  shareWithImage,
  shareNative,
  isNativeShareAvailable,
} from '../lib/share'
import { generateAchievementCard } from '../lib/achievementCard'
import type { AchievementId } from '../lib/userTypes'
import { playCelebrationSoundIfEnabled } from '../lib/sound'

const SAFETY_TIMEOUT_MS = 30_000

export default function AchievementToast() {
  const { newAchievement, clearNewAchievement, userData } = useAuth()
  const [open, setOpen] = useState(false)
  const [cardBlob, setCardBlob] = useState<Blob | null>(null)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (newAchievement) {
      setOpen(true)
      setCardBlob(null)
      setCardUrl(null)
      playCelebrationSoundIfEnabled()

      // Generate card image
      const achievement = ACHIEVEMENTS[newAchievement]
      if (achievement) {
        generateAchievementCard({
          achievementIcon: achievement.icon,
          achievementName: achievement.name,
          achievementDescription: achievement.description,
          userName: userData?.profile.displayName,
          unlockedDate: new Date().toLocaleDateString(),
        })
          .then((blob) => {
            setCardBlob(blob)
            const url = URL.createObjectURL(blob)
            setCardUrl(url)
          })
          .catch(() => {})
      }

      // Safety auto-dismiss
      timeoutRef.current = setTimeout(() => {
        handleClose()
      }, SAFETY_TIMEOUT_MS)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAchievement])

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (cardUrl) URL.revokeObjectURL(cardUrl)
    }
  }, [cardUrl])

  const handleClose = () => {
    setOpen(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTimeout(clearNewAchievement, 300)
  }

  const handleShare = async () => {
    if (!newAchievement) return
    setSharing(true)

    try {
      const content = getAchievementShareContent(newAchievement as AchievementId)

      if (cardBlob) {
        const fileName = `avabodhak-${newAchievement}.png`
        await shareWithImage(content, cardBlob, fileName)
      } else if (isNativeShareAvailable()) {
        await shareNative(content)
      }
    } catch {
      // Silently fail
    } finally {
      setSharing(false)
    }
  }

  if (!newAchievement) return null

  const achievement = ACHIEVEMENTS[newAchievement]
  if (!achievement) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 3,
          maxWidth: 400,
          width: '90vw',
          m: 2,
          boxShadow: '0 0 40px rgba(245, 158, 11, 0.15)',
          animation: 'celebration 0.6s ease-out',
          '@keyframes celebration': {
            '0%': { transform: 'scale(0.8)', opacity: 0 },
            '50%': { transform: 'scale(1.05)' },
            '100%': { transform: 'scale(1)', opacity: 1 },
          },
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={handleClose}
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
        {/* Header badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 2,
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 18, color: 'rgb(245, 158, 11)' }} />
          <Typography
            variant="caption"
            sx={{
              color: 'rgb(245, 158, 11)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Achievement Unlocked!
          </Typography>
        </Box>

        {/* Icon with glow */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 2,
            borderRadius: '50%',
            bgcolor: 'rgba(245, 158, 11, 0.15)',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)' },
              '50%': { boxShadow: '0 0 0 16px rgba(245, 158, 11, 0)' },
            },
          }}
        >
          <Typography sx={{ fontSize: '2.5rem' }}>{achievement.icon}</Typography>
        </Box>

        {/* Achievement details */}
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
          {achievement.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {achievement.description}
        </Typography>

        {/* Card preview */}
        {cardUrl && (
          <Box
            sx={{
              mb: 2.5,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <img
              src={cardUrl}
              alt="Achievement card"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={sharing ? <CircularProgress size={16} color="inherit" /> : <ShareIcon />}
            onClick={handleShare}
            disabled={sharing}
            sx={{
              bgcolor: 'rgb(245, 158, 11)',
              color: '#0f172a',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: 'rgb(217, 119, 6)' },
            }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              borderColor: 'rgba(148, 163, 184, 0.3)',
              color: 'text.secondary',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                borderColor: 'rgba(148, 163, 184, 0.5)',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            Dismiss
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
