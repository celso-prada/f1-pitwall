import { SectionHeader } from './SectionHeader'
import { ErrorBoundary } from './ErrorBoundary'

// Consolidates: <div className="card p-3/4"><SectionHeader .../>{children}</div>
// O conteúdo fica dentro de um ErrorBoundary (ROADMAP 1.4): se um painel quebra,
// só ele mostra o aviso — a página continua. Usa o `title` como rótulo do erro.
export function Panel({ title, icon, right, children, className = '', padding = 'p-4' }) {
  return (
    <div className={`card ${padding} ${className}`}>
      {title && <SectionHeader title={title} icon={icon} right={right} />}
      <ErrorBoundary label={title}>{children}</ErrorBoundary>
    </div>
  )
}
