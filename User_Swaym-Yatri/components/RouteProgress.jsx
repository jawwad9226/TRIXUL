"use client"

export default function RouteProgress({ stops, bus, sourceStopId }) {
  const currentStopId = bus?.current_stop_id

  return (
    <div className="route-progress" aria-label="Route stops and selected bus position">
      {stops.map((stop, index) => {
        const busAtStop = stop.stop_id === currentStopId
        return (
          <div className="route-progress-stop" key={stop.stop_id}>
            <div className="route-progress-track">
              {busAtStop && (
                <span className="route-progress-bus" role="img" aria-label={`${bus.bus_registration} is at ${stop.stop_name}`}>
                  🚌
                </span>
              )}
              <span className={`route-progress-dot ${busAtStop ? "route-progress-dot-current" : ""}`} />
              {index < stops.length - 1 && <span className="route-progress-connector" />}
            </div>
            <b>{stop.stop_name}</b>
            <small>{stop.distance_km} km</small>
            {stop.stop_id === sourceStopId && <span className="route-progress-source">SOURCE</span>}
            {busAtStop && <span className="route-progress-current">BUS HERE</span>}
          </div>
        )
      })}
    </div>
  )
}
