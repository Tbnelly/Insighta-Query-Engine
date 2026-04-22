// ─── COUNTRY MAP ─────────────────────────────────────────────────────────────
// Maps plain English country names to ISO codes
const COUNTRY_MAP = {
  nigeria: 'NG',
  kenya: 'KE',
  ghana: 'GH',
  ethiopia: 'ET',
  tanzania: 'TZ',
  uganda: 'UG',
  senegal: 'SN',
  cameroon: 'CM',
  angola: 'AO',
  mozambique: 'MZ',
  zambia: 'ZM',
  zimbabwe: 'ZW',
  rwanda: 'RW',
  mali: 'ML',
  niger: 'NE',
  chad: 'TD',
  somalia: 'SO',
  sudan: 'SD',
  egypt: 'EG',
  morocco: 'MA',
  algeria: 'DZ',
  tunisia: 'TN',
  libya: 'LY',
  'south africa': 'ZA',
  'ivory coast': 'CI',
  'sierra leone': 'SL',
  'burkina faso': 'BF',
  benin: 'BJ',
  togo: 'TG',
  guinea: 'GN',
  gabon: 'GA',
  botswana: 'BW',
  namibia: 'NA',
  malawi: 'MW',
  madagascar: 'MG',
  congo: 'CG',
  india: 'IN',
  australia: 'AU',
  'united kingdom': 'GB',
  uk: 'GB',
  usa: 'US',
  'united states': 'US',
  brazil: 'BR',
  canada: 'CA',
  france: 'FR',
  germany: 'DE',
  china: 'CN',
  japan: 'JP',
};

// ─── KEYWORD SETS ─────────────────────────────────────────────────────────────
const GENDER_KEYWORDS = {
  male: 'male',
  males: 'male',
  man: 'male',
  men: 'male',
  boy: 'male',
  boys: 'male',
  female: 'female',
  females: 'female',
  woman: 'female',
  women: 'female',
  girl: 'female',
  girls: 'female',
};

const AGE_GROUP_KEYWORDS = {
  child: 'child',
  children: 'child',
  kid: 'child',
  kids: 'child',
  teenager: 'teenager',
  teenagers: 'teenager',
  teen: 'teenager',
  teens: 'teenager',
  adolescent: 'teenager',
  adult: 'adult',
  adults: 'adult',
  senior: 'senior',
  seniors: 'senior',
  elderly: 'senior',
  old: 'senior',
};

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────
const parseNaturalLanguage = (query) => {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return { error: 'Unable to interpret query' };
  }

  const original = query.trim();
  const lower = original.toLowerCase();
  const filter = {};
  let interpreted = false;

  // ── 1. GENDER DETECTION ───────────────────────────────────────────────────
  // Check "male and female" or "both" — means no gender filter
  const bothGenders =
    (lower.includes('male') && lower.includes('female')) ||
    lower.includes('both');

  if (!bothGenders) {
    for (const [keyword, value] of Object.entries(GENDER_KEYWORDS)) {
      // Use word boundary matching to avoid partial matches
      // e.g. "female" should not match inside "females" twice
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(lower)) {
        filter.gender = value;
        interpreted = true;
        break;
      }
    }
  } else {
    // "male and female" is a valid query — just no gender filter applied
    interpreted = true;
  }

  // ── 2. AGE GROUP DETECTION ────────────────────────────────────────────────
  for (const [keyword, value] of Object.entries(AGE_GROUP_KEYWORDS)) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(lower)) {
      filter.age_group = value;
      interpreted = true;
      break;
    }
  }

  // ── 3. "YOUNG" KEYWORD ────────────────────────────────────────────────────
  // "young" maps to ages 16-24 for parsing only — not a stored age group
  if (/\byoung\b/.test(lower)) {
    filter.age = { ...filter.age, $gte: 16, $lte: 24 };
    interpreted = true;
  }

  // ── 4. AGE RANGE DETECTION ────────────────────────────────────────────────
  // Matches: "above 30", "over 30", "older than 30"
  const aboveMatch = lower.match(/\b(?:above|over|older than|greater than|more than)\s+(\d+)/);
  if (aboveMatch) {
    const age = Number(aboveMatch[1]);
    filter.age = { ...filter.age, $gte: age };
    interpreted = true;
  }

  // Matches: "below 30", "under 30", "younger than 30", "less than 30"
  const belowMatch = lower.match(/\b(?:below|under|younger than|less than)\s+(\d+)/);
  if (belowMatch) {
    const age = Number(belowMatch[1]);
    filter.age = { ...filter.age, $lte: age };
    interpreted = true;
  }

  // Matches: "between 20 and 30"
  const betweenMatch = lower.match(/\bbetween\s+(\d+)\s+and\s+(\d+)/);
  if (betweenMatch) {
    filter.age = {
      ...filter.age,
      $gte: Number(betweenMatch[1]),
      $lte: Number(betweenMatch[2]),
    };
    interpreted = true;
  }

  // Matches: "aged 25", "age 25"
  const agedMatch = lower.match(/\baged?\s+(\d+)/);
  if (agedMatch) {
    filter.age = { ...filter.age, $gte: Number(agedMatch[1]) };
    interpreted = true;
  }

  // ── 5. COUNTRY DETECTION ──────────────────────────────────────────────────
  // Check multi-word countries first (e.g. "south africa" before "africa")
  const sortedCountries = Object.keys(COUNTRY_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const countryName of sortedCountries) {
    if (lower.includes(countryName)) {
      filter.country_id = COUNTRY_MAP[countryName];
      interpreted = true;
      break;
    }
  }

  // ── 6. INTERPRET "FROM" KEYWORD ───────────────────────────────────────────
  // "from nigeria" — already handled by country detection above
  // but we flag interpreted if "from" appears with a known country
  if (/\bfrom\b/.test(lower) && filter.country_id) {
    interpreted = true;
  }

  // ── 7. FINAL CHECK ────────────────────────────────────────────────────────
  if (!interpreted || Object.keys(filter).length === 0) {
    return { error: 'Unable to interpret query' };
  }

  return { filter };
};

module.exports = { parseNaturalLanguage };