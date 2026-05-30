// Central image registry — maps IDs to actual filenames in public/images/
// All files are .png, flat in /images/ (no subfolders). Spaces handled with encodeURIComponent.

const CAR_MAP = {
  mclaren:       'McLaren.png',
  ferrari:       'Ferrari.png',
  red_bull:      'Red Bull.png',
  red_bull_racing: 'Red Bull.png',
  mercedes:      'Mercedes.png',
  aston_martin:  'Aston Martin.png',
  alpine:        'Alpine.png',
  williams:      'Williams.png',
  // Sem imagem ainda
  haas:          null,
  rb:            null,
  racing_bulls:  null,
  sauber:        null,
  kick_sauber:   null,
  audi:          null,
  cadillac:      null,
}

const CIRCUIT_MAP = {
  monaco:        'Monaco.png',
  interlagos:    'Interlagos.png',
  silverstone:   'Silverstone.png',
  monza:         'Monza.png',
  suzuka:        'Suzuka.png',
  spa:           'Spa-Francorchamps.png',
  yas_marina:    'Yas Marina.png',
  americas:      'Americas.png',
  // Sem imagem ainda
  albert_park:   null,
  bahrain:       null,
  jeddah:        null,
  miami:         null,
  villeneuve:    null,
  red_bull_ring: null,
  hungaroring:   null,
  zandvoort:     null,
  marina_bay:    null,
  baku:          null,
  rodriguez:     null,
  losail:        null,
  vegas:         null,
  imola:         null,
  catalunya:     null,
  shanghai:      null,
}

export function getCarImage(constructorId) {
  const file = CAR_MAP[constructorId?.toLowerCase()]
  if (!file) return null
  return `/images/${encodeURIComponent(file)}`
}

export function getCircuitImage(circuitId) {
  const file = CIRCUIT_MAP[circuitId?.toLowerCase()]
  if (!file) return null
  return `/images/${encodeURIComponent(file)}`
}

export const HERO_BG      = '/images/hero-bg.png'
export const PITWALL_BG   = '/images/pitwall-bg.png'
export const CARBON_BG    = '/images/carbon-bg.png'
export const DRIVER_PLACEHOLDER = '/images/driver-placeholder.png'
