// Centralized nationality → ISO-3166-1 alpha-2 code mappings
export const DRIVER_NAT_CODE = {
  British: 'GB', Dutch: 'NL', Spanish: 'ES', Monegasque: 'MC',
  Mexican: 'MX', Australian: 'AU', Canadian: 'CA', Brazilian: 'BR',
  French: 'FR', German: 'DE', Finnish: 'FI', Japanese: 'JP',
  American: 'US', Chinese: 'CN', Thai: 'TH', Danish: 'DK',
  Italian: 'IT', Austrian: 'AT', Argentine: 'AR', Swiss: 'CH',
  'New Zealander': 'NZ', Polish: 'PL',
}

export const CONSTRUCTOR_NAT_CODE = {
  British: 'GB', Italian: 'IT', German: 'DE', French: 'FR',
  American: 'US', Austrian: 'AT', Swiss: 'CH',
}

// circuitId → OpenF1 circuit_short_name (exact string for API queries)
export const CIRCUIT_OPENF1_NAME = {
  bahrain: 'Bahrain',
  jeddah: 'Jeddah',
  albert_park: 'Albert Park',
  suzuka: 'Suzuka',
  shanghai: 'Shanghai',
  miami: 'Miami',
  imola: 'Imola',
  monaco: 'Monaco',
  villeneuve: 'Montréal',
  catalunya: 'Catalunya',
  red_bull_ring: 'Red Bull Ring',
  silverstone: 'Silverstone',
  hungaroring: 'Hungaroring',
  spa: 'Spa-Francorchamps',
  zandvoort: 'Zandvoort',
  monza: 'Monza',
  baku: 'Baku',
  marina_bay: 'Marina Bay',
  americas: 'Circuit of the Americas',
  rodriguez: 'Hermanos Rodríguez',
  interlagos: 'Interlagos',
  vegas: 'Las Vegas',
  losail: 'Lusail',
  yas_marina: 'Yas Marina',
}

// circuitId → ISO country code (lowercase for flag-icons)
export const CIRCUIT_COUNTRY = {
  bahrain: 'bh', jeddah: 'sa', albert_park: 'au', suzuka: 'jp',
  shanghai: 'cn', miami: 'us', imola: 'it', monaco: 'mc',
  villeneuve: 'ca', catalunya: 'es', red_bull_ring: 'at',
  silverstone: 'gb', hungaroring: 'hu', spa: 'be',
  zandvoort: 'nl', monza: 'it', baku: 'az', marina_bay: 'sg',
  americas: 'us', rodriguez: 'mx', interlagos: 'br',
  vegas: 'us', losail: 'qa', yas_marina: 'ae',
}
