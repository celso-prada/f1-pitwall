export function LiveBadge({ label = 'AO VIVO' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-red-900/50 bg-red-950/30">
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
      <span className="text-red-400 text-[10px] font-bold tracking-widest">{label}</span>
    </div>
  )
}
