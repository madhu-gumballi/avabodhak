import React, { useState } from 'react'
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import { useAuth } from '../context/AuthContext'
import StreakBadge from './StreakBadge'

interface UserMenuProps {
  onShowAchievements?: () => void
  onShowLeaderboard?: () => void
  onShowSettings?: () => void
}

export default function UserMenu({
  onShowAchievements,
  onShowLeaderboard,
  onShowSettings,
}: UserMenuProps) {
  const { user, userData, isGuest, signOut } = useAuth()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    handleClose()
    await signOut()
  }

  const handleAchievements = () => {
    handleClose()
    onShowAchievements?.()
  }

  const handleLeaderboard = () => {
    handleClose()
    onShowLeaderboard?.()
  }

  const handleSettings = () => {
    handleClose()
    onShowSettings?.()
  }

  // Don't show if not logged in and not guest
  if (!user && !isGuest) {
    return null
  }

  const displayName = userData?.profile.displayName || (isGuest ? 'Guest' : 'User')
  const photoURL = userData?.profile.photoURL
  const currentStreak = userData?.stats.currentStreak || 0

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {currentStreak > 0 && <StreakBadge streak={currentStreak} size="small" />}
        <IconButton onClick={handleOpen} size="small">
          <Avatar
            src={photoURL || undefined}
            alt={displayName}
            sx={{
              width: 32,
              height: 32,
              bgcolor: isGuest ? 'grey.700' : 'primary.main',
              fontSize: '0.875rem',
            }}
          >
            {isGuest ? <PersonIcon fontSize="small" /> : displayName[0]?.toUpperCase()}
          </Avatar>
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {displayName}
          </Typography>
          {userData?.profile.email && (
            <Typography variant="caption" color="text.secondary">
              {userData.profile.email}
            </Typography>
          )}
          {isGuest && (
            <Typography variant="caption" color="warning.main" display="block">
              Guest mode - Sign in to sync progress
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Stats summary */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 2 }}>
          <StatItem
            label="Lines"
            value={userData?.stats.totalLinesCompleted || 0}
          />
          <StatItem
            label="Puzzles"
            value={userData?.stats.totalPuzzlesSolved || 0}
          />
          <StatItem
            label="Streak"
            value={currentStreak}
            suffix="d"
          />
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <MenuItem onClick={handleAchievements}>
          <ListItemIcon>
            <EmojiEventsIcon fontSize="small" sx={{ color: 'amber.500' }} />
          </ListItemIcon>
          <ListItemText>Achievements</ListItemText>
          {userData && (
            <Typography variant="caption" color="text.secondary">
              {userData.achievements.length}
            </Typography>
          )}
        </MenuItem>

        <MenuItem onClick={handleLeaderboard}>
          <ListItemIcon>
            <LeaderboardIcon fontSize="small" sx={{ color: 'primary.light' }} />
          </ListItemIcon>
          <ListItemText>Leaderboard</ListItemText>
        </MenuItem>

        {onShowSettings && (
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
        )}

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

function StatItem({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: number
  suffix?: string
}) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2" fontWeight="bold">
        {value}
        {suffix}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  )
}
