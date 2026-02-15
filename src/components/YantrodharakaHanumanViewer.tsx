import type { Lang, TextFile } from '../data/types';
import yantrodharakaLines from '../data/yantrodharaka.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
  initialMode?: 'reading' | 'practice' | 'puzzle';
  initialLineIndex?: number;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'tel', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Sri Yantrodharaka Hanuman Stotram',
  deva: 'श्री यन्त्रोधारक हनुमत् स्तोत्रम्',
  knda: 'ಶ್ರೀ ಯಂತ್ರೋಧಾರಕ ಹನುಮತ್ ಸ್ತೋತ್ರಂ',
  tel: 'శ్రీ యంత్రోధారక హనుమత్ స్తోత్రమ్'
};

export function YantrodharakaHanumanViewer({ onBack, preferredLang, initialMode, initialLineIndex }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={yantrodharakaLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
      initialMode={initialMode}
      initialLineIndex={initialLineIndex}
      stotraKey="yantrodharaka"
    />
  );
}
