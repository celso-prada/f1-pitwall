// Renders a country flag SVG via flag-icons CSS library (no emoji — works on Windows)
export function Flag({ code, size = 16, className = '' }) {
  if (!code) return null
  return (
    <span
      className={`fi fi-${code.toLowerCase()} ${className}`}
      style={{ fontSize: size, lineHeight: 1, display: 'inline-block', flexShrink: 0 }}
      aria-label={code.toUpperCase()}
      role="img"
    />
  )
}
