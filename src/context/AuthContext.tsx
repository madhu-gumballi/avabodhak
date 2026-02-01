import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'
import {
  UserDocument,
  UserStats,
  DailyGoals,
  UserPreferences,
  AchievementId,
} from '../lib/userTypes'
import {
  getUserDocument,
  isGuestMode,
  setGuestMode,
  isFirstVisit,
  getCachedUserData,
  cacheUserData,
  updateUserPreferences,
  updateUserStats,
  updateDailyGoals,
  updateStreak,
  migrateLocalStorageToFirestore,
  checkAndResetDailyGoals,
  incrementDailyLines,
  incrementDailyPuzzles,
  startSession,
  endSession,
} from '../lib/userService'
import { checkAchievementAfterAction, ACHIEVEMENTS } from '../lib/achievements'
import { updateLeaderboardEntry } from '../lib/leaderboard'
import { syncAllPracticeToFirestore } from '../lib/practice'
import { syncAllPuzzleToFirestore } from '../lib/puzzle'

interface AuthContextType {
  // Auth state
  user: User | null
  userData: UserDocument | null
  loading: boolean
  isGuest: boolean
  showLoginPrompt: boolean

  // Auth actions
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  continueAsGuest: () => void
  dismissLoginPrompt: () => void

  // User data actions
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>
  updateStats: (stats: Partial<UserStats>) => Promise<void>
  updateGoals: (goals: Partial<DailyGoals>) => Promise<void>
  refreshUserData: () => Promise<void>

  // Gamification actions
  recordLineComplete: () => Promise<AchievementId[]>
  recordPuzzleComplete: (perfect: boolean) => Promise<AchievementId[]>
  recordActivity: () => Promise<{ streak: number }>

  // Achievement state
  newAchievement: AchievementId | null
  clearNewAchievement: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [newAchievement, setNewAchievement] = useState<AchievementId | null>(null)

  // Initialize auth state
  useEffect(() => {
    // Check if first visit
    if (isFirstVisit()) {
      setShowLoginPrompt(true)
    }

    // Check guest mode
    if (isGuestMode()) {
      setIsGuest(true)
      const cached = getCachedUserData()
      if (cached) {
        setUserData(cached)
      }
      setLoading(false)
      return
    }

    // Listen to auth state if Firebase is configured
    if (!auth || !isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          // Get or create user document
          const userDoc = await getUserDocument(firebaseUser)
          setUserData(userDoc)

          // Migrate localStorage data if needed
          await migrateLocalStorageToFirestore(firebaseUser.uid)

          // Sync practice and puzzle progress to Firestore
          await syncAllPracticeToFirestore(firebaseUser.uid)
          await syncAllPuzzleToFirestore(firebaseUser.uid)

          // Check and reset daily goals
          await checkAndResetDailyGoals(firebaseUser.uid)

          // Start session tracking
          startSession()
        } catch (error) {
          console.error('Error loading user data:', error)
          // Fall back to cached data
          const cached = getCachedUserData()
          if (cached) {
            setUserData(cached)
          }
        }
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    if (!auth || !isFirebaseConfigured) {
      console.error('Firebase not configured')
      return
    }

    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      setIsGuest(false)
      setGuestMode(false)
      setShowLoginPrompt(false)

      // Get user document
      const userDoc = await getUserDocument(result.user)
      setUserData(userDoc)

      // Migrate localStorage data
      await migrateLocalStorageToFirestore(result.user.uid)

      // Sync practice and puzzle progress to Firestore
      await syncAllPracticeToFirestore(result.user.uid)
      await syncAllPuzzleToFirestore(result.user.uid)

      // Start session
      startSession()
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    if (user) {
      // End session tracking
      await endSession(user.uid)
    }

    if (auth) {
      await firebaseSignOut(auth)
    }

    setUser(null)
    setUserData(null)
    setIsGuest(false)
    setGuestMode(false)
    // Clear cache but keep progress data
    localStorage.removeItem('avabodhak:user')
  }, [user])

  // Continue as guest
  const continueAsGuest = useCallback(() => {
    setGuestMode(true)
    setIsGuest(true)
    setShowLoginPrompt(false)

    // Create guest user data
    const guestData: UserDocument = {
      profile: {
        displayName: 'Guest',
        email: '',
        photoURL: null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      },
      preferences: {
        lang: 'deva',
        lang2: null,
        theme: 'dark',
        legendOpen: false,
        learnMode: false,
      },
      stats: {
        totalLinesCompleted: 0,
        totalPuzzlesSolved: 0,
        perfectPuzzles: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        totalTimeSpentMs: 0,
      },
      dailyGoals: {
        linesTarget: 10,
        linesToday: 0,
        puzzlesTarget: 5,
        puzzlesToday: 0,
        lastResetDate: new Date(),
      },
      achievements: [],
    }

    cacheUserData(guestData)
    setUserData(guestData)
    startSession()
  }, [])

