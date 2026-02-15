import type { Lang, TextFile } from '../data/types';
import venkateshwaraLines from '../data/venkateshwara.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
  initialMode?: 'reading' | 'practice' | 'puzzle';
  initialLineIndex?: number;
}

const AVAILABLE_LANGS: Lang[] = ['knda'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  knda: 'ಶ್ರೀ ವೇಂಕಟೇಶ್ವರ ಸ್ತೋತ್ರಂ',
  iast: 'Sri Venkateshwara Stotram',
  deva: 'ಶ್ರೀ ವೇಂಕಟೇಶ್ವರ ಸ್ತೋತ್ರಂ'
};

export function VenkateshwaraStotramViewer({ onBack, preferredLang, initialMode, initialLineIndex }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={venkateshwaraLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
      initialMode={initialMode}
      initialLineIndex={initialLineIndex}
      stotraKey="venkateshwara"
    />
  );
}
