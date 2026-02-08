import React, { useEffect, useState } from 'react'
import { Snackbar, Box, Typography, IconButton, Slide, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import type { SlideProps } from '@mui/material/Slide'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ShareIcon from '@mui/icons-material/Share'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import XIcon from '@mui/icons-material/X'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useAuth } from '../context/AuthContext'
import { ACHIEVEMENTS } from '../lib/achievements'
import {
  getAchievementShareContent,
  shareNative,
  shareToTwitter,
  shareToWhatsApp,
  copyToClipboard,
  isNativeShareAvailable,
} from '../lib/share'
import type { AchievementId } from '../lib/userTypes'
import { playCelebrationSoundIfEnabled } from '../lib/sound'

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />
}

export default function AchievementToast() {
  const { newAchievement, clearNewAchievement } = useAuth()
  const [open, setOpen] = useState(false)
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (newAchievement) {
      setOpen(true)
      playCelebrationSoundIfEnabled()
    }
  }, [newAchievement])

  const handleClose = () => {
    setOpen(false)
    setTimeout(clearNewAchievement, 300) // Wait for animation
  }

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setShareMenuAnchor(event.currentTarget)
  }

  const handleShareMenuClose = () => {
    setShareMenuAnchor(null)
  }

  const handleShare = async (platform: 'native' | 'twitter' | 'whatsapp' | 'copy') => {
    if (!newAchievement) return

    const content = getAchievementShareContent(newAchievement as AchievementId)

    switch (platform) {
      case 'native':
        const shared = await shareNative(content)
        if (!shared) {
          // Fall back to showing menu if native share failed
          return
        }
        break
      case 'twitter':
        shareToTwitter(content)
        break
      case 'whatsapp':
        shareToWhatsApp(content)
        break
      case 'copy':
        const success = await copyToClipboard(content)
        if (success) {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
        break
    }

    handleShareMenuClose()
  }

  if (!newAchievement) return null

  const achievement = ACHIEVEMENTS[newAchievement]
  if (!achievement) return null

  return (
    <>
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 10 }} // Above mobile dock
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 2,
          px: 3,
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: 3,
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
          animation: 'celebration 0.6s ease-out',
          '@keyframes celebration': {
            '0%': {
              transform: 'scale(0.8)',
              opacity: 0,
            },
            '50%': {
              transform: 'scale(1.05)',
            },
            '100%': {
              transform: 'scale(1)',
              opacity: 1,
            },
          },
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(245, 158, 11, 0.2)',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)',
              },
              '50%': {
                boxShadow: '0 0 0 10px rgba(245, 158, 11, 0)',
              },
            },
          }}
        >
          <Typography sx={{ fontSize: '1.5rem' }}>{achievement.icon}</Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <EmojiEventsIcon
              sx={{ fontSize: 16, color: 'rgb(245, 158, 11)' }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgb(245, 158, 11)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Achievement Unlocked!
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.25 }}>
            {achievement.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {achievement.description}
          </Typography>
        </Box>

        {/* Share button */}
        <IconButton
          size="small"
          onClick={isNativeShareAvailable() ? () => handleShare('native') : handleShareClick}
          sx={{
            color: 'rgb(245, 158, 11)',
            '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.1)' }
          }}
          aria-label="Share achievement"
        >
          <ShareIcon fontSize="small" />
        </IconButton>

        {/* Close button */}
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Snackbar>

    {/* Share Menu (fallback for non-native share) */}
    <Menu
      anchorEl={shareMenuAnchor}
      open={Boolean(shareMenuAnchor)}
      onClose={handleShareMenuClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }
      }}
    >
      <MenuItem onClick={() => handleShare('twitter')}>
        <ListItemIcon>
          <XIcon fontSize="small" sx={{ color: 'text.primary' }} />
        </ListItemIcon>
        <ListItemText>Share on X</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => handleShare('whatsapp')}>
        <ListItemIcon>
          <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
        </ListItemIcon>
        <ListItemText>Share on WhatsApp</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => handleShare('copy')}>
        <ListItemIcon>
          <ContentCopyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </ListItemIcon>
        <ListItemText>{copied ? 'Copied!' : 'Copy to clipboard'}</ListItemText>
      </MenuItem>
    </Menu>
    </>
  )
}
