import React from 'react'
import { Box, Typography, Tooltip } from '@mui/material'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'

interface StreakBadgeProps {
  streak: number
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  animate?: boolean
}

export default function StreakBadge({
  streak,
  size = 'medium',
  showLabel = false,
  animate = true,
}: StreakBadgeProps) {
  if (streak <= 0) return null

  const sizes = {
    small: { icon: 16, font: '0.75rem', py: 0.25, px: 0.75 },
    medium: { icon: 20, font: '0.875rem', py: 0.5, px: 1 },
    large: { icon: 28, font: '1.125rem', py: 0.75, px: 1.5 },
  }

  const s = sizes[size]

  // Streak color intensity based on length
  const getColor = () => {
    if (streak >= 30) return '#f97316' // Orange-500
    if (streak >= 14) return '#fb923c' // Orange-400
    if (streak >= 7) return '#fdba74' // Orange-300
    return '#fed7aa' // Orange-200
  }

  const badge = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        py: s.py,
        px: s.px,
        bgcolor: 'rgba(251, 146, 60, 0.15)',
        borderRadius: 2,
        border: '1px solid rgba(251, 146, 60, 0.3)',
      }}
    >
      <LocalFireDepartmentIcon
        sx={{
          fontSize: s.icon,
          color: getColor(),
          animation: animate && streak >= 7 ? 'flicker 1.5s infinite' : undefined,
          '@keyframes flicker': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.7 },
          },
        }}
      />
      <Typography
        sx={{
          fontSize: s.font,
          fontWeight: 'bold',
          color: getColor(),
          lineHeight: 1,
        }}
      >
        {streak}
      </Typography>
      {showLabel && (
        <Typography
          sx={{
            fontSize: s.font,
            color: 'text.secondary',
            lineHeight: 1,
          }}
        >
          day{streak !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  )

  return (
    <Tooltip
      title={`${streak} day streak! Keep practicing to maintain it.`}
      arrow
      placement="bottom"
    >
      {badge}
    </Tooltip>
  )
}
