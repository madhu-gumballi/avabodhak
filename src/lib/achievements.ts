import {
  AchievementId,
  AchievementDefinition,
  UserDocument,
  StotraProgress,
} from './userTypes'
import { addAchievement, getCachedUserData, getAllUserProgress } from './userService'

// Achievement definitions
export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  first_line: {
    id: 'first_line',
    name: 'First Steps',
    description: 'Complete 1 line in practice mode',
    icon: '👣',
    criteria: 'Complete your first practice line',
  },
  first_stotra: {
    id: 'first_stotra',
    name: 'Devoted Learner',
    description: 'Complete all lines of any stotra',
    icon: '📜',
    criteria: 'Complete all lines in practice mode for any stotra',
  },
  streak_2: {
    id: 'streak_2',
    name: 'Getting Started',
    description: '2-day streak',
    icon: '🔥',
    criteria: 'Practice for 2 consecutive days',
  },
  streak_3: {
    id: 'streak_3',
    name: 'Three-peat',
    description: '3-day streak',
    icon: '🔥',
    criteria: 'Practice for 3 consecutive days',
  },
  streak_5: {
    id: 'streak_5',
    name: 'High Five',
    description: '5-day streak',
    icon: '🔥',
    criteria: 'Practice for 5 consecutive days',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: '🔥',
    criteria: 'Practice for 7 consecutive days',
  },
  streak_14: {
    id: 'streak_14',
    name: 'Fortnight Force',
    description: '14-day streak',
    icon: '🔥',
    criteria: 'Practice for 14 consecutive days',
  },
  streak_21: {
    id: 'streak_21',
    name: 'Habit Formed',
    description: '21-day streak',
    icon: '🔥',
    criteria: 'Practice for 21 consecutive days',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30-day streak',
    icon: '🏆',
    criteria: 'Practice for 30 consecutive days',
  },
  streak_60: {
    id: 'streak_60',
    name: 'Two-Month Titan',
    description: '60-day streak',
    icon: '🏆',
    criteria: 'Practice for 60 consecutive days',
  },
  streak_100: {
    id: 'streak_100',
    name: 'Centurion',
    description: '100-day streak',
    icon: '💎',
    criteria: 'Practice for 100 consecutive days',
  },
  puzzle_perfect_10: {
    id: 'puzzle_perfect_10',
    name: 'Puzzle Pro',
    description: '10 puzzles solved without hints',
    icon: '🧩',
    criteria: 'Solve 10 puzzles without using any hints',
  },
  polyglot: {
    id: 'polyglot',
    name: 'Polyglot',
    description: 'Practice in 3+ languages',
    icon: '🌍',
    criteria: 'Practice in at least 3 different languages',
  },
  speed_learner: {
    id: 'speed_learner',
    name: 'Speed Learner',
    description: 'Complete 50 lines in one session',
    icon: '⚡',
    criteria: 'Complete 50 lines in a single session',
  },
  all_stotras: {
    id: 'all_stotras',
    name: 'Complete Devotee',
    description: 'Complete all available stotras',
    icon: '🙏',
    criteria: 'Complete practice mode for all available stotras',
  },
  // Stotra-specific mastery badges
  vsn_master: {
    id: 'vsn_master',
    name: 'Vishnu Sahasranama Master',
    description: 'Complete all practice & puzzle for Vishnu Sahasranama',
    icon: '🙏',
    criteria: 'Complete both practice and puzzle modes for all VSN lines',
  },
  hari_master: {
    id: 'hari_master',
    name: 'Hari Stuti Master',
    description: 'Complete all practice & puzzle for Hari Stuti',
    icon: '💙',
    criteria: 'Complete both practice and puzzle modes for all Hari Stuti lines',
  },
  keshava_master: {
    id: 'keshava_master',
    name: 'Keshava Nama Master',
    description: 'Complete all practice & puzzle for Keshava Nama',
    icon: '💛',
    criteria: 'Complete both practice and puzzle modes for all Keshava Nama lines',
  },
  vayu_master: {
    id: 'vayu_master',
    name: 'Vayu Stuti Master',
    description: 'Complete all practice & puzzle for Vayu Stuti',
    icon: '💨',
    criteria: 'Complete both practice and puzzle modes for all Vayu Stuti lines',
  },
  feedback_given: {
    id: 'feedback_given',
    name: 'Voice Heard',
    description: 'Submit your first feedback',
    icon: '💬',
    criteria: 'Share your feedback about the app',
  },
}

// Get all achievement definitions
export function getAllAchievements(): AchievementDefinition[] {
  return Object.values(ACHIEVEMENTS)
}

// Get unlocked achievements
export function getUnlockedAchievements(
  userData: UserDocument
): Array<AchievementDefinition & { unlockedAt: Date }> {
  return userData.achievements.map((a) => ({
    ...ACHIEVEMENTS[a.id],
    unlockedAt: a.unlockedAt instanceof Date ? a.unlockedAt : new Date((a.unlockedAt as { seconds: number }).seconds * 1000),
  }))
}

