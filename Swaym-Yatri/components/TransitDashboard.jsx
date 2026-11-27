"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiGet, apiPost } from "@/lib/api"
import RouteProgress from "@/components/RouteProgress"

function formatUpdated(value) {
  if (!value) return "Not checked yet"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))
}

function LiveBadge({ staleCount, totalBuses }) {
  const label = totalBuses > 0 && staleCount === totalBuses ? "LAST KNOWN GPS" : "LIVE TELEMETRY"
  return (
    <span className={`data-pill ${totalBuses > 0 && staleCount === totalBuses ? "data-pill-stale" : "data-pill-live"}`}>
      <i /> {label}
    </span>
  )
}

function getJourneyProgress(bus, routeStops, boardingStopId, destinationStopId) {
  const boardingStop = routeStops.find((stop) => stop.stop_id === boardingStopId) || routeStops[0]
  const destinationStop = routeStops.find((stop) => stop.stop_id === destinationStopId)
    || routeStops[routeStops.length - 1]
  const currentIndex = routeStops.findIndex((stop) => stop.stop_id === bus?.current_stop_id)
  const boardingIndex = routeStops.findIndex((stop) => stop.stop_id === boardingStop?.stop_id)
  const destinationIndex = routeStops.findIndex((stop) => stop.stop_id === destinationStop?.stop_id)

  if (currentIndex < 0 || boardingIndex < 0 || destinationIndex < boardingIndex) {
    return { state: "unknown", label: "Route position pending", targetStopId: null }
  }
  if (currentIndex > destinationIndex) {
    return { state: "passed", label: `Passed ${destinationStop.stop_name}`, targetStopId: null }
  }
  if (currentIndex === destinationIndex) {
    return { state: "arrived", label: `Reached ${destinationStop.stop_name}`, targetStopId: null }
  }
  if (currentIndex < boardingIndex) {
    return { state: "approaching", label: `On the way to ${boardingStop.stop_name}`, targetStopId: boardingStop.stop_id }
  }
  if (currentIndex === boardingIndex) {
    return {
      state: "at_source",
      label: `At ${boardingStop.stop_name}`,
      targetStopId: destinationIndex > boardingIndex ? destinationStop.stop_id : null,
    }
  }
  return { state: "departed", label: `Departed ${boardingStop.stop_name}`, targetStopId: destinationStop.stop_id }
}

function formatArrivalTime(eta) {
  if (eta?.eta_minutes == null) return ""
  const updatedAt = eta.last_updated_at ? new Date(eta.last_updated_at).getTime() : Date.now()
  if (!Number.isFinite(updatedAt)) return ""
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(updatedAt + eta.eta_minutes * 60_000))
}

function formatEtaDuration(minutes) {
  if (minutes <= 0) return "arriving now"
  const totalMinutes = Math.ceil(minutes)
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  return [
    hours ? `${hours} hr${hours === 1 ? "" : "s"}` : "",
    remainingMinutes ? `${remainingMinutes} min` : "",
  ].filter(Boolean).join(" ")
}

