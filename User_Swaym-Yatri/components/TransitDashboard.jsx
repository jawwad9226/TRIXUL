"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { apiGet } from "@/lib/api"
import RouteProgress from "@/components/RouteProgress"

function formatUpdated(value) {
  if (!value) return "No location update"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))
}

function DataPill({ source }) {
  return (
    <span className={`data-pill ${source === "demo" ? "data-pill-demo" : "data-pill-live"}`}>
      <i /> {source === "demo" ? "DEMO DATA" : "LIVE DATA"}
    </span>
  )
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
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")
  const [lastSync, setLastSync] = useState(null)

  const refreshLiveBuses = useCallback(async (routeId, stopId, destinationId) => {
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
    if (stopId && activeBuses.length) {
      const entries = await Promise.all(activeBuses.map(async (bus) => {
        try {
          const eta = await apiGet(`/api/v1/public/buses/${encodeURIComponent(bus.bus_id)}/eta/`, { stop_id: stopId })
          return [bus.bus_id, eta]
        } catch (requestError) {
          return [bus.bus_id, { error: requestError.message }]
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
    await refreshLiveBuses(routeId, nextStopId, destinationId)
  }, [refreshLiveBuses])

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const [stopResult, routeResult] = await Promise.all([
          apiGet("/api/v1/public/stops/"),
          apiGet("/api/v1/public/routes/"),
        ])
        if (!active) return
        setStops(stopResult.stops || [])
        setRoutes(routeResult.routes || [])
        const firstRoute = routeResult.routes?.[0]
        if (firstRoute) {
          const detail = await apiGet(`/api/v1/public/routes/${encodeURIComponent(firstRoute.route_id)}/`)
          if (!active) return
          setRoute(detail)
          const firstStopId = detail.route_stops[0]?.stop_id || ""
          setBoardingStopId(firstStopId)
          await refreshLiveBuses(firstRoute.route_id, firstStopId)
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
    if (!route?.route_id) return undefined
    const intervalId = window.setInterval(() => {
      refreshLiveBuses(route.route_id, boardingStopId, destination).catch((requestError) => setError(requestError.message))
    }, 10000)
    return () => window.clearInterval(intervalId)
  }, [route?.route_id, boardingStopId, destination, refreshLiveBuses])

  const routeDataSource = route?.data_source || "demo"
  const isDemoData = routeDataSource === "demo"
  const selectedBus = buses.find((bus) => bus.bus_id === selectedBusId) || null
  const routeDestinationIndex = route?.route_stops?.findIndex((stop) => stop.stop_id === destination) ?? -1
  const visibleRouteStops = routeDestinationIndex >= 0
    ? route.route_stops.slice(0, routeDestinationIndex + 1)
    : route?.route_stops || []
  const routeOriginIndex = route?.route_stops?.findIndex((stop) => stop.stop_id === origin) ?? -1
  const boardingOptions = routeDestinationIndex >= 0
    ? route.route_stops.slice(Math.max(0, routeOriginIndex), routeDestinationIndex + 1)
    : route?.route_stops || []
  const selectedStop = useMemo(
    () => route?.route_stops?.find((stop) => stop.stop_id === boardingStopId),
    [route, boardingStopId],
  )

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
      await refreshLiveBuses(route.route_id, stopId, destination)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="dashboard-page">
      <header className="topbar dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">s</span><span>Swayam Yatri</span>
        </Link>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a className="nav-active" href="#bus-tracker">Bus tracker</a>
          <a href="#discover">Discover</a>
          <a href="#discover">Public services</a>
        </nav>
      </header>

      <section className="dashboard-intro">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR EVERYDAY CITY GUIDE</span>
          <h1>Where are you<br className="mobile-break" /> headed today?</h1>
          <p>Start with your bus. The rest of your city is just around the corner.</p>
        </div>
        <div className="intro-stats"><span className="intro-stat-icon">↗</span><span><b>10 sec</b><small>Data check interval</small></span></div>
      </section>

      <section className="tracker-card" id="bus-tracker">
        <div className="section-heading">
          <div className="section-title-wrap"><span className="section-icon">↗</span><div><h2>Find buses on your route</h2><p>Choose your stops to see available buses and where each one is.</p></div></div>
          {route && <DataPill source={routeDataSource} />}
        </div>

        <form className="route-search" onSubmit={searchRoutes}>
          <label className="select-field">
            <span className="field-caption">FROM</span>
            <span className="field-control"><i className="field-dot field-dot-origin" /><select value={origin} onChange={(event) => setOrigin(event.target.value)} aria-label="Origin stop">
              <option value="">Any starting stop</option>
              {stops.map((stop) => <option value={stop.stop_id} key={stop.stop_id}>{stop.stop_name}</option>)}
            </select></span>
          </label>
          <span className="search-connector" aria-hidden="true">→</span>
          <label className="select-field">
            <span className="field-caption">TO</span>
            <span className="field-control"><i className="field-dot field-dot-destination" /><select value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Destination stop">
              <option value="">Any destination</option>
              {stops.filter((stop) => stop.stop_id !== origin).map((stop) => <option value={stop.stop_id} key={stop.stop_id}>{stop.stop_name}</option>)}
            </select></span>
          </label>
          <button className="button button-primary search-button" type="submit" disabled={searching || loading}>
            {searching ? "Finding…" : "Find buses"} <span aria-hidden="true">→</span>
          </button>
        </form>

        {error && <div className="error-banner" role="alert"><span>!</span><div><b>Couldn’t load transit information</b><small>{error} Check that the local backend is running and the API URL is configured.</small></div></div>}

        <div className="tracking-grid">
          <div className="route-overview">
            <div className="route-overview-heading"><div><b>{route?.route_name || "Choose a route"}</b><small>{route ? isDemoData ? `${buses.length} demo bus examples` : `${buses.length} ${buses.length === 1 ? "bus" : "buses"} running on this route` : "Available buses appear here"}</small></div><span className={`sync-label ${buses.length ? "" : "sync-muted"}`}><i /> {lastSync ? `Checked ${formatUpdated(lastSync)}` : "Waiting for data check"}</span></div>
            {route && route.route_stops?.length
              ? <RouteProgress stops={visibleRouteStops} bus={selectedBus} sourceStopId={origin} />
              : <div className="route-overview-empty"><span>↗</span><b>{loading ? "Finding routes…" : "No route selected"}</b><small>Choose an origin and destination to see running buses.</small></div>}
            {route && buses.length === 0 && <div className="empty-live"><span>◷</span><span><b>{isDemoData ? "No demo bus examples match" : "No active bus reported"}</b><small>{isDemoData ? "No scheduled timetable is available in this demo." : "Showing route stops while live service data is unavailable."}</small></span><i>{isDemoData ? "Demo only" : "No service signal"}</i></div>}
            {route && buses.length > 0 && (
              <div className="active-bus-list">
                <div className="active-bus-heading"><b>{isDemoData ? "Demo bus examples" : "Buses running now"}</b><small>Choose a bus to show its {isDemoData ? "example" : "current"} stop</small></div>
                {buses.map((bus) => {
                  const eta = etaByBus[bus.bus_id]
                  return (
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
                        <small>At {bus.current_stop_name}</small>
                      </span>
                      <span className="active-bus-eta">
                        <b>{eta?.eta_minutes == null ? "ETA —" : `${eta.eta_minutes} min`}</b>
                        <small>{bus.speed_kmh} km/h</small>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="route-side">
            <div className="side-heading"><div><h3>Routes and buses</h3><span>{routes.length} options</span></div><span className="route-list-icon">≋</span></div>
            {loading ? <div className="small-loading">Loading routes…</div> : routes.length ? (
              <div className="route-list">
                {routes.map((item) => (
                  <button className={`route-option ${route?.route_id === item.route_id ? "route-option-active" : ""}`} key={item.route_id} onClick={() => selectRoute(item.route_id)} type="button">
                    <span className="route-badge">{item.route_id.replace("route-", "")}</span>
                    <span className="route-option-copy"><b>{item.route_name}</b><small>{item.active_bus_count} {item.active_bus_count === 1 ? "bus" : "buses"} · {item.stop_count} stops</small></span>
                    <span className="route-chevron">›</span>
                  </button>
                ))}
              </div>
            ) : <div className="no-routes">{error ? "Route results are unavailable until the backend connection is restored." : "No routes serve those stops yet. Try another journey."}</div>}

            {route && route.route_stops?.length > 0 && (
              <div className="boarding-select">
                <label htmlFor="boarding-stop">Your boarding stop</label>
                <select id="boarding-stop" value={boardingStopId} onChange={(event) => changeBoardingStop(event.target.value)}>
                  {boardingOptions.map((stop) => <option value={stop.stop_id} key={stop.stop_id}>{stop.stop_name}</option>)}
                </select>
                {selectedStop && <small>{isDemoData ? "Displayed ETA uses example coordinates and speed." : "ETA is calculated from available bus telemetry."}</small>}
              </div>
            )}
          </aside>
        </div>

        {route && (
          <div className="bottom-info">
            <div className="fare-card">
              <span className="fare-icon">₹</span><span><small>FARE INFORMATION</small><b>{route.fare_rule ? `From ₹${route.fare_rule.base_fare}` : "Fare unavailable"}</b><small>{route.fare_rule ? `₹${route.fare_rule.per_km_rate} per km · demo fare` : "No fare rule provided"}</small></span>
            </div>
            <div className="eta-card">
              <span className="eta-icon">◷</span><span><small>{isDemoData ? "ILLUSTRATIVE ETA" : "BUS ARRIVAL"}</small>
                {selectedBus ? <b>{selectedBus.bus_registration}: {etaByBus[selectedBus.bus_id]?.eta_minutes == null ? "ETA unavailable" : `${etaByBus[selectedBus.bus_id].eta_minutes} min`}</b> : <b>{isDemoData ? "No matching demo bus" : "Waiting for an active bus"}</b>}
                <small>{selectedBus ? `${isDemoData ? "Example estimate" : "To"} ${selectedStop?.stop_name || "your stop"} · ${selectedBus.speed_kmh} km/h` : isDemoData ? "Demo fixture data only" : "No live bus currently active"}</small>
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="discover-section" id="discover">
        <div className="discover-heading"><div><span className="eyebrow">MORE AROUND YOU</span><h2>Your city, all in one place.</h2></div><span className="coming-label">MORE TO EXPLORE SOON</span></div>
        <div className="discover-grid">
          <article className="discover-card discover-places"><span className="discover-icon">⌖</span><div><b>Places to explore</b><small>Landmarks, parks and useful places</small></div><span className="discover-soon">COMING SOON</span></article>
          <article className="discover-card discover-services"><span className="discover-icon">▤</span><div><b>Public services</b><small>Government offices and services</small></div><span className="discover-soon">COMING SOON</span></article>
          <article className="discover-card discover-updates"><span className="discover-icon">✳</span><div><b>City updates</b><small>Announcements and helpful notices</small></div><span className="discover-soon">COMING SOON</span></article>
        </div>
      </section>

      <footer className="dashboard-footer"><Link className="brand brand-small" href="/"><span className="brand-mark">s</span><span>Swayam Yatri</span></Link><span>Useful city information, made simple.</span></footer>

      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <a href="#bus-tracker"><span aria-hidden="true">↗</span><small>Bus</small></a>
        <a href="#discover"><span aria-hidden="true">⌖</span><small>Explore</small></a>
        <a href="#discover"><span aria-hidden="true">▤</span><small>Info</small></a>
      </nav>
    </main>
  )
}
