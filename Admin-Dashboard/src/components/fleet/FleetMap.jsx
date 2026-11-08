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

// Normal / Moving bus marker (Pulsing Electric Blue)
const normalBusIcon = new L.DivIcon({
  className: '',
  html: `<div class="marker-pulse-blue" style="
    background-color: #3b82f6;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 10px #3b82f6;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Critical / SOS / Overloaded bus marker (Pulsing Red)
const alertBusIcon = new L.DivIcon({
  className: '',
  html: `<div class="marker-pulse-red" style="
    background-color: #ef4444;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 12px #ef4444;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function MapBoundsWatcher({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
    }
  }, [positions, map])
  return null
}

export default function FleetMap({ fleet = [], interactive = true }) {
  const located = fleet.filter((b) => b.last_seen?.latitude && b.last_seen?.longitude)
  const positions = located.map((b) => [b.last_seen.latitude, b.last_seen.longitude])

  // Center around Maharashtra operational zone (Akola / Shegaon / Bhusawal)
  const DEFAULT_CENTER = [20.7002, 77.0082]

  return (
    <MapContainer
      center={positions.length > 0 ? positions[0] : DEFAULT_CENTER}
      zoom={9}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      attributionControl={false}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem', zIndex: 10 }}
    >
      {/* OpenStreetMap Basemap — Free, Open, No API Key or Watermark Required */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {located.map((bus) => {
        const isAlert = bus.is_critical || bus.status === 'SOS'
        const icon = isAlert ? alertBusIcon : normalBusIcon

        return (
          <Marker
            key={bus.shift_id}
            position={[bus.last_seen.latitude, bus.last_seen.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="text-slate-100 text-xs min-w-[200px] space-y-2 p-1">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                  <span className="font-bold text-white text-sm">{bus.bus_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isAlert ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {isAlert ? 'OVERLOADED / ALERT' : 'IN SERVICE'}
                  </span>
                </div>

                <p className="text-slate-300 font-medium text-xs truncate">
                  📍 {bus.route_name}
                </p>

                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Conductor:</span>
                    <span className="text-slate-200 font-medium">{bus.conductor_name} ({bus.conductor_id})</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Speed:</span>
                    <span className="text-slate-200 font-medium">{bus.last_seen.speed ? `${bus.last_seen.speed.toFixed(1)} km/h` : '0 km/h (Stationary)'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Occupancy:</span>
                    <span className={`font-bold ${bus.is_critical ? 'text-red-400' : 'text-slate-200'}`}>
                      {bus.occupancy_rate}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Revenue:</span>
                    <span className="text-emerald-400 font-bold">
                      ₹{(bus.live_stats?.revenue_today ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
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
