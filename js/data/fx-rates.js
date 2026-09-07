// ============================================================
// Offline fallback exchange rates — ILS per 1 unit of currency.
// ------------------------------------------------------------
// These are ONLY used when a live rate can't be fetched (no
// internet, CDN down, or a date the rate API doesn't cover).
// Anything converted with these is flagged `fxSource:'fallback'`
// and shown as approximate, so it's obvious the number is rough.
// Live rates come from js/fx.js and are cached per currency+date.
// ============================================================

const FX_FALLBACK_ILS = {
  ILS: 1,
  USD: 3.65, EUR: 3.95, GBP: 4.65, CHF: 4.25,
  JPY: 0.024, THB: 0.105, AUD: 2.35, CAD: 2.60, NZD: 2.15,
  TRY: 0.09, GEL: 1.35, AED: 0.995, INR: 0.042,
  VND: 0.00014, IDR: 0.00022, PHP: 0.063, MYR: 0.82, SGD: 2.72,
  KRW: 0.0026, TWD: 0.113, CNY: 0.505,
  MXN: 0.185, BRL: 0.65, ARS: 0.0030, CLP: 0.0038, PEN: 0.98,
  COP: 0.00088, CRC: 0.0070,
  ZAR: 0.195, MAD: 0.37, EGP: 0.075,
  CZK: 0.158, PLN: 0.92, HUF: 0.0100, RON: 0.795, RSD: 0.0337,
  ALL: 0.0395, BGN: 2.02, DKK: 0.53, NOK: 0.34, SEK: 0.345, ISK: 0.0265,
};
