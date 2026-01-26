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
 * Save puzzle state to localStorage
 */
export function savePuzzleState(lang: string, state: PuzzleState): void {
  try {
    const key = `puzzle:${lang}:${state.lineNumber}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Silent fail for localStorage issues
  }
}

/**
 * Get puzzle state from localStorage
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
  };
}

/**
 * Check if a line is suitable for puzzle (skip chapter/section lines)
 */
export function isPuzzleSuitable(line: string): boolean {
  return !isChapterOrSectionLine(line) && basicSplit(line).length >= 3;
}
