import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  Timestamp,
  serverTimestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db, isFirebaseConfigured } from './firebase'
import {
  UserDocument,
  UserProfile,
  UserPreferences,
  UserStats,
  DailyGoals,
  Achievement,
  StotraProgress,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_USER_STATS,
  DEFAULT_DAILY_GOALS,
  DEFAULT_STOTRA_PROGRESS,
  AchievementId,
} from './userTypes'

// Local storage keys for guest mode and caching
const STORAGE_KEYS = {
  USER_DATA: 'avabodhak:user',
  GUEST_MODE: 'avabodhak:guest',
  MIGRATED: 'avabodhak:migrated',
  SESSION_START: 'avabodhak:sessionStart',
}

// Check if user is in guest mode
export function isGuestMode(): boolean {
  return localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true'
}

// Set guest mode
export function setGuestMode(guest: boolean): void {
  if (guest) {
    localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true')
  } else {
    localStorage.removeItem(STORAGE_KEYS.GUEST_MODE)
  }
}

// Check if first visit
export function isFirstVisit(): boolean {
  return (
    !localStorage.getItem(STORAGE_KEYS.USER_DATA) &&
    !localStorage.getItem(STORAGE_KEYS.GUEST_MODE) &&
    !localStorage.getItem('ui:onboarded:v1')
  )
}

// Get cached user data from localStorage
export function getCachedUserData(): UserDocument | null {
  const cached = localStorage.getItem(STORAGE_KEYS.USER_DATA)
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    return null
  }
}

// Cache user data to localStorage
export function cacheUserData(data: UserDocument): void {
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data))
}

// Create a new user document
export async function createUserDocument(user: User): Promise<UserDocument> {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firebase not configured')
  }

  const now = Timestamp.now()
  const userData: UserDocument = {
    profile: {
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL,
      createdAt: now,
      lastLoginAt: now,
    },
    preferences: DEFAULT_USER_PREFERENCES,
    stats: DEFAULT_USER_STATS,
    dailyGoals: {
      ...DEFAULT_DAILY_GOALS,
      lastResetDate: now,
    },
    achievements: [],
  }

  const userRef = doc(db, 'users', user.uid)
  await setDoc(userRef, userData)
  cacheUserData(userData)
  return userData
}

// Get user document, creating if doesn't exist
export async function getUserDocument(user: User): Promise<UserDocument> {
  if (!db || !isFirebaseConfigured) {
    // Return cached data or defaults for offline/guest mode
    const cached = getCachedUserData()
    if (cached) return cached

    const now = new Date()
    return {
      profile: {
        displayName: user.displayName || 'Guest',
        email: user.email || '',
        photoURL: user.photoURL,
        createdAt: now,
        lastLoginAt: now,
      },
      preferences: DEFAULT_USER_PREFERENCES,
      stats: DEFAULT_USER_STATS,
      dailyGoals: {
        ...DEFAULT_DAILY_GOALS,
        lastResetDate: now,
      },
      achievements: [],
    }
  }

  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    const data = userSnap.data() as UserDocument
    // Update last login
    await updateDoc(userRef, {
      'profile.lastLoginAt': serverTimestamp(),
    })
    cacheUserData(data)
    return data
  }

  // Create new user
  return createUserDocument(user)
}

// Update user preferences
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    // Update local cache only
    const cached = getCachedUserData()
    if (cached) {
      cached.preferences = { ...cached.preferences, ...preferences }
      cacheUserData(cached)
    }
    return
  }

  const userRef = doc(db, 'users', userId)
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(preferences)) {
    updates[`preferences.${key}`] = value
  }
  await updateDoc(userRef, updates)

  // Update local cache
  const cached = getCachedUserData()
  if (cached) {
    cached.preferences = { ...cached.preferences, ...preferences }
    cacheUserData(cached)
  }
}

// Update user stats
export async function updateUserStats(
  userId: string,
  stats: Partial<UserStats>
): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    const cached = getCachedUserData()
    if (cached) {
      cached.stats = { ...cached.stats, ...stats }
      cacheUserData(cached)
    }
    return
  }

  const userRef = doc(db, 'users', userId)
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(stats)) {
    updates[`stats.${key}`] = value
  }
  await updateDoc(userRef, updates)

  const cached = getCachedUserData()
  if (cached) {
    cached.stats = { ...cached.stats, ...stats }
    cacheUserData(cached)
  }
}

// Update daily goals
export async function updateDailyGoals(
  userId: string,
  goals: Partial<DailyGoals>
): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    const cached = getCachedUserData()
    if (cached) {
      cached.dailyGoals = { ...cached.dailyGoals, ...goals }
      cacheUserData(cached)
    }
    return
  }

  const userRef = doc(db, 'users', userId)
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(goals)) {
    updates[`dailyGoals.${key}`] = value
  }
  await updateDoc(userRef, updates)

  const cached = getCachedUserData()
  if (cached) {
    cached.dailyGoals = { ...cached.dailyGoals, ...goals }
    cacheUserData(cached)
  }
}

