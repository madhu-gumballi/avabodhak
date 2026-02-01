import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Avatar,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useAuth } from '../context/AuthContext'
import {
  getLeaderboard,
  formatTimeUntilReset,
} from '../lib/leaderboard'
import { LeaderboardEntry, LeaderboardPeriod } from '../lib/userTypes'
import type { Lang } from '../data/types'

interface LeaderboardPanelProps {
  open: boolean
  onClose: () => void
  lang?: Lang
}

// UI text translations
const UI_TEXT: Record<string, Record<Lang, string>> = {
  leaderboard: {
    deva: 'लीडरबोर्ड',
    knda: 'ಲೀಡರ್‌ಬೋರ್ಡ್',
    tel: 'లీడర్‌బోర్డ్',
    tam: 'லீடர்போர்டு',
    pan: 'ਲੀਡਰਬੋਰਡ',
    guj: 'લીડરબોર્ડ',
    mr: 'लीडरबोर्ड',
    ben: 'লিডারবোর্ড',
    mal: 'ലീഡർബോർഡ്',
    iast: 'Leaderboard'
  },
  weekly: {
    deva: 'साप्ताहिक',
    knda: 'ವಾರದ',
    tel: 'వారపు',
    tam: 'வாராந்திர',
    pan: 'ਹਫ਼ਤਾਵਾਰੀ',
    guj: 'સાપ્તાહિક',
    mr: 'साप्ताहिक',
    ben: 'সাপ্তাহিক',
    mal: 'വാരാന്ത്യ',
    iast: 'Weekly'
  },
  monthly: {
    deva: 'मासिक',
    knda: 'ಮಾಸಿಕ',
    tel: 'మాసపు',
    tam: 'மாதாந்திர',
    pan: 'ਮਾਸਿਕ',
    guj: 'માસિક',
    mr: 'मासिक',
    ben: 'মাসিক',
    mal: 'മാസാന്ത്യ',
    iast: 'Monthly'
  },
  allTime: {
    deva: 'सर्वकालीन',
    knda: 'ಸರ್ವಕಾಲೀನ',
    tel: 'సర్వకాలీన',
    tam: 'எல்லா நேரமும்',
    pan: 'ਸਰਵਕਾਲੀ',
    guj: 'સર્વકાલીન',
    mr: 'सर्वकालीन',
    ben: 'সর্বকালীন',
    mal: 'എല്ലാ കാലവും',
    iast: 'All Time'
  },
  you: {
    deva: 'आप',
    knda: 'ನೀವು',
    tel: 'మీరు',
    tam: 'நீங்கள்',
    pan: 'ਤੁਸੀਂ',
    guj: 'તમે',
    mr: 'तुम्ही',
    ben: 'আপনি',
    mal: 'നിങ്ങൾ',
    iast: 'You'
  },
  noEntries: {
    deva: 'अभी तक कोई प्रविष्टि नहीं। पहले बनें!',
    knda: 'ಇನ್ನೂ ಪ್ರವೇಶಗಳಿಲ್ಲ. ಮೊದಲಿಗರಾಗಿ!',
    tel: 'ఇంకా ఎంట్రీలు లేవు. మొదటివారు అవ్వండి!',
    tam: 'இதுவரை பதிவுகள் இல்லை. முதலில் இருங்கள்!',
    pan: 'ਅਜੇ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ। ਪਹਿਲੇ ਬਣੋ!',
    guj: 'હજુ સુધી કોઈ એન્ટ્રી નથી. પહેલા બનો!',
    mr: 'अद्याप कोणतीही नोंद नाही. पहिले व्हा!',
    ben: 'এখনও কোনো এন্ট্রি নেই। প্রথম হন!',
    mal: 'ഇതുവരെ എൻട്രികൾ ഇല്ല. ആദ്യമാകൂ!',
    iast: 'No entries yet. Be the first!'
  },
  resetsIn: {
    deva: 'में रीसेट',
    knda: 'ನಲ್ಲಿ ಮರುಹೊಂದಿಸುತ್ತದೆ',
    tel: 'లో రీసెట్',
    tam: 'இல் மீட்டமைக்கப்படும்',
    pan: 'ਵਿੱਚ ਰੀਸੈਟ',
    guj: 'માં રીસેટ',
    mr: 'मध्ये रीसेट',
    ben: 'এ রিসেট',
    mal: 'ൽ റീസെറ്റ്',
    iast: 'Resets in'
  }
}

