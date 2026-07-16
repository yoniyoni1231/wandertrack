// ============================================================
// Storage layer - localStorage today, cloud-ready tomorrow.
// All reads/writes go through this object, so switching to a
// cloud backend (e.g. Supabase) later only means replacing the
// implementations below - nothing else in the app changes.
// ============================================================

const STORAGE_KEY = 'travelTracker.v1';

const Storage = {
  defaultState() {
    return {
      version: 1,
      profile: { passport: 'il', name: '' },
      // stays: where you physically were.
      // { id, country: 'th', start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' | null }
      // end === null means "I'm still here" (ongoing).
      stays: [],
      // visas: what you're allowed.
      // { id, country: 'th' | 'schengen', type, days, windowDays,
      //   entryDate, validTo, note }
      visas: [],
      // plans: hypothetical future stays for the trip simulator.
      // { id, country, start, end } — never mixed into real stats.
      plans: [],
      // expenses: money spent, linked to trips.
      // { id, stayId, date, category, amount, currency, note }
      expenses: [],
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaultState();
      const state = JSON.parse(raw);
      if (!state || state.version !== 1) return this.defaultState();
      return Object.assign(this.defaultState(), state);
    } catch (e) {
      console.error('Failed to load saved data:', e);
      return this.defaultState();
    }
  },

  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  exportJSON(state) {
    return JSON.stringify(state, null, 2);
  },

  // Returns the imported state, or throws with a friendly message.
  importJSON(text) {
    const state = JSON.parse(text);
    if (!state || typeof state !== 'object' || !Array.isArray(state.stays)) {
      throw new Error('This file does not look like a Travel Tracker backup.');
    }
    return Object.assign(this.defaultState(), state, { version: 1 });
  },
};