// Check and reset daily goals if needed (at midnight)
export async function checkAndResetDailyGoals(userId: string): Promise<DailyGoals | null> {
  const cached = getCachedUserData()
  if (!cached) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let lastReset: Date
  const lr = cached.dailyGoals.lastResetDate
  if (lr instanceof Date) {
    lastReset = lr
  } else if (lr && typeof lr === 'object' && 'seconds' in lr) {
    lastReset = new Date((lr as Timestamp).seconds * 1000)
  } else {
    lastReset = new Date(0)
  }
  lastReset.setHours(0, 0, 0, 0)

  if (lastReset < today) {
    // Reset daily progress
    const newGoals: DailyGoals = {
      ...cached.dailyGoals,
      linesToday: 0,
      puzzlesToday: 0,
      lastResetDate: today,
    }
    await updateDailyGoals(userId, newGoals)
    return newGoals
  }

  return cached.dailyGoals
}

// Increment daily line count
export async function incrementDailyLines(userId: string): Promise<void> {
  const cached = getCachedUserData()
  if (!cached) return

  await checkAndResetDailyGoals(userId)
  const newCount = (cached.dailyGoals.linesToday || 0) + 1
  await updateDailyGoals(userId, { linesToday: newCount })
}

// Increment daily puzzle count
export async function incrementDailyPuzzles(userId: string): Promise<void> {
  const cached = getCachedUserData()
  if (!cached) return

  await checkAndResetDailyGoals(userId)
  const newCount = (cached.dailyGoals.puzzlesToday || 0) + 1
  await updateDailyGoals(userId, { puzzlesToday: newCount })
}

// Add achievement
export async function addAchievement(
  userId: string,
  achievementId: AchievementId
): Promise<boolean> {
  const cached = getCachedUserData()
  if (!cached) return false

  // Check if already unlocked
  if (cached.achievements.some((a) => a.id === achievementId)) {
    return false
  }

  const newAchievement: Achievement = {
    id: achievementId,
    unlockedAt: new Date(),
  }

  if (db && isFirebaseConfigured) {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      achievements: [...cached.achievements, newAchievement],
    })
  }

  cached.achievements.push(newAchievement)
  cacheUserData(cached)
  return true
}

// Get stotra progress
export async function getStotraProgress(
  userId: string,
  stotraId: string
): Promise<StotraProgress> {
  if (!db || !isFirebaseConfigured) {
    // Return from localStorage
    const key = `progress:${stotraId}`
    const cached = localStorage.getItem(key)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return DEFAULT_STOTRA_PROGRESS
      }
    }
    return DEFAULT_STOTRA_PROGRESS
  }

  const progressRef = doc(db, 'users', userId, 'progress', stotraId)
  const progressSnap = await getDoc(progressRef)

  if (progressSnap.exists()) {
    return progressSnap.data() as StotraProgress
  }

  return DEFAULT_STOTRA_PROGRESS
}

// Update stotra progress
export async function updateStotraProgress(
  userId: string,
  stotraId: string,
  progress: Partial<StotraProgress>
): Promise<void> {
  // Always save to localStorage
  const key = `progress:${stotraId}`
  const existing = localStorage.getItem(key)
  let current: StotraProgress = DEFAULT_STOTRA_PROGRESS
  if (existing) {
    try {
      current = JSON.parse(existing)
    } catch {
      // Use default
    }
  }
  const merged = {
    practice: { ...current.practice, ...progress.practice },
    puzzle: { ...current.puzzle, ...progress.puzzle },
    reading: { ...current.reading, ...progress.reading },
  }
  localStorage.setItem(key, JSON.stringify(merged))

  if (!db || !isFirebaseConfigured) return

  const progressRef = doc(db, 'users', userId, 'progress', stotraId)
  const progressSnap = await getDoc(progressRef)

  if (progressSnap.exists()) {
    await updateDoc(progressRef, progress as Record<string, unknown>)
  } else {
    await setDoc(progressRef, { ...DEFAULT_STOTRA_PROGRESS, ...progress })
  }
}

// Update streak
export async function updateStreak(userId: string): Promise<{ current: number; longest: number }> {
  const cached = getCachedUserData()
  if (!cached) return { current: 0, longest: 0 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let lastActive: Date | null = null
  const la = cached.stats.lastActiveDate
  if (la instanceof Date) {
    lastActive = la
  } else if (la && typeof la === 'object' && 'seconds' in la) {
    lastActive = new Date((la as Timestamp).seconds * 1000)
  }

  let currentStreak = cached.stats.currentStreak
  let longestStreak = cached.stats.longestStreak

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0)
    const dayDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

    if (dayDiff === 0) {
      // Same day, no change
    } else if (dayDiff === 1) {
      // Consecutive day, increment streak
      currentStreak += 1
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
      }
    } else {
      // Streak broken
      currentStreak = 1
    }
  } else {
    // First activity
    currentStreak = 1
    longestStreak = 1
  }

  await updateUserStats(userId, {
    currentStreak,
    longestStreak,
    lastActiveDate: today,
  })

  return { current: currentStreak, longest: longestStreak }
}

