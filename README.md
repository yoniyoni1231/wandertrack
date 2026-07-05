# 🌍 WanderTrack — Travel & Visa Tracker

A personal web app to track where you've been, for how many days, and how many
visa days you have left — including the Schengen 90/180 rolling-window rule.

## Features

- 🗺️ **World map** — countries you've visited fill in with color; click for details
- 📍 **"I'm here now" check-in** — counts your days automatically and suggests
  the visa rule for your passport (editable)
- 📅 **Calendar** — every day colored by country; click any day to fix history
- 🧳 **Trips** — log past travel as country + date range
- 🛂 **Visa tracking** — days used / days left with progress rings and warnings,
  including the shared Schengen 90-days-in-180 calculation
- 💾 **Your data stays yours** — saved in your browser, one-click JSON backup

## Run it

No installation needed — it's pure HTML/CSS/JavaScript.

- Open `index.html` in any browser, **or**
- Serve it: `python -m http.server 8123` and open http://localhost:8123

## Disclaimer

Preloaded visa rules (currently for the Israeli passport) are best-effort
suggestions. Rules change often — always verify with official sources.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
