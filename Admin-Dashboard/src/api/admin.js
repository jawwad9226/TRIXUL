/**
 * api/admin.js
 * Centralized API service functions hitting Django backend endpoints.
 * Pure real-time integration with PostgreSQL / PostGIS backend.
 */
import client from './client'

// ── Fleet Telemetry ──────────────────────────────────────────────────────────
export const fetchFleet = () => client.get('/api/v1/admin/fleet/')

// ── Dispatch & Shifts ────────────────────────────────────────────────────────
export const fetchDispatchOptions = () => client.get('/api/v1/admin/dispatch-options/')

export const fetchShifts = () => client.get('/api/v1/admin/shifts/')

export const createShift = (payload) =>
  // payload: { emp_id, bus_id, route_id }
  client.post('/api/v1/admin/shifts/', payload)

export const closeShift = (shiftId) =>
  client.post(`/api/v1/admin/shifts/${shiftId}/close/`)

export const reassignShiftBus = (shiftId, newBusId) =>
  client.post(`/api/v1/admin/shifts/${shiftId}/reassign-bus/`, { new_bus_id: newBusId })

// ── Revenue Analytics ────────────────────────────────────────────────────────
export const fetchRevenue = () => client.get('/api/v1/admin/revenue/')

// ── Incidents & Emergency Triage ─────────────────────────────────────────────
export const fetchIncidents = () => client.get('/api/v1/admin/incidents/')

export const acknowledgeIncident = (incidentId) =>
  client.patch(`/api/v1/admin/incidents/${incidentId}/acknowledge/`)

// ── Route & Stop Master Data Management ──────────────────────────────────────
export const fetchRoutes = () => client.get('/api/v1/admin/routes/')
export const createRoute = (payload) => client.post('/api/v1/admin/routes/create/', payload)
export const fetchStops = () => client.get('/api/v1/admin/stops/')
export const createStop = (payload) => client.post('/api/v1/admin/stops/', payload)
