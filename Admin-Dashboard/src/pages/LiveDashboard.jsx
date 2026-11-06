/**
 * pages/LiveDashboard.jsx
 * Control & Monitoring Center — high-density executive HUD.
 * Blends real-time map telemetry, AI surge & idling monitors,
 * instant shift dispatch, and route occupancy capacity analytics.
 */
import { useState, useEffect } from 'react'
import {
  Satellite,
  Cpu,
  Link as LinkIcon,
  BarChart3,
  AlertTriangle,
  Gauge,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import FleetMap from '../components/fleet/FleetMap'
import { useFleetData } from '../hooks/useFleetData'
import { fetchDispatchOptions, createShift } from '../api/admin'

export default function LiveDashboard() {
  const { fleet, summary, occupancyAnalytics, aiAlerts, loading, error, refresh } = useFleetData()

  // Dispatch Form State
  const [dispatchOptions, setDispatchOptions] = useState({ conductors: [], buses: [], routes: [] })
  const [form, setForm] = useState({ emp_id: '', bus_id: '', route_id: '' })
  const [dispatching, setDispatching] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState(null)

  useEffect(() => {
    fetchDispatchOptions()
      .then((res) => {
        setDispatchOptions(res.data)
        if (res.data.conductors?.length) setForm((f) => ({ ...f, emp_id: res.data.conductors[0].emp_id }))
        if (res.data.buses?.length) setForm((f) => ({ ...f, bus_id: res.data.buses[0].bus_id }))
        if (res.data.routes?.length) setForm((f) => ({ ...f, route_id: res.data.routes[0].route_id }))
      })
      .catch((err) => console.error('Failed to load dispatch options:', err))
  }, [])

  const handleInstantDispatch = async (e) => {
    e.preventDefault()
    if (!form.emp_id || !form.bus_id || !form.route_id) return
    setDispatching(true)
    setDispatchSuccess(null)
    try {
      const res = await createShift(form)
      setDispatchSuccess(`Shift assigned to ${form.emp_id}! ETM app will synchronize on next sync.`)
      refresh()
      setTimeout(() => setDispatchSuccess(null), 5000)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch shift')
    } finally {
      setDispatching(false)
    }
  }

  // Format occupancy chart data
  const chartData = occupancyAnalytics.length > 0
    ? occupancyAnalytics.map((item) => ({
        name: item.route_name.split('(')[0].trim(),
        passengers: item.passengers,
        seatedLimit: item.seated_limit,
        isSurge: item.is_surge,
      }))
    : [
        { name: 'Route 102 (Akola-Pune)', passengers: 35, seatedLimit: 45, isSurge: false },
        { name: 'Route 101 (Shuttle)', passengers: 15, seatedLimit: 45, isSurge: false },
      ]

  return (
    <div className="space-y-6">

      {/* ── Top Row: Real-Time Fleet Map & AI Intelligence Stream ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[420px]">
        
        {/* Real-Time Fleet View (Map) */}
        <div className="lg:col-span-2 bg-trixul-panel rounded-xl border border-slate-700 shadow-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700 flex justify-between items-center bg-slate-800/60">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Satellite className="w-4 h-4 text-trixul-accent" />
              <span>Live Fleet Telemetry (10s Heartbeat)</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-trixul-success/20 text-trixul-success px-2.5 py-0.5 rounded-full border border-trixul-success/30 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-trixul-success animate-ping"></span>
                <span>Syncing...</span>
              </span>
              <button
                onClick={refresh}
                title="Refresh telemetry"
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-2 relative bg-trixul-dark">
            <FleetMap fleet={fleet} />
          </div>
        </div>

        {/* AI Health Monitor & Incident Alerts */}
        <div className="bg-trixul-panel rounded-xl border border-slate-700 shadow-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700 flex justify-between items-center bg-slate-800/60">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-trixul-warning" />
              <span>AI Engine & Incident Stream</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{aiAlerts.length} Active</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-trixul-success mx-auto mb-2 opacity-80" />
                <p>All fleet telemetry operating in normal parameters.</p>
              </div>
            ) : (
              aiAlerts.map((alert, idx) => {
                const isDanger = alert.severity === 'danger' || alert.type === 'SOS'
                return (
                  <div
                    key={alert.id || idx}
                    className={`rounded-lg p-3.5 border relative overflow-hidden transition-all
                      ${isDanger
                        ? 'bg-trixul-danger/10 border-trixul-danger/30 text-red-200'
                        : 'bg-trixul-warning/10 border-trixul-warning/30 text-amber-200'
                      }`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isDanger ? 'bg-trixul-danger' : 'bg-trixul-warning'
                      }`}
                    />
                    <div className="flex items-start gap-2.5">
                      {isDanger ? (
                        <AlertTriangle className="w-4 h-4 text-trixul-danger flex-shrink-0 mt-0.5" />
                      ) : (
                        <Gauge className="w-4 h-4 text-trixul-warning flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-white tracking-wide">
                          {alert.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {alert.message}
                        </p>
                        {alert.suggestion && (
                          <div className="bg-slate-900/80 rounded p-2 text-[11px] border border-slate-700/80 text-slate-300 mt-1">
                            <span className="text-trixul-accent font-semibold">AI Suggestion: </span>
                            {alert.suggestion}
                          </div>
                        )}
                        {alert.action && (
                          <div className="pt-1.5 flex gap-2">
                            <button
                              onClick={() => alert(`Action Executed: ${alert.action}`)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors
                                ${isDanger
                                  ? 'bg-trixul-danger hover:bg-red-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                                }`}
                            >
                              {alert.action}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom Row: Shift Assignment & Performance Analytics ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
        
        {/* Instant Shift Assignment */}
        <div className="bg-trixul-panel rounded-xl border border-slate-700 shadow-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-trixul-accent" />
                <span>Instant Shift Assignment</span>
              </h3>
              <span className="text-[11px] text-slate-400">Digital Dispatch Hub</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Assign a bus, conductor, and route to instantly synchronize the conductor's ETM device.
            </p>

            <form onSubmit={handleInstantDispatch} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Select Conductor (ETM ID)
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-trixul-accent"
                    value={form.emp_id}
                    onChange={(e) => setForm((f) => ({ ...f, emp_id: e.target.value }))}
                  >
                    {dispatchOptions.conductors.map((c) => (
                      <option key={c.emp_id} value={c.emp_id}>
                        {c.emp_id} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Select Bus
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-trixul-accent"
                    value={form.bus_id}
                    onChange={(e) => setForm((f) => ({ ...f, bus_id: e.target.value }))}
                  >
                    {dispatchOptions.buses.map((b) => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.registration_number} (Cap: {b.capacity_total})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Select Route & Fare Rule
                </label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-trixul-accent"
                  value={form.route_id}
                  onChange={(e) => setForm((f) => ({ ...f, route_id: e.target.value }))}
                >
                  {dispatchOptions.routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.route_id}: {r.route_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                {dispatchSuccess ? (
                  <p className="text-xs text-trixul-success font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{dispatchSuccess}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-500">Locks fare tables and unlocks ETM.</span>
                )}

                <button
                  type="submit"
                  disabled={dispatching}
                  className="bg-trixul-accent hover:bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{dispatching ? 'Deploying...' : 'Deploy & Wake ETM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Route Volume & Occupancy (Chart) */}
        <div className="bg-trixul-panel rounded-xl border border-slate-700 shadow-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-trixul-accent" />
                <span>Route Volume & Occupancy Threshold</span>
              </h3>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-trixul-accent"></span> Normal
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-trixul-danger"></span> Over 45 Cap
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Red dashed line indicates standard 45-seated limit before critical load triggers.
            </p>

            <div className="h-[210px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    domain={[0, 60]}
                    tickCount={5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} Passengers`, 'Volume']}
                  />
                  {/* Dashed red capacity line at 45 seats */}
                  <ReferenceLine
                    y={45}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: '45 Seated Limit',
                      position: 'top',
                      fill: '#ef4444',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="passengers" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.passengers >= 45 ? '#ef4444' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
