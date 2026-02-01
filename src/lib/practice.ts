/**
 * Practice Mode Utilities
 * Handles word masking logic for memorization practice
 * Syncs progress to both localStorage (cache) and Firestore (cloud)
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { auth } from './firebase'

/**
 * Check if a line is just a chapter/section number (should be skipped in practice)
 * Works across all languages by checking if line contains mostly digits/numbering
 */
export function isChapterOrSectionLine(line: string): boolean {
  if (!line || line.trim().length === 0) return true;

  // Remove common punctuation and spaces
  const cleaned = line.replace(/[।॥\s\-–—|\/\\\[\](){},.;:'""`]/g, '');

  // Check if it's purely numeric (works for all scripts)
  const digitPattern = /^[\d०-९০-৯૦-૯೦-೯౦-౯൦-൯०-९]+$/;
  if (digitPattern.test(cleaned)) return true;

  // Check if line is very short (< 10 chars after cleaning) and contains numbers
  if (cleaned.length < 10 && /[\d०-९০-৯૦-૯೦-೯౦-౯൦-൯०-९]/.test(cleaned)) return true;

  return false;
}

/**
 * Difficulty levels for practice mode
 * - easy: Shows first 50% of letters
 * - medium: Shows first 33% of letters
 * - hard: Shows first 25% of letters
 */
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Get visible letter count based on difficulty
 * Returns how many starting letters to show as hints
 */
export function getHintLetterCount(word: string, difficulty: PracticeDifficulty): number {
  const len = word.length;
  switch (difficulty) {
    case 'easy': return Math.ceil(len * 0.5); // Show 50%
    case 'medium': return Math.ceil(len * 0.33); // Show 33%
    case 'hard': return Math.ceil(len * 0.25); // Show 25%
    default: return Math.ceil(len * 0.33);
  }
}

/**
 * Get the masking ratio based on difficulty
 */
export function getMaskingRatio(difficulty: PracticeDifficulty): number {
  switch (difficulty) {
    case 'easy': return 0.3;
    case 'medium': return 0.5;
    case 'hard': return 0.7;
    default: return 0.5;
  }
}

/**
 * Determine if a word should be masked based on difficulty and position
 * Uses a deterministic algorithm so the same text always masks the same words
 * Prioritizes masking important words (longer words, not particles)
 */
export function shouldMaskWord(
  word: string,
  index: number,
  totalWords: number,
  difficulty: PracticeDifficulty,
  lineNumber: number
): boolean {
  const ratio = getMaskingRatio(difficulty);

  // Skip very short words (likely particles)
  if (word.length <= 1) return false;

  // Use a deterministic hash based on line number and word index
  // This ensures the same words are always masked for the same verse
  const seed = (lineNumber * 1000 + index) % 100;

  // Word importance score: longer words and middle positions are more important
  const positionWeight = Math.abs(index - totalWords / 2) / totalWords; // 0 at center, 0.5 at edges
  const lengthWeight = Math.min(word.length / 12, 1); // Normalize to 0-1, cap at 12 chars
  const importanceScore = (lengthWeight * 0.7 + (1 - positionWeight) * 0.3);

  // Adjust threshold based on importance
  const threshold = ratio * 100 * (1 + importanceScore * 0.5);

  return seed < threshold;
}

/**
 * Practice state for a specific line
 */
export interface LinePracticeState {
  lineNumber: number;
  revealedIndices: Set<number>; // Which word indices have been revealed
  totalMasked: number; // Total number of masked words
  completed: boolean; // Whether all words have been revealed
}

/**
 * Serialized practice state for storage
 */
interface SerializedPracticeState {
  lineNumber: number;
  revealedIndices: number[];
  totalMasked: number;
  completed: boolean;
}

/**
 * Get practice state from localStorage (cache)
 */
export function getPracticeState(lang: string, lineNumber: number): LinePracticeState | null {
  try {
    const key = `practice:${lang}:${lineNumber}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const data = JSON.parse(stored) as SerializedPracticeState;
    return {
      ...data,
      revealedIndices: new Set(data.revealedIndices || [])
    };
  } catch {
    return null;
  }
}

/**
 * Save practice state to localStorage and sync to Firestore
 */
export function savePracticeState(lang: string, state: LinePracticeState): void {
  const serialized: SerializedPracticeState = {
    ...state,
    revealedIndices: Array.from(state.revealedIndices)
  };

  // Save to localStorage (cache)
  try {
    const key = `practice:${lang}:${state.lineNumber}`;
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch {
    // Silent fail for localStorage issues
  }

  // Sync to Firestore in background
  syncPracticeToFirestore(lang, serialized);
}

/**
 * Sync practice state to Firestore
 */
async function syncPracticeToFirestore(lang: string, state: SerializedPracticeState): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    console.log('[Practice] Firestore not configured, skipping sync');
    return;
  }

  if (!auth?.currentUser) {
    console.log('[Practice] No authenticated user, skipping sync');
    return;
  }

  try {
    const userId = auth.currentUser.uid;
    const progressRef = doc(db, 'users', userId, 'practiceProgress', `${lang}:${state.lineNumber}`);

    console.log('[Practice] Syncing to Firestore:', `practiceProgress/${lang}:${state.lineNumber}`);

    await setDoc(progressRef, {
      ...state,
      lang,
      updatedAt: new Date(),
    }, { merge: true });

    console.log('[Practice] Sync successful');
  } catch (error) {
    console.error('[Practice] Failed to sync to Firestore:', error);
  }
}

/**
 * Load practice state from Firestore (called on login/app start)
 */
export async function loadPracticeFromFirestore(lang: string, lineNumber: number): Promise<LinePracticeState | null> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return null;

  try {
    const userId = auth.currentUser.uid;
    const progressRef = doc(db, 'users', userId, 'practiceProgress', `${lang}:${lineNumber}`);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      const data = progressSnap.data() as SerializedPracticeState;
      return {
        ...data,
        revealedIndices: new Set(data.revealedIndices || [])
      };
    }
  } catch (error) {
    console.error('Failed to load practice from Firestore:', error);
  }

  return null;
}

/**
 * Sync all localStorage practice data to Firestore
 * @param userId - Optional user ID to use instead of auth.currentUser
 */
export async function syncAllPracticeToFirestore(userId?: string): Promise<void> {
  const uid = userId || auth?.currentUser?.uid;
  if (!db || !isFirebaseConfigured || !uid) return;

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('practice:'));

    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parts = key.split(':');
      if (parts.length !== 3) continue;

      const [, lang] = parts;
      const data = JSON.parse(stored) as SerializedPracticeState;

      await syncPracticeToFirestoreWithUserId(uid, lang, data);
    }
  } catch (error) {
    console.error('Failed to sync all practice to Firestore:', error);
  }
}

/**
 * Sync practice state to Firestore with explicit userId
 */
async function syncPracticeToFirestoreWithUserId(userId: string, lang: string, state: SerializedPracticeState): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const progressRef = doc(db, 'users', userId, 'practiceProgress', `${lang}:${state.lineNumber}`);

    await setDoc(progressRef, {
      ...state,
      lang,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync practice to Firestore:', error);
  }
}

/**
 * Load all practice data from Firestore and merge with localStorage
 */
export async function loadAllPracticeFromFirestore(lang: string, totalLines: number): Promise<void> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return;

  try {
    const userId = auth.currentUser.uid;

    for (let i = 0; i < totalLines; i++) {
      const progressRef = doc(db, 'users', userId, 'practiceProgress', `${lang}:${i}`);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        const cloudData = progressSnap.data() as SerializedPracticeState;
        const localState = getPracticeState(lang, i);

        // Merge: use cloud data if more progress, otherwise keep local
        if (!localState || (cloudData.completed && !localState.completed) ||
            cloudData.revealedIndices.length > localState.revealedIndices.size) {
          const key = `practice:${lang}:${i}`;
          localStorage.setItem(key, JSON.stringify(cloudData));
        }
      }
    }
  } catch (error) {
    console.error('Failed to load practice from Firestore:', error);
  }
}

/**
 * Clear practice state for a line
 */
export function clearLinePracticeState(lang: string, lineNumber: number): void {
  try {
    const key = `practice:${lang}:${lineNumber}`;
    localStorage.removeItem(key);
  } catch {
    // Silent fail
  }
}

/**
 * Get overall practice statistics
 */
export function getPracticeStats(lang: string, totalLines: number): {
  completedLines: number;
  totalLines: number;
  progress: number;
} {
  let completedLines = 0;

  try {
    for (let i = 0; i < totalLines; i++) {
      const state = getPracticeState(lang, i);
      if (state && state.completed) {
        completedLines++;
      }
    }
  } catch {
    // Silent fail
  }

  return {
    completedLines,
    totalLines,
    progress: totalLines > 0 ? completedLines / totalLines : 0
  };
}
