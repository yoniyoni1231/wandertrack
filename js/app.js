// ============================================================
// WanderTrack UI
// ============================================================

let state = Storage.load();
function persist() {
  Storage.save(state);
  Cloud.pushSoon(state); // no-op when not logged in
}

// ---------- country catalogue (parsed from the map itself) ----------
const COUNTRIES = {};
(function buildCountries() {
  const doc = new DOMParser().parseFromString(WORLD_MAP_SVG, 'image/svg+xml');
  doc.querySelectorAll('path[id]').forEach((p) => {
    const iso = p.getAttribute('id');
    const name = (p.getAttribute('name') || iso).replace(/\s+/g, ' ').trim();
    COUNTRIES[iso] = { name, flag: flagEmoji(iso) };
  });
})();

function flagEmoji(iso2) {
  if (!/^[a-z]{2}$/.test(iso2)) return '🏳️';
  if (iso2 === 'xk') return '🇽🇰';
  const base = 0x1f1e6;
  return String.fromCodePoint(base + iso2.charCodeAt(0) - 97, base + iso2.charCodeAt(1) - 97);
}
function countryName(iso) {
  if (iso === 'schengen') return 'Schengen area';
  return (COUNTRIES[iso] && COUNTRIES[iso].name) || iso.toUpperCase();
}
function countryFlag(iso) {
  if (iso === 'schengen') return '🇪🇺';
  return (COUNTRIES[iso] && COUNTRIES[iso].flag) || '🏳️';
}

