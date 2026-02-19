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
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import PublicIcon from '@mui/icons-material/Public'
import { useAuth } from '../context/AuthContext'
import StreakBadge from './StreakBadge'
import { REGION_OPTIONS, getRegionFlag } from '../lib/region'
import type { Lang } from '../data/types'

// --------------- i18n ---------------

const MENU_STRINGS: Record<string, Record<string, string>> = {
  iast: {
    guest_hint: 'Guest mode — Sign in to sync progress',
    streak: 'Streak',
    streak_suffix: 'd',
    achievements: 'Achievements',
    leaderboard: 'Leaderboard',
    feedback: 'Feedback',
    sound: 'Sound',
    region: 'Region',
    select_region: 'Select region',
    settings: 'Settings',
    sign_out: 'Sign Out',
    exit_guest: 'Exit Guest Mode',
  },
  deva: {
    guest_hint: 'अतिथि मोड — प्रगति सहेजने हेतु साइन इन करें',
    streak: 'स्ट्रीक',
    streak_suffix: 'दि',
    achievements: 'उपलब्धियाँ',
    leaderboard: 'लीडरबोर्ड',
    feedback: 'प्रतिक्रिया',
    sound: 'ध्वनि',
    region: 'क्षेत्र',
    select_region: 'क्षेत्र चुनें',
    settings: 'सेटिंग्स',
    sign_out: 'साइन आउट',
    exit_guest: 'अतिथि मोड छोड़ें',
  },
  knda: {
    guest_hint: 'ಅತಿಥಿ ಮೋಡ್ — ಪ್ರಗತಿ ಉಳಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ',
    streak: 'ಸ್ಟ್ರೀಕ್',
    streak_suffix: 'ದಿ',
    achievements: 'ಸಾಧನೆಗಳು',
    leaderboard: 'ಲೀಡರ್‌ಬೋರ್ಡ್',
    feedback: 'ಪ್ರತಿಕ್ರಿಯೆ',
    sound: 'ಧ್ವನಿ',
    region: 'ಪ್ರದೇಶ',
    select_region: 'ಪ್ರದೇಶ ಆಯ್ಕೆಮಾಡಿ',
    settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    sign_out: 'ಸೈನ್ ಔಟ್',
    exit_guest: 'ಅತಿಥಿ ಮೋಡ್ ಬಿಡಿ',
  },
  tel: {
    guest_hint: 'అతిథి మోడ్ — ప్రగతి సేవ్ చేయడానికి సైన్ ఇన్ చేయండి',
    streak: 'స్ట్రీక్',
    streak_suffix: 'రో',
    achievements: 'సాధనలు',
    leaderboard: 'లీడర్‌బోర్డ్',
    feedback: 'అభిప్రాయం',
    sound: 'ధ్వని',
    region: 'ప్రాంతం',
    select_region: 'ప్రాంతం ఎంచుకోండి',
    settings: 'సెట్టింగ్స్',
    sign_out: 'సైన్ ఔట్',
    exit_guest: 'అతిథి మోడ్ విడవండి',
  },
  tam: {
    guest_hint: 'விருந்தினர் பயன்முறை — முன்னேற்றத்தை சேமிக்க உள்நுழையவும்',
    streak: 'ஸ்ட்ரீக்',
    streak_suffix: 'நா',
    achievements: 'சாதனைகள்',
    leaderboard: 'லீடர்போர்டு',
    feedback: 'கருத்து',
    sound: 'ஒலி',
    region: 'பகுதி',
    select_region: 'பகுதியை தேர்வுசெய்க',
    settings: 'அமைப்புகள்',
    sign_out: 'வெளியேறு',
    exit_guest: 'விருந்தினர் பயன்முறையிலிருந்து வெளியேறு',
  },
  pan: {
    guest_hint: 'ਮਹਿਮਾਨ ਮੋਡ — ਪ੍ਰਗਤੀ ਸੇਵ ਕਰਨ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ',
    streak: 'ਸਟ੍ਰੀਕ',
    streak_suffix: 'ਦਿ',
    achievements: 'ਪ੍ਰਾਪਤੀਆਂ',
    leaderboard: 'ਲੀਡਰਬੋਰਡ',
    feedback: 'ਫੀਡਬੈਕ',
    sound: 'ਧੁਨੀ',
    region: 'ਖੇਤਰ',
    select_region: 'ਖੇਤਰ ਚੁਣੋ',
    settings: 'ਸੈਟਿੰਗਜ਼',
    sign_out: 'ਸਾਈਨ ਆਊਟ',
    exit_guest: 'ਮਹਿਮਾਨ ਮੋਡ ਛੱਡੋ',
  },
  guj: {
    guest_hint: 'મહેમાન મોડ — પ્રગતિ સાચવવા સાઇન ઇન કરો',
    streak: 'સ્ટ્રીક',
    streak_suffix: 'દિ',
    achievements: 'સિદ્ધિઓ',
    leaderboard: 'લીડરબોર્ડ',
    feedback: 'ફીડબેક',
    sound: 'ધ્વનિ',
    region: 'પ્રદેશ',
    select_region: 'પ્રદેશ પસંદ કરો',
    settings: 'સેટિંગ્સ',
    sign_out: 'સાઇન આઉટ',
    exit_guest: 'મહેમાન મોડ છોડો',
  },
  mr: {
    guest_hint: 'अतिथी मोड — प्रगती जतन करण्यासाठी साइन इन करा',
    streak: 'स्ट्रीक',
    streak_suffix: 'दि',
    achievements: 'कामगिरी',
    leaderboard: 'लीडरबोर्ड',
    feedback: 'अभिप्राय',
    sound: 'ध्वनी',
    region: 'प्रदेश',
    select_region: 'प्रदेश निवडा',
    settings: 'सेटिंग्ज',
    sign_out: 'साइन आउट',
    exit_guest: 'अतिथी मोड सोडा',
  },
  ben: {
    guest_hint: 'অতিথি মোড — অগ্রগতি সংরক্ষণ করতে সাইন ইন করুন',
    streak: 'স্ট্রীক',
    streak_suffix: 'দি',
    achievements: 'অর্জন',
    leaderboard: 'লিডারবোর্ড',
    feedback: 'প্রতিক্রিয়া',
    sound: 'ধ্বনি',
    region: 'অঞ্চল',
    select_region: 'অঞ্চল নির্বাচন করুন',
    settings: 'সেটিংস',
    sign_out: 'সাইন আউট',
    exit_guest: 'অতিথি মোড ছাড়ুন',
  },
  mal: {
    guest_hint: 'അതിഥി മോഡ് — പുരോഗതി സേവ് ചെയ്യാൻ സൈൻ ഇൻ ചെയ്യുക',
    streak: 'സ്ട്രീക്ക്',
    streak_suffix: 'ദി',
    achievements: 'നേട്ടങ്ങൾ',
    leaderboard: 'ലീഡർബോർഡ്',
    feedback: 'ഫീഡ്‌ബാക്ക്',
    sound: 'ശബ്ദം',
    region: 'പ്രദേശം',
    select_region: 'പ്രദേശം തിരഞ്ഞെടുക്കുക',
    settings: 'ക്രമീകരണം',
    sign_out: 'സൈൻ ഔട്ട്',
    exit_guest: 'അതിഥി മോഡ് വിടുക',
  },
}

