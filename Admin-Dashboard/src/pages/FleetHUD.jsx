/**
 * pages/FleetHUD.jsx
 * Dedicated fleet tracking view — full map with active bus telemetry sidebar.
 */
import { Satellite, RefreshCw } from 'lucide-react'
import { useFleetData } from '../hooks/useFleetData'
import FleetMap from '../components/fleet/FleetMap'
import BusCard from '../components/fleet/BusCard'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'

export default function FleetHUD() {
  const { fleet, loading, error, lastUpdated, refresh } = useFleetData()

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <PageHeader
        title="Fleet Telemetry & Tracking"
        subtitle="10-second high frequency PostGIS GPS updates across Maharashtra"
        right={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 font-mono">
                Sync: {lastUpdated.toLocaleTimeString('en-IN')}
              </span>
            )}
            <StatusBadge online={!error} label={error ? 'BACKEND OFFLINE' : 'TELEMETRY LIVE'} />
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Establishing connection to bus telemetry stream...
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-6 text-sm max-w-md text-center">
            <p className="text-base font-bold mb-1 text-white">Connection Error</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
          {/* Main Map View */}
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">
            <FleetMap fleet={fleet} />
          </div>

          {/* Bus Telemetry Cards */}
          <div className="w-80 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Buses ({fleet.length})
              </span>
              <span className="text-[11px] text-slate-400">Live Status</span>
            </div>

            {fleet.length === 0 ? (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-center text-slate-400 text-xs">
                No active shifts currently broadcasting GPS.
              </div>
            ) : (
              fleet.map((bus) => <BusCard key={bus.shift_id} bus={bus} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}
