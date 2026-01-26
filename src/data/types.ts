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

// ============================================================================
// Stotra Tattva Darshana - Enriched Types for Multi-dimensional Analysis
// ============================================================================

/**
 * Classification of stotra types - determines which analysis dimensions apply
 */
export type StotraType = 'nama' | 'verse' | 'bhajan' | 'vedic';

/**
 * Etymology/Vyutpatti - Sanskrit word derivation
 */
export interface Etymology {
  dhatu?: string;           // Root verb (e.g., "विश्" for विष्णु)
  pratyaya?: string;        // Suffix
  meaning: string;          // Derived meaning
  alternates?: string[];    // Alternative derivations (Sanskrit words often have multiple)
}

/**
 * Guna categories - Divine quality classification
 * Based on traditional Vishnu Sahasranama commentaries
 */
export type GunaCategory =
  | 'paramarthika'  // Ultimate reality attributes (सत्, चित्, आनन्द)
  | 'srishti'       // Creation attributes
  | 'sthiti'        // Sustenance/preservation attributes
  | 'samhara'       // Dissolution attributes
  | 'rakshana'      // Protection attributes
  | 'anugraha'      // Grace/blessing attributes
  | 'jnana'         // Knowledge attributes
  | 'shakti'        // Power attributes
  | 'karuna'        // Compassion attributes
  | 'saundarya'     // Beauty attributes
  | 'vyapti';       // All-pervasiveness

/**
 * Avatar/Leela reference
 */
export interface AvataraRef {
  avatar: string;           // Avatar name (Rama, Krishna, Narasimha, etc.)
  leela?: string;           // Specific story/episode
  source?: string;          // Purana/text reference
}

/**
 * Compound word breakdown (Samasa Vibhaga)
 * For complex Sanskrit compounds like those in Shiva Tandava Stotram
 */
export interface CompoundBreakdown {
  compound: string;         // The full compound word
  breakdown: string[];      // Individual components
  meanings: string[];       // Meaning of each component
  samasaType?: string;      // Type of compound (tatpurusha, bahuvrihi, etc.)
  combinedMeaning: string;  // Full meaning when combined
}

/**
 * Poetic device (Alamkara)
 */
export interface PoeticDevice {
  type: string;             // anuprasam (alliteration), rupaka (metaphor), etc.
  description: string;      // How it's used in this context
  examples?: string[];      // Specific words/phrases demonstrating it
}

/**
 * Meter information (Chandas)
 */
export interface MeterInfo {
  name: string;             // Anushtup, Shardula Vikridita, Panchachamara, etc.
  pattern?: string;         // Laghu-guru pattern description
  syllablesPerLine?: number;
  description?: string;
}

/**
 * Rasa/Bhava - Devotional sentiment
 */
export type RasaType =
  | 'shanta'    // Peace, tranquility
  | 'dasya'     // Servitude
  | 'sakhya'    // Friendship
  | 'vatsalya'  // Parental affection
  | 'madhurya'  // Sweet/romantic devotion
  | 'vira'      // Heroic
  | 'adbhuta'   // Wonder/awe
  | 'karuna'    // Compassion/pathos
  | 'bhakti';   // General devotion

/**
 * Bhakti Rasa - specific to devotional songs
 */
export type BhaktiRasaType = 'sharanagati' | 'prema' | 'viraha' | 'seva' | 'stuti';

/**
 * Deity form description
 */
export interface DevataSvarupa {
  form: string;             // Specific form (Nataraja, Parthasarathi, etc.)
  attributes?: string[];    // Visual attributes described
  weapons?: string[];       // Ayudhas mentioned
  ornaments?: string[];     // Abharanas mentioned
  companions?: string[];    // Associated deities (Lakshmi, Ganga, etc.)
}

/**
 * Commentary reference
 */
export interface Commentary {
  source: string;           // Author/text (Shankara, Parashara Bhattar, etc.)
  text: string;             // Commentary excerpt
  tradition?: string;       // Advaita, Dvaita, Vishishtadvaita
}

/**
 * Keyword with semantic depth - for word-level analysis
 */
