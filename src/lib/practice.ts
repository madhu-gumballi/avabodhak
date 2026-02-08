/**
 * Practice Mode Utilities
 * Handles word masking logic for memorization practice
 * Syncs progress to both localStorage (cache) and Firestore (cloud)
 */

import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
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
 * When stotraKey is provided, only reads stotra-specific key (no legacy fallback
 * to prevent cross-stotra collisions).
 */
export function getPracticeState(lang: string, lineNumber: number, stotraKey?: string): LinePracticeState | null {
  try {
    if (stotraKey) {
      const newKey = `practice:${stotraKey}:${lang}:${lineNumber}`;
      const stored = localStorage.getItem(newKey);
      if (stored) {
        const data = JSON.parse(stored) as SerializedPracticeState;
        return { ...data, revealedIndices: new Set(data.revealedIndices || []) };
      }
      return null;
    }
    // Legacy path (no stotra context)
    const legacyKey = `practice:${lang}:${lineNumber}`;
    const stored = localStorage.getItem(legacyKey);
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
export function savePracticeState(lang: string, state: LinePracticeState, stotraKey?: string): void {
  const serialized: SerializedPracticeState = {
    ...state,
    revealedIndices: Array.from(state.revealedIndices)
  };

  try {
    if (stotraKey) {
      // Use stotra-specific key only – avoids cross-stotra collisions
      const newKey = `practice:${stotraKey}:${lang}:${state.lineNumber}`;
      localStorage.setItem(newKey, JSON.stringify(serialized));
    } else {
      // Legacy path (no stotra context)
      const legacyKey = `practice:${lang}:${state.lineNumber}`;
      localStorage.setItem(legacyKey, JSON.stringify(serialized));
    }
  } catch {
    // Silent fail for localStorage issues
  }

  // Sync to Firestore in background
  syncPracticeToFirestore(lang, serialized, stotraKey);
}

/**
 * Sync practice state to Firestore
 */
async function syncPracticeToFirestore(lang: string, state: SerializedPracticeState, stotraKey?: string): Promise<void> {
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
    const docId = stotraKey ? `${stotraKey}:${lang}:${state.lineNumber}` : `${lang}:${state.lineNumber}`;
    const progressRef = doc(db, 'users', userId, 'practiceProgress', docId);

    await setDoc(progressRef, {
      ...state,
      lang,
      stotraKey: stotraKey || null,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('[Practice] Failed to sync to Firestore:', error);
  }
}

/**
 * Load practice state from Firestore (called on login/app start)
 */
export async function loadPracticeFromFirestore(lang: string, lineNumber: number, stotraKey?: string): Promise<LinePracticeState | null> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return null;

  try {
    const userId = auth.currentUser.uid;
    const docId = stotraKey ? `${stotraKey}:${lang}:${lineNumber}` : `${lang}:${lineNumber}`;
    const progressRef = doc(db, 'users', userId, 'practiceProgress', docId);
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
 * Handles both legacy 3-part keys (practice:lang:line) and
 * stotra-specific 4-part keys (practice:stotra:lang:line).
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
      let lang: string;
      let stotraKey: string | undefined;

      if (parts.length === 4) {
        // stotra-specific: practice:stotra:lang:line
        stotraKey = parts[1];
        lang = parts[2];
      } else if (parts.length === 3) {
        // legacy: practice:lang:line
        lang = parts[1];
      } else {
        continue;
      }

      const data = JSON.parse(stored) as SerializedPracticeState;
      await syncPracticeToFirestoreWithUserId(uid, lang, data, stotraKey);
    }
  } catch (error) {
    console.error('Failed to sync all practice to Firestore:', error);
  }
}

/**
 * Sync practice state to Firestore with explicit userId
 */
async function syncPracticeToFirestoreWithUserId(userId: string, lang: string, state: SerializedPracticeState, stotraKey?: string): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const docId = stotraKey ? `${stotraKey}:${lang}:${state.lineNumber}` : `${lang}:${state.lineNumber}`;
    const progressRef = doc(db, 'users', userId, 'practiceProgress', docId);

    await setDoc(progressRef, {
      ...state,
      lang,
      stotraKey: stotraKey || null,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync practice to Firestore:', error);
  }
}

/**
 * Load all practice data from Firestore and merge with localStorage
 */
export async function loadAllPracticeFromFirestore(lang: string, totalLines: number, stotraKey?: string): Promise<void> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return;

  try {
    const userId = auth.currentUser.uid;

    for (let i = 0; i < totalLines; i++) {
      const docId = stotraKey ? `${stotraKey}:${lang}:${i}` : `${lang}:${i}`;
      const progressRef = doc(db, 'users', userId, 'practiceProgress', docId);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        const cloudData = progressSnap.data() as SerializedPracticeState;
        const localState = getPracticeState(lang, i, stotraKey);

        // Merge: use cloud data if more progress, otherwise keep local
        if (!localState || (cloudData.completed && !localState.completed) ||
            cloudData.revealedIndices.length > localState.revealedIndices.size) {
          const key = stotraKey ? `practice:${stotraKey}:${lang}:${i}` : `practice:${lang}:${i}`;
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
export function clearLinePracticeState(lang: string, lineNumber: number, stotraKey?: string): void {
  try {
    if (stotraKey) {
      localStorage.removeItem(`practice:${stotraKey}:${lang}:${lineNumber}`);
    }
    localStorage.removeItem(`practice:${lang}:${lineNumber}`);
  } catch {
    // Silent fail
  }
}

/**
 * Get overall practice statistics
 */
/**
 * Get the next uncompleted practice line index
 * Returns 0 if all are completed
 */
export function getNextUncompletedPracticeLine(lang: string, totalLines: number, stotraKey?: string): number {
  try {
    for (let i = 0; i < totalLines; i++) {
      const state = getPracticeState(lang, i, stotraKey);
      if (!state || !state.completed) {
        return i;
      }
    }
  } catch {
    // Silent fail
  }
  return 0;
}

export function getPracticeStats(lang: string, totalLines: number, stotraKey?: string): {
  completedLines: number;
  totalLines: number;
  progress: number;
} {
  let completedLines = 0;

  try {
    for (let i = 0; i < totalLines; i++) {
      const state = getPracticeState(lang, i, stotraKey);
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

/**
 * Bulk-load all practice progress from Firestore into localStorage.
 * Uses a single getDocs call on the practiceProgress collection
 * instead of reading each line individually.
 */
export async function bulkLoadPracticeFromFirestore(userId: string): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const colRef = collection(db, 'users', userId, 'practiceProgress');
    const snapshot = await getDocs(colRef);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SerializedPracticeState & { lang?: string; stotraKey?: string | null };
      const lang = data.lang;
      const stotraKey = data.stotraKey;
      const lineNumber = data.lineNumber;
      if (lang == null || lineNumber == null) return;

      const key = stotraKey
        ? `practice:${stotraKey}:${lang}:${lineNumber}`
        : `practice:${lang}:${lineNumber}`;

      // Merge: use cloud data if local doesn't exist or cloud has more progress
      const existing = localStorage.getItem(key);
      if (!existing) {
        localStorage.setItem(key, JSON.stringify(data));
      } else {
        try {
          const local = JSON.parse(existing) as SerializedPracticeState;
          if (
            (data.completed && !local.completed) ||
            (data.revealedIndices?.length || 0) > (local.revealedIndices?.length || 0)
          ) {
            localStorage.setItem(key, JSON.stringify(data));
          }
        } catch {
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
    });
  } catch (error) {
    console.error('[Practice] Failed to bulk-load from Firestore:', error);
  }
}
