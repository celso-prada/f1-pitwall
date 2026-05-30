import { SectionHeader } from './SectionHeader'

// Consolidates: <div className="card p-3/4"><SectionHeader .../>{children}</div>
export function Panel({ title, icon, right, children, className = '', padding = 'p-4' }) {
  return (
    <div className={`card ${padding} ${className}`}>
      {title && <SectionHeader title={title} icon={icon} right={right} />}
      {children}
    </div>
  )
}
