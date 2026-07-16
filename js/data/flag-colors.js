// ============================================================
// Country color = dominant/most iconic flag color.
// Hand-tuned: where neighbours share a flag color (e.g. the
// Nordic crosses, Gulf greens), shades are nudged apart so the
// map stays readable. Countries not listed fall back to the
// hashed palette in app.js.
// ============================================================

const FLAG_COLORS = {
  // --- Europe ---
  al: '#E41E20', // red, double eagle
  ad: '#E3A400', // yellow band
  at: '#EF3340', // red-white-red
  ba: '#002F6C', // blue with stars
  be: '#F3C300', // black-YELLOW-red
  bg: '#00966E', // white-GREEN-red
  by: '#007C30', // green stripe
  ch: '#DA291C', // red, white cross
  cy: '#D57800', // copper island
  cz: '#11457E', // blue triangle
  de: '#3B3B3B', // black band (gold/red clash with neighbours)
  dk: '#C8102E', // red, white cross
  ee: '#0072CE', // blue-black-white
  es: '#AA151B', // red-yellow-red
  fi: '#002F6C', // navy cross
  fo: '#ED2939',
  fr: '#0055A4', // blue-white-red
  gb: '#C8102E', // union jack red
  ge: '#E8112D', // red crosses
  gg: '#C8102E',
  gi: '#DA000C',
  gr: '#0D5EAF', // blue-white stripes
  hr: '#E8112D', // red checkerboard
  hu: '#436F4D', // red-white-GREEN
  ie: '#169B62', // green band
  im: '#CF142B',
  is: '#02529C', // blue, red-white cross
  it: '#009246', // green band
  je: '#D21034',
  li: '#002B7F', // blue-red
  lt: '#FDB913', // YELLOW-green-red
  lu: '#00A3E0', // light blue band
  lv: '#9E3039', // maroon-white-maroon
  mc: '#CE1126', // red-white
  md: '#003DA5', // blue band, eagle
  me: '#C40308', // red, gold border
  mk: '#FFE600', // yellow sun on red
  mt: '#CF142B', // white-red
  nl: '#FF7900', // orange (national color)
  no: '#BA0C2F', // red, blue-white cross
  pl: '#D4213D', // white-red
  pt: '#046A38', // green hoist
  ro: '#FCD116', // blue-YELLOW-red
  rs: '#0C4076', // red-BLUE-white
  ru: '#0039A6', // white-BLUE-red
  se: '#006AA7', // blue, yellow cross
  si: '#005DA4', // white-blue-red
  sk: '#EE1C25', // white-blue-RED
  sm: '#5EB6E4', // light blue
  ua: '#FFD500', // blue-YELLOW
  va: '#FFE000', // yellow-white
  xk: '#244AA5', // blue, gold map

  // --- Middle East & Central Asia ---
  ae: '#00A651', // green band
  af: '#D32011',
  am: '#F2A800', // red-blue-ORANGE
  az: '#00B5E2', // light blue band
  bh: '#DA291C', // red-white zigzag
  il: '#0038B8', // blue star & stripes
  iq: '#A91E22',
  ir: '#239F40', // green band
  jo: '#CE1126', // red triangle
  kg: '#FF4B33', // red, yellow sun
  kw: '#00843D',
  kz: '#00AFCA', // turquoise
  lb: '#EE161F', // red bands, green cedar
  om: '#DB161B',
  ps: '#007A3D',
  qa: '#8A1538', // maroon
  sa: '#006C35', // green
  sy: '#007A3D',
  tj: '#006600',
  tm: '#00843D', // green
  tr: '#E30A17', // red, crescent
  uz: '#0099B5',
  ye: '#CE1126',

  // --- Africa ---
  ao: '#CC092F',
  bf: '#EF2B2D',
  bi: '#CE1126',
  bj: '#FCD116',
  bw: '#75AADB', // light blue
  cd: '#007FFF', // sky blue, yellow star
  cf: '#FFCE00',
  cg: '#009543',
  ci: '#F77F00', // ORANGE-white-green
  cm: '#007A5E',
  cv: '#003893',
  dj: '#6AB2E7',
  dz: '#006233', // green-white, red crescent
  eg: '#C09300', // gold eagle on red-white-black
  er: '#4189DD',
  et: '#078930', // GREEN-yellow-red
  ga: '#009E60',
  gh: '#FCD116', // red-GOLD-green, black star
  gm: '#0C1C8C', // blue band
  gn: '#CE1126', // RED-yellow-green
  gq: '#E32118',
  gw: '#FCD116',
  ke: '#922529', // dark red, shield
  km: '#3D8E33',
  lr: '#BF0A30', // red-white stripes
  ls: '#00209F',
  ly: '#2D2926', // black band
  ma: '#C1272D', // red, green star
  mg: '#F9423A',
  ml: '#14B53A', // GREEN-yellow-red
  mr: '#00A95C', // green, gold crescent
  mu: '#EA2839',
  mw: '#C8102E',
  mz: '#007168',
  na: '#D21034', // red diagonal
  ne: '#E05206', // ORANGE-white-green
  ng: '#008751', // green-white-green
  rw: '#00A1DE', // sky blue
  sc: '#FCD955',
  sd: '#D21034',
  sl: '#17B637',
  sn: '#00853F', // green-yellow-red, green star
  so: '#418FDE', // light blue, white star
  ss: '#0F47AF',
  st: '#12AD2B',
  sz: '#B10C0C',
  td: '#C60C30',
  tg: '#006A4E',
  tn: '#E70013', // red, crescent
  tz: '#1EB53A', // green, blue & black diagonal
  ug: '#FCDC04', // black-YELLOW-red, crane
  za: '#007749', // green Y
  zm: '#198A00',
  zw: '#FFD200',

  // --- Americas ---
  ag: '#FCD116',
  ar: '#75AADB', // sky blue-white
  bb: '#FFC726', // blue-GOLD-blue, trident
  bo: '#F4E400', // red-YELLOW-green
  br: '#009C3B', // green, yellow diamond
  bs: '#00ABC9', // aquamarine
  bz: '#003F87',
  ca: '#D80621', // red maple leaf
  cl: '#0033A0', // blue canton, red band
  co: '#FCD116', // YELLOW-blue-red
  cr: '#CE1126', // blue-white-RED
  cu: '#002A8F', // blue stripes, red triangle
  dm: '#006B3F',
  do: '#002D62', // blue-red cross
  ec: '#0072CE', // yellow-BLUE-red (yellow kept for Colombia)
  gd: '#CE1126',
  gt: '#4997D0', // sky blue-white
  gy: '#009E49', // green, golden arrow
  hn: '#0073CF', // blue-white-blue
  ht: '#D21034', // blue-RED
  jm: '#FED100', // gold saltire
  kn: '#009E49',
  lc: '#65CFFF',
  mx: '#006847', // GREEN-white-red
  ni: '#0067C6', // blue-white-blue
  pa: '#005293', // blue star quarter
  pe: '#D91023', // red-white-red
  pr: '#EF3340',
  py: '#D52B1E', // red-white-blue
  sr: '#C8102E', // red band
  sv: '#0F47AF', // blue-white-blue
  tt: '#DA1A35', // red, black diagonal
  us: '#3C3B6E', // navy canton
  uy: '#5B92E5', // blue stripes, sun
  vc: '#009E60',
  ve: '#CF142B', // yellow-blue-RED (yellow kept for Colombia)

  // --- Asia ---
  bd: '#006A4E', // dark green, red sun
  bn: '#F7E017', // yellow field
  bt: '#FF6720', // orange, dragon
  cn: '#DE2910', // red, gold stars
  hk: '#EC1B2E', // red, white flower
  id: '#E70011', // red-white
  in: '#FF9933', // saffron
  jp: '#BC002D', // red sun
  kh: '#E00025', // red band, Angkor Wat
  kp: '#ED1C27', // red field
  kr: '#0F64CD', // blue of taegeuk
  la: '#002868', // blue band, white moon
  lk: '#8D153A', // maroon, lion
  mm: '#FECB00', // yellow band
  mn: '#DA2032',
  mo: '#00785E', // teal, lotus
  mv: '#00843D', // green rectangle on red
  my: '#0032A0', // blue canton
  np: '#DC143C', // crimson pennants
  ph: '#0038A8', // blue band, sun
  pk: '#01411C', // dark green, crescent
  sg: '#EE2536', // red-white
  th: '#2D2A4A', // navy center band
  tw: '#000097', // navy canton on red
  vn: '#DA251D', // red, gold star

  // --- Oceania ---
  au: '#012169', // navy, Southern Cross
  fj: '#68BFE5', // light blue
  fm: '#75B2DD',
  ki: '#D21034',
  mh: '#E57200', // orange ray
  nr: '#002B7F',
  nz: '#1A1A1A', // black (silver fern)
  pg: '#CE1126', // red-black, bird of paradise
  pw: '#4AADD6', // light blue, yellow moon
  sb: '#0051BA',
  to: '#C10000',
  tv: '#5B97B1',
  vu: '#FDCE12', // yellow Y on red-green-black
  ws: '#CE1126',
};
