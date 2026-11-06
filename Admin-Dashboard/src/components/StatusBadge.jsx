/**
 * components/StatusBadge.jsx
 * Operational status badge with live animated indicator.
 */
export default function StatusBadge({ online = true, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border
        ${online
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      {label ?? (online ? 'ONLINE' : 'OFFLINE')}
    </span>
  )
}
