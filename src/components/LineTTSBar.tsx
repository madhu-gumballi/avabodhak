import { useState, useEffect } from 'react';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

interface Props {
  ttsPlaying: boolean;
  onTTSToggle: () => void;
  ttsSupported?: boolean;
  currentLine?: number;
  totalLines?: number;
}

export function LineTTSBar({ ttsPlaying, onTTSToggle, ttsSupported, currentLine, totalLines }: Props) {
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (ttsPlaying) {
      setPulseAnimation(true);
    } else {
      setPulseAnimation(false);
    }
  }, [ttsPlaying]);

  if (!ttsSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="relative">
        {/* Gradient fade effect at top */}
        <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
        
        {/* Main bar */}
        <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-md border-t border-slate-700/50 shadow-2xl pointer-events-auto">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Line info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <VolumeUpIcon sx={{ fontSize: 20 }} className={pulseAnimation ? 'animate-pulse text-blue-400' : ''} />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {currentLine && totalLines ? `Line ${currentLine}/${totalLines}` : 'Line TTS'}
                  </span>
                </div>
              </div>

              {/* Center - Main TTS button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTTSToggle();
                }}
                aria-label={ttsPlaying ? 'Stop Line TTS' : 'Play Line TTS'}
                className={`
                  relative flex items-center gap-3 px-8 py-3 rounded-full font-bold text-base
                  transition-all duration-200 shadow-lg
                  ${ttsPlaying 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-300 shadow-amber-500/50 scale-105' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-2 border-blue-400 shadow-blue-500/40 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/60 active:scale-95'
                  }
                `}
              >
                {ttsPlaying ? (
                  <>
                    <StopIcon sx={{ fontSize: 28 }} />
                    <span className="uppercase tracking-wide">Stop</span>
                  </>
                ) : (
                  <>
                    <RecordVoiceOverIcon sx={{ fontSize: 28 }} />
                    <span className="uppercase tracking-wide">Play Line</span>
                  </>
                )}
                
                {/* Animated border when playing */}
                {ttsPlaying && (
                  <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
                )}
              </button>

              {/* Right side - Hint text */}
              <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs flex-1 justify-end">
                <span className="whitespace-nowrap">Tap to hear current line</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
