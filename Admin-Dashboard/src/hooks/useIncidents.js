/**
 * hooks/useIncidents.js
 * Polls incidents every 10s. SOS incidents make the tab flash.
 */
import { useState, useEffect, useCallback } from 'react'
import { fetchIncidents } from '../api/admin'
import { POLL_INTERVAL_MS } from '../constants/theme'

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasOpenSOS, setHasOpenSOS] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await fetchIncidents()
      setIncidents(data)
      setHasOpenSOS(data.some((i) => i.severity === 'SOS' && i.status === 'OPEN'))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  return { incidents, loading, error, hasOpenSOS, refresh: load }
}