// ---------- colors ----------
const PALETTE = [
  '#ff6b6b', '#f7a325', '#17b3a6', '#4aa8ff', '#8a5cf6',
  '#ec5fa4', '#2fbf71', '#ff8c42', '#00a8cc', '#c05cf7',
  '#e4508f', '#5fb849', '#f45d48', '#2a9d8f', '#6c7ae0', '#d9a509',
];
function colorFor(iso) {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ---------- date formatting ----------
function fmtDate(iso) {
  if (!iso) return '';
  return parseISO(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

// ---------- modal helper ----------
function openModal(innerHTML) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${innerHTML}</div>`;
  root.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
  return { el: overlay.firstElementChild, close };
}

// ---------- country picker ----------
// Renders an input that searches countries; calls onPick(iso2).
function setupCountryPicker(container, onPick, opts = {}) {
  const input = container.querySelector('input');
  const list = container.querySelector('.country-list');
  let entries = Object.keys(COUNTRIES)
    .filter((iso) => /^[a-z]{2}$|^xk$/.test(iso))
    .map((iso) => ({ iso, name: COUNTRIES[iso].name, flag: COUNTRIES[iso].flag }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (opts.includeSchengen) {
    entries = [{ iso: 'schengen', name: 'Schengen area (all of it)', flag: '🇪🇺' }].concat(entries);
  }
  function show(filter) {
    const f = (filter || '').toLowerCase();
    const hits = entries.filter((e) => e.name.toLowerCase().includes(f) || e.iso === f).slice(0, 60);
    list.innerHTML = hits.map((e) =>
      `<div class="country-option" data-iso="${e.iso}">${e.flag} ${e.name}</div>`).join('') ||
      '<div class="country-option">No match…</div>';
    list.hidden = false;
  }
  input.addEventListener('focus', () => show(input.value === input.dataset.label ? '' : input.value));
  input.addEventListener('input', () => { delete input.dataset.iso; show(input.value); });
  list.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('.country-option');
    if (!opt || !opt.dataset.iso) return;
    const iso = opt.dataset.iso;
    input.value = `${countryFlag(iso)} ${countryName(iso)}`;
    input.dataset.iso = iso;
    input.dataset.label = input.value;
    list.hidden = true;
    onPick(iso);
  });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 150));
  return {
    get value() { return input.dataset.iso || null; },
    set value(iso) {
      input.dataset.iso = iso;
      input.value = `${countryFlag(iso)} ${countryName(iso)}`;
      input.dataset.label = input.value;
    },
  };
}
function pickerHTML(placeholder) {
  return `<div class="country-picker">
    <input type="text" placeholder="${placeholder || 'Type a country…'}" autocomplete="off">
    <div class="country-list" hidden></div>
  </div>`;
}

// ============================================================
// RENDERING
// ============================================================
function renderAll() {
  renderHeader();
  renderCurrentStatus();
  renderStats();
  renderMapColors();
  renderCalendar();
  renderTrips();
  renderVisas();
}

// ---------- header ----------
function renderHeader() {
  const chip = document.getElementById('current-location-chip');
  const cur = currentStay(state.stays);
  if (cur) {
    const days = daySpan(cur.start, todayISO());
    chip.textContent = `${countryFlag(cur.country)} ${countryName(cur.country)} · day ${days}`;
    chip.hidden = false;
  } else {
    chip.hidden = true;
  }
}

// ---------- current stay box (main screen) ----------
// Finds the visa that applies to the country you're in right now:
// the country's own tracked visa, or the Schengen tracker for
// Schengen countries (auto-created from stays if not saved yet).
function visaForCountry(iso) {
  const own = state.visas.find((v) => v.country === iso);
  if (own) return own;
  if (SCHENGEN_COUNTRIES.has(iso)) {
    return state.visas.find((v) => v.country === 'schengen') || {
      id: '_auto_schengen', country: 'schengen', type: 'schengen',
      days: SCHENGEN_DAYS, windowDays: SCHENGEN_WINDOW,
    };
  }
  return null;
}

function renderCurrentStatus() {
  const box = document.getElementById('current-status');
  if (!box) return;
  const cur = currentStay(state.stays);

  if (!cur) {
    box.innerHTML = `
      <div class="card current-status cs-empty">
        <div class="cs-country">🏠 Not checked in</div>
        <p class="muted">Tell the app where you are and it will count your days and visa allowance for you.</p>
        <button class="btn btn-primary" id="cs-checkin">📍 I'm here now</button>
      </div>`;
    box.querySelector('#cs-checkin').onclick = () => openCheckInModal();
    return;
  }

  const daysHere = daySpan(cur.start, todayISO());
  const visa = visaForCountry(cur.country);
  let visaHTML;
  if (visa) {
    const st = visaStatus(visa, state.stays);
    const pct = Math.min(100, Math.round((st.used / st.total) * 100));
    const leaveBy = visa.type === 'schengen'
      ? schengenLastSafeDay(state.stays)
      : (visa.type === 'perEntry' || visa.type === 'visaRequired')
        ? addDays(visa.entryDate || cur.start, st.total - 1)
        : null;
    const badge = st.severity === 'danger'
      ? '<span class="badge badge-danger">CHECK NOW</span>'
      : st.severity === 'warn' ? '<span class="badge badge-warn">RUNNING LOW</span>'
      : '<span class="badge badge-ok">OK</span>';
    const visaName = visa.country === 'schengen' ? 'Schengen 90/180' : 'visa';
    visaHTML = `
      <div class="cs-visa">
        <div class="cs-visa-line"><b class="sev-${st.severity}">${st.left} visa days left</b> ${badge}</div>
        <div class="cs-bar"><div class="cs-bar-fill sevbg-${st.severity}" style="width:${Math.max(3, pct)}%"></div></div>
        <div class="cs-sub">${st.used} of ${st.total} used (${visaName})${leaveBy ? ` · must leave by <b>${fmtDate(leaveBy)}</b>` : ''}</div>
      </div>`;
  } else {
    visaHTML = `
      <div class="cs-visa">
        <div class="cs-visa-line muted">No visa tracked for this country</div>
        <button class="btn btn-secondary btn-small" id="cs-addvisa">🛂 Track visa</button>
      </div>`;
  }

  box.innerHTML = `
    <div class="card current-status">
      <div class="cs-left">
        <div class="cs-flag">${countryFlag(cur.country)}</div>
        <div>
          <div class="cs-country">${countryName(cur.country)}</div>
          <div class="cs-sub">since ${fmtDate(cur.start)}</div>
        </div>
      </div>
      <div class="cs-days"><b>${daysHere}</b><span>day${daysHere === 1 ? '' : 's'} here</span></div>
      ${visaHTML}
    </div>`;
  const addBtn = box.querySelector('#cs-addvisa');
  if (addBtn) addBtn.onclick = () => openCheckInModal(cur.country);
}

// ---------- stats ----------
function renderStats() {
  const s = travelStats(state.stays);
  const cur = currentStay(state.stays);
  const pct = Math.min(100, Math.round((s.visited.size / 195) * 100));
  const cards = [
    { accent: '#ff5e7e', value: s.visited.size, label: 'countries visited', sub: `${pct}% of the world` },
    { accent: '#17b3a6', value: s.totalDays, label: 'days on the road', sub: '' },
    cur
      ? { accent: '#4aa8ff', value: `${countryFlag(cur.country)}`, label: `now in ${countryName(cur.country)}`, sub: `day ${daySpan(cur.start, todayISO())}` }
      : { accent: '#4aa8ff', value: '🏠', label: 'not checked in', sub: 'tap "I\'m here now"' },
    s.longest
      ? { accent: '#8a5cf6', value: s.longest.len, label: 'longest stay (days)', sub: `${countryFlag(s.longest.stay.country)} ${countryName(s.longest.stay.country)}` }
      : { accent: '#8a5cf6', value: '—', label: 'longest stay', sub: 'add your first trip!' },
  ];
  document.getElementById('stats-row').innerHTML = cards.map((c) => `
    <div class="stat-card" style="--accent:${c.accent}">
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
      ${c.sub ? `<div class="stat-sub">${c.sub}</div>` : ''}
    </div>`).join('');

  // top countries
  const topEl = document.getElementById('top-countries');
  if (!s.top.length) {
    topEl.innerHTML = '<h2>🏆 Most days</h2><p class="muted">Your top countries will appear here once you add trips.</p>';
  } else {
    const max = s.top[0][1];
    topEl.innerHTML = '<h2>🏆 Most days</h2>' + s.top.map(([iso, days]) => `
      <div class="top-row">
        <div class="top-flag">${countryFlag(iso)}</div>
        <div class="top-name">${countryName(iso)}</div>
        <div class="top-bar-track"><div class="top-bar" style="width:${Math.max(4, (days / max) * 100)}%;background:${colorFor(iso)}"></div></div>
        <div class="top-days">${days} day${days === 1 ? '' : 's'}</div>
      </div>`).join('');
  }
}

// ---------- map ----------
function initMap() {
  const container = document.getElementById('world-map-container');
  container.innerHTML = WORLD_MAP_SVG;
  const tooltip = document.getElementById('map-tooltip');
  container.addEventListener('mousemove', (e) => {
    const path = e.target.closest('path[id]');
    if (!path) { tooltip.hidden = true; return; }
    const iso = path.id;
    const days = daysPerCountry(state.stays).get(iso) || 0;
    tooltip.innerHTML = `${countryFlag(iso)} <b>${countryName(iso)}</b><br>${
      days ? `${days} day${days === 1 ? '' : 's'} spent here` : 'Not visited yet'}`;
    tooltip.hidden = false;
    tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - 240) + 'px';
    tooltip.style.top = (e.clientY + 16) + 'px';
  });
  container.addEventListener('mouseleave', () => { tooltip.hidden = true; });
  container.addEventListener('click', (e) => {
    const path = e.target.closest('path[id]');
    if (path) openCountryModal(path.id);
  });
}

function renderMapColors() {
  const container = document.getElementById('world-map-container');
  const counts = daysPerCountry(state.stays);
  const cur = currentStay(state.stays);
  container.querySelectorAll('path[id]').forEach((p) => {
    const iso = p.id;
    if (counts.has(iso)) p.style.fill = colorFor(iso);
    else p.style.fill = '';
    p.classList.toggle('current', !!(cur && cur.country === iso));
  });
}

// ---------- country details modal ----------
function openCountryModal(iso) {
  const counts = daysPerCountry(state.stays);
  const days = counts.get(iso) || 0;
  const stays = state.stays.filter((st) => st.country === iso).sort((a, b) => b.start.localeCompare(a.start));
  const rule = suggestVisaRule(iso);
  const staysHTML = stays.length
    ? stays.map((st) => `<div class="trip-dates">• ${fmtDate(st.start)} → ${st.end ? fmtDate(st.end) : 'ongoing'} (${daySpan(st.start, stayEnd(st))} days)</div>`).join('')
    : '<p class="muted">No recorded visits yet.</p>';
  const m = openModal(`
    <h2>${countryFlag(iso)} ${countryName(iso)}</h2>
    <p class="muted">${days ? `${days} total day${days === 1 ? '' : 's'} here` : 'Not visited yet'}</p>
    ${staysHTML}
    <div class="suggestion">
      <h3>🛂 Visa rule for your passport</h3>
      <p class="muted">${describeRule(rule)}</p>
      ${rule.note ? `<p class="muted">${rule.note}</p>` : ''}
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" data-act="trip">🧳 Add past trip</button>
      <button class="btn btn-primary" data-act="checkin">📍 I'm here now</button>
    </div>`);
  m.el.querySelector('[data-act="checkin"]').onclick = () => { m.close(); openCheckInModal(iso); };
  m.el.querySelector('[data-act="trip"]').onclick = () => { m.close(); openTripModal(null, iso); };
}

function describeRule(rule) {
  if (rule.type === 'schengen') return `Schengen: ${rule.days} days in any rolling ${rule.windowDays}-day window (shared across all Schengen countries).`;
  if (rule.type === 'rolling') return `${rule.days} days within a rolling ${rule.windowDays || 180}-day window.`;
  if (rule.type === 'visaRequired') return `Visa required in advance — typical stay once granted: ${rule.days} days.`;
  return `${rule.days} days allowed per entry.`;
}

// ============================================================
// CHECK-IN FLOW
// ============================================================
function openCheckInModal(prefillIso) {
  const m = openModal(`
    <h2>📍 Where are you?</h2>
    <label class="field"><span>Country</span>${pickerHTML('Type a country…')}</label>
    <label class="field"><span>Arrival date</span><input type="date" id="ci-date" value="${todayISO()}"></label>
    <div id="ci-suggestion"></div>
    <div class="btn-row">
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="save">Check in</button>
    </div>`);
  const sugEl = m.el.querySelector('#ci-suggestion');
  let rule = null;
  const picker = setupCountryPicker(m.el.querySelector('.country-picker'), (iso) => {
    rule = suggestVisaRule(iso);
    sugEl.innerHTML = renderRuleEditor(rule, iso);
  });
  if (prefillIso) {
    picker.value = prefillIso;
    rule = suggestVisaRule(prefillIso);
    sugEl.innerHTML = renderRuleEditor(rule, prefillIso);
  }
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = () => {
    const iso = picker.value;
    if (!iso || iso === 'schengen') { alert('Please pick a country.'); return; }
    const date = m.el.querySelector('#ci-date').value || todayISO();
    checkIn(state, iso, date);
    const track = m.el.querySelector('#rule-track');
    if (track && track.checked) {
      upsertVisaFromEditor(m.el, iso, date);
    }
    persist(); renderAll(); m.close();
  };
}

// Editable visa-rule card used in check-in + visa modals.
function renderRuleEditor(rule, iso) {
  const isSch = rule.type === 'schengen';
  return `
    <div class="suggestion">
      <h3>🛂 Suggested visa rule — ${isSch ? '🇪🇺 Schengen area' : `${countryFlag(iso)} ${countryName(iso)}`}</h3>
      <p class="muted">${describeRule(rule)}${rule.note ? ' · ' + rule.note : ''}</p>
      <div class="field-inline">
        <label class="field"><span>Rule type</span>
          <select id="rule-type">
            <option value="perEntry" ${rule.type === 'perEntry' ? 'selected' : ''}>Days per entry</option>
            <option value="rolling" ${rule.type === 'rolling' ? 'selected' : ''}>Rolling window</option>
            <option value="schengen" ${isSch ? 'selected' : ''}>Schengen 90/180</option>
            <option value="visaRequired" ${rule.type === 'visaRequired' ? 'selected' : ''}>Visa required</option>
          </select>
        </label>
        <label class="field"><span>Days allowed</span><input type="number" id="rule-days" value="${rule.days}" min="1"></label>
        <label class="field"><span>Window (days)</span><input type="number" id="rule-window" value="${rule.windowDays || 180}" min="1"></label>
      </div>
      <label class="field"><span>Note</span><input type="text" id="rule-note" value="${(rule.note || '').replace(/"/g, '&quot;')}"></label>
      <label><input type="checkbox" id="rule-track" checked> Track this visa for me</label>
    </div>`;
}

function upsertVisaFromEditor(rootEl, iso, entryDate) {
  const type = rootEl.querySelector('#rule-type').value;
  const days = parseInt(rootEl.querySelector('#rule-days').value, 10) || 90;
  const windowDays = parseInt(rootEl.querySelector('#rule-window').value, 10) || 180;
  const note = rootEl.querySelector('#rule-note').value.trim();
  const key = type === 'schengen' ? 'schengen' : iso;
  let visa = state.visas.find((v) => v.country === key);
  if (!visa) {
    visa = { id: newId(), country: key };
    state.visas.push(visa);
  }
  Object.assign(visa, { type, days, windowDays, note, entryDate: entryDate || todayISO() });
}

// ============================================================
// CALENDAR
// ============================================================
let calCursor = (() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() }; })();

function renderCalendar() {
  const { y, m } = calCursor;
  document.getElementById('cal-title').textContent =
    new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const first = new Date(Date.UTC(y, m, 1));
  const startDow = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayMap = buildDayMap(state.stays);
  const today = todayISO();
  const seen = new Set();
  let html = '';
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const countries = [...(dayMap.get(iso) || [])];
    countries.forEach((c) => seen.add(c));
    let style = '';
    let cls = 'cal-day';
    if (countries.length === 1) {
      style = `background:${colorFor(countries[0])}`;
      cls += ' filled';
    } else if (countries.length > 1) {
      const c1 = colorFor(countries[0]); const c2 = colorFor(countries[1]);
      style = `background:linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
      cls += ' filled';
    }
    if (iso === today) cls += ' today';
    if (iso > today) cls += ' future';
    const flag = countries.length ? `<span class="cal-flag">${countries.map(countryFlag).join('')}</span>` : '';
    html += `<div class="${cls}" style="${style}" data-date="${iso}"><span>${d}</span>${flag}</div>`;
  }
  document.getElementById('cal-grid').innerHTML = html;
  document.getElementById('cal-legend').innerHTML = [...seen].map((iso) => `
    <span class="legend-item"><span class="legend-swatch" style="background:${colorFor(iso)}"></span>${countryFlag(iso)} ${countryName(iso)}</span>`).join('');
}