export default function LeaderboardPanel({ open, onClose, lang = 'deva' }: LeaderboardPanelProps) {
  const { user } = useAuth()
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const getUIText = (key: string): string => {
    return UI_TEXT[key]?.[lang] || UI_TEXT[key]?.iast || key
  }

  useEffect(() => {
    if (open) {
      loadLeaderboard()
    }
  }, [open, period])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const data = await getLeaderboard(period)
      setEntries(data)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (_: React.SyntheticEvent, newValue: LeaderboardPeriod) => {
    setPeriod(newValue)
  }

  const resetText = formatTimeUntilReset(period)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ color: 'rgb(245, 158, 11)' }} />
          <Typography variant="h6" fontWeight="bold">
            {getUIText('leaderboard')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 0 }}>
        {/* Period tabs */}
        <Box sx={{ px: 3, mb: 2 }}>
          <Tabs
            value={period}
            onChange={handlePeriodChange}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                textTransform: 'none',
                fontSize: '0.875rem',
              },
            }}
          >
            <Tab label={getUIText('weekly')} value="weekly" />
            <Tab label={getUIText('monthly')} value="monthly" />
            <Tab label={getUIText('allTime')} value="allTime" />
          </Tabs>
          {resetText && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {resetText}
            </Typography>
          )}
        </Box>

        {/* Leaderboard list */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {getUIText('noEntries')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ px: 2 }}>
            {entries.map((entry, index) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === user?.uid}
                position={index + 1}
                youLabel={getUIText('you')}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isCurrentUser: boolean
  position: number
  youLabel: string
}

function LeaderboardRow({ entry, isCurrentUser, position, youLabel }: LeaderboardRowProps) {
  const getMedalColor = () => {
    switch (position) {
      case 1:
        return '#ffd700' // Gold
      case 2:
        return '#c0c0c0' // Silver
      case 3:
        return '#cd7f32' // Bronze
      default:
        return null
    }
  }

  const medalColor = getMedalColor()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        mx: 1,
        mb: 1,
        borderRadius: 2,
        bgcolor: isCurrentUser
          ? 'rgba(14, 165, 233, 0.15)'
          : 'rgba(255, 255, 255, 0.02)',
        border: isCurrentUser
          ? '1px solid rgba(14, 165, 233, 0.3)'
          : '1px solid transparent',
      }}
    >
      {/* Rank */}
      <Box
        sx={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: medalColor
            ? `${medalColor}20`
            : 'rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}
      >
        {medalColor ? (
          <EmojiEventsIcon
            sx={{ fontSize: 18, color: medalColor }}
          />
        ) : (
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            {position}
          </Typography>
        )}
      </Box>

      {/* Avatar */}
      <Avatar
        src={entry.photoURL || undefined}
        alt={entry.displayName}
        sx={{
          width: 36,
          height: 36,
          bgcolor: 'primary.main',
          fontSize: '0.875rem',
        }}
      >
        {entry.displayName[0]?.toUpperCase()}
      </Avatar>

      {/* Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={isCurrentUser ? 'bold' : 'medium'}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.displayName}
          {isCurrentUser && (
            <Typography
              component="span"
              variant="caption"
              color="primary.light"
              sx={{ ml: 1 }}
            >
              ({youLabel})
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Score */}
      <Typography
        variant="body2"
        fontWeight="bold"
        sx={{
          color: medalColor || 'text.primary',
        }}
      >
        {entry.score.toLocaleString()}
      </Typography>
    </Box>
  )
}
