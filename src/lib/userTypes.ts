import type { Timestamp } from 'firebase/firestore'

// User profile stored at /users/{userId}
export interface UserProfile {
  displayName: string
  email: string
  photoURL: string | null
  region: string | null
  createdAt: Timestamp | Date
  lastLoginAt: Timestamp | Date
}

export interface UserPreferences {
  lang: string
  lang2: string | null
  theme: 'dark' | 'light'
  legendOpen: boolean
  learnMode: boolean
  soundEnabled: boolean
}

export interface UserStats {
  totalLinesCompleted: number
  totalPuzzlesSolved: number
  perfectPuzzles: number // Puzzles solved without hints
  currentStreak: number
  longestStreak: number
  lastActiveDate: Timestamp | Date | null
  totalTimeSpentMs: number
}

export interface DailyGoals {
  linesTarget: number // Default 10
  linesToday: number
  puzzlesTarget: number // Default 5
  puzzlesToday: number
  lastResetDate: Timestamp | Date
}

export interface Achievement {
  id: AchievementId
  unlockedAt: Timestamp | Date
}

// Main user document structure
export interface UserDocument {
  profile: UserProfile
  preferences: UserPreferences
  stats: UserStats
  dailyGoals: DailyGoals
  achievements: Achievement[]
}

// Progress per stotra stored at /users/{userId}/progress/{stotraId}
export interface StotraProgress {
  practice: {
    completedLines: number[]
    totalRevealed: number
    lastPracticedAt: Timestamp | Date | null
  }
  puzzle: {
    completedLines: number[]
    perfectSolves: number
    attempts: number
    hintsUsed: number
    lastPlayedAt: Timestamp | Date | null
  }
  reading: {
    currentLine: number
    furthestLine: number
    lastReadAt: Timestamp | Date | null
  }
}

// Leaderboard entry
export interface LeaderboardEntry {
  userId: string
  displayName: string
  photoURL: string | null
  region: string | null
  score: number
  rank: number
}

export interface LeaderboardDocument {
  entries: LeaderboardEntry[]
  updatedAt: Timestamp | Date
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'allTime'

// Achievement definitions
export type AchievementId =
  | 'first_line'
  | 'first_stotra'
  | 'streak_2'
  | 'streak_3'
  | 'streak_5'
  | 'streak_7'
  | 'streak_14'
  | 'streak_21'
  | 'streak_30'
  | 'streak_60'
  | 'streak_100'
  | 'puzzle_perfect_10'
  | 'polyglot'
  | 'speed_learner'
  | 'all_stotras'
  // Stotra-specific mastery badges
  | 'vsn_master'
  | 'hari_master'
  | 'keshava_master'
  | 'vayu_master'

export interface AchievementDefinition {
  id: AchievementId
  name: string
  description: string
  icon: string // Emoji or icon name
  criteria: string // Human-readable criteria
}

// Helper type for local state (dates as Date objects)
export interface UserDocumentLocal {
  profile: Omit<UserProfile, 'createdAt' | 'lastLoginAt'> & {
    createdAt: Date
    lastLoginAt: Date
  }
  preferences: UserPreferences
  stats: Omit<UserStats, 'lastActiveDate'> & {
    lastActiveDate: Date | null
  }
  dailyGoals: Omit<DailyGoals, 'lastResetDate'> & {
    lastResetDate: Date
  }
  achievements: Array<Omit<Achievement, 'unlockedAt'> & { unlockedAt: Date }>
}

// Default values for new users
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  lang: 'deva',
  lang2: null,
  theme: 'dark',
  legendOpen: false,
  learnMode: false,
  soundEnabled: true,
}

export const DEFAULT_USER_STATS: UserStats = {
  totalLinesCompleted: 0,
  totalPuzzlesSolved: 0,
  perfectPuzzles: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  totalTimeSpentMs: 0,
}

export const DEFAULT_DAILY_GOALS: Omit<DailyGoals, 'lastResetDate'> = {
  linesTarget: 10,
  linesToday: 0,
  puzzlesTarget: 5,
  puzzlesToday: 0,
}

export const DEFAULT_STOTRA_PROGRESS: StotraProgress = {
  practice: {
    completedLines: [],
    totalRevealed: 0,
    lastPracticedAt: null,
  },
  puzzle: {
    completedLines: [],
    perfectSolves: 0,
    attempts: 0,
    hintsUsed: 0,
    lastPlayedAt: null,
  },
  reading: {
    currentLine: 0,
    furthestLine: 0,
    lastReadAt: null,
  },
}
