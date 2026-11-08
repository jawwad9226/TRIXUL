/**
 * api/client.js
 * Centralized Axios instance pointed at the Django backend.
 * Automatically injects JWT Bearer tokens if present.
 */
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token when present in storage
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trixul_token') || localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default client
