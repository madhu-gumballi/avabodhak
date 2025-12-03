import { useEffect, useMemo, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button } from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SwipeIcon from '@mui/icons-material/Swipe';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SchoolIcon from '@mui/icons-material/School';
import GridViewIcon from '@mui/icons-material/GridView';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { analytics } from '../lib/analytics';

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function OnboardingTour({ open, setOpen }: Props) {
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onTitleIdx, setOnTitleIdx] = useState(0);

  const welcomeTitles = useMemo(() => [
    'Welcome', 'स्वागत', 'ಸ್ವಾಗತ', 'స్వాగతం', 'நல்வரவு', 'સ્વાગત', 'ਸਵਾਗਤ'
  ], []);

  const markOnboarded = useCallback(() => {
    try {
      localStorage.setItem('ui:onboarded:v1', '1');
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    markOnboarded();
  }, [setOpen, markOnboarded]);

  // Reset step when opened
  useEffect(() => {
    if (open) {
      setOnboardingStep(0);
    }
  }, [open]);

  // Rotate "Welcome" title in supported languages while onboarding is open
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setOnTitleIdx((i) => (i + 1) % welcomeTitles.length), 1400) as unknown as number;
    return () => window.clearInterval(id);
  }, [open, welcomeTitles]);

  // Onboarding keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || '').toLowerCase();
      if (t?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onboardingStep < 6) {
          setOnboardingStep(s => s + 1);
        } else {
          handleClose();
        }
      } else if (e.key === 'Backspace' && onboardingStep > 0) {
        e.preventDefault();
        setOnboardingStep(s => s - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onboardingStep, handleClose]);

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        BackdropProps={{ sx: { backgroundColor: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(3px)' } }}
        PaperProps={{ sx: { bgcolor: 'rgba(2,6,23,0.96)' } }}
      >
        <DialogTitle>
          <span style={{ display: 'inline-block', transition: 'transform 300ms ease', transform: `rotate(${onTitleIdx % 2 === 0 ? 0.75 : -0.75}deg)` }}>
            {welcomeTitles[onTitleIdx]}
          </span>
        </DialogTitle>
        <DialogContent dividers>
          <div className="space-y-3 text-sm text-slate-300">
            {onboardingStep === 0 && (
              <div>
                <div className="font-bold mb-1">Text-to-Speech</div>
                <div>Tap the center button or press Space to hear the current line. Press again to stop. This is a reading mode—navigate at your own pace.</div>
              </div>
            )}
            {onboardingStep === 1 && (
              <div>
                <div className="font-bold mb-1">Navigate lines</div>
                <div>Swipe left/right or use arrow keys to move between lines. Use the timeline to jump to any verse.</div>
              </div>
            )}
            {onboardingStep === 2 && (
              <div>
                <div className="font-bold mb-1">Pronunciation hints</div>
                <div>Enable Pronunciation in the settings (cog) to see diacritic animations and word-level highlights for long vowels, retroflexes, and aspirates.</div>
              </div>
            )}
            {onboardingStep === 3 && (
              <div>
                <div className="font-bold mb-1">Explore modes</div>
                <div>Switch between Read, Practice, and Puzzle modes to learn in different ways. Practice helps with pronunciation, Puzzle is a fun challenge.</div>
              </div>
            )}
            {onboardingStep === 4 && (
              <div>
                <div className="font-bold mb-1">Search and navigate</div>
                <div>Use search and the timeline to jump to any line quickly.</div>
              </div>
            )}
            {onboardingStep === 5 && (
              <div>
                <div className="font-bold mb-1">Switch languages</div>
                <div>Use the 1· and 2· language selectors in the top bar to choose primary and secondary scripts.</div>
              </div>
            )}
            {onboardingStep === 6 && (
              <div>
                <div className="font-bold mb-1">You're ready!</div>
                <div>Explore the app at your own pace. Use the Help menu anytime for tips.</div>
              </div>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
              <Button onClick={() => {
                setOpen(false);
                analytics.onboardingSkip();
                markOnboarded();
              }}>Skip</Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {onboardingStep > 0 && (<Button onClick={() => setOnboardingStep(s => Math.max(0, s - 1))}>Back</Button>)}
                {onboardingStep < 6 ? (
                  <Button variant="contained" onClick={() => setOnboardingStep(s => Math.min(6, s + 1))}>Next</Button>
                ) : (
                  <Button variant="contained" onClick={() => {
                    setOpen(false);
                    analytics.onboardingComplete();
                    markOnboarded();
                  }}>Finish</Button>
                )}
              </Box>
            </Box>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Onboarding Overlays */}
      {open && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1305 }} aria-live="polite" role="dialog" aria-label="Onboarding tutorial">
          {/* Backdrop (dim only, no blur) */}
          <div className="absolute inset-0 bg-black/50" />
          
          {/* Step-specific overlays */}
          {onboardingStep === 0 && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 text-black p-4 rounded-lg shadow-lg max-w-sm text-center" aria-describedby="onboarding-step-0">
              <div className="text-lg font-bold mb-2" id="onboarding-step-0" style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
                <RecordVoiceOverIcon fontSize="small" />
                <span>Text-to-Speech</span>
              </div>
              <div>Tap the <strong>center button</strong> or press <strong>Space</strong> to hear the current line read aloud. This is a reading mode—<u><i><b>Swipe</b> left/right or use <ArrowBackIcon fontSize="inherit" /> / <ArrowForwardIcon fontSize="inherit" /> to navigate</i></u> at your own pace.</div>
            </div>
          )}
          {onboardingStep === 1 && (
            <div className="absolute bottom-28 right-6 bg-white/95 text-black p-4 rounded-lg shadow-lg max-w-xs text-left" aria-describedby="onboarding-step-1">
              <div className="text-lg font-bold mb-2" id="onboarding-step-1" style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                <SwipeIcon fontSize="small" />
                <span>Navigate freely</span>
              </div>
              <div>Swipe left/right, use arrow keys, or drag the timeline to move between verses</div>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="absolute bottom-28 right-6 bg-white/95 text-black p-4 rounded-lg shadow-lg max-w-xs" aria-describedby="onboarding-step-2">
              <div className="text-lg font-bold mb-2" id="onboarding-step-2" style={{display:'flex',alignItems:'center',gap:8}}>
                <SettingsIcon fontSize="small" />
                <span>Pronunciation hints</span>
              </div>
              <div>Open <strong>Settings</strong> (cog) near the timeline, then enable <strong>Pronunciation</strong>.</div>
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="absolute top-16 right-4 bg-white/95 text-black p-4 rounded-lg shadow-lg max-w-xs" aria-describedby="onboarding-step-3">
              <div className="text-lg font-bold mb-2" id="onboarding-step-3" style={{display:'flex',alignItems:'center',gap:8}}>
                <AutoStoriesIcon fontSize="small" /> <SchoolIcon fontSize="small" /> <GridViewIcon fontSize="small" />
                <span>Explore modes</span>
              </div>
              <div>Use the header icons to switch between Read, Practice, and Puzzle modes</div>
            </div>
          )}
          {onboardingStep === 4 && (
            <div className="absolute top-16 right-4 bg-white/90 text-black p-4 rounded-lg shadow-lg max-w-xs" aria-describedby="onboarding-step-4">
              <div className="text-lg font-bold mb-2" id="onboarding-step-4">🔍 Search</div>
              <div>Use Cmd+K or the search icon to find specific verses or words</div>
            </div>
          )}
          {onboardingStep === 5 && (
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-white/95 text-black p-4 rounded-lg shadow-lg max-w-xs text-center" aria-describedby="onboarding-step-5">
              <div className="text-lg font-bold mb-2" id="onboarding-step-5">🌐 Switch languages</div>
              <div>Use the 1· and 2· language selectors in the header to choose primary and secondary scripts.</div>
            </div>
          )}
          {onboardingStep === 6 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 text-black p-4 rounded-lg shadow-lg max-w-xs text-center" aria-describedby="onboarding-step-6">
              <div className="text-lg font-bold mb-2" id="onboarding-step-6">हरे कृष्ण • You're all set!</div>
              <div>Enjoy exploring Sanskrit texts. Visit Help for more tips anytime.</div>
            </div>
          )}
          
          {/* Progress indicator */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-full text-sm" aria-live="off">
            Step {onboardingStep + 1} of 7
          </div>
        </div>
      )}
    </>
  );
}
