/**
 * Puzzle Mode Utilities
 * Handles word scrambling and validation for puzzle mode
 * Syncs progress to both localStorage (cache) and Firestore (cloud)
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { auth } from './firebase'
import { basicSplit } from './tokenize';
import { isChapterOrSectionLine } from './practice';

export type PuzzleSegment = {
  id: string;
  text: string;
  originalIndex: number;
};

export type PuzzleState = {
  lineNumber: number;
  scrambledSegments: PuzzleSegment[];
  userArrangement: (PuzzleSegment | null)[];
  completed: boolean;
  attempts: number;
  hintsUsed: number;
  startTime: number;
  completionTime?: number;
};

export type HintLevel = 'none' | 'first' | 'last' | 'both' | 'half';

/**
 * Scramble text into segments (words) and randomize their order
 */
export function scrambleSegments(text: string): PuzzleSegment[] {
  const words = basicSplit(text);
  const segments: PuzzleSegment[] = words.map((word, index) => ({
    id: `seg-${index}-${Math.random().toString(36).substr(2, 9)}`,
    text: word,
    originalIndex: index,
  }));

  // Fisher-Yates shuffle
  const scrambled = [...segments];
  for (let i = scrambled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
  }

  return scrambled;
}

/**
 * Validate if the user's arrangement matches the correct order
 */
export function validateArrangement(
  userArrangement: (PuzzleSegment | null)[],
  correctSegments: PuzzleSegment[]
): boolean {
  // Check if all positions are filled
  if (userArrangement.some(seg => seg === null)) {
    return false;
  }

  // Check if arrangement matches correct order
  // Allow identical duplicate words to be interchangeable by comparing text
  return userArrangement.every((seg, index) => {
    if (seg === null) return false;
    return seg.text === correctSegments[index].text;
  });
}

/**
 * Calculate partial correctness (for progress indication)
 */
export function getCorrectPositions(
  userArrangement: (PuzzleSegment | null)[],
  correctSegments: PuzzleSegment[]
): number {
  let correct = 0;
  const maxLen = Math.min(userArrangement.length, correctSegments.length);
  for (let i = 0; i < maxLen; i++) {
    if (
      userArrangement[i] !== null &&
      correctSegments[i] !== undefined &&
      userArrangement[i]!.text === correctSegments[i].text
    ) {
      correct++;
    }
  }
  return correct;
}

/**
 * Apply hint to user arrangement - Progressive hint system
 * Total hints = min(4, max(0, n-1)) where n = number of words
 * Progressively reveals words from the beginning
 */
export function applyHint(
  correctSegments: PuzzleSegment[],
  userArrangement: (PuzzleSegment | null)[],
  hintsUsed: number,
  availableSegments: PuzzleSegment[]
): {
  newArrangement: (PuzzleSegment | null)[];
  newAvailable: PuzzleSegment[];
  wordsRevealed: number;
} {
  const newArrangement = [...userArrangement];
  const newAvailable = [...availableSegments];
  let wordsRevealed = 0;

  // Helper function to place a segment
  const placeSegment = (index: number) => {
    const segment = correctSegments[index];
    // Only place if not already placed
    if (
      newArrangement[index] === null ||
      newArrangement[index]!.text !== segment.text
    ) {
      newArrangement[index] = segment;
      // Remove a matching text segment from available (supports duplicates)
      const idx = newAvailable.findIndex(s => s.text === segment.text);
      if (idx !== -1) {
        newAvailable.splice(idx, 1);
        wordsRevealed++;
      }
    }
  };

  // Each hint reveals one more word from the beginning
  // Total words to reveal = hintsUsed (but never more than n-1)
  const maxHints = Math.min(4, Math.max(0, correctSegments.length - 1));
  const wordsToPlace = Math.min(hintsUsed, maxHints);

  for (let i = 0; i < wordsToPlace; i++) {
    placeSegment(i);
  }

  return { newArrangement, newAvailable, wordsRevealed };
}

/**
 * Get maximum hints allowed for a puzzle
 */
export function getMaxHints(wordCount: number): number {
  return Math.min(4, Math.max(0, wordCount - 1));
}

/**
 * Save puzzle state to localStorage and sync to Firestore
 */
