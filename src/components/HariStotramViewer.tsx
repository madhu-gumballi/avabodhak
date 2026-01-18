import type { Lang, TextFile } from '../data/types';
import hariLines from '../data/hari.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Sri Hari Stotram',
  deva: 'श्री हरि स्तोत्रम्',
  knda: 'ಶ್ರೀ ಹರಿ ಸ್ತೋತ್ರಂ'
};

export function HariStotramViewer({ onBack }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={hariLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
    />
  );
}
