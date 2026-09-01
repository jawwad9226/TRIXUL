# ETM App Backend Integration Guide

This guide documents the full frontend-to-backend API integration completed for the TRIXUL ETM (Conductor) App. It acts as a reference for other creators and developers to run the app locally without encountering dependency conflicts or networking errors.

## 1. Overview of the API Contract
The frontend is now strictly locked to the Django/PostGIS backend endpoints. The mock data service has been stripped from the critical API paths. 

The three integrated endpoints are:
1. **Authentication:** `POST /api/v1/auth/login/` (Payload: `{ emp_id: string }`)
2. **Telemetry:** `POST /api/v1/telemetry/heartbeat/` (Payload: `{ shift_id, latitude, longitude, speed, timestamp }`)
3. **Ticketing:** `POST /api/v1/ticketing/issue/` (Payload: `{ shift_id, source_stop_id, dest_stop_id, passenger_count, total_fare, payment_method, timestamp }`)

> [!NOTE]
> For undefined endpoints like `/routeData` and `/conductorData`, the `mockData.js` service was modified to instantly return local placeholder data instead of making network calls. This prevents `net::ERR_CONNECTION_REFUSED` crashes while you focus on the strict API contract.

---

## 2. Dependencies to Install

### Frontend (React Native/Expo)
The web build and secure token storage require specific packages. We also need to lock `react-dom` to exactly match the React version (`19.1.0`) to avoid fatal peer dependency mismatches.

Run the following command from the `ETM-Interface` directory:
```bash
npm install axios expo-secure-store react-dom@19.1.0 react-native-web @expo/metro-runtime --save --legacy-peer-deps
```

### Backend (Django)
To allow the Expo Web server (`localhost:8081`) to communicate with Django (`localhost:8000`), CORS must be enabled.
Run the following from the `Backend` directory:
```bash
pip install django-cors-headers
```

---

## 3. Configuration Setup

### Frontend Environment (`.env`)
You must configure the Base API URL. In the `ETM-Interface` root directory, create a `.env` file (if it doesn't already exist) and define the API host.

**For Expo Web (Browser Testing):**
```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```
**For Android Emulator:**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
```
**For Physical Devices (e.g. Android phone over Wi-Fi):**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:8000
```
*(Replace the IP with your local machine's IPv4 address).*

### Backend Settings (`Backend/core/settings.py`)
Ensure `django-cors-headers` is configured in your Django settings:
1. Add `'corsheaders'` to `INSTALLED_APPS`.
2. Add `'corsheaders.middleware.CorsMiddleware'` to `MIDDLEWARE` (must be above `CommonMiddleware`).
3. Set `CORS_ALLOW_ALL_ORIGINS = True` to allow development requests.

---

## 4. Key Architectural Changes Made

- **`src/services/api.js`**: A centralized Axios client was created. It reads `EXPO_PUBLIC_API_URL`, manages the JWT, and automatically intercepts 401 (Unauthorized) errors.
- **`src/screens/InitializerScreen.js`**: Refactored to POST to `/api/v1/auth/login/` with the verification code (acting as `emp_id`) to retrieve and store the JWT.
- **`src/screens/DashboardScreen.js`**: The "Refresh Feed" logic was rewritten to capture live GPS coordinates via `expo-location` and POST them to `/api/v1/telemetry/heartbeat/`.
- **`src/screens/TicketBookingScreen.js`**: The printing logic was rewritten to POST the strict ticketing payload to `/api/v1/ticketing/issue/` prior to generating the local ticket record.
