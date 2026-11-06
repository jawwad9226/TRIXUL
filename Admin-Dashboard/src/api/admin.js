/**
 * api/admin.js
 * All API calls to the Stage 3 Admin endpoints on the Django backend.
 * No hardcoded data — everything hits a real PostgreSQL-backed endpoint.
 */
import client from './client'

// ── Fleet ──────────────────────────────────────────────────────────────────
export const fetchFleet = () => client.get('/api/v1/admin/fleet/')

// ── Shifts ─────────────────────────────────────────────────────────────────
export const fetchShifts = () => client.get('/api/v1/admin/shifts/')

export const fetchDispatchOptions = () => client.get('/api/v1/admin/dispatch-options/')

export const createShift = (payload) =>
  // payload: { emp_id, bus_id, route_id }
  client.post('/api/v1/admin/shifts/', payload)

export const closeShift = (shiftId) =>
  client.post(`/api/v1/admin/shifts/${shiftId}/close/`)

// ── Revenue ────────────────────────────────────────────────────────────────
export const fetchRevenue = () => client.get('/api/v1/admin/revenue/')

// ── Incidents ──────────────────────────────────────────────────────────────
export const fetchIncidents = () => client.get('/api/v1/admin/incidents/')