function openDayModal(dateISO) {
  const dayMap = buildDayMap(state.stays);
  const countries = [...(dayMap.get(dateISO) || [])];
  const m = openModal(`
    <h2>📅 ${fmtDate(dateISO)}</h2>
    <p class="muted">${countries.length
      ? 'You were in: ' + countries.map((c) => `${countryFlag(c)} ${countryName(c)}`).join(', ')
      : 'No country recorded for this day.'}</p>
    <label class="field"><span>Set country for this day</span>${pickerHTML()}</label>
    <div class="btn-row">
      ${countries.length ? '<button class="btn btn-danger" data-act="clear">Clear day</button>' : ''}
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="save">Save</button>
    </div>`);
  const picker = setupCountryPicker(m.el.querySelector('.country-picker'), () => {});
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  const clearBtn = m.el.querySelector('[data-act="clear"]');
  if (clearBtn) clearBtn.onclick = () => { setDayCountry(state, dateISO, null); persist(); renderAll(); m.close(); };
  m.el.querySelector('[data-act="save"]').onclick = () => {
    if (!picker.value || picker.value === 'schengen') { alert('Pick a country first.'); return; }
    setDayCountry(state, dateISO, picker.value);
    persist(); renderAll(); m.close();
  };
}

// ============================================================
// TRIPS
// ============================================================
function renderTrips() {
  const listEl = document.getElementById('trips-list');
  const stays = [...state.stays].sort((a, b) => b.start.localeCompare(a.start));
  if (!stays.length) {
    listEl.innerHTML = '<div class="empty-note">✈️ No trips yet.<br>Add your travel history with "＋ Add trip", or hit "I\'m here now" to start tracking.</div>';
    return;
  }
  listEl.innerHTML = stays.map((st) => `
    <div class="trip-row">
      <div class="trip-flag">${countryFlag(st.country)}</div>
      <div class="trip-main">
        <div class="trip-country">${countryName(st.country)}</div>
        <div class="trip-dates">${fmtDate(st.start)} → ${st.end ? fmtDate(st.end) : 'ongoing'}</div>
      </div>
      <div class="trip-days ${st.end ? '' : 'trip-ongoing'}">${daySpan(st.start, stayEnd(st))} days${st.end ? '' : ' · here now'}</div>
      <button class="icon-btn" data-edit="${st.id}" title="Edit">✏️</button>
      <button class="icon-btn" data-del="${st.id}" title="Delete">🗑️</button>
    </div>`).join('');
  listEl.querySelectorAll('[data-edit]').forEach((b) => {
    b.onclick = () => openTripModal(state.stays.find((s) => s.id === b.dataset.edit));
  });
  listEl.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = () => {
      const stay = state.stays.find((s) => s.id === b.dataset.del);
      if (confirm(`Delete this trip to ${countryName(stay.country)}?`)) {
        state.stays = state.stays.filter((s) => s.id !== stay.id);
        persist(); renderAll();
      }
    };
  });
}

