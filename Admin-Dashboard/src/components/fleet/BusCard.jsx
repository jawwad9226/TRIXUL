/**
 * components/fleet/BusCard.jsx
 * Compact telemetry card for individual active buses in the fleet.
 */
import { Bus, User, Gauge, Users, Banknote } from 'lucide-react'

export default function BusCard({ bus }) {
  const loc = bus.last_seen
  const stats = bus.live_stats
  const isAlert = bus.is_critical || (loc && loc.speed === 0)

  return (
    <div className={`border rounded-xl p-3.5 space-y-2.5 transition-all ${
      isAlert
        ? 'bg-slate-800/90 border-red-500/40 shadow-md shadow-red-900/10'
        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
          <Bus className="w-3.5 h-3.5 text-trixul-accent" />
          <span>{bus.bus_number}</span>
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isAlert
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {bus.status}
        </span>
      </div>

      {/* Route & Conductor */}
      <div className="text-[11px] text-slate-300 space-y-0.5">
        <p className="font-medium text-white truncate">{bus.route_name}</p>
        <p className="text-slate-400 flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400" />
          <span>{bus.conductor_name} ({bus.conductor_id})</span>
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/80 text-center">
        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/50">
          <p className="text-[9px] text-slate-400 uppercase">Speed</p>
          <p className="text-xs font-bold text-white">
            {loc ? `${loc.speed?.toFixed(0)} km/h` : '—'}
          </p>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/50">
          <p className="text-[9px] text-slate-400 uppercase">Pax</p>
          <p className="text-xs font-bold text-white">
            {stats?.passengers_today ?? 0}
          </p>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/50">
          <p className="text-[9px] text-slate-400 uppercase">Revenue</p>
          <p className="text-xs font-bold text-emerald-400 font-mono">
            ₹{stats?.revenue_today?.toFixed(0) ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}
