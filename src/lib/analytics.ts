/**
 * Google Analytics 4 utility functions
 * Provides type-safe event tracking for the application
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * Track a custom event in Google Analytics
 * @param eventName - Name of the event (e.g., 'play_stotra', 'change_language')
 * @param eventParams - Additional parameters for the event
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

/**
 * Track page view (usually automatic, but useful for SPA navigation)
 * @param pagePath - Path of the page
 * @param pageTitle - Title of the page
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }
}

/**
 * Predefined event trackers for common app actions
 */
export const analytics = {
  selectStotra: (stotra: string) => trackEvent('select_stotra', { stotra }),
  // Playback events
  playbackStart: () => trackEvent('playback_start'),
  playbackPause: () => trackEvent('playback_pause'),
  playbackComplete: () => trackEvent('playback_complete'),

  // Navigation events
  wordNavigation: (direction: 'next' | 'previous') =>
    trackEvent('word_navigation', { direction }),
  lineJump: (lineNumber: number) =>
    trackEvent('line_jump', { line_number: lineNumber }),

  // Settings events
  languageChange: (language: string) =>
    trackEvent('language_change', { language }),
  paceChange: (wpm: number) =>
    trackEvent('pace_change', { words_per_minute: wpm }),
  pronunciationToggle: (enabled: boolean) =>
    trackEvent('pronunciation_toggle', { enabled }),
  artworkToggle: (enabled: boolean) =>
    trackEvent('artwork_toggle', { enabled }),

  // Search events
  search: (query: string, resultsCount: number) =>
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount
    }),
  searchResultClick: (lineNumber: number) =>
    trackEvent('search_result_click', { line_number: lineNumber }),

  // Help & Onboarding
  helpOpen: () => trackEvent('help_open'),
  onboardingComplete: () => trackEvent('onboarding_complete'),
  onboardingSkip: () => trackEvent('onboarding_skip'),

  // Engagement metrics
  sessionDuration: (durationSeconds: number) =>
    trackEvent('session_duration', { duration_seconds: durationSeconds }),

  // Practice mode events
  practiceToggle: (enabled: boolean) =>
    trackEvent('practice_toggle', { enabled }),
  practiceDifficultyChange: (difficulty: string) =>
    trackEvent('practice_difficulty_change', { difficulty }),
  practiceWordReveal: (lineNumber: number, wordIndex: number) =>
    trackEvent('practice_word_reveal', { line_number: lineNumber, word_index: wordIndex }),
  practiceVerseComplete: (lineNumber: number, difficulty: string) =>
    trackEvent('practice_verse_complete', { line_number: lineNumber, difficulty }),

  // Mode time tracking (practice vs play)
  modeEnter: (mode: 'practice' | 'play', lineNumber?: number) =>
    trackEvent('mode_enter', { mode, line_number: lineNumber }),
  modeExit: (mode: 'practice' | 'play', durationSeconds: number, actions: number) =>
    trackEvent('mode_exit', {
      mode,
      duration_seconds: durationSeconds,
      actions_performed: actions
    }),

  // Practice mode actions (for tracking engagement)
  practiceAction: (action: 'word_reveal' | 'line_complete' | 'replay' | 'navigate' | 'difficulty_change' | 'jump' | 'complete_line') =>
    trackEvent('practice_action', { action }),

  // Play mode actions (for tracking engagement)  
  playAction: (action: 'play' | 'pause' | 'next' | 'prev' | 'seek' | 'pace_change') =>
    trackEvent('play_action', { action }),
};