function openTripModal(stay, prefillIso) {
  const isEdit = !!stay;
  const m = openModal(`
    <h2>${isEdit ? '✏️ Edit trip' : '🧳 Add trip'}</h2>
    <label class="field"><span>Country</span>${pickerHTML()}</label>
    <div class="field-inline">
      <label class="field"><span>From</span><input type="date" id="trip-start" value="${stay ? stay.start : ''}"></label>
      <label class="field"><span>To</span><input type="date" id="trip-end" value="${stay && stay.end ? stay.end : ''}"></label>
    </div>
    <label><input type="checkbox" id="trip-ongoing" ${stay && !stay.end ? 'checked' : ''}> I'm still there (ongoing)</label>
    <div class="btn-row">
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="save">Save trip</button>
    </div>`);
  const picker = setupCountryPicker(m.el.querySelector('.country-picker'), () => {});
  if (stay) picker.value = stay.country;
  else if (prefillIso) picker.value = prefillIso;
  const endInput = m.el.querySelector('#trip-end');
  const ongoing = m.el.querySelector('#trip-ongoing');
  const syncEnd = () => { endInput.disabled = ongoing.checked; };
  ongoing.onchange = syncEnd; syncEnd();
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = () => {
    const iso = picker.value;
    const start = m.el.querySelector('#trip-start').value;
    const end = ongoing.checked ? null : endInput.value;
    if (!iso || iso === 'schengen') { alert('Pick a country.'); return; }
    if (!start) { alert('Pick a start date.'); return; }
    if (end && end < start) { alert('End date is before start date.'); return; }
    if (!end && !ongoing.checked) { alert('Pick an end date or tick "ongoing".'); return; }
    if (isEdit) Object.assign(stay, { country: iso, start, end });
    else state.stays.push({ id: newId(), country: iso, start, end });
    normalizeStays(state);
    persist(); renderAll(); m.close();
  };
}

