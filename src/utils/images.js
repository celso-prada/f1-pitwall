// Central image registry — maps IDs to actual filenames in public/images/
// Cars: WebP renders in /images/cars/. Circuits: in /images/Circuits/.
// Spaces handled with encodeURIComponent.

const CAR_MAP = {
  mclaren:          'McLaren.webp',
  ferrari:          'Ferrari.webp',
  red_bull:         'Red Bull.webp',
  red_bull_racing:  'Red Bull.webp',
  mercedes:         'Mercedes.webp',
  aston_martin:     'Aston Martin.webp',
  alpine:           'Alpine.webp',
  williams:         'Williams.webp',
  haas:             'Haas.webp',
  rb:               'Racing Bull.webp',
  racing_bulls:     'Racing Bull.webp',
  audi:             'Audi.webp',
  // Sauber rebranded as Audi em 2026 — mesma arte
  sauber:           'Audi.webp',
  kick_sauber:      'Audi.webp',
  cadillac:         'Cadillac.webp',
}

const CIRCUIT_MAP = {
  albert_park:   'Albert Park.webp',
  americas:      'Americas.webp',
  rodriguez:     'Autódromo Hermanos Rodríguez.webp',
  bahrain:       'Bahrain International Circuit.webp',
  baku:          'Baku City Circuit.webp',
  catalunya:     'Circuit de Barcelona-Catalunya.webp',
  villeneuve:    'Circuit Gilles-Villeneuve.webp',
  zandvoort:     'Circuit Zandvoort.webp',
  hungaroring:   'Hungaroring.webp',
  interlagos:    'Interlagos.webp',
  jeddah:        'Jeddah Corniche Circuit.webp',
  vegas:         'Las Vegas Strip Circuit.webp',
  losail:        'Lusail International Circuit.webp',
  madrid:        'Madring_Madrid Street Circuit.webp',
  marina_bay:    'Marina Bay Street Circuit.webp',
  miami:         'Miami International Autodrome.webp',
  monaco:        'Monaco.webp',
  monza:         'Monza.webp',
  red_bull_ring: 'Red Bull Ring.webp',
  shanghai:      'Shanghai International Circuit.webp',
  silverstone:   'Silverstone.webp',
  spa:           'Spa-Francorchamps.webp',
  suzuka:        'Suzuka.webp',
  yas_marina:    'Yas Marina.webp',
  // Sem imagem ainda
  imola:         null,
}

// Cache-buster for car art. Filenames are reused when art is replaced, so the
// browser/CDN would otherwise keep serving the old image. Bump this whenever a
// car render is updated to force a fresh fetch.
const CARS_VERSION = 3

export function getCarImage(constructorId) {
  const file = CAR_MAP[constructorId?.toLowerCase()]
  if (!file) return null
  return `/images/cars/${encodeURIComponent(file)}?v=${CARS_VERSION}`
}

export function getCircuitImage(circuitId) {
  const file = CIRCUIT_MAP[circuitId?.toLowerCase()]
  if (!file) return null
  return `/images/Circuits/${encodeURIComponent(file)}`
}

export const HERO_BG             = '/images/hero-bg.png'
export const PITWALL_BG          = '/images/pitwall-bg.png'
export const CARBON_BG           = '/images/carbon-bg.png'
export const DRIVER_PLACEHOLDER  = '/images/driver-placeholder.png'
