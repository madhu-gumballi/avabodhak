import type { Lang, TextFile } from '../data/types';
import hariLines from '../data/hari.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'tel', 'tam', 'pan', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Sri Hari Stotram',
  deva: 'श्री हरि स्तोत्रम्',
  knda: 'ಶ್ರೀ ಹರಿ ಸ್ತೋತ್ರಂ',
  tel: 'శ్రీ హర్యష్టకం',
  tam: 'ஶ்ரீ ஹர்யஷ்டகம்',
  pan: 'ਸ਼੍ਰੀ ਹਰ੍ਯਸ਼੍ਟਕਮ੍'
};

export function HariStotramViewer({ onBack, preferredLang }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={hariLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
    />
  );
}
