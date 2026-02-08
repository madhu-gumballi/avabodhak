import React, { useState, useMemo } from 'react'
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
  Switch,
  Select,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import LogoutIcon from '@mui/icons-material/Logout'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import PublicIcon from '@mui/icons-material/Public'
import SchoolIcon from '@mui/icons-material/School'
import ExtensionIcon from '@mui/icons-material/Extension'
import { useAuth } from '../context/AuthContext'
import StreakBadge from './StreakBadge'
import { REGION_OPTIONS, getRegionFlag } from '../lib/region'
import { STOTRAS, getStotraLines, getStotraChapterIndices } from '../lib/stotraConfig'
import { getPracticeStats, getPracticeCompletionCount } from '../lib/practice'
import { getPuzzleStats, getPuzzleCompletionCount } from '../lib/puzzle'

const STOTRA_SHORT_NAMES: Record<string, string> = {
  vsn: 'Sri Vishnu Sahasranama',
  hari: 'Sri Hari Stuti',
  keshava: 'Sri Keshava Nama',
  vayu: 'Sri Vayu Stuti',
}

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
  const { user, userData, isGuest, signOut, updatePreferences, updateProfile } = useAuth()
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

  // Compute per-stotra progress for the dropdown.
  // Cheap first pass (no line-text scan), precise only for winning language.
  const stotraProgress = useMemo(() => {
    if (!anchorEl) return [] // skip computation when menu is closed
    return STOTRAS.map((stotra) => {
      let bestPracticeCompleted = 0
      let bestPracticeLang = stotra.languages[0]
      let bestPuzzleCompleted = 0
      let bestPuzzleLang = stotra.languages[0]

      for (const lang of stotra.languages) {
        const ps = getPracticeStats(lang, stotra.totalLines, stotra.key)
        if (ps.completedLines > bestPracticeCompleted) {
          bestPracticeCompleted = ps.completedLines
          bestPracticeLang = lang
        }
        const pz = getPuzzleStats(lang, stotra.totalLines, stotra.key)
        if (pz.completed > bestPuzzleCompleted) {
          bestPuzzleCompleted = pz.completed
          bestPuzzleLang = lang
        }
      }

      // Precise puzzle total only for the winning language
      let bestPuzzleTotal = stotra.totalLines
      if (bestPuzzleCompleted > 0) {
        const lines = getStotraLines(stotra.data, bestPuzzleLang)
        const chapters = getStotraChapterIndices(stotra.data)
        const pz = getPuzzleStats(bestPuzzleLang, stotra.totalLines, stotra.key, lines, chapters)
        bestPuzzleTotal = pz.total
      }

      return {
        key: stotra.key,
        name: STOTRA_SHORT_NAMES[stotra.key] || stotra.key,
        practiceCompleted: bestPracticeCompleted,
        practiceTotal: stotra.totalLines,
        puzzleCompleted: bestPuzzleCompleted,
        puzzleTotal: bestPuzzleTotal,
        practiceCompletionCount: getPracticeCompletionCount(bestPracticeLang, stotra.key),
        puzzleCompletionCount: getPuzzleCompletionCount(bestPuzzleLang, stotra.key),
        hasProgress: bestPracticeCompleted > 0 || bestPuzzleCompleted > 0,
      }
    }).filter((s) => s.hasProgress)
      .sort((a, b) => (b.practiceCompleted + b.puzzleCompleted) - (a.practiceCompleted + a.puzzleCompleted))
  }, [anchorEl]) // recompute when menu opens

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
            minWidth: 220,
            maxWidth: 260,
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

        {/* Compact stats: streak + per-stotra one-liners (max 3) */}
        <Box sx={{ px: 2, py: 1.5 }}>
          {currentStreak > 0 && (
            <Box sx={{ mb: stotraProgress.length > 0 ? 1 : 0 }}>
              <StatItem label="Streak" value={currentStreak} suffix="d" />
            </Box>
          )}
          {stotraProgress.slice(0, 3).map((s) => {
            const maxCount = Math.max(s.practiceCompletionCount, s.puzzleCompletionCount)
            return (
              <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25 }}>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#94a3b8', flex: 1, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </Typography>
                {maxCount > 0 && (
                  <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.55rem' }}>
                    x{maxCount}
                  </Typography>
                )}
                {s.practiceCompleted > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <SchoolIcon sx={{ fontSize: 10, color: '#a78bfa' }} />
                    <Typography variant="caption" sx={{ color: '#a78bfa', fontSize: '0.55rem', fontWeight: 600 }}>
                      {s.practiceCompleted}/{s.practiceTotal}
                    </Typography>
                  </Box>
                )}
                {s.puzzleCompleted > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <ExtensionIcon sx={{ fontSize: 10, color: '#f472b6' }} />
                    <Typography variant="caption" sx={{ color: '#f472b6', fontSize: '0.55rem', fontWeight: 600 }}>
                      {s.puzzleCompleted}/{s.puzzleTotal}
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })}
          {stotraProgress.length > 3 && (
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.55rem', mt: 0.5, display: 'block' }}>
              +{stotraProgress.length - 3} more in progress
            </Typography>
          )}
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

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Sound toggle */}
        <MenuItem
          onClick={() => {
            const current = userData?.preferences?.soundEnabled ?? true
            updatePreferences({ soundEnabled: !current })
          }}
          sx={{ py: 0.5 }}
        >
          <ListItemIcon>
            {(userData?.preferences?.soundEnabled ?? true) ? (
              <VolumeUpIcon fontSize="small" sx={{ color: '#22c55e' }} />
            ) : (
              <VolumeOffIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
          </ListItemIcon>
          <ListItemText>Sound</ListItemText>
          <Switch
            size="small"
            checked={userData?.preferences?.soundEnabled ?? true}
            onChange={() => {
              const current = userData?.preferences?.soundEnabled ?? true
              updatePreferences({ soundEnabled: !current })
            }}
            onClick={(e) => e.stopPropagation()}
            sx={{ ml: 1 }}
          />
        </MenuItem>

        {/* Region selector */}
        <Box sx={{ px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <PublicIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Region
            </Typography>
          </Box>
          <Select
            size="small"
            value={userData?.profile?.region || ''}
            onChange={(e: SelectChangeEvent) => {
              updateProfile({ region: e.target.value })
            }}
            displayEmpty
            fullWidth
            renderValue={(value) => {
              if (!value) return 'Select region'
              return `${getRegionFlag(value)} ${value}`
            }}
            sx={{
              fontSize: '0.75rem',
              height: 32,
              bgcolor: 'rgba(255,255,255,0.05)',
              '& .MuiSelect-select': { py: 0.5 },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 200,
                  bgcolor: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
              },
            }}
          >
            {REGION_OPTIONS.map((region) => (
              <MenuItem key={region} value={region} sx={{ fontSize: '0.75rem' }}>
                {getRegionFlag(region)} {region}
              </MenuItem>
            ))}
          </Select>
        </Box>

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
