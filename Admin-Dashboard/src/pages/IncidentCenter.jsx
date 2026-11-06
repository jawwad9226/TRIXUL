/**
 * pages/IncidentCenter.jsx
 * Emergency Triage & Incident Center.
 * Fetches real-time SOS alerts and road warnings sent by conductors.
 * Crucial Fix: Implements an "Acknowledge / Resolve" workflow where clicking
 * "Acknowledge" sends PATCH /api/v1/admin/incidents/<id>/acknowledge/ to silence the alarm.
 */
import { useState } from 'react'
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
  Check,
  Radio,
} from 'lucide-react'
import { useIncidents } from '../hooks/useIncidents'
import { acknowledgeIncident } from '../api/admin'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

function IncidentCard({ inc, onAcknowledge, acknowledgingId }) {
  const isSOS = inc.severity === 'SOS'
  const isWarning = inc.severity === 'WARNING'
  const isOpen = inc.status === 'OPEN'
  const isAcknowledged = inc.status === 'ACKNOWLEDGED'
  const isResolving = acknowledgingId === inc.incident_id

  return (
    <div
      className={`rounded-xl p-4 border relative overflow-hidden transition-all shadow-md ${
        isSOS && isOpen
          ? 'bg-red-500/10 border-red-500/40 text-red-200 shadow-red-900/10'
          : isWarning && isOpen
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-slate-850 bg-slate-900/60 border-slate-700/80 text-slate-300'
      }`}
    >
      {/* Accent Indicator Bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isSOS && isOpen
            ? 'bg-red-500 animate-pulse'
            : isWarning && isOpen
            ? 'bg-amber-500'
            : isAcknowledged
            ? 'bg-blue-400'
            : 'bg-slate-600'
        }`}
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
              isSOS && isOpen
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : isWarning && isOpen
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {inc.severity}
          </span>
          <span className="text-[10px] font-mono text-slate-400">{inc.incident_id}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
              isOpen
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : isAcknowledged
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {inc.status}
          </span>

          {/* Acknowledge Button for Open Incidents */}
          {isOpen && (
            <button
              onClick={() => onAcknowledge(inc.incident_id)}
              disabled={isResolving}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-lg font-semibold transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isResolving ? 'Silencing...' : 'Acknowledge'}</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-white mb-2">{inc.message}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-400 border-t border-slate-700/60 pt-2.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Bus className="w-3.5 h-3.5 text-trixul-accent" />
          <span>Bus {inc.bus_number}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{inc.conductor_name}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-300 truncate">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span>{inc.route_name}</span>
        </span>
      </div>

      {inc.location && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-2 bg-slate-950/70 px-2.5 py-1 rounded border border-slate-800">
          <MapPin className="w-3 h-3 text-red-400" />
          <span>GPS Coordinates: {inc.location.latitude.toFixed(5)}, {inc.location.longitude.toFixed(5)}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
        <span>Shift ID: {inc.shift_id}</span>
        <span>Logged: {new Date(inc.timestamp).toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}

export default function IncidentCenter() {
  const { incidents, loading, error, hasOpenSOS, refresh } = useIncidents()
  const [acknowledgingId, setAcknowledgingId] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)

  const handleAcknowledge = async (incidentId) => {
    setAcknowledgingId(incidentId)
    try {
      await acknowledgeIncident(incidentId)
      setActionNotice(`Incident ${incidentId} acknowledged. Alarm silenced in Control Room.`)
      await refresh()
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to acknowledge incident')
    } finally {
      setAcknowledgingId(null)
    }
  }

  const openIncidents = incidents.filter((i) => i.status === 'OPEN')
  const acknowledgedOrResolved = incidents.filter((i) => i.status !== 'OPEN')

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={hasOpenSOS ? '🚨 Incident Center — ACTIVE EMERGENCY' : 'Emergency Triage & Safety Incident Center'}
        subtitle="Real-time conductor SOS alerts, road blockages, and safety alarms. Acknowledge alarms to silence emergency signals."
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

      {/* Action Notification */}
      {actionNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {loading && <p className="text-slate-400 text-xs py-4">Checking incident queue...</p>}
      {error && <p className="text-red-400 text-xs py-4">{error}</p>}

      {!loading && incidents.length === 0 && (
        <Card className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-white font-semibold text-sm">No Emergency Alarms</p>
          <p className="text-xs text-slate-400 mt-1">All conductor telemetry and road alerts are quiet.</p>
        </Card>
      )}

      {/* ── Active (Open) Incidents ────────────────────────────────────────── */}
      {openIncidents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            <span>Active Incidents Requiring Action ({openIncidents.length})</span>
          </h2>
          {openIncidents.map((inc) => (
            <IncidentCard
              key={inc.incident_id}
              inc={inc}
              onAcknowledge={handleAcknowledge}
              acknowledgingId={acknowledgingId}
            />
          ))}
        </div>
      )}

      {/* ── Acknowledged & Resolved Incidents History ──────────────────────── */}
      {acknowledgedOrResolved.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Incident History & Acknowledged Logs ({acknowledgedOrResolved.length})
          </h2>
          {acknowledgedOrResolved.map((inc) => (
            <IncidentCard
              key={inc.incident_id}
              inc={inc}
              onAcknowledge={handleAcknowledge}
              acknowledgingId={acknowledgingId}
            />
          ))}
        </div>
      )}

    </div>
  )
}
