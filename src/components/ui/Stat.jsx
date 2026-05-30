// Unified stat card — replaces StatCard duplicates in TeamPage and DriverPage
export function Stat({ label, value, icon, color = 'var(--color-text)', className = '' }) {
  return (
    <div className={`card p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 stat-label" style={{ color }}>
        {icon}
        {label}
      </div>
      <div className="stat-value" style={{ color }}>{value ?? '—'}</div>
    </div>
  )
}
