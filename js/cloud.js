// ============================================================
// Cloud sync (Supabase) — login + cross-device data sync.
// Local storage stays as the offline cache; when logged in,
// every change is also pushed to the cloud (debounced), and
// newer cloud data is pulled on login and on window focus.
// Conflict policy: last write wins (single-user app).
// ============================================================

const Cloud = {
  sb: null,          // supabase client
  user: null,
  lastSyncedAt: null,
  syncState: 'off',  // 'off' (not configured) | 'out' | 'in' | 'syncing' | 'error'
  _pushTimer: null,
  _statusMsg: '',

  configured() {
    return !!(typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY);
  },

  init() {
    if (!this.configured() || !window.supabase) { this.syncState = 'off'; return; }
    this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.syncState = 'out';
    this.sb.auth.onAuthStateChange((_event, session) => {
      const wasLoggedOut = !this.user;
      this.user = (session && session.user) || null;
      if (this.user) {
        this.syncState = 'in';
        if (wasLoggedOut) this.syncOnLogin();
      } else {
        this.syncState = 'out';
      }
      if (typeof renderAccountCard === 'function') renderAccountCard();
    });
    // Pull newer data when returning to the app.
    window.addEventListener('focus', () => { if (this.user) this.pullIfNewer(); });
  },

  // ---------- auth ----------
  async signUp(email, password) {
    const { data, error } = await this.sb.auth.signUp({ email, password });
    if (error) throw error;
    // If email confirmation is on, there's a user but no session yet.
    if (data.user && !data.session) return 'confirm-email';
    return 'ok';
  },
  async signIn(email, password) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return 'ok';
  },
  async signOut() {
    await this.sb.auth.signOut();
    this.user = null;
    this.syncState = 'out';
  },

  // ---------- sync ----------
  async fetchCloud() {
    const { data, error } = await this.sb
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', this.user.id)
      .maybeSingle();
    if (error) throw error;
    return data; // null if the user has no cloud data yet
  },

  async push(currentState) {
    if (!this.user) return;
    this.syncState = 'syncing';
    if (typeof renderAccountCard === 'function') renderAccountCard();
    try {
      const now = new Date().toISOString();
      const { error } = await this.sb.from('user_data').upsert({
        user_id: this.user.id,
        data: currentState,
        updated_at: now,
      });
      if (error) throw error;
      this.lastSyncedAt = now;
      this.syncState = 'in';
      this._statusMsg = '';
    } catch (e) {
      console.error('Cloud push failed:', e);
      this.syncState = 'error';
      this._statusMsg = e.message || 'Sync failed';
    }
    if (typeof renderAccountCard === 'function') renderAccountCard();
  },

  // Debounced push — call this from persist(); groups rapid edits.
  pushSoon(currentState) {
    if (!this.user) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this.push(currentState), 1200);
  },

  // On login: decide between cloud data and this device's data.
  async syncOnLogin() {
    try {
      const cloud = await this.fetchCloud();
      const localEmpty = !state.stays.length && !state.visas.length;
      if (cloud && cloud.data) {
        const cloudState = Object.assign(Storage.defaultState(), cloud.data);
        const cloudEmpty = !cloudState.stays.length && !cloudState.visas.length;
        let useCloud = true;
        if (!localEmpty && !cloudEmpty &&
            JSON.stringify(cloudState.stays) !== JSON.stringify(state.stays)) {
          useCloud = confirm(
            `Found your cloud data (last saved ${new Date(cloud.updated_at).toLocaleString()}).\n\n` +
            'OK = load the cloud data on this device (recommended)\n' +
            'Cancel = keep THIS device\'s data and overwrite the cloud');
        }
        if (useCloud && !cloudEmpty) {
          state = cloudState;
          Storage.save(state);
          this.lastSyncedAt = cloud.updated_at;
          renderAll();
        } else {
          await this.push(state);
        }
      } else if (!localEmpty) {
        // First login from the device that has the data: seed the cloud.
        await this.push(state);
      } else {
        this.lastSyncedAt = new Date().toISOString();
      }
      this.syncState = 'in';
    } catch (e) {
      console.error('Sync on login failed:', e);
      this.syncState = 'error';
      this._statusMsg = e.message || 'Sync failed';
    }
    if (typeof renderAccountCard === 'function') renderAccountCard();
  },

  // Pull only if the cloud copy is newer than what we last synced.
  async pullIfNewer() {
    try {
      const cloud = await this.fetchCloud();
      if (cloud && cloud.data && (!this.lastSyncedAt || cloud.updated_at > this.lastSyncedAt)) {
        state = Object.assign(Storage.defaultState(), cloud.data);
        Storage.save(state);
        this.lastSyncedAt = cloud.updated_at;
        renderAll();
        if (typeof renderAccountCard === 'function') renderAccountCard();
      }
    } catch (e) {
      console.error('Cloud pull failed:', e);
    }
  },
};