  // Dismiss login prompt
  const dismissLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false)
  }, [])

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      const userId = user?.uid || 'guest'
      await updateUserPreferences(userId, prefs)

      // Update local state
      if (userData) {
        const updated = {
          ...userData,
          preferences: { ...userData.preferences, ...prefs },
        }
        setUserData(updated)
        cacheUserData(updated)
      }
    },
    [user, userData]
  )

  // Update stats
  const updateStats = useCallback(
    async (stats: Partial<UserStats>) => {
      const userId = user?.uid || 'guest'
      await updateUserStats(userId, stats)

      // Update local state
      if (userData) {
        const updated = {
          ...userData,
          stats: { ...userData.stats, ...stats },
        }
        setUserData(updated)
        cacheUserData(updated)
      }
    },
    [user, userData]
  )

  // Update goals
  const updateGoals = useCallback(
    async (goals: Partial<DailyGoals>) => {
      const userId = user?.uid || 'guest'
      await updateDailyGoals(userId, goals)

      // Update local state
      if (userData) {
        const updated = {
          ...userData,
          dailyGoals: { ...userData.dailyGoals, ...goals },
        }
        setUserData(updated)
        cacheUserData(updated)
      }
    },
    [user, userData]
  )

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (user) {
      const userDoc = await getUserDocument(user)
      setUserData(userDoc)
    } else {
      const cached = getCachedUserData()
      if (cached) {
        setUserData(cached)
      }
    }
  }, [user])

  // Record line completion
  const recordLineComplete = useCallback(async (): Promise<AchievementId[]> => {
    const userId = user?.uid || 'guest'

    // Update stats
    const newTotal = (userData?.stats.totalLinesCompleted || 0) + 1
    await updateStats({ totalLinesCompleted: newTotal })

    // Update daily goals
    await incrementDailyLines(userId)

    // Refresh local state
    await refreshUserData()

    // Check achievements
    const newAchievements = await checkAchievementAfterAction(userId, 'practice_complete')
    if (newAchievements.length > 0) {
      setNewAchievement(newAchievements[0])
      await refreshUserData()
    }

    // Update leaderboard
    if (user && userData) {
      await updateLeaderboardEntry(
        user.uid,
        userData.profile.displayName,
        userData.profile.photoURL
      )
    }

    return newAchievements
  }, [user, userData, updateStats, refreshUserData])

  // Record puzzle completion
  const recordPuzzleComplete = useCallback(
    async (perfect: boolean): Promise<AchievementId[]> => {
      const userId = user?.uid || 'guest'

      // Update stats
      const updates: Partial<UserStats> = {
        totalPuzzlesSolved: (userData?.stats.totalPuzzlesSolved || 0) + 1,
      }
      if (perfect) {
        updates.perfectPuzzles = (userData?.stats.perfectPuzzles || 0) + 1
      }
      await updateStats(updates)

      // Update daily goals
      await incrementDailyPuzzles(userId)

      // Refresh local state
      await refreshUserData()

      // Check achievements
      const newAchievements = await checkAchievementAfterAction(userId, 'puzzle_complete')
      if (newAchievements.length > 0) {
        setNewAchievement(newAchievements[0])
        await refreshUserData()
      }

      // Update leaderboard
      if (user && userData) {
        await updateLeaderboardEntry(
          user.uid,
          userData.profile.displayName,
          userData.profile.photoURL
        )
      }

      return newAchievements
    },
    [user, userData, updateStats, refreshUserData]
  )

  // Record activity (for streak tracking)
  const recordActivity = useCallback(async (): Promise<{ streak: number }> => {
    const userId = user?.uid || 'guest'
    const { current } = await updateStreak(userId)

    // Check streak achievements
    const newAchievements = await checkAchievementAfterAction(userId, 'streak_update')
    if (newAchievements.length > 0) {
      setNewAchievement(newAchievements[0])
    }

    await refreshUserData()
    return { streak: current }
  }, [user, refreshUserData])

  // Clear new achievement notification
  const clearNewAchievement = useCallback(() => {
    setNewAchievement(null)
  }, [])

  const value: AuthContextType = {
    user,
    userData,
    loading,
    isGuest,
    showLoginPrompt,
    signInWithGoogle,
    signOut,
    continueAsGuest,
    dismissLoginPrompt,
    updatePreferences,
    updateStats,
    updateGoals,
    refreshUserData,
    recordLineComplete,
    recordPuzzleComplete,
    recordActivity,
    newAchievement,
    clearNewAchievement,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
