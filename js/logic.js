// ============================================================
// Travel & visa calculation logic (pure functions, no UI)
// Convention: dates are 'YYYY-MM-DD' strings, handled as UTC to
// avoid timezone drift. Border days count in BOTH countries,
// matching how Schengen counts entry and exit days.
// ============================================================

// ---------- date helpers ----------
function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(date) {
  return date.toISOString().slice(0, 10);
}
function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}
// Inclusive day count of a range ('2024-01-01'..'2024-01-03' = 3)
function daySpan(startISO, endISO) {
  return Math.round((parseISO(endISO) - parseISO(startISO)) / 86400000) + 1;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- stays ----------
// A stay's effective end: ongoing stays run until today.
function stayEnd(stay) {
  return stay.end || todayISO();
}

// Map of dateISO -> Set of country codes present that day.
// Only materializes days up to `until` (default today).
function buildDayMap(stays, until) {
  const cap = until || todayISO();
  const map = new Map();
  for (const stay of stays) {
    const end = stayEnd(stay) <= cap ? stayEnd(stay) : cap;
    if (stay.start > end) continue;
    for (let d = stay.start; d <= end; d = addDays(d, 1)) {
      if (!map.has(d)) map.set(d, new Set());
      map.get(d).add(stay.country);
    }
  }
  return map;
}

// Total days present per country (border days count for both).
function daysPerCountry(stays) {
  const counts = new Map();
  const dayMap = buildDayMap(stays);
  for (const countries of dayMap.values()) {
    for (const c of countries) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return counts;
}

function visitedCountries(stays) {
  return new Set(stays.filter((s) => s.start <= todayISO()).map((s) => s.country));
}

// The stay you're currently in (end === null), if any.
function currentStay(stays) {
  return stays.find((s) => !s.end) || null;
}

// Number of days spent in `countrySet` within the `windowDays`-long
// window ending on `onDate` (inclusive).
function daysUsedInWindow(stays, countrySet, windowDays, onDate) {
  const windowStart = addDays(onDate, -(windowDays - 1));
  let used = 0;
  const dayMap = buildDayMap(stays, onDate);
  for (const [day, countries] of dayMap) {
    if (day < windowStart || day > onDate) continue;
    for (const c of countries) {
      if (countrySet.has(c)) { used++; break; }
    }
  }
  return used;
}

// ---------- Schengen 90/180 ----------
function schengenDaysUsed(stays, onDate) {
  return daysUsedInWindow(stays, SCHENGEN_COUNTRIES, SCHENGEN_WINDOW, onDate || todayISO());
}

// If you stay in Schengen continuously starting today, the last day
// you may legally remain (or null if you already have 0 days left).
function schengenLastSafeDay(stays, fromDate) {
  const start = fromDate || todayISO();
  let date = start;
  // Simulate forward day by day; each simulated day is spent inside.
  for (let i = 0; i < 400; i++) {
    const windowStart = addDays(date, -(SCHENGEN_WINDOW - 1));
    // Days already used inside the window (historical presence)...
    let used = daysUsedInWindow(stays, SCHENGEN_COUNTRIES, SCHENGEN_WINDOW, date);
    // ...plus simulated future days from `start` through `date`
    // that aren't already covered by recorded stays.
    const dayMap = buildDayMap(stays, date);
    for (let d = (start > windowStart ? start : windowStart); d <= date; d = addDays(d, 1)) {
      const recorded = dayMap.get(d);
      const alreadyCounted = recorded && [...recorded].some((c) => SCHENGEN_COUNTRIES.has(c));
      if (!alreadyCounted && d > todayISO()) used++;
    }
    if (used > SCHENGEN_DAYS) return addDays(date, -1);
    date = addDays(date, 1);
  }
  return addDays(start, 399); // effectively unlimited within horizon
}

// When days start freeing up again if you leave now:
// the earliest date on which at least one used day exits the window.
function schengenNextFreeUp(stays, onDate) {
  const today = onDate || todayISO();
  const windowStart = addDays(today, -(SCHENGEN_WINDOW - 1));
  const dayMap = buildDayMap(stays, today);
  let oldest = null;
  for (const [day, countries] of dayMap) {
    if (day < windowStart || day > today) continue;
    if ([...countries].some((c) => SCHENGEN_COUNTRIES.has(c))) {
      if (!oldest || day < oldest) oldest = day;
    }
  }
  if (!oldest) return null;
  // That day leaves the window 180 days after it occurred.
  return addDays(oldest, SCHENGEN_WINDOW);
}

// ---------- per-visa status ----------
// Returns { used, total, left, severity, detail } for display.
// severity: 'ok' | 'warn' (<=14 days left) | 'danger' (<=5 or overstay)
function visaStatus(visa, stays, onDate) {
  const today = onDate || todayISO();
  const total = visa.days;
  let used = 0;
  let detail = '';

  if (visa.type === 'schengen') {
    used = schengenDaysUsed(stays, today);
    const lastSafe = schengenLastSafeDay(stays, today);
    const inside = isCurrentlyIn(stays, SCHENGEN_COUNTRIES);
    detail = inside
      ? `If you stay, you must leave by ${lastSafe}`
      : `Rolling 180-day window; days free up from ${schengenNextFreeUp(stays, today) || '—'}`;
  } else if (visa.type === 'rolling') {
    used = daysUsedInWindow(stays, new Set([visa.country]), visa.windowDays || 180, today);
    detail = `Rolling ${visa.windowDays || 180}-day window`;
  } else {
    // perEntry / visaRequired: count from the current entry.
    const entry = visa.entryDate || latestEntryDate(stays, visa.country);
    if (entry && entry <= today) {
      const stillThere = isCurrentlyInCountry(stays, visa.country);
      const lastDayThere = stillThere ? today : latestExitDate(stays, visa.country, entry);
      used = daySpan(entry, lastDayThere || entry);
      detail = stillThere
        ? `Entered ${entry} — must leave by ${addDays(entry, total - 1)}`
        : `Last entry ${entry}`;
      if (!stillThere) used = 0; // per-entry allowance resets after you leave
    } else {
      used = 0;
      detail = 'Not currently in this country';
    }
  }

  if (visa.validTo && visa.validTo < today) {
    return { used, total, left: 0, severity: 'danger', detail: `Visa expired on ${visa.validTo}` };
  }

  const left = Math.max(0, total - used);
  let severity = 'ok';
  if (used > total) severity = 'danger';
  else if (left <= 5) severity = 'danger';
  else if (left <= 14) severity = 'warn';
  return { used: Math.min(used, total + 99), total, left, severity, detail };
}

function isCurrentlyIn(stays, countrySet) {
  const cur = currentStay(stays);
  return !!(cur && countrySet.has(cur.country));
}
function isCurrentlyInCountry(stays, iso2) {
  const cur = currentStay(stays);
  return !!(cur && cur.country === iso2);
}
// Latest entry (stay start) for a country, up to today.
function latestEntryDate(stays, iso2) {
  let latest = null;
  for (const s of stays) {
    if (s.country === iso2 && s.start <= todayISO()) {
      if (!latest || s.start > latest) latest = s.start;
    }
  }
  return latest;
}
function latestExitDate(stays, iso2, entry) {
  let latest = null;
  for (const s of stays) {
    if (s.country === iso2 && s.start >= entry) {
      const e = stayEnd(s);
      if (!latest || e > latest) latest = e;
    }
  }
  return latest;
}

// ---------- editing stays ----------
// End the ongoing stay (if any) and start a new one. The changeover
// day is counted in both countries, like real border crossings.
function checkIn(state, iso2, dateISO) {
  const date = dateISO || todayISO();
  const cur = currentStay(state.stays);
  if (cur && cur.country === iso2) return false; // already there
  if (cur) cur.end = date;
  state.stays.push({ id: newId(), country: iso2, start: date, end: null });
  normalizeStays(state);
  return true;
}

// Assign a calendar day to a country (or null to clear it).
// Splits any stay covering that day, then adds a one-day stay.
function setDayCountry(state, dateISO, iso2) {
  const next = [];
  for (const stay of state.stays) {
    const end = stay.end; // keep ongoing stays ongoing
    const effEnd = stayEnd(stay);
    if (dateISO < stay.start || dateISO > effEnd) { next.push(stay); continue; }
    // Split the stay around dateISO.
    if (stay.start < dateISO) {
      next.push({ id: newId(), country: stay.country, start: stay.start, end: addDays(dateISO, -1) });
    }
    if (effEnd > dateISO) {
      next.push({ id: newId(), country: stay.country, start: addDays(dateISO, 1), end: end === null ? null : end });
    }
  }
  if (iso2) next.push({ id: newId(), country: iso2, start: dateISO, end: dateISO });
  state.stays = next;
  normalizeStays(state);
}

// Merge overlapping/adjacent stays of the same country; sort all.
function normalizeStays(state) {
  const byCountry = new Map();
  for (const s of state.stays) {
    if (!byCountry.has(s.country)) byCountry.set(s.country, []);
    byCountry.get(s.country).push(s);
  }
  const merged = [];
  for (const [, list] of byCountry) {
    list.sort((a, b) => a.start.localeCompare(b.start));
    let cur = null;
    for (const s of list) {
      if (!cur) { cur = Object.assign({}, s); continue; }
      const curEnd = cur.end === null ? '9999-12-31' : cur.end;
      if (s.start <= addDays(curEnd === '9999-12-31' ? todayISO() : curEnd, 1) && curEnd >= addDays(s.start, -1)) {
        // overlapping or adjacent -> merge
        if (s.end === null || cur.end === null) cur.end = null;
        else if (s.end > cur.end) cur.end = s.end;
      } else {
        merged.push(cur);
        cur = Object.assign({}, s);
      }
    }
    if (cur) merged.push(cur);
  }
  // Safety: only one ongoing stay allowed - keep the most recent.
  const ongoing = merged.filter((s) => !s.end).sort((a, b) => b.start.localeCompare(a.start));
  for (let i = 1; i < ongoing.length; i++) ongoing[i].end = todayISO();
  merged.sort((a, b) => a.start.localeCompare(b.start));
  state.stays = merged;
}

// ---------- trip planning (simulator) ----------
// Timeline used for planning: real stays (ongoing ones capped at
// today — we assume you leave before a planned trip starts) plus
// all planned stays except the one being evaluated.
function planningStays(stays, plans, excludePlanId) {
  const list = stays.map((s) => ({ country: s.country, start: s.start, end: s.end || todayISO() }));
  for (const p of plans || []) {
    if (p.id !== excludePlanId) list.push({ country: p.country, start: p.start, end: p.end });
  }
  return list;
}

// Entering `startDate` and staying continuously in a country of
// `countrySet`, the last date you may stay without exceeding
// `limitDays` within any rolling `windowDays` window, given the
// other recorded/planned presence in `staysList`.
function maxStayFromDate(staysList, countrySet, limitDays, windowDays, startDate) {
  const horizon = limitDays + windowDays + 5;
  let date = startDate;
  for (let i = 0; i < horizon; i++) {
    const winStart = addDays(date, -(windowDays - 1));
    const dayMap = buildDayMap(staysList, date);
    let used = 0;
    for (let d = winStart; d <= date; d = addDays(d, 1)) {
      const rec = dayMap.get(d);
      const present = (d >= startDate && d <= date) ||
        (rec && [...rec].some((c) => countrySet.has(c)));
      if (present) used++;
    }
    if (used > limitDays) return addDays(date, -1);
    date = addDays(date, 1);
  }
  return addDays(startDate, horizon - 1);
}

// Evaluate one planned stay against real history + other plans.
// `rule` handling mirrors the visa cards: a tracked visa wins,
// otherwise the suggested rule for the passport.
function evaluatePlan(state, plan) {
  const tracked = state.visas.find((v) =>
    v.country === plan.country || (v.country === 'schengen' && SCHENGEN_COUNTRIES.has(plan.country)));
  const rule = tracked || suggestVisaRule(plan.country);
  const others = planningStays(state.stays, state.plans, plan.id);
  const len = daySpan(plan.start, plan.end);
  let maxEnd;
  if (SCHENGEN_COUNTRIES.has(plan.country)) {
    maxEnd = maxStayFromDate(others, SCHENGEN_COUNTRIES, SCHENGEN_DAYS, SCHENGEN_WINDOW, plan.start);
  } else if (rule.type === 'rolling') {
    maxEnd = maxStayFromDate(others, new Set([plan.country]), rule.days, rule.windowDays || 180, plan.start);
  } else {
    // perEntry / visaRequired: fixed allowance from entry.
    maxEnd = addDays(plan.start, rule.days - 1);
  }
  const allowed = maxEnd >= plan.start ? daySpan(plan.start, maxEnd) : 0;
  return {
    rule,
    ruleTracked: !!tracked,
    isSchengen: SCHENGEN_COUNTRIES.has(plan.country),
    len,
    maxEnd,
    allowed,
    ok: plan.end <= maxEnd,
    overBy: plan.end > maxEnd ? daySpan(maxEnd, plan.end) - 1 : 0,
  };
}

// ---------- stats ----------
function travelStats(stays) {
  const perCountry = daysPerCountry(stays);
  const visited = visitedCountries(stays);
  let totalDays = 0;
  for (const n of buildDayMap(stays).keys()) totalDays++;
  let longest = null;
  for (const s of stays) {
    const len = daySpan(s.start, stayEnd(s));
    if (!longest || len > longest.len) longest = { stay: s, len };
  }
  const top = [...perCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { perCountry, visited, totalDays, longest, top };
}
