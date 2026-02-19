import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

interface FeedbackData {
  userId: string
  displayName: string
  rating: number // 1-4
  comment: string
  createdAt: Timestamp
  userAgent: string
}

/**
 * Submit feedback: persist to Firestore + send email notification via Netlify function
 */
export async function submitFeedback(
  userId: string,
  displayName: string,
  rating: number,
  comment: string
): Promise<void> {
  if (!db) throw new Error('Firestore not configured')

  const feedbackData: FeedbackData = {
    userId,
    displayName,
    rating,
    comment,
    createdAt: Timestamp.now(),
    userAgent: navigator.userAgent,
  }

  // Persist to Firestore + send email in parallel
  await Promise.all([
    addDoc(collection(db, 'feedback'), feedbackData),
    sendFeedbackEmail(userId, displayName, rating, comment),
  ])
}

/**
 * Send feedback email notification via Netlify function
 */
async function sendFeedbackEmail(
  userId: string,
  displayName: string,
  rating: number,
  comment: string
): Promise<void> {
  try {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : ''
    await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, displayName, rating, comment }),
    })
  } catch {
    // Email notification is best-effort — don't block on failure
    console.warn('Failed to send feedback email notification')
  }
}

/**
 * Check if user has submitted feedback within the last month (throttle)
 */
export async function hasRecentFeedback(userId: string): Promise<boolean> {
  if (!db) return false

  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const q = query(
    collection(db, 'feedback'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(1)
  )

  try {
    const snapshot = await getDocs(q)
    if (snapshot.empty) return false

    const lastFeedback = snapshot.docs[0].data()
    const lastDate = lastFeedback.createdAt?.toDate?.() || new Date(0)
    return lastDate > oneMonthAgo
  } catch {
    return false
  }
}
