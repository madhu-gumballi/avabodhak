import type { Lang, TextFile } from '../data/types';
import vayuLines from '../data/vayu.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
  initialMode?: 'reading' | 'practice' | 'puzzle';
  initialLineIndex?: number;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'tel', 'tam', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Vayu Stuti',
  deva: 'वायु स्तुति',
  knda: 'ವಾಯು ಸ್ತುತಿ',
  tel: 'వాయు స్తుతి',
  tam: 'வாயு ஸ்துதி'
};

export function VayuStutiViewer({ onBack, preferredLang, initialMode, initialLineIndex }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={vayuLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
      initialMode={initialMode}
      initialLineIndex={initialLineIndex}
      stotraKey="vayu"
    />
  );
}
