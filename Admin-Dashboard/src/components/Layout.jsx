/**
 * components/Layout.jsx
 * Admin Command Center layout with persistent Global Revenue HUD in the header
 * and responsive command sidebar navigation.
 */
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  TrendingUp,
  ShieldAlert,
  Network,
  Banknote,
  QrCode,
  Bus,
  Radio,
} from 'lucide-react'
import { useRevenue } from '../hooks/useRevenue'
import { useFleetData } from '../hooks/useFleetData'

const NAV = [
  { to: '/',          label: 'Live Dashboard',       icon: LayoutDashboard },
  { to: '/fleet',     label: 'Fleet Tracking',       icon: MapPin },
  { to: '/shifts',    label: 'Shift Management',     icon: ClipboardList },
  { to: '/revenue',   label: 'Revenue Analytics',    icon: TrendingUp },
  { to: '/incidents', label: 'Incidents & AI Alerts', icon: ShieldAlert },
]

export default function Layout({ children, hasOpenSOS }) {
  const { data: revenueData } = useRevenue()
  const { summary } = useFleetData()

  const totalRev = revenueData?.total_revenue ?? 0
  const cashRev = revenueData?.cash?.amount ?? 0
  const upiRev = revenueData?.upi?.amount ?? 0
  const activeBuses = summary?.active_buses ?? 0
  const totalBuses = summary?.total_buses ?? 0

  return (
    <div className="flex h-screen bg-trixul-dark text-slate-300 font-sans overflow-hidden">
      
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-trixul-panel border-r border-slate-700 flex flex-col justify-between">
        <div>
          {/* Brand */}
          <div className="p-5 border-b border-slate-700">
            <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
              <Network className="w-6 h-6 text-trixul-accent" />
              <span>TRIXUL</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Universal Management System</p>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {NAV.map(({ to, label, icon: Icon }) => {
              const isSOS = to === '/incidents' && hasOpenSOS
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-trixul-accent/20 text-trixul-accent border border-trixul-accent/30'
                      : isSOS
                      ? 'text-trixul-danger bg-trixul-danger/10 border border-trixul-danger/30 animate-pulse'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isSOS && (
                    <span className="bg-trixul-danger text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      SOS
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Depot Manager Status Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white text-xs font-bold">
              DM
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Depot Manager</p>
              <p className="text-[11px] text-trixul-success flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-trixul-success animate-ping"></span>
                <span>System Online</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main View Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header: Global Revenue & Fleet HUD */}
        <header className="bg-trixul-panel border-b border-slate-700 px-6 py-3 flex justify-between items-center h-20 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-trixul-accent animate-pulse" />
              <span>Control & Monitoring Center</span>
            </h2>
            <p className="text-xs text-slate-400">Maharashtra State Road Transport Operational Grid</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Revenue Stats HUD */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Revenue Today</p>
                <p className="text-base font-bold text-white">₹{totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-7 w-px bg-slate-600"></div>
              <div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-trixul-success" />
                  <span>Cash</span>
                </p>
                <p className="text-xs font-semibold text-white">₹{cashRev.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-trixul-accent" />
                  <span>UPI</span>
                </p>
                <p className="text-xs font-semibold text-white">₹{upiRev.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Active Fleet KPI */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 flex items-center gap-3">
              <Bus className="w-5 h-5 text-trixul-success" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Fleet</p>
                <p className="text-base font-bold text-trixul-success">{activeBuses} / {totalBuses || activeBuses}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
