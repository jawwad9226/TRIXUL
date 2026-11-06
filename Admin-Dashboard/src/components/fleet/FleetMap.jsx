/**
 * components/fleet/FleetMap.jsx
 * High-performance dark-themed Leaflet map showing live fleet telemetry.
 * Uses CartoDB Dark Matter tiles matching the control room aesthetic.
 */
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix default Leaflet asset paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Normal bus marker (Electric Blue)
const normalBusIcon = new L.DivIcon({
  className: '',
  html: `<div class="marker-pulse-blue" style="
    background-color: #3b82f6;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 10px #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Critical / Alert bus marker (Pulsing Red)
const alertBusIcon = new L.DivIcon({
  className: '',
  html: `<div class="marker-pulse-red" style="
    background-color: #ef4444;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 12px #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function MapBoundsWatcher({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [positions, map])
  return null
}

export default function FleetMap({ fleet = [], interactive = true }) {
  const located = fleet.filter((b) => b.last_seen?.latitude && b.last_seen?.longitude)
  const positions = located.map((b) => [b.last_seen.latitude, b.last_seen.longitude])

  // Center around Maharashtra (Akola / Bhusawal / Shegaon)
  const DEFAULT_CENTER = [20.7002, 77.0082]

  return (
    <MapContainer
      center={positions.length > 0 ? positions[0] : DEFAULT_CENTER}
      zoom={8}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      attributionControl={false}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem', zIndex: 10 }}
    >
      {/* High-tech CartoDB Dark Matter tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      {located.map((bus) => {
        const isAlert = bus.is_critical || (bus.last_seen && bus.last_seen.speed === 0)
        const icon = isAlert ? alertBusIcon : normalBusIcon

        return (
          <Marker
            key={bus.shift_id}
            position={[bus.last_seen.latitude, bus.last_seen.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="text-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1 font-bold text-white">
                  <span>{bus.bus_number}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${isAlert ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {bus.status}
                  </span>
                </div>
                <p className="text-slate-300 font-medium">{bus.route_name}</p>
                <div className="grid grid-cols-2 gap-x-2 pt-1 text-[11px] text-slate-400">
                  <p>👤 Conductor:</p><p className="text-slate-200">{bus.conductor_name}</p>
                  <p>⚡ Speed:</p><p className="text-slate-200">{bus.last_seen.speed?.toFixed(0)} km/h</p>
                  <p>👥 Occupancy:</p><p className="text-slate-200 font-semibold">{bus.occupancy_rate || '—'}</p>
                  <p>💰 Revenue:</p><p className="text-emerald-400 font-semibold">₹{bus.live_stats?.revenue_today?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {positions.length > 0 && <MapBoundsWatcher positions={positions} />}
    </MapContainer>
  )
}
