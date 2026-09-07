// ============================================================
// Currency conversion to ILS.
// ------------------------------------------------------------
// Each expense is entered and displayed in the currency you
// actually paid in. The conversion is FROZEN onto the record at
// save time (amount + rate + the date the rate is for), so past
// totals never drift when the shekel moves, and every sum is
// plain addition with no async work in the render path.
//
// Rates come from @fawazahmed0/currency-api (free, no API key,
// historical by date, 200+ currencies). Resolution order:
//   cached -> rate on the expense's own date -> latest -> the
//   offline table in js/data/fx-rates.js.
// ============================================================

const FX = {
  BASE: 'ILS',
  KEY: 'travelTracker.fx.v1',
  _cache: null,   // { 'EUR@2026-07-08': 3.9612, ... }
  _meta: null,    // { updated: ISO string }

  // ---------- cache ----------
  _load() {
    if (this._cache) return;
    try {
      const raw = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      this._cache = (raw && raw.rates) || {};
      this._meta = (raw && raw.meta) || {};
    } catch (e) {
      this._cache = {};
      this._meta = {};
    }
  },
  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ rates: this._cache, meta: this._meta }));
    } catch (e) {
      console.warn('Could not cache FX rates:', e);
    }
  },
  lastUpdated() {
    this._load();
    return this._meta.updated || null;
  },
  clearCache() {
    this._cache = {};
    this._meta = {};
    this._save();
  },

  _key(cur, dateISO) {
    return `${cur.toUpperCase()}@${dateISO || 'latest'}`;
  },

  // ---------- network ----------
  // The API serves one JSON per base currency, keyed by lowercase
  // codes: { date, eur: { ils: 3.96, usd: 1.08, ... } }.
  async _fetchOne(cur, version) {
    const low = cur.toLowerCase();
    const hosts = [
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${low}.json`,
      `https://${version}.currency-api.pages.dev/v1/currencies/${low}.json`,
    ];
    for (const url of hosts) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        const table = json[low];
        const rate = table && table[this.BASE.toLowerCase()];
        if (typeof rate === 'number' && isFinite(rate) && rate > 0) {
          return { rate, date: json.date || version };
        }
      } catch (e) { /* try the next host */ }
    }
    return null;
  },

  // ---------- resolution ----------
  // Returns { rate, fxDate, source } where source is
  // 'cache' | 'dated' | 'latest' | 'fallback'.
  async resolve(cur, dateISO) {
    const code = (cur || '').toUpperCase();
    if (!code) return null;
    if (code === this.BASE) return { rate: 1, fxDate: dateISO || null, source: 'base' };

    this._load();

    const dayKey = this._key(code, dateISO);
    if (this._cache[dayKey]) {
      return { rate: this._cache[dayKey], fxDate: dateISO, source: 'cache' };
    }

    // Historical rate for the expense's own date.
    if (dateISO && dateISO <= todayISO()) {
      const hit = await this._fetchOne(code, dateISO);
      if (hit) {
        this._cache[dayKey] = hit.rate;
        this._meta.updated = new Date().toISOString();
        this._save();
        return { rate: hit.rate, fxDate: hit.date, source: 'dated' };
      }
    }

    // Newest published rate.
    const latestKey = this._key(code, 'latest');
    const cachedLatest = this._cache[latestKey];
    if (cachedLatest && this._isFresh()) {
      return { rate: cachedLatest, fxDate: this._meta.latestDate || null, source: 'cache' };
    }
    const latest = await this._fetchOne(code, 'latest');
    if (latest) {
      this._cache[latestKey] = latest.rate;
      this._meta.updated = new Date().toISOString();
      this._meta.latestDate = latest.date;
      this._save();
      return { rate: latest.rate, fxDate: latest.date, source: 'latest' };
    }

    // Offline / API unreachable.
    const fb = FX_FALLBACK_ILS[code];
    if (fb) return { rate: fb, fxDate: null, source: 'fallback' };
    return null;
  },

  _isFresh() {
    if (!this._meta.updated) return false;
    return Date.now() - new Date(this._meta.updated).getTime() < 12 * 3600 * 1000;
  },

  // Synchronous best guess, for live UI hints while typing.
  // Never hits the network; returns null if we know nothing.
  best(cur, dateISO) {
    const code = (cur || '').toUpperCase();
    if (!code) return null;
    if (code === this.BASE) return { rate: 1, source: 'base' };
    this._load();
    const dayKey = this._key(code, dateISO);
    if (this._cache[dayKey]) return { rate: this._cache[dayKey], source: 'cache' };
    const latest = this._cache[this._key(code, 'latest')];
    if (latest) return { rate: latest, source: 'cache' };
    const fb = FX_FALLBACK_ILS[code];
    if (fb) return { rate: fb, source: 'fallback' };
    return null;
  },

  // ---------- writing onto an expense ----------
  // Fills in ils / fxRate / fxDate / fxSource. Mutates and returns
  // the expense. Safe to call repeatedly.
  async apply(expense) {
    const r = await this.resolve(expense.currency, expense.date);
    if (!r) {
      delete expense.ils;
      delete expense.fxRate;
      expense.fxSource = 'unknown';
      return expense;
    }
    expense.fxRate = r.rate;
    expense.fxDate = r.fxDate || expense.date || null;
    expense.fxSource = r.source;
    expense.ils = Math.round((Number(expense.amount) || 0) * r.rate * 100) / 100;
    return expense;
  },

  // Re-resolve only the expenses whose rate was a guess (offline
  // fallback or none at all). Rates that were fetched properly are
  // left frozen — that's the whole point of storing them.
  async refreshApprox(expenses) {
    this.clearCache();
    const stale = (expenses || []).filter((e) =>
      typeof e.ils !== 'number' || e.fxSource === 'fallback' || e.fxSource === 'unknown');
    for (const e of stale) delete e.ils;
    return this.backfill(stale);
  },

  // Backfill every expense that has no frozen conversion yet.
  // Groups by currency+date so each rate is fetched only once.
  // Returns the number of expenses updated.
  async backfill(expenses) {
    const todo = (expenses || []).filter((e) => typeof e.ils !== 'number');
    if (!todo.length) return 0;
    const groups = new Map();
    for (const e of todo) {
      const k = `${(e.currency || '').toUpperCase()}@${e.date || ''}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    let done = 0;
    for (const list of groups.values()) {
      const r = await this.resolve(list[0].currency, list[0].date);
      for (const e of list) {
        if (!r) { e.fxSource = 'unknown'; continue; }
        e.fxRate = r.rate;
        e.fxDate = r.fxDate || e.date || null;
        e.fxSource = r.source;
        e.ils = Math.round((Number(e.amount) || 0) * r.rate * 100) / 100;
        done++;
      }
    }
    return done;
  },
};