// Migrate localStorage data to Firestore on first login
export async function migrateLocalStorageToFirestore(userId: string): Promise<void> {
  if (!db || !isFirebaseConfigured) return

  const migratedKey = `${STORAGE_KEYS.MIGRATED}:${userId}`
  if (localStorage.getItem(migratedKey)) return

  const batch = writeBatch(db)

  // Migrate practice progress
  const practiceKeys = Object.keys(localStorage).filter((k) => k.startsWith('practice:'))
  const puzzleKeys = Object.keys(localStorage).filter((k) => k.startsWith('puzzle:'))

  // Group by stotra
  const stotraProgress: Record<string, Partial<StotraProgress>> = {}

  for (const key of practiceKeys) {
    const parts = key.split(':')
    if (parts.length === 3) {
      const [, lang, lineNum] = parts
      const stotraId = lang // Use language as stotra identifier for now
      if (!stotraProgress[stotraId]) {
        stotraProgress[stotraId] = {
          practice: { completedLines: [], totalRevealed: 0, lastPracticedAt: null },
        }
      }
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          if (parsed.completed) {
            stotraProgress[stotraId].practice!.completedLines!.push(parseInt(lineNum))
          }
          stotraProgress[stotraId].practice!.totalRevealed! += parsed.revealedIndices?.length || 0
        } catch {
          // Skip invalid data
        }
      }
    }
  }

  for (const key of puzzleKeys) {
    const parts = key.split(':')
    if (parts.length === 3) {
      const [, lang, lineNum] = parts
      const stotraId = lang
      if (!stotraProgress[stotraId]) {
        stotraProgress[stotraId] = {
          puzzle: { completedLines: [], perfectSolves: 0, attempts: 0, hintsUsed: 0, lastPlayedAt: null },
        }
      }
      if (!stotraProgress[stotraId].puzzle) {
        stotraProgress[stotraId].puzzle = {
          completedLines: [],
          perfectSolves: 0,
          attempts: 0,
          hintsUsed: 0,
          lastPlayedAt: null,
        }
      }
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          if (parsed.completed) {
            stotraProgress[stotraId].puzzle!.completedLines!.push(parseInt(lineNum))
            if (parsed.hintsUsed === 0) {
              stotraProgress[stotraId].puzzle!.perfectSolves! += 1
            }
          }
          stotraProgress[stotraId].puzzle!.attempts! += parsed.attempts || 0
          stotraProgress[stotraId].puzzle!.hintsUsed! += parsed.hintsUsed || 0
        } catch {
          // Skip invalid data
        }
      }
    }
  }

  // Write progress to Firestore
  for (const [stotraId, progress] of Object.entries(stotraProgress)) {
    const progressRef = doc(db, 'users', userId, 'progress', stotraId)
    batch.set(progressRef, { ...DEFAULT_STOTRA_PROGRESS, ...progress }, { merge: true })
  }

  // Calculate aggregate stats
  let totalLines = 0
  let totalPuzzles = 0
  let perfectPuzzles = 0

  for (const progress of Object.values(stotraProgress)) {
    totalLines += progress.practice?.completedLines?.length || 0
    totalPuzzles += progress.puzzle?.completedLines?.length || 0
    perfectPuzzles += progress.puzzle?.perfectSolves || 0
  }

  // Update user stats
  const userRef = doc(db, 'users', userId)
  batch.update(userRef, {
    'stats.totalLinesCompleted': totalLines,
    'stats.totalPuzzlesSolved': totalPuzzles,
    'stats.perfectPuzzles': perfectPuzzles,
  })

  await batch.commit()
  localStorage.setItem(migratedKey, 'true')
}

// Track session time
export function startSession(): void {
  localStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString())
}

export async function endSession(userId: string): Promise<void> {
  const startStr = localStorage.getItem(STORAGE_KEYS.SESSION_START)
  if (!startStr) return

  const start = parseInt(startStr)
  const duration = Date.now() - start

  const cached = getCachedUserData()
  if (cached) {
    const newTotal = (cached.stats.totalTimeSpentMs || 0) + duration
    await updateUserStats(userId, { totalTimeSpentMs: newTotal })
  }

  localStorage.removeItem(STORAGE_KEYS.SESSION_START)
}

// Get all progress for a user (for leaderboard calculations)
export async function getAllUserProgress(userId: string): Promise<Record<string, StotraProgress>> {
  if (!db || !isFirebaseConfigured) {
    // Get from localStorage
    const result: Record<string, StotraProgress> = {}
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('progress:'))
    for (const key of keys) {
      const stotraId = key.replace('progress:', '')
      const data = localStorage.getItem(key)
      if (data) {
        try {
          result[stotraId] = JSON.parse(data)
        } catch {
          // Skip
        }
      }
    }
    return result
  }

  const progressRef = collection(db, 'users', userId, 'progress')
  const snapshot = await getDocs(progressRef)
  const result: Record<string, StotraProgress> = {}
  snapshot.forEach((doc) => {
    result[doc.id] = doc.data() as StotraProgress
  })
  return result
}
