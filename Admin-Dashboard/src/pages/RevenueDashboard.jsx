/**
 * pages/RevenueDashboard.jsx
 * Financial analytics: Cash vs UPI reconciliation, Route volume, Conductor rankings.
 * All computed directly from PostgreSQL Ticket records.
 */
import {
  Banknote,
  QrCode,
  Users,
  TrendingUp,
  RefreshCw,
  Award,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useRevenue } from '../hooks/useRevenue'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

function StatTile({ label, value, sub, icon: Icon, accentClass = 'text-white' }) {
  return (
    <div className="bg-trixul-panel border border-slate-700 rounded-xl p-4 shadow-lg space-y-2">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <div>
        <p className={`text-2xl font-bold ${accentClass}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function RevenueDashboard() {
  const { data, loading, error, refresh } = useRevenue()

  const paymentChartData = data
    ? [
        { name: 'Cash', amount: data.cash.amount, tickets: data.cash.tickets },
        { name: 'UPI',  amount: data.upi.amount,  tickets: data.upi.tickets  },
      ]
    : []

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Revenue & Fare Reconciliation"
        subtitle="End-of-day cash in hand, digital UPI collections, route earnings, and conductor audits."
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

      {loading && <p className="text-slate-400 text-xs py-4">Calculating financial metrics...</p>}
      {error && <p className="text-red-400 text-xs py-4">{error}</p>}

      {data && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatTile
              label="Total Revenue"
              value={`₹${data.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              sub={`${data.total_tickets} tickets issued`}
              icon={TrendingUp}
              accentClass="text-emerald-400"
            />
            <StatTile
              label="Passengers Carried"
              value={data.total_passengers.toLocaleString('en-IN')}
              sub="Across all operational routes"
              icon={Users}
            />
            <StatTile
              label="Physical Cash"
              value={`₹${data.cash.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              sub={`${data.cash.tickets} cash tickets`}
              icon={Banknote}
              accentClass="text-emerald-400"
            />
            <StatTile
              label="Digital UPI"
              value={`₹${data.upi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              sub={`${data.upi.tickets} digital tickets`}
              icon={QrCode}
              accentClass="text-trixul-accent"
            />
          </div>

          {/* Payment Mode Bar Chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Payment Method Distribution (Cash vs UPI)</h2>
              <span className="text-[11px] text-slate-400 font-mono">Live DB Aggregate</span>
            </div>

            {paymentChartData.every((d) => d.amount === 0) ? (
              <p className="text-slate-400 text-xs text-center py-8">
                No tickets issued yet. Conductors will generate revenue records via the ETM.
              </p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '12px' }}
                      formatter={(v) => [`₹${v.toFixed(2)}`, 'Total Collected']}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Per-Route & Per-Conductor Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Route Earnings */}
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Earnings by Route</h3>
              {data.per_route.length === 0 ? (
                <p className="text-slate-400 text-xs py-4">No route data available.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700 text-left">
                      <th className="pb-2">Route</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Pax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.per_route.map((r, i) => (
                      <tr key={i} className="text-slate-200">
                        <td className="py-2.5 font-medium">{r.route}</td>
                        <td className="py-2.5 text-right font-mono text-emerald-400 font-bold">₹{r.revenue.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-slate-400">{r.passengers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Conductor Performance */}
            <Card>
              <div className="flex items-center gap-1.5 mb-3 text-white font-semibold text-sm">
                <Award className="w-4 h-4 text-trixul-warning" />
                <span>Conductor Collections</span>
              </div>
              {data.per_conductor.length === 0 ? (
                <p className="text-slate-400 text-xs py-4">No conductor data available.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700 text-left">
                      <th className="pb-2">Conductor</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Tickets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.per_conductor.map((c, i) => (
                      <tr key={i} className="text-slate-200">
                        <td className="py-2.5 font-medium">
                          {c.conductor} <span className="text-slate-500 font-mono">({c.emp_id})</span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-400 font-bold">₹{c.revenue.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-slate-400">{c.tickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