// ============================================================
// VISAS
// ============================================================
function renderVisas() {
  const listEl = document.getElementById('visas-list');
  const cards = [];

  // Auto Schengen card when there are Schengen stays but no record.
  const hasSchengenStays = state.stays.some((s) => SCHENGEN_COUNTRIES.has(s.country));
  const hasSchengenVisa = state.visas.some((v) => v.country === 'schengen');
  if (hasSchengenStays && !hasSchengenVisa) {
    const auto = { id: '_auto_schengen', country: 'schengen', type: 'schengen', days: SCHENGEN_DAYS, windowDays: SCHENGEN_WINDOW, note: 'Added automatically from your Schengen trips' };
    cards.push({ visa: auto, auto: true });
  }
  for (const v of state.visas) cards.push({ visa: v, auto: false });

  if (!cards.length) {
    listEl.innerHTML = '<div class="empty-note">🛂 No visas tracked yet.<br>Check in to a country or add a visa manually.</div>';
    return;
  }
  listEl.innerHTML = cards.map(({ visa, auto }) => visaCardHTML(visa, auto)).join('');
  listEl.querySelectorAll('[data-vedit]').forEach((b) => {
    b.onclick = () => openVisaModal(state.visas.find((v) => v.id === b.dataset.vedit));
  });
  listEl.querySelectorAll('[data-vdel]').forEach((b) => {
    b.onclick = () => {
      const visa = state.visas.find((v) => v.id === b.dataset.vdel);
      if (confirm(`Stop tracking the ${countryName(visa.country)} visa?`)) {
        state.visas = state.visas.filter((v) => v.id !== visa.id);
        persist(); renderAll();
      }
    };
  });
}

