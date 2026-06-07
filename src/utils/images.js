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

// Arquivos nomeados pelo PRÓPRIO circuitId (ASCII, minúsculo, sem espaço/acento).
// Nomes "bonitos" com espaço/acento (ex.: "Albert Park.webp") funcionavam no dev
// (Windows/Vite) mas falhavam servidos pela Vercel/CDN em produção — por isso a
// imagem do Albert Park não aparecia. Manter o nome == circuitId elimina essa
// classe de bug e dispensa qualquer encoding.
const CIRCUIT_MAP = {
  albert_park:   'albert_park.webp',
  americas:      'americas.webp',
  rodriguez:     'rodriguez.webp',
  bahrain:       'bahrain.webp',
  baku:          'baku.webp',
  catalunya:     'catalunya.webp',
  villeneuve:    'villeneuve.webp',
  zandvoort:     'zandvoort.webp',
  hungaroring:   'hungaroring.webp',
  interlagos:    'interlagos.webp',
  jeddah:        'jeddah.webp',
  vegas:         'vegas.webp',
  losail:        'losail.webp',
  // A Jolpica usa o circuitId "madring"; o f1api usa "madrid" — mapeia os dois.
  madrid:        'madring.webp',
  madring:       'madring.webp',
  marina_bay:    'marina_bay.webp',
  miami:         'miami.webp',
  monaco:        'monaco.webp',
  monza:         'monza.webp',
  red_bull_ring: 'red_bull_ring.webp',
  shanghai:      'shanghai.webp',
  silverstone:   'silverstone.webp',
  spa:           'spa.webp',
  suzuka:        'suzuka.webp',
  yas_marina:    'yas_marina.webp',
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

export const HERO_BG             = '/images/hero-bg.webp'
export const PITWALL_BG          = '/images/pitwall-bg.webp'
export const CARBON_BG           = '/images/carbon-bg.webp'
export const DRIVER_PLACEHOLDER  = '/images/driver-placeholder.webp'
