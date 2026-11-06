/**
 * api/client.js
 * Axios instance pointed at the shared Django backend.
 * All Admin-Dashboard API calls go through here.
 */
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

export default client
