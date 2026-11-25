/**
 * hooks/useFleetData.js
 * Polls /api/v1/admin/fleet/ every 10 seconds (matching ETM heartbeat cadence).
 * Returns { fleet, summary, occupancyAnalytics, aiAlerts, loading, error, lastUpdated, refresh }.
 */
import { useState, useEffect, useCallback } from 'react'
import { fetchFleet } from '../api/admin'
import { POLL_INTERVAL_MS } from '../constants/theme'

export function useFleetData() {
  const [fleet, setFleet] = useState([])
  const [summary, setSummary] = useState({ active_buses: 0, total_buses: 0, total_conductors: 0 })
  const [occupancyAnalytics, setOccupancyAnalytics] = useState([])
  const [aiAlerts, setAiAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data } = await fetchFleet()
      if (Array.isArray(data)) {
        setFleet(data)
        setSummary({ active_buses: data.length, total_buses: data.length, total_conductors: data.length })
      } else if (data && typeof data === 'object') {
        setFleet(data.fleet || [])
        setSummary(data.summary || { active_buses: 0, total_buses: 0, total_conductors: 0 })
        setOccupancyAnalytics(data.occupancy_analytics || [])
        setAiAlerts(data.ai_alerts || [])
      }
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to reach backend')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  return { fleet, summary, occupancyAnalytics, aiAlerts, loading, error, lastUpdated, refresh: load }
}