// Get locked achievements
export function getLockedAchievements(userData: UserDocument): AchievementDefinition[] {
  const unlockedIds = new Set(userData.achievements.map((a) => a.id))
  return Object.values(ACHIEVEMENTS).filter((a) => !unlockedIds.has(a.id))
}

// Check if achievement is unlocked
export function hasAchievement(userData: UserDocument, achievementId: AchievementId): boolean {
  return userData.achievements.some((a) => a.id === achievementId)
}

// Achievement checker type
type AchievementChecker = (
  userData: UserDocument,
  progress: Record<string, StotraProgress>,
  context?: AchievementContext
) => boolean

interface AchievementContext {
  sessionLinesCompleted?: number
  languagesUsed?: Set<string>
  totalStotras?: number
  feedbackGiven?: boolean
}

// Achievement checkers
const checkers: Record<AchievementId, AchievementChecker> = {
  first_line: (userData) => {
    return userData.stats.totalLinesCompleted >= 1
  },

  first_stotra: (_, progress) => {
    // Check if any stotra has all lines completed
    // This is approximate - we'd need to know total lines per stotra
    for (const stotraProgress of Object.values(progress)) {
      const completedCount = stotraProgress.practice.completedLines?.length || 0
      // Consider stotra complete if more than 100 lines completed (VSN has 1000+)
      // In practice, this would need actual stotra line counts
      if (completedCount >= 100) {
        return true
      }
    }
    return false
  },

  streak_2: (userData) => {
    return userData.stats.currentStreak >= 2 || userData.stats.longestStreak >= 2
  },

  streak_3: (userData) => {
    return userData.stats.currentStreak >= 3 || userData.stats.longestStreak >= 3
  },

  streak_5: (userData) => {
    return userData.stats.currentStreak >= 5 || userData.stats.longestStreak >= 5
  },

  streak_7: (userData) => {
    return userData.stats.currentStreak >= 7 || userData.stats.longestStreak >= 7
  },

  streak_14: (userData) => {
    return userData.stats.currentStreak >= 14 || userData.stats.longestStreak >= 14
  },

  streak_21: (userData) => {
    return userData.stats.currentStreak >= 21 || userData.stats.longestStreak >= 21
  },

  streak_30: (userData) => {
    return userData.stats.currentStreak >= 30 || userData.stats.longestStreak >= 30
  },

  streak_60: (userData) => {
    return userData.stats.currentStreak >= 60 || userData.stats.longestStreak >= 60
  },

  streak_100: (userData) => {
    return userData.stats.currentStreak >= 100 || userData.stats.longestStreak >= 100
  },

  puzzle_perfect_10: (userData) => {
    return userData.stats.perfectPuzzles >= 10
  },

  polyglot: (_, progress) => {
    const languages = new Set<string>()
    for (const stotraId of Object.keys(progress)) {
      // stotraId format is often language-based
      const prog = progress[stotraId]
      if (prog.practice.completedLines?.length > 0) {
        languages.add(stotraId)
      }
    }
    return languages.size >= 3
  },

  speed_learner: (_, __, context) => {
    return (context?.sessionLinesCompleted || 0) >= 50
  },

  all_stotras: (_, progress, context) => {
    const totalStotras = context?.totalStotras || 4 // Default: VSN, Hari, Keshava, Vayu
    const completedStotras = Object.values(progress).filter(
      (p) => (p.practice.completedLines?.length || 0) >= 100
    ).length
    return completedStotras >= totalStotras
  },

  // Stotra-specific mastery achievements
  // These check if both practice and puzzle are complete for a stotra
  vsn_master: (_, progress) => {
    const vsnProgress = progress['vsn'] || progress['vishnu_sahasranama']
    if (!vsnProgress) return false
    const practiceComplete = (vsnProgress.practice.completedLines?.length || 0) >= 100
    const puzzleComplete = (vsnProgress.puzzle.completedLines?.length || 0) >= 100
    return practiceComplete && puzzleComplete
  },

  hari_master: (_, progress) => {
    const hariProgress = progress['hari'] || progress['hari_stuti']
    if (!hariProgress) return false
    const practiceComplete = (hariProgress.practice.completedLines?.length || 0) >= 20
    const puzzleComplete = (hariProgress.puzzle.completedLines?.length || 0) >= 20
    return practiceComplete && puzzleComplete
  },

  keshava_master: (_, progress) => {
    const keshavaProgress = progress['keshava'] || progress['keshava_nama']
    if (!keshavaProgress) return false
    const practiceComplete = (keshavaProgress.practice.completedLines?.length || 0) >= 20
    const puzzleComplete = (keshavaProgress.puzzle.completedLines?.length || 0) >= 20
    return practiceComplete && puzzleComplete
  },

  vayu_master: (_, progress) => {
    const vayuProgress = progress['vayu'] || progress['vayu_stuti']
    if (!vayuProgress) return false
    const practiceComplete = (vayuProgress.practice.completedLines?.length || 0) >= 20
    const puzzleComplete = (vayuProgress.puzzle.completedLines?.length || 0) >= 20
    return practiceComplete && puzzleComplete
  },

  feedback_given: (_, __, context) => {
    return context?.feedbackGiven === true
  },
}