function visaCardHTML(visa, auto) {
  const st = visaStatus(visa, state.stays);
  const ringColor = st.severity === 'danger' ? 'var(--danger)' : st.severity === 'warn' ? 'var(--warn)' : 'var(--ok)';
  const frac = Math.min(1, st.used / st.total);
  const C = 2 * Math.PI * 32;
  const badge = st.severity === 'danger'
    ? '<span class="badge badge-danger">CHECK NOW</span>'
    : st.severity === 'warn' ? '<span class="badge badge-warn">RUNNING LOW</span>' : '<span class="badge badge-ok">OK</span>';
  const typeLabel = visa.type === 'schengen' ? `${visa.days} in ${visa.windowDays} rolling`
    : visa.type === 'rolling' ? `${visa.days} in ${visa.windowDays || 180} rolling`
    : `${visa.days} per entry`;
  return `
    <div class="visa-card">
      <svg class="visa-ring" width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r="32" fill="none" stroke="var(--line)" stroke-width="9"/>
        <circle cx="43" cy="43" r="32" fill="none" stroke="${ringColor}" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}"
          transform="rotate(-90 43 43)"/>
        <text x="43" y="41" text-anchor="middle">${st.left}</text>
        <text x="43" y="54" text-anchor="middle" class="ring-sub">days left</text>
      </svg>
      <div class="visa-info">
        <div class="visa-title">${countryFlag(visa.country)} ${countryName(visa.country)} ${badge}</div>
        <div class="visa-numbers"><b class="sev-${st.severity}">${st.used} used</b> / ${st.total} allowed · ${typeLabel}</div>
        <div class="visa-detail">${st.detail || ''}</div>
        ${visa.note ? `<div class="visa-note">${visa.note}</div>` : ''}
      </div>
      <div class="visa-actions">
        ${auto
          ? '<button class="icon-btn" data-vauto="1" title="Save as editable visa">📌</button>'
          : `<button class="icon-btn" data-vedit="${visa.id}" title="Edit">✏️</button>
             <button class="icon-btn" data-vdel="${visa.id}" title="Delete">🗑️</button>`}
      </div>
    </div>`;
}

