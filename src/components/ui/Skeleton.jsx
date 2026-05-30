export function Skeleton({ height = 20, width = '100%', rounded = 4 }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: rounded }}
    />
  )
}

const WIDTHS = ['70%', '80%', '75%', '85%', '78%']

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={i === 0 ? 28 : 16} width={i === 0 ? '60%' : WIDTHS[i % WIDTHS.length]} />
      ))}
    </div>
  )
}