export function savePuzzleState(lang: string, state: PuzzleState): void {
  // Save to localStorage (cache)
  try {
    const key = `puzzle:${lang}:${state.lineNumber}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Silent fail for localStorage issues
  }

  // Sync to Firestore in background
  syncPuzzleToFirestore(lang, state);
}

/**
 * Sync puzzle state to Firestore
 */
async function syncPuzzleToFirestore(lang: string, state: PuzzleState): Promise<void> {
  if (!db || !isFirebaseConfigured) {
    console.log('[Puzzle] Firestore not configured, skipping sync');
    return;
  }

  if (!auth?.currentUser) {
    console.log('[Puzzle] No authenticated user, skipping sync');
    return;
  }

  try {
    const userId = auth.currentUser.uid;
    const progressRef = doc(db, 'users', userId, 'puzzleProgress', `${lang}:${state.lineNumber}`);

    console.log('[Puzzle] Syncing to Firestore:', `puzzleProgress/${lang}:${state.lineNumber}`);

    await setDoc(progressRef, {
      ...state,
      lang,
      updatedAt: new Date(),
    }, { merge: true });

    console.log('[Puzzle] Sync successful');
  } catch (error) {
    console.error('[Puzzle] Failed to sync to Firestore:', error);
  }
}

/**
 * Get puzzle state from localStorage (cache)
 */
export function getPuzzleState(lang: string, lineNumber: number): PuzzleState | null {
  try {
    const key = `puzzle:${lang}:${lineNumber}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Load puzzle state from Firestore
 */
export async function loadPuzzleFromFirestore(lang: string, lineNumber: number): Promise<PuzzleState | null> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return null;

  try {
    const userId = auth.currentUser.uid;
    const progressRef = doc(db, 'users', userId, 'puzzleProgress', `${lang}:${lineNumber}`);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      return progressSnap.data() as PuzzleState;
    }
  } catch (error) {
    console.error('Failed to load puzzle from Firestore:', error);
  }

  return null;
}

/**
 * Sync all localStorage puzzle data to Firestore
 * @param userId - Optional user ID to use instead of auth.currentUser
 */
export async function syncAllPuzzleToFirestore(userId?: string): Promise<void> {
  const uid = userId || auth?.currentUser?.uid;
  if (!db || !isFirebaseConfigured || !uid) return;

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('puzzle:'));

    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parts = key.split(':');
      if (parts.length !== 3) continue;

      const [, lang] = parts;
      const data = JSON.parse(stored) as PuzzleState;

      await syncPuzzleToFirestoreWithUserId(uid, lang, data);
    }
  } catch (error) {
    console.error('Failed to sync all puzzle to Firestore:', error);
  }
}

/**
 * Sync puzzle state to Firestore with explicit userId
 */
async function syncPuzzleToFirestoreWithUserId(userId: string, lang: string, state: PuzzleState): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const progressRef = doc(db, 'users', userId, 'puzzleProgress', `${lang}:${state.lineNumber}`);

    await setDoc(progressRef, {
      ...state,
      lang,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync puzzle to Firestore:', error);
  }
}

/**
 * Load all puzzle data from Firestore and merge with localStorage
 */
export async function loadAllPuzzleFromFirestore(lang: string, totalLines: number): Promise<void> {
  if (!db || !isFirebaseConfigured || !auth?.currentUser) return;

  try {
    const userId = auth.currentUser.uid;

    for (let i = 0; i < totalLines; i++) {
      const progressRef = doc(db, 'users', userId, 'puzzleProgress', `${lang}:${i}`);
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        const cloudData = progressSnap.data() as PuzzleState;
        const localState = getPuzzleState(lang, i);

        // Merge: use cloud data if more progress, otherwise keep local
        if (!localState || (cloudData.completed && !localState.completed)) {
          const key = `puzzle:${lang}:${i}`;
          localStorage.setItem(key, JSON.stringify(cloudData));
        }
      }
    }
  } catch (error) {
    console.error('Failed to load puzzle from Firestore:', error);
  }
}

/**
 * Clear puzzle state for a specific line
 */
export function clearPuzzleState(lang: string, lineNumber: number): void {
  try {
    const key = `puzzle:${lang}:${lineNumber}`;
    localStorage.removeItem(key);
  } catch {
    // Silent fail
  }
}

/**
 * Get puzzle statistics
 */
export function getPuzzleStats(lang: string, totalLines: number): {
  completed: number;
  totalAttempts: number;
  averageHints: number;
  averageTime: number;
  progress: number; // 0-100 percentage
} {
  let completed = 0;
  let totalAttempts = 0;
  let totalHints = 0;
  let totalTime = 0;

  try {
    for (let i = 0; i < totalLines; i++) {
      const state = getPuzzleState(lang, i);
      if (state && state.completed) {
        completed++;
        totalAttempts += state.attempts;
        totalHints += state.hintsUsed;
        if (state.completionTime) {
          totalTime += state.completionTime - state.startTime;
        }
      }
    }
  } catch {
    // Silent fail
  }

  return {
    completed,
    totalAttempts,
    averageHints: completed > 0 ? totalHints / completed : 0,
    averageTime: completed > 0 ? totalTime / completed : 0,
    progress: totalLines > 0 ? (completed / totalLines) * 100 : 0,
  };
}

/**
 * Check if a line is suitable for puzzle (skip chapter/section lines)
 */
export function isPuzzleSuitable(line: string): boolean {
  return !isChapterOrSectionLine(line) && basicSplit(line).length >= 3;
}
