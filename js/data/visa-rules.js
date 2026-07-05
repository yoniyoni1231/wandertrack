// ============================================================
// Visa rules dataset — preloaded defaults for ISRAELI passport
// ------------------------------------------------------------
// IMPORTANT: visa rules change often. These are best-effort
// defaults shown as SUGGESTIONS when you check in to a country.
// Always verify with official sources; everything is editable.
//
// Rule types:
//   'schengen'     - shared 90 days in any rolling 180-day window
//                    across ALL Schengen countries
//   'perEntry'     - N days allowed counted from each entry
//   'rolling'      - N days within a rolling window of W days
//                    (per single country)
//   'visaRequired' - you must arrange a visa/eVisa in advance;
//                    'days' is the typical stay once granted
// ============================================================

// Schengen area members (border-free zone sharing the 90/180 rule)
const SCHENGEN_COUNTRIES = new Set([
  'at', 'be', 'bg', 'ch', 'cz', 'de', 'dk', 'ee', 'es', 'fi',
  'fr', 'gr', 'hr', 'hu', 'is', 'it', 'li', 'lt', 'lu', 'lv',
  'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'se', 'si', 'sk',
  // De-facto members (open borders with Schengen neighbours):
  'mc', 'sm', 'va', 'ad',
]);

const SCHENGEN_DAYS = 90;
const SCHENGEN_WINDOW = 180;

