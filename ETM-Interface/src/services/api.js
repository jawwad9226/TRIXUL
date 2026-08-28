import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const setToken = async (key, value) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getToken = async (key) => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteToken = async (key) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// Retrieve API URL from Expo Environment Variables
// Defaults to 10.0.2.2 for Android emulator if not set in .env
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token to Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken('jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from SecureStore', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and handle unauthorized access (e.g., trigger logout)
      await deleteToken('jwt_token');
      console.warn('Unauthorized access. Token cleared.');
      // NOTE: You can dispatch a Redux action or navigation reset here if needed.
    }
    return Promise.reject(error);
  }
);

// --- API Service Functions ---

/**
 * Authentication Service
 * @param {string} emp_id 
 */
export const login = async (emp_id) => {
  const response = await apiClient.post('/api/v1/auth/login/', { emp_id });
  const token = response.data.token || response.data.access; // Depending on your backend's exact response structure
  
  if (token) {
    await setToken('jwt_token', token);
  }
  return response.data;
};

/**
 * Telemetry Service
 * @param {Object} payload
 * @param {string} payload.shift_id
 * @param {number} payload.latitude
 * @param {number} payload.longitude
 * @param {number} payload.speed
 * @param {string} payload.timestamp - ISO-8601-string
 */
export const sendHeartbeat = async (payload) => {
  const response = await apiClient.post('/api/v1/telemetry/heartbeat/', {
    shift_id: payload.shift_id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed,
    timestamp: payload.timestamp,
  });
  return response.data;
};

/**
 * Ticketing Service
 * @param {Object} payload
 * @param {string} payload.shift_id
 * @param {string} payload.source_stop_id
 * @param {string} payload.dest_stop_id
 * @param {number} payload.passenger_count
 * @param {number} payload.total_fare
 * @param {string} payload.payment_method
 * @param {string} payload.timestamp - ISO-8601-string
 */
export const issueTicket = async (payload) => {
  const response = await apiClient.post('/api/v1/ticketing/issue/', {
    shift_id: payload.shift_id,
    source_stop_id: payload.source_stop_id,
    dest_stop_id: payload.dest_stop_id,
    passenger_count: payload.passenger_count,
    total_fare: payload.total_fare,
    payment_method: payload.payment_method,
    timestamp: payload.timestamp,
  });
  return response.data;
};

/**
 * Route Service
 * @param {string} routeId
 */
export const fetchRouteData = async (routeId) => {
  const response = await apiClient.get(`/api/v1/routes/${routeId}/`);
  return response.data;
};

export default apiClient;
