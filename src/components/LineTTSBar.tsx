import { useState, useEffect } from 'react';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';

interface Props {
  ttsPlaying: boolean;
  onTTSToggle: () => void;
  ttsSupported?: boolean;
  currentLine?: number;
  totalLines?: number;
  /** Bottom offset in pixels to avoid overlapping with mobile dock */
  bottomOffset?: number;
}

export function LineTTSBar({ ttsPlaying, onTTSToggle, ttsSupported, currentLine, totalLines, bottomOffset = 0 }: Props) {
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
    <div
      className="fixed left-0 right-0 z-50 pointer-events-none"
      style={{ bottom: bottomOffset }}
    >
      <div className="relative">
        {/* Subtle gradient fade effect at top */}
        <div className="absolute bottom-full left-0 right-0 h-6 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />

        {/* Main bar - more subtle styling */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/30 pointer-events-auto">
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-3">
              {/* Compact TTS button - outline style, secondary appearance */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTTSToggle();
                }}
                aria-label={ttsPlaying ? 'Stop Line TTS' : 'Play Line TTS'}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${ttsPlaying
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-transparent text-slate-400 border border-slate-500/50 hover:text-slate-300 hover:border-slate-400/50 hover:bg-slate-800/50'
                  }
                `}
              >
                {ttsPlaying ? (
                  <>
                    <StopIcon sx={{ fontSize: 18 }} className="animate-pulse" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <VolumeUpIcon sx={{ fontSize: 18 }} className={pulseAnimation ? 'animate-pulse' : ''} />
                    <span>Play Line</span>
                  </>
                )}
              </button>

              {/* Line indicator - subtle */}
              {currentLine && totalLines && (
                <span className="text-xs text-slate-500">
                  {currentLine}/{totalLines}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
