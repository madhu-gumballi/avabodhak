import React from 'react'
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAuth } from '../context/AuthContext'

interface DailyGoalWidgetProps {
  compact?: boolean
  showLabels?: boolean
}

export default function DailyGoalWidget({
  compact = false,
  showLabels = true,
}: DailyGoalWidgetProps) {
  const { userData } = useAuth()

  if (!userData) return null

  const { dailyGoals } = userData
  const linesProgress = Math.min(
    (dailyGoals.linesToday / dailyGoals.linesTarget) * 100,
    100
  )
  const puzzlesProgress = Math.min(
    (dailyGoals.puzzlesToday / dailyGoals.puzzlesTarget) * 100,
    100
  )
  const linesComplete = dailyGoals.linesToday >= dailyGoals.linesTarget
  const puzzlesComplete = dailyGoals.puzzlesToday >= dailyGoals.puzzlesTarget
  const allComplete = linesComplete && puzzlesComplete

  if (compact) {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="body2">
              Lines: {dailyGoals.linesToday}/{dailyGoals.linesTarget}
            </Typography>
            <Typography variant="body2">
              Puzzles: {dailyGoals.puzzlesToday}/{dailyGoals.puzzlesTarget}
            </Typography>
          </Box>
        }
        arrow
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            py: 0.25,
            px: 0.75,
            bgcolor: allComplete
              ? 'rgba(34, 197, 94, 0.15)'
              : 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1.5,
            border: allComplete
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {allComplete ? (
            <CheckCircleIcon
              sx={{ fontSize: 14, color: 'rgb(34, 197, 94)' }}
            />
          ) : (
            <>
              <ProgressCircle
                progress={linesProgress}
                size={14}
                color="rgb(14, 165, 233)"
              />
              <ProgressCircle
                progress={puzzlesProgress}
                size={14}
                color="rgb(168, 85, 247)"
              />
            </>
          )}
        </Box>
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {showLabels && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Daily Goals
        </Typography>
      )}

      {/* Lines goal */}
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Practice Lines
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: linesComplete ? 'rgb(34, 197, 94)' : 'text.primary',
              fontWeight: linesComplete ? 600 : 400,
            }}
          >
            {dailyGoals.linesToday}/{dailyGoals.linesTarget}
            {linesComplete && ' '}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={linesProgress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: linesComplete ? 'rgb(34, 197, 94)' : 'rgb(14, 165, 233)',
              borderRadius: 3,
            },
          }}
        />
      </Box>

      {/* Puzzles goal */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Puzzles Solved
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: puzzlesComplete ? 'rgb(34, 197, 94)' : 'text.primary',
              fontWeight: puzzlesComplete ? 600 : 400,
            }}
          >
            {dailyGoals.puzzlesToday}/{dailyGoals.puzzlesTarget}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={puzzlesProgress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: puzzlesComplete
                ? 'rgb(34, 197, 94)'
                : 'rgb(168, 85, 247)',
              borderRadius: 3,
            },
          }}
        />
      </Box>

      {allComplete && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 2,
            pt: 1.5,
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 18, color: 'rgb(34, 197, 94)' }} />
          <Typography variant="body2" color="rgb(34, 197, 94)">
            Daily goals complete!
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// Small circular progress indicator
function ProgressCircle({
  progress,
  size,
  color,
}: {
  progress: number
  size: number
  color: string
}) {
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}