function menuT(lang: Lang, key: string): string {
  return MENU_STRINGS[lang]?.[key] || MENU_STRINGS.iast[key] || key
}

interface UserMenuProps {
  lang?: Lang
  onShowAchievements?: () => void
  onShowLeaderboard?: () => void
  onShowFeedback?: () => void
  onShowSettings?: () => void
}

export default function UserMenu({
  lang = 'iast',
  onShowAchievements,
  onShowLeaderboard,
  onShowFeedback,
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

  const handleFeedback = () => {
    handleClose()
    onShowFeedback?.()
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
            minWidth: 220,
            maxWidth: 260,
            maxHeight: '80vh',
            overflow: 'auto',
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
              {menuT(lang, 'guest_hint')}
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Streak */}
        {currentStreak > 0 && (
          <Box sx={{ px: 2, py: 1 }}>
            <StatItem label={menuT(lang, 'streak')} value={currentStreak} suffix={menuT(lang, 'streak_suffix')} />
          </Box>
        )}

        {currentStreak > 0 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />}

        <MenuItem onClick={handleAchievements}>
          <ListItemIcon>
            <EmojiEventsIcon fontSize="small" sx={{ color: 'amber.500' }} />
          </ListItemIcon>
          <ListItemText>{menuT(lang, 'achievements')}</ListItemText>
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
          <ListItemText>{menuT(lang, 'leaderboard')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleFeedback}>
          <ListItemIcon>
            <ChatBubbleOutlineIcon fontSize="small" sx={{ color: '#a78bfa' }} />
          </ListItemIcon>
          <ListItemText>{menuT(lang, 'feedback')}</ListItemText>
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
          <ListItemText>{menuT(lang, 'sound')}</ListItemText>
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
              {menuT(lang, 'region')}
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
              if (!value) return menuT(lang, 'select_region')
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
            <ListItemText>{menuT(lang, 'settings')}</ListItemText>
          </MenuItem>
        )}

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isGuest ? menuT(lang, 'exit_guest') : menuT(lang, 'sign_out')}</ListItemText>
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
