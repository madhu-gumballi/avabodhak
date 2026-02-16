import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import {
  LeaderboardEntry,
  LeaderboardDocument,
  LeaderboardPeriod,
  UserDocument,
} from './userTypes'
import { getCachedUserData } from './userService'

// Local storage keys for leaderboard cache
const LEADERBOARD_CACHE_PREFIX = 'avabodhak:leaderboard:'
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface CachedLeaderboard {
  data: LeaderboardDocument
  fetchedAt: number
}

// Get the start of the current week (Sunday midnight) as ISO date string
export function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - day)
  sunday.setHours(0, 0, 0, 0)
  return sunday.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

// Get the start of the current month as ISO date string
export function getCurrentMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// Check if period stats need resetting and return current period counters.
// Returns the stats object with period counters reset to 0 if the period rolled over.
export function getOrResetPeriodStats(stats: UserDocument['stats']): UserDocument['stats'] {
  const updated = { ...stats }
  const currentWeek = getCurrentWeekStart()
  const currentMonth = getCurrentMonthStart()

  if (updated.weeklyPeriodStart !== currentWeek) {
    updated.weeklyLinesCompleted = 0
    updated.weeklyPuzzlesSolved = 0
    updated.weeklyPerfectPuzzles = 0
    updated.weeklyPeriodStart = currentWeek
  }

  if (updated.monthlyPeriodStart !== currentMonth) {
    updated.monthlyLinesCompleted = 0
    updated.monthlyPuzzlesSolved = 0
    updated.monthlyPerfectPuzzles = 0
    updated.monthlyPeriodStart = currentMonth
  }

  return updated
}

// Calculate score for a specific period
export function calculatePeriodScore(userData: UserDocument, period: LeaderboardPeriod): number {
  const stats = getOrResetPeriodStats(userData.stats)

  if (period === 'weekly') {
    return (
      (stats.weeklyLinesCompleted || 0) * 10 +
      (stats.weeklyPuzzlesSolved || 0) * 25 +
      (stats.weeklyPerfectPuzzles || 0) * 50
    )
  }

  if (period === 'monthly') {
    return (
      (stats.monthlyLinesCompleted || 0) * 10 +
      (stats.monthlyPuzzlesSolved || 0) * 25 +
      (stats.monthlyPerfectPuzzles || 0) * 50
    )
  }

  // allTime: original formula with streaks
  const {
    totalLinesCompleted,
    totalPuzzlesSolved,
    perfectPuzzles,
    currentStreak,
    longestStreak,
  } = stats

  return (
    totalLinesCompleted * 10 +
    totalPuzzlesSolved * 25 +
    perfectPuzzles * 50 +
    currentStreak * 5 +
    longestStreak * 2
  )
}

// Calculate user score based on stats (allTime, kept for backward compat)
export function calculateScore(userData: UserDocument): number {
  return calculatePeriodScore(userData, 'allTime')
}