function openVisaModal(visa) {
  const isEdit = !!visa;
  const rule = visa || { type: 'perEntry', days: 90, windowDays: 180, note: '' };
  const m = openModal(`
    <h2>${isEdit ? '✏️ Edit visa' : '🛂 Add visa'}</h2>
    <label class="field"><span>Country</span>${pickerHTML()}</label>
    <div id="visa-rule-editor">${renderRuleEditor(rule, visa ? visa.country : 'xx')}</div>
    <label class="field"><span>Entry date (for per-entry counting)</span>
      <input type="date" id="visa-entry" value="${(visa && visa.entryDate) || ''}"></label>
    <label class="field"><span>Visa valid until (optional)</span>
      <input type="date" id="visa-validto" value="${(visa && visa.validTo) || ''}"></label>
    <div class="btn-row">
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="save">Save visa</button>
    </div>`);
  const hideTrack = () => { m.el.querySelector('#rule-track').closest('label').style.display = 'none'; };
  hideTrack();
  const editorEl = m.el.querySelector('#visa-rule-editor');
  const picker = setupCountryPicker(m.el.querySelector('.country-picker'), (iso) => {
    if (!isEdit) { editorEl.innerHTML = renderRuleEditor(suggestVisaRule(iso), iso); hideTrack(); }
  }, { includeSchengen: true });
  if (visa) picker.value = visa.country;
  m.el.querySelector('[data-act="cancel"]').onclick = m.close;
  m.el.querySelector('[data-act="save"]').onclick = () => {
    const iso = picker.value;
    if (!iso) { alert('Pick a country.'); return; }
    const type = m.el.querySelector('#rule-type').value;
    const key = type === 'schengen' ? 'schengen' : iso;
    let target = visa || state.visas.find((v) => v.country === key);
    if (!target) { target = { id: newId(), country: key }; state.visas.push(target); }
    Object.assign(target, {
      country: key,
      type,
      days: parseInt(m.el.querySelector('#rule-days').value, 10) || 90,
      windowDays: parseInt(m.el.querySelector('#rule-window').value, 10) || 180,
      note: m.el.querySelector('#rule-note').value.trim(),
      entryDate: m.el.querySelector('#visa-entry').value || null,
      validTo: m.el.querySelector('#visa-validto').value || null,
    });
    persist(); renderAll(); m.close();
  };
}

// ============================================================
// ACCOUNT / CLOUD SYNC
// ============================================================
function renderAccountCard() {
  const card = document.getElementById('account-card');
  if (!card) return;

  if (!Cloud.configured()) {
    card.innerHTML = `
      <h2>☁️ Cloud sync</h2>
      <p class="muted">Not set up yet. Once connected to a (free) Supabase project, you'll be able
      to log in from your phone and laptop and see the same data everywhere.</p>`;
    return;
  }
  if (Cloud.syncState === 'off') {
    card.innerHTML = `
      <h2>☁️ Cloud sync</h2>
      <p class="muted">Couldn't load the sync library — check your internet connection.
      Your data is still saved on this device.</p>`;
    return;
  }

  if (!Cloud.user) {
    card.innerHTML = `
      <h2>☁️ Cloud sync — log in</h2>
      <p class="muted">Log in to keep your trips and visas synced across all your devices.</p>
      <label class="field"><span>Email</span><input type="email" id="acc-email" autocomplete="email"></label>
      <label class="field"><span>Password</span><input type="password" id="acc-pass" autocomplete="current-password"></label>
      <div class="btn-row" style="justify-content:flex-start">
        <button class="btn btn-primary" id="acc-signin">Log in</button>
        <button class="btn btn-secondary" id="acc-signup">Create account</button>
      </div>
      <p class="muted" id="acc-msg"></p>`;
    const msg = card.querySelector('#acc-msg');
    const creds = () => ({
      email: card.querySelector('#acc-email').value.trim(),
      pass: card.querySelector('#acc-pass').value,
    });
    card.querySelector('#acc-signin').onclick = async () => {
      const { email, pass } = creds();
      if (!email || !pass) { msg.textContent = 'Enter email and password.'; return; }
      msg.textContent = 'Logging in…';
      try { await Cloud.signIn(email, pass); msg.textContent = ''; }
      catch (e) { msg.textContent = '❌ ' + e.message; }
    };
    card.querySelector('#acc-signup').onclick = async () => {
      const { email, pass } = creds();
      if (!email || !pass) { msg.textContent = 'Enter email and a password (min 6 characters).'; return; }
      msg.textContent = 'Creating account…';
      try {
        const r = await Cloud.signUp(email, pass);
        msg.textContent = r === 'confirm-email'
          ? '📧 Check your email and click the confirmation link, then log in here.'
          : '';
      } catch (e) { msg.textContent = '❌ ' + e.message; }
    };
    return;
  }

  const status =
    Cloud.syncState === 'syncing' ? '🔄 Syncing…' :
    Cloud.syncState === 'error' ? `⚠️ Sync problem: ${Cloud._statusMsg}` :
    Cloud.lastSyncedAt ? `✅ Synced · ${new Date(Cloud.lastSyncedAt).toLocaleString()}` : '✅ Connected';
  card.innerHTML = `
    <h2>☁️ Cloud sync</h2>
    <p><b>${Cloud.user.email}</b></p>
    <p class="muted">${status}</p>
    <div class="btn-row" style="justify-content:flex-start">
      <button class="btn btn-secondary" id="acc-syncnow">🔄 Sync now</button>
      <button class="btn btn-danger" id="acc-signout">Log out</button>
    </div>`;
  card.querySelector('#acc-syncnow').onclick = async () => {
    await Cloud.push(state);
    await Cloud.pullIfNewer();
  };
  card.querySelector('#acc-signout').onclick = async () => {
    await Cloud.signOut();
    renderAccountCard();
  };
}

