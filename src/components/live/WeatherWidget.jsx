import { motion } from 'framer-motion'
import { Thermometer, Droplets, Wind, Gauge, CloudRain } from 'lucide-react'
import { formatWindDir } from '../../utils/format'
import { Skeleton } from '../ui/Skeleton'

function WeatherStat({ icon, label, value, color = 'var(--color-text)' }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ color, opacity: 0.7 }}>{icon}</div>
      <div className="num text-base font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] text-text-mute uppercase tracking-wider">{label}</div>
    </div>
  )
}

export function WeatherWidget({ weather, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton height={16} width={16} rounded={8} />
            <Skeleton height={20} width={40} />
            <Skeleton height={10} width={30} />
          </div>
        ))}
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="text-center text-text-mute py-4 text-sm">
        Dados meteorológicos indisponíveis
      </div>
    )
  }

  const trackTemp  = weather.track_temperature
  const trackColor = trackTemp > 45 ? '#ef4444'
    : trackTemp > 35 ? '#f97316'
    : trackTemp > 25 ? '#eab308'
    : '#60a5fa'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {weather.rainfall > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <CloudRain size={14} className="text-blue-400" aria-hidden />
          <span className="text-blue-400 text-xs font-semibold">CHUVA NA PISTA</span>
          <span className="num text-blue-300 text-xs ml-auto">{weather.rainfall}mm</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <WeatherStat icon={<Thermometer size={16} />} label="Ar"      value={`${weather.air_temperature?.toFixed(1)}°`}  color="var(--color-text)" />
        <WeatherStat icon={<Thermometer size={16} />} label="Pista"   value={`${weather.track_temperature?.toFixed(1)}°`} color={trackColor} />
        <WeatherStat icon={<Droplets size={16} />}    label="Umidade" value={`${weather.humidity?.toFixed(0)}%`}          color="#60a5fa" />
        <WeatherStat icon={<Wind size={16} />}        label="Vento"   value={`${weather.wind_speed?.toFixed(1)} m/s`}     color="#a78bfa" />
        <WeatherStat icon={<span className="num text-xs font-bold">↑</span>} label="Direção" value={formatWindDir(weather.wind_direction)} color="#a78bfa" />
        <WeatherStat icon={<Gauge size={16} />}       label="Pressão" value={`${weather.pressure?.toFixed(0)}`}           color="#34d399" />
      </div>
    </motion.div>
  )
}