export interface Keyword {
  term: string;             // The word
  script: Lang;             // Which script
  iast?: string;            // IAST transliteration
  meaning: string;          // Basic meaning
  etymology?: Etymology;    // Deeper derivation
  categories?: string[];    // Thematic categories (moksha, bhakti, etc.)
}

/**
 * Sampradaya/tradition context for bhajans
 */
export interface SampradayaInfo {
  name: string;             // Dvaita, Advaita, Haridasa, etc.
  lineage?: string;         // Specific lineage
  region?: string;          // Geographic origin
}

/**
 * Composer information
 */
export interface ComposerInfo {
  name: string;
  period?: string;          // Time period
  tradition?: string;       // Sampradaya
  biography?: string;       // Brief bio
}

/**
 * Musical information for bhajans
 */
export interface MusicalInfo {
  raga?: string;            // Musical mode
  tala?: string;            // Rhythm pattern
  style?: string;           // Rendering style
}

// ============================================================================
// Enriched Line Types - Extensions for different stotra types
// ============================================================================

/**
 * Base enriched line - common fields for all stotra types
 */
export interface EnrichedLineBase extends Line {
  keywords?: Keyword[];     // Significant terms with definitions
  translation?: string;     // Full translation
}

/**
 * Enriched line for Nama Stotras (like Vishnu Sahasranama)
 * Each line may contain multiple names, each with its own analysis
 */
export interface NamaEnrichedLine extends EnrichedLineBase {
  stotraType: 'nama';
  namas?: NamaAnalysis[];   // Analysis for each name in the line
}

/**
 * Individual nama (divine name) analysis
 */
export interface NamaAnalysis {
  nama: string;             // The name
  iast: string;             // IAST transliteration
  etymology?: Etymology;    // Word derivation
  gunaVarga?: GunaCategory[]; // Quality categories
  avataraSambandha?: AvataraRef; // Avatar reference
  relatedNamas?: string[];  // Cross-references to related names
  commentaries?: Commentary[];
}

/**
 * Enriched line for Verse Stotras (like Sri Hari Stotram, Shiva Tandava)
 */
export interface VerseEnrichedLine extends EnrichedLineBase {
  stotraType: 'verse';
  chandas?: MeterInfo;      // Meter information
  samasaVibhaga?: CompoundBreakdown[]; // Compound breakdowns
  alamkara?: PoeticDevice[]; // Poetic devices
  rasa?: RasaType[];        // Sentiments evoked
  devataSvarupa?: DevataSvarupa; // Deity form described
  upadesha?: string;        // Teaching/wisdom in this verse
  imagery?: string[];       // Key images (fire, water, moon, etc.)
}

/**
 * Enriched line for Bhakti Bhajans (like Keshava Nama)
 */
export interface BhajanEnrichedLine extends EnrichedLineBase {
  stotraType: 'bhajan';
  namaReferences?: string[]; // Divine names invoked (Keshava, Narayana, etc.)
  bhaktiRasa?: BhaktiRasaType; // Devotional mood
  regionalGlossary?: { term: string; meaning: string }[]; // Non-Sanskrit terms
}

/**
 * Union type for all enriched line types
 */
export type EnrichedLine = NamaEnrichedLine | VerseEnrichedLine | BhajanEnrichedLine;

// ============================================================================
// Extended Metadata for Stotra Tattva Darshana
// ============================================================================

/**
 * Extended stotra metadata with Tattva Darshana info
 */
export interface EnrichedStotraMetadata extends StotraMetadata {
  stotraType: StotraType;
  tradition?: string;       // Haridasa, Advaita, Dvaita, etc.
  sampradaya?: SampradayaInfo;
  composerInfo?: ComposerInfo;
  devataPrimary?: string;   // Primary deity
  devataSecondary?: string[]; // Secondary deities mentioned
  chandas?: MeterInfo;      // Meter (if consistent throughout)
  historicalPeriod?: string;
  musicalInfo?: MusicalInfo; // For bhajans
}

/**
 * Extended TextFile with enrichment support
 */
export interface EnrichedTextFile extends Omit<TextFile, 'metadata' | 'lines'> {
  metadata?: EnrichedStotraMetadata;
  lines: (Line | EnrichedLine)[];
  enrichmentVersion?: string; // Track enrichment data version
}
