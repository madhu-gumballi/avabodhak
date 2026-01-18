export interface Phrase {
  id: string;
  deva: string; // Devanagari
  iast: string; // transliteration
  knda?: string; // Kannada script
}

export interface ChantFile {
  title: string;
  source: string;
  phrases: Phrase[];
}

// New text-only data model
export interface Line {
  id: string;
  deva: string;
  iast: string; // English transliteration (IAST/ITRANS compatible)
  knda: string;
  meaning?: string; // future: sentence meaning
  image?: string;   // future: picture URL or asset id
  tel?: string;
  tam?: string;
  guj?: string;
  pan?: string;
  mr?: string;  // Marathi (Devanagari)
  ben?: string; // Bengali
  mal?: string; // Malayalam
  group?: string; // optional group key to map images/meanings across languages
  chapter?: string; // optional chapter label for header lines
}

export interface Media {
  id: string;
  src: string; // URL or public path
  lines: string[]; // line ids this media applies to
  groups?: string[]; // optional groups this media applies to
}

export interface StotraMetadata {
  chapters: number;
  totalLines: number;
  languages: Lang[];
  practiceMode?: boolean;
  puzzleMode?: boolean;
  composer?: string;
  revealedBy?: string;
}

export interface TextFile {
  title: string;
  metadata?: StotraMetadata;
  sources: { deva: string; knda: string; iast: string; tel?: string; tam?: string; guj?: string; pan?: string; mr?: string; ben?: string; mal?: string };
  lines: Line[];
  media?: Media[];
}

export type Lang = 'deva' | 'knda' | 'iast' | 'tel' | 'tam' | 'guj' | 'pan' | 'mr' | 'ben' | 'mal';
