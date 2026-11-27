/**
 * pages/RouteManager.jsx
 * Dedicated Visual Route & Stop Builder with Interactive Leaflet Map.
 * Click directly on the map to drop pins, automatically extract GPS coordinates,
 * register stops via POST /api/v1/admin/stops/, visually link stops with real-time polyline,
 * and deploy new routes with attached fare rules.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import {
  MapPin,
  Route as RouteIcon,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoveRight,
  Layers,
  Sparkles,
  Pencil,
  Edit2,
  X,
} from 'lucide-react'
import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  fetchStops,
  createStop,
  updateStop,
} from '../api/admin'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

// Stop Pin Icons
const stopPinIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    background: #3b82f6;
    border: 2px solid #ffffff;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    box-shadow: 0 0 8px #3b82f6;
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const selectedPinIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    background: #10b981;
    border: 2px solid #ffffff;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    box-shadow: 0 0 12px #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const newDraftPinIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    background: #f59e0b;
    border: 2px solid #ffffff;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    box-shadow: 0 0 12px #f59e0b;
    animation: bounce 1s infinite alternate;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Calculate distance in km between two lat/lng coordinates (Haversine formula)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(1))
}

// Map Click Listener to capture coordinates
function MapClickCapture({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function RouteManager() {
  const [activeTab, setActiveTab] = useState('builder') // 'builder' | 'routes'
  const [stops, setStops] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [expandedRoute, setExpandedRoute] = useState(null)

  // Pin Click Draft State
  const [draftPin, setDraftPin] = useState(null) // { latitude, longitude, stop_name: '', stop_id: '' }
  const [savingStop, setSavingStop] = useState(false)

  // Route Builder Sequence State
  const [routeForm, setRouteForm] = useState({
    route_id: '',
    route_name: '',
    base_fare: '10.00',
    per_km_rate: '1.50',
  })
  const [selectedRouteStops, setSelectedRouteStops] = useState([]) // Array of stop objects in order
  const [creatingRoute, setCreatingRoute] = useState(false)
  const [editingRouteId, setEditingRouteId] = useState(null)

  // Initial Data Load
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stopsRes, routesRes] = await Promise.all([fetchStops(), fetchRoutes()])
      setStops(stopsRes.data)
      setRoutes(routesRes.data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Map Click: Extract exact lat/long
  const handleMapClick = (lat, lng) => {
    const latRounded = parseFloat(lat.toFixed(6))
    const lngRounded = parseFloat(lng.toFixed(6))
    setDraftPin({
      latitude: latRounded,
      longitude: lngRounded,
      stop_name: '',
      stop_id: '',
      isEditing: false,
    })
  }

  // Load existing stop for editing (Item 5)
  const handleEditStop = (stop) => {
    setDraftPin({
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      isEditing: true,
    })
    setActiveTab('builder')
  }

  // Save Clicked or Edited Pin to Backend (POST /api/v1/admin/stops/)
  const handleSaveDraftStop = async (e) => {
    e.preventDefault()
    if (!draftPin || !draftPin.stop_name.trim()) return
    setSavingStop(true)
    try {
      const payload = {
        stop_name: draftPin.stop_name.trim(),
        stop_id: draftPin.stop_id.trim() || undefined,
        latitude: parseFloat(draftPin.latitude),
        longitude: parseFloat(draftPin.longitude),
      }
      const res = await createStop(payload)
      const newStop = {
        stop_id: res.data.stop_id,
        stop_name: res.data.stop_name,
        latitude: res.data.latitude,
        longitude: res.data.longitude,
      }
      setStops((prev) => [...prev.filter((s) => s.stop_id !== newStop.stop_id), newStop])
      
      // Update stop details in active route chain if present
      setSelectedRouteStops((prev) =>
        prev.map((s) => (s.stop_id === newStop.stop_id ? { ...s, ...newStop } : s))
      )

      if (!draftPin.isEditing) {
        appendStopToRoute(newStop)
      }

      const isEdit = draftPin.isEditing
      setDraftPin(null)
      setFeedback({
        type: 'success',
        text: isEdit
          ? `Stop "${newStop.stop_name}" details updated successfully.`
          : `Stop "${newStop.stop_name}" pinned and saved to PostGIS. Added to active route!`,
      })
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save stop',
      })
    } finally {
      setSavingStop(false)
    }
  }

  // Edit Route Handler (Item 6)
  const handleEditRoute = (route) => {
    setEditingRouteId(route.route_id)
    setRouteForm({
      route_id: route.route_id,
      route_name: route.route_name,
      base_fare: route.fare_rule?.base_fare ? String(route.fare_rule.base_fare) : '10.00',
      per_km_rate: route.fare_rule?.per_km_rate ? String(route.fare_rule.per_km_rate) : '1.50',
    })
    setSelectedRouteStops(
      route.stops.map((s) => ({
        stop_id: s.stop_id,
        stop_name: s.stop_name,
        latitude: s.latitude,
        longitude: s.longitude,
        distance_km: s.distance_km,
      }))
    )
    setActiveTab('builder')
    setFeedback({
      type: 'success',
      text: `Route "${route.route_name}" (${route.route_id}) loaded into Visual Builder. Modify stops or fare rules and click "Update Route".`,
    })
    setTimeout(() => setFeedback(null), 6000)
  }

  // Delete Route Handler (Item 6)
  const handleDeleteRoute = async (e, route) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to permanently delete route "${route.route_name}" (${route.route_id})?`)) {
      return
    }
    try {
      const res = await deleteRoute(route.route_id)
      setFeedback({
        type: 'success',
        text: res.data?.message || `Route "${route.route_name}" deleted successfully.`,
      })
      await loadData()
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to delete route',
      })
    }
  }

  // Add an existing stop to the route builder sequence
  const appendStopToRoute = (stop) => {
    setSelectedRouteStops((prev) => {
      // Allow adding stop if not immediate duplicate
      if (prev.length > 0 && prev[prev.length - 1].stop_id === stop.stop_id) {
        return prev
      }
      return [...prev, stop]
    })
  }

  // Remove stop from sequence
  const removeStopFromSequence = (index) => {
    setSelectedRouteStops((prev) => prev.filter((_, i) => i !== index))
  }

  // Computed distances and polyline path
  const routeSequenceWithDistance = useMemo(() => {
    let cumulative = 0
    return selectedRouteStops.map((stop, i) => {
      if (i > 0) {
        const prev = selectedRouteStops[i - 1]
        const leg = calculateDistanceKm(
          prev.latitude,
          prev.longitude,
          stop.latitude,
          stop.longitude
        )
        cumulative += leg
      }
      return {
        ...stop,
        sequence: i + 1,
        distance_km: parseFloat(cumulative.toFixed(1)),
      }
    })
  }, [selectedRouteStops])

  const polylinePositions = useMemo(() => {
    return selectedRouteStops
      .filter((s) => s.latitude && s.longitude)
      .map((s) => [s.latitude, s.longitude])
  }, [selectedRouteStops])

  // Total route distance
  const totalRouteKm =
    routeSequenceWithDistance.length > 0
      ? routeSequenceWithDistance[routeSequenceWithDistance.length - 1].distance_km
      : 0

  // Deploy Complete Route to Backend (POST /api/v1/admin/routes/create/)
  const handleDeployRoute = async (e) => {
    e.preventDefault()
    if (!routeForm.route_id.trim() || !routeForm.route_name.trim()) {
      setFeedback({ type: 'error', text: 'Route ID and Route Name are required.' })
      return
    }
    if (selectedRouteStops.length < 2) {
      setFeedback({ type: 'error', text: 'A route requires at least 2 connected stops.' })
      return
    }

    setCreatingRoute(true)
    setFeedback(null)
    try {
      const payload = {
        route_id: routeForm.route_id.trim(),
        route_name: routeForm.route_name.trim(),
        base_fare: routeForm.base_fare,
        per_km_rate: routeForm.per_km_rate,
        stops: routeSequenceWithDistance.map((s) => ({
          stop_id: s.stop_id,
          stop_name: s.stop_name,
          sequence: s.sequence,
          distance_km: s.distance_km,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      }

      if (editingRouteId) {
        await updateRoute(editingRouteId, payload)
        setFeedback({
          type: 'success',
          text: `Route "${routeForm.route_name}" (${editingRouteId}) successfully updated with ${selectedRouteStops.length} stops!`,
        })
      } else {
        await createRoute(payload)
        setFeedback({
          type: 'success',
          text: `Route "${routeForm.route_name}" successfully deployed with ${selectedRouteStops.length} stops!`,
        })
      }

      // Reset form
      setEditingRouteId(null)
      setRouteForm({
        route_id: '',
        route_name: '',
        base_fare: '10.00',
        per_km_rate: '1.50',
      })
      setSelectedRouteStops([])
      await loadData()
      setTimeout(() => setFeedback(null), 5000)
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save route',
      })
    } finally {
      setCreatingRoute(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Visual Route Builder & Network Manager"
        subtitle="Click directly on the map to drop stop pins, automatically capture GPS coordinates, link stops into routes, and apply fare rules."
        right={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  activeTab === 'builder'
                    ? 'bg-trixul-accent text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Visual Map Builder
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  activeTab === 'routes'
                    ? 'bg-trixul-accent text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Route Directory ({routes.length})
              </button>
            </div>
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── TAB 1: VISUAL ROUTE BUILDER ────────────────────────────────────── */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-14rem)] min-h-[580px]">
          
          {/* Interactive Map (7 Cols) */}
          <div className="lg:col-span-7 bg-trixul-panel rounded-xl border border-slate-700 shadow-xl flex flex-col overflow-hidden relative">
            
            {/* Map Instruction Overlay */}
            <div className="absolute top-3 left-3 z-[500] bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3.5 py-2 rounded-lg text-xs space-y-0.5 shadow-lg pointer-events-none">
              <p className="text-white font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Map Click Mode Active</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Click anywhere on the map to pin a new stop. Click existing pins to add to route.
              </p>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-3 left-3 z-[500] bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-3 text-slate-300 pointer-events-none">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Registered Stop
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> In Current Route
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Clicked Target
              </span>
            </div>

            <div className="flex-1 w-full h-full relative">
              <MapContainer
                center={[20.7002, 77.0022]}
                zoom={8}
                style={{ height: '100%', width: '100%', backgroundColor: '#0b1120' }}
              >
                {/* OpenStreetMap Basemap — Free, Open, No API Key or Watermark Required */}
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />

                <MapClickCapture onMapClick={handleMapClick} />

                {/* Real-time Route Polyline */}
                {polylinePositions.length >= 2 && (
                  <Polyline
                    positions={polylinePositions}
                    color="#10b981"
                    weight={4}
                    opacity={0.8}
                    dashArray="6 6"
                  />
                )}

                {/* Registered Stops Markers */}
                {stops.map((stop) => {
                  const isSelected = selectedRouteStops.some((s) => s.stop_id === stop.stop_id)
                  const icon = isSelected ? selectedPinIcon : stopPinIcon
                  return (
                    <Marker
                      key={stop.stop_id}
                      position={[stop.latitude, stop.longitude]}
                      icon={icon}
                    >
                      <Popup>
                        <div className="text-slate-100 text-xs space-y-1.5 p-1 min-w-[190px]">
                          <p className="font-bold text-white text-sm">{stop.stop_name}</p>
                          <p className="font-mono text-[10px] text-slate-400">{stop.stop_id}</p>
                          <p className="text-[10px] text-slate-400">
                            GPS: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => appendStopToRoute(stop)}
                              className="flex-1 bg-trixul-accent hover:bg-blue-600 text-white font-semibold text-[11px] py-1.5 px-2 rounded transition flex items-center justify-center gap-1 shadow"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add to Route</span>
                            </button>
                            <button
                              onClick={() => handleEditStop(stop)}
                              title="Edit stop name and GPS coordinates"
                              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold py-1.5 px-2.5 rounded transition flex items-center justify-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

                {/* Draft Click Pin Marker */}
                {draftPin && (
                  <Marker
                    position={[draftPin.latitude, draftPin.longitude]}
                    icon={newDraftPinIcon}
                  >
                    <Popup autoPan={true}>
                      <div className="text-slate-100 text-xs p-1">
                        <p className="font-bold text-amber-400">Target Coordinates</p>
                        <p className="font-mono text-[11px] text-slate-300">
                          {draftPin.latitude}, {draftPin.longitude}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Enter Stop Name in the sidebar to register.
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          {/* Builder Sidebar: Pin Register + Route Linker (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
            
            {/* 1. Pin Registration Box (Active when user clicks map or enters coords) */}
            <Card className="border-amber-500/40 bg-slate-900/80">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{draftPin?.isEditing ? `Edit Stop: ${draftPin.stop_id}` : 'Pin to Stop Registration'}</span>
                </h3>
                {draftPin && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    draftPin.isEditing
                      ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                      : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                  }`}>
                    {draftPin.isEditing ? 'Editing Mode' : 'GPS Fix Acquired'}
                  </span>
                )}
              </div>

              {draftPin ? (
                <form onSubmit={handleSaveDraftStop} className="space-y-3">
                  {/* Manual Coordinate Editing (Item 4) */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1 font-mono">
                        Latitude <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={draftPin.latitude}
                        onChange={(e) => setDraftPin({ ...draftPin, latitude: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1 font-mono">
                        Longitude <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={draftPin.longitude}
                        onChange={(e) => setDraftPin({ ...draftPin, longitude: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Stop Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Malkapur Bus Stand"
                      value={draftPin.stop_name}
                      onChange={(e) => setDraftPin({ ...draftPin, stop_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Stop ID {draftPin.isEditing ? '(Read-only)' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      readOnly={draftPin.isEditing}
                      placeholder="e.g. STP-MLK (Auto-generated if empty)"
                      value={draftPin.stop_id}
                      onChange={(e) => setDraftPin({ ...draftPin, stop_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder-slate-600 font-mono disabled:opacity-60"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDraftPin(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-1.5 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingStop}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 rounded-lg transition shadow disabled:opacity-50"
                    >
                      {savingStop ? 'Saving...' : draftPin.isEditing ? 'Update Stop' : 'Register Stop (POST)'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-2 space-y-2">
                  <p className="text-xs text-slate-400 italic">
                    👉 Click any location on the map to automatically extract coordinates and register a new stop.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftPin({
                        latitude: 20.7002,
                        longitude: 77.0022,
                        stop_name: '',
                        stop_id: '',
                        isEditing: false,
                      })
                    }
                    className="w-full text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Or Enter Coordinates Manually</span>
                  </button>
                </div>
              )}
            </Card>

            {/* 2. Link Stops to Deploy Route */}
            <Card className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                  <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <RouteIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active Route Linker ({selectedRouteStops.length} Stops)</span>
                  </h3>
                  {selectedRouteStops.length > 0 && (
                    <button
                      onClick={() => setSelectedRouteStops([])}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      Clear Chain
                    </button>
                  )}
                </div>

                {/* Selected Sequence Pills */}
                {selectedRouteStops.length === 0 ? (
                  <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-4 text-center text-xs text-slate-400 mb-4">
                    No stops linked yet. Click stops on the map to connect them into a route chain.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
                    {routeSequenceWithDistance.map((s, idx) => (
                      <div
                        key={`${s.stop_id}-${idx}`}
                        className="flex items-center justify-between bg-slate-800/80 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            #{s.sequence}
                          </span>
                          <span className="text-white font-medium truncate">{s.stop_name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-mono text-slate-400">
                            {s.distance_km} km
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStopFromSequence(idx)}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="text-right text-[11px] text-slate-400 font-medium pt-1">
                      Total Calculated Distance: <strong className="text-emerald-400">{totalRouteKm} km</strong>
                    </div>
                  </div>
                )}

                {/* Route Configuration Form */}
                <form onSubmit={handleDeployRoute} className="space-y-3">
                  {editingRouteId && (
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-amber-300">
                      <span className="font-semibold">
                        Editing Route: <strong className="font-mono text-white">{editingRouteId}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRouteId(null)
                          setRouteForm({ route_id: '', route_name: '', base_fare: '10.00', per_km_rate: '1.50' })
                          setSelectedRouteStops([])
                        }}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel Edit</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Route ID {editingRouteId ? '(Read-only)' : <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={!!editingRouteId}
                        placeholder="e.g. route-106"
                        value={routeForm.route_id}
                        onChange={(e) => setRouteForm({ ...routeForm, route_id: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono placeholder-slate-600 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Route Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Akola - Malkapur Direct"
                        value={routeForm.route_name}
                        onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 placeholder-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Base Fare (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={routeForm.base_fare}
                        onChange={(e) => setRouteForm({ ...routeForm, base_fare: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                        Per KM Rate (₹/km)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={routeForm.per_km_rate}
                        onChange={(e) => setRouteForm({ ...routeForm, per_km_rate: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingRoute || selectedRouteStops.length < 2}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs py-2.5 rounded-lg transition shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {creatingRoute
                        ? 'Saving Network Route...'
                        : editingRouteId
                        ? `Update Route (${selectedRouteStops.length} Connected Stops)`
                        : `Deploy Route (${selectedRouteStops.length} Connected Stops)`}
                    </span>
                  </button>
                </form>
              </div>
            </Card>

          </div>

        </div>
      )}

      {/* ── TAB 2: ROUTE DIRECTORY ─────────────────────────────────────────── */}
      {activeTab === 'routes' && (
        <div className="space-y-3">
          {routes.length === 0 ? (
            <Card className="text-center py-10">
              <RouteIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No routes currently deployed.</p>
            </Card>
          ) : (
            routes.map((route) => {
              const isExpanded = expandedRoute === route.route_id
              return (
                <Card key={route.route_id}>
                  <button
                    onClick={() => setExpandedRoute(isExpanded ? null : route.route_id)}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="bg-trixul-accent/20 text-trixul-accent text-[10px] font-bold px-2.5 py-1 rounded-full border border-trixul-accent/30 font-mono">
                        {route.route_id}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">
                        {route.route_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 text-xs">
                      <span className="text-slate-400 hidden md:inline">{route.stops.length} stops</span>
                      {route.fare_rule?.base_fare && (
                        <span className="text-emerald-400 font-mono font-medium hidden sm:block">
                          ₹{route.fare_rule.base_fare} base + ₹{route.fare_rule.per_km_rate}/km
                        </span>
                      )}

                      {/* Edit Route Button (Item 6) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditRoute(route)
                        }}
                        title="Edit route stops and fare rules in Visual Builder"
                        className="flex items-center gap-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded transition"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Route Button (Item 6) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRoute(e, route)
                        }}
                        title="Permanently delete route from database"
                        className="flex items-center gap-1 text-[11px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>

                      <div className="p-1 hover:bg-slate-700 rounded text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 border-t border-slate-700/80 pt-4 space-y-2">
                      <div className="grid grid-cols-5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-1.5">
                        <span>Seq</span>
                        <span className="col-span-2">Stop Name</span>
                        <span className="text-right">Distance</span>
                        <span className="text-right">GPS Coordinates</span>
                      </div>
                      {route.stops.map((s) => (
                        <div
                          key={s.stop_id}
                          className="grid grid-cols-5 items-center text-xs py-1.5 hover:bg-slate-800/60 rounded px-1 transition"
                        >
                          <span className="text-slate-500 font-mono">#{s.sequence}</span>
                          <div className="col-span-2">
                            <span className="text-white font-medium">{s.stop_name}</span>
                            <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                              ({s.stop_id})
                            </span>
                          </div>
                          <span className="text-right font-mono text-slate-300">
                            {s.distance_km?.toFixed(1)} km
                          </span>
                          <span className="text-right font-mono text-trixul-accent text-[10px]">
                            {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

    </div>
  )
}
