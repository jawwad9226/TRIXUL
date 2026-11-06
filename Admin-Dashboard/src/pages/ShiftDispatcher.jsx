/**
 * pages/ShiftDispatcher.jsx
 * Duty Roster & Digital Shift Dispatcher.
 * Assigns Conductor + Bus + Route to wake ETM.
 * Displays active shifts with End Shift and Mid-Shift Reassignment (swap bus mid-route).
 */
import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Bus,
  User,
  Route as RouteIcon,
} from 'lucide-react'
import {
  fetchShifts,
  createShift,
  closeShift,
  reassignShiftBus,
  fetchDispatchOptions,
} from '../api/admin'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

export default function ShiftDispatcher() {
  const [shifts, setShifts] = useState([])
  const [dispatchOptions, setDispatchOptions] = useState({ conductors: [], buses: [], routes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // New Shift Form State
  const [form, setForm] = useState({ emp_id: '', bus_id: '', route_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Mid-Shift Bus Reassignment Modal State
  const [swapModal, setSwapModal] = useState({ isOpen: false, shift: null, new_bus_id: '' })
  const [swapping, setSwapping] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftsRes, optionsRes] = await Promise.all([
        fetchShifts(),
        fetchDispatchOptions(),
      ])
      setShifts(shiftsRes.data)
      setDispatchOptions(optionsRes.data)

      if (optionsRes.data.conductors?.length && !form.emp_id) {
        setForm({
          emp_id: optionsRes.data.conductors[0].emp_id,
          bus_id: optionsRes.data.buses?.[0]?.bus_id || '',
          route_id: optionsRes.data.routes?.[0]?.route_id || '',
        })
      }
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load shift records')
    } finally {
      setLoading(false)
    }
  }, [form.emp_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Create Shift & Wake ETM
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.emp_id || !form.bus_id || !form.route_id) {
      setFeedbackMsg({ type: 'error', text: 'All assignment fields are required.' })
      return
    }
    setSubmitting(true)
    setFeedbackMsg(null)
    try {
      const { data } = await createShift(form)
      setFeedbackMsg({
        type: 'success',
        text: `Shift created successfully! Conductor ${data.conductor} assigned to ${data.bus_number}. ETM synchronized.`,
      })
      await loadData()
      setTimeout(() => setFeedbackMsg(null), 5000)
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to dispatch shift',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // End Shift
  const handleClose = async (shiftId) => {
    if (!window.confirm(`Are you sure you want to close shift ${shiftId}?`)) return
    try {
      await closeShift(shiftId)
      setFeedbackMsg({ type: 'success', text: `Shift ${shiftId} marked as Completed.` })
      await loadData()
      setTimeout(() => setFeedbackMsg(null), 4000)
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to close shift',
      })
    }
  }

  // Open Mid-Shift Reassignment Modal
  const openSwapModal = (shift) => {
    const candidateBus = dispatchOptions.buses.find((b) => b.bus_id !== shift.bus_id)?.bus_id || ''
    setSwapModal({
      isOpen: true,
      shift,
      new_bus_id: candidateBus,
    })
  }

  // Submit Mid-Shift Reassignment
  const handleSwapSubmit = async (e) => {
    e.preventDefault()
    if (!swapModal.shift || !swapModal.new_bus_id) return
    setSwapping(true)
    try {
      const res = await reassignShiftBus(swapModal.shift.shift_id, swapModal.new_bus_id)
      setSwapModal({ isOpen: false, shift: null, new_bus_id: '' })
      setFeedbackMsg({
        type: 'success',
        text: res.data.message || 'Bus swapped successfully mid-shift.',
      })
      await loadData()
      setTimeout(() => setFeedbackMsg(null), 5000)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to swap bus')
    } finally {
      setSwapping(false)
    }
  }

  const activeShifts = shifts.filter((s) => s.status === 'Active')
  const completedShifts = shifts.filter((s) => s.status === 'Completed')

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Shift Dispatcher & Duty Roster"
        subtitle="Dispatch active shifts, manage conductor assignments, and perform dynamic mid-shift bus swaps."
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

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition ${
            feedbackMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedbackMsg.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* ── 1. Create Shift Assignment Form ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-4 text-white font-semibold text-sm">
          <PlusCircle className="w-4 h-4 text-trixul-accent" />
          <span>New Shift Assignment (Wake ETM)</span>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Assign Conductor
              </label>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Assign Bus
              </label>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Select Route & Fare Table
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
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
            <p className="text-[11px] text-slate-400">
              Submitting registers the duty roster in PostgreSQL and activates the ETM session.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="bg-trixul-accent hover:bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              <span>{submitting ? 'Dispatching...' : 'Deploy Shift & Wake ETM'}</span>
            </button>
          </div>
        </form>
      </Card>

      {/* ── 2. Active Shifts Roster & Mid-Shift Reassignment ───────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Active Shifts ({activeShifts.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400">Real-Time Operational Roster</span>
        </div>

        {loading && <p className="text-slate-400 text-xs py-4">Loading active roster...</p>}
        {error && <p className="text-red-400 text-xs py-4">{error}</p>}

        {!loading && activeShifts.length === 0 && (
          <p className="text-slate-400 text-xs text-center py-6">
            No active shifts currently running. Assign one above to wake ETM.
          </p>
        )}

        {!loading && activeShifts.length > 0 && (
          <div className="space-y-3">
            {activeShifts.map((s) => (
              <div
                key={s.shift_id}
                className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">{s.shift_id}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <User className="w-3.5 h-3.5 text-trixul-accent" />
                      <span>{s.conductor_name} ({s.conductor_id})</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-300 font-mono font-medium">
                      <Bus className="w-3.5 h-3.5 text-blue-400" />
                      <span>{s.bus_number}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <RouteIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{s.route_name}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Mid-Shift Bus Swap Button */}
                  <button
                    onClick={() => openSwapModal(s)}
                    className="flex items-center gap-1.5 text-xs bg-slate-700/80 hover:bg-slate-700 border border-slate-600 text-amber-300 px-3 py-1.5 rounded-lg transition"
                    title="Swap bus mid-route for breakdown/emergency"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Swap Bus (Mid-Shift)</span>
                  </button>

                  {/* End Shift Button */}
                  <button
                    onClick={() => handleClose(s.shift_id)}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3.5 py-1.5 rounded-lg transition"
                  >
                    End Shift
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 3. Completed Shifts History ────────────────────────────────────── */}
      {completedShifts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Shift Closure Log ({completedShifts.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-800">
            {completedShifts.slice(0, 5).map((s) => (
              <div key={s.shift_id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400">{s.shift_id}</span>
                  <span className="text-slate-300">{s.conductor_name}</span>
                  <span className="text-slate-500">· {s.bus_number}</span>
                  <span className="text-slate-500">· {s.route_name}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  COMPLETED
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Modal: Mid-Shift Bus Reassignment ───────────────────────────────── */}
      {swapModal.isOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSwapModal({ isOpen: false, shift: null, new_bus_id: '' })}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-white font-bold text-base mb-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-400" />
              <span>Mid-Shift Bus Reassignment</span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dynamically swap vehicle for Shift{' '}
              <strong className="text-white font-mono">{swapModal.shift?.shift_id}</strong>{' '}
              without canceling ticket records or resetting the conductor session.
            </p>

            <form onSubmit={handleSwapSubmit} className="space-y-4">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs space-y-1">
                <p className="text-slate-400">Current Bus: <strong className="text-red-400">{swapModal.shift?.bus_number}</strong></p>
                <p className="text-slate-400">Conductor: <strong className="text-slate-200">{swapModal.shift?.conductor_name}</strong></p>
                <p className="text-slate-400">Route: <strong className="text-slate-200">{swapModal.shift?.route_name}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Replacement Bus
                </label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  value={swapModal.new_bus_id}
                  onChange={(e) => setSwapModal((m) => ({ ...m, new_bus_id: e.target.value }))}
                >
                  {dispatchOptions.buses
                    .filter((b) => b.bus_id !== swapModal.shift?.bus_id)
                    .map((b) => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.registration_number} (Capacity: {b.capacity_total})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSwapModal({ isOpen: false, shift: null, new_bus_id: '' })}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={swapping}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition shadow-md disabled:opacity-50"
                >
                  {swapping ? 'Swapping...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
