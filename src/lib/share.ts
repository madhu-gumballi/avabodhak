/**
 * Social Sharing Utilities
 * Enables sharing achievements, streaks, and milestones to social media
 */

import { AchievementId, AchievementDefinition } from './userTypes'
import { ACHIEVEMENTS } from './achievements'

const APP_URL = 'https://avabodhak.app'
const APP_NAME = 'Avabodhak'
const APP_HASHTAG = '#Avabodhak'

export interface ShareContent {
  title: string
  text: string
  url?: string
}

/**
 * Generate share content for an achievement
 */
export function getAchievementShareContent(achievementId: AchievementId): ShareContent {
  const achievement = ACHIEVEMENTS[achievementId]
  if (!achievement) {
    return {
      title: 'Achievement Unlocked!',
      text: `I just unlocked an achievement on ${APP_NAME}! ${APP_HASHTAG}`,
      url: APP_URL,
    }
  }

  const emoji = achievement.icon
  const shareTexts: Record<AchievementId, string> = {
    first_line: `${emoji} I just took my first steps learning Sanskrit stotras on ${APP_NAME}! Join me on this spiritual journey. ${APP_HASHTAG}`,
    first_stotra: `${emoji} I completed my first stotra on ${APP_NAME}! The journey of learning Sanskrit stotras continues. ${APP_HASHTAG}`,
    streak_7: `${emoji} 7-day streak! I've been practicing Sanskrit stotras every day for a week on ${APP_NAME}! ${APP_HASHTAG}`,
    streak_30: `${emoji} 30-day streak! A month of daily Sanskrit stotra practice on ${APP_NAME}! Consistency is key. ${APP_HASHTAG}`,
    puzzle_perfect_10: `${emoji} Puzzle Pro! I solved 10 word puzzles without hints on ${APP_NAME}! ${APP_HASHTAG}`,
    polyglot: `${emoji} I'm a Polyglot! Practicing Sanskrit stotras in 3+ scripts on ${APP_NAME}! ${APP_HASHTAG}`,
    speed_learner: `${emoji} Speed Learner! Completed 50 lines in one session on ${APP_NAME}! ${APP_HASHTAG}`,
    all_stotras: `${emoji} Complete Devotee! I completed all stotras on ${APP_NAME}! ${APP_HASHTAG}`,
    // Stotra-specific achievements
    vsn_master: `${emoji} I mastered the Vishnu Sahasranama on ${APP_NAME}! 1000+ divine names learned. ${APP_HASHTAG}`,
    hari_master: `${emoji} I completed the Hari Stuti on ${APP_NAME}! ${APP_HASHTAG}`,
    keshava_master: `${emoji} I completed the Keshava Nama on ${APP_NAME}! ${APP_HASHTAG}`,
    vayu_master: `${emoji} I completed the Vayu Stuti on ${APP_NAME}! ${APP_HASHTAG}`,
  }

  return {
    title: `${achievement.name} - Achievement Unlocked!`,
    text: shareTexts[achievementId] || `${emoji} I just unlocked "${achievement.name}" on ${APP_NAME}! ${achievement.description} ${APP_HASHTAG}`,
    url: APP_URL,
  }
}

/**
 * Generate share content for a streak milestone
 */
export function getStreakShareContent(streakCount: number): ShareContent {
  const milestones = [7, 14, 21, 30, 50, 100, 365]
  const isMilestone = milestones.includes(streakCount)

  if (isMilestone) {
    return {
      title: `${streakCount}-Day Streak!`,
      text: `I've been practicing Sanskrit stotras for ${streakCount} consecutive days on ${APP_NAME}! ${APP_HASHTAG}`,
      url: APP_URL,
    }
  }

  return {
    title: `${streakCount}-Day Streak`,
    text: `Day ${streakCount} of my Sanskrit stotra learning journey on ${APP_NAME}! ${APP_HASHTAG}`,
    url: APP_URL,
  }
}

/**
 * Generate share content for stotra completion
 */
export function getStotraCompletionShareContent(stotraName: string, mode: 'practice' | 'puzzle' | 'both'): ShareContent {
  const modeText = mode === 'both'
    ? 'all practice and puzzle modes'
    : mode === 'practice'
      ? 'practice mode'
      : 'puzzle mode'

  return {
    title: `Completed ${stotraName}!`,
    text: `I completed ${stotraName} in ${modeText} on ${APP_NAME}! ${APP_HASHTAG}`,
    url: APP_URL,
  }
}

/**
 * Share using Web Share API (mobile-friendly)
 * Returns true if shared successfully, false if not supported
 */
export async function shareNative(content: ShareContent): Promise<boolean> {
  if (!navigator.share) {
    return false
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.text,
      url: content.url,
    })
    return true
  } catch (error) {
    // User cancelled or error
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error)
    }
    return false
  }
}

/**
 * Share to Twitter/X
 */
export function shareToTwitter(content: ShareContent): void {
  const text = encodeURIComponent(content.text)
  const url = content.url ? encodeURIComponent(content.url) : ''
  const twitterUrl = `https://twitter.com/intent/tweet?text=${text}${url ? `&url=${url}` : ''}`
  window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
}

/**
 * Share to WhatsApp
 */
export function shareToWhatsApp(content: ShareContent): void {
  const text = encodeURIComponent(`${content.text}${content.url ? `\n${content.url}` : ''}`)
  const whatsappUrl = `https://wa.me/?text=${text}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
}

/**
 * Share to Facebook
 */
export function shareToFacebook(content: ShareContent): void {
  const url = content.url ? encodeURIComponent(content.url) : ''
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(content.text)}`
  window.open(facebookUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
}

/**
 * Share to LinkedIn
 */
export function shareToLinkedIn(content: ShareContent): void {
  const url = content.url ? encodeURIComponent(content.url) : ''
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  window.open(linkedInUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
}

/**
 * Copy share text to clipboard
 * Returns true if copied successfully
 */
export async function copyToClipboard(content: ShareContent): Promise<boolean> {
  const text = `${content.text}${content.url ? `\n${content.url}` : ''}`

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      console.error('Copy failed:', error)
      return false
    }
  }
}

/**
 * Check if Web Share API is available
 */
export function isNativeShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}
