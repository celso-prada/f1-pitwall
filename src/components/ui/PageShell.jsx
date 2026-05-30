// Full-width page wrapper — replaces all the narrow max-w-2xl/3xl/4xl/6xl containers
export function PageShell({ children, title, subtitle, actions, className = '' }) {
  return (
    <div className={`w-full max-w-[1800px] mx-auto px-4 lg:px-6 py-5 space-y-4 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-3xl font-display font-bold uppercase tracking-wide text-text leading-tight">
                {title}
              </h1>
            )}
            {subtitle && <p className="text-text-mute text-sm mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0 mt-1">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
