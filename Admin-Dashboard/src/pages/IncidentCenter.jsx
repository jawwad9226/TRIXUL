/**
 * pages/IncidentCenter.jsx
 * Real-time emergency incidents & warnings triage center.
 * Displays conductor SOS alerts, breakdowns, accidents, and road blockages.
 */
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  MapPin,
  Bus,
  User,
  Clock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { useIncidents } from '../hooks/useIncidents'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

function IncidentCard({ inc }) {
  const isSOS = inc.severity === 'SOS'
  const isWarning = inc.severity === 'WARNING'

  return (
    <div
      className={`rounded-xl p-4 border relative overflow-hidden transition-all shadow-md ${
        isSOS
          ? 'bg-red-500/10 border-red-500/40 text-red-200 shadow-red-900/10'
          : isWarning
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-blue-500/10 border-blue-500/40 text-blue-200'
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isSOS ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
        }`}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              isSOS
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            {inc.severity}
          </span>
          <span className="text-[10px] font-mono text-slate-400">{inc.incident_id}</span>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            inc.status === 'OPEN'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {inc.status}
        </span>
      </div>

      <p className="text-sm font-semibold text-white mb-2">{inc.message}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-400 border-t border-slate-700/60 pt-2.5">
        <span className="flex items-center gap-1 text-slate-300">
          <Bus className="w-3.5 h-3.5 text-trixul-accent" />
          <span>{inc.bus_number}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{inc.conductor_name}</span>
        </span>
        <span className="flex items-center gap-1 text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span>{inc.route_name}</span>
        </span>
      </div>

      {inc.location && (
        <p className="text-[11px] text-slate-400 font-mono mt-2 bg-slate-900/60 px-2 py-1 rounded border border-slate-700/40">
          📍 GPS Fix: {inc.location.latitude.toFixed(5)}, {inc.location.longitude.toFixed(5)}
        </p>
      )}

      <p className="text-[10px] text-slate-500 text-right mt-2 font-mono">
        Logged: {new Date(inc.timestamp).toLocaleString('en-IN')}
      </p>
    </div>
  )
}

export default function IncidentCenter() {
  const { incidents, loading, error, hasOpenSOS, refresh } = useIncidents()

  const openIncidents = incidents.filter((i) => i.status === 'OPEN')
  const resolvedIncidents = incidents.filter((i) => i.status !== 'OPEN')

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={hasOpenSOS ? '🚨 Incident Center — ACTIVE EMERGENCY' : 'Incident Center & Safety Alerts'}
        subtitle="Live safety dispatch: SOS alarms, accident reports, and highway obstruction alerts from conductors."
        right={
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {loading && <p className="text-slate-400 text-xs py-4">Checking incident queue...</p>}
      {error && <p className="text-red-400 text-xs py-4">{error}</p>}

      {!loading && incidents.length === 0 && (
        <Card className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-white font-semibold text-sm">No Active Emergency Alarms</p>
          <p className="text-xs text-slate-400 mt-1">Conductor telemetry and SOS signals are clear.</p>
        </Card>
      )}

      {/* Active Incidents */}
      {openIncidents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            <span>Active Incidents ({openIncidents.length})</span>
          </h2>
          {openIncidents.map((inc) => (
            <IncidentCard key={inc.incident_id} inc={inc} />
          ))}
        </div>
      )}

      {/* Resolved Incidents */}
      {resolvedIncidents.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Resolved Incident History ({resolvedIncidents.length})
          </h2>
          {resolvedIncidents.map((inc) => (
            <IncidentCard key={inc.incident_id} inc={inc} />
          ))}
        </div>
      )}
    </div>
  )
}
