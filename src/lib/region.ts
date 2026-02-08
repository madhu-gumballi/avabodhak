/**
 * Region detection utilities
 * Maps IANA timezones to country/region names for leaderboard display
 */

const TIMEZONE_TO_REGION: Record<string, string> = {
  'Asia/Kolkata': 'India',
  'Asia/Calcutta': 'India',
  'Asia/Mumbai': 'India',
  'Asia/Chennai': 'India',
  'Asia/Tokyo': 'Japan',
  'Asia/Seoul': 'South Korea',
  'Asia/Shanghai': 'China',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Singapore': 'Singapore',
  'Asia/Dubai': 'UAE',
  'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Karachi': 'Pakistan',
  'Asia/Dhaka': 'Bangladesh',
  'Asia/Colombo': 'Sri Lanka',
  'Asia/Kathmandu': 'Nepal',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Bangkok': 'Thailand',
  'Asia/Kuala_Lumpur': 'Malaysia',
  'Asia/Manila': 'Philippines',
  'Europe/London': 'United Kingdom',
  'Europe/Paris': 'France',
  'Europe/Berlin': 'Germany',
  'Europe/Rome': 'Italy',
  'Europe/Madrid': 'Spain',
  'Europe/Amsterdam': 'Netherlands',
  'Europe/Moscow': 'Russia',
  'America/New_York': 'United States',
  'America/Chicago': 'United States',
  'America/Denver': 'United States',
  'America/Los_Angeles': 'United States',
  'America/Toronto': 'Canada',
  'America/Vancouver': 'Canada',
  'America/Mexico_City': 'Mexico',
  'America/Sao_Paulo': 'Brazil',
  'America/Argentina/Buenos_Aires': 'Argentina',
  'Pacific/Auckland': 'New Zealand',
  'Australia/Sydney': 'Australia',
  'Australia/Melbourne': 'Australia',
  'Australia/Perth': 'Australia',
  'Africa/Johannesburg': 'South Africa',
  'Africa/Lagos': 'Nigeria',
  'Africa/Cairo': 'Egypt',
  'Africa/Nairobi': 'Kenya',
}

const CONTINENT_FALLBACK: Record<string, string> = {
  Asia: 'Asia',
  Europe: 'Europe',
  America: 'Americas',
  Pacific: 'Oceania',
  Australia: 'Oceania',
  Africa: 'Africa',
  Antarctica: 'Antarctica',
}

const REGION_FLAGS: Record<string, string> = {
  India: '\u{1F1EE}\u{1F1F3}',
  Japan: '\u{1F1EF}\u{1F1F5}',
  'South Korea': '\u{1F1F0}\u{1F1F7}',
  China: '\u{1F1E8}\u{1F1F3}',
  'Hong Kong': '\u{1F1ED}\u{1F1F0}',
  Singapore: '\u{1F1F8}\u{1F1EC}',
  UAE: '\u{1F1E6}\u{1F1EA}',
  'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  Pakistan: '\u{1F1F5}\u{1F1F0}',
  Bangladesh: '\u{1F1E7}\u{1F1E9}',
  'Sri Lanka': '\u{1F1F1}\u{1F1F0}',
  Nepal: '\u{1F1F3}\u{1F1F5}',
  Indonesia: '\u{1F1EE}\u{1F1E9}',
  Thailand: '\u{1F1F9}\u{1F1ED}',
  Malaysia: '\u{1F1F2}\u{1F1FE}',
  Philippines: '\u{1F1F5}\u{1F1ED}',
  'United Kingdom': '\u{1F1EC}\u{1F1E7}',
  France: '\u{1F1EB}\u{1F1F7}',
  Germany: '\u{1F1E9}\u{1F1EA}',
  Italy: '\u{1F1EE}\u{1F1F9}',
  Spain: '\u{1F1EA}\u{1F1F8}',
  Netherlands: '\u{1F1F3}\u{1F1F1}',
  Russia: '\u{1F1F7}\u{1F1FA}',
  'United States': '\u{1F1FA}\u{1F1F8}',
  Canada: '\u{1F1E8}\u{1F1E6}',
  Mexico: '\u{1F1F2}\u{1F1FD}',
  Brazil: '\u{1F1E7}\u{1F1F7}',
  Argentina: '\u{1F1E6}\u{1F1F7}',
  'New Zealand': '\u{1F1F3}\u{1F1FF}',
  Australia: '\u{1F1E6}\u{1F1FA}',
  'South Africa': '\u{1F1FF}\u{1F1E6}',
  Nigeria: '\u{1F1F3}\u{1F1EC}',
  Egypt: '\u{1F1EA}\u{1F1EC}',
  Kenya: '\u{1F1F0}\u{1F1EA}',
  // Continents
  Asia: '\u{1F30F}',
  Europe: '\u{1F30D}',
  Americas: '\u{1F30E}',
  Oceania: '\u{1F30F}',
  Africa: '\u{1F30D}',
  Antarctica: '\u{1F30F}',
}

export function detectRegionFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (TIMEZONE_TO_REGION[tz]) {
      return TIMEZONE_TO_REGION[tz]
    }
    // Fallback to continent
    const continent = tz.split('/')[0]
    return CONTINENT_FALLBACK[continent] || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

export function getRegionFlag(region: string | null): string {
  if (!region) return ''
  return REGION_FLAGS[region] || '\u{1F30D}'
}

export const REGION_OPTIONS: string[] = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'South Korea',
  'China',
  'Singapore',
  'UAE',
  'Saudi Arabia',
  'Pakistan',
  'Bangladesh',
  'Sri Lanka',
  'Nepal',
  'Indonesia',
  'Thailand',
  'Malaysia',
  'Philippines',
  'Italy',
  'Spain',
  'Netherlands',
  'Russia',
  'Mexico',
  'Brazil',
  'Argentina',
  'New Zealand',
  'South Africa',
  'Nigeria',
  'Egypt',
  'Kenya',
  'Hong Kong',
  // Continents as fallbacks
  'Asia',
  'Europe',
  'Americas',
  'Oceania',
  'Africa',
]