// Check all achievements and return newly unlocked ones
export async function checkAchievements(
  userId: string,
  context?: AchievementContext
): Promise<AchievementId[]> {
  const userData = getCachedUserData()
  if (!userData) return []

  const progress = await getAllUserProgress(userId)
  const newlyUnlocked: AchievementId[] = []

  for (const [achievementId, checker] of Object.entries(checkers)) {
    const id = achievementId as AchievementId
    if (!hasAchievement(userData, id)) {
      try {
        if (checker(userData, progress, context)) {
          const wasAdded = await addAchievement(userId, id)
          if (wasAdded) {
            newlyUnlocked.push(id)
          }
        }
      } catch {
        // Skip on error
      }
    }
  }

  return newlyUnlocked
}

// Check specific achievement after an action
export async function checkAchievementAfterAction(
  userId: string,
  action: 'practice_complete' | 'puzzle_complete' | 'streak_update' | 'session_lines' | 'feedback_submit',
  context?: AchievementContext
): Promise<AchievementId[]> {
  const userData = getCachedUserData()
  if (!userData) return []

  const progress = await getAllUserProgress(userId)
  const newlyUnlocked: AchievementId[] = []

  // Only check relevant achievements based on action
  const toCheck: AchievementId[] = []

  switch (action) {
    case 'practice_complete':
      toCheck.push('first_line', 'first_stotra', 'polyglot', 'all_stotras')
      // Also check stotra-specific achievements
      toCheck.push('vsn_master', 'hari_master', 'keshava_master', 'vayu_master')
      break
    case 'puzzle_complete':
      toCheck.push('puzzle_perfect_10')
      // Also check stotra-specific achievements
      toCheck.push('vsn_master', 'hari_master', 'keshava_master', 'vayu_master')
      break
    case 'streak_update':
      toCheck.push('streak_2', 'streak_3', 'streak_5', 'streak_7', 'streak_14', 'streak_21', 'streak_30', 'streak_60', 'streak_100')
      break
    case 'session_lines':
      toCheck.push('speed_learner')
      break
    case 'feedback_submit':
      toCheck.push('feedback_given')
      break
  }

  for (const id of toCheck) {
    if (!hasAchievement(userData, id)) {
      try {
        if (checkers[id](userData, progress, context)) {
          const wasAdded = await addAchievement(userId, id)
          if (wasAdded) {
            newlyUnlocked.push(id)
          }
        }
      } catch {
        // Skip on error
      }
    }
  }

  return newlyUnlocked
}

// Get achievement progress (for UI display)
export function getAchievementProgress(
  userData: UserDocument,
  achievementId: AchievementId
): { current: number; target: number; percentage: number } {
  switch (achievementId) {
    case 'first_line':
      return {
        current: Math.min(userData.stats.totalLinesCompleted, 1),
        target: 1,
        percentage: userData.stats.totalLinesCompleted >= 1 ? 100 : 0,
      }
    case 'first_stotra':
      // Approximate - would need actual stotra line counts
      return {
        current: Math.min(userData.stats.totalLinesCompleted, 100),
        target: 100,
        percentage: Math.min((userData.stats.totalLinesCompleted / 100) * 100, 100),
      }
    case 'streak_2':
    case 'streak_3':
    case 'streak_5':
    case 'streak_7':
    case 'streak_14':
    case 'streak_21':
    case 'streak_30':
    case 'streak_60':
    case 'streak_100': {
      const target = parseInt(achievementId.split('_')[1])
      const best = Math.max(userData.stats.currentStreak, userData.stats.longestStreak)
      return {
        current: Math.min(best, target),
        target,
        percentage: Math.min((best / target) * 100, 100),
      }
    }
    case 'puzzle_perfect_10':
      return {
        current: Math.min(userData.stats.perfectPuzzles, 10),
        target: 10,
        percentage: Math.min((userData.stats.perfectPuzzles / 10) * 100, 100),
      }
    case 'polyglot':
      // Would need to count languages from progress
      return {
        current: 0, // Would need progress data
        target: 3,
        percentage: 0,
      }
    case 'speed_learner':
      return {
        current: 0, // Session-based, reset each session
        target: 50,
        percentage: 0,
      }
    case 'all_stotras':
      return {
        current: 0, // Would need progress data
        target: 4,
        percentage: 0,
      }
    // Stotra-specific achievements - would need progress data
    case 'vsn_master':
    case 'hari_master':
    case 'keshava_master':
    case 'vayu_master':
      return {
        current: 0, // Would need progress data
        target: 2, // Practice + Puzzle completion
        percentage: 0,
      }
    case 'feedback_given':
      return {
        current: hasAchievement(userData, 'feedback_given') ? 1 : 0,
        target: 1,
        percentage: hasAchievement(userData, 'feedback_given') ? 100 : 0,
      }
    default:
      return {
        current: 0,
        target: 1,
        percentage: 0,
      }
  }
}
