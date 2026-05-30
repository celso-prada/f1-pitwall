// Country flag emoji helper (uses built-in emoji flags)
export function FlagIcon({ code, size = 20 }) {
  if (!code) return null
  const emoji = code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  )
  return (
    <span style={{ fontSize: size, lineHeight: 1 }} title={code}>
      {emoji}
    </span>
  )
}
