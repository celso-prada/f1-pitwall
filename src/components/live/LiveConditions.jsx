import { Thermometer, Droplets, Wind, CloudRain } from 'lucide-react'

function Item({ icon, label, value, unit }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-mute">{icon}</span>
      <div>
        <div className="num text-sm font-semibold text-text tabular-nums">{value ?? '—'}<span className="text-text-mute text-xs">{unit}</span></div>
        <div className="text-[9px] uppercase tracking-widest text-text-mute">{label}</div>
      </div>
    </div>
  )
}

export function LiveConditions({ weather }) {
  if (!weather) return <div className="text-text-mute text-sm">—</div>
  const raining = Number(weather.rainfall) > 0
  return (
    <div className="grid grid-cols-2 gap-3">
      <Item icon={<Thermometer size={15} />} label="Ar" value={weather.airTemp} unit="°C" />
      <Item icon={<Thermometer size={15} />} label="Pista" value={weather.trackTemp} unit="°C" />
      <Item icon={<Droplets size={15} />} label="Umidade" value={weather.humidity} unit="%" />
      <Item icon={<Wind size={15} />} label="Vento" value={weather.windSpeed} unit=" m/s" />
      <Item
        icon={<CloudRain size={15} className={raining ? 'text-sky-400' : ''} />}
        label="Chuva"
        value={raining ? 'Sim' : 'Não'}
        unit=""
      />
      <Item icon={<Thermometer size={15} />} label="Pressão" value={weather.pressure} unit=" hPa" />
    </div>
  )
}
