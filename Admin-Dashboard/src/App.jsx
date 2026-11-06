import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LiveDashboard from './pages/LiveDashboard'
import FleetHUD from './pages/FleetHUD'
import ShiftDispatcher from './pages/ShiftDispatcher'
import RevenueDashboard from './pages/RevenueDashboard'
import IncidentCenter from './pages/IncidentCenter'
import RouteManager from './pages/RouteManager'
import { useIncidents } from './hooks/useIncidents'

function AppRoutes() {
  const { hasOpenSOS } = useIncidents()

  return (
    <Layout hasOpenSOS={hasOpenSOS}>
      <Routes>
        <Route path="/" element={<LiveDashboard />} />
        <Route path="/fleet" element={<FleetHUD />} />
        <Route path="/shifts" element={<ShiftDispatcher />} />
        <Route path="/revenue" element={<RevenueDashboard />} />
        <Route path="/incidents" element={<IncidentCenter />} />
        <Route path="/routes" element={<RouteManager />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
