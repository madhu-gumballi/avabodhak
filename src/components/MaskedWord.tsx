/**
 * MaskedWord Component
 * Displays a word with progressive hints in practice mode
 * - Shows starting letters based on difficulty
 * - Click to reveal more letters progressively
 * - Final click reveals entire word
 */

import { useState, useEffect } from 'react';

interface Props {
  word: string;
  masked: boolean;
  alreadyRevealed: boolean;
  onReveal: () => void;
  hintLetterCount: number; // How many starting letters to show
  className?: string;
}

export function MaskedWord({ word, masked, alreadyRevealed, onReveal, hintLetterCount, className = '' }: Props) {
  // Track hint level: 0 = initial hint, 1-2 = progressive hints, 3 = fully revealed
  const [hintLevel, setHintLevel] = useState(0);
  const [justRevealed, setJustRevealed] = useState(false);

  // Calculate visible letters based on hint level
  const letters = Array.from(word); // Support multi-byte characters
  const baseHint = Math.max(1, hintLetterCount);
  const progressiveHint = Math.ceil(letters.length * 0.25); // Show 25% more each click
  const visibleCount = Math.min(
    letters.length,
    baseHint + (hintLevel * progressiveHint)
  );

  // Auto-reveal when word becomes fully visible
  useEffect(() => {
    if (masked && !alreadyRevealed && visibleCount >= letters.length) {
      setJustRevealed(true);
      onReveal();
      setTimeout(() => setJustRevealed(false), 800);
    }
  }, [visibleCount, letters.length, masked, alreadyRevealed, onReveal]);

  const handleClick = () => {
    if (!masked || alreadyRevealed) return;
    
    // Progressive reveal: show 25% more each click
    const maxLevel = 3;
    if (hintLevel < maxLevel && visibleCount < letters.length) {
      setHintLevel(hintLevel + 1);
    }
  };

  if (!masked || alreadyRevealed) {
    // Show fully revealed word with same styling as button to prevent layout shifts
    return (
      <span
        className={`${className} ${justRevealed ? 'animate-bounce-subtle' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 6px',
          background: 'transparent', // No background for revealed words
          border: '2px solid transparent', // Invisible border to maintain space
          borderRadius: '6px',
          verticalAlign: 'middle',
          marginLeft: '3px',
          marginRight: '3px',
          transition: 'color 300ms, font-weight 200ms, text-shadow 300ms',
          color: justRevealed ? '#fbbf24' : 'inherit',
          fontWeight: justRevealed ? 600 : 'inherit',
          textShadow: justRevealed ? '0 0 12px rgba(251, 191, 36, 0.6)' : 'none',
        }}
      >
        {word}
      </span>
    );
  }

  // If fully visible through progressive reveal, show with same styling
  if (visibleCount >= letters.length) {
    return (
      <span
        className={`${className} ${justRevealed ? 'animate-bounce-subtle' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 6px',
          background: 'transparent',
          border: '2px solid transparent',
          borderRadius: '6px',
          verticalAlign: 'middle',
          marginLeft: '3px',
          marginRight: '3px',
          color: justRevealed ? '#fbbf24' : '#a5b4fc',
          fontWeight: justRevealed ? 600 : 500,
          textShadow: justRevealed ? '0 0 12px rgba(251, 191, 36, 0.6)' : 'none',
          transition: 'color 300ms, font-weight 200ms, text-shadow 300ms',
        }}
      >
        {word}
      </span>
    );
  }
  
  const visiblePart = letters.slice(0, visibleCount).join('');
  const hiddenCount = letters.length - visibleCount;

  return (
    <button
      onClick={handleClick}
      className={`${className} masked-word-hint`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px 6px',
        background: hintLevel > 0
          ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))'
          : 'linear-gradient(135deg, rgba(100,116,139,0.3), rgba(71,85,105,0.2))',
        border: hintLevel > 0
          ? '2px solid rgba(251,191,36,0.4)'
          : '2px dashed rgba(148,163,184,0.4)',
        borderRadius: '6px',
        cursor: 'pointer',
        verticalAlign: 'middle',
        marginLeft: '3px',
        marginRight: '3px',
        transition: 'all 200ms ease',
        transform: hintLevel > 0 ? 'scale(1.02)' : 'scale(1)',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      }}
      aria-label={`Reveal more of the word. ${visibleCount}/${letters.length} letters shown`}
      title={`Click to reveal more (${hiddenCount} letters hidden)`}
    >
      {/* Visible hint letters */}
      <span style={{ color: '#a5b4fc', fontWeight: 500 }}>
        {visiblePart}
      </span>
      
      {/* Hidden part as underscores */}
      {hiddenCount > 0 && (
        <span style={{ 
          color: 'rgba(148,163,184,0.4)', 
          letterSpacing: '1px',
          fontSize: '0.9em'
        }}>
          {'_'.repeat(Math.min(hiddenCount, 8))}
        </span>
      )}
    </button>
  );
}