// ============================================================
// SETTINGS
// ============================================================
function initSettings() {
  const sel = document.getElementById('setting-passport');
  const opts = Object.keys(COUNTRIES)
    .filter((iso) => /^[a-z]{2}$/.test(iso))
    .sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name))
    .map((iso) => `<option value="${iso}">${COUNTRIES[iso].flag} ${COUNTRIES[iso].name}</option>`);
  sel.innerHTML = opts.join('');
  sel.value = state.profile.passport || 'il';
  sel.onchange = () => { state.profile.passport = sel.value; persist(); };

  document.getElementById('btn-export').onclick = () => {
    const blob = new Blob([Storage.exportJSON(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wandertrack-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  document.getElementById('import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = Storage.importJSON(reader.result);
        if (confirm('Replace all current data with this backup?')) {
          state = imported;
          persist(); renderAll();
          alert('Backup imported! ✅');
        }
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  document.getElementById('btn-clear').onclick = () => {
    if (confirm('Delete ALL trips and visas? This cannot be undone.') &&
        confirm('Really sure? Consider exporting a backup first.')) {
      state = Storage.defaultState();
      persist(); renderAll();
    }
  };
}

// ============================================================
// WIRING
// ============================================================
function initTabs() {
  document.getElementById('tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) =>
      p.classList.toggle('active', p.id === `tab-${tab.dataset.tab}`));
  });
}

function init() {
  initTabs();
  initMap();
  initSettings();
  Cloud.init();
  renderAccountCard();
  document.getElementById('btn-checkin').onclick = () => openCheckInModal();
  document.getElementById('btn-add-trip').onclick = () => openTripModal();
  document.getElementById('btn-add-visa').onclick = () => openVisaModal();
  document.getElementById('cal-prev').onclick = () => {
    calCursor.m--; if (calCursor.m < 0) { calCursor.m = 11; calCursor.y--; } renderCalendar();
  };
  document.getElementById('cal-next').onclick = () => {
    calCursor.m++; if (calCursor.m > 11) { calCursor.m = 0; calCursor.y++; } renderCalendar();
  };
  document.getElementById('cal-today').onclick = () => {
    const t = new Date(); calCursor = { y: t.getFullYear(), m: t.getMonth() }; renderCalendar();
  };
  document.getElementById('cal-grid').addEventListener('click', (e) => {
    const day = e.target.closest('.cal-day[data-date]');
    if (day) openDayModal(day.dataset.date);
  });
  // "Pin" the auto Schengen card into an editable saved visa.
  document.getElementById('visas-list').addEventListener('click', (e) => {
    if (e.target.closest('[data-vauto]')) {
      state.visas.push({
        id: newId(), country: 'schengen', type: 'schengen',
        days: SCHENGEN_DAYS, windowDays: SCHENGEN_WINDOW,
        note: '90 days in any 180-day window, all Schengen countries combined',
      });
      persist(); renderAll();
    }
  });
  renderAll();
}

init();
