"use client"

export default function RouteProgress({
  stops,
  bus,
  sourceStopId,
  destinationStopId,
  boardingStopId,
  currentStopSequence,
  stopEtas = {},
  onSelectStop,
}) {
  const currentStopId = bus?.current_stop_id
  const firstStopId = sourceStopId || stops[0]?.stop_id
  const lastStopId = destinationStopId || stops[stops.length - 1]?.stop_id
  const sourceDistance = Number(
    stops.find((stop) => stop.stop_id === sourceStopId)?.distance_km
      ?? stops[0]?.distance_km
      ?? 0,
  )

  return (
    <section className="route-progress" aria-label="Route stops and selected bus position">
      <div className="route-progress-heading">
        <b>Live Stop Timeline</b>
        <small>Tap any stop to set boarding point · real-time PostGIS ETAs</small>
      </div>
      <ol className="route-progress-list">
        {stops.map((stop, index) => {
          const busAtStop = stop.stop_id === currentStopId
          const isPassed = currentStopSequence != null && stop.sequence < currentStopSequence
          const stopEta = stopEtas[stop.stop_id]
          const arrivalLabel = !bus
            ? ""
            : busAtStop
              ? "Bus here now"
              : isPassed
                ? "Passed"
                : stopEta?.eta_minutes != null
                  ? `ETA ${stopEta.arrival_time || "soon"}`
                  : stopEta?.error
                    ? "ETA unavailable"
                    : "Calculating ETA..."
          const isSource = stop.stop_id === firstStopId
          const isDestination = stop.stop_id === lastStopId
          const isBoardingStop = stop.stop_id === boardingStopId
          const distanceFromSource = Number(stop.distance_km) - sourceDistance
          const distanceLabel = distanceFromSource < 0
            ? `${Math.abs(distanceFromSource).toFixed(1)} km before origin`
            : `${distanceFromSource.toFixed(1)} km from origin`
          const endpointLabel = isSource ? "START" : isDestination ? "END" : ""

          return (
            <li className="route-progress-item" key={stop.stop_id}>
              <button
                aria-label={`${stop.stop_name}, ${endpointLabel || `stop ${stop.sequence || index + 1}`}${busAtStop ? ", bus here" : ""}${isBoardingStop ? ", selected boarding stop" : ", select as boarding stop"}`}
                aria-pressed={isBoardingStop}
                className={`route-progress-stop ${isBoardingStop ? "route-progress-stop-selected" : ""} ${busAtStop ? "route-progress-stop-bus" : ""} ${isPassed ? "route-progress-stop-passed" : ""}`}
                onClick={() => onSelectStop(stop.stop_id)}
                type="button"
              >
                <span className="route-progress-step">{String(stop.sequence).padStart(2, "0")}</span>
                <span className="route-progress-rail" aria-hidden="true">
                  {index > 0 && <span className={`route-progress-connector-before ${isPassed || busAtStop ? "connector-active" : ""}`} />}
                  {index < stops.length - 1 && <span className={`route-progress-connector-after ${isPassed ? "connector-active" : ""}`} />}
                  <span className={`route-progress-dot ${isSource ? "route-progress-dot-source" : ""} ${busAtStop ? "route-progress-dot-current" : ""}`} />
                  {busAtStop && <span className="route-progress-bus">🚌</span>}
                </span>
                <span className="route-progress-copy">
                  <b>{stop.stop_name}</b>
                  <small>{distanceLabel}{busAtStop ? " · Live position" : ""}</small>
                  {arrivalLabel && (
                    <small className={`route-progress-arrival ${isPassed ? "arrival-passed" : ""}`}>
                      {arrivalLabel}
                    </small>
                  )}
                </span>
                <span className="route-progress-status">
                  {busAtStop && <span className="stop-chip stop-chip-live">LIVE HERE</span>}
                  {isBoardingStop && <span className="stop-chip stop-chip-board">BOARDING</span>}
                  {!busAtStop && !isBoardingStop && endpointLabel && (
                    <span className={`stop-chip ${isDestination ? "stop-chip-end" : "stop-chip-start"}`}>
                      {endpointLabel}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
