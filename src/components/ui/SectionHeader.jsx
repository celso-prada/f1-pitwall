export function SectionHeader({ title, right, icon }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--color-f1)' }}>{icon}</span>}
        <span className="section-title">{title}</span>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
