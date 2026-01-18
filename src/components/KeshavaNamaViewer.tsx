import type { Lang, TextFile } from '../data/types';
import keshavaLines from '../data/keshava.lines.json';
import { VSNViewer } from './VSNViewer';

interface Props {
  onBack: () => void;
  preferredLang?: Lang;
}

const AVAILABLE_LANGS: Lang[] = ['deva', 'knda', 'tel', 'tam', 'pan', 'guj', 'iast'];

const SUBTITLE_OVERRIDES: Partial<Record<Lang, string>> = {
  iast: 'Keshava Nama',
  deva: 'केशव नाम',
  knda: 'ಕೇಶವ ನಾಮ',
  tel: 'కేశవ నామ',
  tam: 'கேஶவ நாம',
  pan: 'ਕੇਸ਼ਵ ਨਾਮ',
  guj: 'કેશવ નામ'
};

export function KeshavaNamaViewer({ onBack, preferredLang }: Props) {
  return (
    <VSNViewer
      onBack={onBack}
      textOverride={keshavaLines as TextFile}
      subtitleOverrides={SUBTITLE_OVERRIDES}
      availableLangs={AVAILABLE_LANGS}
      preferredLang={preferredLang}
    />
  );
}