// Default rules per country (ISO2 lowercase) for Israeli passport
const VISA_RULES_IL = {
  // --- Europe, non-Schengen ---
  gb: { type: 'perEntry', days: 180, note: 'Visa-free up to 6 months per entry' },
  ie: { type: 'perEntry', days: 90, note: 'Visa-free, not part of Schengen' },
  cy: { type: 'rolling', days: 90, windowDays: 180, note: 'Own 90/180 rule, separate from Schengen' },
  rs: { type: 'rolling', days: 90, windowDays: 180, note: 'Serbia: 90 days in 180' },
  al: { type: 'rolling', days: 90, windowDays: 180, note: 'Albania: 90 days in 180' },
  me: { type: 'rolling', days: 90, windowDays: 180, note: 'Montenegro: 90 days in 180' },
  ba: { type: 'rolling', days: 90, windowDays: 180, note: 'Bosnia: 90 days in 180' },
  mk: { type: 'rolling', days: 90, windowDays: 180, note: 'North Macedonia: 90 days in 180' },
  xk: { type: 'rolling', days: 90, windowDays: 180, note: 'Kosovo: 90 days in 180' },
  md: { type: 'rolling', days: 90, windowDays: 180, note: 'Moldova: 90 days in 180' },
  ua: { type: 'rolling', days: 90, windowDays: 180, note: 'Ukraine: 90 days in 180 (check current situation)' },
  ru: { type: 'rolling', days: 90, windowDays: 180, note: 'Russia: 90 days in 180 (check current situation)' },
  by: { type: 'perEntry', days: 30, note: 'Belarus: verify current rules before travel' },
  tr: { type: 'rolling', days: 90, windowDays: 180, note: 'Turkey: 90 days in 180 visa-free' },
  ge: { type: 'perEntry', days: 365, note: 'Georgia: up to 1 year visa-free' },
  am: { type: 'rolling', days: 180, windowDays: 365, note: 'Armenia: 180 days per year' },
  az: { type: 'visaRequired', days: 30, note: 'Azerbaijan: e-visa required (ASAN visa)' },

  // --- Americas ---
  us: { type: 'perEntry', days: 90, note: 'Visa Waiver Program - requires approved ESTA before flying' },
  ca: { type: 'perEntry', days: 180, note: 'Requires eTA before flying; up to 6 months per entry' },
  mx: { type: 'perEntry', days: 180, note: 'Mexico: up to 180 days, decided by border officer' },
  ar: { type: 'perEntry', days: 90, note: 'Argentina: 90 days visa-free' },
  br: { type: 'rolling', days: 90, windowDays: 365, note: 'Brazil: 90 days, extendable to 180 per year' },
  cl: { type: 'perEntry', days: 90, note: 'Chile: 90 days visa-free' },
  pe: { type: 'rolling', days: 183, windowDays: 365, note: 'Peru: up to 183 days per year' },
  co: { type: 'rolling', days: 90, windowDays: 365, note: 'Colombia: 90 days, extendable to 180 per year' },
  ec: { type: 'rolling', days: 90, windowDays: 365, note: 'Ecuador: 90 days per year' },
  uy: { type: 'perEntry', days: 90, note: 'Uruguay: 90 days visa-free' },
  py: { type: 'perEntry', days: 90, note: 'Paraguay: 90 days visa-free' },
  bo: { type: 'visaRequired', days: 30, note: 'Bolivia: visa required for Israeli citizens' },
  cr: { type: 'perEntry', days: 180, note: 'Costa Rica: up to 180 days visa-free' },
  pa: { type: 'perEntry', days: 90, note: 'Panama: 90 days visa-free' },
  gt: { type: 'perEntry', days: 90, note: 'Guatemala: 90 days (shared CA-4 with HN/SV/NI)' },
  hn: { type: 'perEntry', days: 90, note: 'Honduras: 90 days (shared CA-4)' },
  sv: { type: 'perEntry', days: 90, note: 'El Salvador: 90 days (shared CA-4)' },
  ni: { type: 'perEntry', days: 90, note: 'Nicaragua: 90 days (shared CA-4)' },
  do: { type: 'perEntry', days: 30, note: 'Dominican Republic: tourist card ~30 days' },
  jm: { type: 'perEntry', days: 30, note: 'Jamaica: 30 days visa-free' },
  bz: { type: 'perEntry', days: 30, note: 'Belize: 30 days visa-free' },

  // --- Asia ---
  th: { type: 'perEntry', days: 60, note: 'Thailand: 60 days visa-exempt, extendable +30' },
  jp: { type: 'perEntry', days: 90, note: 'Japan: 90 days visa-free' },
  kr: { type: 'perEntry', days: 90, note: 'South Korea: 90 days, requires K-ETA online' },
  tw: { type: 'perEntry', days: 90, note: 'Taiwan: 90 days visa-free' },
  hk: { type: 'perEntry', days: 90, note: 'Hong Kong: 90 days visa-free' },
  sg: { type: 'perEntry', days: 90, note: 'Singapore: 90 days visa-free' },
  my: { type: 'perEntry', days: 90, note: 'Malaysia: verify - rules for Israelis are restricted' },
  ph: { type: 'perEntry', days: 59, note: 'Philippines: 59 days visa-free for Israeli citizens' },
  vn: { type: 'visaRequired', days: 90, note: 'Vietnam: e-visa required (90-day e-visa available)' },
  kh: { type: 'visaRequired', days: 30, note: 'Cambodia: visa on arrival / e-visa' },
  la: { type: 'visaRequired', days: 30, note: 'Laos: visa on arrival / e-visa' },
  id: { type: 'visaRequired', days: 30, note: 'Indonesia: verify - visa on arrival availability varies' },
  in: { type: 'visaRequired', days: 90, note: 'India: e-visa required' },
  np: { type: 'visaRequired', days: 90, note: 'Nepal: visa on arrival, up to 90 days' },
  lk: { type: 'visaRequired', days: 30, note: 'Sri Lanka: ETA required' },
  cn: { type: 'visaRequired', days: 30, note: 'China: visa required' },
  mn: { type: 'visaRequired', days: 30, note: 'Mongolia: verify current rules' },
  kz: { type: 'perEntry', days: 30, note: 'Kazakhstan: 30 days visa-free' },
  uz: { type: 'perEntry', days: 30, note: 'Uzbekistan: 30 days visa-free' },
  kg: { type: 'perEntry', days: 60, note: 'Kyrgyzstan: verify current rules' },

  // --- Middle East & Africa ---
  ae: { type: 'rolling', days: 90, windowDays: 180, note: 'UAE: 90 days in 180 visa-free' },
  bh: { type: 'visaRequired', days: 14, note: 'Bahrain: eVisa required' },
  jo: { type: 'visaRequired', days: 30, note: 'Jordan: visa at border/embassy' },
  eg: { type: 'visaRequired', days: 30, note: 'Egypt: visa required (free Sinai permit at Taba for south Sinai)' },
  ma: { type: 'perEntry', days: 90, note: 'Morocco: 90 days visa-free' },
  za: { type: 'perEntry', days: 90, note: 'South Africa: 90 days visa-free' },
  ke: { type: 'visaRequired', days: 90, note: 'Kenya: eTA required' },
  tz: { type: 'visaRequired', days: 90, note: 'Tanzania: visa on arrival / e-visa' },
  et: { type: 'visaRequired', days: 30, note: 'Ethiopia: e-visa' },
  rw: { type: 'visaRequired', days: 30, note: 'Rwanda: visa on arrival' },
  ug: { type: 'visaRequired', days: 90, note: 'Uganda: e-visa' },
  na: { type: 'perEntry', days: 90, note: 'Namibia: verify current rules' },
  mu: { type: 'perEntry', days: 90, note: 'Mauritius: 90 days visa-free' },
  sc: { type: 'perEntry', days: 30, note: 'Seychelles: visitor permit on arrival' },

  // --- Oceania ---
  au: { type: 'visaRequired', days: 90, note: 'Australia: ETA (subclass 601) via app' },
  nz: { type: 'perEntry', days: 90, note: 'New Zealand: visa waiver, requires NZeTA online' },
  fj: { type: 'perEntry', days: 120, note: 'Fiji: visa-free on arrival' },
};

// Suggest a default rule for a country (Schengen membership wins)
function suggestVisaRule(iso2) {
  if (SCHENGEN_COUNTRIES.has(iso2)) {
    return {
      type: 'schengen',
      days: SCHENGEN_DAYS,
      windowDays: SCHENGEN_WINDOW,
      note: 'Schengen area: shared 90 days in any 180-day window across all Schengen countries',
    };
  }
  if (VISA_RULES_IL[iso2]) return Object.assign({}, VISA_RULES_IL[iso2]);
  return {
    type: 'perEntry',
    days: 90,
    note: 'No preloaded rule for this country - please verify and edit',
  };
}