export default function TransitDashboard() {
  const [stops, setStops] = useState([])
  const [routes, setRoutes] = useState([])
  const [route, setRoute] = useState(null)
  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState("")
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [boardingStopId, setBoardingStopId] = useState("")
  const [etaByBus, setEtaByBus] = useState({})
  const [stopEtas, setStopEtas] = useState({})
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState(null)

  const refreshLiveBuses = useCallback(async (routeId, activeBoardingId, destinationId, routeStops) => {
    const liveResult = await apiGet("/api/v1/public/buses/live/", {
      route_id: routeId,
      destination_stop_id: destinationId,
    })
    const activeBuses = liveResult.buses || []
    setBuses(activeBuses)
    setSelectedBusId((currentId) => (
      activeBuses.some((bus) => bus.bus_id === currentId)
        ? currentId
        : activeBuses[0]?.bus_id || ""
    ))
    setLastSync(new Date())
    if (activeBoardingId && activeBuses.length) {
      const entries = await Promise.all(activeBuses.map(async (bus) => {
        const journey = getJourneyProgress(bus, routeStops, activeBoardingId, destinationId)
        if (!journey.targetStopId) {
          return [bus.bus_id, { ...journey, eta_minutes: null }]
        }
        try {
          const eta = await apiGet(`/api/v1/public/buses/${encodeURIComponent(bus.bus_id)}/eta/`, {
            stop_id: journey.targetStopId,
          })
          return [bus.bus_id, { ...eta, target_stop_id: journey.targetStopId }]
        } catch (requestError) {
          return [bus.bus_id, { error: requestError.message, target_stop_id: journey.targetStopId }]
        }
      }))
      setEtaByBus(Object.fromEntries(entries))
    } else {
      setEtaByBus({})
    }
  }, [])

  const loadRoute = useCallback(async (routeId, boardingId, destinationId) => {
    const detail = await apiGet(`/api/v1/public/routes/${encodeURIComponent(routeId)}/`)
    setRoute(detail)
    const nextStopId = boardingId || detail.route_stops[0]?.stop_id || ""
    setBoardingStopId(nextStopId)
    await refreshLiveBuses(routeId, nextStopId, destinationId, detail.route_stops)
  }, [refreshLiveBuses])

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const [stopResult, routeResult, sessionResult] = await Promise.all([
          apiGet("/api/v1/public/stops/"),
          apiGet("/api/v1/public/routes/"),
          apiGet("/api/v1/public/auth/session/").catch(() => ({ authenticated: false })),
        ])
        if (!active) return
        setAuthenticated(Boolean(sessionResult?.authenticated))
        setStops(stopResult.stops || [])
        const allRoutes = routeResult.routes || []
        setRoutes(allRoutes)
        const preferredRoute = allRoutes.find((item) => item.active_bus_count > 0) || allRoutes[0]
        if (preferredRoute) {
          const detail = await apiGet(`/api/v1/public/routes/${encodeURIComponent(preferredRoute.route_id)}/`)
          if (!active) return
          setRoute(detail)
          const firstStopId = detail.route_stops[0]?.stop_id || ""
          setBoardingStopId(firstStopId)
          await refreshLiveBuses(preferredRoute.route_id, firstStopId, "", detail.route_stops)
        }
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    initialize()
    return () => { active = false }
  }, [refreshLiveBuses])

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!route?.route_id) return undefined
    const intervalId = window.setInterval(() => {
      refreshLiveBuses(route.route_id, boardingStopId, destination, route.route_stops)
        .catch((requestError) => setError(requestError.message))
    }, 10000)
    return () => window.clearInterval(intervalId)
  }, [route?.route_id, route?.route_stops, boardingStopId, destination, refreshLiveBuses])

  const selectedBus = buses.find((bus) => bus.bus_id === selectedBusId) || null
  const selectedEta = etaByBus[selectedBusId]
  const selectedJourney = getJourneyProgress(
    selectedBus,
    route?.route_stops || [],
    boardingStopId,
    destination,
  )
  const arrivalTime = formatArrivalTime(selectedEta)
  const etaTargetStop = route?.route_stops?.find((stop) => stop.stop_id === selectedEta?.target_stop_id)
  const arrivalDetail = selectedEta?.eta_minutes != null && etaTargetStop
    ? `About ${formatEtaDuration(selectedEta.eta_minutes)} to ${etaTargetStop.stop_name}`
    : ""
  const arrivalValue = arrivalTime
    || (selectedJourney.state === "arrived"
      ? "Arrived at destination"
      : selectedJourney.state === "passed"
        ? "Destination passed"
        : selectedJourney.state === "at_source"
          ? "At your boarding stop"
          : "Awaiting live ETA")

  const routeOriginIndex = route?.route_stops?.findIndex((stop) => stop.stop_id === origin) ?? -1
  const routeDestinationIndex = route?.route_stops?.findIndex((stop) => stop.stop_id === destination) ?? -1
  const routeStartIndex = routeOriginIndex >= 0 ? routeOriginIndex : 0
  const routeEndIndex = routeDestinationIndex >= 0
    ? routeDestinationIndex
    : (route?.route_stops?.length || 0) - 1
  const currentStopIndex = route?.route_stops?.findIndex(
    (stop) => stop.stop_id === selectedBus?.current_stop_id,
  ) ?? -1
  const visibleStartIndex = currentStopIndex >= 0 && currentStopIndex < routeStartIndex
    ? currentStopIndex
    : routeStartIndex
  const visibleRouteStops = routeEndIndex >= visibleStartIndex
    ? route?.route_stops?.slice(visibleStartIndex, routeEndIndex + 1) || []
    : []
  const currentStopSequence = route?.route_stops?.find(
    (stop) => stop.stop_id === selectedBus?.current_stop_id,
  )?.sequence ?? null
  const selectedStop = useMemo(
    () => route?.route_stops?.find((stop) => stop.stop_id === boardingStopId),
    [route, boardingStopId],
  )
  const targetEndStop = useMemo(() => {
    if (!route?.route_stops?.length) return null
    return route.route_stops.find((stop) => stop.stop_id === destination)
      || route.route_stops[route.route_stops.length - 1]
  }, [route, destination])

  const segmentFare = useMemo(() => {
    if (!route?.fares?.length || !selectedStop || !targetEndStop) return null
    return route.fares.find(
      (item) => item.from_stop_id === selectedStop.stop_id && item.to_stop_id === targetEndStop.stop_id,
    ) || null
  }, [route, selectedStop, targetEndStop])

  const segmentDistanceKm = useMemo(() => {
    if (!selectedStop || !targetEndStop) return null
    return Math.max(0, Number(targetEndStop.distance_km) - Number(selectedStop.distance_km))
  }, [selectedStop, targetEndStop])

  const totalActiveNetworkBuses = useMemo(
    () => routes.reduce((sum, item) => sum + (item.active_bus_count || 0), 0),
    [routes],
  )
  const staleBusCount = useMemo(
    () => buses.filter((bus) => bus.is_stale).length,
    [buses],
  )

  useEffect(() => {
    if (!selectedBus || !route?.route_stops?.length) {
      setStopEtas({})
      return undefined
    }

    const routeStops = route.route_stops
    const busStopIndex = routeStops.findIndex((stop) => stop.stop_id === selectedBus.current_stop_id)
    const segmentStops = routeStops.slice(visibleStartIndex, routeEndIndex + 1)
    if (busStopIndex < 0) {
      setStopEtas(Object.fromEntries(segmentStops.map((stop) => [stop.stop_id, { error: "Bus position pending" }])))
      return undefined
    }

    const upcomingStops = segmentStops.filter(
      (stop) => routeStops.findIndex((routeStop) => routeStop.stop_id === stop.stop_id) > busStopIndex,
    )
    if (!upcomingStops.length) {
      setStopEtas({})
      return undefined
    }

    let active = true
    setStopEtas({})
    Promise.all(upcomingStops.map(async (stop) => {
      try {
        const eta = await apiGet(`/api/v1/public/buses/${encodeURIComponent(selectedBus.bus_id)}/eta/`, {
          stop_id: stop.stop_id,
        })
        return [stop.stop_id, { ...eta, arrival_time: formatArrivalTime(eta) }]
      } catch (requestError) {
        return [stop.stop_id, { error: requestError.message }]
      }
    })).then((entries) => {
      if (active) setStopEtas(Object.fromEntries(entries))
    })
    return () => { active = false }
  }, [selectedBus, route?.route_stops, visibleStartIndex, routeEndIndex])

  async function searchRoutes(event) {
    event.preventDefault()
    setSearching(true)
    setError("")
    try {
      const result = await apiGet("/api/v1/public/routes/", {
        origin_stop_id: origin,
        destination_stop_id: destination,
      })
      setRoutes(result.routes || [])
      if (result.routes?.length) {
        await loadRoute(result.routes[0].route_id, origin, destination)
      } else {
        setRoute(null)
        setBuses([])
        setSelectedBusId("")
        setEtaByBus({})
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSearching(false)
    }
  }

  async function selectRoute(routeId) {
    setError("")
    try {
      await loadRoute(routeId, origin, destination)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function changeBoardingStop(stopId) {
    setBoardingStopId(stopId)
    if (!route?.route_id) return
    try {
      await refreshLiveBuses(route.route_id, stopId, destination, route.route_stops)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleLogout() {
    try {
      const { csrf_token: csrfToken } = await apiGet("/api/v1/public/auth/csrf/")
      await apiPost("/api/v1/public/auth/logout/", {}, csrfToken)
      setAuthenticated(false)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function swapStops() {
    setOrigin(destination)
    setDestination(origin)
  }

  const occupancyPct = selectedBus
    ? Math.min(100, Math.round(((selectedBus.passenger_count ?? 0) / (selectedBus.capacity_total || 56)) * 100))
    : 0

  return (
    <main className="dashboard-page">
      <header className="topbar dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">s</span><span>Swaym Yatri</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a className="nav-active" href="#bus-tracker">Live Tracker</a>
          <a href="#journey-summary">Fare & Fleet</a>
        </nav>
        {authenticated ? (
          <button className="quiet-link quiet-button" onClick={handleLogout} type="button">
            Sign out
          </button>
        ) : (
          <Link className="quiet-link" href="/login">Sign in</Link>
        )}
      </header>

      <section className="dashboard-intro">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> LIVE PUBLIC TRANSIT</span>
          <h1>Where are you<br className="mobile-break" /> headed today?</h1>
          <p>Real-time ETM bus positions, live seat occupancy, and PostGIS stop arrival estimates.</p>
        </div>
        <div className="intro-stats">
          <span className="intro-stat-icon">↗</span>
          <span>
            <b>{totalActiveNetworkBuses} active {totalActiveNetworkBuses === 1 ? "bus" : "buses"}</b>
            <small>10 sec live sync · {routes.length} routes</small>
          </span>
        </div>
      </section>

      <section className="tracker-card" id="bus-tracker">
        <div className="section-heading">
          <div className="section-title-wrap">
            <span className="section-icon">↗</span>
            <div>
              <h2>Find buses on your route</h2>
              <p>Select your origin and destination stops to view active buses and live fares.</p>
            </div>
          </div>
          {route && <LiveBadge staleCount={staleBusCount} totalBuses={buses.length} />}
        </div>

        <form className="route-search" onSubmit={searchRoutes}>
          <label className="select-field">
            <span className="field-caption">FROM</span>
            <span className="field-control">
              <i className="field-dot field-dot-origin" />
              <select value={origin} onChange={(event) => setOrigin(event.target.value)} aria-label="Origin stop">
                <option value="">Any starting stop</option>
                {stops.map((stop) => <option value={stop.stop_id} key={stop.stop_id}>{stop.stop_name}</option>)}
              </select>
            </span>
          </label>
          <button aria-label="Swap origin and destination" className="search-connector" onClick={swapStops} title="Swap stops" type="button">⇄</button>
          <label className="select-field">
            <span className="field-caption">TO</span>
            <span className="field-control">
              <i className="field-dot field-dot-destination" />
              <select value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Destination stop">
                <option value="">Any destination</option>
                {stops.filter((stop) => stop.stop_id !== origin).map((stop) => (
                  <option value={stop.stop_id} key={stop.stop_id}>{stop.stop_name}</option>
                ))}
              </select>
            </span>
          </label>
          <button className="button button-primary search-button" type="submit" disabled={searching || loading}>
            {searching ? "Finding…" : "Find buses"} <span aria-hidden="true">→</span>
          </button>
        </form>

        {error && (
          <div className="error-banner" role="alert">
            <span>!</span>
            <div>
              <b>Couldn’t load live transit information</b>
              <small>{error} Ensure the TRIXUL backend server is running and reachable.</small>
            </div>
          </div>
        )}

        <div className="tracking-grid">
          <div className="route-overview">
            <div className="route-overview-heading">
              <div>
                <b>{route?.route_name || "Choose a route"}</b>
                <small>
                  {route
                    ? `${buses.length} active ${buses.length === 1 ? "bus" : "buses"} on this route · ${route.route_stops?.length || 0} stops`
                    : "Available routes and active buses appear here"}
                </small>
              </div>
              {segmentFare && (
                <span className="route-fare-chip">
                  ₹{Number(segmentFare.fare).toFixed(2)} trip fare
                </span>
              )}
            </div>

            {route && route.route_stops?.length ? (
              <RouteProgress
                stops={visibleRouteStops}
                bus={selectedBus}
                sourceStopId={origin}
                destinationStopId={destination}
                boardingStopId={boardingStopId}
                currentStopSequence={currentStopSequence}
                stopEtas={stopEtas}
                onSelectStop={changeBoardingStop}
              />
            ) : (
              <div className="route-overview-empty">
                <span>↗</span>
                <b>{loading ? "Loading live routes…" : "No route selected"}</b>
                <small>Choose an origin and destination to see active buses.</small>
              </div>
            )}

            {route && buses.length === 0 && (
              <div className="empty-live">
                <span aria-hidden="true">◷</span>
                <span>
                  <b>No active bus dispatched on this route</b>
                  <small>Route stops and live fares remain available while waiting for an active shift.</small>
                </span>
                <i>No active shift</i>
              </div>
            )}

            {selectedBus && (
              <section className="bus-status-card" aria-label="Selected bus status">
                <div className="bus-status-heading">
                  <span className="bus-status-icon" aria-hidden="true">🚌</span>
                  <div className="bus-status-identity">
                    <small>Active Vehicle · {selectedBus.bus_id}</small>
                    <b>{selectedBus.bus_registration}</b>
                  </div>
                  <span className={`bus-status-badge ${selectedBus.is_stale ? "bus-status-stale" : ""}`}>
                    {selectedBus.is_stale ? "Last known GPS" : "Live GPS"}
                  </span>
                </div>

                <div className="bus-status-arrival">
                  <small>{selectedJourney.label}</small>
                  <b>{arrivalValue}</b>
                  {arrivalDetail && <span className="bus-status-arrival-detail">{arrivalDetail}</span>}
                </div>

                <div className="bus-status-location">
                  <span aria-hidden="true">●</span>
                  <div>
                    <small>Current nearest stop</small>
                    <b>{selectedBus.current_stop_name}</b>
                  </div>
                </div>

                {selectedBus.crowdedness_level && (
                  <div className="crowd-box">
                    <div className="crowd-box-head">
                      <span className={`crowd-pill crowd-pill-${selectedBus.crowdedness_level}`}>
                        <i aria-hidden="true" /> {selectedBus.crowdedness_label}
                      </span>
                      <span className="crowd-count">
                        <b>{selectedBus.passenger_count ?? 0}</b> / {selectedBus.capacity_total ?? 56} seats
                      </span>
                    </div>
                    <div className="crowd-meter" aria-label={`Bus occupancy ${occupancyPct}%`}>
                      <div className={`crowd-meter-fill crowd-meter-${selectedBus.crowdedness_level}`} style={{ width: `${occupancyPct}%` }} />
                    </div>
                  </div>
                )}

                <div className="bus-status-footer">
                  <span>Speed <b>{selectedBus.speed_kmh} km/h</b></span>
                  <span>GPS {selectedBus.latitude.toFixed(3)}, {selectedBus.longitude.toFixed(3)}</span>
                  {lastSync && <span>Synced {formatUpdated(lastSync)}</span>}
                </div>
              </section>
            )}

            {route && buses.length > 0 && (
              <div className="active-bus-list">
                <div className="active-bus-heading">
                  <b>{buses.length > 1 ? "All active buses on this route" : "Active bus on this route"}</b>
                  <small>Tap a vehicle to inspect live telemetry</small>
                </div>
                {buses.map((bus) => (
                  <button
                    aria-pressed={bus.bus_id === selectedBusId}
                    className={`active-bus-card ${bus.bus_id === selectedBusId ? "active-bus-card-selected" : ""}`}
                    key={bus.bus_id}
                    onClick={() => setSelectedBusId(bus.bus_id)}
                    type="button"
                  >
                    <span className="active-bus-icon" aria-hidden="true">🚌</span>
                    <span className="active-bus-copy">
                      <b>{bus.bus_registration}</b>
                      <small>At {bus.current_stop_name} · {bus.crowdedness_label} ({bus.passenger_count}/{bus.capacity_total})</small>
                    </span>
                    <span className="bus-select-indicator">{bus.bus_id === selectedBusId ? "Tracking" : "Inspect"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="route-side">
            <div className="side-heading">
              <div><h3>Available Routes</h3><span>{routes.length} routes</span></div>
              <span className="route-list-icon">≋</span>
            </div>
            {loading ? <div className="small-loading">Loading routes from PostGIS…</div> : routes.length ? (
              <div className="route-list">
                {routes.map((item) => (
                  <button
                    className={`route-option ${route?.route_id === item.route_id ? "route-option-active" : ""}`}
                    key={item.route_id}
                    onClick={() => selectRoute(item.route_id)}
                    type="button"
                  >
                    <span className="route-badge">{item.route_id.replace("route-", "")}</span>
                    <span className="route-option-copy">
                      <b>{item.route_name}</b>
                      <small>
                        {item.active_bus_count} {item.active_bus_count === 1 ? "bus" : "buses"} · {item.stop_count} stops
                      </small>
                    </span>
                    <span className="route-chevron">›</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="no-routes">
                {error ? "Route results are unavailable until backend connection is restored." : "No routes match those stops. Try swapping or clearing filters."}
              </div>
            )}

            {route && selectedStop && (
              <div className="boarding-select">
                <b>Boarding at {selectedStop.stop_name}</b>
                <small>
                  {targetEndStop && selectedStop.stop_id !== targetEndStop.stop_id
                    ? `Destination: ${targetEndStop.stop_name}${segmentDistanceKm != null ? ` (${segmentDistanceKm.toFixed(1)} km)` : ""}`
                    : "Tap any earlier stop on the timeline to change boarding stop."}
                </small>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="summary-section" id="journey-summary">
        <div className="summary-heading">
          <div>
            <span className="eyebrow">REAL-TIME TRIP DETAILS</span>
            <h2>Fare breakdown & network telemetry</h2>
          </div>
          {route?.fare_rule && Number(route.fare_rule.discount_percentage) > 0 && (
            <span className="discount-badge">{route.fare_rule.discount_percentage}% CONCESSION ACTIVE</span>
          )}
        </div>
        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-icon">₹</span>
            <div>
              <small>POINT-TO-POINT FARE</small>
              <b>{segmentFare ? `₹${Number(segmentFare.fare).toFixed(2)}` : route?.fare_rule ? `From ₹${route.fare_rule.base_fare}` : "Unavailable"}</b>
              <p>
                {segmentFare && selectedStop && targetEndStop
                  ? `${selectedStop.stop_name} → ${targetEndStop.stop_name}`
                  : route?.fare_rule
                    ? `Base ₹${route.fare_rule.base_fare} + ₹${route.fare_rule.per_km_rate}/km`
                    : "Select a route to compute fare"}
              </p>
            </div>
          </article>

          <article className="summary-card">
            <span className="summary-icon summary-icon-teal">⌖</span>
            <div>
              <small>ROUTE & DISTANCE</small>
              <b>{segmentDistanceKm != null ? `${segmentDistanceKm.toFixed(1)} km trip` : `${route?.route_stops?.length || 0} stops`}</b>
              <p>
                {route?.fare_rule
                  ? `₹${route.fare_rule.per_km_rate}/km rate${Number(route.fare_rule.discount_percentage) > 0 ? ` · ${route.fare_rule.discount_percentage}% off` : ""}`
                  : "PostGIS stop coordinates synced"}
              </p>
            </div>
          </article>

          <article className="summary-card">
            <span className="summary-icon summary-icon-amber">↗</span>
            <div>
              <small>ACTIVE FLEET STATUS</small>
              <b>{totalActiveNetworkBuses} buses running</b>
              <p>
                {lastSync ? `Updated at ${formatUpdated(lastSync)} · 10s cadence` : "Waiting for initial sync"}
              </p>
            </div>
          </article>
        </div>
      </section>

      <footer className="dashboard-footer">
        <Link className="brand brand-small" href="/">
          <span className="brand-mark">s</span><span>Swaym Yatri</span>
        </Link>
        <span>Connected to TRIXUL PostGIS & ETM Telemetry</span>
      </footer>

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <a href="#bus-tracker"><span aria-hidden="true">↗</span><small>Tracker</small></a>
        <a href="#journey-summary"><span aria-hidden="true">₹</span><small>Fares</small></a>
        <Link href="/login"><span aria-hidden="true">✦</span><small>{authenticated ? "Account" : "Sign in"}</small></Link>
      </nav>
    </main>
  )
}
