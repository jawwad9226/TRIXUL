/**
 * pages/ShiftDispatcher.jsx
 * Digital shift management: assign conductors, buses, and routes.
 * Dynamic dropdowns populated directly from database records.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList,
  UserCheck,
  Bus,
  MapPin,
  Clock,
  PlusCircle,
  XCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { fetchShifts, createShift, closeShift, fetchDispatchOptions } from '../api/admin'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

export default function ShiftDispatcher() {
  const [shifts, setShifts] = useState([])
  const [dispatchOptions, setDispatchOptions] = useState({ conductors: [], buses: [], routes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form State
  const [form, setForm] = useState({ emp_id: '', bus_id: '', route_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftsRes, optionsRes] = await Promise.all([
        fetchShifts(),
        fetchDispatchOptions(),
      ])
      setShifts(shiftsRes.data)
      setDispatchOptions(optionsRes.data)

      // Set initial form values if empty
      if (optionsRes.data.conductors?.length && !form.emp_id) {
        setForm((f) => ({
          ...f,
          emp_id: optionsRes.data.conductors[0].emp_id,
          bus_id: optionsRes.data.buses?.[0]?.bus_id || '',
          route_id: optionsRes.data.routes?.[0]?.route_id || '',
        }))
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load shift records')
    } finally {
      setLoading(false)
    }
  }, [form.emp_id])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.emp_id || !form.bus_id || !form.route_id) {
      setFormMsg({ type: 'error', text: 'All assignment fields are required.' })
      return
    }
    setSubmitting(true)
    setFormMsg(null)
    try {
      const { data } = await createShift(form)
      setFormMsg({ type: 'success', text: `✅ Shift created! ${data.conductor} assigned to ${data.bus_number}.` })
      loadData()
      setTimeout(() => setFormMsg(null), 5000)
    } catch (err) {
      const msg = err.response?.data?.message || err.message
      setFormMsg({ type: 'error', text: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (shiftId) => {
    if (!confirm(`End shift ${shiftId}? This will mark it as Completed.`)) return
    try {
      await closeShift(shiftId)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || err.message)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Shift Dispatch & Duty Roster"
        subtitle="Manage daily schedules, assign conductors to buses and routes, and handle end-of-day closure."
        right={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Dispatch Assignment Form */}
      <Card>
        <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm">
          <PlusCircle className="w-4 h-4 text-trixul-accent" />
          <span>New Shift Assignment</span>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Conductor</label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-trixul-accent"
                value={form.emp_id}
                onChange={(e) => setForm((f) => ({ ...f, emp_id: e.target.value }))}
              >
                {dispatchOptions.conductors.map((c) => (
                  <option key={c.emp_id} value={c.emp_id}>
                    {c.emp_id} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Bus</label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-trixul-accent"
                value={form.bus_id}
                onChange={(e) => setForm((f) => ({ ...f, bus_id: e.target.value }))}
              >
                {dispatchOptions.buses.map((b) => (
                  <option key={b.bus_id} value={b.bus_id}>
                    {b.registration_number} (Capacity: {b.capacity_total})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Route & Fare Table</label>
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
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
            {formMsg ? (
              <p className={`text-xs font-medium ${formMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {formMsg.text}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Instantly binds the ETM device to the assigned route fare matrix.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-trixul-accent hover:bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <span>{submitting ? 'Assigning...' : 'Assign & Deploy Shift'}</span>
            </button>
          </div>
        </form>
      </Card>

      {/* Shifts History & Active Roster */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-trixul-accent" />
            <span>Shift Duty Log ({shifts.length})</span>
          </h2>
        </div>

        {loading && <p className="text-slate-400 text-xs py-4">Loading shift roster...</p>}
        {error && <p className="text-red-400 text-xs py-4">{error}</p>}

        {!loading && shifts.length === 0 && (
          <p className="text-slate-400 text-xs text-center py-8">No shifts on record. Assign one above.</p>
        )}

        {!loading && shifts.length > 0 && (
          <div className="space-y-2.5">
            {shifts.map((s) => {
              const isActive = s.status === 'Active'
              return (
                <div
                  key={s.shift_id}
                  className={`flex items-center justify-between border rounded-xl px-4 py-3.5 transition ${
                    isActive
                      ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-900/60 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{s.shift_id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      👤 {s.conductor_name} <span className="text-slate-500">({s.conductor_id})</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      🚌 {s.bus_number} · 📍 {s.route_name}
                    </p>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleClose(s.shift_id)}
                      className="text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3.5 py-1.5 rounded-lg transition"
                    >
                      End Shift
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