// Get cached leaderboard from localStorage
function getCachedLeaderboard(period: LeaderboardPeriod): LeaderboardDocument | null {
  const cached = localStorage.getItem(LEADERBOARD_CACHE_PREFIX + period)
  if (!cached) return null

  try {
    const parsed: CachedLeaderboard = JSON.parse(cached)
    if (Date.now() - parsed.fetchedAt > CACHE_DURATION_MS) {
      // Cache expired
      localStorage.removeItem(LEADERBOARD_CACHE_PREFIX + period)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

// Invalidate all leaderboard caches so next fetch reads from Firestore
export function invalidateLeaderboardCache(): void {
  const periods: LeaderboardPeriod[] = ['weekly', 'monthly', 'allTime']
  for (const period of periods) {
    localStorage.removeItem(LEADERBOARD_CACHE_PREFIX + period)
  }
}

// Cache leaderboard to localStorage
function cacheLeaderboard(period: LeaderboardPeriod, data: LeaderboardDocument): void {
  const cached: CachedLeaderboard = {
    data,
    fetchedAt: Date.now(),
  }
  localStorage.setItem(LEADERBOARD_CACHE_PREFIX + period, JSON.stringify(cached))
}

// Get the expected periodStart for a given period
function getExpectedPeriodStart(period: LeaderboardPeriod): string | null {
  if (period === 'weekly') return getCurrentWeekStart()
  if (period === 'monthly') return getCurrentMonthStart()
  return null // allTime has no period filtering
}

// Get leaderboard for a specific period
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  // Check cache first
  const cached = getCachedLeaderboard(period)
  if (cached) {
    return filterStaleEntries(cached.entries, period)
  }

  if (!db || !isFirebaseConfigured) {
    // Return empty for offline/guest mode
    return []
  }

  try {
    const leaderboardRef = doc(db, 'leaderboard', period)
    const leaderboardSnap = await getDoc(leaderboardRef)

    if (leaderboardSnap.exists()) {
      const data = leaderboardSnap.data() as LeaderboardDocument
      cacheLeaderboard(period, data)
      return filterStaleEntries(data.entries, period)
    }

    return []
  } catch {
    return []
  }
}

// Filter out entries from previous periods
function filterStaleEntries(entries: LeaderboardEntry[], period: LeaderboardPeriod): LeaderboardEntry[] {
  const expected = getExpectedPeriodStart(period)
  if (!expected) return entries // allTime: no filtering

  const filtered = entries.filter((e) => e.periodStart === expected)
  // Re-rank after filtering
  return filtered.map((e, i) => ({ ...e, rank: i + 1 }))
}

// Get user's rank in leaderboard
export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod
): Promise<number | null> {
  const entries = await getLeaderboard(period)
  const entry = entries.find((e) => e.userId === userId)
  return entry?.rank ?? null
}

// Update leaderboard with user's score
// Note: In production, this would be done via a Cloud Function for security
export async function updateLeaderboardEntry(
  userId: string,
  displayName: string,
  photoURL: string | null,
  region: string | null = null
): Promise<void> {
  if (!db || !isFirebaseConfigured) return

  const userData = getCachedUserData()
  if (!userData) return

  // Update all time periods
  const periods: LeaderboardPeriod[] = ['weekly', 'monthly', 'allTime']

  for (const period of periods) {
    try {
      const score = calculatePeriodScore(userData, period)
      const periodStart = getExpectedPeriodStart(period)

      const leaderboardRef = doc(db, 'leaderboard', period)
      const leaderboardSnap = await getDoc(leaderboardRef)

      let entries: LeaderboardEntry[] = []
      if (leaderboardSnap.exists()) {
        entries = (leaderboardSnap.data() as LeaderboardDocument).entries || []
      }

      // Update or add user entry
      const existingIndex = entries.findIndex((e) => e.userId === userId)
      const newEntry: LeaderboardEntry = {
        userId,
        displayName,
        photoURL,
        region,
        score,
        rank: 0, // Will be recalculated
        periodStart,
      }

      if (existingIndex >= 0) {
        entries[existingIndex] = newEntry
      } else {
        entries.push(newEntry)
      }

      // Sort by score descending
      entries.sort((a, b) => b.score - a.score)

      // Update ranks and limit to top 100
      entries = entries.slice(0, 100).map((e, i) => ({ ...e, rank: i + 1 }))

      const updatedDoc: LeaderboardDocument = {
        entries,
        updatedAt: Timestamp.now(),
      }

      await setDoc(leaderboardRef, updatedDoc)
      cacheLeaderboard(period, updatedDoc)
    } catch {
      // Skip on error
    }
  }
}

// Get top N entries from leaderboard
export async function getTopEntries(
  period: LeaderboardPeriod,
  count: number = 10
): Promise<LeaderboardEntry[]> {
  const entries = await getLeaderboard(period)
  return entries.slice(0, count)
}

// Get entries around a specific user (for context)
export async function getEntriesAroundUser(
  userId: string,
  period: LeaderboardPeriod,
  radius: number = 2
): Promise<LeaderboardEntry[]> {
  const entries = await getLeaderboard(period)
  const userIndex = entries.findIndex((e) => e.userId === userId)

  if (userIndex === -1) {
    // User not in leaderboard, return top entries
    return entries.slice(0, radius * 2 + 1)
  }

  const start = Math.max(0, userIndex - radius)
  const end = Math.min(entries.length, userIndex + radius + 1)
  return entries.slice(start, end)
}

// Check if leaderboards need to be reset (weekly/monthly)
export function getLeaderboardResetDate(period: LeaderboardPeriod): Date {
  const now = new Date()

  switch (period) {
    case 'weekly': {
      // Reset on Sunday midnight
      const dayOfWeek = now.getDay()
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7
      const nextSunday = new Date(now)
      nextSunday.setDate(now.getDate() + daysUntilSunday)
      nextSunday.setHours(0, 0, 0, 0)
      return nextSunday
    }
    case 'monthly': {
      // Reset on 1st of next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      nextMonth.setHours(0, 0, 0, 0)
      return nextMonth
    }
    case 'allTime':
    default:
      // Never resets
      return new Date(9999, 11, 31)
  }
}

// Format time until reset
export function formatTimeUntilReset(period: LeaderboardPeriod): string {
  if (period === 'allTime') return ''

  const resetDate = getLeaderboardResetDate(period)
  const now = new Date()
  const diff = resetDate.getTime() - now.getTime()

  if (diff <= 0) return 'Resetting soon...'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}h until reset`
  }
  return `${hours}h until reset`
}
