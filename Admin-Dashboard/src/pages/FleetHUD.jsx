/**
 * pages/FleetHUD.jsx
 * Dedicated Full-Screen Leaflet Map view consuming GET /api/v1/admin/fleet/.
 * Auto-polls every 10 seconds for real-time bus telemetry markers.
 * Markers pulse blue (moving) or red (SOS/Overloaded).
 * Clicking opens a popup with Bus Registration, Conductor, Speed, Occupancy, and Revenue.
 */
import { Satellite, RefreshCw, Bus, AlertTriangle, Layers } from 'lucide-react'
import { useFleetData } from '../hooks/useFleetData'
import FleetMap from '../components/fleet/FleetMap'

export default function FleetHUD() {
  const { fleet, summary, loading, error, lastUpdated, refresh } = useFleetData()

  const overloadedCount = fleet.filter((b) => b.is_critical).length
  const movingCount = fleet.filter((b) => (b.last_seen?.speed || 0) > 0).length

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
      
      {/* Floating Control HUD Overlay */}
      <div className="absolute top-4 left-4 z-[500] flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
          <Satellite className="w-4 h-4 text-trixul-accent animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">FLEET RADAR</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Bus className="w-3.5 h-3.5 text-blue-400" />
            <span>Active: <strong className="text-white">{fleet.length}</strong></span>
          </span>

          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span>Moving: <strong>{movingCount}</strong></span>
          </span>

          {overloadedCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overloaded: {overloadedCount}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
          <span className="text-[11px] font-mono text-slate-400">
            {lastUpdated ? lastUpdated.toLocaleTimeString('en-IN') : 'Syncing...'} (10s poll)
          </span>
          <button
            onClick={refresh}
            title="Refresh Fleet Map"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-lg text-xs space-y-1 shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
          <span>Blue Pulse: In Transit / Normal</span>
        </div>
        <div className="flex items-center gap-2 text-red-400 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
          <span>Red Pulse: SOS / Overloaded (&ge;45 Pax)</span>
        </div>
      </div>

      {/* Loading & Error Overlays */}
      {loading && fleet.length === 0 && (
        <div className="absolute inset-0 z-[600] bg-slate-950/80 flex items-center justify-center text-slate-300 text-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-trixul-accent" />
            <span>Connecting to PostGIS Live Telemetry Grid...</span>
          </div>
        </div>
      )}

      {error && fleet.length === 0 && (
        <div className="absolute inset-0 z-[600] bg-slate-950/90 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-6 text-center max-w-md">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-base font-bold text-white mb-1">Telemetry Signal Lost</h4>
            <p className="text-xs mb-4">{error}</p>
            <button
              onClick={refresh}
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded-lg"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Full-Screen Leaflet Map */}
      <div className="flex-1 w-full h-full">
        <FleetMap fleet={fleet} interactive={true} />
      </div>

    </div>
  )
}
