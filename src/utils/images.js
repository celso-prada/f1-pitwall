// Central image registry — maps IDs to actual filenames in public/images/
// Cars: flat in /images/. Circuits: in /images/Circuits/. Spaces handled with encodeURIComponent.

const CAR_MAP = {
  mclaren:          'McLaren.png',
  ferrari:          'Ferrari.png',
  red_bull:         'Red Bull.png',
  red_bull_racing:  'Red Bull.png',
  mercedes:         'Mercedes.png',
  aston_martin:     'Aston Martin.png',
  alpine:           'Alpine.png',
  williams:         'Williams.png',
  // Sem imagem ainda
  haas:             null,
  rb:               null,
  racing_bulls:     null,
  sauber:           null,
  kick_sauber:      null,
  audi:             null,
  cadillac:         null,
}

const CIRCUIT_MAP = {
  albert_park:   'Albert Park.png',
  americas:      'Americas.png',
  rodriguez:     'Autódromo Hermanos Rodríguez.png',
  bahrain:       'Bahrain International Circuit.png',
  baku:          'Baku City Circuit.png',
  catalunya:     'Circuit de Barcelona-Catalunya.png',
  villeneuve:    'Circuit Gilles-Villeneuve.png',
  zandvoort:     'Circuit Zandvoort.png',
  hungaroring:   'Hungaroring.png',
  interlagos:    'Interlagos.png',
  jeddah:        'Jeddah Corniche Circuit.png',
  vegas:         'Las Vegas Strip Circuit.png',
  losail:        'Lusail International Circuit.png',
  madrid:        'Madring_Madrid Street Circuit.png',
  marina_bay:    'Marina Bay Street Circuit.png',
  miami:         'Miami International Autodrome.png',
  monaco:        'Monaco.png',
  monza:         'Monza.png',
  red_bull_ring: 'Red Bull Ring.png',
  shanghai:      'Shanghai International Circuit.png',
  silverstone:   'Silverstone.png',
  spa:           'Spa-Francorchamps.png',
  suzuka:        'Suzuka.png',
  yas_marina:    'Yas Marina.png',
  // Sem imagem ainda
  imola:         null,
}

export function getCarImage(constructorId) {
  const file = CAR_MAP[constructorId?.toLowerCase()]
  if (!file) return null
  return `/images/${encodeURIComponent(file)}`
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
