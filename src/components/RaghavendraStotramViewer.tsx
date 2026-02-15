import type { Lang, TextFile } from '../data/types';
import raghavendraLines from '../data/raghavendra.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
  initialMode?: 'reading' | 'practice' | 'puzzle';
  initialLineIndex?: number;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'tel', 'tam', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Sri Raghavendra Stotram',
  deva: 'श्री राघवेन्द्र स्तोत्रम्',
  knda: 'ಶ್ರೀ ರಾಘವೇಂದ್ರ ಸ್ತೋತ್ರಂ',
  tel: 'శ్రీ రాఘవేంద్ర స్తోత్రం',
  tam: 'ஶ்ரீ ராக⁴வேந்த்³ர ஸ்தோத்ரம்'
};

export function RaghavendraStotramViewer({ onBack, preferredLang, initialMode, initialLineIndex }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={raghavendraLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
      initialMode={initialMode}
      initialLineIndex={initialLineIndex}
      stotraKey="raghavendra"
    />
  );
}
